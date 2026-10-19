# Dakly Webhooks Guide

Webhooks allow your application to receive real-time HTTP `POST` notifications whenever key lifecycle events occur on your transactional emails.

---

## 1. Supported Event Catalog

| Event Name | Description |
|---|---|
| `email.sent` | Dispatched when the email is accepted and sent through the Gmail SMTP relay. |
| `email.delivered` | Emitted when the SMTP handshake completes successfully. |
| `email.opened` | Triggered the first time a recipient views the email and loads the tracking pixel. |
| `email.clicked` | Triggered when a recipient clicks a tracked hyperlink in the email. |
| `email.suppressed` | Dispatched if an address bounces or is blocked to protect account sender health. |
| `webhook.test` | Emitted manually from the Dakly dashboard to verify endpoint connectivity. |

---

## 2. Webhook Payload Structure

Each incoming webhook notification sends a standard JSON payload:

```json
{
  "event": "email.opened",
  "projectId": "671391abf0123...",
  "trackingId": "tr_67139a04f2...",
  "recipient": "customer@example.com",
  "subject": "Your Order Confirmation #8192",
  "status": "opened",
  "device": "Mobile",
  "timestamp": "2026-10-19T18:42:01.120Z",
  "metadata": {
    "openCount": 1
  }
}
```

---

## 3. Cryptographic Signature Verification (`x-dakly-signature`)

To ensure webhooks are genuinely sent by Dakly and have not been altered in transit, Dakly attaches an HMAC-SHA256 header to every request:

```http
x-dakly-signature: sha256=<64_character_hex_string>
```

Your server should compute the HMAC hash of the raw request body using your secret (`daksec_...`) and verify that it matches.

### Node.js / Express Example (Using `@dakly/sdk`)
```javascript
import express from 'express';
import { Dakly } from 'dakly';

const app = express();
app.use(express.json());

app.post('/api/webhooks/dakly', (req, res) => {
  const signature = req.headers['x-dakly-signature'];
  const isValid = Dakly.verifyWebhookSignature({
    payload: req.body,
    signature,
    secret: process.env.DAKLY_WEBHOOK_SECRET // 'daksec_...'
  });

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid HMAC signature' });
  }

  const { event, trackingId, recipient } = req.body;
  console.log(`[Dakly Event] ${event} for ${recipient}`);

  res.status(200).json({ received: true });
});
```

---

### Next.js App Router Example (`app/api/webhooks/dakly/route.ts`)
```typescript
import { NextResponse } from 'next/server';
import { Dakly } from 'dakly';

export async function POST(req: Request) {
  const body = await req.json();
  const signature = req.headers.get('x-dakly-signature') || '';

  const isValid = Dakly.verifyWebhookSignature({
    payload: body,
    signature,
    secret: process.env.DAKLY_WEBHOOK_SECRET!
  });

  if (!isValid) {
    return NextResponse.json({ error: 'Unauthorized signature' }, { status: 401 });
  }

  const { event, trackingId, recipient } = body;
  console.log(`[Next.js Webhook] ${event} -> ${recipient}`);

  return NextResponse.json({ success: true });
}
```

---

### Python / FastAPI Example (Using `dakly` SDK)
```python
from fastapi import FastAPI, Request, HTTPException
from dakly import Dakly
import os

app = FastAPI()

@app.post("/api/webhooks/dakly")
async def handle_dakly_webhook(request: Request):
    payload = await request.json()
    signature = request.headers.get("x-dakly-signature", "")
    secret = os.environ.get("DAKLY_WEBHOOK_SECRET", "daksec_...")

    is_valid = Dakly.verify_webhook_signature(
        payload=payload,
        signature=signature,
        secret=secret
    )

    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid HMAC signature")

    event = payload.get("event")
    recipient = payload.get("recipient")
    print(f"[FastAPI Webhook] {event} received for {recipient}")

    return {"status": "ok"}
```

---

### Go Example (Native `crypto/hmac`)
```go
package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"
	"os"
	"strings"
)

func webhookHandler(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Cannot read body", http.StatusBadRequest)
		return
	}

	sigHeader := r.Header.Get("x-dakly-signature")
	rawSig := strings.TrimPrefix(sigHeader, "sha256=")
	secret := os.Getenv("DAKLY_WEBHOOK_SECRET")

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expectedHex := hex.EncodeToString(mac.Sum(nil))

	if !hmac.Equal([]byte(rawSig), []byte(expectedHex)) {
		http.Error(w, "Unauthorized signature", http.StatusUnauthorized)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"received": true}`))
}
```

---

## 4. Best Practices

1. **Acknowledge Quickly (< 5 seconds)**:
   Respond with a `200 OK` or `202 Accepted` immediately upon verifying the signature. Offload heavy processing (such as sending push notifications or compiling PDF invoices) to background task workers.
2. **Idempotency**:
   Use the `trackingId` as an idempotency key in your database to ensure you do not process duplicate events if a network retry occurs.
3. **Environment Secrets**:
   Store your `daksec_...` secret in environment variables (`process.env.DAKLY_WEBHOOK_SECRET`), never hardcode it into git repositories.
