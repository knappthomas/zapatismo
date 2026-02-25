# Frontend Implementation Log – 7 – Workout Management (Workout Tracking)

## 0. Inputs
- Requirement sheet: `.docs/tasks/7/1-requirement-7.md`
- Implementation plan: `.docs/tasks/7/2-plan-7.md`
- Frontend conventions: `.docs/system/frontend.md`
- Architecture: `.docs/system/setup-architecture.md`
- Project rules: `.docs/system/project-rules.md`

## 1. Scope Confirmation
- In scope (frontend only): ✅
- Out of scope (backend/prisma/openapi/ios): ✅
- Plan-following mode (no extras): ✅

## 2. Repo Golden Paths Used (References)
Concrete reference files you followed:
- Feature structure reference: `apps/frontend/src/app/features/shoes/` (shoes-overview.component.ts, shoe-form.component.ts)
- Routing reference: `apps/frontend/src/app/app.routes.ts` (shoes routes with userGuard)
- Service/API reference: `apps/frontend/src/app/core/services/shoes.service.ts`
- Error handling reference: `apps/frontend/src/app/features/shoes/shoe-form.component.ts` (formError signal, errorMessage from HttpErrorResponse)
- Auth/guards reference: `apps/frontend/src/app/core/auth/auth.guard.ts` (userGuard for USER-only)
- UI styling reference (daisyUI/Tailwind usage): shoes-overview (table, card, btn, alert, modal), shoe-form (form-control, input, label, btn)

## 3. Work Executed (Traceable to Plan)

### WP-5: Frontend workouts feature (routes, menu, list, form, delete)
- Plan reference: §6 Frontend Plan – Workouts menu (USER only), routes /workouts, /workouts/new, /workouts/:id/edit; list overview; add/edit form with shoe selector; delete with confirmation.
- What changed:
  - Added `core/models/workout.model.ts` (Workout, WorkoutType, CreateWorkoutPayload, UpdateWorkoutPayload, WorkoutShoeSummary).
  - Added `core/services/workouts.service.ts` (getList, getOne, create, update, delete).
  - Added `features/workouts/workouts-overview.component.ts` (list table, Add Workout link, Edit/Delete per row, delete confirmation modal).
  - Added `features/workouts/workout-form.component.ts` (create/edit form: type, start/end datetime, steps, distance, location, shoe selector from ShoesService.getList(); end ≥ start validator; backend error display).
  - Updated `app.routes.ts`: added workouts, workouts/new, workouts/:id/edit with userGuard.
  - Updated `layout/navbar.component.ts`: added "Workouts" link inside `@if (auth.hasRole('USER'))`.
- Files: See §10.
- Notes: List view only (no grid). Shoe selector uses optional shoeId (None + user’s shoes).

### WP-9: Smoke E2E test (Cypress)
- Plan reference: §8 Testing Plan – smoke E2E: create → verify in overview → edit all data → delete workout.
- What changed:
  - Added `cypress/e2e/workouts/workouts.cy.ts` (Component Test, fixtures, smoke).
  - Added `cypress/e2e/workouts/po/WorkoutsOverviewPO.ts`, `WorkoutFormPO.ts`.
  - Added `cypress/fixtures/workouts/empty.json`, `loaded.json`, `error-500.json`, `error-400.json`.
- Files: See §10.
- Notes: Smoke test logs in as thomas@zapatismo.local / thomas (test-migrations), then runs full CRUD.

## 4. Routing / Navigation
- Routes added: `workouts` (overview), `workouts/new` (form), `workouts/:id/edit` (form). All under main layout with authGuard and userGuard.
- Guards applied: authGuard on parent; userGuard on workouts, workouts/new, workouts/:id/edit (same as shoes).
- Navbar changes: New item "Workouts" (routerLink="/workouts") visible only when `auth.hasRole('USER')`, next to Shoes.

## 5. UI Components
| Component | Path | Responsibility | Notes |
|-----------|------|----------------|-------|
| WorkoutsOverviewComponent | features/workouts/workouts-overview.component.ts | List workouts in table; Add Workout link; Edit/Delete per row; delete confirmation modal | List view only; loading/error/empty states |
| WorkoutFormComponent | features/workouts/workout-form.component.ts | Create/edit workout: type, start/end, steps, distance, location, shoe selector; submit/cancel | Reused for new and edit; loads shoes for selector |

