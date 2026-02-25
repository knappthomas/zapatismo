# Implementation Plan – 9 – Shoe Usage Statistics (Steps & Distance in Overview Grid)

## 0. Scope Check

- Requirement sheet present and reviewed: ✅
- Fits Zapatismo architecture constraints: ✅
- **In-Scope summary (bullets):**
  - Backend: Add per-shoe aggregated `totalSteps` and `totalDistanceKm` to the shoes list (and optionally findOne) response, computed from workouts where `workout.shoeId === shoe.id`.
  - Frontend: Shoes overview **grid** shows total step count as a number and total km as a progress bar (100% = shoe’s target km; cap at 100%; target 0 → 800 km denominator).
  - Backend unit tests for aggregation logic; backend integration tests for list/aggregate behaviour with real DB.
  - Acceptance criteria verifiable via unit/integration tests and manual or E2E checks on the grid.
- **Out-of-Scope summary (bullets):**
  - Changing workout creation or shoe assignment; shoe detail page or “workouts per shoe” list; dashboard shoes widget; changing `kilometerTarget` validation; Strava integration.
- **Key assumptions (only if explicitly stated in requirements):**
  - “Overview grid” = existing grid view on the shoes overview page.
  - “Target kilometer” = existing shoe field `kilometerTarget`; if 0, use 800 km as progress bar denominator.
  - Only workouts with `shoeId` equal to the shoe’s id are included in aggregates.
- **UNRESOLVED items blocking implementation:** None.

---

## 1. Architecture Mapping (High-Level)

| Layer | Responsibility for this ticket | Notes |
|-------|--------------------------------|-------|
| Angular (apps/frontend) | Display total steps (number) and total km (progress bar, 100% = target) in the shoes overview grid; compute progress percentage and effective target (800 if 0) in UI only. | No business logic duplication; consumes new DTO fields. |
| Backend (apps/backend, NestJS) | Compute and return per-shoe `totalSteps` and `totalDistanceKm` in list (and findOne) response; aggregation from workouts linked to each shoe. | Stateless; no schema change; DTOs extended. |
| Database (MySQL via Prisma) | No schema change. Existing `Workout` (steps, distanceKm, shoeId) and `Shoe` (kilometerTarget) used for aggregation. | Read-only aggregation. |
| OpenAPI contract | Extend shoe response DTO with `totalSteps` and `totalDistanceKm`; regenerate spec. | Additive only. |
| Docker/Compose | No change. | — |
| Strava integration | Out of scope. | — |

---

## 2. Work Breakdown Structure (WBS)

- **WP-1: Backend – extend DTO and aggregation**
  - Goal: Add `totalSteps` and `totalDistanceKm` to shoe API response; compute in service from workouts.
  - Affected area(s): backend (shoes module), openapi
  - Depends on: —
  - Deliverables: `ShoeResponseDto` extended; `ShoesService.findAll` (and `findOne`) compute and attach aggregates; efficient aggregation (no N+1).

- **WP-2: Backend – unit tests for aggregation**
  - Goal: Unit test new/changed aggregation behaviour with mocked Prisma.
  - Affected area(s): backend (shoes.service.spec.ts)
  - Depends on: WP-1
  - Deliverables: Tests for findAll/findOne with aggregates: with workouts (correct sums), no workouts (0, 0), multiple shoes.

- **WP-3: Backend – integration tests for aggregates**
  - Goal: Integration test list (and optionally findOne) with real DB; assert totals from linked workouts.
  - Affected area(s): backend (test/shoes.integration-spec.ts)
  - Depends on: WP-1
  - Deliverables: At least one integration test: list shoes, create workouts linked to a shoe, list again and assert totalSteps/totalDistanceKm.

- **WP-4: Frontend – model and grid UI**
  - Goal: Shoes overview grid shows total steps (number) and total km (progress bar); progress bar 100% = target km, capped at 100%; target 0 → 800 km denominator.
  - Affected area(s): frontend (shoe model, shoes service types, shoes-grid-part, optionally list)
  - Depends on: WP-1 (API contract)
  - Deliverables: `Shoe` model extended; grid card shows steps and progress bar; accessible progress (e.g. role="progressbar", aria-*).

- **WP-5: Frontend – E2E/fixtures**
  - Goal: Fixtures and E2E/component tests reflect new fields; grid display of steps and progress verifiable.
  - Affected area(s): frontend (cypress fixtures, shoes.cy.ts)
  - Depends on: WP-4
  - Deliverables: Fixtures include totalSteps/totalDistanceKm; at least one test (fixture or smoke) verifies grid shows steps and progress bar.

---

## 3. Backend Plan (NestJS)

### 3.1 Modules / Components to touch

- **Module(s):** `ShoesModule` (no structural change).
- **Controller(s):** `ShoesController` — no new endpoints; existing `GET /shoes` and `GET /shoes/:id` return extended DTO.
- **Service(s):** `ShoesService` — `findAll` and `findOne` compute aggregates and include in response.
- **Repository/Prisma access layer:** Prisma only: `prisma.shoe.findMany` / `findFirst`, and `prisma.workout.groupBy` (or equivalent) for per-shoe sums of `steps` and `distanceKm`.

