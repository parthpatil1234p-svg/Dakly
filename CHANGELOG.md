# Changelog

All notable changes to the **Dakly** project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.1] - 2026-10-20

### Security & Compliance
- **Prefix Standard Harmonization**: Renamed internal webhook secret prefix from `whsec_` to branded `daksec_` across engine, SDKs, documentation, and frontend to prevent false-positive detection by GitHub Secret Scanning for Stripe keys.
- **Git Hygiene**: Added `__pycache__/` and Python bytecode files to `.gitignore` and purged cached `.pyc` files from source control.

---

## [1.2.0] - 2026-10-19

### Added
- **Feature 6: Team Workspaces & Multi-User RBAC**:
  - Invite teammates to projects with specific roles (`admin`, `viewer`).
  - Pending invites management and acceptance workflows.
  - Role-based route authorization middleware (`authProjectRole`).
- **Feature 6: CIDR Subnet IP Whitelisting**:
  - Whitelist server IPs using single IPs (`1.2.3.4`), wildcards (`192.168.1.*`), or full CIDR notation (`10.0.0.0/24`).
  - Strict client IP resolution across proxies, reverse proxies, and cloud load balancers.
- **Instant API Key Rotation**:
  - One-click zero-downtime key rotation generating cryptographically secure `gkey_live_...` credentials.
  - Revocation of compromised keys.
- **Feature 5: Webhooks & Delivery Signals**:
  - Configurable project webhook endpoints (`webhookUrl`, `webhookSecret`).
  - Automatic event filtering (`email.sent`, `email.delivered`, `email.opened`, `email.clicked`, `email.suppressed`).
  - Cryptographic HMAC-SHA256 signature verification in both Node.js and Python SDKs (`x-dakly-signature`).
  - Live diagnostic webhook testing tool in the Webhook dashboard.

---

## [1.1.0] - 2026-10-19

### Added
- **Feature 1: Pre-built Email Templates & Dynamic Variable Engine**:
  - 5 battle-tested responsive HTML email templates: `otp`, `welcome`, `password_reset`, `notes`, `invoice`.
  - Dynamic `{{variable}}` substitution engine with fallback defaults.
- **Feature 2: Open & Click Tracking Analytics**:
  - Zero-latency 1x1 transparent tracking pixel injection (`/api/track/open/:trackingId`).
  - Hyperlink rewriting and redirect tracking (`/api/track/click/:trackingId`).
  - Interactive dashboard analytics charts: Open Rate %, Click Rate %, and Device Breakdown (Mobile vs Desktop).
- **Feature 3: Smart Email Warm-up & Bounce Protection**:
  - Automated 7-day Gmail account warm-up pacing curve (Day 1: 20 emails → Day 7: 500 emails).
  - Automated hard-bounce suppression list: auto-blocks uncontactable addresses to protect Gmail sender reputation.
- **Feature 4: Official Developer SDKs**:
  - `@dakly/sdk` / `dakly` npm package for Node.js / TypeScript.
  - `dakly` Python package on PyPI structure with zero external dependencies.
  - Pre-packaged helper methods: `.sendOtp()`, `.sendWelcome()`, `.sendNotes()`, `.sendInvoice()`.
  - Custom typed exception hierarchy (`DaklyAuthenticationError`, `DaklyValidationError`, `DaklySuppressedError`, `DaklyRateLimitError`).
- **Dark / Light Theme Toggle**:
  - Full aesthetic theme support across the entire frontend dashboard with persistent state.
- **1:1 Brand Logo Storage & Anti-Piracy Inspection**:
  - Upload brand logos stored in high-performance WebP format.
  - Strict 1:1 aspect ratio validation and MIME magic-byte anti-piracy file inspection.

---

## [1.0.0] - 2026-10-18

### Initial Release
- **Core Email Microservice**:
  - Headless REST API powered by Node.js, Express, and Nodemailer.
  - Gmail App Password AES-256-GCM encrypted persistence in MongoDB.
  - Pacing queue to respect Gmail SMTP rate limits (up to 500 emails/day).
  - Modern React dashboard with live logs, API key management, and quick testing modal.
