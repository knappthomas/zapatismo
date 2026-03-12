# Backend Implementation Log – 23 – Default Running Shoe and Default Walking Shoe

## 0. Inputs
- Requirement sheet: `.docs/tasks/23/1-requirement-23.md`
- Implementation plan: `.docs/tasks/23/2-plan-23.md`
- Architecture: `.docs/system/setup-architecture.md`
- Project rules: `.docs/system/project-rules.md`
- Backend & Prisma: `.docs/system/backend.md`

## 1. Scope Confirmation
- In scope (backend/db only): ✅
- Out of scope (frontend/iOS/etc): ✅
- Plan-following mode (no extras): ✅

## 2. Repo Patterns Used (References)
- **Backend module pattern:** `apps/backend/src/shoes/shoes.module.ts`, `apps/backend/src/strava/strava.module.ts` (controller + service; PrismaModule global).
- **Controller pattern:** `apps/backend/src/shoes/shoes.controller.ts` (thin: ParseIntPipe, RequestUser, body DTOs; Swagger decorators; no business logic).
- **Validation pattern:** `main.ts` global `ValidationPipe` (whitelist, forbidNonWhitelisted); DTOs use `class-validator` (`@IsOptional()`, `@IsBoolean()`) and `@ApiPropertyOptional()`.
- **Error handling pattern:** `NotFoundException`, `ConflictException` from `@nestjs/common`; thrown in services; controllers propagate (e.g. shoes.service.ts, backend.md).
- **Prisma access pattern:** `PrismaService` (global) in services; no repository layer; direct `this.prisma.shoe.*` / `this.prisma.workout.*`.
- **Test pattern:** Unit: `*.spec.ts` with mocked `PrismaService` and mocked `ShoesService`/`WorkoutsService` where injected; integration: `test/*.integration-spec.ts` with `TestingModule`, real `PrismaModule`, `ConfigModule`, optional `ShoesModule`/`WorkoutsModule`, real DB via `DATABASE_URL`.

## 3. Work Executed (Traceable to Plan)
### WP-1: Prisma schema and migration for type-specific default shoes
- **Plan reference:** §2 WBS WP-1, §4 Data/Prisma Plan.
- **What changed:** Replaced `isDefault` on `Shoe` with `isDefaultForRunning` and `isDefaultForWalking`; added migration with backfill then drop.
- **Files:** `prisma/schema.prisma`, `prisma/migrations/20260312120000_replace_default_shoe_with_type_specific_defaults/migration.sql`.
- **Notes:** Migration adds two columns, backfills from `is_default`, drops `is_default`. Test-migrations do not reference `isDefault`; no change to test-migrations.

### WP-2: Backend shoes module – DTOs and service
- **Plan reference:** §2 WBS WP-2, §3 Backend Plan.
- **What changed:** `ShoeResponseDto`: `isDefault` → `isDefaultForRunning`, `isDefaultForWalking`. `UpdateShoeDto`: same. `ShoesService.update()`: clear other shoes’ default when setting default-for-running or default-for-walking; persist both flags. Replaced `findDefaultShoeId` with `findDefaultRunningShoeId` and `findDefaultWalkingShoeId`. `toResponse()` updated for new shape.
- **Files:** `apps/backend/src/shoes/dto/shoe-response.dto.ts`, `apps/backend/src/shoes/dto/update-shoe.dto.ts`, `apps/backend/src/shoes/shoes.service.ts`.
- **Notes:** No new endpoints; controller unchanged except DTO types.

### WP-3: Backend Strava sync – assign shoe by workout type
- **Plan reference:** §2 WBS WP-3, §3 Backend Plan.
- **What changed:** `StravaService.sync()` loads `findDefaultRunningShoeId` and `findDefaultWalkingShoeId`; for each activity, passes `shoeId` from running default when type is RUNNING, from walking default when WALKING; otherwise no shoe.
- **Files:** `apps/backend/src/strava/strava.service.ts`.
- **Notes:** Idempotent re-sync unchanged (createByExternalId only for new workouts).

