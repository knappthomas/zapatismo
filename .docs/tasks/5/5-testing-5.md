# Cypress E2E Testing – 5 – Frontend Cypress E2E Test Strategy and System

## 0. Inputs

- Requirement sheet: `.docs/tasks/5/1-requirement-5.md`
- Implementation plan: `.docs/tasks/5/2-plan-5.md`
- Frontend implementation log: `.docs/tasks/5/4-frontend-5.md` (not present; plan and existing spec used for routes/selectors/endpoints)
- Cypress conventions: `.cursor/rules/cypress-testing.mdc`
- Frontend layout: `.docs/system/frontend.md`
- Project rules: `.docs/system/project-rules.md`

## 1. Scope Confirmation

- In scope (Cypress E2E only): ✅
- Out of scope (backend/prisma/openapi/ios): ✅
- Plan-following mode (no extras): ✅
- Smoke test rule respected (only one in repo): ✅ — single smoke test lives in login spec under `e2e` → `smoke`: "loads the app and redirects unauthenticated users to login". No duplicate "app is up" tests elsewhere.

## 2. Planned Test Cases (from Plan)

Map the plan's test strategy to concrete E2E tests:

| Planned item | Spec / describe / it title | Fixture(s) | Intercepts | Notes |
|--------------|----------------------------|------------|------------|-------|
| Component Test: disable submit when invalid | Login → Component Test → disables submit when email is empty or invalid or password is empty | — | — | No server; validation only |
| e2e/fixtures: login success | Login → e2e → fixtures → successfully logs in and navigates to dashboard | login/success.json | POST /api/auth/login | Stubbed success |
| e2e/fixtures: 401 | Login → e2e → fixtures → shows "Invalid email or password." on 401 | login/error-401.json | POST 401 | Stubbed 401 |
| e2e/fixtures: 500 | Login → e2e → fixtures → shows "Login failed. Please try again." on server error | login/error-500.json | POST 500 | Stubbed 500 |
| e2e/fixtures: network error | Login → e2e → fixtures → shows generic error on network failure | — | forceNetworkError | No fixture |
| e2e/smoke: real redirect | Login → e2e → smoke → loads the app and redirects unauthenticated users to login | — | None (real server) | Single smoke test in repo |

## 3. Repo Golden Paths Used (References)

- Spec reference(s): `apps/frontend/cypress/e2e/login/login.cy.ts` (existing; refactored to new structure)
- Page Object reference(s): `apps/frontend/cypress/e2e/login/po/LoginPO.ts` (unchanged; extends MainPO)
- Fixture reference(s): `apps/frontend/cypress/fixtures/login/success.json`, `error-401.json`, `error-500.json`
- Patterns adopted: describe blocks per plan (Component Test, e2e → fixtures, e2e → smoke); intercept + fixture for all fixture-driven tests; single smoke test under e2e/smoke; beforeEach visit + clearLocalStorage in each block as needed.

## 4. Test Infrastructure

### 4.1 Specs created/modified

- `apps/frontend/cypress/e2e/login/login.cy.ts` (refactored)

### 4.2 Page Objects created/modified

- `apps/frontend/cypress/e2e/login/po/LoginPO.ts` — no changes (already extends MainPO, scoped root `[data-cy="login"]`)

### 4.3 Fixtures created/modified

- `apps/frontend/cypress/fixtures/login/success.json` (existing)
- `apps/frontend/cypress/fixtures/login/error-401.json` (existing)
- `apps/frontend/cypress/fixtures/login/error-500.json` (existing)

### 4.4 Selectors / data-cy

- Existing selectors used: `[data-cy="login"]`, `[data-cy="login-email"]`, `[data-cy="login-password"]`, `[data-cy="login-submit"]`, `[data-cy="login-error"]`
- Any new `data-cy` added to Angular templates: none (all present in login.component.ts)

## 5. Implemented Scenarios

