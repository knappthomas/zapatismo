# Requirement Sheet – 30 – Project Logo and Favicon

## 0. Quick Facts
- **Ticket-ID:** 30
- **Short Description (1 sentence):** Use the existing project logo (`misc/logo.png`) as the application favicon and as the visual brand on the login page and in the menubar (navbar).
- **Goal / Value (max 5 bullets):**
  - Consistent visual identity across the Zapatismo web app (favicon, login, navbar).
  - Recognizable branding in browser tabs and bookmarks via favicon.
  - Professional appearance on login and in the main navigation.
  - Single source asset (logo.png) reused where appropriate.
- **Affected Roles:** All users visiting or using the web frontend (unauthenticated and authenticated).
- **Affected Modules/Components (conceptual):** Frontend only — HTML document (favicon), login page component, navbar component; asset pipeline / static assets.
- **In-Scope (max 5 bullets):**
  - Favicon: use the same logo file (`misc/logo.png` or a copy in frontend assets) as the site favicon (browser tab, bookmarks).
  - Login page: display the project logo in addition to or instead of the text "Zapatismo" where it makes sense.
  - Navbar: display the project logo (e.g. next to or replacing the text "Zapatismo" in the brand area).
  - Logo asset available to the frontend (e.g. from `misc/logo.png` or a copy in frontend assets).
- **Out-of-Scope (max 5 bullets):**
  - Backend or API changes.
  - Changes to logo design or creation of new logo variants.
  - Logo on other surfaces (e.g. e-mails, PDFs, mobile apps) unless explicitly added later.
  - Legal/trademark or brand-guideline documentation.

## 1. Context & Problem Statement
- **Current State (As-Is):** The frontend uses a generic or default favicon (`favicon.ico`). The login page shows the word "Zapatismo" as a text title; the navbar shows "Zapatismo" as text in the brand area. There is no shared project logo image in use.
- **Problem / Pain:** The app lacks a consistent visual identity; the logo asset exists (`misc/logo.png`) but is not used, so the product does not present a recognizable brand in the browser or on key screens.
- **Target State (To-Be, without implementation details):** The project logo is used as the favicon so that browser tabs and bookmarks show the Zapatismo brand. The login page and the navbar show the logo in a clear, appropriate way (e.g. logo + optional text) so that users see a consistent brand at entry and in the main navigation.
- **Assumptions (if any were stated):** The file `misc/logo.png` is the authoritative project logo and is suitable for use as favicon and in the UI at the intended sizes. No change to the logo artwork itself is required for this ticket.
- **Non-Goals:** Redesign of the logo; backend work; branding outside the web frontend (login, navbar, favicon).

## 2. Stakeholders & Roles
| Role | Goal/Interest | Rights/Constraints |
|------|----------------|-------------------|
| End user (visitor / logged-in) | See a recognizable, consistent brand (favicon, login, navbar). | None. |
| Product / project owner | Professional, consistent presentation of Zapatismo. | Logo asset is in repo (`misc/logo.png`). |

## 3. User Journeys / Use Cases

### UC 1: See brand when opening the app (favicon and login)
- **Primary Actor:** User (unauthenticated or any).
- **Trigger:** User opens or bookmarks the app URL; or lands on the login page.
- **Preconditions:** Frontend is deployed and reachable; logo asset is available.
- **Flow:**
  1. User opens the app in a browser (or sees a bookmarked tab).
  2. Browser tab (and bookmarks if applicable) shows the Zapatismo favicon (based on the project logo).
  3. If the user is on the login page, the page displays the project logo in a prominent place (e.g. above or beside the login form), so the brand is clearly visible.
- **Outcome:** User recognizes the app by favicon and by logo on the login screen.
- **Alternatives / Abort Paths:** If the logo asset is missing or fails to load, the app shows the browser’s broken-image placeholder; the image MUST have alt text "Zapatismo" so that assistive tech and the placeholder still convey the brand name.

### UC 2: See brand in the main navigation (navbar)
- **Primary Actor:** Authenticated user.
- **Trigger:** User is on any page that shows the main navbar (e.g. dashboard, shoes, workouts).
- **Preconditions:** User is logged in; navbar is rendered.
- **Flow:**
  1. User views a page that includes the navbar.
  2. The navbar brand area (e.g. left side, link to dashboard) shows the project logo (and optionally the word "Zapatismo" or only the logo, as decided in implementation).
- **Outcome:** User sees consistent branding in the main navigation.
- **Alternatives / Abort Paths:** If the logo fails to load, a broken-image placeholder is shown; alt text "Zapatismo" is used (same as UC 1).

