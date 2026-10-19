# Security Policy

Dakly takes the security and integrity of our email microservice, developer SDKs, and user accounts seriously. We appreciate the responsible disclosure of vulnerabilities by security researchers and the community.

---

## Supported Versions

Only the latest active versions receive security updates and patches:

| Version | Supported          |
| ------- | ------------------ |
| 1.2.x   | :white_check_mark: |
| 1.1.x   | :white_check_mark: |
| 1.0.x   | :x:                |
| < 1.0   | :x:                |

---

## Reporting a Vulnerability

**Please do NOT disclose vulnerabilities publicly in public GitHub issues or discussions.**

If you discover a security vulnerability in Dakly (engine, dashboard, or SDKs):

1. **GitHub Private Vulnerability Reporting (Recommended):**
   - Navigate to the repository's **[Security Tab](https://github.com/parthpatil1234p-svg/Dakly/security)**.
   - Click **"Report a vulnerability"** to open a private advisory draft.

2. **Email Disclosure:**
   - Send an email to **[support@dakly.dev](mailto:support@dakly.dev)** (or contact the maintainer directly via GitHub profile).
   - Please include:
     - Type and severity of the issue (e.g. Authentication Bypass, SSRF, XSS, Secret Leak).
     - Clear step-by-step reproduction steps or a minimal Proof of Concept (PoC).
     - Impact analysis (what data or systems could be affected).
     - Any proposed fixes or remediations.

---

## Response & Disclosure Timeline

- **Acknowledgment:** Within 24–48 hours of report submission.
- **Triage & Assessment:** Within 3–5 business days.
- **Fix & Patch Release:** Coordinated with the reporter before public disclosure.
- **Public Advisory:** Published on GitHub Advisories once a patch is rolled out.

---

## Key Security Architecture

1. **API Keys & Credentials:**
   - Dakly Project API keys strictly use the `gkey_live_` prefix with high-entropy cryptographic hashes.
   - Project Webhook Secrets strictly use the `daksec_` prefix to distinguish internal HMAC secrets.
   - Gmail App Passwords stored in MongoDB are encrypted using AES-256-GCM authenticated encryption.
2. **IP Whitelisting & CIDR Enforcement:**
   - Project requests are verified against client IP addresses (CIDR ranges and wildcard IP matching).
3. **HMAC Webhook Signatures:**
   - Outbound webhooks are cryptographically signed with HMAC-SHA256 headers (`x-dakly-signature`).
4. **Content Security:**
   - Attached files and logos undergo MIME-type sniff validation, dimension checks (1:1 aspect ratio enforcement for logos), and size constraints to prevent malicious payload delivery.
