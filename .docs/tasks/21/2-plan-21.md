# Implementation Plan – 21 – Admin: Create New User

## 0. Scope Check

- Requirement sheet present and reviewed: ✅
- Fits Zapatismo architecture constraints: ✅
- **In-Scope summary (bullets):**
  - "Nutzer anlegen" button on `/users` overview page.
  - UI to enter email, password (min 8), and optional role; submit to existing `POST /api/users`.
  - Success: redirect to `/users`, clear success feedback; new user in list.
  - Error handling: 409 (duplicate email) and validation errors shown; user can correct and retry.
  - Backend unit tests for create-user (success + conflict).
  - Backend integration test(s) for create-user (persistence / API boundary).
- **Out-of-Scope summary (bullets):**
  - Self-registration, password reset, user edit/delete.
  - Changes to create-user API contract or DTOs.
  - Schema/migration changes.
- **Key assumptions (only if explicitly stated in requirements):**
  - Existing create-user API and ADMIN guard remain the single backend contract; auth/role checks unchanged.
  - Password min length 8; no extra complexity rules; frontend and backend both enforce.
- **UNRESOLVED items blocking implementation (if any):** None.

## 1. Architecture Mapping (High-Level)

| Layer | Responsibility for this ticket | Notes |
|-------|--------------------------------|-------|
| Angular (apps/frontend) | Add "Nutzer anlegen" entry point; create-user form (email, password, role); call create API; success redirect and error display; client-side validation (email, password ≥8). | Route already admin-only; no new guards. |
| Backend (apps/backend, NestJS) | No API changes. Add unit tests for `UsersService.create` (success, conflict). Add integration test(s) for user creation (service + DB). | Existing `POST /api/users`, `CreateUserDto`, `UserResponseDto`, ADMIN + RolesGuard. |
| Database (MySQL via Prisma) | None. | No schema changes. |
| OpenAPI contract | No change. | Existing spec already documents create endpoint and DTOs. |
| Docker/Compose | No change. | — |
| iOS (apps/app-ios) | Not applicable. | — |

## 2. Work Breakdown Structure (WBS)

- **WP-1: Backend unit tests for user creation**
  - Goal: Cover `UsersService.create` success and duplicate-email conflict with mocked Prisma.
  - Affected area(s): backend
  - Depends on: none
  - Deliverables: Extended `apps/backend/src/users/users.service.spec.ts` with describe('create') tests: success returns UserResponseDto and hashes password; duplicate email throws ConflictException.

- **WP-2: Backend integration test for user creation**
  - Goal: Verify create-user flow with real DB (persistence and conflict behaviour).
  - Affected area(s): backend
  - Depends on: none
  - Deliverables: New `apps/backend/test/users.integration-spec.ts`: create user via UsersService, assert persisted (findOne/count); create again with same email, assert ConflictException; cleanup or use unique emails to avoid polluting DB.

- **WP-3: Frontend UsersService create method**
  - Goal: Expose `POST /api/users` to the Angular app.
  - Affected area(s): frontend
  - Depends on: none
  - Deliverables: Add `create(dto: { email: string; password: string; role?: Role })` in `apps/frontend/src/app/core/services/users.service.ts` returning `Observable<User>`; use `User` model (dates as strings from JSON).

- **WP-4: Create-user page and route**
  - Goal: Dedicated page for entering new user data (email, password, role) with validation and submit.
  - Affected area(s): frontend
  - Depends on: WP-3
  - Deliverables: New component (e.g. `apps/frontend/src/app/features/users/user-create.component.ts`) with reactive form: email, password (type=password, min 8), role (dropdown ADMIN/USER, default USER). Submit calls `UsersService.create`; on success navigate to `/users` with optional success feedback; on error (409 or 4xx/5xx) set form error message. Cancel/back to `/users`. Add route `path: 'users/new'` as a sibling of `path: 'users'` in `app.routes.ts` (same layout children), with `adminGuard`. Use Tailwind + daisyUI (form controls, buttons, alerts).

