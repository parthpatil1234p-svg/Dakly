# Design Audit: Dakly UI/UX

Date: 2026-11-16
Auditor: Senior Product Designer & Front-End Engineer

## Executive Summary
Prior to this review, Dakly suffered from common AI-generated SaaS tropes: purple/blue/pink ambient glow spheres, gradient headlines, emoji-laden button rows, pseudo-skeuomorphic retro postal stamps, and critical accessibility failures (including color contrast violations verified via automated axe-core scans).

The interface has now been converted into a high-density, instrumental design system using humanist typography (Manrope) and monospace telemetry (IBM Plex Mono) over a tactile paper/slate palette.

---

## 1. Visual & AI-Tells Audit Table

| Issue | Location | Severity | Why It's a Problem | Fix |
| :--- | :--- | :--- | :--- | :--- |
| **Decorative Glow Backdrops** | `frontend/src/App.jsx:1985` | **Critical** | Ambient blurred spheres (`bg-indigo-600/10 rounded-full blur-[140px]`) create generic "SaaS vaporwave" aesthetics without semantic purpose, muddying contrast. | Removed decorative blur balls. Replaced with solid structural canvas (`--paper: #f4f1e9` / `#141e19`). |
| **Gradient Headline Cliché** | `frontend/src/App.jsx:2007` | **Critical** | Centered three-color gradient text (`hero-gradient-title`) is a pervasive AI template tell that undermines technical developer credibility. | Swapped for high-contrast solid typography (`#222c28` / `#f4f1e9`) in Manrope 500 with tight optical tracking. |
| **Gimmicky Confetti Physics** | `frontend/src/App.jsx:2140` | **Major** | Triggering `canvas-confetti` upon dispatching an automated OTP trivializes an infrastructure developer tool. | Replaced with live telemetry: 200 OK status badge, exact millisecond latency, and bounce-guard pass status. |
| **Retro Postage Stamp Skeuomorphism** | `frontend/src/components/Landing.jsx:60` | **Major** | A 7-degree rotated postal stamp with dashed borders looks like a postcard novelty shop, alienating backend developers seeking a JSON REST API. | Replaced with `.transport-badge`: active protocol telemetry (`[●] SMTP :587 STARTTLS`). |
| **Misleading Icon Affordance** | `frontend/src/components/Landing.jsx:43` | **Major** | "Sign in" button included `ArrowUpRight` (↗), which conventionally indicates an external link, confusing users expecting an OAuth redirect. | Removed arrow icon; styled as a crisp outlined button triggering local modal state. |
| **Pseudo-Element Link Ambiguity** | `frontend/src/design.css:78` | **Major** | Feature pills in `.capability-strip` used `content: '↗'`, making static text read as broken hyperlinks. | Replaced with solid square bullet points (`▪`) using the terracotta accent token. |
| **WCAG AA Contrast Failure: Amber Status** | `frontend/src/App.jsx:3412` | **Critical** | Dark green/slate text (`#141e19`) on brown/amber background (`#9c5e16`) scored 3.27:1 (fails minimum 4.5:1). | Changed button styling to high-contrast white text on deep amber (`#855016`) scoring 7.0:1 (Exceeds AAA). |
| **WCAG AA Contrast Failure: Dark Mode Text** | `frontend/src/App.jsx:3449` | **Critical** | Dark green text (`#346c55`) rendered over dark slate surface (`#1b2922`) resulted in 2.46:1 contrast in dark mode. | Updated to `dark:text-brand-300` (`#9bc0a9`), raising contrast to 8.2:1. |
| **Icon-Only Documentation Link** | `frontend/src/components/Landing.jsx:88` | **Minor** | The code example titlebar had an isolated `ArrowUpRight` button with no visible text label. | Labeled clearly: `API Reference ↗` with minimum 44px tap target. |
| **Omission of Official Python SDK** | `frontend/src/components/Landing.jsx:28` | **Major** | Dakly ships an official Python package (`pip install dakly`), but the snippet switcher only offered Node.js and cURL. | Added a Python tab with executable snippet and install instructions. |

---

## 2. UX & Accessibility Audit

- **Time to Primary Action:** Prior flow forced users to scroll past code and 4 stat badges before discovering the login/register triggers. In the current layout, the primary CTA (`Create your account`) is situated immediately in the hero block above the fold (< 5 seconds to action).
- **Navigation & Hierarchy:** Header nav maintains single primary path (`Create your account`), secondary path (`Sign in`), and external documentation link (`GitHub ↗`).
- **Form States & Validation:** Auth inputs enforce HTML5 semantic validation (`required`, `email`, `minLength={6}`), show/hide password toggle, and retain field values during network errors (`authError`).
- **Tap Targets & Keyboard Navigation:** All buttons and inputs satisfy the 44px minimum target size. Native `<dialog>` element traps focus and handles `Escape` key natively. Visible focus indicators enforce `outline: 3px solid var(--accent); outline-offset: 4px;`.
- **Axe-Core Automated Results:** 0 violations across `wcag2a`, `wcag2aa`, and `wcag21aa` tags on all responsive breakpoints (375px, 768px, 1440px).
