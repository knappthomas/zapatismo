# Cypress E2E Testing – 21 – Admin: Create New User

## 0. Inputs
- Requirement sheet: `.docs/tasks/21/1-requirement-21.md`
- Implementation plan: `.docs/tasks/21/2-plan-21.md`
- Frontend implementation log: `.docs/tasks/21/4-frontend-21.md`
- Cypress conventions: `.cursor/rules/cypress-testing.mdc`
- Frontend layout: `.docs/system/frontend.md`
- Project rules: `.docs/system/project-rules.md`

## 1. Scope Confirmation
- In scope (Cypress E2E only): ✅
- Out of scope (backend/prisma/openapi/ios): ✅
- Plan-following mode (no extras): ✅
- Smoke test rule respected (only one in repo): ✅ (smoke lives in login spec; no smoke added here)

## 2. Planned Test Cases (from Plan + ACs)
Plan section 8: "Frontend tests: No explicit requirement for new unit or E2E tests… If the project later adds E2E for admin flows, 'create user from list' can be covered then." E2E scenarios are derived from ACs and requirement error cases.

| Planned item | Spec / describe / it title | Fixture(s) | Intercepts | Notes |
|-------------|----------------------------|------------|------------|-------|
| AC-1: Button visible on /users | e2e → fixtures: overview shows "Nutzer anlegen" when list loaded | users/loaded.json | GET /api/users | Admin token |
| AC-2: Form with email, password, role | Component Test: create form has email, password, role fields | — | — | Visit /users/new with admin token |
| AC-3: Valid submit → redirect, new user in list | e2e → fixtures: create user with valid data then redirects and list shows new user | users/created.json, users/loaded-with-new.json | POST /api/users 201, GET /api/users | |
| AC-4: 409 → error message | Error Handling: form shows duplicate-email error on 409 | users/error-409.json | POST 409 | |
| AC-5: Validation (email, password min 8) | Component Test: submit disabled when email invalid or password too short | — | — | |
| List error (5xx) | Error Handling: overview shows error when list returns 500 | users/error-500.json | GET 500 | |

## 3. Repo Golden Paths Used (References)
- Spec reference(s): `apps/frontend/cypress/e2e/shoes/shoes.cy.ts` (setFakeUserToken, fixtures, Error Handling block), `apps/frontend/cypress/e2e/login/login.cy.ts` (structure, intercept + fixture)
- Page Object reference(s): `apps/frontend/cypress/e2e/shoes/po/ShoesOverviewPO.ts`, `ShoeFormPO.ts` (root selector, getters, MainPO)
- Fixture reference(s): `cypress/fixtures/shoes/empty.json`, `loaded.json`, `error-500.json`, `error-400.json`
- Patterns adopted: ADMIN token helper (like setFakeUserToken but role ADMIN); intercept GET/POST with fixtures; no smoke block content (one smoke in login only)

## 4. Test Infrastructure
### 4.1 Specs created/modified
- `apps/frontend/cypress/e2e/users/users.cy.ts`

### 4.2 Page Objects created/modified
- `apps/frontend/cypress/e2e/users/po/UsersOverviewPO.ts` (extends MainPO)
- `apps/frontend/cypress/e2e/users/po/UserCreatePO.ts` (extends MainPO)

### 4.3 Fixtures created/modified
- `apps/frontend/cypress/fixtures/users/empty.json`
- `apps/frontend/cypress/fixtures/users/loaded.json`
- `apps/frontend/cypress/fixtures/users/created.json`
- `apps/frontend/cypress/fixtures/users/loaded-with-new.json`
- `apps/frontend/cypress/fixtures/users/error-409.json`
- `apps/frontend/cypress/fixtures/users/error-500.json`

### 4.4 Selectors / data-cy
- Existing selectors used: (none; all scoped via new data-cy)
- New `data-cy` in `user-list.component.ts`: `users-overview` (root), `user-create-link`, `users-success-alert`, `users-error-alert`, `users-table-wrapper` — stable selectors for overview PO and fixtures.
- New `data-cy` in `user-create.component.ts`: `user-create` (root), `user-create-email`, `user-create-password`, `user-create-role`, `user-create-submit`, `user-create-form-error` — stable selectors for create PO and error assertions.