- **WP-5: "Nutzer anlegen" button on users overview**
  - Goal: Entry point for create flow from the users list.
  - Affected area(s): frontend
  - Depends on: WP-4
  - Deliverables: In `apps/frontend/src/app/features/users/user-list.component.ts`, add a button labeled "Nutzer anlegen" that navigates to `/users/new` (e.g. `routerLink="/users/new"`). Page is already admin-only, so no extra role check needed.

- **WP-6: Success feedback and error handling on list**
  - Goal: After redirect from create page, show success message if desired; ensure list refetches so new user appears.
  - Affected area(s): frontend
  - Depends on: WP-4, WP-5
  - Deliverables: On create success, navigate with query param or state (e.g. `success=new`) and in `UserListComponent` refetch list on init; optionally show a short success alert when `success=new`. Map API errors: 409 → "Diese E-Mail-Adresse wird bereits verwendet" (or equivalent); 4xx/5xx → generic error message.

## 3. Backend Plan (NestJS)

### 3.1 Modules / Components to touch

- Module(s): None (UsersModule already has create endpoint).
- Controller(s): None (no contract change).
- Service(s): None (behaviour unchanged; only tests added).
- Repository/Prisma access layer: None.

### 3.2 REST Endpoints

| HTTP | Path | Purpose | Request DTO | Response DTO | AuthN/AuthZ | Errors |
|------|------|---------|-------------|--------------|-------------|--------|
| POST | /api/users | Create user (unchanged) | CreateUserDto | UserResponseDto | JWT + ADMIN | 409 Conflict (duplicate email), 400 validation |

No new endpoints. Existing endpoint remains as-is.

### 3.3 Validation & Error Handling

- Input validation: Already in place via `CreateUserDto` (class-validator: `@IsEmail`, `@MinLength(8)` for password, `@IsOptional()` `@IsEnum(Role)` for role). Global `ValidationPipe` in `main.ts`.
- Domain validation: Service checks duplicate email and throws `ConflictException` (HTTP 409).
- Error mapping: 409 → "A user with this email already exists"; 400 from ValidationPipe for invalid body.
- Logging/Auditing: Do not log request body (passwords). No new logging required.

## 4. Data / Prisma Plan

### 4.1 Prisma schema changes

- None.

### 4.2 Migration steps

- Not applicable.

## 5. OpenAPI / Contract Plan

- No spec or DTO changes. Create endpoint and DTOs are already documented.
- Frontend: Add `create()` method to `UsersService` using existing `CreateUserDto` shape (email, password, role?) and `User` model for response; no client regeneration needed (hand-typed models).

## 6. Frontend Plan (Angular)

### 6.1 UX / Screens / Routes

- Screens affected: Users overview (`UserListComponent`), new create-user page (new component).
- Routes affected: Add child route `users/new` → create-user component; keep `users` list as-is. Both under existing `adminGuard` (parent or child).
- Components to add/modify: Add `UserCreateComponent` (or equivalent name); modify `UserListComponent` to add "Nutzer anlegen" button and optional success-message handling.

### 6.2 Data flow

- Services: `UsersService.create(dto)` → `POST /api/users`; success returns created user; errors via `HttpErrorResponse`.
- State: Form state in create component; list refetched on init when navigating back to `/users`.
- Error display: Form-level error signal or template variable; show API error message (409 → email in use; else generic).

### 6.3 Frontend validations

| Validation | Location (Frontend/Backend) | Rationale |
|------------|-----------------------------|-----------|
| Email format | Both | UX feedback before submit; API rejects invalid. |
| Password non-empty, min length 8 | Both | FR-6; backend enforces, frontend avoids unnecessary calls. |
| Role allowed value | Both | Dropdown limits options; API validates enum. |

## 7. iOS App Plan (ONLY if required)

