# Backend Implementation Log – 22 – Bulk Assign Shoe to Workouts

## 0. Inputs
- Requirement sheet: `.docs/tasks/22/1-requirement-22.md`
- Implementation plan: `.docs/tasks/22/2-plan-22.md`
- Architecture: `.docs/system/setup-architecture.md`
- Project rules: `.docs/system/project-rules.md`
- Backend & Prisma: `.docs/system/backend.md`

## 1. Scope Confirmation
- In scope (backend/db only): ✅
- Out of scope (frontend/iOS/etc): ✅
- Plan-following mode (no extras): ✅

## 2. Repo Patterns Used (References)
- **Backend module pattern:** `apps/backend/src/workouts/workouts.module.ts` (controller + service, exports service).
- **Controller pattern:** `apps/backend/src/workouts/workouts.controller.ts` (thin controller, @RequestUser, @Body DTOs, Swagger decorators, RolesGuard).
- **Validation pattern:** Global `ValidationPipe` in `main.ts` (whitelist, forbidNonWhitelisted, transform); DTOs use class-validator (`create-workout.dto.ts`: `@IsEnum`, `@IsInt`, `@Min`, etc.).
- **Error handling pattern:** `workouts.service.ts`: `BadRequestException` (validation/domain, e.g. shoe not owned), `NotFoundException` (workout not found / not owned).
- **Prisma access pattern:** `PrismaService` injected in `WorkoutsService`; no separate repository layer; `ensureShoeBelongsToUser` private helper; `toResponse()` for DTO mapping.
- **Test pattern:** Unit: `workouts.service.spec.ts` with mocked `PrismaService` (jest.fn()); integration: `test/workouts.integration-spec.ts` with `PrismaModule` + real DB, thomas user from test-migrations.

## 3. Work Executed (Traceable to Plan)
### WP-1: Backend – Bulk-assign DTO and endpoint
- **Plan reference:** Section 3.2 REST Endpoints; Section 3.3 Validation.
- **What changed:** Added `BulkAssignShoeDto` (workoutIds, shoeId with class-validator); added `WorkoutsService.bulkAssignShoe(userId, dto)`; added `PATCH workouts/bulk-assign-shoe` route before `:id` routes with Swagger decorators.
- **Files:** `workouts/dto/bulk-assign-shoe.dto.ts` (new), `workouts/workouts.service.ts`, `workouts/workouts.controller.ts`.
- **Notes:** Response is 200 with array of `WorkoutResponseDto`; 400 for validation/shoe not owned, 404 for workouts not found/not owned.

### WP-2: Backend – Unit tests for bulk-assign
- **Plan reference:** Section 8 Testing Plan – Unit.
- **What changed:** Extended `workouts.service.spec.ts` with `bulkAssignShoe` describe: success, empty workoutIds (BadRequest), shoe not owned (BadRequest), one or more workouts not found (NotFoundException), all workouts belong to another user (NotFoundException).
- **Files:** `workouts/workouts.service.spec.ts`.
- **Notes:** Mock includes `workout.updateMany`.

### WP-3: Backend – Integration test for bulk-assign
- **Plan reference:** Section 8 Testing Plan – Integration.
- **What changed:** Added one integration test in `workouts.integration-spec.ts`: bulkAssignShoe with thomas user, two workouts, one shoe; assert returned DTOs and DB state after.
- **Files:** `test/workouts.integration-spec.ts`.
- **Notes:** Creates two workouts if thomas has fewer than two; verifies persistence via Prisma findMany after.

## 4. Prisma / Database Changes
### 4.1 Schema changes
- None (per plan). `Workout.shoeId` already exists; bulk update uses existing Prisma API.

### 4.2 Migrations
- None (per plan).

### 4.3 Seed/Test data
- None.

## 5. Backend Changes (NestJS)
### 5.1 Modules / Components touched
- **Modules:** WorkoutsModule (unchanged structure).
- **Controllers:** WorkoutsController – added `PATCH bulk-assign-shoe` handler.
- **Services:** WorkoutsService – added `bulkAssignShoe(userId, dto)`.
- **Repositories / Prisma layer:** PrismaService only; no new repository.

