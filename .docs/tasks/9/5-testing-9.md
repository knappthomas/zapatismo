# Cypress E2E Testing – 9 – Shoe Usage Statistics (Steps & Distance in Overview Grid)

## 0. Inputs
- Requirement sheet: `.docs/tasks/9/1-requirement-9.md`
- Implementation plan: `.docs/tasks/9/2-plan-9.md`
- Frontend implementation log: `.docs/tasks/9/4-frontend-9.md`
- Cypress conventions: `.cursor/rules/cypress-testing.mdc`
- Frontend layout: `.docs/system/frontend.md`
- Project rules: `.docs/system/project-rules.md`

## 1. Scope Confirmation
- In scope (Cypress E2E only): ✅
- Out of scope (backend/prisma/openapi/ios): ✅
- Plan-following mode (no extras): ✅
- Smoke test rule respected (only one in repo): ✅ (single smoke lives in `login/login.cy.ts`: "loads the app and redirects unauthenticated users to login"; shoes spec has no smoke tests.)

## 2. Planned Test Cases (from Plan)
Map the plan's test strategy to concrete E2E tests:

| Planned item | Spec / describe / it title | Fixture(s) | Intercepts | Notes |
|--------------|----------------------------|------------|------------|--------|
| Fixture-driven: grid shows step count and progress bar | Shoes → e2e → fixtures → "grid shows total steps and distance progress bar per shoe" | shoes/loaded.json | GET **/api/shoes | Asserts step number (12500) and progress bar visible with aria-valuenow |
| Overview empty state | Shoes → e2e → fixtures → "overview shows empty state when list is empty" | shoes/empty.json | GET **/api/shoes | Pre-existing; used for overview state |
| Overview loaded state | Shoes → e2e → fixtures → "overview shows shoes when list returns data" | shoes/loaded.json | GET **/api/shoes | Pre-existing |
| List API failure (500) | Shoes → e2e → Error Handling → "overview shows error when list returns 500" | shoes/error-500.json | GET **/api/shoes, statusCode 500 | Planned error for ticket 9 |
| Form 400 / get 404 | Error Handling (form/create, edit) | shoes/empty.json, error-400.json | POST/GET | Pre-existing; not part of ticket 9 scope |

## 3. Repo Golden Paths Used (References)
- Spec reference(s): `apps/frontend/cypress/e2e/login/login.cy.ts` (fixtures + intercepts, PO usage), `apps/frontend/cypress/e2e/shoes/shoes.cy.ts` (existing structure).
- Page Object reference(s): `apps/frontend/cypress/e2e/login/po/LoginPO.ts` (extends MainPO, scoped root), `apps/frontend/cypress/page-objects/MainPO.ts`.
- Fixture reference(s): `cypress/fixtures/login/`, `cypress/fixtures/shoes/` (empty, loaded, error-500).
- Patterns adopted: setFakeUserToken for authenticated routes; intercept GET /api/shoes with fixture; PO with root-scoped getters; no smoke in shoes (one smoke in login).

## 4. Test Infrastructure
### 4.1 Specs created/modified
- `apps/frontend/cypress/e2e/shoes/shoes.cy.ts` (test "grid shows total steps and distance progress bar per shoe" uses PO getters for scoped assertions)

### 4.2 Page Objects created/modified
- `apps/frontend/cypress/e2e/shoes/po/ShoesOverviewPO.ts` (extends MainPO; added `shoeTotalSteps`, `shoeDistanceProgress` getters scoped to root)

### 4.3 Fixtures created/modified
- `apps/frontend/cypress/fixtures/shoes/loaded.json` (includes totalSteps, totalDistanceKm; already updated in WP-5)
- `apps/frontend/cypress/fixtures/shoes/empty.json` (unchanged)
- `apps/frontend/cypress/fixtures/shoes/error-500.json` (unchanged)