### 3.2 REST Endpoints

| HTTP | Path | Purpose | Request DTO | Response DTO | AuthN/AuthZ | Errors |
|------|------|---------|-------------|--------------|-------------|--------|
| GET | /api/shoes | List user’s shoes with totalSteps, totalDistanceKm | — | ShoeResponseDto[] (extended) | JWT, USER | 401, 403 |
| GET | /api/shoes/:id | Get one shoe with totalSteps, totalDistanceKm | — | ShoeResponseDto (extended) | JWT, USER | 401, 403, 404 |

No new endpoints; existing endpoints return additional fields.

### 3.3 Validation & Error Handling

- **Input validation:** No new request body; existing path/query validation unchanged.
- **Domain validation:** Aggregates are derived (sums); no extra domain validation. Ensure only workouts with `shoeId` equal to the shoe’s id are included; shoes with no linked workouts yield 0, 0.
- **Error mapping:** Unchanged (404 for missing shoe, 401/403 for auth).
- **Logging/Auditing:** No new requirement; follow existing backend logging for errors.

---

## 4. Data / Prisma Plan

### 4.1 Prisma schema changes

- **Models to add/modify:** None. Use existing `Shoe` and `Workout` (steps, distanceKm, shoeId).

### 4.2 Migration steps

- **Migration:** None. No schema change.
- **Seed/test data:** Test-migrations and integration tests can create workouts linked to shoes to assert aggregates; no seed change required for feature correctness.

---

## 5. OpenAPI / Contract Plan

- **Spec changes:** Add to shoe response schema: `totalSteps` (integer) and `totalDistanceKm` (number). Applied to the same response type used by `GET /shoes` and `GET /shoes/:id`.
- **Regeneration:** OpenAPI is generated from NestJS (Swagger decorators); ensure `ShoeResponseDto` has `@ApiProperty()` for the two new fields; no separate regeneration step if spec is derived from code.
- **Client impact:** Frontend uses hand-typed `Shoe` interface; update it to include `totalSteps` and `totalDistanceKm`. If a generated client is introduced later, regenerate from updated spec.

---

## 6. Frontend Plan (Angular)

### 6.1 UX / Screens / Routes

- **Screens affected:** Shoes overview (grid and optionally list).
- **Routes affected:** None (same `/shoes` route).
- **Components to add/modify:** `ShoesGridPartComponent` (display steps and progress bar per card); optionally `ShoesOverviewComponent` list table columns if FR-10 (MAY) is implemented; `Shoe` model interface.

### 6.2 Data flow

- **Services / API client:** `ShoesService.getList()` (and `getOne()`) already return `Shoe[]` / `Shoe`; extend `Shoe` type so responses with `totalSteps` and `totalDistanceKm` are typed.
- **State management:** No change; existing signals in overview component; grid receives shoes as input.
- **Error display:** Unchanged (existing error alert for failed load).

### 6.3 Frontend validations

| Validation | Location (Frontend/Backend) | Rationale |
|------------|----------------------------|-----------|
| Total steps/km are numbers | Backend (derived) | Backend is source of truth. |
| Progress bar denominator (target 0 → 800) | Frontend | Display rule only; effective target = `kilometerTarget \|\| 800`. |
| Progress bar cap at 100% | Frontend | Display rule; percentage = min(100, (totalDistanceKm / effectiveTarget) * 100). |

---

## 7. Strava / Workout Sync (ONLY if required)

- Not required. No changes.

---

## 8. Testing Plan

- **Backend tests (required):**
  - **Unit:** Cover aggregation in `ShoesService`: (1) `findAll` returns shoes with `totalSteps` and `totalDistanceKm`; mock `prisma.shoe.findMany` and `prisma.workout.groupBy` (or aggregate/raw query used); (2) when no workouts for a shoe, that shoe has 0, 0; (3) when workouts exist for a shoe, sums are correct; (4) `findOne` returns same aggregate for that shoe. File: `apps/backend/src/shoes/shoes.service.spec.ts`. No unit tests for controllers if they only pass through service.
  - **Integration (DB):** (1) List shoes for a user (e.g. from test-migrations); create one or more workouts linked to one shoe with known steps/distanceKm; call list again and assert that shoe has totalSteps and totalDistanceKm equal to the sum of those workouts; (2) optional: shoe with no linked workouts has totalSteps 0 and totalDistanceKm 0. File: `apps/backend/test/shoes.integration-spec.ts`. Preconditions: MySQL running, `DATABASE_URL`, test-migrations applied (user + shoes); create/delete workouts in test to avoid polluting shared data where possible.
