# Backend Implementation Log – 10-1 – Default Shoe for Strava Sync

## 0. Inputs
- Requirement sheet: `.docs/tasks/10-1/1-requirement-10-1.md`
- Implementation plan: `.docs/tasks/10-1/2-plan-10-1.md`
- Architecture: `.docs/system/setup-architecture.md`
- Project rules: `.docs/system/project-rules.md`
- Backend & Prisma: `.docs/system/backend.md`

## 1. Scope Confirmation
- In scope (backend/db only): ✅
- Out of scope (frontend/iOS/etc): ✅
- Plan-following mode (no extras): ✅

## 2. Repo Patterns Used (References)
- **Backend module pattern:** `apps/backend/src/shoes/shoes.module.ts`, `apps/backend/src/strava/strava.module.ts` – feature module with controller, service, DTOs; export service when consumed by other modules.
- **Controller pattern:** `apps/backend/src/shoes/shoes.controller.ts` – thin controller; ParseIntPipe for id; @RequestUser('id'); @Roles(Role.USER) + RolesGuard; Swagger decorators; delegates to service.
- **Validation pattern:** `main.ts` – global ValidationPipe (whitelist, forbidNonWhitelisted, transform). DTOs use class-validator (`@IsOptional()`, `@IsBoolean()`, etc.) and `@ApiProperty()` / `@ApiPropertyOptional()`.
- **Error handling pattern:** `ShoesService` – `NotFoundException` for not-found/not-owned, `ConflictException` for business rule (e.g. delete when linked). No custom exception filters; Nest built-ins map to HTTP.
- **Prisma access pattern:** `PrismaService` (global) injected in services; no separate repository layer; services use `this.prisma.shoe.findFirst/update/...` with `where: { id, userId }` for ownership.
- **Test pattern:** Unit: `*.spec.ts` with mocked `PrismaService` / dependencies (Jest). Integration: `test/*.integration-spec.ts` with `ConfigModule`, `PrismaModule`, real DB; thomas@zapatismo.local from test-migrations; fetch mocked for Strava in strava integration tests.

## 3. Work Executed (Traceable to Plan)
### WP-1: Prisma schema and migration – add default flag to Shoe
- Plan reference: §4 Data / Prisma Plan
- What changed: Added `isDefault Boolean @default(false) @map("is_default")` to `Shoe` in `prisma/schema.prisma`. Created and applied migration `20260225175236_add_shoe_is_default`.
- Files: `prisma/schema.prisma`, `prisma/migrations/20260225175236_add_shoe_is_default/migration.sql`
- Notes: No unique DB constraint for at-most-one default; enforced in ShoesService.update.

### WP-2: Backend – Shoes module (default flag and at-most-one enforcement)
- Plan reference: §3.1, §3.3, Execution sequence step 2
- What changed: `ShoeResponseDto` + `isDefault`; `UpdateShoeDto` + optional `isDefault` (`@IsOptional()`, `@IsBoolean()`). `ShoesService`: `findDefaultShoeId(userId)`, in `update()` when `dto.isDefault === true` call `updateMany` to clear other shoes’ `isDefault` then update this shoe; when `dto.isDefault !== undefined` include in update data; `toResponse()` extended to include `isDefault`.
- Files: `apps/backend/src/shoes/dto/shoe-response.dto.ts`, `apps/backend/src/shoes/dto/update-shoe.dto.ts`, `apps/backend/src/shoes/shoes.service.ts`
- Notes: Controller unchanged (PATCH already used).

### WP-3: Backend – Strava sync uses default shoe
- Plan reference: §3.1, Execution sequence step 3
- What changed: `StravaModule` imports `ShoesModule`. `StravaService` injects `ShoesService`; in `sync()` before the activity loop call `findDefaultShoeId(userId)` and pass `shoeId: defaultShoeId ?? undefined` to `createByExternalId`.
- Files: `apps/backend/src/strava/strava.module.ts`, `apps/backend/src/strava/strava.service.ts`
- Notes: Idempotency unchanged; `createByExternalId` already returns without updating existing workout.