### WP-4: OpenAPI / contract
- **Plan reference:** §5 OpenAPI Plan.
- **What changed:** Contract is driven by NestJS DTOs and Swagger decorators; no separate spec file. Updating DTOs (WP-2) updates `/api/docs` automatically. No regeneration command; backend run and Swagger UI reflect new shoe fields.

### WP-9: Backend unit tests
- **Plan reference:** §8 Testing Plan (unit).
- **What changed:** `shoes.service.spec.ts`: entity and update tests use `isDefaultForRunning`/`isDefaultForWalking`; added tests for both flags, clear-other-per-type, and `findDefaultRunningShoeId`/`findDefaultWalkingShoeId`. `strava.service.spec.ts`: mock `findDefaultRunningShoeId` and `findDefaultWalkingShoeId`; sync tests for running-only, walking-only, both, neither; idempotent re-sync still passes correct shoeId (no change to existing workout).
- **Files:** `apps/backend/src/shoes/shoes.service.spec.ts`, `apps/backend/src/strava/strava.service.spec.ts`.

### WP-10: Backend integration tests
- **Plan reference:** §8 Testing Plan (integration).
- **What changed:** `shoes.integration-spec.ts`: PATCH tests use `isDefaultForRunning`/`isDefaultForWalking`; added test “one shoe can be default for both”; findDefaultRunningShoeId/findDefaultWalkingShoeId asserted. `strava.integration-spec.ts`: sync tests use type-specific defaults; added “default walking only” and “both defaults” sync tests; all prisma/shoesService default usage updated to new fields.
- **Files:** `apps/backend/test/shoes.integration-spec.ts`, `apps/backend/test/strava.integration-spec.ts`.
- **Notes:** Migration backfill is covered by the migration SQL (UPDATE ... WHERE is_default = 1); integration tests run against post-migration schema.

## 4. Prisma / Database Changes
### 4.1 Schema changes
- **Shoe:** Removed `isDefault`. Added `isDefaultForRunning Boolean @default(false) @map("is_default_for_running")` and `isDefaultForWalking Boolean @default(false) @map("is_default_for_walking")`.

### 4.2 Migrations
- **Migration:** `20260312120000_replace_default_shoe_with_type_specific_defaults`
- **Commands run:** Migration created manually (migrate dev is interactive); applied with `npx prisma migrate deploy`; then `npx prisma generate`.

### 4.3 Seed/Test data
- **Seed:** No change (seed does not set default shoes).
- **Test migrations:** No references to `isDefault`; no updates needed.

## 5. Backend Changes (NestJS)
### 5.1 Modules / Components touched
- **Modules:** ShoesModule, StravaModule (no structural change).
- **Controllers:** ShoesController (unchanged; DTOs changed).
- **Services:** ShoesService (update logic, findDefaultRunningShoeId, findDefaultWalkingShoeId; removed findDefaultShoeId); StravaService (sync uses type-specific default IDs).
- **Repositories / Prisma:** Prisma only via PrismaService; schema change applied.

### 5.2 Endpoints implemented
| HTTP | Path | Purpose | AuthN/AuthZ | Request DTO | Response DTO | Error cases |
|------|------|---------|-------------|-------------|--------------|-------------|
| GET | /api/shoes | List user's shoes | JWT, USER | — | ShoeResponseDto[] (isDefaultForRunning, isDefaultForWalking) | — |
| GET | /api/shoes/:id | Get one shoe | JWT, USER | — | ShoeResponseDto (same) | 404 |
| PATCH | /api/shoes/:id | Update shoe | JWT, USER | UpdateShoeDto (isDefaultForRunning?, isDefaultForWalking?) | ShoeResponseDto | 404 |

No new endpoints. Sync endpoint unchanged in path/verb; behaviour uses type-specific default shoe IDs.

### 5.3 Validation & Error Handling
- **Validation:** UpdateShoeDto optional booleans `isDefaultForRunning`, `isDefaultForWalking`; class-validator as before. Service enforces at most one default per type by clearing other shoes when setting one.
- **Error mapping:** Unchanged (404 for shoe not found; ownership via findFirst where userId).