## 5. Implemented Scenarios
- **Component Test – create form has email, password, and role fields:** Visit /users/new with admin token; assert email, password, role select, submit visible; role default USER. No intercepts.
- **Component Test – submit disabled when email invalid or password too short:** Visit /users/new; assert submit disabled when empty, invalid email, or password &lt; 8; assert submit enabled when valid email + password ≥8. No intercepts.
- **fixtures – overview shows "Nutzer anlegen" when list is loaded:** GET /api/users → users/loaded.json; visit /users; assert create link visible and contains "Nutzer anlegen", table visible, admin email in list.
- **fixtures – create user with valid data then redirects and list shows new user:** Intercept GET /api/users with sequential reply (first loaded.json, second loaded-with-new.json); intercept POST /api/users 201 → users/created.json; visit /users, click create, fill and submit; assert redirect to /users, success alert, new user email in list.
- **Error Handling – form shows duplicate-email error on 409:** GET users/loaded, POST 409 users/error-409; visit /users/new, submit existing email; assert formError contains "Diese E-Mail-Adresse wird bereits verwendet", stay on /users/new.
- **Error Handling – overview shows error when list returns 500:** GET /api/users 500 → users/error-500; visit /users; assert error alert contains "Failed to load users."

## 6. Error Handling Coverage (only planned)
| Error case | Intercept | Fixture | Expected UI behavior |
|------------|-----------|---------|----------------------|
| Duplicate email (409) | POST /api/users 409 | users/error-409.json | Form error: "Diese E-Mail-Adresse wird bereits verwendet." |
| List load failure (500) | GET /api/users 500 | users/error-500.json | Overview error alert visible |

## 7. Acceptance Criteria Traceability
| AC ID | E2E coverage (spec + test name) | Verification |
|-------|----------------------------------|--------------|
| AC-1 | users.cy → fixtures: overview shows "Nutzer anlegen" when list loaded | Button visible |
| AC-2 | users.cy → Component Test: create form has email, password, role | Form fields present |
| AC-3 | users.cy → fixtures: create user with valid data then redirects and list shows new user | POST 201, redirect, list contains new user |
| AC-4 | users.cy → Error Handling: form shows duplicate-email error on 409 | Error message shown |
| AC-5 | users.cy → Component Test: submit disabled when email invalid or password too short | Validation blocks submit |
| AC-6 | Not covered by E2E (plan: manual); backend 403 covered by backend tests | — |

## 8. How to Run
- From `apps/frontend`: `npm run e2e:run` or `npx cypress run --browser chrome`
- Run single spec: `npx cypress run --spec "cypress/e2e/users/users.cy.ts"` (from apps/frontend)
- Requires: Cypress binary installed (`npx cypress verify`), dev server on port 4200 if running without baseUrl override

## 9. Change Summary
- **Files added:** `apps/frontend/cypress/e2e/users/users.cy.ts`, `apps/frontend/cypress/e2e/users/po/UsersOverviewPO.ts`, `apps/frontend/cypress/e2e/users/po/UserCreatePO.ts`, `apps/frontend/cypress/fixtures/users/empty.json`, `loaded.json`, `created.json`, `loaded-with-new.json`, `error-409.json`, `error-500.json`, `.docs/tasks/21/5-testing-21.md`
- **Files modified:** `apps/frontend/src/app/features/users/user-list.component.ts` (data-cy: users-overview, user-create-link, users-success-alert, users-error-alert, users-table-wrapper), `apps/frontend/src/app/features/users/user-create.component.ts` (data-cy: user-create, user-create-email, user-create-password, user-create-role, user-create-submit, user-create-form-error)
- Notes: Admin flow uses setFakeAdminToken(); no smoke test added (one per repo in login). E2E run was not executed in this environment (Cypress binary missing); run locally with `npm run e2e:run` from apps/frontend.

## 10. Open Points / Risks (UNRESOLVED)
- Plan did not define concrete E2E scenarios; tests derived from ACs and error cases. AC-6 (non-admin) left to manual per plan.
