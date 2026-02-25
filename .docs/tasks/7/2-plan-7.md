# Implementation Plan – 7 – Workout Management (Workout Tracking)

## 0. Scope Check

- Requirement sheet present and reviewed: ✅
- Fits Zapatismo architecture constraints: ✅
- **In-Scope summary (bullets):**
  - Backend: Workout entity (Prisma), REST CRUD for workouts; USER-only access; validation and DTOs; OpenAPI in sync; optional shoe reference (user's shoes only); shoe delete rejected when shoe is linked to any workout (409).
  - Frontend: "Workouts" menu item (USER only), workouts list overview, Add Workout, edit/delete (delete with confirmation), shoe selector from user's shoes in create/edit forms.
  - Workout attributes: type (Running | Walking), start/end date-time, steps (0–100000), distance km (0–100000), location (required, max 50 chars), optional shoeId.
  - Backend unit and integration tests for workout logic and shoe-delete constraint; Prisma test data migration for workout fixtures (dev/stage only).
  - Smoke E2E test in Cypress: create workout → verify in overview → edit all data → delete workout (required).
- **Out-of-Scope summary (bullets):**
  - Strava sync or external workout import; admin workout management; Strava integration changes; automatic shoe distance aggregation; layout/auth redesign beyond new menu and routes.
- **Key assumptions (from requirements):**
  - Workout management is for role USER only; ADMIN does not see or access workout endpoints/UI.
  - Workouts are strictly per-user; shoe reference must be one of the user's shoes.
  - Manual entry only; no sync in this ticket.
- **UNRESOLVED items blocking implementation:** None.

---

## 1. Architecture Mapping (High-Level)

| Layer | Responsibility for this ticket | Notes |
|-------|--------------------------------|-------|
| Angular (apps/frontend) | Workouts menu item (USER only), workouts list, add/edit/delete flows, shoe selector in forms; consume workout REST API. | Mirror shoes feature: userGuard, routes, overview + form; list view only (no grid). |
| Backend (apps/backend, NestJS) | WorkoutsModule: CRUD API, validation, per-user ownership, optional shoe validation; ShoesService: reject delete when shoe has workouts (409). | Stateless; DTOs; @Roles(USER) + RolesGuard on workout controller. |
| Database (MySQL via Prisma) | New Workout model; relation User → Workout, optional Workout → Shoe; Shoe has many Workouts. | Prisma Migrate only. |
| OpenAPI contract | New workout endpoints and DTOs in Swagger; no persistence details. | Regenerate from NestJS/Swagger. |
| Docker/Compose | No changes. | — |
| Strava integration | Not in scope. | — |

---

## 2. Work Breakdown Structure (WBS)

- **WP-1: Prisma schema and migration (Workout model)**
  - Goal: Add Workout model with type, start/end, steps, distance, location, optional shoeId, userId; relation to User and optional Shoe.
  - Affected area(s): prisma
  - Depends on: —
  - Deliverables: schema.prisma updated; one migration; `npx prisma generate` run.

- **WP-2: Backend WorkoutsModule (CRUD, DTOs, validation)**
  - Goal: Implement workouts controller, service, create/update/list/get/delete with USER-only access and full validation (type enum, end ≥ start, steps/distance/location rules, shoe ownership).
  - Affected area(s): backend
  - Depends on: WP-1
  - Deliverables: workouts module, controller, service, DTOs; registered in AppModule; Swagger decorators.

- **WP-3: Shoe delete guard (reject when linked to workouts)**
  - Goal: In ShoesService.remove, check if any workout references the shoe; if yes, throw 409 Conflict with clear message.
  - Affected area(s): backend (shoes)
  - Depends on: WP-1
  - Deliverables: ShoesService.remove updated; controller documents 409 for "shoe in use".

- **WP-4: OpenAPI / Swagger**
  - Goal: Ensure workout endpoints and DTOs are documented; 409 on shoe delete documented.
  - Affected area(s): backend (OpenAPI generated from code)
  - Depends on: WP-2, WP-3
  - Deliverables: Spec at /api/docs reflects new endpoints and error responses.

- **WP-5: Frontend workouts feature (routes, menu, list, form, delete)**
  - Goal: Workouts menu (USER only), routes /workouts, /workouts/new, /workouts/:id/edit; list overview; add/edit form with shoe selector; delete with confirmation.
  - Affected area(s): frontend
  - Depends on: WP-2 (API contract)
  - Deliverables: WorkoutsService, workout model types, WorkoutsOverviewComponent, WorkoutFormComponent, navbar link, routes with userGuard.

- **WP-6: Prisma test data migration (workouts)**
  - Goal: Data-only migration in prisma/test-migrations/ that inserts workout test data (e.g. for thomas@zapatismo.local), optionally linked to existing shoe.
  - Affected area(s): prisma/test-migrations
  - Depends on: WP-1
  - Deliverables: One .ts (or .sql) file in test-migrations; idempotent; no schema changes.

- **WP-7: Backend unit tests (workouts + shoe delete)**
  - Goal: Unit tests for WorkoutsService (create, findAll, findOne, update, remove, validation/ownership); unit test for ShoesService.remove when shoe has workouts (409).
  - Affected area(s): backend
  - Depends on: WP-2, WP-3
  - Deliverables: workouts.service.spec.ts; shoes.service.spec.ts extended for 409 case.

- **WP-8: Backend integration tests (workouts + shoe delete)**
  - Goal: Integration tests that hit DB: workout CRUD flow; shoe delete rejected when workout references shoe.
  - Affected area(s): backend
  - Depends on: WP-2, WP-3, WP-6
  - Deliverables: workouts.integration-spec.ts; shoes.integration-spec.ts extended (or new test) for 409.

- **WP-9: Smoke E2E test (Cypress)**
  - Goal: Implement a single smoke E2E test in Cypress that covers the full workout CRUD flow: create workout → verify it appears in overview → edit all workout data → delete the workout (with confirmation).
  - Affected area(s): frontend (cypress)
  - Depends on: WP-5
  - Deliverables: Cypress smoke test (e.g. `apps/frontend/cypress/e2e/workouts/workouts.cy.ts`) with one test that: (1) creates a new workout, (2) asserts the workout exists in the overview, (3) edits all data of that workout, (4) deletes the created workout. Page objects and test data aligned with existing shoes E2E pattern.

---

## 3. Backend Plan (NestJS)

### 3.1 Modules / Components to touch

- **Module(s):** New `WorkoutsModule`; existing `ShoesModule` (ShoesService only).
- **Controller(s):** New `WorkoutsController` (GET/POST /workouts, GET/PATCH/DELETE /workouts/:id).
- **Service(s):** New `WorkoutsService`; modify `ShoesService` (remove: check workouts before delete).
- **Repository/Prisma access layer:** PrismaService only (no separate repository layer).

### 3.2 REST Endpoints

| HTTP | Path | Purpose | Request DTO | Response DTO | AuthN/AuthZ | Errors |
|------|------|---------|-------------|--------------|-------------|--------|
| GET | /api/workouts | List current user's workouts | — | WorkoutResponseDto[] | USER | 401, 403 |
| POST | /api/workouts | Create workout | CreateWorkoutDto | WorkoutResponseDto | USER | 400, 401, 403 |
| GET | /api/workouts/:id | Get one workout | — | WorkoutResponseDto | USER | 401, 403, 404 |
| PATCH | /api/workouts/:id | Update workout | UpdateWorkoutDto | WorkoutResponseDto | USER | 400, 401, 403, 404 |
| DELETE | /api/workouts/:id | Delete workout | — | void (204) | USER | 401, 403, 404 |

Response DTOs for list/get may include optional shoe reference (e.g. `shoeId` and/or minimal shoe info for display).

Shoe delete (existing endpoint):

| HTTP | Path | Change | Errors |
|------|------|--------|--------|
| DELETE | /api/shoes/:id | When shoe has ≥1 workout → 409 Conflict, clear message | 409 (new) |

Rules: Stateless REST only. No business logic in controllers beyond orchestration/validation. Explicit DTOs; do not expose Prisma entities.

### 3.3 Validation & Error Handling

- **Input validation approach:** class-validator on CreateWorkoutDto and UpdateWorkoutDto (type enum, IsDateString, IsInt/Min/Max for steps/distance, IsString/MaxLength(50) location, optional shoeId). Custom validation or service-level check: end ≥ start; shoeId must be user's shoe.
- **Domain validation approach:** In WorkoutsService: ensure workout belongs to user for get/update/delete; for create/update validate shoeId belongs to user (if provided); validate end >= start (or use class-validator custom decorator). In ShoesService: before delete, count workouts where shoeId = id; if > 0 throw ConflictException.
- **Error mapping:** 400 Bad Request (validation); 401 Unauthorized (no/invalid JWT); 403 Forbidden (wrong role or not owner); 404 Not Found (workout/shoe not found or not owner); 409 Conflict (shoe delete when linked to workouts). Payload shape: consistent with existing backend (e.g. message in body).
- **Logging/Auditing:** Log errors and access failures; do not log full request/response bodies (PII).

---

## 4. Data / Prisma Plan

### 4.1 Prisma schema changes

- **Models to add:** `Workout` with: id, userId, type (enum WorkoutType: RUNNING, WALKING), startTime, endTime, steps (Int), distanceKm (Float/Decimal), location (String, max 50), shoeId (optional Int, FK to Shoe), createdAt, updatedAt. Relation: User has many Workout; Workout belongs to User; Workout optional belongs to Shoe; Shoe has many Workout.
- **Models to modify:** `User`: add `workouts Workout[]`. `Shoe`: add `workouts Workout[]`.
- **Relations/indices:** Index on (userId) for workouts; index on (shoeId) for workouts; FK shoeId → shoes.id (onDelete: SetNull or Restrict so that deleting shoe is blocked by application logic; use Restrict to avoid accidental cascade).
- **Backfill / defaults:** None.

### 4.2 Migration steps

- **Migration name suggestion:** `add_workouts` or `add_workout_model`.
- **Steps:** Edit prisma/schema.prisma (Workout model, WorkoutType enum, User.workouts, Shoe.workouts); run `npx prisma migrate dev --name add_workouts`; run `npx prisma generate`; commit migration files.
- **Seed/test data impact:** Seed (prisma/seed.ts) unchanged. Test data: WP-6 adds data-only test migration.

---

## 5. OpenAPI / Contract Plan

- **Changes:** New tag "workouts"; new DTOs (CreateWorkoutDto, UpdateWorkoutDto, WorkoutResponseDto) with @ApiProperty; new endpoints under /workouts with responses and error responses (400, 401, 403, 404). Shoes: document 409 on DELETE /shoes/:id when shoe is in use.
- **Regeneration:** OpenAPI is generated from NestJS at runtime; ensure DTOs and controller are decorated; verify at /api/docs.
- **Client impact:** Frontend uses hand-typed models aligned to DTOs; no codegen in repo today. Add Workout types and WorkoutsService methods to match API.

---

## 6. Frontend Plan (Angular)

### 6.1 UX / Screens / Routes

- **Screens affected:** New: Workouts list (overview), Add Workout, Edit Workout (same form component for new/edit). Navbar: new link "Workouts" (USER only).
- **Routes affected:** Add children under main layout: `workouts` → overview, `workouts/new` → form, `workouts/:id/edit` → form; all with `userGuard`.
- **Components to add/modify:** New: `features/workouts/workouts-overview.component.ts`, `features/workouts/workout-form.component.ts`. Modify: `layout/navbar.component.ts` (add Workouts link with `auth.hasRole('USER')`), `app.routes.ts` (add workout routes with userGuard).

### 6.2 Data flow

- **Services:** New `core/services/workouts.service.ts`: getList(), getOne(id), create(payload), update(id, payload), delete(id). Reuse `ShoesService.getList()` in workout form for shoe selector.
- **State management:** Component-level signals for list, loading, error, delete confirmation (same pattern as shoes overview); no global store.
- **Error display:** Form error message; overview error alert; delete failure message; handle 400/403/404/409 from API (e.g. show "Shoe is in use and cannot be deleted" for 409 on shoe delete if that UI is ever triggered from a context that shows it).

### 6.3 Frontend validations

| Validation | Location (Frontend/Backend) | Rationale |
|------------|----------------------------|-----------|
| Required fields, type enum, steps/distance/location range, end ≥ start | Both (UX + single source of truth) | Frontend for immediate feedback; backend is authoritative. |
| Shoe belongs to user | Backend | Backend enforces; frontend only shows user's shoes in selector. |
| Workout ownership (get/update/delete) | Backend | Backend only. |

---

## 7. Strava / Workout Sync (ONLY if required)

Not required. No Strava integration changes in this ticket.

---

## 8. Testing Plan

- **Backend – Unit tests:**
  - **WorkoutsService:** create (success, optional shoeId, shoeId not user's → reject), findAll (user's only, empty list), findOne (found, not found, wrong user), update (success, not found, wrong user, validation), remove (success, not found, wrong user). Use mocked PrismaService; no real DB. File: `apps/backend/src/workouts/workouts.service.spec.ts`.
  - **ShoesService:** Extend existing `shoes.service.spec.ts`: add test that when `workout.count` > 0 for the shoe, `remove` throws ConflictException (or equivalent) and does not call `prisma.shoe.delete`.
  - If no other unit tests needed for workouts (e.g. controller thin): state "Controller not unit-tested; coverage via integration tests."

- **Backend – Integration tests:**
  - **Workouts:** At least one integration test: list workouts for user (from test-migrations), create workout (with and without shoeId), get one, update, delete; verify persistence. Precondition: MySQL running, DATABASE_URL, test-migrations applied (user + shoes + workouts). File: `apps/backend/test/workouts.integration-spec.ts`.
  - **Shoe delete when linked:** Integration test: create workout linked to a shoe, then call shoe delete → expect 409 and shoe still in DB. Can live in `workouts.integration-spec.ts` or extend `shoes.integration-spec.ts`.

- **Frontend – Unit:** Optional; plan does not mandate new unit tests for workout components if not already standard in repo. State: "Frontend unit tests for workout components: optional (e.g. WorkoutsService with mocked HttpClient)."

- **Frontend – E2E (Cypress) – required smoke test:** A **smoke E2E test** must be implemented in Cypress that runs the full workout CRUD flow in one test. Steps:
  1. **Create a new workout** (navigate to Add Workout, fill type, start/end date-time, steps, distance, location, optional shoe; submit).
  2. **Check that the workout exists in the overview** (return to workouts list; assert the created workout is visible with the expected data, e.g. type, date, distance).
  3. **Edit all data of the workout** (open Edit for that workout; change every field; save; optionally assert overview shows updated values).
  4. **Delete the created workout** (trigger delete, confirm in the confirmation modal; assert the workout no longer appears in the overview).
  - File: e.g. `apps/frontend/cypress/e2e/workouts/workouts.cy.ts`. Use page objects and login/setup consistent with existing shoes E2E (e.g. `shoes.cy.ts`). This smoke test is **in scope** for this ticket.

- **Contract/OpenAPI:** No separate contract test; Swagger reflects code. Verification: manual or existing CI that builds backend and serves /api/docs.

---

## 9. Acceptance Criteria Traceability

| AC ID | Implementation touchpoints | Test(s) / Verification |
|-------|----------------------------|-------------------------|
| AC-1 | Navbar "Workouts" (USER), route /workouts, userGuard | **Smoke E2E** (overview in step 2); login as USER, click Workouts → overview |
| AC-2 | POST /workouts, form with all fields + optional shoe, success flow | Integration test create; **Smoke E2E step 1** |
| AC-3 | PATCH /workouts/:id, edit form, shoe selector | Integration test update; **Smoke E2E step 3** (edit all data) |
| AC-4 | DELETE /workouts/:id, confirmation modal, then delete | Integration test remove; **Smoke E2E step 4** |
| AC-5 | Cancel delete confirmation → no delete | E2E cancel modal (optional; smoke test focuses on full CRUD) |
| AC-6 | DTO validation + service checks; 400 + message | Unit tests validation paths; integration invalid payload |
| AC-7 | Shoe selector in form; create/update with shoeId or null | Integration + E2E |
| AC-8 | Unit tests for workout (and shoe remove 409) | npm run test (backend) |
| AC-9 | Integration tests workout CRUD (+ shoe delete 409) | npm run test:integration (backend), DB up |
| AC-10 | WorkoutsService create/update: reject shoeId not owned by user | Unit + integration |
| AC-11 | ShoesService.remove: 409 when workout.shoeId = shoe.id | Unit + integration |
| AC-12 | Test migration file in prisma/test-migrations/ | Run prisma:test-migrations; verify data |

---

## 10. Execution Sequence

1. **Prisma:** Add Workout model and WorkoutType enum to schema; add User.workouts and Shoe.workouts relations; run `npx prisma migrate dev --name add_workouts`; run `npx prisma generate`.
2. **Backend – Workouts:** Create WorkoutsModule, WorkoutsController, WorkoutsService, DTOs (CreateWorkoutDto, UpdateWorkoutDto, WorkoutResponseDto); register in AppModule; implement list/create/get/update/delete with USER-only and validation.
3. **Backend – Shoe delete:** In ShoesService.remove, before delete, check `prisma.workout.count({ where: { shoeId: id } })`; if > 0 throw ConflictException; add 409 to controller docs.
4. **OpenAPI:** Verify Swagger at /api/docs for workouts and shoes delete 409.
5. **Frontend:** Add WorkoutsService, workout model types; add routes (workouts, workouts/new, workouts/:id/edit) with userGuard; add navbar link "Workouts" for USER; implement WorkoutsOverviewComponent (list, add button, edit/delete, delete confirmation) and WorkoutFormComponent (create/edit, shoe selector from ShoesService.getList()).
6. **Test migration:** Add data-only migration in prisma/test-migrations/ (e.g. 00004_workouts_for_thomas.ts) inserting workouts for thomas user, optionally linked to existing shoe.
7. **Backend unit tests:** Add workouts.service.spec.ts; extend shoes.service.spec.ts for 409 on remove when workouts exist.
8. **Backend integration tests:** Add workouts.integration-spec.ts (CRUD); add or extend test for shoe delete 409.
9. **Frontend smoke E2E (Cypress):** Implement smoke E2E test: (1) create a new workout, (2) verify it exists in the overview, (3) edit all data of the workout, (4) delete the created workout. File: `apps/frontend/cypress/e2e/workouts/workouts.cy.ts`; follow shoes E2E pattern (page objects, USER login).
10. **Final verification:** Run backend unit and integration tests; run frontend build; run Cypress smoke E2E (`npm run e2e:run` from apps/frontend).

---

## 11. Risks & Open Points (UNRESOLVED)

- None. Requirement sheet and constraints are clear.

---

*End of Implementation Plan – Ticket 7*
