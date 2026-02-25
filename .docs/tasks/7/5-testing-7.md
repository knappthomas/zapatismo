# Cypress E2E Testing – 7 – Workout Management (Workout Tracking)

## 0. Inputs
- Requirement sheet: `.docs/tasks/7/1-requirement-7.md`
- Implementation plan: `.docs/tasks/7/2-plan-7.md`
- Frontend implementation log: `.docs/tasks/7/4-frontend-7.md`
- Cypress conventions: `.cursor/rules/cypress-testing.mdc`
- Frontend layout: `.docs/system/frontend.md`
- Project rules: `.docs/system/project-rules.md`

## 1. Scope Confirmation
- In scope (Cypress E2E only): ✅
- Out of scope (backend/prisma/openapi/ios): ✅
- Plan-following mode (no extras): ✅
- Smoke test rule respected (only one in repo): ✅ — This ticket is the chosen place for the **single** smoke test per plan §9: full workout CRUD (create → verify in overview → edit all data → delete). The repo also has a login smoke (“loads the app and redirects to login”); if the convention is strictly one smoke total, the login smoke should be removed or consolidated elsewhere.

## 2. Planned Test Cases (from Plan)
Map the plan’s test strategy to concrete E2E tests:

| Planned item | Spec / describe / it title | Fixture(s) | Intercepts | Notes |
|--------------|----------------------------|------------|------------|--------|
| Overview empty state | e2e → fixtures: overview shows empty state when list is empty | empty.json | GET **/api/workouts | No real server |
| Overview loaded state | e2e → fixtures: overview shows workouts when list returns data | loaded.json | GET **/api/workouts | No real server |
| List 500 error | e2e → Error Handling: overview shows error when list returns 500 | error-500.json | GET **/api/workouts, statusCode 500 | Error UI |
| Create 400 validation | e2e → Error Handling: form shows error on create 400 | error-400.json, shoes/empty.json | GET **/api/shoes, POST **/api/workouts 400 | Form error |
| Smoke: full CRUD | e2e → smoke: create workout → verify in overview → edit all data → delete workout | — | Real backend | One smoke test; thomas@zapatismo.local |

## 3. Repo Golden Paths Used (References)
- Spec reference(s): `apps/frontend/cypress/e2e/shoes/shoes.cy.ts` (describe structure: e2e → fixtures, Error Handling, smoke; intercepts; setFakeUserToken).
- Page Object reference(s): `apps/frontend/cypress/e2e/shoes/po/ShoesOverviewPO.ts`, `ShoeFormPO.ts` (extend MainPO, protected root, data-cy).
- Fixture reference(s): `apps/frontend/cypress/fixtures/shoes/` (empty.json, loaded.json, error-500.json, error-400.json).
- Patterns adopted: Fake JWT for fixture tests; intercept-driven states; one smoke with real login and real API; POs extending MainPO with data-cy selectors.

## 4. Test Infrastructure
### 4.1 Specs created/modified
- `apps/frontend/cypress/e2e/workouts/workouts.cy.ts` (E2E only: Component Test block removed per “no Cypress component tests” rule)

### 4.2 Page Objects created/modified
- `apps/frontend/cypress/e2e/workouts/po/WorkoutsOverviewPO.ts` (extends MainPO, root `[data-cy="workouts-overview"]`)
- `apps/frontend/cypress/e2e/workouts/po/WorkoutFormPO.ts` (extends MainPO, root `[data-cy="workout-form-container"]`)

### 4.3 Fixtures created/modified
- `apps/frontend/cypress/fixtures/workouts/empty.json` — `[]`
- `apps/frontend/cypress/fixtures/workouts/loaded.json` — two workouts (Villach Park, Central Park)
- `apps/frontend/cypress/fixtures/workouts/error-400.json` — validation message (endTime)
- `apps/frontend/cypress/fixtures/workouts/error-500.json` — server error message

