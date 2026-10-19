"""
Dakly Official Python SDK
The High-Performance Free Gmail Microservice for Developers
"""

from .client import Dakly
from .exceptions import (
    DaklyError,
    DaklyAuthenticationError,
    DaklyRateLimitError,
    DaklySuppressedError,
    DaklyValidationError,
)

__version__ = "1.0.0"
__all__ = [
    "Dakly",
    "DaklyError",
    "DaklyAuthenticationError",
    "DaklyRateLimitError",
    "DaklySuppressedError",
    "DaklyValidationError",
]
