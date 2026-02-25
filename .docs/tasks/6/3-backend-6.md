# Backend Implementation Log – 6 – Shoe Management in Backoffice (Normal User)

## 0. Inputs
- Requirement sheet: `.docs/tasks/6/1-requirement-6.md`
- Implementation plan: `.docs/tasks/6/2-plan-6.md`
- Architecture: `.docs/system/setup-architecture.md`
- Project rules: `.docs/system/project-rules.md`
- Backend & Prisma: `.docs/system/backend.md`

## 1. Scope Confirmation
- In scope (backend/db only): ✅
- Out of scope (frontend/iOS/etc): ✅
- Plan-following mode (no extras): ✅

## 2. Repo Patterns Used (References)
- Backend module pattern: `apps/backend/src/users/users.module.ts` (controllers, providers, exports)
- Controller pattern: `apps/backend/src/users/users.controller.ts` (thin controller, @ApiTags, @ApiBearerAuth, @Roles + RolesGuard, ParseIntPipe for id, DTOs)
- Validation pattern: `main.ts` ValidationPipe (whitelist, forbidNonWhitelisted, transform); `create-user.dto.ts` class-validator (@IsEmail, @MinLength, etc.) + @ApiProperty
- Error handling pattern: `users.service.ts` (ConflictException, NotFoundException); NestJS maps to 409/404; no custom filter
- Prisma access pattern: Service injects PrismaService (global); no separate repository; `toResponse()` maps Prisma model → DTO
- Test pattern: `users.service.spec.ts` (mock PrismaService, Test.createTestingModule); `test/database.integration-spec.ts` (TestingModule + PrismaModule, real DB)

## 3. Work Executed (Traceable to Plan)

### WP-1: Prisma schema and migration (Shoe model)
- Plan reference: §4 Data / Prisma Plan
- What changed: Added `Shoe` model to `prisma/schema.prisma` with userId, photoUrl, brandName, shoeName, buyingDate, buyingLocation, kilometerTarget, timestamps; relation to User; index on userId. Created migration `20260225122451_add_shoe_model`. Added second migration `20260225122514_add_shoe_kilometer_check` with CHECK constraint for kilometer_target 0–100000.
- Files: `prisma/schema.prisma`, `prisma/migrations/20260225122451_add_shoe_model/migration.sql`, `prisma/migrations/20260225122514_add_shoe_kilometer_check/migration.sql`
- Notes: VARCHAR(75) for brandName/shoeName; buyingLocation optional (String?).

### WP-1b: Test data – shoes for thomas user
- Plan reference: §2 WBS WP-1b, §4.2 Migration steps
- What changed: New test-migration `prisma/test-migrations/00003_shoes_for_thomas.ts` finds user by thomas@zapatismo.local and creates one Shoe ("Thomas Running Shoe") if not already present (idempotent).
- Files: `prisma/test-migrations/00003_shoes_for_thomas.ts`
- Notes: Run `npm run prisma:test-migrations` with NODE_ENV=development (or RUN_TEST_MIGRATIONS=true) to apply.

### WP-2: Backend Shoes module (DTOs, service, controller)
- Plan reference: §3 Backend Plan
- What changed: Created ShoesModule, ShoesController, ShoesService; CreateShoeDto, UpdateShoeDto (PartialType of CreateShoeDto), ShoeResponseDto; all endpoints under /api/shoes with @Roles(Role.USER) and RolesGuard; RequestUser decorator for userId; validation via class-validator on DTOs.
- Files: `apps/backend/src/shoes/*`, `apps/backend/src/auth/decorators/request-user.decorator.ts`, `apps/backend/src/app.module.ts`
- Notes: ADMIN gets 403 (RolesGuard); 404 for not-found or not-owner (no leak).

