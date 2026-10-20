# Dakly REST API Reference

Base Production URL:
```
https://dakly-engin.vercel.app
```

Local Development URL:
```
http://localhost:5000
```

---

## Authentication

Dakly supports two methods of authentication depending on the endpoint:

1. **API Key Authentication (For SDKs & Automated Scripts)**:
   Pass your project's API key in the `x-api-key` header:
   ```http
   x-api-key: gkey_live_abcdef0123456789abcdef0123456789abcdef0123456789
   ```
2. **Bearer JWT Token (For Dashboard Management & Team Operations)**:
   Pass the JWT received from `/api/auth/login` in the `Authorization` header:
   ```http
   Authorization: Bearer <jwt_token>
   ```

---

## 1. Email Delivery Endpoints

### `POST /api/send`
Dispatches a transactional email through the project's configured Gmail relay.

**Headers:**
```http
Content-Type: application/json
x-api-key: gkey_live_...
```

**Request Body (Using Dynamic Templates):**
```json
{
  "to": "recipient@example.com",
  "subject": "Your One-Time Password",
  "template": "otp",
  "vars": {
    "code": "729401",
    "name": "Alex",
    "expiry": "10 minutes"
  },
  "trackOpens": true,
  "trackClicks": true
}
```

**Request Body (Raw HTML or Text):**
```json
{
  "to": "recipient@example.com",
  "subject": "Welcome to Acme",
  "html": "<h1>Welcome</h1><p>Thanks for joining!</p>",
  "text": "Welcome to Acme!",
  "attachments": [
    {
      "filename": "guide.pdf",
      "content": "JVBERi0xLjQK...",
      "contentType": "application/pdf"
    }
  ]
}
```

**Successful Response (200 OK):**
```json
{
  "success": true,
  "trackingId": "tr_67139a04f2...",
  "status": "queued",
  "recipient": "recipient@example.com",
  "message": "Email accepted for delivery."
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid `x-api-key`.
- `403 Forbidden`: Caller IP not allowed by project IP whitelist.
- `422 Unprocessable Entity`: Recipient email is on the hard-bounce suppression list.
- `429 Too Many Requests`: Project has exceeded its daily warm-up or Gmail limit.

---

### `GET /api/status/:trackingId`
Retrieves the real-time delivery status, open tracking, and click analytics for a specific email.

**Headers:**
```http
x-api-key: gkey_live_...
```

**Response (200 OK):**
```json
{
  "success": true,
  "trackingId": "tr_67139a04f2...",
  "status": "delivered",
  "recipient": "recipient@example.com",
  "subject": "Your One-Time Password",
  "opened": true,
  "openCount": 2,
  "firstOpenedAt": "2026-10-19T14:32:10.000Z",
  "lastOpenedAt": "2026-10-19T14:45:00.000Z",
  "clicks": 1,
  "deviceType": "Mobile",
  "createdAt": "2026-10-19T14:30:00.000Z"
}
```

---

## 2. Tracking Endpoints

### `GET /api/track/open/:trackingId`
Zero-latency 1x1 transparent tracking pixel. Appended invisibly to tracked emails. Returns a 1x1 transparent GIF (`image/gif`) with `Cache-Control: no-cache, no-store`.

### `GET /api/track/click/:trackingId?url=<target_url>`
Hyperlink redirection endpoint. Increments click metrics and immediately issues a `302 Found` redirect to the destination URL.

---

## 3. Project Security & Team Management Endpoints

### `POST /api/projects/:id/rotate-key`
Instantly generates a new `gkey_live_...` API key and revokes the existing one.

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "apiKey": "gkey_live_79a401b88e14...",
  "message": "New API key successfully generated. Please update your environment variables."
}
```

---

### `PUT /api/projects/:id/security`
Updates project CIDR IP whitelisting rules.

**Headers:**
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "ipWhitelist": [
    "203.0.113.195",
    "192.168.1.0/24",
    "10.0.*.*"
  ]
}
```

---

### `POST /api/projects/:id/members`
Invites a team member to collaborate on the project with a assigned role.

**Request Body:**
```json
{
  "email": "engineer@acme.com",
  "role": "admin"
}
```

---

### `POST /api/projects/:id/webhook-secret`
Regenerates a cryptographic HMAC webhook secret starting with `daksec_`.

**Response (200 OK):**
```json
{
  "success": true,
  "webhookSecret": "daksec_5d098e41a87b64..."
}
```

---

### `POST /api/projects/:id/test-webhook`
Sends a test payload to the project's configured `webhookUrl` to verify connectivity and signature matching.

**Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "latencyMs": 84,
  "message": "Webhook test delivered successfully."
}
```
