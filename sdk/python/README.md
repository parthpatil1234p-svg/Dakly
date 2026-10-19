# ⚡ dakly (Official Python SDK)

[![PyPI version](https://img.shields.io/pypi/v/dakly.svg?color=blue)](https://pypi.org/project/dakly/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success.svg)](https://dakly.vercel.app)

The official zero-dependency Python client library for **[Dakly](https://dakly.vercel.app)** — the high-performance, developer-first Gmail microservice.

---

## 🚀 Installation

```bash
pip install dakly
```

*Requires Python 3.8+. Zero external pip dependencies needed (uses standard library `urllib`).*

---

## 🔑 Quick Start

```python
from dakly import Dakly

dakly = Dakly("gkey_live_...")

# 1-Liner: Send Modern Verification OTP
res = dakly.send_otp(
    to="student@example.com",
    code="849201",
    app_name="My Startup",
    expires_in_minutes=10
)
print("Delivered! Tracking ID:", res["trackingId"])
```

### Pre-Built Responsive Email Templates
```python
# Welcome Email
dakly.send_welcome(
    to="newuser@example.com",
    name="Rahul",
    app_name="EduVibe",
    login_url="https://eduvibe.in/login"
)

# Password Reset
dakly.send_password_reset(
    to="user@example.com",
    name="Pooja",
    reset_url="https://myapp.com/reset?token=abc"
)

# College Notes Delivery with PDF Attachment
dakly.send_notes(
    to="student@college.edu",
    student_name="Amit",
    subject_name="Computer Networks",
    notes_title="Unit 3 - TCP Congestion Control",
    download_url="https://college.edu/notes.pdf",
    attachments=[
        {"filename": "Notes_Unit3.pdf", "path": "https://college.edu/notes.pdf"}
    ]
)
```

### Capacity & Health Check
```python
ping = dakly.ping()
print("Project:", ping["project"])
print("Remaining Today:", ping["capacity"]["remainingToday"])
```
