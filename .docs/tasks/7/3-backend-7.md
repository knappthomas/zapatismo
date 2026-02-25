# Backend Implementation Log – 7 – Workout Management (Workout Tracking)

## 0. Inputs
- Requirement sheet: `.docs/tasks/7/1-requirement-7.md`
- Implementation plan: `.docs/tasks/7/2-plan-7.md`
- Architecture: `.docs/system/setup-architecture.md`
- Project rules: `.docs/system/project-rules.md`
- Backend & Prisma: `.docs/system/backend.md`

## 1. Scope Confirmation
- In scope (backend/db only): ✅
- Out of scope (frontend/Strava/etc): ✅
- Plan-following mode (no extras): ✅

## 2. Repo Patterns Used (References)
- **Backend module pattern:** `apps/backend/src/shoes/shoes.module.ts` (controller + service, exports service)
- **Controller pattern:** `apps/backend/src/shoes/shoes.controller.ts` (@ApiTags, @ApiBearerAuth, @Roles(Role.USER), @UseGuards(RolesGuard), ParseIntPipe for :id, @RequestUser('id'), Swagger response/error decorators)
- **Validation pattern:** `apps/backend/src/shoes/dto/create-shoe.dto.ts` (class-validator: IsString, IsInt, Min, Max, MaxLength, IsDateString, IsOptional; @ApiProperty / @ApiPropertyOptional); global ValidationPipe in main.ts (whitelist, forbidNonWhitelisted, transform)
- **Error handling pattern:** Services throw NotFoundException (e.g. shoes.service.ts findOne/update/remove); plan adds ConflictException for shoe delete when in use
- **Prisma access pattern:** PrismaService injected in service; no separate repository layer; toResponse() maps entity to DTO
- **Test pattern:** Unit: `apps/backend/src/shoes/shoes.service.spec.ts` (mock PrismaService, test create/findAll/findOne/update/remove success and NotFound); Integration: `apps/backend/test/shoes.integration-spec.ts` (TestingModule with ConfigModule, PrismaModule, provider ShoesService; real DB; thomas user from test-migrations)

## 3. Work Executed (Traceable to Plan)

### WP-1: Prisma schema and migration (Workout model)
- Plan reference: §2 WBS WP-1, §4 Data/Prisma Plan
- What changed: Added `WorkoutType` enum (RUNNING, WALKING), `Workout` model with userId, type, startTime, endTime, steps, distanceKm, location, optional shoeId; relations User.workouts, Shoe.workouts; Workout.user, Workout.shoe (optional); indexes on userId and shoeId; FK shoeId → shoes.id onDelete Restrict.
- Files: `prisma/schema.prisma`
- Notes: Migration `20260225132127_add_workouts` created and applied.

### WP-2: Backend WorkoutsModule (CRUD, DTOs, validation)
- Plan reference: §2 WP-2, §3 Backend Plan
- What changed: New WorkoutsModule with WorkoutsController (GET/POST /workouts, GET/PATCH/DELETE /workouts/:id), WorkoutsService (create, findAll, findOne, update, remove), DTOs CreateWorkoutDto, UpdateWorkoutDto, WorkoutResponseDto (with optional WorkoutShoeSummaryDto). Validation: class-validator on DTOs; service validates endTime ≥ startTime and shoeId belongs to user. USER-only via @Roles(Role.USER) + RolesGuard.
- Files: `apps/backend/src/workouts/*`, `apps/backend/src/app.module.ts`
- Notes: OpenAPI/Swagger via decorators on controller and DTOs.

### WP-3: Shoe delete guard (reject when linked to workouts)
- Plan reference: §2 WP-3, §3.2
- What changed: In ShoesService.remove, before delete: `prisma.workout.count({ where: { shoeId: id } })`; if > 0 throw ConflictException with clear message. ShoesController DELETE :id documents 409 (ApiConflictResponse).
- Files: `apps/backend/src/shoes/shoes.service.ts`, `apps/backend/src/shoes/shoes.controller.ts`
- Notes: No frontend changes.

### WP-4: OpenAPI / Swagger
- Plan reference: §2 WP-4, §5 OpenAPI Plan
- What changed: Workout endpoints and DTOs documented via @ApiTags, @ApiProperty, response/error decorators. Shoes DELETE documents 409. OpenAPI is generated from NestJS at runtime; no separate spec file.
- Files: Controller and DTO decorators only; verify at /api/docs.

