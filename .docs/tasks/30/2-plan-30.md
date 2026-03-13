# Implementation Plan – 30 – Project Logo and Favicon

## 0. Scope Check
- Requirement sheet present and reviewed: ✅
- Fits Zapatismo architecture constraints: ✅
- **In-Scope summary (bullets):**
  - Use project logo (`misc/logo.png`) as favicon and in login page and navbar.
  - Single logo asset available to frontend (copy in frontend assets or reference from build).
  - All logo images have alt text "Zapatismo"; broken-image fallback only.
  - No backend, API, or database changes.
- **Out-of-Scope summary (bullets):**
  - Backend or API changes.
  - Logo design or new logo variants.
  - Logo on other surfaces (e-mails, PDFs, mobile apps).
  - Legal/trademark or brand-guideline documentation.
- **Key assumptions (only if explicitly stated in requirements):**
  - `misc/logo.png` is the authoritative project logo and is suitable for favicon and UI at intended sizes.
- **UNRESOLVED items blocking implementation (if any):** None.

## 1. Architecture Mapping (High-Level)
| Layer | Responsibility for this ticket | Notes |
|-------|-------------------------------|-------|
| Angular (apps/frontend) | Favicon link in index.html; logo image on login page and in navbar; asset availability. | All changes in frontend only. |
| Backend (apps/backend, NestJS) | None. | No changes. |
| Database (MySQL via Prisma) | None. | No changes. |
| OpenAPI contract | None. | No changes. |
| Docker/Compose | None. | No changes. |
| iOS (apps/app-ios) | N/A. | Not in scope. |

## 2. Work Breakdown Structure (WBS)
- **WP-1:** Logo asset available to frontend
  - **Goal:** Ensure the project logo is served by the frontend build at a stable path.
  - **Affected area(s):** frontend (public assets)
  - **Depends on:** None
  - **Deliverables:** Logo file present in `apps/frontend/public/` (e.g. `public/logo.png`) so it is copied to build output root; referenced as `/logo.png` for favicon and in templates.

- **WP-2:** Favicon uses project logo
  - **Goal:** Browser tab and bookmarks show Zapatismo logo (FR-1, AC-1).
  - **Affected area(s):** frontend (index.html)
  - **Depends on:** WP-1
  - **Deliverables:** `src/index.html` updated: favicon link points to the same logo file (e.g. `type="image/png"` and `href="logo.png"`).

- **WP-3:** Login page displays logo
  - **Goal:** Login page shows project logo in a prominent position (FR-2, AC-2, AC-4, AC-5, AC-6).
  - **Affected area(s):** frontend (login component)
  - **Depends on:** WP-1
  - **Deliverables:** Login component template updated: logo image in prominent position (e.g. above form or as main heading); `alt="Zapatismo"`; optional `data-cy="login-logo"` for E2E.

- **WP-4:** Navbar brand area displays logo
  - **Goal:** Navbar brand area shows logo; brand link still navigates to dashboard (FR-3, AC-3, AC-4, AC-5, AC-6).
  - **Affected area(s):** frontend (navbar component)
  - **Depends on:** WP-1
  - **Deliverables:** Navbar component template updated: logo in brand area (e.g. inside or next to the dashboard link); `alt="Zapatismo"`; link to dashboard preserved; optional `data-cy="navbar-logo"` for E2E.

- **WP-5:** E2E and verification
  - **Goal:** Acceptance criteria verifiable via E2E where applicable; manual checks documented for favicon.
  - **Affected area(s):** frontend (Cypress)
  - **Depends on:** WP-2, WP-3, WP-4
  - **Deliverables:** Cypress E2E tests or steps that assert logo visibility on login and navbar, alt text, and dashboard link behaviour; AC-1 (favicon) covered by manual verification or optional E2E note.

## 3. Backend Plan (NestJS)
Not applicable. No backend modules, controllers, services, or endpoints are touched.

### 3.1 Modules / Components to touch
- None.

### 3.2 REST Endpoints
- None.

### 3.3 Validation & Error Handling
- Not applicable.

## 4. Data / Prisma Plan
Not applicable. No schema or migration changes.

### 4.1 Prisma schema changes
- None.

### 4.2 Migration steps
- None.

## 5. OpenAPI / Contract Plan
No OpenAPI or API contract changes.

## 6. Frontend Plan (Angular)
### 6.1 UX / Screens / Routes
- **Screens affected:** Login page (`/login`), any authenticated page that shows the main layout (navbar).
- **Routes affected:** None (same routes; only template content changes).
- **Components to add/modify:**
  - **Modify:** `src/app/features/login/login.component.ts` — template: add logo image in prominent position; ensure alt text "Zapatismo".
  - **Modify:** `src/app/layout/navbar.component.ts` — template: add logo in brand area; keep dashboard link; alt text "Zapatismo".
  - **Modify:** `src/index.html` — favicon link: point to logo asset (e.g. `logo.png`).