## 4. Functional Requirements (MUST/SHOULD/MAY)
| ID | Requirement (clear, atomic) | Priority | Rationale / Value | Notes |
|----|-----------------------------|----------|-------------------|-------|
| FR-1 | The application MUST use the same project logo file (from `misc/logo.png` or a copy in frontend assets) as the favicon so that the browser tab and bookmarks show the Zapatismo brand. No separate or derived favicon file is required. | MUST | Recognizable identity in browser; single source asset. | Same PNG file referenced for favicon and in-page logo. |
| FR-2 | The login page MUST display the project logo in a visible, prominent position (e.g. above the login form or as the main heading). | MUST | Brand visibility at entry. | Exact layout in scope of implementation. |
| FR-3 | The navbar (menubar) MUST display the project logo in the brand area (e.g. left side, next to or replacing the current "Zapatismo" text link to dashboard). | MUST | Consistent branding in main navigation. | Clicking the logo/link SHOULD still navigate to dashboard (or home). |
| FR-4 | The logo asset MUST be available to the frontend build (e.g. referenced from a frontend asset directory or from a path that resolves at build/serve time). | MUST | All above uses depend on the asset. | No assumption on final path; only that it is stable and build-safe. |
| FR-5 | Favicon and in-page logo MUST be readable and recognizable at typical sizes (favicon small; login/navbar at intended display sizes). | MUST | Usability and brand recognition. | Same file may be scaled by the browser or layout. |
| FR-6 | If the logo image fails to load, the app MUST show the browser’s broken-image placeholder. The logo image MUST have alt text "Zapatismo" so that screen readers and the placeholder convey the brand. | MUST | Resilience and accessibility. | No custom text fallback; broken-image placeholder with alt text only. |

**Backend testing:** This ticket is frontend-only (no backend changes). No backend unit or integration test requirements apply.

## 5. Data & Interfaces (conceptual)
- **Data objects:** One primary asset: the project logo image (currently `misc/logo.png`). The same file is used for favicon and for in-page logo (login, navbar); no derived favicon file.
- **Inputs / Outputs:** No user input or API; only consumption of static assets by the HTML and components (favicon link, img or equivalent in login and navbar).
- **External systems / integrations:** None.
- **Authorization / AuthN/AuthZ:** None; logo and favicon are public.

## 6. States, Validations & Error Cases
### 6.1 States / Modes
- No additional application state; logo presence is static. If the image fails to load, the browser shows a broken-image placeholder; alt text "Zapatismo" is always set (see FR-6).

### 6.2 Validations
- Not applicable (no user input; asset path and existence are build/deploy concerns).

### 6.3 Error Cases / Edge Cases
| Case | Trigger | Expected System Behavior | User Feedback | Category |
|------|---------|--------------------------|---------------|----------|
| Logo asset missing or wrong path | Build or runtime request for logo | Favicon may show default; login/navbar show broken-image placeholder. Image has alt text "Zapatismo" (FR-6). | Placeholder + alt text convey brand. | Resilience |
| Favicon file missing or wrong format | Browser requests favicon | Browser may show default icon. | Tab/bookmark may not show custom icon. | Degradation |
| Very small display (e.g. narrow navbar) | Logo shown at small size | Logo or text remains recognizable; no layout break. | Acceptable scaling or text-only. | Layout |

## 7. Non-Functional Requirements
- **Security:** No sensitive data in logo; asset served as static content (no user content).
- **Privacy / Compliance:** N/A.
- **Performance / Scalability:** Logo and favicon are small static assets; normal caching and CDN rules apply. No blocking of initial render required beyond standard image loading.
- **Logging / Auditing:** Not required for this feature.
- **Usability / Accessibility:** Logo image MUST have alt text "Zapatismo" where it is the primary branding element (login, navbar) so that screen readers and the broken-image placeholder convey the brand. Favicon has no requirement for alt text (decorative).
- **Operability:** Not applicable.

## 8. Acceptance Criteria (testable)
- **AC-1:** Given the app is built and served, when the user opens the app in a browser, then the browser tab (and favicon in bookmarks) shows the Zapatismo logo, using the same logo file as for the in-page logo.
- **AC-2:** Given the user is on the login page, when the page has loaded, then the project logo is visible in a prominent position (e.g. above the form or as the main heading).
- **AC-3:** Given the user is authenticated and on a page that shows the navbar, when the page is displayed, then the navbar brand area shows the project logo (and optionally "Zapatismo" text), and the logo or brand link navigates to the dashboard (or home).
- **AC-4:** Given the logo image is available in the frontend assets, when the login page and navbar are rendered, then the logo image loads and is displayed at the intended sizes without layout break.
- **AC-5:** Given the logo image fails to load (e.g. wrong path or 404), when the login page or navbar is rendered, then the browser shows a broken-image placeholder and the image has alt text "Zapatismo".
- **AC-6:** Given the logo is used as an image in the login and navbar, when inspected for accessibility, then the image has alt text "Zapatismo" where it represents the brand.

**Backend testing:** Not applicable (frontend-only ticket).

## 9. Dependencies, Risks, Impact
- **Dependencies:** None external. Depends only on the presence of `misc/logo.png` (or an agreed copy/derivation in the frontend). Build pipeline must serve/copy the asset as needed.
- **Risks / open technical uncertainties:** Using the same PNG for favicon is acceptable; some browsers may scale it. No separate favicon file or build step required.
- **Impact on existing functionality:** Favicon link in `index.html` will change to point to the logo asset (same file). Login and navbar templates will add an image (and possibly adjust layout). If the logo fails to load, a broken-image placeholder with alt text "Zapatismo" is shown. No breaking change to auth or navigation behaviour.

## 10. Open Points (RESOLVED)
- [x] **Fallback behaviour:** Resolved — when the logo image fails to load, show the browser’s broken-image placeholder only; the image MUST have alt text "Zapatismo".
- [x] **Favicon format:** Resolved — use the same logo file for the favicon (no separate or derived favicon file).

QUALITY GATE (before finishing):
- Requirements are atomic, unambiguous, testable.
- No implementation details (no code, no final DTOs, no migrations).
- Every ambiguity is captured as UNRESOLVED with a concrete question.
- Scope and Out-of-Scope are clearly separated.