| Scenario | Validates | Route | Intercepts | Fixture(s) | Assertions |
|----------|-----------|--------|------------|------------|------------|
| Disable submit when invalid | Submit disabled until valid email + non-empty password | /login | — | — | submit disabled with empty/invalid email; disabled with empty password; enabled when both valid |
| Login success (fixtures) | Login with stubbed success redirects to dashboard | /login | POST /api/auth/login → success | login/success.json | url includes /dashboard |
| 401 (fixtures) | Stubbed 401 shows error message, stays on login | /login | POST 401 + body | login/error-401.json | error alert visible, contains "Invalid email or password.", url includes /login |
| 500 (fixtures) | Stubbed 500 shows generic error, stays on login | /login | POST 500 + body | login/error-500.json | error alert visible, contains "Login failed. Please try again.", url includes /login |
| Network failure (fixtures) | forceNetworkError shows generic error | /login | POST forceNetworkError | — | error alert visible, contains "Login failed. Please try again.", url includes /login |
| Smoke: redirect | Unauthenticated user visiting / is redirected to /login (real server) | / then /login | None | — | url includes /login, body visible |

## 6. Error Handling Coverage (only planned)

| Error case | Intercept | Fixture | Expected UI behavior |
|------------|-----------|---------|----------------------|
| 401 Unauthorized | POST /api/auth/login, statusCode 401 | login/error-401.json | Alert with "Invalid email or password.", stay on /login |
| 500 Server error | POST /api/auth/login, statusCode 500 | login/error-500.json | Alert with "Login failed. Please try again.", stay on /login |
| Network failure | POST /api/auth/login, forceNetworkError | — | Alert with "Login failed. Please try again.", stay on /login |

## 7. Acceptance Criteria Traceability

| AC ID | E2E coverage (spec + test name) | Verification |
|-------|---------------------------------|--------------|
| AC-1 | Cypress starts and loads spec(s) | Run `npm run e2e` or `npm run e2e:run` from frontend |
| AC-2 | login.cy.ts has one describe "Component Test", one "e2e" with nested "fixtures" and "smoke" | Read spec file |
| AC-3 | Component Test: "disables submit when email is empty or invalid or password is empty" | Run Component Test block with or without backend; passes without real server |
| AC-4 | e2e/fixtures: success, 401, 500, network error tests | Run e2e/fixtures; all use intercepts + fixtures |
| AC-5 | e2e/smoke: "loads the app and redirects unauthenticated users to login" | With backend + test-migrations, run smoke; one smoke test passes |
| AC-6 | cypress.config.ts reviewed (baseUrl, specPattern, fixturesFolder) | No code change; config already supports strategy |
| AC-7 | cypress-testing.mdc (WP-1) | Documented in rule; not part of this testing step |
| AC-8 | system-tests workflow (WP-5) | Not part of Cypress spec implementation |

## 8. How to Run

- Full E2E (open UI): `npm run e2e` (from `apps/frontend` or `npm run e2e -w frontend` from root)
- Headless: `npm run e2e:headless` (from `apps/frontend`) or `npm run e2e:headless -w frontend` from root
- Run single spec: `npx cypress run --browser chrome --headless --spec cypress/e2e/login/login.cy.ts` (from `apps/frontend`)
- Prerequisites: Cypress binary must be installed (e.g. after `npm install`; or `npx cypress install` if missing). For the single smoke test (redirect to login), frontend must be reachable at baseUrl; full smoke with real backend is only required when running the full system-tests workflow (backend + frontend up).

## 9. Change Summary

- Files modified: `apps/frontend/cypress/e2e/login/login.cy.ts` (restructured describe blocks; no new tests beyond plan)
- Files added: `.docs/tasks/5/5-testing-5.md`
- Notes: No new fixtures or data-cy. LoginPO unchanged. Exactly one smoke test in repo (redirect to login).

## 10. Open Points / Risks (UNRESOLVED)

- None. Plan fully implemented for Cypress E2E (step 5). WP-1 (rule doc), WP-2 (config), WP-5 (workflow) are separate work packages.
