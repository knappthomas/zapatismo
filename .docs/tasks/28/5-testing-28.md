# Cypress E2E Testing – 28 – Self-Registration

## 0. Inputs
- Requirement sheet: `.docs/tasks/28/1-requirement-28.md`
- Implementation plan: `.docs/tasks/28/2-plan-28.md`
- Frontend implementation log: `.docs/tasks/28/4-frontend-28.md`
- Cypress conventions: `.cursor/rules/cypress-testing.mdc`
- Frontend layout: `.docs/system/frontend.md`
- Project rules: `.docs/system/project-rules.md`

## 1. Scope Confirmation
- In scope (Cypress E2E only): ✅
- Out of scope (backend/prisma/openapi/ios): ✅
- Plan-following mode (no extras): ✅
- Smoke test rule respected (only one in repo): ✅ — The single smoke test lives in `login/login.cy.ts` (e2e → smoke: "loads the app and redirects unauthenticated users to login"). No smoke block added for register.

## 2. Planned Test Cases (from Plan)
Map the plan's test strategy to concrete E2E tests:

| Planned item | Spec / describe / it title | Fixture(s) | Intercepts | Notes |
|--------------|----------------------------|------------|------------|--------|
| AC-1: link to registration visible on login | Component Test: login page shows register link | — | — | Visit /login, assert link |
| AC-2: click register link → registration form | e2e/fixtures: navigating from login to register shows form | — | — | Click link, assert URL and form |
| AC-3: valid submit → redirect to login with success | e2e/fixtures: successful registration redirects to login with success message | register/success.json | POST /api/auth/register → 201 | Submit valid data, assert redirect and message |
| AC-4: duplicate email → clear message | e2e/fixtures: shows "This email is already registered." on 409 | register/error-409.json | POST → 409 | Assert error alert text |
| AC-5: validation (client-side) | Component Test: submit disabled when invalid; validation messages | — | — | Empty/invalid email, short password |
| Error: server/validation (400/500) | e2e/fixtures: 400 and 500 error handling | error-400.json, error-500.json | POST → 400, 500 | Assert error UI |

## 3. Repo Golden Paths Used (References)
- Spec reference(s): `apps/frontend/cypress/e2e/login/login.cy.ts` (Component Test, e2e → fixtures with intercepts, e2e → smoke in login only).
- Page Object reference(s): `apps/frontend/cypress/e2e/login/po/LoginPO.ts` (extends MainPO, root from data-cy, getters for inputs/buttons/error).
- Fixture reference(s): `cypress/fixtures/login/success.json`, `login/error-401.json`, `login/error-500.json`; `users/error-409.json` for conflict shape.
- Patterns adopted: Same describe structure (Component Test, e2e/fixtures); no smoke in register; intercept POST with fixture and statusCode; PO extends MainPO with root `[data-cy="register"]`.

## 4. Test Infrastructure
### 4.1 Specs created/modified
- `apps/frontend/cypress/e2e/register/register.cy.ts` (new)

### 4.2 Page Objects created/modified
- `apps/frontend/cypress/e2e/register/po/RegisterPO.ts` (new, extends `MainPO`)

### 4.3 Fixtures created/modified
- `apps/frontend/cypress/fixtures/register/success.json`
- `apps/frontend/cypress/fixtures/register/error-409.json`
- `apps/frontend/cypress/fixtures/register/error-400.json`
- `apps/frontend/cypress/fixtures/register/error-500.json`

### 4.4 Selectors / data-cy
- Existing selectors used: `data-cy="register"`, `data-cy="register-email"`, `data-cy="register-password"`, `data-cy="register-submit"`, `data-cy="register-error"`, `data-cy="register-back-to-login"` (from RegisterComponent); `data-cy="login-register-link"`, `data-cy="login-success"` (from LoginComponent).
- Any new `data-cy` added to Angular templates: None. All required selectors already present in 4-frontend-28 implementation.