### 4.4 Selectors / data-cy
- Existing selectors used: `workouts-overview`, `add-workout`, `delete-cancel`, `delete-confirm`, `.alert-error`; `workout-form-container`, `workout-type`, `workout-start-time`, `workout-end-time`, `workout-steps`, `workout-distance`, `workout-location`, `workout-shoe`, `workout-submit`, `workout-form-error`.
- Any new `data-cy` added to Angular templates (list files + reasons): None; all required data-cy were already present from frontend implementation (4-frontend-7).

## 5. Implemented Scenarios
For each scenario:
- **Empty state:** Validates overview shows “No workouts yet” and Add Workout link when list returns `[]`. Route: `/workouts`. Intercept: GET **/api/workouts → empty.json. Assertions: text “No workouts yet”, addWorkoutLink visible.
- **Loaded state:** Validates overview shows workout locations when list returns data. Route: `/workouts`. Intercept: GET **/api/workouts → loaded.json. Assertions: “Villach Park”, “Central Park” visible.
- **List 500:** Validates overview shows error alert when list returns 500. Route: `/workouts`. Intercept: GET **/api/workouts, statusCode 500, error-500.json. Assertions: errorAlert visible and contains “Failed to load workouts.”
- **Create 400:** Validates form shows validation error on create 400. Route: `/workouts/new`. Intercepts: GET **/api/shoes → shoes/empty.json; POST **/api/workouts, statusCode 400, error-400.json. Assertions: formError visible and contains “endTime”.
- **Smoke (full CRUD):** Login as thomas@zapatismo.local, go to workouts, add workout, verify in list, edit all fields, delete with confirmation, assert workout gone. No intercepts for workout/shoes APIs; real backend.

## 6. Error Handling Coverage (only planned)
| Error case | Intercept | Fixture | Expected UI behavior |
|------------|----------|---------|----------------------|
| List 500 | GET **/api/workouts, 500 | workouts/error-500.json | overview error alert: “Failed to load workouts.” |
| Create 400 (validation) | POST **/api/workouts, 400 | workouts/error-400.json | form error area contains “endTime” |

## 7. Acceptance Criteria Traceability
| AC ID | E2E coverage (spec + test name) | Verification |
|-------|----------------------------------|--------------|
| AC-1 | e2e → smoke: open Workouts → overview | Login, visit /workouts, overview shown |
| AC-2 | e2e → smoke: create workout, submit valid data | Add Workout, fill form, submit, in list |
| AC-3 | e2e → smoke: edit all data, save | Edit link, change fields, submit, list updated |
| AC-4 | e2e → smoke: delete with confirmation | Delete → confirm → workout gone |
| AC-5 | — | Cancel delete not in scope for this E2E set (optional manual) |
| AC-6 | e2e → Error Handling: form shows error on create 400 | 400 fixture, formError with “endTime” |
| AC-7 | e2e → smoke: form has shoe selector | Smoke uses form; shoe optional in flow |

## 8. How to Run
- Command(s): From `apps/frontend`: `npm run e2e:run` (headless) or `npm run e2e` (interactive). Ensure Cypress binary is installed (`npx cypress verify`).
- Run single spec: `npx cypress run --spec "cypress/e2e/workouts/workouts.cy.ts" --browser chrome` from `apps/frontend`.
- Smoke test requires: backend running, MySQL up, migrations and test-migrations applied (thomas user + data). Fixture and Error Handling tests use intercepts and do not require the backend.

## 9. Change Summary
- Files modified: `apps/frontend/cypress/e2e/workouts/workouts.cy.ts` — removed “Component Test” describe block (E2E only per command); added explicit “Error Handling” describe under e2e; kept fixtures and smoke unchanged.
- Files added: None (spec, POs, fixtures already present from step 4).
- Notes: No new data-cy; all selectors already on overview and form components.

## 10. Open Points / Risks (UNRESOLVED)
- [ ] **Two smoke tests in repo** — Login has “loads the app and redirects to login”; Workouts has full CRUD smoke. If the convention is strictly “exactly one smoke test” in the whole repo, remove or merge the login smoke (e.g. into a single “app load + workout CRUD” flow or keep only workout as the single smoke).
- [ ] Smoke depends on backend and test-migrations; CI must run backend and apply test-migrations before Cypress.

---

