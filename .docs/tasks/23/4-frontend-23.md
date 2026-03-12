# Frontend Implementation Log – 23 – Default Running Shoe and Default Walking Shoe

## 0. Inputs
- Requirement sheet: `.docs/tasks/23/1-requirement-23.md`
- Implementation plan: `.docs/tasks/23/2-plan-23.md`
- Frontend conventions: `.docs/system/frontend.md`
- Architecture: `.docs/system/setup-architecture.md`
- Project rules: `.docs/system/project-rules.md`

## 1. Scope Confirmation
- In scope (frontend only): ✅
- Out of scope (backend/prisma/openapi/ios): ✅
- Plan-following mode (no extras): ✅

## 2. Repo Golden Paths Used (References)
Concrete reference files you followed:
- Feature structure reference: `apps/frontend/src/app/features/shoes/` (ShoeFormComponent, ShoesOverviewComponent, ShoesGridPartComponent), `apps/frontend/src/app/features/workouts/workouts-overview.component.ts`
- Routing reference: `app.routes.ts` (shoes and workouts routes unchanged)
- Service/API reference: `core/services/shoes.service.ts` (getList, getOne, update); `core/models/shoe.model.ts`
- Error handling reference: `shoe-form.component.ts` (formError signal, errorMessage from HttpErrorResponse); `workouts-overview.component.ts` (sync error display)
- Auth/guards reference: `app.routes.ts` (userGuard on shoes/workouts); no change
- UI styling reference (daisyUI/Tailwind usage): existing shoe form (checkbox, label, form-control), grid (badge badge-primary), list (table, badge), sync modal (alert alert-warning)

## 3. Work Executed (Traceable to Plan)

### WP-5: Frontend shoe model and API usage
- Plan reference: §2 WBS WP-5; §6.2 Data flow.
- What changed: `Shoe` interface: replaced `isDefault` with `isDefaultForRunning` and `isDefaultForWalking`. `UpdateShoePayload`: replaced `isDefault?` with `isDefaultForRunning?` and `isDefaultForWalking?`.
- Files: `apps/frontend/src/app/core/models/shoe.model.ts`
- Notes: ShoesService unchanged (uses types only).

### WP-6: Frontend shoe edit page
- Plan reference: §2 WBS WP-6; §6.1 Components.
- What changed: Two checkboxes "Default for running" and "Default for walking" with labels/hints; form controls `isDefaultForRunning`, `isDefaultForWalking`; submit payload includes both flags; patchValue and getRawValue use new fields.
- Files: `apps/frontend/src/app/features/shoes/shoe-form.component.ts`
- Notes: Edit-only section; create flow unchanged.

### WP-7: Frontend shoes overview (grid and list)
- Plan reference: §2 WBS WP-7; FR-7.
- What changed: Grid: two badge types "Default Running" (badge-primary, data-cy="shoe-default-running-badge") and "Default Walking" (badge-secondary, data-cy="shoe-default-walking-badge"). List table: "Defaults" column with both badges or "—".
- Files: `apps/frontend/src/app/features/shoes/shoes-grid-part.component.ts`, `apps/frontend/src/app/features/shoes/shoes-overview.component.ts`
- Notes: A shoe can show one or both badges.

### WP-8: Frontend sync modal warnings
- Plan reference: §2 WBS WP-8; FR-13, AC-9.
- What changed: Replaced single `syncModalHasDefaultShoe` with `syncModalHasDefaultRunningShoe` and `syncModalHasDefaultWalkingShoe` derived from shoes list. Two conditional warning blocks: "No default running shoe set; synced running workouts will not be assigned to a shoe." and "No default walking shoe set; synced walking workouts will not be assigned to a shoe." Each shown only when that default is missing. data-cy: sync-no-default-running-shoe-warning, sync-no-default-walking-shoe-warning.
- Files: `apps/frontend/src/app/features/workouts/workouts-overview.component.ts`
- Notes: Same shoes GET used when opening sync modal.

### E2E fixtures and selectors (plan §8)
- What changed: Cypress fixtures (shoes): replaced `isDefault` with `isDefaultForRunning` and `isDefaultForWalking` in loaded.json, loaded-with-default.json, shoe-1-with-default.json, shoe-1-no-default.json. ShoesOverviewPO: defaultRunningBadges, defaultWalkingBadges, defaultBadges (combined). ShoeFormPO: defaultRunningCheckbox, defaultWalkingCheckbox (removed defaultCheckbox). WorkoutsOverviewPO: syncNoDefaultRunningShoeWarning, syncNoDefaultWalkingShoeWarning (replaced syncNoDefaultShoeWarning). shoes.cy.ts and workouts.cy.ts: updated tests and assertions to use new fields and messages.
- Files: `cypress/fixtures/shoes/*.json`, `cypress/e2e/shoes/po/ShoesOverviewPO.ts`, `cypress/e2e/shoes/po/ShoeFormPO.ts`, `cypress/e2e/workouts/po/WorkoutsOverviewPO.ts`, `cypress/e2e/shoes/shoes.cy.ts`, `cypress/e2e/workouts/workouts.cy.ts`
- Notes: loaded-with-default has one shoe with both defaults true so sync modal shows no warnings when used in workouts tests.

## 4. Routing / Navigation
- Routes added/changed: None.
- Guards applied: Unchanged (userGuard on /shoes, /shoes/new, /shoes/:id/edit, /workouts).
- Navbar changes: None.

