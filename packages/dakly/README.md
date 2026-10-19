# ⚡ dakly (Official Node.js & TypeScript SDK)

[![npm version](https://img.shields.io/npm/v/dakly.svg?color=indigo)](https://www.npmjs.com/package/dakly)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success.svg)](https://dakly.vercel.app)

The official zero-dependency Node.js and TypeScript client library for **[Dakly](https://dakly.vercel.app)** — the high-performance, developer-first Gmail microservice.

Send transactional emails, verification OTP codes, college PDFs, and onboarding sequences using your existing Gmail accounts without paying \$20/month for SendGrid or Resend.

---

## 🚀 Installation

```bash
npm install dakly
# or
yarn add dakly
# or
pnpm add dakly
```

*Zero external runtime dependencies. Works out of the box with Node.js 18+, Bun, Deno, Next.js (Edge & Node runtimes), and Remix.*

---

## 🔑 Quick Start

Grab your free API Key from the [Dakly Dashboard](https://dakly.vercel.app).

```javascript
import { Dakly } from 'dakly';

// Initialize with your API Key (or set process.env.DAKLY_API_KEY)
const dakly = new Dakly('gkey_live_...');

// 1-Liner: Send Modern Verification OTP
const result = await dakly.sendOtp({
  to: 'user@example.com',
  code: '849201',
  appName: 'My App',
  expiresInMinutes: 10
});

console.log('Delivered! Tracking ID:', result.trackingId);
```

---

## 📦 Core Capabilities

### 1. Send OTP Verification Code
```javascript
// Object syntax:
await dakly.sendOtp({
  to: 'user@example.com',
  code: '492018',
  appName: 'EduVibe',
  expiresInMinutes: 10
});

// Positional shorthand:
await dakly.sendOtp('user@example.com', '492018', 'EduVibe');
```

### 2. Send Pre-Built Responsive Email Templates
Dakly includes dynamic templates pre-rendered with zero CSS required:
- `otp` — Auth verification code with large copyable digits
- `welcome` — Modern product onboarding with primary CTA
- `password_reset` — Secure token-based reset link
- `notes` — Academic & college PDF notes with exam notices
- `invoice` — Professional billing receipts with line items

```javascript
// Welcome Email
await dakly.sendWelcome({
  to: 'founder@startup.com',
  name: 'Rahul Sharma',
  appName: 'CloudPulse',
  loginUrl: 'https://cloudpulse.io/login'
});

// Password Reset Link
await dakly.sendPasswordReset({
  to: 'user@example.com',
  name: 'Pooja',
  resetUrl: 'https://myapp.com/reset-password?token=xyz987',
  expiresInMinutes: 15
});

// College PDF Notes Delivery
await dakly.sendNotes({
  to: 'student@college.edu',
  studentName: 'Amit',
  subjectName: 'Computer Networks',
  notesTitle: 'Unit 3: TCP Congestion & Sliding Window',
  downloadUrl: 'https://college.edu/notes/cn-unit3.pdf',
  attachments: [
    { filename: 'CN_Unit3_Notes.pdf', path: 'https://college.edu/notes/cn-unit3.pdf' }
  ]
});

// Invoice / Receipt
await dakly.sendInvoice({
  to: 'client@company.com',
  invoiceNumber: 'INV-2026-0081',
  amount: '$149.00',
  dueDate: 'Oct 31, 2026',
  downloadUrl: 'https://myapp.com/invoices/0081.pdf'
});
```

### 3. Custom HTML & Plaintext Emails
```javascript
await dakly.send({
  to: 'team@company.com',
  subject: '🚀 Deployment Succeeded',
  html: '<h1>Build #418 Live</h1><p>Your production build is now live on Vercel.</p>',
  text: 'Build #418 Live: Your production build is now live on Vercel.',
  attachments: [
    {
      filename: 'report.json',
      content: Buffer.from(JSON.stringify({ status: 'ok', tests: 42 }))
    }
  ]
});
```

### 4. Diagnostics & Live Capacity
```javascript
// Check connection & remaining daily quota
const ping = await dakly.ping();
console.log('Project:', ping.project);
console.log('Remaining Today:', ping.capacity.remainingToday, '/', ping.capacity.totalDailyQuota);

// Get delivery audit history
const logs = await dakly.getLogs({ limit: 10, status: 'DELIVERED' });
console.log('Recent dispatches:', logs.logs.length);

// Get real-time stats & open/click analytics
const stats = await dakly.getStats();
console.log('Open Rate:', stats.metrics.tracking.openRate);
console.log('Click Rate:', stats.metrics.tracking.clickRate);
```

---

## 🛡️ Error Handling

Dakly SDK exports typed error classes for predictable error handling:

```javascript
import { 
  Dakly, 
  DaklyAuthenticationError, 
  DaklyRateLimitError, 
  DaklySuppressedError 
} from 'dakly';

const dakly = new Dakly();

try {
  await dakly.sendOtp({ to: 'invalid-bounce@bad-domain.xyz', code: '123456' });
} catch (err) {
  if (err instanceof DaklySuppressedError) {
    console.warn('Recipient is on Suppression List (Hard Bounced previously):', err.reason);
  } else if (err instanceof DaklyRateLimitError) {
    console.error('Daily quota exceeded for all configured Gmail senders!');
  } else if (err instanceof DaklyAuthenticationError) {
    console.error('Invalid API Key provided.');
  } else {
    console.error('Delivery failed:', err.message);
  }
}
```

---

## ⚡ Integration Examples

### Next.js App Router (`app/api/auth/send-otp/route.ts`)
```typescript
import { NextResponse } from 'next/server';
import { Dakly } from 'dakly';

const dakly = new Dakly(process.env.DAKLY_API_KEY);

export async function POST(req: Request) {
  const { email } = await req.json();
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const result = await dakly.sendOtp({
    to: email,
    code: otp,
    appName: 'SaaS Platform'
  });

  return NextResponse.json({ success: true, trackingId: result.trackingId });
}
```

### Express.js (`server.js`)
```javascript
const express = require('express');
const { Dakly } = require('dakly');

const app = express();
app.use(express.json());

const dakly = new Dakly(process.env.DAKLY_API_KEY);

app.post('/api/welcome', async (req, res) => {
  try {
    const result = await dakly.sendWelcome({
      to: req.body.email,
      name: req.body.name,
      appName: 'My Express App'
    });
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});
```

---

## 📄 License
MIT © [Dakly Technologies](https://dakly.vercel.app)