### WP-4: OpenAPI / contract
- Plan reference: §5 OpenAPI Plan
- What changed: DTOs already use `@ApiProperty()` / `@ApiPropertyOptional()`; Swagger at `/api/docs` reflects new fields. No separate spec file; generated from code.
- Files: `shoe-response.dto.ts`, `update-shoe.dto.ts`
- Notes: No regeneration command; verify at `http://localhost:3000/api/docs`.

### WP-6: Backend unit tests – shoes and strava
- Plan reference: §8 Testing Plan
- What changed: `shoes.service.spec.ts`: mock `updateMany`; add `isDefault` to shoe entity; tests for update with `isDefault: true` (clears others, sets this), update with `isDefault: false`; `findDefaultShoeId` returns id when default exists, null when none. `strava.service.spec.ts`: mock `ShoesService` with `findDefaultShoeId`; sync test asserts `createByExternalId` called without `shoeId` when no default; new tests: sync with default passes `shoeId`, sync without default no `shoeId`, idempotent re-sync still passes `shoeId` but created: false so no update.
- Files: `apps/backend/src/shoes/shoes.service.spec.ts`, `apps/backend/src/strava/strava.service.spec.ts`
- Notes: Fixed “skips non-running/walking” test to mock `createByExternalId` and use `mockImplementation` for fetch.

### WP-7: Backend integration tests
- Plan reference: §8 Testing Plan
- What changed: `shoes.integration-spec.ts`: “set default” (PATCH isDefault true, list returns it), “change default” (set first then second, verify only second is default). `strava.integration-spec.ts`: added `ShoesModule` and `ShoesService`; “sync with default shoe set” assigns created workout to default shoe; “sync with no default shoe” creates workout with shoeId null; “re-sync same range does not change existing workout shoeId”. First getStatus test cleans up connection so it sees “not connected” regardless of order.
- Files: `apps/backend/test/shoes.integration-spec.ts`, `apps/backend/test/strava.integration-spec.ts`
- Notes: Strava integration test “getStatus returns connected false” now deletes any existing connection for thomas so test is order-independent.

## 4. Prisma / Database Changes
### 4.1 Schema changes
- **Shoe:** added `isDefault Boolean @default(false) @map("is_default")`. No new model; no separate default entity.

### 4.2 Migrations
- **Migration:** `20260225175236_add_shoe_is_default`
- **Commands run:** `npx prisma migrate dev --name add_shoe_is_default` (from repo root); `prisma generate` ran automatically.

### 4.3 Seed/Test data
- No seed changes. Test-migrations unchanged; integration tests set/clear default in test flow.

## 5. Backend Changes (NestJS)
### 5.1 Modules / Components touched
- **Modules:** ShoesModule (unchanged exports), StravaModule (imports ShoesModule).
- **Controllers:** ShoesController – no new endpoints; PATCH `shoes/:id` already used.
- **Services:** ShoesService (update logic, findDefaultShoeId, toResponse), StravaService (sync: findDefaultShoeId, pass shoeId to createByExternalId).
- **Prisma:** Shoe model has isDefault; no new repository layer.

### 5.2 Endpoints implemented
| HTTP | Path | Purpose | AuthN/AuthZ | Request DTO | Response DTO | Error cases |
|------|------|---------|-------------|-------------|--------------|-------------|
| GET | /api/shoes | List shoes (incl. isDefault) | JWT, USER | — | ShoeResponseDto[] | — |
| GET | /api/shoes/:id | Get one shoe (incl. isDefault) | JWT, USER | — | ShoeResponseDto | 404 |
| PATCH | /api/shoes/:id | Update shoe (incl. set/clear default) | JWT, USER | UpdateShoeDto (optional isDefault) | ShoeResponseDto | 400, 404 |
| POST | /api/strava/sync | Sync (internal: uses default shoe when creating workouts) | JWT, USER | SyncRequestDto | SyncResponseDto | 400, etc. |