## 6. API Integration

### 6.1 Services
| Service | Path | Endpoints used |
|---------|------|----------------|
| WorkoutsService | core/services/workouts.service.ts | GET /api/workouts, POST /api/workouts, GET /api/workouts/:id, PATCH /api/workouts/:id, DELETE /api/workouts/:id |
| ShoesService | (existing) | GET /api/shoes (used by WorkoutFormComponent for shoe selector) |

### 6.2 Models
| Model | Path | Notes |
|-------|------|-------|
| Workout, WorkoutType, WorkoutShoeSummary, CreateWorkoutPayload, UpdateWorkoutPayload | core/models/workout.model.ts | Aligned with backend WorkoutResponseDto, CreateWorkoutDto, UpdateWorkoutDto |

## 7. Validations & Error Handling
- Frontend validations implemented: Required type, startTime, endTime, steps (0–100000), distanceKm (0–100000), location (max 50); group validator end ≥ start. Shoe selector optional (null = none).
- Backend error display approach: Same as shoe-form: formError signal; errorMessage(err) maps 404/403 and body.message (array or string) to user-facing text.
- Notes: Backend remains authoritative; frontend shows validation messages and API error body.

## 8. Tests (if applicable)
- Tests added/updated: Cypress E2E `cypress/e2e/workouts/workouts.cy.ts` with Component Test (maxlength, min/max), fixtures (empty, loaded, 500, 400), and smoke (full CRUD with real backend and thomas@zapatismo.local).
- How to run: From `apps/frontend`: `npm run e2e` (UI) or `npm run e2e:run` (headless). Smoke requires backend and DB with test-migrations applied.
- Coverage summary: Component tests cover field constraints; fixture tests cover empty/loaded/error states and 400 on create; smoke covers create → overview → edit all → delete.

## 9. Acceptance Criteria Traceability
| AC ID | UI touchpoints (components/routes) | Verification / Test |
|-------|-----------------------------------|---------------------|
| AC-1 | Navbar "Workouts" (USER), route /workouts, userGuard | Smoke: login as USER, click Workouts → overview |
| AC-2 | POST /workouts, form with all fields + optional shoe, success flow | Smoke step 1 (create); fixture test for form |
| AC-3 | PATCH /workouts/:id, edit form, shoe selector | Smoke step 3 (edit all data) |
| AC-4 | DELETE /workouts/:id, confirmation modal, then delete | Smoke step 4 (confirm delete) |
| AC-5 | Cancel delete confirmation → no delete | Manual or optional E2E; cancel button in overview modal |
| AC-6 | Validation error feedback | Fixture test 400; form shows formError |
| AC-7 | Shoe selector in form; create/update with shoeId or null | Smoke; form has shoe select (None + list) |

## 10. Change Summary
- Files added: `apps/frontend/src/app/core/models/workout.model.ts`, `apps/frontend/src/app/core/services/workouts.service.ts`, `apps/frontend/src/app/features/workouts/workouts-overview.component.ts`, `apps/frontend/src/app/features/workouts/workout-form.component.ts`, `apps/frontend/cypress/e2e/workouts/workouts.cy.ts`, `apps/frontend/cypress/e2e/workouts/po/WorkoutsOverviewPO.ts`, `apps/frontend/cypress/e2e/workouts/po/WorkoutFormPO.ts`, `apps/frontend/cypress/fixtures/workouts/empty.json`, `apps/frontend/cypress/fixtures/workouts/loaded.json`, `apps/frontend/cypress/fixtures/workouts/error-500.json`, `apps/frontend/cypress/fixtures/workouts/error-400.json`.
- Files modified: `apps/frontend/src/app/app.routes.ts`, `apps/frontend/src/app/layout/navbar.component.ts`.
- Routes added: /workouts, /workouts/new, /workouts/:id/edit (all userGuard).
- API endpoints integrated: GET/POST /api/workouts, GET/PATCH/DELETE /api/workouts/:id; GET /api/shoes (form shoe selector).
- Notes: No backend, Prisma, or OpenAPI files modified.

## 11. Open Points / Risks
- [ ] Smoke E2E depends on backend and test-migrations (thomas user + data). CI must run backend and apply test-migrations before Cypress smoke.
- [ ] None otherwise.
