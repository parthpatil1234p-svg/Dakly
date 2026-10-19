"""
Dakly - Official Python SDK Client
The High-Performance Free Gmail Microservice for Developers

Usage:
    from dakly import Dakly

    dakly = Dakly("gkey_live_...")
    res = dakly.send_otp(to="student@gmail.com", code="849201", app_name="EduVibe")
    print(res["trackingId"])
"""

import os
import json
import urllib.request
import urllib.error
import urllib.parse
from typing import Optional, Dict, Any, List, Union

from .exceptions import (
    DaklyError,
    DaklyAuthenticationError,
    DaklyRateLimitError,
    DaklySuppressedError,
    DaklyValidationError,
)


class Dakly:
    """Official Dakly API Client."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: int = 15,
        throw_on_suppressed: bool = True,
    ):
        """
        Initialize Dakly client.

        :param api_key: Dakly Project API Key (e.g. 'gkey_live_...').
                        Defaults to DAKLY_API_KEY environment variable.
        :param base_url: Custom API endpoint (default: 'https://dakly-engin.vercel.app').
        :param timeout: Network request timeout in seconds (default: 15).
        :param throw_on_suppressed: Whether to raise DaklySuppressedError on bounce suppression.
        """
        self.api_key = (api_key or os.environ.get("DAKLY_API_KEY") or "").strip()
        raw_base = base_url or os.environ.get("DAKLY_BASE_URL") or "https://dakly-engin.vercel.app"
        self.base_url = raw_base.rstrip("/")
        self.timeout = timeout
        self.throw_on_suppressed = throw_on_suppressed

    def _request(
        self,
        endpoint: str,
        method: str = "GET",
        payload: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Internal HTTP request handler using standard library urllib."""
        if not self.api_key:
            raise DaklyAuthenticationError(
                "Dakly API Key is required. Pass it to Dakly('gkey_live_...') or set DAKLY_API_KEY in environment."
            )

        url = f"{self.base_url}{endpoint if endpoint.startswith('/') else '/' + endpoint}"
        if params:
            clean_params = {k: v for k, v in params.items() if v is not None}
            if clean_params:
                url += "?" + urllib.parse.urlencode(clean_params)

        headers = {
            "Accept": "application/json",
            "x-api-key": self.api_key,
            "User-Agent": "Dakly-Python-SDK/1.0.0",
        }

        data_bytes = None
        if payload is not None:
            headers["Content-Type"] = "application/json"
            data_bytes = json.dumps(payload).encode("utf-8")

        req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                resp_bytes = resp.read()
                data = json.loads(resp_bytes.decode("utf-8")) if resp_bytes else {}

                # Check if Dakly returned BLOCKED_SUPPRESSED
                if data.get("status") == "BLOCKED_SUPPRESSED" and self.throw_on_suppressed:
                    raise DaklySuppressedError(
                        message=data.get("error", "Recipient blocked on suppression list."),
                        tracking_id=data.get("trackingId"),
                        reason=data.get("reason", "HARD_BOUNCE"),
                        details=data,
                    )
                return data

        except urllib.error.HTTPError as http_err:
            raw_err = http_err.read().decode("utf-8")
            try:
                err_json = json.loads(raw_err)
                err_msg = err_json.get("error") or err_json.get("message") or raw_err
            except Exception:
                err_json = {"raw": raw_err}
                err_msg = raw_err or f"HTTP {http_err.code} {http_err.reason}"

            if http_err.code in (401, 403):
                raise DaklyAuthenticationError(err_msg, status_code=http_err.code, details=err_json)
            elif http_err.code == 429:
                raise DaklyRateLimitError(err_msg, status_code=429, details=err_json)
            elif http_err.code == 400:
                raise DaklyValidationError(err_msg, status_code=400, details=err_json)
            else:
                raise DaklyError(err_msg, status_code=http_err.code, details=err_json)

        except urllib.error.URLError as url_err:
            raise DaklyError(f"Connection failed to Dakly ({url}): {url_err.reason}", status_code=500)

    def send(
        self,
        to: str,
        subject: Optional[str] = None,
        html: Optional[str] = None,
        text: Optional[str] = None,
        otp: Optional[Union[str, int]] = None,
        template: Optional[str] = None,
        vars: Optional[Dict[str, Any]] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Universal send method.

        :param to: Recipient email address
        :param subject: Email subject line
        :param html: Custom HTML content
        :param text: Plain text fallback
        :param otp: Quick 4-8 digit OTP code
        :param template: Pre-built template identifier ('otp', 'welcome', 'password_reset', 'notes', 'invoice')
        :param vars: Dynamic variables dict for template interpolation
        :param attachments: List of attachment dicts [{'filename': 'report.pdf', 'path': 'https://...'}]
        """
        if not to or not isinstance(to, str):
            raise DaklyValidationError("Recipient email ('to') is required.")

        payload: Dict[str, Any] = {"to": to.strip().lower()}
        if subject is not None:
            payload["subject"] = subject
        if html is not None:
            payload["html"] = html
        if text is not None:
            payload["text"] = text
        if otp is not None:
            payload["otp"] = str(otp)
        if template is not None:
            payload["template"] = template
        if vars is not None:
            payload["vars"] = vars
        if attachments is not None:
            payload["attachments"] = attachments

        return self._request("/api/send", method="POST", payload=payload)

    def send_otp(
        self,
        to: str,
        code: Union[str, int],
        app_name: str = "Dakly App",
        expires_in_minutes: int = 10,
        subject: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Send a high-priority modern OTP verification code.
        """
        if not to:
            raise DaklyValidationError("Recipient email ('to') is required.")
        if code is None:
            raise DaklyValidationError("Verification code is required.")

        clean_code = str(code).strip()
        subj = subject or f"{clean_code} is your {app_name} verification code"
        return self.send(
            to=to,
            subject=subj,
            template="otp",
            vars={
                "otp": clean_code,
                "appName": app_name,
                "validity": f"{expires_in_minutes} minutes",
            },
        )

    def send_template(
        self,
        to: str,
        template: str,
        vars: Optional[Dict[str, Any]] = None,
        subject: Optional[str] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Send any registered pre-built template with dynamic variables."""
        if not template:
            raise DaklyValidationError("Template identifier is required.")
        return self.send(
            to=to,
            template=template,
            vars=vars or {},
            subject=subject,
            attachments=attachments,
        )

    def send_welcome(
        self,
        to: str,
        name: str = "there",
        app_name: str = "Our Platform",
        login_url: str = "https://dakly.vercel.app",
        support_email: str = "support@dakly.com",
        subject: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Send a modern onboarding & welcome email."""
        return self.send_template(
            to=to,
            template="welcome",
            subject=subject,
            vars={
                "name": name,
                "appName": app_name,
                "loginUrl": login_url,
                "supportEmail": support_email,
            },
        )

    def send_password_reset(
        self,
        to: str,
        reset_url: str,
        name: str = "there",
        expires_in_minutes: int = 15,
        subject: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Send a password reset link email."""
        if not reset_url:
            raise DaklyValidationError("Password reset URL ('reset_url') is required.")
        return self.send_template(
            to=to,
            template="password_reset",
            subject=subject,
            vars={
                "name": name,
                "resetUrl": reset_url,
                "validity": f"{expires_in_minutes} minutes",
            },
        )

    def send_notes(
        self,
        to: str,
        subject_name: str,
        notes_title: str,
        download_url: str = "#",
        student_name: str = "Student",
        exam_notice: Optional[str] = None,
        professor_name: str = "Department Faculty",
        attachments: Optional[List[Dict[str, Any]]] = None,
        subject: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Send college notes, PDF study materials, and exam notices."""
        return self.send_template(
            to=to,
            template="notes",
            subject=subject,
            attachments=attachments,
            vars={
                "studentName": student_name,
                "subjectName": subject_name,
                "notesTitle": notes_title,
                "downloadUrl": download_url,
                "examNotice": exam_notice or "Mid-term examinations start next week. Please review carefully.",
                "professorName": professor_name,
            },
        )

    def send_invoice(
        self,
        to: str,
        invoice_number: str,
        amount: str,
        due_date: str = "Upon Receipt",
        download_url: str = "#",
        client_name: str = "Valued Customer",
        items_summary: Optional[str] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
        subject: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Send a professional invoice or billing receipt."""
        return self.send_template(
            to=to,
            template="invoice",
            subject=subject,
            attachments=attachments,
            vars={
                "clientName": client_name,
                "invoiceNumber": invoice_number,
                "amount": amount,
                "dueDate": due_date,
                "downloadUrl": download_url,
                "itemsSummary": items_summary or "Standard Cloud Microservice Subscription",
            },
        )

    def ping(self) -> Dict[str, Any]:
        """Test API Key authentication and inspect sender health & daily capacity."""
        return self._request("/api/ping", method="GET")

    def get_templates(self) -> Dict[str, Any]:
        """Fetch list of all supported dynamic email templates."""
        return self._request("/api/templates", method="GET")

    def get_logs(
        self,
        page: int = 1,
        limit: int = 20,
        status: Optional[str] = None,
        search: Optional[str] = None,
        template: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Search and paginate delivery audit logs."""
        params = {
            "page": page,
            "limit": limit,
            "status": status,
            "search": search,
            "template": template,
        }
        return self._request("/api/logs", method="GET", params=params)

    def get_stats(self) -> Dict[str, Any]:
        """Fetch real-time delivery metrics, open rates, and device statistics."""
        return self._request("/api/stats", method="GET")

    def get_status(self, tracking_id: str) -> Dict[str, Any]:
        """Inspect the live delivery status of an email by trackingId."""
        if not tracking_id:
            raise DaklyValidationError("tracking_id is required.")
        return self._request(f"/api/status/{urllib.parse.quote(tracking_id.strip())}", method="GET")
