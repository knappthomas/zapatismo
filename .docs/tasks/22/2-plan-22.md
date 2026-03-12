# Implementation Plan – 22 – Bulk Assign Shoe to Workouts

## 0. Scope Check
- Requirement sheet present and reviewed: ✅
- Fits Zapatismo architecture constraints: ✅
- In-Scope summary (bullets):
  - Select column at start of workouts table with per-row selection; optional select-all (MAY).
  - Toolbar visible when ≥1 workout selected, with “Assign Shoe” action.
  - Assign-shoe modal: shoe dropdown (user’s shoes) and confirm control (e.g. “Update”).
  - On confirm: assign chosen shoe to all selected workouts; refresh overview.
  - Backend: new bulk-assign endpoint or reuse of single PATCH; ownership enforced; unit + integration tests for new backend behaviour.
- Out-of-Scope summary (bullets):
  - No change to single-workout edit flow or shoe assignment there.
  - No other bulk actions (bulk delete, bulk unassign).
  - No change to table columns beyond adding select column; no bulk unassign in this ticket.
- Key assumptions (only if explicitly stated in requirements):
  - User has access to /workouts and shoes list; auth/authZ as today (USER role).
  - Workouts and shoes already associated in domain; single workout update already supports shoe.
- UNRESOLVED items blocking implementation (if any): None.

## 1. Architecture Mapping (High-Level)
| Layer | Responsibility for this ticket | Notes |
|-------|-------------------------------|--------|
| Angular (apps/frontend) | Workouts overview: select column, selection state, toolbar, assign-shoe modal, call bulk-assign API, refresh list, error/loading feedback. | UI/UX only; no business logic duplication. |
| Backend (apps/backend, NestJS) | New bulk-assign-shoe endpoint: validate workout IDs and shoeId ownership, update workouts in one or more DB operations; return success or structured error. | Stateless; DTOs; ownership enforced. |
| Database (MySQL via Prisma) | No schema change. Workout.shoeId updated via existing Prisma API. | |
| OpenAPI contract | New endpoint and DTOs documented; spec regenerated from NestJS. | |
| Docker/Compose | No change. | |
| iOS (apps/app-ios) | Not affected. | Out of scope. |

## 2. Work Breakdown Structure (WBS)
- **WP-1: Backend – Bulk-assign DTO and endpoint**
  - Goal: Add PATCH /api/workouts/bulk-assign-shoe accepting workoutIds + shoeId; enforce ownership; return success or error.
  - Affected area(s): backend (workouts module), openapi
  - Depends on: none
  - Deliverables: BulkAssignShoeDto, BulkAssignShoeResponseDto (or error shape), WorkoutsController route (before :id routes), WorkoutsService.bulkAssignShoe(), Swagger decorators.

- **WP-2: Backend – Unit tests for bulk-assign**
  - Goal: Unit test WorkoutsService.bulkAssignShoe with mocked Prisma (success, not-found, shoe not owned, workout not owned, empty list).
  - Affected area(s): backend
  - Depends on: WP-1
  - Deliverables: workouts.service.spec.ts extended with bulkAssignShoe tests.

- **WP-3: Backend – Integration test for bulk-assign**
  - Goal: One integration test (real DB) that calls bulk-assign (via service or HTTP) and verifies persistence and ownership.
  - Affected area(s): backend
  - Depends on: WP-1
  - Deliverables: workouts.integration-spec.ts (or dedicated bulk-assign integration test file) with at least one test for bulk-assign.

- **WP-4: Frontend – Selection state and table select column**
  - Goal: Add select column at start of workouts table; per-row checkbox; optional “select all” (MAY); clear selection state.
  - Affected area(s): frontend (workouts-list-part, workouts-overview)
  - Depends on: none (can parallel with WP-1)
  - Deliverables: Selection state (e.g. Set<id> or array) in overview; list-part accepts selection + selection change events; checkboxes in first column; optional header “select all”.

- **WP-5: Frontend – Toolbar and Assign Shoe action**
  - Goal: Toolbar visible when ≥1 workout selected; “Assign Shoe” button; toolbar hidden when no selection.
  - Affected area(s): frontend (workouts-overview)
  - Depends on: WP-4
  - Deliverables: Toolbar UI in overview template; conditional visibility; “Assign Shoe” button.

- **WP-6: Frontend – Assign-shoe modal**
  - Goal: Modal with shoe dropdown (user’s shoes), confirm (“Update”) and cancel; no shoe selected → disable confirm or show message; no shoes → disable or message (FR-8).
  - Affected area(s): frontend (workouts-overview or small subcomponent)
  - Depends on: WP-5
  - Deliverables: Modal template; load shoes (ShoesService.getList()); selection + confirm/cancel; validation (shoe required).

