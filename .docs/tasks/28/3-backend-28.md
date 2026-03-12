# Backend Implementation Log – 28 – Self-Registration

## 0. Inputs
- Requirement sheet: `.docs/tasks/28/1-requirement-28.md`
- Implementation plan: `.docs/tasks/28/2-plan-28.md`
- Architecture: `.docs/system/setup-architecture.md`
- Project rules: `.docs/system/project-rules.md`
- Backend & Prisma: `.docs/system/backend.md`

## 1. Scope Confirmation
- In scope (backend/db only): ✅
- Out of scope (frontend/iOS/etc): ✅
- Plan-following mode (no extras): ✅

## 2. Repo Patterns Used (References)
- **Backend module pattern:** `apps/backend/src/auth/auth.module.ts` (imports, controllers, providers, exports); `apps/backend/src/users/users.module.ts`.
- **Controller pattern:** `apps/backend/src/auth/auth.controller.ts` (thin: delegate to service, @Public(), Swagger decorators); `apps/backend/src/users/users.controller.ts` (CreateUserDto, Roles, ApiCreatedResponse, ApiConflictResponse).
- **Validation pattern:** Global `ValidationPipe` in `main.ts` (whitelist, forbidNonWhitelisted, transform); DTOs use class-validator (`@IsEmail()`, `@MinLength()`, etc.) and `@ApiProperty()` in `auth/dto/login.dto.ts`, `users/dto/create-user.dto.ts`.
- **Error handling pattern:** `UsersService` throws `ConflictException` for duplicate email; controller catches and rethrows with user-facing message per plan.
- **Prisma access pattern:** `PrismaService` (global via `PrismaModule`); services inject `PrismaService` and use it directly (e.g. `users.service.ts`).
- **Test pattern:** Unit: `users.service.spec.ts` (mock `PrismaService`); integration: `test/users.integration-spec.ts` (TestingModule with ConfigModule, PrismaModule, providers, real DB, cleanup in test).

## 3. Work Executed (Traceable to Plan)
### WP-1: Shared password validation constant
- Plan reference: Section 2 WBS, Section 10 Execution sequence.
- What changed: New package `packages/validation-constants` with `PASSWORD_MIN_LENGTH = 8`; root `package.json` workspaces extended with `packages/*`; backend dependency on `@zapatismo/validation-constants`.
- Files: `package.json`, `packages/validation-constants/package.json`, `packages/validation-constants/tsconfig.json`, `packages/validation-constants/src/index.ts`, `apps/backend/package.json`.
- Notes: Package built with `tsc`; backend consumes built `dist/`.

### WP-2: Backend registration endpoint and DTOs
- Plan reference: Section 3 Backend Plan, Section 3.2 REST Endpoints, Section 3.3 Validation & Error Handling.
- What changed: `RegisterDto` (email, password with `MinLength(PASSWORD_MIN_LENGTH)`); `RegisterResponseDto` (message); `AuthController.register` @Public(), POST, delegates to `UsersService.create` with `role: Role.USER`, maps `ConflictException` to "This email is already registered"; `AuthModule` imports `UsersModule`; `CreateUserDto` uses `PASSWORD_MIN_LENGTH` from shared package.
- Files: `apps/backend/src/auth/dto/register.dto.ts`, `apps/backend/src/auth/dto/register-response.dto.ts`, `apps/backend/src/auth/auth.controller.ts`, `apps/backend/src/auth/auth.module.ts`, `apps/backend/src/users/dto/create-user.dto.ts`.
- Notes: No AuthService change; register lives in controller calling UsersService.

### WP-3: Backend unit tests for registration
- Plan reference: Section 8 Testing Plan (unit).
- What changed: New `auth.controller.spec.ts`: register success (mock UsersService.create, expect 201-style body and create called with email, password, role USER); register duplicate email (mock throws ConflictException, expect ConflictException with message "This email is already registered").
- Files: `apps/backend/src/auth/auth.controller.spec.ts`.
- Notes: Login delegate test included for consistency.

### WP-4: Backend integration test for registration
- Plan reference: Section 8 Testing Plan (integration).
- What changed: New `test/auth.integration-spec.ts`: (1) register with unique email → user in DB with role USER and hashed password, then delete; (2) register same email twice → second throws ConflictException with "This email is already registered", single user in DB, then delete.
- Files: `apps/backend/test/auth.integration-spec.ts`.
- Notes: Uses TestingModule with ConfigModule, PrismaModule, AuthModule; gets AuthController and PrismaService. Precondition: MySQL, DATABASE_URL.

### WP-5: OpenAPI / Swagger
- Plan reference: Section 5 OpenAPI Plan.
- What changed: RegisterDto and register endpoint already had @ApiProperty / @ApiTags / @ApiCreatedResponse / @ApiConflictResponse / @ApiBadRequestResponse; added `RegisterResponseDto` and referenced in @ApiCreatedResponse for response schema.
- Files: `apps/backend/src/auth/dto/register-response.dto.ts`, `apps/backend/src/auth/auth.controller.ts`.
- Notes: Spec is generated from NestJS at runtime; verify at `/api/docs` when backend is running.

