# Dakly Developer SDK Guide

Dakly provides official, zero-dependency SDKs for both **Node.js / TypeScript** and **Python**.

---

## 1. Node.js & TypeScript SDK

### Installation
```bash
npm install dakly
# or
yarn add dakly
# or
pnpm add dakly
```

### Quickstart
```javascript
import { Dakly } from 'dakly';

const dakly = new Dakly(process.env.DAKLY_API_KEY);

// 1. Send OTP / Auth Code
const otpResult = await dakly.sendOtp({
  to: 'user@example.com',
  code: '849201',
  name: 'Alex'
});
console.log('OTP Queued:', otpResult.trackingId);

// 2. Send Welcome Onboarding Email
const welcomeResult = await dakly.sendWelcome({
  to: 'newuser@example.com',
  name: 'Sarah',
  loginUrl: 'https://app.acme.com/login'
});

// 3. Send Notes or PDF Delivery
const notesResult = await dakly.sendNotes({
  to: 'student@university.edu',
  name: 'Rahul',
  subjectName: 'Computer Networks',
  downloadUrl: 'https://storage.acme.com/notes.pdf'
});

// 4. Send Invoice / Transaction Receipt
const invoiceResult = await dakly.sendInvoice({
  to: 'billing@client.com',
  name: 'Acme Corp',
  invoiceNumber: 'INV-2026-001',
  amount: '$299.00',
  invoiceUrl: 'https://app.acme.com/invoices/001.pdf'
});
```

### Checking Delivery Status
```javascript
const status = await dakly.getStatus(otpResult.trackingId);
console.log(`Email Status: ${status.status}, Opened: ${status.opened}`);
```

### Error Handling & Typed Exceptions
```javascript
import { 
  Dakly, 
  DaklyAuthenticationError, 
  DaklySuppressedError, 
  DaklyRateLimitError, 
  DaklyValidationError 
} from 'dakly';

try {
  await dakly.sendOtp({ to: 'invalid@bounce.com', code: '123456' });
} catch (error) {
  if (error instanceof DaklySuppressedError) {
    console.warn(`Address ${error.recipient} is suppressed due to previous hard bounce.`);
  } else if (error instanceof DaklyRateLimitError) {
    console.warn('Daily warm-up or Gmail quota exceeded. Please retry later.');
  } else if (error instanceof DaklyAuthenticationError) {
    console.error('Invalid API Key. Check your environment variables.');
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

---

## 2. Python SDK

### Installation
```bash
pip install dakly
```
*(Or use directly from `sdk/python/dakly` in the repository)*

### Quickstart
```python
from dakly import Dakly, DaklySuppressedError, DaklyRateLimitError
import os

mailer = Dakly(api_key=os.environ.get("DAKLY_API_KEY"))

# 1. Send OTP
res = mailer.send_otp(
    to="developer@company.com",
    code="928301",
    name="Vikram"
)
print("Tracking ID:", res["trackingId"])

# 2. Send Custom Template
res = mailer.send(
    to="developer@company.com",
    subject="Welcome to Dakly",
    template="welcome",
    vars={"name": "Vikram", "actionUrl": "https://company.com/start"},
    track_opens=True,
    track_clicks=True
)

# 3. Check Real-Time Analytics
status = mailer.get_status(res["trackingId"])
print("Opens:", status.get("openCount", 0))
```

### Python Exception Hierarchy
```python
from dakly import (
    Dakly,
    DaklyAuthenticationError,
    DaklyValidationError,
    DaklySuppressedError,
    DaklyRateLimitError
)

try:
    mailer.send_otp(to="user@example.com", code="123456")
except DaklySuppressedError as e:
    print(f"Address {e.recipient} was blocked by bounce suppression.")
except DaklyRateLimitError as e:
    print("Rate limit exceeded:", e.message)
except DaklyAuthenticationError:
    print("Invalid API Key.")
```

---

## 3. Webhook Signature Verification

Both SDKs provide zero-dependency cryptographic helpers to verify incoming webhook payloads:

### Node.js:
```javascript
const isValid = Dakly.verifyWebhookSignature({
  payload: req.body,
  signature: req.headers['x-dakly-signature'],
  secret: process.env.DAKLY_WEBHOOK_SECRET // 'daksec_...'
});
```

### Python:
```python
is_valid = Dakly.verify_webhook_signature(
    payload=request_body,
    signature=request_headers.get("x-dakly-signature"),
    secret=os.environ.get("DAKLY_WEBHOOK_SECRET")
)
```