### WP-3: Backend unit tests (ShoesService)
- Plan reference: §8 Testing Plan
- What changed: `shoes.service.spec.ts` with mocked PrismaService; tests for create (success, optional buyingLocation), findAll (user’s shoes, empty), findOne (success, not found, not owner), update (success, not found, not owner), remove (success, not found, not owner).
- Files: `apps/backend/src/shoes/shoes.service.spec.ts`
- Notes: 14 tests; style aligned with users.service.spec.ts (try/catch for expected exceptions).

### WP-4: Backend integration tests (shoe + DB)
- Plan reference: §8 Testing Plan
- What changed: New `test/shoes.integration-spec.ts`: lists shoes for thomas (from test-migrations), then create/findOne/update/remove flow for a new shoe (cleaned up). Precondition: MySQL, DATABASE_URL, test-migrations applied (thomas + shoe).
- Files: `apps/backend/test/shoes.integration-spec.ts`
- Notes: 2 test cases; depends on 00002_thomas_user and 00003_shoes_for_thomas.

## 4. Prisma / Database Changes

### 4.1 Schema changes
- New model `Shoe`: id, userId (FK User), photoUrl (VarChar 2048), brandName (VarChar 75), shoeName (VarChar 75), buyingDate (Date), buyingLocation (VarChar 255 optional), kilometerTarget (Int), createdAt, updatedAt. Relation User.shoes → Shoe[]; Shoe.user → User. Index on userId. CHECK constraint kilometer_target BETWEEN 0 AND 100000 (second migration).

### 4.2 Migrations
- `20260225122451_add_shoe_model`: creates table shoes with columns and FK.
- `20260225122514_add_shoe_kilometer_check`: adds CHECK (`kilometer_target` >= 0 AND `kilometer_target` <= 100000).
- Commands run: `npx prisma migrate dev --name add_shoe_model`, `npx prisma migrate dev --name add_shoe_kilometer_check` (create-only then edit + apply).

### 4.3 Seed/Test data
- No change to prisma/seed.ts. New test-migration `00003_shoes_for_thomas.ts`; run `npm run prisma:test-migrations` (dev/stage) to apply.

## 5. Backend Changes (NestJS)

### 5.1 Modules / Components touched
- Modules: new ShoesModule; AppModule imports ShoesModule.
- Controllers: new ShoesController (GET/POST /api/shoes, GET/PATCH/DELETE /api/shoes/:id).
- Services: new ShoesService (create, findAll, findOne, update, remove; per-user ownership).
- Repositories: none; service uses PrismaService directly (same pattern as UsersService).
- New: auth/decorators/request-user.decorator.ts (createParamDecorator for request.user / request.user.id).

### 5.2 Endpoints implemented
| HTTP | Path | Purpose | AuthN/AuthZ | Request DTO | Response DTO | Error cases |
|------|------|---------|-------------|-------------|--------------|-------------|
| GET | /api/shoes | List shoes for user | JWT + Role USER | — | ShoeResponseDto[] | 401, 403 |
| POST | /api/shoes | Create shoe | JWT + Role USER | CreateShoeDto | ShoeResponseDto | 400, 401, 403 |
| GET | /api/shoes/:id | Get one shoe (owner only) | JWT + Role USER | — | ShoeResponseDto | 401, 403, 404 |
| PATCH | /api/shoes/:id | Update shoe (owner only) | JWT + Role USER | UpdateShoeDto | ShoeResponseDto | 400, 401, 403, 404 |
| DELETE | /api/shoes/:id | Delete shoe (owner only) | JWT + Role USER | — | 204 void | 401, 403, 404 |

### 5.3 Validation & Error Handling
- Validation: CreateShoeDto / UpdateShoeDto use class-validator (@IsUrl, @MaxLength(75), @IsInt @Min(0) @Max(100000), @IsDateString, @IsOptional for buyingLocation). Global ValidationPipe (whitelist, forbidNonWhitelisted, transform) in main.ts.
- Error mapping: NotFoundException → 404; validation errors → 400 (NestJS default); wrong role (ADMIN) → 403 via RolesGuard; no custom filter.