- Not applicable.

## 8. Testing Plan

- **Backend tests (required):**
  - **Unit:** Extend `apps/backend/src/users/users.service.spec.ts`. Cover `UsersService.create`: (1) success — mock `findUnique` (null), `create` (return user), assert returned DTO and that `create` was called with hashed password (bcrypt hash shape); (2) conflict — mock `findUnique` (existing user), assert `ConflictException` and `create` not called. No other backend unit tests required for this ticket.
  - **Integration:** New file `apps/backend/test/users.integration-spec.ts`. Use same pattern as `workouts.integration-spec.ts` / `shoes.integration-spec.ts`: `ConfigModule`, `PrismaModule`, `UsersService`. Tests: (1) create user with email, password, optional role → assert returned DTO, then `prisma.user.findUnique` or `findOne` to confirm persistence; (2) create again with same email → expect `ConflictException`. Use unique email (e.g. `create-user-integration-<timestamp>@test.local`) to avoid clashes; optionally delete created user in afterEach. Precondition: MySQL running, `DATABASE_URL` set (e.g. test DB in CI).
- **Frontend tests:** No explicit requirement for new unit or E2E tests in the requirement sheet; plan does not mandate new frontend test files. If the project later adds E2E for admin flows, "create user from list" can be covered then.
- **Contract/OpenAPI:** No change; no new contract tests.

## 9. Acceptance Criteria Traceability

| AC ID | Implementation touchpoints | Test(s) / Verification |
|-------|----------------------------|-------------------------|
| AC-1 | WP-5: "Nutzer anlegen" button on user list | Manual: load /users as admin, confirm button visible. |
| AC-2 | WP-4: Create form with email, password, role | Manual: click button, confirm form fields. |
| AC-3 | WP-3, WP-4, WP-6: Submit valid data, API called, redirect, list shows new user | Manual: submit valid data, check redirect and list; integration test: create via service and assert persistence. |
| AC-4 | WP-4, WP-6: 409 handling | Manual: submit existing email, see error; unit test: conflict path. |
| AC-5 | WP-4: Validation (email, password min 8) | Manual: invalid email or short password, submit blocked or errors shown; backend unit tests already cover service; ValidationPipe covers DTO. |
| AC-6 | Existing adminGuard and backend RolesGuard | Manual: non-admin cannot access /users; API returns 403 for non-admin POST. |
| AC-7 | WP-1: Unit tests for create | Run `npm run test --workspace=@zapatismo/backend`; unit tests pass including create success + conflict. |
| AC-8 | WP-2: Integration test for create | Run `npm run test:integration --workspace=@zapatismo/backend` with DB; integration tests pass including users create + persistence. |

## 10. Execution Sequence

1. **Backend unit tests (WP-1):** Extend `users.service.spec.ts` with `create` tests (success, conflict). Run unit tests.
2. **Backend integration test (WP-2):** Add `test/users.integration-spec.ts` for users (create + duplicate). Run integration tests (MySQL up, DATABASE_URL set).
3. **Frontend service (WP-3):** Add `create()` to `UsersService`.
4. **Create-user page (WP-4):** Add `UserCreateComponent`, form (email, password, role), validation, submit, error display, cancel. Add route `users/new` with `adminGuard`.
5. **Button and list (WP-5, WP-6):** Add "Nutzer anlegen" button to `UserListComponent`; implement success redirect and optional success message; refetch list on init so new user appears; map 409 and generic errors.
6. **Manual verification:** Run backend and frontend; as admin, open /users, click "Nutzer anlegen", create user, confirm redirect and list; test duplicate email and validation errors.

## 11. Risks & Open Points (UNRESOLVED)

- None. Create API and auth are existing; scope is limited to UI, tests, and minimal frontend service addition.

---

*Quality gate: Every FR and AC mapped to work items; no schema or API contract change; no implementation code in plan; testing plan specifies unit and integration coverage for create-user.*
