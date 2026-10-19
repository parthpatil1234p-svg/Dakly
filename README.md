# 📮 Dakly

> **The Zero-Setup Headless Transactional Email Engine for Developers.**  
> Send OTPs, custom HTML emails, notes, receipts, and PDFs across all your projects with a single API call — powered by your own Gmail or SMTP accounts with zero monthly subscription fees.

---

## ✨ Features

- ⚡ **Zero-Setup Delivery Pipeline:** No need to configure Nodemailer or SMTP in every single project. Just make a single `POST` request.
- 🖥️ **Modern Web Dashboard & Playground:** Built-in React + Vite + Tailwind dashboard in `frontend/` to manage senders, API keys, delivery logs, and shoot live test emails with confetti feedback.
- 🔐 **Military-Grade Security (AES-256-GCM):** Google App Passwords and credentials are encrypted using authenticated AES-256-GCM encryption.
- 👥 **Multi-Tenant User Isolation:** Developers sign up and authenticate with JWT; all projects, API keys, and email logs remain 100% private to each account.
- 🔀 **Multi-Account Failover & Anti-Spam Pacing:** Pool primary and backup Gmail senders (1,000+ free emails/day) with 200ms burst pacing to prevent Google rate limits.
- 📎 **Remote & Base64 Attachments:** Send PDFs, invoices, and documents up to 15MB via remote URLs or direct base64 payloads.
- 🔔 **HMAC Delivery Webhooks:** Automated callbacks to your client app on email delivery or bounce.

---

## 🏗️ Architecture

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Student / Customer
    participant App as Your Main Project (App / Web)
    participant Dakly as Dakly Engine (Microservice)
    participant DB as MongoDB Atlas (Persistent Store)
    participant SMTP as Sender Gmail SMTP
    
    User->>App: Clicks "Send OTP" / "Download Notes"
    App->>Dakly: POST /api/send { to, subject, html, attachments }
    Dakly->>DB: Verify API Key & Decrypt Credentials (AES-256)
    Dakly->>SMTP: Dispatch with Connection Pooling
    SMTP-->>User: Delivered to Inbox 📬 (1-2s)
    Dakly->>DB: Save Delivery Log & Tracking ID
    Dakly-->>App: 200 OK { success: true, trackingId: "msg_..." }
```

---

## 🚀 Quick Start

### 1. Register a Project
```http
POST /api/projects
Content-Type: application/json

{
  "name": "College Notes Portal",
  "senderEmail": "yourcollege@gmail.com",
  "appPassword": "abcd efgh ijkl mnop"
}
```
**Response:**
```json
{
  "success": true,
  "apiKey": "gkey_live_98a7sd8f7a6sdf...",
  "message": "Project registered successfully!"
}
```

### 2. Send an Email / OTP from Any Project
```javascript
const response = await fetch("https://your-dakly-instance.onrender.com/api/send", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "gkey_live_98a7sd8f7a6sdf..."
  },
  body: JSON.stringify({
    to: "student@example.com",
    subject: "Your Verification Code",
    html: `<h1>Hello!</h1><p>Your OTP code is <b>849201</b></p>`
  })
});

const report = await response.json();
console.log(report);
// { success: true, status: "DELIVERED", trackingId: "msg_1792354070_..." }
```

---

## 🛠️ Tech Stack

- **Runtime:** Node.js (v20+)
- **Framework:** Express.js
- **Database:** MongoDB Atlas (Mongoose)
- **Encryption:** Node.js Crypto (AES-256-GCM)
- **Transport:** Nodemailer with Connection Pooling
- **Deployment:** Render / Railway / Docker

---

## 📄 License
MIT © [Parth Patil](https://github.com/parthpatil1234p-svg)