- **Frontend tests:**
  - **Unit:** Optional; grid component can be tested for rendering steps and progress bar when inputs have totalSteps/totalDistanceKm (and effective target). Not mandated by requirement.
  - **E2E (Cypress):** Fixture-driven test: intercept `GET /api/shoes` with fixture that includes `totalSteps` and `totalDistanceKm`; visit shoes overview grid; assert grid shows step count and a progress bar (and optionally 0% or 100% for edge cases). Smoke: if a smoke test hits real backend, ensure backend returns new fields and grid displays them (can be covered by one smoke scenario). Follow existing structure: Component Test, e2e → fixtures, e2e → smoke.
- **Contract/OpenAPI:** No separate contract test; Swagger spec reflects DTOs; manual check or existing API doc generation suffices.

---

## 9. Acceptance Criteria Traceability

| AC ID | Implementation touchpoints | Test(s) / Verification |
|-------|----------------------------|-------------------------|
| AC-1 | Backend: aggregate steps per shoe; Frontend: grid shows total step count. | Unit: service returns totalSteps. Integration: list with workouts, assert totalSteps. E2E/fixture: grid shows step number. |
| AC-2 | Backend: totalDistanceKm; Frontend: progress bar 100% = target, cap at 100%. | Unit: service returns totalDistanceKm. Integration: assert totalDistanceKm. E2E/fixture: grid shows progress bar; manual check cap at 100%. |
| AC-2b | Frontend: effective target = 800 when kilometerTarget === 0. | Unit or E2E with fixture shoe (kilometerTarget 0); assert progress bar uses 800 as denominator. |
| AC-3 | Backend: shoe with no workouts → 0, 0. Frontend: 0 and 0% bar. | Unit: mock no workouts → 0,0. Integration: shoe with no workouts in list. E2E/fixture: shoe with totalSteps 0, totalDistanceKm 0. |
| AC-4 | New unit tests for aggregation. | Run `npm run test --workspace=@zapatismo/backend`; all pass including shoes.service.spec.ts. |
| AC-5 | Integration tests for list/aggregates with DB. | Run `npm run test:integration --workspace=@zapatismo/backend`; all pass including shoes.integration-spec.ts. |

---

## 10. Execution Sequence

1. **Backend DTO:** Add `totalSteps` and `totalDistanceKm` to `ShoeResponseDto` in `apps/backend/src/shoes/dto/shoe-response.dto.ts` with `@ApiProperty()`.
2. **Backend service:** In `ShoesService`, implement aggregation in `findAll`: fetch user’s shoes; get list of shoe ids; run single aggregation (e.g. `prisma.workout.groupBy` by `shoeId` with `_sum` of `steps` and `distanceKm` for those shoe ids); map results to each shoe (default 0, 0 when no workouts). Implement same for `findOne` (aggregate for that shoe id).
3. **Backend controller:** No signature change; ensure Swagger still references `ShoeResponseDto`.
4. **Backend unit tests:** In `shoes.service.spec.ts`, add describe block for aggregation: mock `findMany` and `groupBy` (or used aggregate API); assert `findAll`/`findOne` return correct totalSteps/totalDistanceKm; assert 0,0 when no workouts.
5. **Backend integration tests:** In `shoes.integration-spec.ts`, add test(s): get user and a shoe; create workouts linked to that shoe; call `findAll` (and optionally `findOne`); assert shoe has totalSteps and totalDistanceKm equal to sums; clean up created workouts if needed. Optionally assert a shoe with no workouts has 0, 0.
6. **OpenAPI:** Regenerate or confirm spec at `/api/docs` shows new fields.
7. **Frontend model:** Extend `Shoe` in `apps/frontend/src/app/core/models/shoe.model.ts` with `totalSteps: number` and `totalDistanceKm: number`.
8. **Frontend grid:** In `ShoesGridPartComponent`, for each shoe card: display `shoe.totalSteps` (number); compute effective target = `shoe.kilometerTarget || 800`, percentage = `Math.min(100, (shoe.totalDistanceKm / effectiveTarget) * 100)`; render progress bar (daisyUI/Tailwind) with `role="progressbar"` and appropriate `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`.
9. **Frontend list (optional):** If FR-10 is implemented, add columns or cells for total steps and total km (or progress) in the list table.
10. **Fixtures and E2E:** Update `cypress/fixtures/shoes/loaded.json` (and any other shoe fixtures) with `totalSteps` and `totalDistanceKm`. In `shoes.cy.ts`, add fixture-based test(s) that grid shows step count and progress bar; add data-cy if needed for selectors.
11. **Run tests:** Backend unit, backend integration, frontend build, E2E (fixtures + smoke as per project).

---

## 11. Risks & Open Points (UNRESOLVED)

- None. Target km = 0 handled in requirement (800 km default denominator); aggregation rules and test strategy are defined.

---

QUALITY GATE (before finishing):

- Every FR and AC from the requirement sheet is mapped to concrete work.
- No architectural drift beyond setup-architecture.md.
- No implementation details/code in the plan (only file-level and behavioural guidance).
- All uncertainties captured as UNRESOLVED with precise questions — none remaining.