### 6.2 Data flow
- No new services or API usage. Logo is a static asset; components reference it via a stable path (e.g. `/logo.png` or path that resolves from build output root).
- No state management changes.
- If logo fails to load: browser shows broken-image placeholder; alt text "Zapatismo" satisfies FR-6 (no custom fallback UI).

### 6.3 Frontend validations
| Validation | Location (Frontend/Backend) | Rationale |
|------------|------------------------------|-----------|
| Logo image has alt text "Zapatismo" | Frontend (template) | Accessibility and FR-6; no backend involved. |
| Asset path correct at build/serve time | Build/config | Asset in `public/` ensures path is valid; no runtime validation needed. |

## 7. iOS App Plan (ONLY if required)
Not applicable.

## 8. Testing Plan
- **Backend tests:** Not applicable (frontend-only ticket). No backend unit or integration tests.
- **Frontend tests:**
  - **Unit:** No new unit tests required for this ticket (presentation-only: img tags and favicon link; no logic to unit-test).
  - **E2E (Cypress):**
    - **WP-5:** Add or extend E2E tests to verify:
      - **AC-2:** On `/login`, logo image is visible in a prominent position (e.g. element with `data-cy="login-logo"` or img with `alt="Zapatismo"` within login card).
      - **AC-3:** When authenticated, navbar brand area contains the logo and the brand link navigates to `/dashboard` (e.g. click and assert `cy.url()` includes `/dashboard`).
      - **AC-5/AC-6:** Logo images on login and navbar have `alt="Zapatismo"` (assert attribute on img elements).
    - **AC-1 (favicon):** Favicon is not easily assertable in Cypress (browser tab icon). Verification: manual check after build, or document in plan as manual step.
    - **AC-4:** Covered by same E2E that loads login and a layout page; if images load without error, layout holds (no explicit “no layout break” test unless desired).
- **Contract tests / OpenAPI:** Not applicable.

## 9. Acceptance Criteria Traceability
| AC ID | Implementation touchpoints | Test(s) / Verification |
|-------|----------------------------|-------------------------|
| AC-1 | WP-2: index.html favicon link | Manual: open app, check tab/bookmark icon. |
| AC-2 | WP-3: login component template | E2E: visit `/login`, assert logo visible (e.g. by data-cy or img with alt). |
| AC-3 | WP-4: navbar template + link | E2E: after login, assert navbar shows logo and brand link goes to dashboard. |
| AC-4 | WP-1, WP-3, WP-4: asset path + img in login/navbar | E2E: load login and layout page; images load (no 404); visual/layout check. |
| AC-5 | WP-3, WP-4: alt text on all logo img | E2E: assert img elements have `alt="Zapatismo"`. Broken-image case: manual or optional E2E with wrong src. |
| AC-6 | WP-3, WP-4: same img alt text | Same as AC-5 (accessibility assertion on alt). |

## 10. Execution Sequence
1. **WP-1:** Copy `misc/logo.png` to `apps/frontend/public/logo.png` (or add asset entry if project prefers single source in misc; then ensure build copies it to output root). Confirm asset is served at root (e.g. `/logo.png`) in dev and production build.
2. **WP-2:** In `apps/frontend/src/index.html`, replace favicon link: `rel="icon" type="image/png" href="logo.png"`. Remove or keep existing `favicon.ico` as desired (optional cleanup).
3. **WP-3:** In `apps/frontend/src/app/features/login/login.component.ts`, update template: add `<img src="/logo.png" alt="Zapatismo" ... />` in a prominent position (e.g. above the card title or as the main heading); retain or adjust "Zapatismo" text as needed. Add `data-cy="login-logo"` if using it in E2E.
4. **WP-4:** In `apps/frontend/src/app/layout/navbar.component.ts`, update template: in the brand area (e.g. inside the existing `<a routerLink="/dashboard">`), add `<img src="/logo.png" alt="Zapatismo" ... />` (and optionally keep "Zapatismo" text). Ensure the link still navigates to dashboard. Add `data-cy="navbar-logo"` if using it in E2E.
5. **WP-5:** Add or extend Cypress E2E tests (e.g. in `apps/frontend/cypress/e2e/login/login.cy.ts` and a layout/navbar or dashboard spec) to assert logo visibility on login, logo and link in navbar, and alt text. Document manual verification for favicon (AC-1).
6. Run frontend build and E2E: `npm run build` and `npm run e2e:run` from `apps/frontend`; fix any failures.

## 11. Risks & Open Points (UNRESOLVED)
- None. Requirement sheet and scope are clear; single source asset and alt-text behaviour are resolved.

---

QUALITY GATE:
- Every FR and AC from the requirement sheet is mapped to concrete work (WP-1–WP-5 and AC table).
- No architectural drift; frontend-only, static asset and template changes.
- No implementation code in this plan; only file/component names and deliverables.
- No open uncertainties; UNRESOLVED section empty.