- **WP-7: Frontend – Call bulk-assign API and refresh**
  - Goal: On confirm, call new bulk-assign endpoint with selected workout IDs and chosen shoeId; on success close modal, refresh list, clear selection; on error show message, keep modal dismissible (FR-11).
  - Affected area(s): frontend (workouts-overview, WorkoutsService)
  - Depends on: WP-1, WP-6
  - Deliverables: WorkoutsService.bulkAssignShoe(workoutIds, shoeId); overview calls it and handles success/error/loading.

- **WP-8: E2E / acceptance (optional in plan)**
  - Goal: Optional Cypress (or manual) checks for AC-1–AC-7 if repo runs E2E; not blocking.
  - Affected area(s): frontend cypress
  - Depends on: WP-4–WP-7
  - Deliverables: E2E tests for selection, toolbar, modal, assign, refresh (if desired).

## 3. Backend Plan (NestJS)
### 3.1 Modules / Components to touch
- Module(s): WorkoutsModule (existing).
- Controller(s): WorkoutsController – add one route (before `:id` routes).
- Service(s): WorkoutsService – add bulkAssignShoe(userId, dto).
- Repository/Prisma access layer: PrismaService only (no new repository).

### 3.2 REST Endpoints
| HTTP | Path | Purpose | Request DTO | Response DTO | AuthN/AuthZ | Errors |
|------|------|---------|-------------|--------------|-------------|--------|
| PATCH | /api/workouts/bulk-assign-shoe | Assign one shoe to many workouts (current user’s) | BulkAssignShoeDto | 200: list of updated WorkoutResponseDto or 204; or 400/404 | JWT, USER role | 400 invalid/empty payload or shoe not owned; 404 if any workout not found/not owned; 401/403 as usual |

Rules:
- Route must be registered **before** `Get(':id')` so `bulk-assign-shoe` is not parsed as id.
- Stateless REST only; no business logic in controller beyond delegation and validation.
- Use explicit DTOs; do not expose Prisma entities.

Request DTO (conceptual): `BulkAssignShoeDto` – `workoutIds: number[]` (min 1), `shoeId: number`. Response: either array of updated workouts (WorkoutResponseDto[]) or 204 No Content; document in OpenAPI.

### 3.3 Validation & Error Handling
- Input validation: class-validator on BulkAssignShoeDto (IsArray, ArrayMinSize(1), IsInt for each id; IsInt, Min(1) for shoeId). Controller uses ValidationPipe (global).
- Domain validation: Service ensures all workout IDs belong to userId (findFirst per id or single findMany where id in [...] and userId); ensure shoeId belongs to userId (reuse ensureShoeBelongsToUser). If any workout missing or shoe invalid → BadRequestException or NotFoundException as per existing patterns.
- Error mapping: 400 for validation or “shoe not found / not owned”; 404 for “one or more workouts not found or not owned” (or 400 with message – align with existing workout/shoe APIs). 401/403 from guards.
- Logging: No mandatory logging of full request bodies (many IDs); log only counts or high-level outcome if needed.

## 4. Data / Prisma Plan
### 4.1 Prisma schema changes
- None. Workout.shoeId already exists; bulk update uses existing Prisma update API.

### 4.2 Migration steps
- No migration. No seed or test-migration change required for schema.

## 5. OpenAPI / Contract Plan
- New endpoint: PATCH /api/workouts/bulk-assign-shoe with request body (workoutIds, shoeId) and response (200 with array of workouts or 204).
- New DTOs: BulkAssignShoeDto, response type (array of WorkoutResponseDto or documented 204).
- Regeneration: OpenAPI is generated from NestJS (Swagger decorators); verify at /api/docs after implementation.
- Client impact: Frontend adds method to call this endpoint (typed by hand or future OpenAPI client); no breaking change to existing endpoints.

## 6. Frontend Plan (Angular)
### 6.1 UX / Screens / Routes
- Screens affected: Workouts overview (/workouts) only.
- Routes affected: None (same route, enhanced component).
- Components to add/modify: WorkoutsOverviewComponent (toolbar, modal, selection state, call API); WorkoutsListPartComponent (select column, selection input/output, optional select-all).

### 6.2 Data flow
- Services: WorkoutsService.bulkAssignShoe(workoutIds, shoeId); ShoesService.getList() for modal dropdown (already used elsewhere).
- State: Selection state (e.g. signal or Set of workout ids) in overview; modal open/closed, selected shoe, loading, error in overview.
- Error display: Toast or inline message in modal; modal dismissible on error; selection can be preserved for retry (FR-11).