## 4. Prisma / Database Changes
### 4.1 Schema changes
- None. User model and role enum unchanged.

### 4.2 Migrations
- None.

### 4.3 Seed/Test data
- None.

## 5. Backend Changes (NestJS)
### 5.1 Modules / Components touched
- **Modules:** AuthModule (imports UsersModule), root package.json (workspaces).
- **Controllers:** AuthController (register action).
- **Services:** UsersService (reused; unchanged).
- **Repositories / Prisma layer:** None new.

### 5.2 Endpoints implemented
| HTTP | Path | Purpose | AuthN/AuthZ | Request DTO | Response DTO | Error cases |
|------|------|---------|-------------|--------------|-------------|-------------|
| POST | `/api/auth/register` | Self-registration | Public (@Public()) | RegisterDto | RegisterResponseDto (201) | 400 validation, 409 email already in use, 500 server |

### 5.3 Validation & Error Handling
- **Validation:** RegisterDto: @IsEmail(), @IsString(), @IsNotEmpty(), @MinLength(PASSWORD_MIN_LENGTH). Global ValidationPipe enforces.
- **Error mapping:** 400 from ValidationPipe; 409 ConflictException("This email is already registered"); 500 on unexpected. No stack in response.
- **Reference:** Same ConflictException and HTTP status usage as in `users.controller.ts` and `users.service.ts`.

## 6. OpenAPI / Contract Changes (if applicable)
- **Files changed:** New `register-response.dto.ts`; controller decorators for register (ApiCreatedResponse type, ApiBadRequestResponse, ApiConflictResponse). RegisterDto already had @ApiProperty with minLength.
- **Regeneration:** None; spec generated at runtime from NestJS.
- **Notes:** Verify at `http://localhost:3000/api/docs` after `npm run start:dev` in apps/backend.

## 7. Tests
- **Tests added/updated:**
  - `src/auth/auth.controller.spec.ts` (new): register success, register duplicate email; login delegate.
  - `test/auth.integration-spec.ts` (new): register creates user in DB with USER role and hashed password; duplicate email returns 409 and no duplicate user.
- **How to run:**
  - Unit: `npm run test --workspace=@zapatismo/backend` or from `apps/backend`: `npm run test`.
  - Integration: `npm run test:integration --workspace=@zapatismo/backend` or from `apps/backend`: `npm run test:integration`. Requires MySQL and DATABASE_URL.
- **Coverage summary:** Register success and duplicate-email paths covered by unit and integration tests; AC-3, AC-4, AC-6, AC-7 addressed.

## 8. Acceptance Criteria Traceability
| AC ID | Implementation touchpoints (files/functions) | Tests / Verification |
|-------|-----------------------------------------------|----------------------|
| AC-3 | AuthController.register, UsersService.create with role USER | auth.controller.spec.ts, auth.integration-spec.ts |
| AC-4 | ConflictException in controller with "This email is already registered" | auth.controller.spec.ts, auth.integration-spec.ts |
| AC-5 | RegisterDto MinLength(PASSWORD_MIN_LENGTH), ValidationPipe | Manual/API: invalid payload → 400; unit test coverage via controller |
| AC-6 | Backend unit tests | npm run test (auth.controller.spec.ts) |
| AC-7 | Backend integration tests | npm run test:integration (auth.integration-spec.ts) |
| AC-8 | CreateUserDto and RegisterDto use PASSWORD_MIN_LENGTH from @zapatismo/validation-constants | create-user.dto.ts, register.dto.ts |

(AC-1, AC-2 are frontend; not in backend scope.)

## 9. Change Summary
- **Files added:** `packages/validation-constants/package.json`, `packages/validation-constants/tsconfig.json`, `packages/validation-constants/src/index.ts`, `apps/backend/src/auth/dto/register.dto.ts`, `apps/backend/src/auth/dto/register-response.dto.ts`, `apps/backend/src/auth/auth.controller.spec.ts`, `apps/backend/test/auth.integration-spec.ts`.
- **Files modified:** `package.json` (workspaces), `apps/backend/package.json` (dependency), `apps/backend/src/auth/auth.controller.ts`, `apps/backend/src/auth/auth.module.ts`, `apps/backend/src/users/dto/create-user.dto.ts`, `apps/backend/jest.config.ts` (transform .ts only to avoid .js warning).
- **New/changed endpoints:** POST `/api/auth/register` (public, 201 + body, 400/409/500).
- **Prisma migrations:** None.
- **Tests:** Unit: auth.controller.spec.ts (4 tests). Integration: auth.integration-spec.ts (2 tests).

## 10. Open Points / Risks
- **Frontend and shared package consumer:** Backend and (future) frontend both depend on `@zapatismo/validation-constants`; frontend will use it in registration and admin user-create (WP-6, WP-8). No risk for backend-only step.
- **validation-constants build:** Package must be built (`npm run build` in packages/validation-constants or from root if a root build script is added) before backend build/run if consuming from dist. Currently built manually; consider adding to root or backend prebuild if needed.
- **Strava integration test:** One pre-existing test in `strava.integration-spec.ts` may be flaky (findDefaultWalkingShoeId); unrelated to this ticket.
