"""
Unit Tests for Dakly Official Python SDK
"""

import sys
import os
import unittest
from unittest.mock import patch, MagicMock

# Add sdk/python to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sdk", "python")))

from dakly import (
    Dakly,
    DaklyError,
    DaklyAuthenticationError,
    DaklyRateLimitError,
    DaklySuppressedError,
    DaklyValidationError,
)


class TestDaklyPythonSdk(unittest.TestCase):
    def test_instantiation(self):
        client = Dakly("gkey_test_python")
        self.assertEqual(client.api_key, "gkey_test_python")
        self.assertEqual(client.base_url, "https://dakly-engin.vercel.app")
        self.assertEqual(client.timeout, 15)
        self.assertTrue(client.throw_on_suppressed)

    def test_missing_api_key_throws_auth_error(self):
        client = Dakly("")
        with self.assertRaises(DaklyAuthenticationError):
            client.send_otp(to="test@test.com", code="123456")

    def test_validation_errors(self):
        client = Dakly("gkey_valid")
        with self.assertRaises(DaklyValidationError):
            client.send(to="")

        with self.assertRaises(DaklyValidationError):
            client.send_otp(to="user@test.com", code=None)

    @patch("urllib.request.urlopen")
    def test_send_otp_payload(self, mock_urlopen):
        # Mock successful response
        mock_resp = MagicMock()
        mock_resp.read.return_value = b'{"success": true, "status": "DELIVERED", "trackingId": "tr_py_1"}'
        mock_resp.__enter__.return_value = mock_resp
        mock_urlopen.return_value = mock_resp

        client = Dakly("gkey_python_test")
        res = client.send_otp(to="student@gmail.com", code="849201", app_name="StudyHub", expires_in_minutes=15)

        self.assertTrue(res["success"])
        self.assertEqual(res["trackingId"], "tr_py_1")

        # Verify request details
        call_args, _ = mock_urlopen.call_args
        req = call_args[0]
        self.assertEqual(req.full_url, "https://dakly-engin.vercel.app/api/send")
        self.assertEqual(req.headers["X-api-key"], "gkey_python_test")

        import json
        body = json.loads(req.data.decode("utf-8"))
        self.assertEqual(body["to"], "student@gmail.com")
        self.assertEqual(body["template"], "otp")
        self.assertEqual(body["vars"]["otp"], "849201")
        self.assertEqual(body["vars"]["appName"], "StudyHub")
        self.assertEqual(body["vars"]["validity"], "15 minutes")

    @patch("urllib.request.urlopen")
    def test_suppressed_error(self, mock_urlopen):
        mock_resp = MagicMock()
        mock_resp.read.return_value = (
            b'{"success": false, "status": "BLOCKED_SUPPRESSED", "trackingId": "tr_supp", "reason": "HARD_BOUNCE"}'
        )
        mock_resp.__enter__.return_value = mock_resp
        mock_urlopen.return_value = mock_resp

        client = Dakly("gkey_python_test")
        with self.assertRaises(DaklySuppressedError) as ctx:
            client.send_otp(to="bounced@bad.com", code="123456")

        self.assertTrue(ctx.exception.suppressed)
        self.assertEqual(ctx.exception.tracking_id, "tr_supp")

    def test_standalone_python_drop_in(self):
        # Test sdk/dakly.py
        import importlib.util
        spec = importlib.util.spec_from_file_location("dakly_standalone", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sdk", "dakly.py")))
        standalone = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(standalone)

        client = standalone.Dakly("gkey_standalone_py")
        self.assertEqual(client.api_key, "gkey_standalone_py")
        self.assertTrue(hasattr(client, "send_otp"))
        self.assertTrue(hasattr(client, "send_notes"))

    def test_webhook_verification(self):
        import hmac
        import hashlib
        secret = "whsec_supersecret123"
        payload = {"event": "email.delivered", "trackingId": "tr_123"}
        body_str = '{"event":"email.delivered","trackingId":"tr_123"}'
        sig = hmac.new(secret.encode("utf-8"), body_str.encode("utf-8"), hashlib.sha256).hexdigest()

        # Both with sha256= prefix and without
        self.assertTrue(Dakly.verify_webhook_signature(body_str, f"sha256={sig}", secret))
        self.assertTrue(Dakly.verify_webhook_signature(body_str, sig, secret))
        self.assertFalse(Dakly.verify_webhook_signature(body_str, "sha256=invalid", secret))
        self.assertFalse(Dakly.verify_webhook_signature(body_str, sig, "whsec_wrong"))


if __name__ == "__main__":
    unittest.main()