### 5.3 Validation & Error Handling
- **Validation:** `UpdateShoeDto.isDefault` optional boolean via `@IsOptional()` and `@IsBoolean()`. Shoe ownership enforced in service (findFirst by id + userId).
- **Domain:** When `isDefault: true`, clear other shoes’ default for same user then set this shoe; when `isDefault: false`, only update this shoe.
- **Errors:** 404 when shoe not found or not owned (NotFoundException); 400 for validation (ValidationPipe). No new error shapes.

## 6. OpenAPI / Contract Changes (if applicable)
- **Files changed:** DTOs only (`ShoeResponseDto`, `UpdateShoeDto`).
- **Regeneration:** None; spec generated from NestJS at runtime. Verify at `http://localhost:3000/api/docs`.
- **Notes:** New fields appear in Swagger automatically.

## 7. Tests
- **Unit:** `apps/backend/src/shoes/shoes.service.spec.ts` (update isDefault true/false, findDefaultShoeId), `apps/backend/src/strava/strava.service.spec.ts` (sync with/without default shoe, idempotent re-sync).
- **Integration:** `apps/backend/test/shoes.integration-spec.ts` (set default, change default), `apps/backend/test/strava.integration-spec.ts` (sync with default assigns shoeId, sync without default shoeId null, re-sync does not change existing workout shoeId).
- **How to run:** From repo root: `npm run test --workspace=@zapatismo/backend` (unit); `npm run test:integration --workspace=@zapatismo/backend` (integration; MySQL + DATABASE_URL required).
- **Coverage summary:** Unit tests cover ShoesService default logic and StravaService sync passing default shoeId; integration tests cover DB behaviour and sync assignment.

## 8. Acceptance Criteria Traceability
| AC ID | Implementation touchpoints (files/functions) | Tests / Verification |
|-------|---------------------------------------------|----------------------|
| AC-1 | ShoesService.update (set default, clear others); ShoeResponseDto.isDefault | Unit: update isDefault true; integration: set default then list |
| AC-2 | ShoesService.update (isDefault false); toResponse isDefault | Unit: update isDefault false; integration: clear default |
| AC-3 | StravaService.sync uses findDefaultShoeId, passes shoeId to createByExternalId | Unit: sync with default mocks; integration: sync with default, assert workout.shoeId |
| AC-4 | StravaService.sync when findDefaultShoeId returns null – no shoeId passed | Unit: sync without default; integration: sync without default, assert shoeId null |
| AC-5 | ShoesService.update clears previous default when setting new one | Unit: set A then B (implicit in update true); integration: change default |
| AC-6 | createByExternalId idempotent; sync only passes shoeId on create | Unit: idempotent sync; integration: re-sync same range, workout shoeId unchanged |
| AC-7 | ShoesService and StravaService unit tests | `npm run test --workspace=@zapatismo/backend` |
| AC-8 | Shoes and Strava integration tests | `npm run test:integration --workspace=@zapatismo/backend` (DB required) |

## 9. Change Summary
- **Files added/modified:** prisma/schema.prisma; prisma/migrations/20260225175236_add_shoe_is_default/migration.sql; apps/backend/src/shoes/dto/shoe-response.dto.ts; apps/backend/src/shoes/dto/update-shoe.dto.ts; apps/backend/src/shoes/shoes.service.ts; apps/backend/src/shoes/shoes.service.spec.ts; apps/backend/src/strava/strava.module.ts; apps/backend/src/strava/strava.service.ts; apps/backend/src/strava/strava.service.spec.ts; apps/backend/test/shoes.integration-spec.ts; apps/backend/test/strava.integration-spec.ts.
- **New/changed endpoints:** None new. GET/PATCH shoes and POST strava/sync unchanged paths; response/request DTOs extended with isDefault.
- **Prisma migrations:** 20260225175236_add_shoe_is_default.
- **Tests:** Unit and integration as in §7; all pass.

## 10. Open Points / Risks
- None. At-most-one default enforced in application; migration applies cleanly; no frontend changes in this step.
