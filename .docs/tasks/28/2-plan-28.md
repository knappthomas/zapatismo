# Implementation Plan – 28 – Self-Registration

## 0. Scope Check

- Requirement sheet present and reviewed: ✅
- Fits Zapatismo architecture constraints: ✅
- **In-Scope summary (bullets):**
  - Link on login page to registration form; dedicated public registration route and form (email, password).
  - Backend public registration endpoint creating a user with role USER; duplicate-email rejection with clear message.
  - Post-registration redirect to login page with success message; user signs in to access the app.
  - Shared password minimum-length (8) util used by backend and frontend for both admin user creation and registration.
  - Backend unit and integration tests for registration; no schema change.
- **Out-of-Scope summary (bullets):**
  - Email verification, captcha, rate limiting, password reset, changes to admin-only user creation flow.
- **Key assumptions (only if explicitly stated in requirements):** New users get role USER; no email verification; minimal validation; password rule same as admin (min length 8).
- **UNRESOLVED items blocking implementation:** None.

## 1. Architecture Mapping (High-Level)

| Layer | Responsibility for this ticket | Notes |
|-------|--------------------------------|-------|
| Angular (apps/frontend) | Registration route and form; link from login; success redirect and message; use shared password constant in form and in user-create. | Public route `/register`; no auth guard. |
| Backend (apps/backend, NestJS) | Public `POST /api/auth/register`; delegate to existing user-creation logic with fixed role USER; reuse duplicate-email handling. | AuthController + UsersService; no new service for creation logic. |
| Database (MySQL via Prisma) | No schema change. Same User model as today. | — |
| OpenAPI contract | New endpoint and DTO (RegisterDto) documented via Swagger decorators. | Regenerated from NestJS. |
| Docker/Compose | No change. | — |
| iOS (apps/app-ios) | Not in scope. | — |

## 2. Work Breakdown Structure (WBS)

- **WP-1: Shared password validation constant**
  - Goal: Single source of truth for password minimum length (8) used by backend and frontend.
  - Affected area(s): new package (packages/), backend, frontend.
  - Depends on: none.
  - Deliverables: New workspace package exporting `PASSWORD_MIN_LENGTH` (and optionally a short validation doc); backend and frontend depend on it; CreateUserDto and new RegisterDto use it; admin user-create and new registration form use it.

- **WP-2: Backend registration endpoint and DTOs**
  - Goal: Public registration endpoint that creates a user with role USER and returns success or conflict/validation errors.
  - Affected area(s): backend (auth, users).
  - Depends on: WP-1.
  - Deliverables: RegisterDto (email, password with MinLength from shared constant); AuthController `POST register` @Public(); delegation to UsersService.create with role USER; conflict message suitable for “email already registered”; AuthModule imports UsersModule.

- **WP-3: Backend unit tests for registration**
  - Goal: Cover registration behaviour with mocked dependencies (no real DB).
  - Affected area(s): backend.
  - Depends on: WP-2.
  - Deliverables: AuthService or AuthController register flow unit tests: success (user created with USER), duplicate email (ConflictException), validation failures as per existing ValidationPipe behaviour. If register is implemented in controller calling UsersService, unit test the controller with mocked UsersService.

- **WP-4: Backend integration test for registration**
  - Goal: One or more integration tests that hit the registration path with real DB (or full app).
  - Affected area(s): backend.
  - Depends on: WP-2.
  - Deliverables: Integration test(s) e.g. in `test/auth.integration-spec.ts`: POST /api/auth/register success (user in DB with USER role), POST with duplicate email returns 409 and clear message. Precondition: MySQL, DATABASE_URL.

- **WP-5: OpenAPI / Swagger**
  - Goal: Registration endpoint and DTO visible in API docs; no manual spec file.
  - Affected area(s): backend (OpenAPI generated from code).
  - Depends on: WP-2.
  - Deliverables: RegisterDto and controller decorated with @ApiProperty / @ApiTags / @ApiCreatedResponse / @ApiConflictResponse etc.; verify `/api/docs` after implementation.

- **WP-6: Frontend registration route and component**
  - Goal: Public registration page with form (email, password), submit to API, redirect to login with success message.
  - Affected area(s): frontend.
  - Depends on: WP-1, WP-2 (API contract).
  - Deliverables: Route `/register` (public, no guard); new registration component (form, validation using shared PASSWORD_MIN_LENGTH, link back to login, error display for 409/validation); call `POST /api/auth/register`.

- **WP-7: Frontend login page link and success message**
  - Goal: Login page shows link to registration; login page shows success message when arriving after registration.
  - Affected area(s): frontend.
  - Depends on: WP-6.
  - Deliverables: Login component: link “Register” / “Create account” to `/register`; read query param (e.g. `registered=1`) and show message “Account created. Please sign in.” (or equivalent).