### WP-6: Prisma test data migration (workouts)
- Plan reference: §2 WP-6
- What changed: Added `prisma/test-migrations/00004_workouts_for_thomas.ts`: inserts two workouts for thomas@zapatismo.local (one RUNNING linked to Gel-Kayano 32 shoe, one WALKING without shoe). Idempotent; data-only.
- Files: `prisma/test-migrations/00004_workouts_for_thomas.ts`
- Notes: Run with `RUN_TEST_MIGRATIONS=true npm run prisma:test-migrations` or in NODE_ENV=development.

### WP-7: Backend unit tests
- Plan reference: §2 WP-7, §8 Testing Plan
- What changed: `workouts.service.spec.ts`: create (success, optional shoeId, shoeId not user’s, end before start, end equal start), findAll (user’s only, empty), findOne (found, not found, wrong user), update (success, not found, wrong user, end before start, shoeId not user’s), remove (success, not found, wrong user). Extended `shoes.service.spec.ts`: remove throws ConflictException when workout.count > 0; delete when count 0.
- Files: `apps/backend/src/workouts/workouts.service.spec.ts`, `apps/backend/src/shoes/shoes.service.spec.ts`

### WP-8: Backend integration tests
- Plan reference: §2 WP-8, §8
- What changed: `workouts.integration-spec.ts`: list workouts for thomas (from test-migrations), create/findOne/update/remove workout (with and without shoe), create without shoe, reject create when shoeId not user’s. Extended `shoes.integration-spec.ts`: shoe delete rejected with 409 when shoe is linked to a workout; shoe still in DB after failed delete.
- Files: `apps/backend/test/workouts.integration-spec.ts`, `apps/backend/test/shoes.integration-spec.ts`

## 4. Prisma / Database Changes

### 4.1 Schema changes
- Added enum `WorkoutType` (RUNNING, WALKING).
- Added model `Workout`: id, userId, type, startTime, endTime, steps, distanceKm, location, shoeId (optional), createdAt, updatedAt. Relations: User has many Workout; Workout belongs to User; Workout optional belongs to Shoe; Shoe has many Workout. Indexes: workouts(user_id), workouts(shoe_id). FK shoeId → shoes.id ON DELETE RESTRICT.
- User: added `workouts Workout[]`. Shoe: added `workouts Workout[]`.

### 4.2 Migrations
- Migration: `20260225132127_add_workouts`
- Commands run: `npx prisma migrate dev --name add_workouts`, `npx prisma generate` (run by migrate).

### 4.3 Seed/Test data
- No change to prisma/seed.ts. Test data: `00004_workouts_for_thomas.ts` added. Commands: `RUN_TEST_MIGRATIONS=true npm run prisma:test-migrations`.

## 5. Backend Changes (NestJS)

### 5.1 Modules / Components touched
- Modules: New WorkoutsModule; existing ShoesModule (ShoesService only).
- Controllers: New WorkoutsController; ShoesController (DELETE 409 doc).
- Services: New WorkoutsService; ShoesService (remove: workout count check, ConflictException).
- Repositories / Prisma layer: PrismaService only (no separate repository).

### 5.2 Endpoints implemented
| HTTP | Path | Purpose | AuthN/AuthZ | Request DTO | Response DTO | Error cases |
|------|------|---------|-------------|-------------|--------------|-------------|
| GET | /api/workouts | List current user's workouts | USER | — | WorkoutResponseDto[] | 401, 403 |
| POST | /api/workouts | Create workout | USER | CreateWorkoutDto | WorkoutResponseDto | 400, 401, 403 |
| GET | /api/workouts/:id | Get one workout | USER | — | WorkoutResponseDto | 401, 403, 404 |
| PATCH | /api/workouts/:id | Update workout | USER | UpdateWorkoutDto | WorkoutResponseDto | 400, 401, 403, 404 |
| DELETE | /api/workouts/:id | Delete workout | USER | — | void (204) | 401, 403, 404 |
| DELETE | /api/shoes/:id | (existing) Delete shoe | USER | — | 204 | 401, 403, 404, **409** (shoe in use) |

### 5.3 Validation & Error Handling
- Validation: class-validator on CreateWorkoutDto/UpdateWorkoutDto (type enum, IsDateString, IsInt Min/Max 0–100000 steps, IsNumber Min/Max 0–100000 distanceKm, IsString MaxLength(50) location, optional shoeId). Service: endTime ≥ startTime (BadRequestException); shoeId must be user’s shoe (BadRequestException). ShoesService: workout count > 0 → ConflictException.
- Error mapping: 400 (validation / end before start / shoe not user’s); 401 (no/invalid JWT); 403 (wrong role); 404 (workout/shoe not found or not owner); 409 (shoe delete when linked to workouts). Consistent with existing backend (NotFoundException, BadRequestException; added ConflictException).
- Reference: `apps/backend/src/shoes/shoes.service.ts` (NotFoundException pattern).