### 5.2 Endpoints implemented
| HTTP | Path | Purpose | AuthN/AuthZ | Request DTO | Response DTO | Error cases |
|------|------|---------|-------------|-------------|--------------|-------------|
| PATCH | /api/workouts/bulk-assign-shoe | Assign one shoe to many workouts (current user's) | JWT, USER role | BulkAssignShoeDto | 200: WorkoutResponseDto[] | 400 validation or shoe not owned; 404 one or more workouts not found/not owned; 401/403 from guards |

### 5.3 Validation & Error Handling
- **Validation rules:** `BulkAssignShoeDto`: `workoutIds` – `@IsArray()`, `@ArrayMinSize(1)`, `@IsInt({ each: true })`; `shoeId` – `@IsInt()`, `@Min(1)`. Global ValidationPipe applies.
- **Error mapping:** `BadRequestException` for empty workoutIds (defensive) and shoe not found/not owned (`ensureShoeBelongsToUser`); `NotFoundException` when `findMany` count !== workoutIds.length ("One or more workouts not found or do not belong to user").
- **Reference:** Same as existing `workouts.service.ts` (update, create with shoeId).

## 6. OpenAPI / Contract Changes (if applicable)
- **Files changed:** Controller and DTOs use existing Swagger decorators; new route has `@ApiOkResponse`, `@ApiBadRequestResponse`, `@ApiNotFoundResponse`; `BulkAssignShoeDto` has `@ApiProperty()` on both fields.
- **Regeneration:** OpenAPI is generated from NestJS at runtime; verify at `/api/docs` after starting the backend.
- **Notes:** No separate codegen step; frontend may add a hand-typed client for this endpoint.

## 7. Tests
- **Tests added/updated:**
  - `apps/backend/src/workouts/workouts.service.spec.ts`: new `describe('bulkAssignShoe')` with 5 cases (success, empty workoutIds, shoe not owned, one/more workouts not found, all workouts other user).
  - `apps/backend/test/workouts.integration-spec.ts`: new test `bulkAssignShoe: assigns one shoe to multiple workouts and persists`.
- **How to run:** From repo root: `npm run test --workspace=@zapatismo/backend` (unit); `npm run test:integration --workspace=@zapatismo/backend` (integration; requires MySQL and test-migrations).
- **Coverage summary:** Unit tests cover success path, empty list, shoe not owned, workouts not found/not owned. Integration test covers full flow with real DB and persistence check. Maps to AC-8 (unit), AC-9 (integration).

## 8. Acceptance Criteria Traceability
| AC ID | Implementation touchpoints (files/functions) | Tests / Verification |
|-------|-----------------------------------------------|----------------------|
| AC-1–AC-7 | Frontend-only (out of scope for step 3) | N/A |
| AC-8 | WorkoutsService.bulkAssignShoe; workouts.service.spec.ts bulkAssignShoe describe | Unit tests: 5 cases; `npm run test --workspace=@zapatismo/backend` |
| AC-9 | WorkoutsService.bulkAssignShoe; workouts.integration-spec.ts bulkAssignShoe test | Integration test; `npm run test:integration --workspace=@zapatismo/backend` |

## 9. Change Summary
- **Files added:** `apps/backend/src/workouts/dto/bulk-assign-shoe.dto.ts`
- **Files modified:** `apps/backend/src/workouts/workouts.service.ts`, `apps/backend/src/workouts/workouts.controller.ts`, `apps/backend/src/workouts/workouts.service.spec.ts`, `apps/backend/test/workouts.integration-spec.ts`
- **New/changed endpoints:** PATCH /api/workouts/bulk-assign-shoe (new)
- **Prisma migrations:** None
- **Tests:** Unit: 5 new tests in workouts.service.spec.ts; integration: 1 new test in workouts.integration-spec.ts

## 10. Open Points / Risks
- None identified. Backend implementation is complete and aligned with the plan; frontend (WP-4–WP-7) is out of scope for this step.
