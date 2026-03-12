# Backend Implementation Log – 21 – Admin: Create New User

## 0. Inputs
- Requirement sheet: `.docs/tasks/21/1-requirement-21.md`
- Implementation plan: `.docs/tasks/21/2-plan-21.md`
- Architecture: `.docs/system/setup-architecture.md`
- Project rules: `.docs/system/project-rules.md`
- Backend & Prisma: `.docs/system/backend.md`

## 1. Scope Confirmation
- In scope (backend/db only): ✅
- Out of scope (frontend/iOS/etc): ✅
- Plan-following mode (no extras): ✅

## 2. Repo Patterns Used (References)
List concrete reference files you followed:
- Backend module pattern: `apps/backend/src/users/users.module.ts`
- Controller pattern: `apps/backend/src/users/users.controller.ts`
- Validation pattern: `apps/backend/src/users/dto/create-user.dto.ts` (class-validator), `main.ts` ValidationPipe
- Error handling pattern: `UsersService` throws `ConflictException` for duplicate email; `NotFoundException` for missing user
- Prisma access pattern: `PrismaService` (global) in `UsersService`; direct `this.prisma.user.*` in service
- Test pattern: `apps/backend/src/users/users.service.spec.ts` (unit with mocked Prisma); `apps/backend/test/workouts.integration-spec.ts`, `test/shoes.integration-spec.ts` (ConfigModule + PrismaModule + service, real DB)

## 3. Work Executed (Traceable to Plan)
For each work package (WP-* from the plan):
### WP-1: Backend unit tests for user creation
- Plan reference: §8 Backend tests (unit), §2 WBS WP-1
- What changed: Extended `users.service.spec.ts` with `describe('create')`: (1) success — mock findUnique(null), create(return user), assert UserResponseDto and that create was called with bcrypt hash; (2) conflict — mock findUnique(existing user), assert ConflictException and create not called.
- Files: `apps/backend/src/users/users.service.spec.ts`
- Notes: No code changes to service/controller; tests only.

### WP-2: Backend integration test for user creation
- Plan reference: §8 Backend tests (integration), §2 WBS WP-2
- What changed: New `apps/backend/test/users.integration-spec.ts`: ConfigModule + PrismaModule + UsersService; create user with unique email, assert DTO and persistence via prisma.user.findUnique; create again with same email, assert ConflictException; cleanup created user in afterEach.
- Files: `apps/backend/test/users.integration-spec.ts`
- Notes: Uses unique email per run to avoid clashes; requires MySQL and DATABASE_URL.

## 4. Prisma / Database Changes
### 4.1 Schema changes
- None (plan: no schema changes).

### 4.2 Migrations
- Not applicable.

### 4.3 Seed/Test data
- No changes.

## 5. Backend Changes (NestJS)
### 5.1 Modules / Components touched
- No module/controller/service code changes. Only tests added.

### 5.2 Endpoints implemented
| HTTP | Path | Purpose | AuthN/AuthZ | Request DTO | Response DTO | Error cases |
|------|------|---------|-------------|-------------|--------------|-------------|
| (unchanged) | POST /api/users | Create user | JWT + ADMIN | CreateUserDto | UserResponseDto | 409 duplicate email, 400 validation |

### 5.3 Validation & Error Handling
- Unchanged. CreateUserDto (IsEmail, MinLength(8), optional IsEnum Role); ConflictException for duplicate email.

## 6. OpenAPI / Contract Changes (if applicable)
- None.

## 7. Tests
- **Unit:** `apps/backend/src/users/users.service.spec.ts` — describe('create'): (1) success returns UserResponseDto, create called with bcrypt hash; (2) optional role passed and returned; (3) duplicate email throws ConflictException, create not called.
- **Integration:** `apps/backend/test/users.integration-spec.ts` — (1) create user with unique email, assert DTO and persistence via prisma.user.findUnique, cleanup; (2) create with optional Role.ADMIN, assert role in DB, cleanup; (3) create same email twice, assert ConflictException on second call, cleanup.
- **How to run:** From repo root: `npm run test --workspace=@zapatismo/backend` (unit); `npm run test:integration --workspace=@zapatismo/backend` (integration; requires MySQL at DATABASE_URL, e.g. CI or local with `misc/mysql` Docker).
- **Coverage:** Unit tests cover AC-7 (create success + conflict). Integration tests cover AC-8 (create via service + persistence + conflict).

## 8. Acceptance Criteria Traceability
| AC ID | Implementation touchpoints (files/functions) | Tests / Verification |
|-------|---------------------------------------------|----------------------|
| AC-7 | WP-1: users.service.spec.ts describe('create') | Unit: create success (DTO + hash), optional role, conflict throws and create not called |
| AC-8 | WP-2: test/users.integration-spec.ts | Integration: create + persistence, optional role, duplicate email → ConflictException (run with MySQL) |

## 9. Change Summary
- **Files added:** `apps/backend/test/users.integration-spec.ts`
- **Files modified:** `apps/backend/src/users/users.service.spec.ts`
- **New/changed endpoints:** none
- **Prisma migrations:** none
- **Tests:** Unit: 3 new tests in users.service.spec.ts (create success, optional role, conflict). Integration: 3 tests in users.integration-spec.ts (create + persist, create with role, conflict).

## 10. Open Points / Risks
- Integration tests require MySQL and DATABASE_URL; they are run in CI (see .github/workflows/backend-tests.yml). No code risks.

---

## Traceability: FR → implementation
- **FR-8** (backend create-user behaviour covered by unit tests): WP-1 → users.service.spec.ts describe('create').
- **FR-9** (create flow covered by at least one integration test): WP-2 → users.integration-spec.ts (create + persistence + conflict).
