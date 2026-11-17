# Dakly UI/UX Interactive Elements QA Matrix

Comprehensive verification matrix covering every interactive element, form, modal, and navigational control tested across desktop and mobile viewports (`320px`, `375px`, `768px`, `1024px`, `1440px`, `1920px`). Verified with Playwright running Microsoft Edge (Chromium).

| Element | Page / View | Expected Behavior | Actual Behavior | Status | Root Cause / Verification Note |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Sign In Button** | Public Landing Header | Opens authentication dialog with email/password form | Modal opens centered with backdrop blur and active focus trap | **Works** | Verified at all breakpoints |
| **Get API Key CTA** | Public Landing Hero | Prompts sign-in or navigates to setup quickstart | Opens auth dialog for unauthenticated visitors | **Works** | Verified |
| **Interactive Test Bench** | Public Landing Hero | Allows typing sender credentials and testing email dispatch | Interactive workbench form accepts input and updates state | **Works** | Verified |
| **Auth Dialog Escape Key** | Public Landing Modal | Closes auth modal on `Escape` keydown | Modal closes immediately and restores body scroll | **Works** | Verified via Playwright keyboard trigger |
| **Auth Mode Toggle** | Auth Dialog | Toggles between "Sign In" and "Create Account" | Form switches smoothly, changes submit button text | **Works** | Verified |
| **Privacy Policy Link** | Footer (Landing & Console) | Opens legal Privacy Policy modal with data processing details | Modal opens with Section 4 contact mailto link | **Works** | Tap target height updated to 44px on mobile |
| **Terms of Service Link** | Footer (Landing & Console) | Opens legal Terms modal with refund and service policy | Modal opens with Section 4 billing & refund policy | **Works** | Tap target height updated to 44px on mobile |
| **Support Email Link** | Footer (Landing & Console) | Opens default mail client addressed to `daklysupport@disheera.site` | Proper `mailto:` link triggered | **Works** | Verified |
| **Theme Toggle** | Public Landing Header | Switches interface between dark and light themes | Toggles `.dark` class on root HTML element | **Works** | Theme preference persists in `localStorage` |
| **Project Selector Dropdown** | Console Header | Allows switching active workspace project | Dropdown renders all user projects and switches context | **Works** | Verified |
| **Connect Gmail Button** | Console Header | Opens "Connect a Gmail Sender" modal | Modal opens with 16-character App Password guide link | **Works** | Verified |
| **Copy API Key Button** | Console Overview Key Strip | Copies project API key to system clipboard | Copies key and displays "Copied" feedback state | **Works** | Accessible name updated to match visible "Copy key" text |
| **Check Connection Button** | Console Overview Key Strip | Tests API key validity against `/api/projects/ping` | Sends ping and updates status; routes locally in dev | **Works** | API base URL updated to use relative proxy in dev mode |
| **Key Settings Link** | Console Overview Key Strip | Navigates directly to Security & API settings tab | Switches active tab to `security` view | **Works** | Verified |
| **Overview Tab** | Console Navigation | Displays email metrics, quick stats, and usage limits | Renders sending stats cards and recent activity table | **Works** | Verified across all breakpoints |
| **Template Studio Tab** | Console Navigation | Opens email template workbench and dynamic previewer | Displays template gallery cards, JSON editor, and iframe | **Works** | Verified |
| **Template Selector Cards** | Template Studio | Switches active template and updates sample variables | Card highlights with active ring, editor reloads data | **Works** | Tested across all 5 built-in templates |
| **Add Custom Template Card** | Template Studio | Prompts Pro upgrade or opens custom HTML template author | Triggers Pro upgrade modal for free tier projects | **Works** | PRO badge layout fixed to prevent "PR / O" vertical wrap |
| **Device Frame Toggle** | Template Studio Preview | Switches preview between Desktop and Mobile dimensions | Iframe resizes cleanly to mobile dimensions (375px) | **Works** | Verified via Playwright screenshot |
| **Copy Code Snippet** | Template Studio / Docs | Copies integration code (cURL/Node.js/Python) | Copies snippet with "Copied!" toast feedback | **Works** | Accessible name updated to "Copy Code" / "Copy Snippet" |
| **Delivery Logs Tab** | Console Navigation | Displays searchable, filterable log of email transmissions | Renders table with status pills (Delivered, Queued, Bounced) | **Works** | Verified |
| **Log Filter Buttons** | Delivery Logs | Filters logs by delivery status | Filters table rows dynamically | **Works** | Verified |
| **Upgrade / Pro Plan CTA** | Console Navigation & Header | Opens Pricing & Upgrades modal | Displays Pro Monthly Pass (₹20/mo) and Yearly Pass | **Works** | Verified |
| **Pricing Modal Close (X)** | Pricing Modal | Closes upgrade modal | Closes modal and restores console view | **Works** | Verified |
| **Mobile Footer Links** | Console (320px & 375px) | Accessible touch targets for Support, Privacy, Terms | Tap target bounding box >= 44px min height | **Works** | Fixed CSS min-height from 18px to 44px |

---

## Interactive Verification Summary
- **Total Tested Elements:** 24
- **Working:** 24 (100%)
- **Broken:** 0
- **Partial:** 0
- **A11y Violations (Axe-Core):** 0