### 4.4 Selectors / data-cy
- Existing selectors used: `[data-cy="shoes-overview"]`, `[data-cy="shoes-grid"]`, `[data-cy="shoe-total-steps"]`, `[data-cy="shoe-distance-progress"]`, `[data-cy="add-shoe"]`, `.alert-error`, delete buttons.
- Any new `data-cy` added to Angular templates (list files + reasons): None for this step; `shoe-total-steps` and `shoe-distance-progress` were added in frontend implementation (4-frontend-9).

## 5. Implemented Scenarios
For each scenario:

- **overview shows empty state when list is empty**  
  Validates: Empty list shows "No shoes yet" and Add Shoe link. Route: `/shoes`. Intercept: GET **/api/shoes → empty.json. Assertions: "No shoes yet" visible, addShoeLink visible.

- **overview shows shoes when list returns data**  
  Validates: Grid shows shoe names/brands from API. Route: `/shoes`. Intercept: GET **/api/shoes → loaded.json. Assertions: "Pegasus 40", "Nike" visible.

- **grid shows total steps and distance progress bar per shoe** (ticket 9)  
  Validates: AC-1 (step count as number), AC-2 (progress bar 100% = target). Route: `/shoes`. Intercept: GET **/api/shoes → loaded.json (totalSteps: 12500, totalDistanceKm: 120.5). Assertions: First card shows "12500" for steps; first progress bar visible and has numeric aria-valuenow.

- **overview shows error when list returns 500**  
  Validates: List API failure shows error alert. Route: `/shoes`. Intercept: GET **/api/shoes, statusCode 500, error-500.json. Assertions: errorAlert visible, contains "Failed to load shoes."

## 6. Error Handling Coverage (only planned)
| Error case | Intercept | Fixture | Expected UI behavior |
|------------|-----------|---------|----------------------|
| Shoes list API 500 | GET **/api/shoes, statusCode 500 | shoes/error-500.json | overview error alert visible, "Failed to load shoes." |

## 7. Acceptance Criteria Traceability
| AC ID | E2E coverage (spec + test name) | Verification |
|-------|----------------------------------|---------------|
| AC-1 | shoes.cy.ts → fixtures → "grid shows total steps and distance progress bar per shoe" | Step count (12500) asserted via shoeTotalSteps |
| AC-2 | Same test | Progress bar present, aria-valuenow asserted via shoeDistanceProgress |
| AC-2b | Not covered by E2E (fixture has non-zero target; logic in component) | Display logic in shoes-grid-part.component.ts |
| AC-3 | Can be verified with fixture with 0,0 (optional per plan; not added) | Backend returns 0,0; grid shows 0 and 0% |
| AC-4, AC-5 | Backend only | Unit/integration tests |

## 8. How to Run
- Command(s): From repo root `npm run e2e --workspace=@zapatismo/frontend` or from `apps/frontend`: `npm run e2e` (Cypress UI) or `npm run e2e:run` (headless). Frontend (and for smoke, backend) must be running per AGENTS.md. Cypress binary must be installed (e.g. `npx cypress install` if missing).
- Optional: run single spec from `apps/frontend`: `npm run e2e:run -- --spec "cypress/e2e/shoes/shoes.cy.ts"`.

## 9. Change Summary
- Files added/modified: `.docs/tasks/9/5-testing-9.md` (new), `apps/frontend/cypress/e2e/shoes/po/ShoesOverviewPO.ts` (getters for steps/progress), `apps/frontend/cypress/e2e/shoes/shoes.cy.ts` (use PO getters in grid test).
- Notes: No new fixtures beyond existing loaded.json (with totalSteps/totalDistanceKm). No new smoke test. Error Handling limited to planned list 500.

## 10. Open Points / Risks (UNRESOLVED)
- None. (E2E run was not executed in the implementation environment due to missing Cypress binary; run locally with `npm run e2e:run` from `apps/frontend` after `npx cypress install` if needed.)