## 5. UI Components
| Component | Path | Responsibility | Notes |
|-----------|------|----------------|-------|
| ShoeFormComponent | features/shoes/shoe-form.component.ts | Create/edit shoe; two default checkboxes (running, walking) in edit mode | Submit sends isDefaultForRunning, isDefaultForWalking |
| ShoesGridPartComponent | features/shoes/shoes-grid-part.component.ts | Grid of shoe cards; shows Default Running and Default Walking badges | One or both badges per shoe |
| ShoesOverviewComponent | features/shoes/shoes-overview.component.ts | Shoes list + grid toggle; list table with Defaults column (two badge types) | Delete modal unchanged |
| WorkoutsOverviewComponent | features/workouts/workouts-overview.component.ts | Sync modal: two separate warnings when no default running / no default walking shoe | Warnings use FR-13 text |

## 6. API Integration

### 6.1 Services
| Service | Path | Endpoints used |
|---------|------|-----------------|
| ShoesService | core/services/shoes.service.ts | GET /api/shoes (list), GET /api/shoes/:id (get one), PATCH /api/shoes/:id (update with isDefaultForRunning, isDefaultForWalking) |

No new endpoints. Workouts overview uses ShoesService.getList() when opening sync modal (unchanged).

### 6.2 Models
| Model | Path | Notes |
|-------|------|-------|
| Shoe | core/models/shoe.model.ts | isDefaultForRunning, isDefaultForWalking (replaced isDefault) |
| UpdateShoePayload | core/models/shoe.model.ts | isDefaultForRunning?, isDefaultForWalking? (replaced isDefault?) |

## 7. Validations & Error Handling
- Frontend validations implemented: None new. Default flags are booleans from checkboxes; at most one per type enforced by backend.
- Backend error display approach: Reused existing pattern in ShoeFormComponent (formError signal, errorMessage from HttpErrorResponse for 404/403/body.message). Sync and assign-shoe modals unchanged.
- Notes: No change to validation or error UX beyond plan.

## 8. Tests (if applicable)
- Tests added/updated: Cypress E2E only. Fixtures and page objects updated for new shoe fields and sync modal warnings. shoes.cy.ts: overview default badges (running + walking), edit set default running, edit clear both defaults. workouts.cy.ts: sync modal shows both warnings when no defaults, no warnings when both defaults set, both warnings when no shoes.
- How to run: From apps/frontend: `npm run e2e` (UI) or `npm run e2e:run` (headless). Backend and frontend must be running for smoke; fixtures tests use intercepts.
- Coverage summary: E2E fixtures cover grid/list badges (AC-1, AC-5b), edit set/clear defaults (AC-5, AC-6), sync modal messages (AC-9).

## 9. Acceptance Criteria Traceability
| AC ID | UI touchpoints (components/routes) | Verification / Test |
|-------|-----------------------------------|---------------------|
| AC-1 | Shoe edit (both flags), shoes overview grid | E2E: set A default running, B default walking → grid shows correct badges (fixtures + edit test cover one shoe with both). |
| AC-2 | (Backend) | Integration test (backend). |
| AC-3 | (Backend) | Integration test (backend). |
| AC-4 | (Migration) | Backend/migration. |
| AC-5 | Shoe edit page | E2E: edit set default running then overview shows default running badge; backend clears previous default. |
| AC-5b | Shoes overview grid/list | E2E: loaded-with-default shows Default Running and Default Walking badges. |
| AC-6 | Shoe edit page | E2E: edit with both checkboxes (fixture shoe-1-with-default has both); overview shows both badges. |
| AC-7, AC-8 | (Backend) | Backend unit/integration tests. |
| AC-9 | Sync modal, shoes grid/list labels | E2E: sync modal two warnings (no default running / no default walking); grid badges "Default Running", "Default Walking". |

## 10. Change Summary
- Files added/modified:
  - apps/frontend/src/app/core/models/shoe.model.ts
  - apps/frontend/src/app/features/shoes/shoe-form.component.ts
  - apps/frontend/src/app/features/shoes/shoes-grid-part.component.ts
  - apps/frontend/src/app/features/shoes/shoes-overview.component.ts
  - apps/frontend/src/app/features/workouts/workouts-overview.component.ts
  - cypress/fixtures/shoes/loaded.json
  - cypress/fixtures/shoes/loaded-with-default.json
  - cypress/fixtures/shoes/shoe-1-with-default.json
  - cypress/fixtures/shoes/shoe-1-no-default.json
  - cypress/e2e/shoes/po/ShoeFormPO.ts
  - cypress/e2e/shoes/po/ShoesOverviewPO.ts
  - cypress/e2e/shoes/shoes.cy.ts
  - cypress/e2e/workouts/po/WorkoutsOverviewPO.ts
  - cypress/e2e/workouts/workouts.cy.ts
- Routes added/changed: None.
- API endpoints integrated: GET /api/shoes, GET /api/shoes/:id, PATCH /api/shoes/:id (payload extended with isDefaultForRunning, isDefaultForWalking).
- Notes: No backend, Prisma, or OpenAPI files modified. Frontend build passes.

## 11. Open Points / Risks
- None. E2E fixtures assume backend returns isDefaultForRunning/isDefaultForWalking (already in backend DTOs).