### 6.3 Frontend validations
| Validation | Location (Frontend/Backend) | Rationale |
|------------|----------------------------|-----------|
| At least one workout selected to show toolbar / enable Assign Shoe | Frontend | UX; backend receives workoutIds. |
| At least one shoe selected in modal before confirm | Frontend | Avoid sending invalid request. |
| workoutIds and shoeId non-empty, valid shape | Backend | Single source of truth; security. |
| All workout IDs and shoeId belong to current user | Backend | Security and data isolation. |

## 7. iOS App Plan (ONLY if required)
- Not applicable.

## 8. Testing Plan
- **Backend (required):**
  - **Unit:** WorkoutsService.bulkAssignShoe: (1) success – all IDs and shoe owned by user, Prisma update mocked, returns updated DTOs; (2) empty workoutIds – validation or BadRequest; (3) shoeId not owned – BadRequest; (4) one or more workout IDs not found or not owned – NotFound or BadRequest as chosen. File: `workouts.service.spec.ts`.
  - **Integration (DB):** At least one test: authenticate or use service with real DB, create/fetch user with workouts and shoes, call bulkAssignShoe, then verify workouts have updated shoeId (and optional shoe relation). Precondition: MySQL + DATABASE_URL; test-migrations applied if tests rely on thomas user. File: `workouts.integration-spec.ts` or equivalent.
- **Frontend:**
  - Unit: Optional; component tests for overview/list-part (selection, toolbar visibility, modal open/close) if desired. Not mandated by requirement sheet.
  - E2E (Cypress): Optional; AC-1–AC-7 can be covered by E2E if repo runs Cypress (see WP-8).
- **Contract/OpenAPI:** Verify new endpoint and DTOs appear in Swagger UI after implementation.

## 9. Acceptance Criteria Traceability
| AC ID | Implementation touchpoints | Test(s) / Verification |
|-------|----------------------------|--------------------------|
| AC-1 | WP-4: Select column and per-row selection in list-part and overview | Manual or E2E: load /workouts, check column and select rows |
| AC-2 | WP-5: Toolbar with “Assign Shoe” when ≥1 selected | Manual or E2E: select row(s), assert toolbar visible |
| AC-3 | WP-5: Toolbar hidden when no selection | Manual or E2E: deselect all, assert toolbar hidden |
| AC-4 | WP-6, WP-7: Modal with shoes dropdown and confirm; select shoe and confirm | Manual or E2E: open modal, choose shoe, confirm |
| AC-5 | WP-7: After success, modal closes, list refreshes, table shows shoe | Manual or E2E: confirm assign, assert modal closed, list reloaded, shoe shown |
| AC-6 | WP-6: Close modal without confirming → no updates | Manual or E2E: open modal, close without confirm, assert no API call or list unchanged |
| AC-7 | WP-6: No shoes → confirm disabled or message | Manual or E2E: user with no shoes (or mock empty list), assert cannot complete assign |
| AC-8 | WP-2: Backend unit tests for bulk-assign | Run `npm run test --workspace=@zapatismo/backend` (unit); all pass including bulkAssignShoe |
| AC-9 | WP-3: Integration test for bulk-assign (DB/HTTP) | Run `npm run test:integration --workspace=@zapatismo/backend`; test with DB |

## 10. Execution Sequence
1. **Backend:** Add BulkAssignShoeDto and response type; add WorkoutsService.bulkAssignShoe (ownership checks, update loop or batch); add PATCH workouts/bulk-assign-shoe route **before** :id routes; Swagger decorators.
2. **Backend tests:** Add unit tests in workouts.service.spec.ts for bulkAssignShoe; add integration test in workouts.integration-spec.ts (or equivalent).
3. **OpenAPI:** Verify /api/docs; no separate codegen step if frontend uses hand-typed client.
4. **Frontend:** Add selection state and select column in list-part and overview (WP-4).
5. **Frontend:** Add toolbar and “Assign Shoe” button (WP-5).
6. **Frontend:** Add assign-shoe modal, shoe dropdown, confirm/cancel, validations (WP-6).
7. **Frontend:** Add WorkoutsService.bulkAssignShoe and wire confirm to API; refresh list and handle errors (WP-7).
8. **Optional:** Add or extend Cypress E2E for AC-1–AC-7 (WP-8).
9. **QA:** Run full backend unit + integration; smoke-test frontend manually (or E2E).

## 11. Risks & Open Points (UNRESOLVED)
- None. Partial failure behaviour (multiple single updates vs one bulk) is resolved in requirement sheet: if multiple updates used and one fails, show generic error and do not roll back; preference for single bulk endpoint reduces partial-update scenarios.

QUALITY GATE (before finishing):
- Every FR and AC from the requirement sheet is mapped to concrete work. ✅
- No architectural drift beyond setup-architecture.md. ✅
- No implementation details/code. ✅
- All uncertainties captured as UNRESOLVED with precise questions. N/A (no open uncertainties.)
