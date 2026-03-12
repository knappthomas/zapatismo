# Cypress E2E Testing – 22 – Bulk Assign Shoe to Workouts

## 0. Inputs
- Requirement sheet: `.docs/tasks/22/1-requirement-22.md`
- Implementation plan: `.docs/tasks/22/2-plan-22.md`
- Frontend implementation log: `.docs/tasks/22/4-frontend-22.md`
- Cypress conventions: `.cursor/rules/cypress-testing.mdc`
- Frontend layout: `.docs/system/frontend.md`
- Project rules: `.docs/system/project-rules.md`

## 1. Scope Confirmation
- In scope (Cypress E2E only): ✅
- Out of scope (backend/prisma/openapi/ios): ✅
- Plan-following mode (no extras): ✅
- Smoke test rule respected (only one in repo): ✅ — This ticket does not add a smoke test; smoke tests already exist in login and workouts; no duplicate smoke added for bulk-assign.

## 2. Planned Test Cases (from Plan)
Map the plan’s test strategy to concrete E2E tests:

| Planned item | Spec / describe / it title | Fixture(s) | Intercepts | Notes |
|--------------|----------------------------|------------|------------|--------|
| AC-1 Select column and per-row selection | e2e → fixtures: overview shows select column and allows selecting rows | workouts/loaded.json | GET /api/workouts | Assert column + checkboxes, select one row |
| AC-2 Toolbar when ≥1 selected | e2e → fixtures: toolbar with Assign Shoe visible when at least one workout selected | workouts/loaded.json | GET /api/workouts | Select row, assert toolbar + button |
| AC-3 Toolbar hidden when no selection | e2e → fixtures: toolbar hidden when no workout selected | workouts/loaded.json | GET /api/workouts | Deselect all, assert toolbar not visible |
| AC-4 Modal with shoes and confirm | e2e → fixtures: assign-shoe modal shows shoes dropdown and confirm | workouts/loaded.json, shoes/loaded.json | GET workouts, GET shoes | Open modal, assert dropdown + Update |
| AC-5 Success: modal closes, list refreshes | e2e → fixtures: after bulk assign success modal closes and list shows assigned shoe | workouts/loaded.json, loaded-after-assign.json | GET workouts (x2), GET shoes, PATCH bulk-assign-shoe | Confirm → modal closed, list refreshed |
| AC-6 Cancel: no update | e2e → fixtures: closing assign-shoe modal without confirm does not call bulk-assign | workouts/loaded.json, shoes/loaded.json | GET workouts, GET shoes, PATCH (assert not called or no body) | Open modal, cancel; no PATCH |
| AC-7 No shoes: cannot complete | e2e → fixtures: assign-shoe modal with no shoes disables confirm and shows message | workouts/loaded.json, shoes/empty.json | GET workouts, GET shoes | Open modal, assert message + confirm disabled |
| Bulk-assign API error | e2e → Error Handling: assign-shoe modal shows error on bulk-assign failure | workouts/loaded.json, shoes/loaded.json, workouts/error-500.json | GET workouts, GET shoes, PATCH 500 | Confirm assign, assert error in modal |

## 3. Repo Golden Paths Used (References)
- Spec reference(s): `apps/frontend/cypress/e2e/workouts/workouts.cy.ts` (fixtures, Error Handling, setFakeUserToken, overviewPO)
- Page Object reference(s): `apps/frontend/cypress/e2e/workouts/po/WorkoutsOverviewPO.ts` (extends MainPO, data-cy getters)
- Fixture reference(s): `cypress/fixtures/workouts/loaded.json`, `shoes/empty.json`, `workouts/error-500.json`
- Patterns adopted: intercept GET/PATCH with fixtures; fake JWT in beforeEach; overviewPO for overview and modals

## 4. Test Infrastructure
### 4.1 Specs created/modified
- `apps/frontend/cypress/e2e/workouts/workouts.cy.ts` (add bulk-assign tests under e2e/fixtures and e2e/Error Handling)

### 4.2 Page Objects created/modified
- `apps/frontend/cypress/e2e/workouts/po/WorkoutsOverviewPO.ts` — add getters: assignShoeToolbar, assignShoeModal, assignShoeSelect, assignShoeConfirm, assignShoeCancel, assignShoeNoShoes, assignShoeError (extends MainPO)

### 4.3 Fixtures created/modified
- `apps/frontend/cypress/fixtures/workouts/loaded-after-assign.json` (list with both workouts having shoe, for refreshed list after assign)

### 4.4 Selectors / data-cy
- Existing selectors used: `[data-cy="workouts-overview"]`, `[data-cy="workouts-toolbar"]`, `[data-cy="assign-shoe-btn"]`, `[data-cy="workouts-list"]`, `[data-cy="workouts-select-all"]`, `[data-cy="workout-select-1"]` (and id 2), `[data-cy="assign-shoe-modal"]`, `[data-cy="assign-shoe-no-shoes"]`, `[data-cy="assign-shoe-select"]`, `[data-cy="assign-shoe-confirm"]`, `[data-cy="assign-shoe-cancel"]`, `[data-cy="assign-shoe-error"]`
- Any new `data-cy` added to Angular templates: None (all present from frontend implementation)

