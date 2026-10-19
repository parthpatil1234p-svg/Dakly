# Contributing to Dakly

Thank you for your interest in contributing to **Dakly**! We welcome contributions from the developer community — whether that is fixing bugs, improving documentation, designing email templates, or expanding our language SDKs.

---

## Table of Contents
1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Local Development Setup](#local-development-setup)
4. [Project Structure](#project-structure)
5. [Running Tests](#running-tests)
6. [Git Workflow & Conventional Commits](#git-workflow--conventional-commits)
7. [Submitting a Pull Request](#submitting-a-pull-request)
8. [Code Style & Standards](#code-style--standards)

---

## Code of Conduct
By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please report unacceptable behavior to [support@dakly.dev](mailto:support@dakly.dev).

---

## Getting Started

### Prerequisites
- **Node.js**: v20.x or higher (LTS recommended)
- **npm**: v10.x or higher
- **Python**: 3.10+ (for Python SDK testing)
- **MongoDB**: Local instance running on `localhost:27017` or MongoDB Atlas URI
- **Git**: Installed and configured on your machine

---

## Local Development Setup

### 1. Fork and Clone
```bash
git clone https://github.com/<your-username>/Dakly.git
cd Dakly
```

### 2. Install Backend Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in the development keys:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/dakly_dev
JWT_SECRET=dev_jwt_secret_change_me
ENCRYPTION_KEY=dev_32_byte_hex_secret_key_00000000000000000000000000000000
FRONTEND_URL=http://localhost:5173
```

### 4. Install & Run Frontend (Dashboard)
```bash
cd frontend
npm install
npm run dev
```
The dashboard will run at `http://localhost:5173`.

### 5. Start Backend Engine
In the root directory:
```bash
npm run dev
# Or node src/server.js
```
The backend API runs at `http://localhost:5000`.

---

## Project Structure

```
├── .github/                # GitHub Actions workflows & issue templates
├── docs/                   # Extended architecture, API, and webhook guides
├── frontend/               # React + Tailwind dashboard application
│   ├── src/                # UI components and views
│   └── vite.config.js      # Vite build configuration
├── packages/               # Official npm SDK (@dakly/sdk / dakly)
│   └── dakly/
├── sdk/                    # Standalone SDK distribution files
│   ├── dakly.js            # Node.js zero-dependency SDK
│   └── python/             # Official Python package
├── src/                    # Core Backend Engine
│   ├── controllers/        # Route controllers (auth, email, project)
│   ├── middleware/         # Security & authentication middlewares
│   ├── models/             # Mongoose schemas (User, Project, EmailLog, Suppression)
│   ├── routes/             # Express API routes
│   ├── services/           # Email sender, pacing queue, webhooks
│   └── utils/              # Crypto, templates, tracking, logo validator, IP filter
├── tests/                  # End-to-end and unit test suites
└── package.json            # Root configuration and dependencies
```

---

## Running Tests

Before submitting any code changes, ensure all automated test suites pass locally:

### 1. Backend Syntax & All Unit Tests
```bash
npm test
```
This executes:
- Node syntax validation on all core engine files
- Tracking pixel & hyperlink redirect unit tests (`testTracking.js`)
- Warm-up & Bounce suppression tests (`testWarmupAndSuppression.js`)
- Node.js SDK tests (`testSdk.js`)
- Webhook signature and delivery tests (`testWebhooks.js`)
- Security, CIDR IP Whitelist, and Team Workspaces tests (`testSecurityAndTeams.js`)

### 2. Python SDK Tests
```bash
python tests/test_sdk_python.py
```

### 3. Frontend Production Build
```bash
cd frontend
npm run build
```

---

## Git Workflow & Conventional Commits

We follow standard **Conventional Commits**:
- `feat:` Adds a new user-facing feature or enhancement
- `fix:` Fixes a bug or vulnerability
- `docs:` Documentation additions or updates
- `test:` Adding or updating unit tests
- `refactor:` Code refactoring without functional changes
- `chore:` Tooling, dependency, or configuration updates

Example:
```bash
git checkout -b feat/add-slack-webhook-template
git commit -m "feat: add Slack webhook payload formatting"
```

---

## Submitting a Pull Request

1. Push your branch to your GitHub fork:
   ```bash
   git push origin feat/your-feature-name
   ```
2. Open a Pull Request on GitHub against the `main` branch.
3. Use the provided PR template to summarize:
   - What changes were made and why
   - Related issues (e.g. `Closes #42`)
   - Verification steps taken
4. Ensure CI checks pass on GitHub Actions.

---

## Code Style & Standards

- **Zero-Secret Rule**: Never commit production credentials, passwords, or live tokens.
- **Prefix Consistency**:
  - API Keys must start with `gkey_live_`.
  - Webhook Secrets must start with `daksec_`.
- **Comments & Documentation**: Maintain documentation integrity. Write clean JSDoc / Docstrings for public functions.
- **Error Handling**: Use structured JSON error responses `{ success: false, error: "..." }` across all endpoints.