## 6. OpenAPI / Contract Changes (if applicable)
- **Files changed:** DTOs in `apps/backend/src/shoes/dto/` (shoe-response.dto.ts, update-shoe.dto.ts). Swagger is generated from NestJS at runtime.
- **Regeneration:** Not applicable; run backend and open `/api/docs` to verify Shoe response and update show `isDefaultForRunning` and `isDefaultForWalking` (no `isDefault`).

## 7. Tests
- **Tests added/updated:**
  - **Unit:** `shoes.service.spec.ts` — update with both flags, clear other per type; findDefaultRunningShoeId / findDefaultWalkingShoeId; one shoe default for both. `strava.service.spec.ts` — sync calls findDefaultRunningShoeId and findDefaultWalkingShoeId; RUNNING gets running default shoeId, WALKING gets walking default; no default for type → shoeId undefined; idempotent re-sync unchanged.
  - **Integration:** `shoes.integration-spec.ts` — PATCH sets default for running/walking; at most one per type; one shoe default for both; findDefault* reflect state. `strava.integration-spec.ts` — sync with default running only, default walking only, both, neither; workout shoeId by type.
- **How to run:** From repo root: `npm run test --workspace=@zapatismo/backend` (unit). From `apps/backend`: `npm run test:integration` (integration; requires MySQL and DATABASE_URL).
- **Coverage summary:** Unit 88 tests; integration 27 tests. All pass. AC-2, AC-3, AC-5, AC-6, AC-7, AC-8 covered by tests above.

## 8. Acceptance Criteria Traceability
| AC ID | Implementation touchpoints (files/functions) | Tests / Verification |
|-------|---------------------------------------------|----------------------|
| AC-1 | Shoe edit (both flags), shoes overview grid badges | Frontend (out of scope); API returns isDefaultForRunning/isDefaultForWalking. |
| AC-2 | Strava sync: assign by type | strava.service.spec (unit); strava.integration-spec (sync with both defaults). |
| AC-3 | Sync: no default walking → walking workouts no shoe | strava.service.spec (running only); strava.integration-spec (default running only). |
| AC-4 | Migration backfill | Migration SQL (UPDATE ... WHERE is_default = 1). |
| AC-5 | At most one default per type | shoes.service.spec (update clears other); shoes.integration-spec (change default). |
| AC-5b | One shoe default for both → both badges | shoes.integration-spec (one shoe default for both). |
| AC-6 | Edit: set both flags on one shoe | shoes.service.spec (update with both true); shoes.integration-spec. |
| AC-7 | Backend unit tests | jest unit: shoes.service.spec, strava.service.spec. |
| AC-8 | Backend integration tests | jest integration: shoes.integration-spec, strava.integration-spec. |
| AC-9 | Sync modal messages and badge labels | Frontend (out of scope). |

## 9. Change Summary
- **Files added:** `prisma/migrations/20260312120000_replace_default_shoe_with_type_specific_defaults/migration.sql`.
- **Files modified:** `prisma/schema.prisma`; `apps/backend/src/shoes/dto/shoe-response.dto.ts`, `apps/backend/src/shoes/dto/update-shoe.dto.ts`, `apps/backend/src/shoes/shoes.service.ts`, `apps/backend/src/shoes/shoes.service.spec.ts`; `apps/backend/src/strava/strava.service.ts`, `apps/backend/src/strava/strava.service.spec.ts`; `apps/backend/test/shoes.integration-spec.ts`, `apps/backend/test/strava.integration-spec.ts`.
- **New/changed endpoints:** None new. GET/PATCH /api/shoes (and GET /api/shoes/:id) response and PATCH body use isDefaultForRunning, isDefaultForWalking instead of isDefault.
- **Prisma migrations:** `20260312120000_replace_default_shoe_with_type_specific_defaults`.
- **Tests:** Unit and integration updated and extended as above; all backend test commands pass.

## 10. Open Points / Risks
- None. Migration backfill is standard; behaviour is a direct extension of the previous default-shoe feature. Frontend (WP-5–WP-8) will need to use the new DTO fields and sync modal messages.
