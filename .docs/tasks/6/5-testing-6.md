# Cypress E2E Testing – 6 – Shoe Management in Backoffice (Normal User)

## 0. Inputs
- Requirement sheet: `.docs/tasks/6/1-requirement-6.md`
- Implementation plan: `.docs/tasks/6/2-plan-6.md`
- Frontend implementation log: `.docs/tasks/6/4-frontend-6.md`
- Cypress conventions: `.cursor/rules/cypress-testing.mdc`
- Frontend layout: `.docs/system/frontend.md`
- Project rules: `.docs/system/project-rules.md`

## 1. Scope Confirmation
- In scope (Cypress E2E only): ✅
- Out of scope (backend/prisma/openapi/ios): ✅
- Plan-following mode (no extras): ✅
- Smoke test rule respected (only one in repo): ✅ (smoke lives in login spec; shoes e2e/smoke block empty)

## 2. Planned Test Cases (from Plan)
Map the plan's test strategy to concrete E2E tests:

| Planned item | Spec / describe / it title | Fixture(s) | Intercepts | Notes |
|--------------|----------------------------|------------|------------|-------|
| Component Test: max length 75 name/brand, max 100000 km | Component Test / shoe name maxlength 75, brand maxlength 75, km target min/max | — | — | Visit /shoes/new with fake token |
| Fixture-driven empty list | e2e/fixtures / overview shows empty state when list is empty | shoes/empty.json | GET /api/shoes | — |
| Fixture-driven loaded list | e2e/fixtures / overview shows shoes when list returns data | shoes/loaded.json | GET /api/shoes | — |
| Error: list fails (5xx) | e2e/Error Handling / overview shows error when list returns 500 | shoes/error-500.json | GET /api/shoes 500 | — |
| Error: validation (400) on create | e2e/Error Handling / form shows validation error on create 400 | shoes/error-400.json | POST /api/shoes 400 | — |
| Error: get one 404 (edit) | e2e/Error Handling / form shows error when get shoe returns 404 | — | GET /api/shoes/:id 404 | — |

## 3. Repo Golden Paths Used (References)
- Spec reference(s): `apps/frontend/cypress/e2e/login/login.cy.ts` (intercepts, fixtures, describe structure)
- Page Object reference(s): `apps/frontend/cypress/e2e/login/po/LoginPO.ts` (extends MainPO, scoped root)
- Fixture reference(s): `apps/frontend/cypress/fixtures/login/` (success.json, error-401.json, error-500.json)
- Patterns adopted: Fake JWT for authenticated visit; intercept with fixture; alias/wait for stability; Error Handling with statusCode + fixture

## 4. Test Infrastructure
### 4.1 Specs created/modified
- `apps/frontend/cypress/e2e/shoes/shoes.cy.ts`

### 4.2 Page Objects created/modified
- `apps/frontend/cypress/e2e/shoes/po/ShoeFormPO.ts` (extends MainPO, scoped root `[data-cy="shoe-form"]`)
- `apps/frontend/cypress/e2e/shoes/po/ShoesOverviewPO.ts` (extends MainPO, scoped root `[data-cy="shoes-overview"]`)

### 4.3 Fixtures created/modified
- `apps/frontend/cypress/fixtures/shoes/empty.json`
- `apps/frontend/cypress/fixtures/shoes/loaded.json`
- `apps/frontend/cypress/fixtures/shoes/error-500.json`
- `apps/frontend/cypress/fixtures/shoes/error-400.json`

### 4.4 Selectors / data-cy
- Existing selectors used: add-shoe, shoe-photo-url, shoe-brand, shoe-name, shoe-buying-date, shoe-buying-location, shoe-kilometer-target, shoe-submit, shoe-form-error, delete-cancel, delete-confirm
- New `data-cy` added to Angular templates: `data-cy="shoes-overview"` on overview root div (`shoes-overview.component.ts`); `data-cy="shoe-form-container"` on form wrapper div (`shoe-form.component.ts`) for PO scoped root

## 5. Implemented Scenarios
| Scenario | Validates | Route | Intercepts | Fixture(s) | Assertions |
|----------|-----------|-------|------------|------------|------------|
| Component Test (3 its) | Form input constraints (maxlength 75, max/min km) | /shoes/new | — | — | maxlength, max, min on inputs |
| Overview empty | Empty list shows empty state and Add Shoe | /shoes | GET **/api/shoes | shoes/empty.json | "No shoes yet", add-shoe visible |
| Overview loaded | List with data shows shoe names and brand | /shoes | GET **/api/shoes | shoes/loaded.json | "Pegasus 40", "Nike" visible |
| List 500 | Overview shows error when list fails | /shoes | GET **/api/shoes 500 | shoes/error-500.json | alert contains "Failed to load shoes." |
| Create 400 | Form shows backend validation error | /shoes/new | POST **/api/shoes 400 | shoes/error-400.json | formError contains "photoUrl" |
| Get 404 | Edit form shows not found when get fails | /shoes/999/edit | GET **/api/shoes/999 404 | — | formError contains "Shoe not found." |

## 6. Error Handling Coverage (only planned)
| Error case | Intercept | Fixture | Expected UI behavior |
|------------|-----------|---------|----------------------|
| List returns 500 | GET **/api/shoes, statusCode 500 | shoes/error-500.json | Overview shows "Failed to load shoes." |
| Create returns 400 (validation) | POST **/api/shoes, statusCode 400 | shoes/error-400.json | Form shows error message |
| Get one returns 404 (edit) | GET **/api/shoes/:id, statusCode 404 | — | Form shows "Shoe not found." |

## 7. Acceptance Criteria Traceability
| AC ID | E2E coverage (spec + test name) | Verification |
|-------|---------------------------------|---------------|
| AC-1 | e2e/fixtures / overview empty + overview loaded | Login (fake), visit /shoes, see overview |
| AC-2 | e2e/fixtures / overview loaded | Grid/list show photo and info |
| AC-11 | Component Test / maxlength 75, max 100000 | Input attributes asserted |
| AC-12 | Component Test describe block | Max length and max value checks |
| AC-7 | Error Handling / create 400, get 404 | Validation/error feedback |

## 8. How to Run
- Command(s): From `apps/frontend`: `npm run e2e` (Cypress UI) or `npm run e2e:run` (headless)
- Optional: run single spec: `npx cypress run --spec "cypress/e2e/shoes/shoes.cy.ts"`

## 9. Change Summary
- Files added: `cypress/fixtures/shoes/empty.json`, `loaded.json`, `error-500.json`, `error-400.json`; `cypress/e2e/shoes/po/ShoesOverviewPO.ts`.
- Files modified: `cypress/e2e/shoes/shoes.cy.ts` (fixtures, Error Handling, ShoesOverviewPO); `cypress/e2e/shoes/po/ShoeFormPO.ts` (scoped root `shoe-form-container`); `shoes-overview.component.ts` (data-cy="shoes-overview"); `shoe-form.component.ts` (data-cy="shoe-form-container").
- Notes: E2E only; no Cypress component (mount) tests; one smoke in login only. Run tests with frontend served (baseUrl); `npm run e2e:run` from apps/frontend (Cypress binary must be installed).

## 10. Open Points / Risks (UNRESOLVED)
- [ ] None.