## 6. OpenAPI / Contract Changes
- OpenAPI is generated from NestJS at runtime; no separate spec file versioned. All DTOs have @ApiProperty / @ApiPropertyOptional; controller has @ApiTags('shoes'), @ApiBearerAuth(), and response decorators (@ApiOkResponse, @ApiCreatedResponse, @ApiNoContentResponse, @ApiNotFoundResponse, @ApiBadRequestResponse, @ApiForbiddenResponse, @ApiUnauthorizedResponse). Verify at `/api/docs` after starting backend.

## 7. Tests
- Unit: `apps/backend/src/shoes/shoes.service.spec.ts` — 14 tests (create, findAll, findOne, update, remove; success and not-found/not-owner).
- Integration: `apps/backend/test/shoes.integration-spec.ts` — 2 tests: list shoes for thomas (fixture data), full CRUD create/findOne/update/remove.
- How to run: From `apps/backend`: `npm run test` (unit only), `npm run test:integration` (integration only). From root: `npm run test --workspace=@zapatismo/backend`, `npm run test:integration --workspace=@zapatismo/backend`. Integration requires MySQL and DATABASE_URL; apply test-migrations for thomas + shoe data.
- Coverage: Unit tests map to AC-8; integration tests map to AC-9 and shoe persistence (AC-3, AC-4, AC-5 touchpoints). AC-10 (DB constraints) covered by schema + CHECK migration and validation at API.

## 8. Acceptance Criteria Traceability
| AC ID | Implementation touchpoints (files/functions) | Tests / Verification |
|-------|---------------------------------------------|----------------------|
| AC-1–AC-6, AC-11, AC-12 | Frontend / E2E — out of scope for backend step | — |
| AC-7 | ShoesService + CreateShoeDto/UpdateShoeDto validation | Unit (service); validation exercised by controller + ValidationPipe |
| AC-8 | ShoesService unit tests | `npm run test` — shoes.service.spec.ts |
| AC-9 | Shoe integration test (DB) | `npm run test:integration` — shoes.integration-spec.ts |
| AC-10 | Prisma schema (VarChar 75, CHECK 0–100000) | Migrations; optional integration test (create with valid ranges) |

## 9. Change Summary
- **Files added:** `prisma/migrations/20260225122451_add_shoe_model/migration.sql`, `prisma/migrations/20260225122514_add_shoe_kilometer_check/migration.sql`, `prisma/test-migrations/00003_shoes_for_thomas.ts`, `apps/backend/src/shoes/shoes.module.ts`, `apps/backend/src/shoes/shoes.controller.ts`, `apps/backend/src/shoes/shoes.service.ts`, `apps/backend/src/shoes/dto/create-shoe.dto.ts`, `apps/backend/src/shoes/dto/update-shoe.dto.ts`, `apps/backend/src/shoes/dto/shoe-response.dto.ts`, `apps/backend/src/shoes/shoes.service.spec.ts`, `apps/backend/src/auth/decorators/request-user.decorator.ts`, `apps/backend/test/shoes.integration-spec.ts`.
- **Files modified:** `prisma/schema.prisma` (Shoe model, User.shoes relation), `apps/backend/src/app.module.ts` (import ShoesModule).
- **New/changed endpoints:** GET/POST /api/shoes, GET/PATCH/DELETE /api/shoes/:id (all new).
- **Prisma migrations:** 20260225122451_add_shoe_model, 20260225122514_add_shoe_kilometer_check.
- **Tests:** shoes.service.spec.ts (unit), shoes.integration-spec.ts (integration).

## 10. Open Points / Risks
- [ ] None. Photo URL format validated with @IsUrl; DB and API enforce 75 chars and 0–100000 km; ADMIN correctly receives 403 on shoe endpoints (RolesGuard + @Roles(Role.USER)).
