"""
Dakly Python SDK Exceptions
"""

class DaklyError(Exception):
    """Base exception for all Dakly SDK errors."""
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
    """Raised when API Key is missing or invalid (HTTP 401/403)."""
    def __init__(self, message="Invalid or missing Dakly API Key.", status_code=401, details=None):
        super().__init__(message, status_code=status_code, status="UNAUTHORIZED", details=details)


class DaklyRateLimitError(DaklyError):
    """Raised when daily quota limit or burst rate limit is reached (HTTP 429)."""
    def __init__(self, message="Daily quota or rate limit exceeded.", status_code=429, details=None):
        super().__init__(message, status_code=status_code, status="RATE_LIMITED", details=details)


class DaklySuppressedError(DaklyError):
    """Raised when recipient is blocked by the hard-bounce suppression list."""
    def __init__(self, message="Recipient blocked on bounce suppression list.", tracking_id=None, reason="HARD_BOUNCE", details=None):
        super().__init__(message, status_code=200, status="BLOCKED_SUPPRESSED", tracking_id=tracking_id, details=details)
        self.suppressed = True
        self.reason = reason


class DaklyValidationError(DaklyError):
    """Raised when input validation fails (missing required arguments)."""
    def __init__(self, message="Invalid parameters provided to Dakly SDK.", status_code=400, details=None):
        super().__init__(message, status_code=status_code, status="VALIDATION_ERROR", details=details)
