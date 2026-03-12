# Cypress E2E Testing – 23 – Default Running Shoe and Default Walking Shoe

## 0. Inputs
- Requirement sheet: `.docs/tasks/23/1-requirement-23.md`
- Implementation plan: `.docs/tasks/23/2-plan-23.md`
- Frontend implementation log: `.docs/tasks/23/4-frontend-23.md`
- Cypress conventions: `.cursor/rules/cypress-testing.mdc`
- Frontend layout: `.docs/system/frontend.md`
- Project rules: `.docs/system/project-rules.md`

## 1. Scope Confirmation
- In scope (Cypress E2E only): ✅
- Out of scope (backend/prisma/openapi/ios): ✅
- Plan-following mode (no extras): ✅
- Smoke test rule respected (only one in repo): ✅ — Single smoke test lives in `workouts.cy.ts` (e2e → smoke: login + full workout CRUD). Shoes spec has no smoke tests; no duplicate "app is up" checks added.

## 2. Planned Test Cases (from Plan)
Map the plan's test strategy to concrete E2E tests:

| Planned item | Spec / describe / it title | Fixture(s) | Intercepts | Notes |
|--------------|----------------------------|------------|------------|--------|
| Update shoes fixtures/selectors for type-specific defaults | shoes.cy.ts → fixtures | shoes/loaded.json, loaded-with-default.json, shoe-1-no-default.json, shoe-1-with-default.json | GET /api/shoes, GET /api/shoes/1, PATCH /api/shoes/1 | Badges: Default Running, Default Walking |
| Overview shows default badges when one shoe is default for both | shoes.cy.ts → fixtures | shoes/loaded-with-default.json | GET **/api/shoes | AC-5b: one shoe with both badges |
| Edit set default for running → overview shows default running badge | shoes.cy.ts → fixtures | shoe-1-no-default, shoe-1-with-default, loaded-with-default | GET shoes/1, PATCH shoes/1, GET shoes | AC-5 |
| Edit clear both defaults → overview shows no default badge | shoes.cy.ts → fixtures | shoe-1-with-default, shoe-1-no-default, loaded | GET shoes/1, PATCH shoes/1, GET shoes | AC-6 (clear path) |
| Sync modal: two separate warnings (no default running / no default walking) | workouts.cy.ts → fixtures | shoes/loaded.json (no defaults) | GET workouts, GET strava/last-sync, GET shoes | AC-9 |
| Sync modal: no warnings when both defaults set | workouts.cy.ts → fixtures | shoes/loaded-with-default.json | GET workouts, GET strava/last-sync, GET shoes | AC-9 |
| Sync modal: warnings when user has no shoes | workouts.cy.ts → fixtures | shoes/empty.json | GET workouts, GET strava/last-sync, GET shoes | AC-9 |
| Existing error handling (unchanged) | shoes.cy.ts → Error Handling | shoes/error-500.json, error-400.json | GET/POST/PATCH with statusCode | No new error cases for ticket 23 |

## 3. Repo Golden Paths Used (References)
- Spec reference(s): `apps/frontend/cypress/e2e/shoes/shoes.cy.ts`, `apps/frontend/cypress/e2e/workouts/workouts.cy.ts`
- Page Object reference(s): `apps/frontend/cypress/e2e/shoes/po/ShoesOverviewPO.ts`, `apps/frontend/cypress/e2e/shoes/po/ShoeFormPO.ts`, `apps/frontend/cypress/e2e/workouts/po/WorkoutsOverviewPO.ts`
- Fixture reference(s): `apps/frontend/cypress/fixtures/shoes/loaded.json`, `loaded-with-default.json`, `shoe-1-no-default.json`, `shoe-1-with-default.json`, `empty.json`
- Patterns adopted: Fake JWT for fixture-driven tests; intercepts for GET/PATCH shoes and GET shoes in workouts; Page Objects extending MainPO with scoped root; describe('Component Test'), describe('e2e') with describe('fixtures'), describe('Error Handling'), describe('smoke').

