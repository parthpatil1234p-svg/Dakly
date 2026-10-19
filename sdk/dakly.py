"""
Dakly - Standalone Zero-Dependency SDK (Single File Drop-In)
https://dakly.vercel.app

Usage:
    from dakly import Dakly
    dakly = Dakly("gkey_live_...")
    dakly.send_otp(to="user@example.com", code="849201")
"""

import os
import json
import urllib.request
import urllib.error
import urllib.parse
from typing import Optional, Dict, Any, List, Union


class DaklyError(Exception):
    def __init__(self, message, status_code=500, status="ERROR", tracking_id=None, details=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.status = status
        self.tracking_id = tracking_id
        self.details = details or {}

    def __str__(self):
        return f"[{self.status_code}] {self.message}"


class DaklyAuthenticationError(DaklyError):
    def __init__(self, message="Invalid or missing Dakly API Key.", status_code=401, details=None):
        super().__init__(message, status_code=status_code, status="UNAUTHORIZED", details=details)


class DaklyRateLimitError(DaklyError):
    def __init__(self, message="Daily quota or rate limit exceeded.", status_code=429, details=None):
        super().__init__(message, status_code=status_code, status="RATE_LIMITED", details=details)


class DaklySuppressedError(DaklyError):
    def __init__(self, message="Recipient blocked on bounce suppression list.", tracking_id=None, reason="HARD_BOUNCE", details=None):
        super().__init__(message, status_code=200, status="BLOCKED_SUPPRESSED", tracking_id=tracking_id, details=details)
        self.suppressed = True
        self.reason = reason


class DaklyValidationError(DaklyError):
    def __init__(self, message="Invalid parameters provided to Dakly SDK.", status_code=400, details=None):
        super().__init__(message, status_code=status_code, status="VALIDATION_ERROR", details=details)


class Dakly:
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: int = 15,
        throw_on_suppressed: bool = True,
    ):
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
        if not self.api_key:
            raise DaklyAuthenticationError("Dakly API Key required. Set DAKLY_API_KEY or pass to constructor.")

        url = f"{self.base_url}{endpoint if endpoint.startswith('/') else '/' + endpoint}"
        if params:
            clean_params = {k: v for k, v in params.items() if v is not None}
            if clean_params:
                url += "?" + urllib.parse.urlencode(clean_params)

        headers = {
            "Accept": "application/json",
            "x-api-key": self.api_key,
            "User-Agent": "Dakly-Python-Standalone/1.0.0",
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
                if data.get("status") == "BLOCKED_SUPPRESSED" and self.throw_on_suppressed:
                    raise DaklySuppressedError(
                        message=data.get("error", "Recipient suppressed due to bounce."),
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
            raise DaklyError(f"Connection failed: {url_err.reason}", status_code=500)

    def send(self, to: str, **kwargs) -> Dict[str, Any]:
        if not to:
            raise DaklyValidationError("Recipient email ('to') is required.")
        payload = {"to": to.strip().lower(), **kwargs}
        return self._request("/api/send", method="POST", payload=payload)

    def send_otp(self, to: str, code: Union[str, int], app_name: str = "Dakly App", expires_in_minutes: int = 10, **kwargs) -> Dict[str, Any]:
        return self.send(
            to=to,
            template="otp",
            vars={"otp": str(code), "appName": app_name, "validity": f"{expires_in_minutes} minutes"},
            **kwargs,
        )

    def send_template(self, to: str, template: str, vars: Optional[Dict[str, Any]] = None, **kwargs) -> Dict[str, Any]:
        return self.send(to=to, template=template, vars=vars or {}, **kwargs)

    def send_welcome(self, to: str, name: str = "there", app_name: str = "Our Platform", login_url: str = "https://dakly.vercel.app", **kwargs) -> Dict[str, Any]:
        return self.send_template(
            to=to,
            template="welcome",
            vars={"name": name, "appName": app_name, "loginUrl": login_url, "supportEmail": kwargs.get("support_email", "support@dakly.com")},
            **kwargs,
        )

    def send_password_reset(self, to: str, reset_url: str, name: str = "there", expires_in_minutes: int = 15, **kwargs) -> Dict[str, Any]:
        return self.send_template(
            to=to,
            template="password_reset",
            vars={"name": name, "resetUrl": reset_url, "validity": f"{expires_in_minutes} minutes"},
            **kwargs,
        )

    def send_notes(self, to: str, subject_name: str, notes_title: str, download_url: str = "#", student_name: str = "Student", **kwargs) -> Dict[str, Any]:
        return self.send_template(
            to=to,
            template="notes",
            vars={
                "studentName": student_name,
                "subjectName": subject_name,
                "notesTitle": notes_title,
                "downloadUrl": download_url,
                "examNotice": kwargs.get("exam_notice", "Mid-term examinations start next week."),
                "professorName": kwargs.get("professor_name", "Department Faculty"),
            },
            **kwargs,
        )

    def send_invoice(self, to: str, invoice_number: str, amount: str, due_date: str = "Upon Receipt", download_url: str = "#", **kwargs) -> Dict[str, Any]:
        return self.send_template(
            to=to,
            template="invoice",
            vars={
                "clientName": kwargs.get("client_name", "Valued Customer"),
                "invoiceNumber": invoice_number,
                "amount": amount,
                "dueDate": due_date,
                "downloadUrl": download_url,
                "itemsSummary": kwargs.get("items_summary", "Standard Cloud Microservice Subscription"),
            },
            **kwargs,
        )

    def ping(self) -> Dict[str, Any]:
        return self._request("/api/ping", method="GET")

    def get_templates(self) -> Dict[str, Any]:
        return self._request("/api/templates", method="GET")

    def get_logs(self, **kwargs) -> Dict[str, Any]:
        return self._request("/api/logs", method="GET", params=kwargs)

    def get_stats(self) -> Dict[str, Any]:
        return self._request("/api/stats", method="GET")

    def get_status(self, tracking_id: str) -> Dict[str, Any]:
        return self._request(f"/api/status/{urllib.parse.quote(tracking_id.strip())}", method="GET")
