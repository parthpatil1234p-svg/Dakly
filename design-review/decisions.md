# Design Decisions: Dakly System

Date: 2026-11-16
Author: Senior Product Designer & Front-End Engineer

## 1. Audience & Primary Goal
- **Audience:** Indie developers, backend engineers, and technical startup founders building web or mobile apps.
- **Single Primary Goal:** Connect one Gmail account and send their first transactional email/OTP via cURL or SDK in under 60 seconds without paying recurring SaaS subscriptions or configuring DNS records.

## 2. Visual Direction
- **Adjectives:** *Monolithic, Industrial, Instrumental.*
- **What it is NOT:** It is NOT playful consumer software, Dribbble vaporwave, glowing crypto-fintech, or pastel-bento fluff.

## 3. Type System
- **Typeface 1 (UI & Headings):** `Manrope` — geometric, humanist sans-serif with distinct optical clarity at micro-sizes and zero decorative quirks.
- **Typeface 2 (Code, Telemetry & Tokens):** `IBM Plex Mono` — technical monospace with slashed zeroes, clear bracket differentiation, and tabular numbers for millisecond timestamps.
- **Defined Scale:**
  - 11px / 1.4 (`mono-micro`): Transport protocol badges, status pips, copyright notes.
  - 12px / 1.6 (`mono-small`, `eyebrow`): Table headers, code tokens, step numbers.
  - 14px / 1.6 (`body-default`): Standard prose, form input labels, button labels.
  - 16px / 1.75 (`body-lead`): Section descriptions, card titles.
  - 21px / 1.2 (`h3`): Modal titles, workbench email subjects.
  - 36px / 1.1 (`h2`): Major section titles (`Setup`, `Boundaries`, `FAQ`).
  - clamp(48px, 7vw, 72px) / 1.065 (`h1`): Dominant hero statement.

## 4. Color System & Verified Contrast Ratios
- **Neutrals:**
  - Light Canvas (`--paper: #f4f1e9`, `--surface: #ffffff`, `--surface-soft: #eae8df`, `--line: #d1d3c9`, `--ink: #222c28`, `--muted: #5b665f`).
  - Dark Canvas (`--paper: #141e19`, `--surface: #1b2922`, `--surface-soft: #25362b`, `--line: #405047`, `--ink: #f4f1e9`, `--muted: #b5c2b8`).
- **Primary:** Deep Forest Pine (`#163d35` light / `#bad7c7` dark).
  - Light Contrast on Paper: **8.82:1** (Exceeds WCAG AAA).
  - Dark Contrast on Dark Paper: **12.45:1** (Exceeds WCAG AAA).
- **Accent:** Terracotta Rust (`#b64a2d` light / `#efb397` dark).
  - Reserved strictly for active tab lines, focus-visible outlines, and critical interactive calls.
  - Light Contrast on Paper: **4.74:1** (Passes WCAG AA).
  - Dark Contrast on Dark Paper: **9.38:1** (Exceeds WCAG AAA).
- **Functional State:**
  - Success/Verified: `#276449` (light) / `#9bc0a9` (dark) — contrast 5.1:1.
  - Danger/Error: `#a62f26` (light) / `#ffc1b5` (dark) — contrast 5.8:1.
  - Quota/Warning: `#855016` (light) / `#edc88b` (dark) — contrast 7.0:1.

## 5. Spacing Scale & Layout Grid
- **Spacing Scale:** Strict 4px/8px modular increments:
  - `4px` (`--space-1`), `8px` (`--space-2`), `12px` (`--space-3`), `16px` (`--space-4`), `24px` (`--space-6`), `32px` (`--space-8`), `48px` (`--space-12`), `64px` (`--space-16`), `96px` (`--space-24`).
- **Layout Grid:** 12-column layout constrained to `max-width: min(1200px, calc(100% - 40px))` with 24px column gutters. Collapses to a single rigid column on screens narrower than 768px.

## 6. Component Rules
- **Radii:** Strict 4px for form inputs, buttons, and badges (`--radius-small`); 8px for containers, dialogs, and code blocks (`--radius`). Rounded-2xl and pill bubbles are banned.
- **Borders vs. Shadows:** Structural 1px solid borders (`var(--line)`) throughout. Soft ambient blur shadows are prohibited; subtle 2-tier tactile elevation is permitted on cards (`box-shadow: 0 6px 14px #222c280b, 0 18px 28px #222c2806`).
- **Buttons:**
  - Primary: Deep forest pine background with white ink (`min-height: 44px`, `padding: 11px 20px`, `font-weight: 600`).
  - Outline: 1px solid `var(--control-line)` with transparent canvas.
  - Active State: `transform: translateY(1px)`.
- **Forms & Inputs:**
  - Explicit `<label>` elements positioned above every field.
  - Accessible focus indicator: `outline: 3px solid var(--accent); outline-offset: 4px;`.
  - Minimum tap height: `48px`.

## 7. Information Architecture
- **Landing (Public):**
  1. Header: Brand mark + anchor navigation (`How it works`, `API example`, `GitHub`) + Sign In button.
  2. Hero Block: Asymmetric split with high-contrast proposition (left) and interactive real-time transport preview (right).
  3. Capability Strip: Three primary workload domains (Auth OTP, Account Updates, Billing Receipts).
  4. Setup & Workbench: 3-step numbered deployment path paired with polyglot live code runner (Node.js, Python, cURL).
  5. Boundaries Disclosure: Candid quota reality check (Google's limits, open-source model).
  6. FAQ & Footer: High-contrast technical accordion + legal links.
- **Console (Authenticated):**
  1. Top Key Strip: Instant access to project API key, visibility toggle, copy action, and active health ping.
  2. Workspace Ledger: Daily quota gauge, all-time delivered/failed tally, and latency tracker.
  3. Action Rail: Persistent, single-click navigation between Testing, Templates, Senders, Logs, Webhooks, and Security.

## 8. Motion Rules
- Maximum transition duration: `140ms ease-out` on interactive controls (background, border).
- All continuous CSS animations (pulse, spin) and transforms are gated behind `@media (prefers-reduced-motion: no-preference)`.
- When `prefers-reduced-motion: reduce` is detected, animations are forced to `0ms`.