## 4. Test Infrastructure
### 4.1 Specs created/modified
- `apps/frontend/cypress/e2e/shoes/shoes.cy.ts` (modified for ticket 23: default badges and edit defaults)
- `apps/frontend/cypress/e2e/workouts/workouts.cy.ts` (modified for ticket 23: sync modal two warnings)

### 4.2 Page Objects created/modified
- `apps/frontend/cypress/e2e/shoes/po/ShoesOverviewPO.ts` — extends MainPO; added defaultRunningBadges, defaultWalkingBadges, defaultBadges (replacing single default badge).
- `apps/frontend/cypress/e2e/shoes/po/ShoeFormPO.ts` — extends MainPO; added defaultRunningCheckbox, defaultWalkingCheckbox (replacing defaultCheckbox).
- `apps/frontend/cypress/e2e/workouts/po/WorkoutsOverviewPO.ts` — extends MainPO; added syncNoDefaultRunningShoeWarning, syncNoDefaultWalkingShoeWarning (replacing syncNoDefaultShoeWarning).

### 4.3 Fixtures created/modified
- `apps/frontend/cypress/fixtures/shoes/loaded.json` — `isDefault` replaced with `isDefaultForRunning: false`, `isDefaultForWalking: false`.
- `apps/frontend/cypress/fixtures/shoes/loaded-with-default.json` — one shoe with `isDefaultForRunning: true`, `isDefaultForWalking: true`.
- `apps/frontend/cypress/fixtures/shoes/shoe-1-no-default.json` — single shoe with both flags false.
- `apps/frontend/cypress/fixtures/shoes/shoe-1-with-default.json` — single shoe with both flags true.
- Existing: empty.json, error-400.json, error-500.json (unchanged for ticket 23).

### 4.4 Selectors / data-cy
- Existing selectors used: `shoes-overview`, `shoes-grid`, `add-shoe`, `shoe-default-running-badge`, `shoe-default-walking-badge`, `shoe-form-container`, `shoe-is-default-running`, `shoe-is-default-walking`, `shoe-submit`, `workouts-overview`, `sync-strava`, `sync-strava-modal`, `sync-no-default-running-shoe-warning`, `sync-no-default-walking-shoe-warning`.
- New `data-cy` added for ticket 23 (already present from frontend implementation): `shoe-default-running-badge`, `shoe-default-walking-badge` (shoes grid/list), `shoe-is-default-running`, `shoe-is-default-walking` (shoe form), `sync-no-default-running-shoe-warning`, `sync-no-default-walking-shoe-warning` (workouts sync modal). Files: shoes-grid-part.component.ts, shoes-overview.component.ts, shoe-form.component.ts, workouts-overview.component.ts.

## 5. Implemented Scenarios
For each scenario:
- **Overview shows default badges when list has one default shoe (running and walking):** Validates grid shows "Default Running" and "Default Walking" badges. Route: /shoes. Intercepts: GET **/api/shoes → shoes/loaded-with-default.json. Assertions: defaultRunningBadges and defaultWalkingBadges each have length 1 and contain label text.
- **Edit shoe set as default for running then overview shows default running badge:** Validates setting default for running on edit and redirect to overview shows badge. Route: /shoes/1/edit → /shoes. Intercepts: GET shoes/1 (shoe-1-no-default), PATCH shoes/1 (200, shoe-1-with-default), GET shoes (loaded-with-default). Assertions: checkbox visible and unchecked; after check and submit, URL includes /shoes; overview shows one Default Running badge.
- **Edit shoe clear defaults then overview shows no default badge:** Validates clearing both defaults. Route: /shoes/1/edit → /shoes. Intercepts: GET shoes/1 (shoe-1-with-default), PATCH shoes/1 (shoe-1-no-default), GET shoes (loaded). Assertions: both checkboxes checked; after uncheck both and submit, overview defaultBadges length 0.
- **Sync modal shows warnings when user has no default running or walking shoe:** Validates two separate warnings. Route: /workouts. Intercepts: GET workouts (loaded), GET strava/last-sync (null), GET shoes (loaded.json — no defaults). Open sync modal. Assertions: syncNoDefaultRunningShoeWarning and syncNoDefaultWalkingShoeWarning visible with expected text.
- **Sync modal shows no warning when user has default running and walking shoe:** Validates warnings hidden when both defaults set. Route: /workouts. Intercepts: GET shoes (loaded-with-default). Assertions: both warning elements do not exist.
- **Sync modal shows warnings when user has no shoes:** Validates both warnings when shoes list empty. Intercepts: GET shoes (empty.json). Assertions: both warnings visible.