## 5. Implemented Scenarios
- **overview shows select column and allows selecting rows:** Visit /workouts with GET workouts → loaded.json; assert workouts-list, workouts-select-all, workout-select-1 visible; check row 1, assert checked. Validates AC-1.
- **toolbar with Assign Shoe visible when at least one workout selected:** GET workouts → loaded; assert toolbar not present; check workout 1; assert toolbar and Assign Shoe button visible. Validates AC-2.
- **toolbar hidden when no workout selected:** GET workouts → loaded; check then uncheck row 1; assert toolbar not exist. Validates AC-3.
- **assign-shoe modal shows shoes dropdown and confirm:** GET workouts + GET shoes; select row, click Assign Shoe; assert modal, title, assign-shoe-select, Update, Cancel; select shoe 1, assert confirm enabled. Validates AC-4.
- **after bulk assign success modal closes and list shows assigned shoe:** GET workouts (first call → loaded, second → loaded-after-assign), GET shoes, PATCH bulk-assign-shoe → 200; select row 2, open modal, select shoe, confirm; wait PATCH; assert modal closed and list shows Nike for Central Park. Validates AC-5.
- **closing assign-shoe modal without confirm does not call bulk-assign:** GET workouts, GET shoes, PATCH intercept with cy.spy(); select row, open modal, click Cancel; assert modal closed and spy not called. Validates AC-6.
- **assign-shoe modal with no shoes disables confirm and shows message:** GET workouts, GET shoes → empty; select row, open modal; assert assign-shoe-no-shoes message and confirm disabled. Validates AC-7.
- **assign-shoe modal shows error on bulk-assign failure:** GET workouts, GET shoes, PATCH → 500 with error-500.json; select row, open modal, select shoe, confirm; assert assign-shoe-error visible and modal still open.

## 6. Error Handling Coverage (only planned)
| Error case | Intercept | Fixture | Expected UI behavior |
|------------|----------|---------|---------------------|
| PATCH bulk-assign-shoe 500 | PATCH **/api/workouts/bulk-assign-shoe, statusCode 500 | workouts/error-500.json | assign-shoe-error visible in modal |

## 7. Acceptance Criteria Traceability
| AC ID | E2E coverage (spec + test name) | Verification |
|-------|---------------------------------|--------------|
| AC-1 | e2e → fixtures: overview shows select column and allows selecting rows | Select column and per-row checkboxes present and selectable |
| AC-2 | e2e → fixtures: toolbar with Assign Shoe visible when at least one workout selected | Toolbar and button visible when ≥1 selected |
| AC-3 | e2e → fixtures: toolbar hidden when no workout selected | Toolbar not exist after deselecting all |
| AC-4 | e2e → fixtures: assign-shoe modal shows shoes dropdown and confirm | Modal, dropdown, Update/Cancel; shoe select enables confirm |
| AC-5 | e2e → fixtures: after bulk assign success modal closes and list shows assigned shoe | Modal closes, list refreshed, shoe shown for affected row |
| AC-6 | e2e → fixtures: closing assign-shoe modal without confirm does not call bulk-assign | Cancel → no PATCH (spy not called) |
| AC-7 | e2e → fixtures: assign-shoe modal with no shoes disables confirm and shows message | No-shoes message and confirm disabled |
| AC-8 | — | Backend unit tests (out of scope for this E2E doc) |
| AC-9 | — | Backend integration tests (out of scope for this E2E doc) |

## 8. How to Run
- From repo root: `npm run e2e:run --workspace=frontend` (runs all E2E specs).
- From `apps/frontend`: `npm run e2e:run` or `npx cypress run --browser chrome`; headless: `npm run e2e:headless` or `npx cypress run --browser chrome --headless`.
- Run single spec: `npx cypress run --browser chrome --spec "cypress/e2e/workouts/workouts.cy.ts"` (from apps/frontend).
- Note: Cypress binary must be installed (e.g. `npx cypress install` if missing).

## 9. Change Summary
- **Files added:** `apps/frontend/cypress/fixtures/workouts/loaded-after-assign.json`
- **Files modified:** `apps/frontend/cypress/e2e/workouts/workouts.cy.ts` (7 new fixture-driven tests in e2e/fixtures, 1 in Error Handling), `apps/frontend/cypress/e2e/workouts/po/WorkoutsOverviewPO.ts` (getters for toolbar, assign-shoe modal, select, confirm, cancel, no-shoes, error)
- **Notes:** No new data-cy attributes; all selectors already present from frontend implementation (ticket 22). No smoke test added (smoke rule: one per repo; not assigned to this ticket).

## 10. Open Points / Risks (UNRESOLVED)
- None.