- **WP-8: Frontend shared constant usage in admin user create**
  - Goal: Admin user-create form uses the shared password constant so the rule is defined once.
  - Affected area(s): frontend.
  - Depends on: WP-1.
  - Deliverables: Replace local `PASSWORD_MIN_LENGTH` in user-create component with import from shared package; keep same validators and message.

## 3. Backend Plan (NestJS)

### 3.1 Modules / Components to touch

- **Module(s):** AuthModule (import UsersModule; no change to UsersModule).
- **Controller(s):** AuthController (add `POST register`).
- **Service(s):** UsersService (unchanged; reused for create with role USER). AuthService unchanged for login.
- **Repository/Prisma access layer:** None new; UsersService already uses PrismaService.

### 3.2 REST Endpoints

| HTTP | Path | Purpose | Request DTO | Response DTO | AuthN/AuthZ | Errors |
|------|------|---------|-------------|--------------|-------------|--------|
| POST | `/api/auth/register` | Create new user (self-registration) | RegisterDto | 201 + simple success body or 204 | Public (@Public()) | 400 validation, 409 email already in use, 500 server |

- Success: Return 201 with a small JSON body (e.g. `{ "message": "Account created" }`) so client can distinguish success; or 201 with no body / 204. Requirement: redirect to login with success message, so client only needs to know success. 201 with optional body is sufficient.
- Conflict: 409 with message such as “This email is already registered” (align with FR-5).
- Validation: 400 with ValidationPipe error shape (array of field errors).

### 3.3 Validation & Error Handling

- **Input validation approach:** RegisterDto with class-validator: @IsEmail(), @IsString(), @IsNotEmpty(), @MinLength(PASSWORD_MIN_LENGTH) from shared package. ValidationPipe (global) enforces.
- **Domain validation approach:** Duplicate email checked in UsersService.create; throw ConflictException. For the registration endpoint only, the controller should return a user-facing message “This email is already registered” (catch ConflictException from UsersService and rethrow with that message so the API response matches FR-5). Admin create-user flow keeps existing message.
- **Error mapping (HTTP status + payload shape):** 400 from ValidationPipe; 409 ConflictException; 500 on unexpected errors. No stack traces in response.
- **Logging/Auditing:** Log registration attempts (success/failure) without PII or password; align with existing backend logging.

## 4. Data / Prisma Plan

### 4.1 Prisma schema changes

- **Models to add/modify:** None. User model and role enum already support USER.
- **Relations/indices constraints:** None.
- **Backfill / defaults:** None.

### 4.2 Migration steps

- **Migration:** Not required for this ticket.
- **Steps:** N/A.
- **Seed/test data impact:** None.

## 5. OpenAPI / Contract Plan

- **How the OpenAPI spec changes:** New endpoint `POST /api/auth/register` with request body RegisterDto and responses 201, 400, 409. RegisterDto documented with @ApiProperty (email, password with minLength from constant). Spec is generated from NestJS at runtime; no separate spec file to edit.
- **Regeneration steps:** No manual step; Swagger UI at `/api/docs` reflects code after backend run. If a static OpenAPI file is exported for client generation, run the same export step as today (if any).
- **Client impact:** Frontend will call the new endpoint manually (typed DTOs or interface matching RegisterDto). No Angular codegen assumed unless repo already uses it.

## 6. Frontend Plan (Angular)

### 6.1 UX / Screens / Routes

- **Screens affected:** Login (add link + success message); new Registration screen.
- **Routes affected:** New public route `/register`; `/login` unchanged path.
- **Components to add/modify:** New `features/register/register.component.ts` (or `registration.component.ts`); modify `features/login/login.component.ts` (link, query param message).

### 6.2 Data flow

- **Services / API client usage:** Add `register(email, password)` on AuthService (or a small RegisterService) calling `POST /api/auth/register`. Prefer AuthService for consistency with login.
- **State management approach:** No global state; form state and success redirect as today (redirect with query param).
- **Error display patterns:** On 409 show “This email is already registered”; on 400 show validation message(s); generic message on other errors. Reuse pattern from login/user-create (signal for error message, alert in template).

### 6.3 Frontend validations

| Validation | Location (Frontend/Backend) | Rationale |
|------------|-----------------------------|-----------|
| Email required, valid format | Both | Frontend UX; backend authority. |
| Password required, min length 8 | Both (shared constant) | FR-8; frontend for immediate feedback; backend for security. |

## 7. iOS App Plan (ONLY if required)

- Not applicable. No iOS changes in scope.

## 8. Testing Plan