## 6. Error Handling Coverage (only planned)
Ticket 23 did not add new error cases. Existing error tests retained:

| Error case | Intercept | Fixture | Expected UI behavior |
|------------|-----------|---------|----------------------|
| Shoes list 500 | GET **/api/shoes, statusCode 500 | shoes/error-500.json | overview errorAlert visible, "Failed to load shoes." |
| Shoe create 400 | POST **/api/shoes, statusCode 400 | shoes/error-400.json | formError visible, contains "photoUrl" |
| Get shoe 404 | GET **/api/shoes/999, statusCode 404 | — | formError "Shoe not found." |

## 7. Acceptance Criteria Traceability
| AC ID | E2E coverage (spec + test name) | Verification |
|-------|----------------------------------|---------------|
| AC-1 | shoes.cy.ts → fixtures: "edit shoe set as default for running then overview shows default running badge"; "overview shows default badges when list has one default shoe" | Set default running (and walking via fixture); grid shows Default Running and Default Walking badges. |
| AC-2 | Backend integration test | Not E2E. |
| AC-3 | Backend integration test | Not E2E. |
| AC-4 | Migration/backend | Not E2E. |
| AC-5 | shoes.cy.ts → fixtures: "edit shoe set as default for running then overview shows default running badge" | Setting one shoe as default for running shows badge; backend clears previous (verified via list response). |
| AC-5b | shoes.cy.ts → fixtures: "overview shows default badges when list has one default shoe (running and walking)" | One shoe with both defaults shows both Default Running and Default Walking badges. |
| AC-6 | shoes.cy.ts → fixtures: "edit shoe clear defaults" + fixture shoe-1-with-default | Edit with both checkboxes; overview shows both badges; clear both → no badges. |
| AC-7, AC-8 | Backend unit/integration | Not E2E. |
| AC-9 | workouts.cy.ts → fixtures: "sync modal shows warnings when user has no default running or walking shoe", "sync modal shows no warning when user has default running and walking shoe", "sync modal shows warnings when user has no shoes"; shoes.cy.ts badge assertions | Two separate warnings (no default running / no default walking); labels "Default Running", "Default Walking" in grid. |

## 8. How to Run
- Command(s): From `apps/frontend`: `npm run e2e` (interactive Cypress UI) or `npm run e2e:run` (headless run with Chrome).
- Optional — run single spec: `npx cypress run --browser chrome --spec "cypress/e2e/shoes/shoes.cy.ts"` or `--spec "cypress/e2e/workouts/workouts.cy.ts"` from apps/frontend.
- Note: Fixture-driven tests do not require a running backend. The single smoke test in `workouts.cy.ts` requires backend and DB with test-migrations. Ensure Cypress binary is installed (e.g. `npx cypress verify` or re-run `npm install` in apps/frontend) if `e2e:run` fails with "Cypress binary is missing".

## 9. Change Summary
- Files added/modified: Shoes spec and PO; workouts spec and PO; shoes fixtures (loaded, loaded-with-default, shoe-1-no-default, shoe-1-with-default). No new files; all changes are updates for type-specific default shoe feature.
- Notes: E2E implementation was completed in frontend step (4-frontend-23.md). This document captures the testing scope, traceability, and run instructions for ticket 23.

## 10. Open Points / Risks (UNRESOLVED)
- None.