## 6. OpenAPI / Contract Changes (if applicable)
- Files changed: No standalone OpenAPI file; spec generated from NestJS at runtime.
- Regeneration: N/A; ensure DTOs and controllers have @ApiProperty and @Api*Response decorators; verify at GET /api/docs.
- Notes: New tag "workouts"; workout endpoints and DTOs documented; shoes DELETE documents 409.

## 7. Tests
- Tests added/updated: `apps/backend/src/workouts/workouts.service.spec.ts` (new), `apps/backend/src/shoes/shoes.service.spec.ts` (extended: remove 409 and delete when count 0), `apps/backend/test/workouts.integration-spec.ts` (new), `apps/backend/test/shoes.integration-spec.ts` (extended: 409 when shoe linked to workout).
- How to run: From repo root: `npm run test --workspace=@zapatismo/backend` (unit). `npm run test:integration --workspace=@zapatismo/backend` (integration; MySQL + DATABASE_URL; test-migrations applied). From apps/backend: `npm run test`, `npm run test:integration`.
- Coverage summary: Unit: WorkoutsService create/findAll/findOne/update/remove (success, validation, ownership, end≥start, shoe ownership); ShoesService remove (409 when workouts exist, delete when 0). Integration: workout list/create/get/update/delete for thomas; create without shoe; reject create with non-user shoeId; shoe delete 409 when workout references shoe. Maps to AC-6, AC-8, AC-9, AC-10, AC-11.

## 8. Acceptance Criteria Traceability
| AC ID | Implementation touchpoints (files/functions) | Tests / Verification |
|-------|-----------------------------------------------|------------------------|
| AC-1 | Frontend (out of scope step 3) | — |
| AC-2 | POST /workouts, WorkoutsService.create | workouts.service.spec.ts create; workouts.integration-spec.ts create |
| AC-3 | PATCH /workouts/:id, WorkoutsService.update | workouts.service.spec.ts update; workouts.integration-spec.ts update |
| AC-4 | DELETE /workouts/:id, WorkoutsService.remove | workouts.service.spec.ts remove; workouts.integration-spec.ts remove |
| AC-5 | Frontend (out of scope) | — |
| AC-6 | CreateWorkoutDto/UpdateWorkoutDto validation; service end≥start, shoe ownership | Unit validation tests; integration invalid shoeId |
| AC-7 | create/update with shoeId or null | workouts.integration-spec.ts (with/without shoe) |
| AC-8 | Unit tests | npm run test (workouts + shoes 409) |
| AC-9 | Integration tests | npm run test:integration (workouts + shoe 409) |
| AC-10 | WorkoutsService ensureShoeBelongsToUser | workouts.service.spec.ts create/update; workouts.integration-spec.ts |
| AC-11 | ShoesService.remove workout count → 409 | shoes.service.spec.ts remove 409; shoes.integration-spec.ts 409 |
| AC-12 | 00004_workouts_for_thomas.ts | RUN_TEST_MIGRATIONS=true npm run prisma:test-migrations |

## 9. Change Summary
- Files added: `apps/backend/src/workouts/workouts.module.ts`, `workouts.controller.ts`, `workouts.service.ts`, `workouts.service.spec.ts`, `dto/create-workout.dto.ts`, `dto/update-workout.dto.ts`, `dto/workout-response.dto.ts`; `apps/backend/test/workouts.integration-spec.ts`; `prisma/test-migrations/00004_workouts_for_thomas.ts`; `prisma/migrations/20260225132127_add_workouts/migration.sql`.
- Files modified: `prisma/schema.prisma`; `apps/backend/src/app.module.ts`; `apps/backend/src/shoes/shoes.service.ts`, `shoes.controller.ts`, `shoes.service.spec.ts`; `apps/backend/test/shoes.integration-spec.ts`.
- New/changed endpoints: GET/POST /api/workouts, GET/PATCH/DELETE /api/workouts/:id (new); DELETE /api/shoes/:id (409 when shoe in use).
- Prisma migrations: 20260225132127_add_workouts.
- Tests: workouts.service.spec.ts (new), shoes.service.spec.ts (extended), workouts.integration-spec.ts (new), shoes.integration-spec.ts (extended).

## 10. Open Points / Risks
- [ ] None. Backend implementation is complete and aligned to the plan; frontend and E2E are out of scope for step 3.