- **Backend tests (required):**
  - **Unit:** Registration flow is in AuthController (calling UsersService). Add `auth.controller.spec.ts`: (1) register success: mock UsersService.create, POST register with valid body, expect 201 and UsersService.create called with email, password, role USER. (2) register duplicate email: mock UsersService.create to throw ConflictException, POST register, expect 409 and response message “This email is already registered”. CreateUserDto and RegisterDto both use shared PASSWORD_MIN_LENGTH (backend validation remains via class-validator). UsersService.create is already unit-tested in `users.service.spec.ts`; update CreateUserDto to use shared constant only. No AuthService change for register.
  - **Integration (DB):** Registration endpoint with real DB: (1) POST /api/auth/register with valid payload → 201, user exists in DB with role USER and hashed password. (2) POST /api/auth/register with same email twice → second request 409, no duplicate user. Precondition: MySQL running, DATABASE_URL (e.g. test DB). File: e.g. `test/auth.integration-spec.ts` (new) or add to existing integration suite. Use NestJS testing (supertest or HttpClient) to hit the app and Prisma to assert DB state.
- **Frontend tests:** Unit: registration component (form validation, submit calls service, redirect on success, error message on 409/400). E2E (Cypress): optional; if present in repo, add scenario: open login → click register → fill form → submit → redirect to login with message → sign in. Not mandated by requirement sheet but aligns with AC-1–AC-5.
- **Contract/OpenAPI:** No separate contract tests specified; manual check of Swagger UI suffices.

## 9. Acceptance Criteria Traceability

| AC ID | Implementation touchpoints | Test(s) / Verification |
|-------|---------------------------|--------------------------|
| AC-1 | Login component template: link to registration | Manual or E2E: on login page, link visible |
| AC-2 | Route `/register` and registration component | Navigate to `/register`, form visible |
| AC-3 | Register endpoint creates user with USER role; frontend redirect to login with success message | Integration test: POST register → user in DB with USER; E2E or manual: submit → redirect to login with message → sign in |
| AC-4 | Duplicate email: no user created, clear message | Unit/integration: second register with same email → 409; frontend shows message |
| AC-5 | Validation: missing/invalid email or password &lt; 8 → no user, validation message | Unit/integration: invalid payload → 400; frontend validators + backend DTO |
| AC-6 | Backend unit tests pass including registration | Run `npm run test --workspace=@zapatismo/backend` |
| AC-7 | Backend integration tests pass including registration | Run integration test command with DB |
| AC-8 | Shared password util used by admin user create and registration | CreateUserDto and RegisterDto use shared constant; user-create and register form use same constant |

## 10. Execution Sequence

1. **Shared package (WP-1):** Create `packages/validation-constants` (or `shared-validators`) with `PASSWORD_MIN_LENGTH = 8`; add `packages/*` to root `package.json` workspaces; add dependency from `apps/backend` and `apps/frontend` to the new package; ensure build/import works.
2. **Backend DTOs and endpoint (WP-2):** Add RegisterDto in `apps/backend/src/auth/dto/register.dto.ts` using shared MinLength; add `POST register` in AuthController, inject UsersService, call `usersService.create({ email, password, role: Role.USER })`; on ConflictException optionally rethrow with message “This email is already registered”; mark endpoint @Public(). Update CreateUserDto to use shared PASSWORD_MIN_LENGTH. AuthModule: import UsersModule.
3. **Backend unit tests (WP-3):** Add or extend auth controller/service spec: register success and duplicate-email cases with mocked UsersService.
4. **Backend integration test (WP-4):** Add `test/auth.integration-spec.ts`: POST /api/auth/register success and duplicate-email with real DB; clean up created user.
5. **OpenAPI (WP-5):** Add Swagger decorators to register endpoint and RegisterDto; run backend and verify `/api/docs`.
6. **Frontend registration (WP-6):** Add route `/register`; create registration component (form, AuthService.register, redirect to `/login?registered=1`, error handling); use shared PASSWORD_MIN_LENGTH in validators and error message.
7. **Frontend login link and success message (WP-7):** In login component add link to `/register`; read query param and show “Account created. Please sign in.” when present.
8. **Frontend admin user-create (WP-8):** Replace local PASSWORD_MIN_LENGTH in user-create component with import from shared package.
9. **Run tests:** Execute backend unit tests, then integration tests; run frontend build and optional E2E.

## 11. Risks & Open Points (UNRESOLVED)

- None. Requirement sheet is clear; shared package and reuse of UsersService.create keep the solution minimal and aligned with architecture.

---

QUALITY GATE (before finishing):

- Every FR and AC from the requirement sheet is mapped to concrete work.
- No architectural drift beyond setup-architecture.md.
- No implementation details/code.
- All uncertainties captured as UNRESOLVED with precise questions.
