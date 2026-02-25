# Cypress E2E Testing – 10-1 – Default Shoe for Strava Sync

## 0. Inputs
- Requirement sheet: `.docs/tasks/10-1/1-requirement-10-1.md`
- Implementation plan: `.docs/tasks/10-1/2-plan-10-1.md`
- Frontend implementation log: `.docs/tasks/10-1/4-frontend-10-1.md`
- Cypress conventions: `.cursor/rules/cypress-testing.mdc`
- Frontend layout: `.docs/system/frontend.md`
- Project rules: `.docs/system/project-rules.md`

## 1. Scope Confirmation
- In scope (Cypress E2E only): ✅
- Out of scope (backend/prisma/openapi/ios): ✅
- Plan-following mode (no extras): ✅
- Smoke test rule respected (only one in repo): ✅ (smoke lives in login; no new smoke in shoes)

## 2. Planned Test Cases (from Plan)
Map the plan's test strategy to concrete E2E tests:

| Planned item | Spec / describe / it title | Fixture(s) | Intercepts | Notes |
|--------------|----------------------------|------------|------------|--------|
| Edit shoe, set as default, save; overview shows default indicator (AC-1) | e2e → fixtures: "edit shoe set as default then overview shows default badge" | shoe-1-no-default.json, shoe-1-with-default.json, loaded-with-default.json | GET shoes/1, PATCH shoes/1, GET shoes | Stub all; no real server |
| Clear default; overview shows no default (AC-2) | e2e → fixtures: "edit shoe clear default then overview shows no default badge" | shoe-1-with-default.json, shoe-1-no-default.json, loaded.json | GET shoes/1, PATCH shoes/1, GET shoes | Stub all |
| Overview shows default indicator when list has default | e2e → fixtures: "overview shows default badge when list has one default shoe" | loaded-with-default.json | GET shoes | Component state |

## 3. Repo Golden Paths Used (References)
- Spec reference(s): `apps/frontend/cypress/e2e/shoes/shoes.cy.ts`, `apps/frontend/cypress/e2e/login/login.cy.ts`
- Page Object reference(s): `apps/frontend/cypress/e2e/shoes/po/ShoesOverviewPO.ts`, `apps/frontend/cypress/e2e/shoes/po/ShoeFormPO.ts`
- Fixture reference(s): `apps/frontend/cypress/fixtures/shoes/loaded.json`, `apps/frontend/cypress/fixtures/shoes/empty.json`
- Patterns adopted: intercept + fixture for list and single shoe; fake JWT for auth; PO root scoped to data-cy; no smoke in shoes.

## 4. Test Infrastructure
### 4.1 Specs created/modified
- `apps/frontend/cypress/e2e/shoes/shoes.cy.ts` (extended)

### 4.2 Page Objects created/modified
- `apps/frontend/cypress/e2e/shoes/po/ShoesOverviewPO.ts` (add defaultBadges getter)
- `apps/frontend/cypress/e2e/shoes/po/ShoeFormPO.ts` (add defaultCheckbox getter)

### 4.3 Fixtures created/modified
- `apps/frontend/cypress/fixtures/shoes/loaded.json` (add isDefault: false)
- `apps/frontend/cypress/fixtures/shoes/loaded-with-default.json` (new)
- `apps/frontend/cypress/fixtures/shoes/shoe-1-no-default.json` (new)
- `apps/frontend/cypress/fixtures/shoes/shoe-1-with-default.json` (new)

### 4.4 Selectors / data-cy
- Existing selectors used: `shoe-default-badge`, `shoe-is-default` (form checkbox, already in frontend)
- Any new `data-cy` added to Angular templates: none (all present from 4-frontend-10-1)

## 5. Implemented Scenarios
- **overview shows default badge when list has one default shoe:** Intercept GET /api/shoes with `loaded-with-default.json`, visit /shoes, assert `overviewPO.defaultBadges` has length 1 and contains "Default".
- **edit shoe set as default then overview shows default badge:** Intercept GET /api/shoes/1 → `shoe-1-no-default.json`, PATCH /api/shoes/1 → 200 + `shoe-1-with-default.json`, GET /api/shoes → `loaded-with-default.json`. Visit /shoes/1/edit, assert checkbox unchecked, check it, submit; assert URL /shoes and one default badge visible (AC-1).
- **edit shoe clear default then overview shows no default badge:** Intercept GET /api/shoes/1 → `shoe-1-with-default.json`, PATCH /api/shoes/1 → 200 + `shoe-1-no-default.json`, GET /api/shoes → `loaded.json`. Visit /shoes/1/edit, assert checkbox checked, uncheck, submit; assert URL /shoes and zero default badges (AC-2).

## 6. Error Handling Coverage (only planned)
No new error cases for default-shoe in this ticket; existing shoes error handling unchanged.

## 7. Acceptance Criteria Traceability
| AC ID | E2E coverage (spec + test name) | Verification |
|-------|----------------------------------|--------------|
| AC-1 | shoes.cy.ts → fixtures: "edit shoe set as default then overview shows default badge" | Set default on edit, save, overview shows badge |
| AC-2 | shoes.cy.ts → fixtures: "edit shoe clear default then overview shows no default badge" | Clear default on edit, save, overview has no badge |
| AC-3–AC-8 | Backend / integration | Not E2E |

## 8. How to Run
- Command(s): `npm run e2e:run` or `npm run e2e:headless` from `apps/frontend` (or `npm run e2e:run --workspace=frontend` from root)
- Optional: run single spec: `npx cypress run --browser chrome --spec "cypress/e2e/shoes/shoes.cy.ts"`

## 9. Change Summary
- **Spec:** `apps/frontend/cypress/e2e/shoes/shoes.cy.ts` – added three tests under e2e → fixtures: overview default badge, edit set default, edit clear default.
- **POs:** `ShoesOverviewPO` – added `defaultBadges`; `ShoeFormPO` – added `defaultCheckbox`.
- **Fixtures:** `loaded.json` – added `isDefault: false`; new: `loaded-with-default.json`, `shoe-1-no-default.json`, `shoe-1-with-default.json`.
- **No new data-cy:** All selectors (`shoe-default-badge`, `shoe-is-default`) already present from frontend implementation.
- **Smoke:** No smoke test added; single repo smoke remains in login.

## 10. Open Points / Risks (UNRESOLVED)
- None.
