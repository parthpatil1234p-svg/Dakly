# Dakly Architecture & System Design

This document details the architectural design, security mechanisms, pacing logic, and data flows of **Dakly** — the zero-setup headless transactional email engine.

---

## 1. High-Level Architecture Diagram

```
+--------------------------------------------------------------------------+
|                                CLIENTS                                   |
|   +-----------------------+   +-------------------+   +--------------+   |
|   |  Node.js / TS SDK     |   |    Python SDK     |   | Direct cURL/ |   |
|   |  (`@dakly/sdk`)       |   |    (`dakly`)      |   | HTTP Client  |   |
|   +-----------+-----------+   +---------+---------+   +-------+------+   |
+---------------|-------------------------|---------------------|----------+
                |                         |                     |
                +-------------------------v---------------------+
                                          |
                                          v  HTTPS / TLS 1.3
+--------------------------------------------------------------------------+
|                         DAKLY BACKEND ENGINE                             |
|                                                                          |
|   +------------------------------------------------------------------+   |
|   | 1. Ingress & Security Layer:                                     |   |
|   |    - Helmet & CORS headers                                       |   |
|   |    - CIDR IP Whitelist / Wildcard IP Filter (Feature 6)          |   |
|   |    - API Key Validation (`gkey_live_...`)                        |   |
|   +---------------------------------+--------------------------------+   |
|                                     |                                    |
|   +---------------------------------v--------------------------------+   |
|   | 2. Validation & Processing Layer:                                |   |
|   |    - Dynamic HTML Template Engine (Feature 1)                    |   |
|   |    - Tracking Pixel & Link Rewriter (Feature 2)                  |   |
|   |    - Anti-Piracy / MIME File Sniffer                             |   |
|   |    - Hard Bounce Suppression Filter (Feature 3)                  |   |
|   +---------------------------------+--------------------------------+   |
|                                     |                                    |
|   +---------------------------------v--------------------------------+   |
|   | 3. Smart Warm-up & Pacing Dispatcher:                            |   |
|   |    - 7-Day Warm-up Rate Limiter (Feature 3)                      |   |
|   |    - Concurrency-Controlled In-Memory Queue                      |   |
|   |    - AES-256-GCM Decryption of Gmail SMTP Credentials            |   |
|   +---------------------------------+--------------------------------+   |
|                                     |                                    |
|   +---------------------------------v--------------------------------+   |
|   | 4. Delivery & Asynchronous Webhook Layer:                        |   |
|   |    - Nodemailer Gmail SMTP Relay (Port 465 / 587)                |   |
|   |    - HMAC-SHA256 Webhook Dispatcher (`daksec_...`) (Feature 5)   |   |
|   |    - MongoDB Audit Logging (`EmailLog`)                          |   |
|   +------------------------------------------------------------------+   |
+-------------------------------------+------------------------------------+
                                      |
              +-----------------------+-----------------------+
              |                                               |
              v                                               v
+-------------------------------+             +-------------------------------+
|     GOOGLE GMAIL SMTP         |             |       DEVELOPER SERVER        |
|  smtp.gmail.com:465 (SSL)     |             |  Webhook URL (`/api/webhook`) |
|  -> Delivers to Recipient     |             |  <- Receives `email.delivered`|
+-------------------------------+             +-------------------------------+
```

---

## 2. Core Subsystems

### A. Security & Ingress Pipeline
1. **API Key Authentication (`authApiKey.js`)**:
   - Each project is assigned a cryptographically unique `gkey_live_<48-hex-chars>` token.
   - Keys are indexed and looked up in MongoDB.
2. **CIDR IP Whitelist Filter (`ipFilter.js`)**:
   - Compares the inbound caller IP (`x-forwarded-for`, `req.ip`) against configured rules.
   - Supports exact IPs (`192.168.1.50`), wildcards (`10.0.*.*`), and CIDR blocks (`172.16.0.0/16`).
   - If IP whitelisting is active on a project, any request from an unlisted IP returns `403 Forbidden` immediately before database queries or template rendering.

### B. Dynamic Template Engine (`templateEngine.js`)
- Pre-compiles 5 high-converting, responsive email layouts:
  1. `otp`: Two-factor / one-time authentication code card.
  2. `welcome`: Account activation and onboarding call-to-action.
  3. `password_reset`: Secure password reset link card.
  4. `notes`: Study materials / university document delivery with attachments.
  5. `invoice`: Transactional payment receipt with billing breakdown.
- Automatically substitutes `{{variable_name}}` tags.
- Injects brand logo (1:1 WebP) and sender details into the email header dynamically.

### C. Tracking & Analytics Engine (`trackingHelper.js`)
- **Open Tracking**:
  - Automatically appends a hidden 1x1 GIF tracking pixel:
    `<img src="https://dakly-engin.vercel.app/api/track/open/<trackingId>" width="1" height="1" style="display:none;" />`
  - When the recipient opens the email in Apple Mail, Gmail, or Outlook, the tracking route records `openedAt`, `openCount`, and parses User-Agent for device categorization (Mobile vs Desktop).
- **Click Tracking**:
  - Replaces all `<a href="...">` hyperlinks in the HTML body with an encrypted redirect URL:
    `https://dakly-engin.vercel.app/api/track/click/<trackingId>?url=<encoded_target>`
  - Increments `clickCount` and redirects the user with `302 Found` to the original URL without perceptible delay (<15ms).

### D. Smart Warm-up & Bounce Protection (`warmupHelper.js`)
- **Sender Reputation Protection**:
  - Newly connected Gmail accounts risk getting flagged or suspended if they blast 500 emails on day 1.
  - Dakly tracks the project creation date and calculates daily sending allowances:
    - Day 1: 20 emails
    - Day 2: 50 emails
    - Day 3: 100 emails
    - Day 4: 200 emails
    - Day 5: 350 emails
    - Day 6+: 500 emails (full Gmail quota)
- **Hard Bounce Suppression**:
  - If Gmail returns `550 5.1.1 User unknown` or `Address rejected`, Dakly automatically flags the email in the `Suppression` collection.
  - Future dispatch attempts to suppressed addresses are intercepted with `422 Unprocessable Entity` (`DaklySuppressedError`), preventing repeated SMTP strikes against your Gmail account.

### E. Webhook Engine & Cryptographic HMAC (`webhookService.js`)
- Asynchronous, fire-and-forget webhook delivery on critical lifecycle events:
  - `email.sent`
  - `email.delivered`
  - `email.opened`
  - `email.clicked`
  - `email.suppressed`
- Outgoing webhooks calculate an HMAC-SHA256 signature over the raw JSON payload using the project's `daksec_...` secret:
  ```
  x-dakly-signature: sha256=<64-char-hex-digest>
  ```
- Developers verify this signature on their server to guarantee webhook authenticity and prevent spoofing.

---

## 3. Database Schema Overview (MongoDB)

| Collection | Key Fields | Description |
|---|---|---|
| `users` | `name`, `email`, `passwordHash`, `role`, `createdAt` | Dashboard accounts |
| `projects` | `name`, `apiKey`, `gmailEmail`, `gmailAppPassword` (encrypted), `warmupEnabled`, `webhookUrl`, `webhookSecret`, `ipWhitelist`, `members` | Email sending credentials, configuration, and security rules |
| `emaillogs` | `projectId`, `trackingId`, `recipient`, `subject`, `template`, `status`, `opened`, `openCount`, `clicks`, `deviceType`, `createdAt` | Audit trail of all dispatched emails and tracking analytics |
| `suppressions` | `projectId`, `email`, `reason`, `createdAt` | Bounced or uncontactable email blacklist |