## 5. Implemented Scenarios
- **login page shows link to registration form:** Visit `/login`, assert `[data-cy="login-register-link"]` visible and `href="/register"`. Covers AC-1.
- **disables submit when email is empty or invalid or password is too short:** Visit `/register`, assert submit disabled until valid email and password ≥8 chars. Covers AC-5 (client-side).
- **shows back-to-login link:** Visit `/register`, assert back-to-login link visible and href `/login`.
- **navigating from login to register shows registration form:** Visit `/login`, click register link, assert URL includes `/register` and form (email, password, submit) visible. Covers AC-2.
- **successful registration redirects to login with success message:** Intercept `POST /api/auth/register` → 201 + `register/success.json`. Fill form, submit. Assert URL includes `/login` and `registered=1`, and `[data-cy="login-success"]` contains "Account created. Please sign in." Covers AC-3.
- **shows "This email is already registered." on 409:** Intercept POST → 409 + `register/error-409.json`. Submit. Assert error alert text and stay on `/register`. Covers AC-4.
- **shows validation message on 400:** Intercept POST → 400 + `register/error-400.json`. Submit. Assert error alert visible, stay on `/register`.
- **shows "Registration failed. Please try again." on server error:** Intercept POST → 500 + `register/error-500.json`. Submit. Assert error alert text.

## 6. Error Handling Coverage (only planned)
| Error case | Intercept | Fixture | Expected UI behavior |
|------------|-----------|---------|------------------------|
| 409 duplicate email | POST /api/auth/register, statusCode 409 | register/error-409.json | Error alert visible, contains "This email is already registered." |
| 400 validation | POST, statusCode 400 | register/error-400.json | Error alert with validation message |
| 500 server error | POST, statusCode 500 | register/error-500.json | Error alert with "Registration failed. Please try again." |

## 7. Acceptance Criteria Traceability
| AC ID | E2E coverage (spec + test name) | Verification |
|-------|----------------------------------|--------------|
| AC-1 | register.cy.ts → Component Test: "login page shows link to registration form" | Link visible and href /register on login page |
| AC-2 | register.cy.ts → e2e/fixtures: "navigating from login to register shows registration form" | Click link → /register, form visible |
| AC-3 | register.cy.ts → e2e/fixtures: "successful registration redirects to login with success message" | 201 → redirect to /login?registered=1, success message shown |
| AC-4 | register.cy.ts → e2e/fixtures: "shows \"This email is already registered.\" on 409" | 409 → error alert with expected text |
| AC-5 | register.cy.ts → Component Test: "disables submit when email is empty or invalid or password is too short" | Client-side validation; 400 fixture test for server validation message |
| AC-6 | — | Backend unit tests (out of scope for this doc) |
| AC-7 | — | Backend integration tests (out of scope for this doc) |
| AC-8 | — | Shared util usage (code review / unit tests) |

## 8. How to Run
- Command(s): `cd apps/frontend && npm run e2e` (open Cypress) or `npm run e2e:run` / `npm run e2e:headless` for run.
- Optional: run single spec: `npx cypress run --spec "cypress/e2e/register/register.cy.ts"`

## 9. Change Summary
- **Files added:** `apps/frontend/cypress/e2e/register/register.cy.ts`, `apps/frontend/cypress/e2e/register/po/RegisterPO.ts`, `apps/frontend/cypress/fixtures/register/success.json`, `apps/frontend/cypress/fixtures/register/error-409.json`, `apps/frontend/cypress/fixtures/register/error-400.json`, `apps/frontend/cypress/fixtures/register/error-500.json`.
- **Notes:** No smoke block in register spec; the single repo smoke test remains in `login/login.cy.ts`. All intercepts use `POST /api/auth/register` with fixtures; no extra test cases beyond the plan.

## 10. Open Points / Risks (UNRESOLVED)
- **Cypress binary:** E2E run was not executed in the implementation environment (Cypress binary missing in sandbox). Run locally: `cd apps/frontend && npm run e2e:run` or `npx cypress run --spec "cypress/e2e/register/register.cy.ts"` (ensure frontend dev server or served build is available if tests hit the app).
- None other.
