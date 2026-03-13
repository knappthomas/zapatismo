# Frontend Implementation Log – 28 – Self-Registration

## 0. Inputs
- Requirement sheet: `.docs/tasks/28/1-requirement-28.md`
- Implementation plan: `.docs/tasks/28/2-plan-28.md`
- Frontend conventions: `.docs/system/frontend.md`
- Architecture: `.docs/system/setup-architecture.md`
- Project rules: `.docs/system/project-rules.md`

## 1. Scope Confirmation
- In scope (frontend only): ✅
- Out of scope (backend/prisma/openapi/ios): ✅
- Plan-following mode (no extras): ✅

## 2. Repo Golden Paths Used (References)
Concrete reference files you followed:
- Feature structure reference: `apps/frontend/src/app/features/login/login.component.ts`, `apps/frontend/src/app/features/users/user-create.component.ts`
- Routing reference: `apps/frontend/src/app/app.routes.ts` (public route for login; loadComponent pattern)
- Service/API reference: `apps/frontend/src/app/core/auth/auth.service.ts` (login via HttpClient, environment.apiUrl)
- Error handling reference: `login.component.ts` (signal for errorMessage, alert alert-error), `user-create.component.ts` (formError signal, errorMessage(err) for 409/400)
- Auth/guards reference: `app.routes.ts` (no guard on login), `auth.guard.ts`
- UI styling reference: daisyUI (`card`, `btn`, `input`, `alert`), Tailwind; `user-create` for form layout and validation message pattern

## 3. Work Executed (Traceable to Plan)

### WP-6: Frontend registration route and component
- Plan reference: New public route `/register`; registration component with form (email, password), validation using shared PASSWORD_MIN_LENGTH, link back to login, error display for 409/validation; call `POST /api/auth/register`.
- What changed: Added dependency `@zapatismo/validation-constants` to frontend; created `RegisterComponent` with ReactiveFormsModule, email/password validators (required, email, minLength from shared constant), submit → AuthService.register() → redirect to `/login?registered=1` on success; 409 → "This email is already registered.", 400 → backend message; link "Back to sign in" to `/login`. Registered route `/register` in `app.routes.ts` (no guard).
- Files: `apps/frontend/package.json`, `apps/frontend/src/app/app.routes.ts`, `apps/frontend/src/app/features/register/register.component.ts`, `apps/frontend/src/app/core/auth/auth.service.ts`, `apps/frontend/src/app/core/auth/auth.models.ts`.
- Notes: Followed login and user-create patterns for form, signals, and error display.

### WP-7: Frontend login page link and success message
- Plan reference: Login component: link "Register" / "Create account" to `/register`; read query param (e.g. `registered=1`) and show message "Account created. Please sign in."
- What changed: Login template: added link "Create account" with `routerLink="/register"` and `data-cy="login-register-link"`; added `successMessage` signal; in constructor, read `route.snapshot.queryParamMap.get('registered')` and if `'1'` set success message "Account created. Please sign in."; added `alert alert-success` block for success message. Imported `RouterLink` and `ActivatedRoute`.
- Files: `apps/frontend/src/app/features/login/login.component.ts`.
- Notes: Reused existing alert pattern; success shown above error block.

### WP-8: Frontend shared constant usage in admin user create
- Plan reference: Replace local PASSWORD_MIN_LENGTH in user-create component with import from shared package.
- What changed: Removed local `const PASSWORD_MIN_LENGTH = 8`; added `import { PASSWORD_MIN_LENGTH } from '@zapatismo/validation-constants'`; exposed as `passwordMinLength` in template for placeholder and error text; validators unchanged (Validators.minLength(PASSWORD_MIN_LENGTH)).
- Files: `apps/frontend/src/app/features/users/user-create.component.ts`.
- Notes: Same validation and UX; single source of truth for min length.

## 4. Routing / Navigation

- Routes added/changed: **Added** public route `path: 'register'` → `RegisterComponent` (lazy-loaded). No guard.
- Guards applied: None on `/register` (public).
- Navbar changes: None (registration is unauthenticated; no nav link needed).

## 5. UI Components

| Component | Path | Responsibility | Notes |
|-----------|------|----------------|-------|
| RegisterComponent | `features/register/register.component.ts` | Registration form (email, password), client validation with shared PASSWORD_MIN_LENGTH, submit to API, redirect to login with query param on success, show 409/400/generic errors, link back to login | New; standalone; follows login/user-create patterns |
| LoginComponent | `features/login/login.component.ts` | Login form; **added** link "Create account" to `/register`, **added** success message when `?registered=1` | Modified |
| UserCreateComponent | `features/users/user-create.component.ts` | Admin user creation; **changed** to use PASSWORD_MIN_LENGTH from shared package | Modified |

## 6. API Integration

### 6.1 Services

| Service | Path | Endpoints used |
|---------|------|----------------|
| AuthService | `core/auth/auth.service.ts` | `POST /api/auth/register` (new `register(credentials)` method) |

### 6.2 Models

| Model | Path | Notes |
|-------|------|-------|
| RegisterRequest | `core/auth/auth.models.ts` | `{ email: string; password: string }` — matches backend RegisterDto |
| RegisterResponse | `core/auth/auth.models.ts` | `{ message: string }` — matches backend 201 body |

## 7. Validations & Error Handling

- Frontend validations implemented: Email required + Validators.email; password required + Validators.minLength(PASSWORD_MIN_LENGTH) from `@zapatismo/validation-constants`. Inline error messages for invalid/touched fields; submit disabled when form invalid.
- Backend error display approach: Same as login/user-create: signal for error message; 409 → "This email is already registered."; 400 → use `err.error.message` (array joined or string); other → "Registration failed. Please try again." Displayed in `alert alert-error` in register component.
- Notes: No business logic in frontend; backend remains authority for duplicate email and validation.

## 8. Tests (if applicable)

- No frontend unit or E2E tests were added in this step (plan listed optional E2E; no explicit frontend test deliverables for ticket 28).
- How to run: `npm run build` from `apps/frontend` — build passes. If tests are added later: `ng test` (Karma), E2E: `npm run e2e` from frontend.

## 9. Acceptance Criteria Traceability

| AC ID | UI touchpoints (components/routes) | Verification / Test |
|-------|------------------------------------|----------------------|
| AC-1 | Login component: link "Create account" to registration | Manual: on `/login`, link visible (data-cy="login-register-link") |
| AC-2 | Route `/register`, RegisterComponent | Navigate to `/register`; form with email/password and "Create account" visible |
| AC-3 | Register form submit → API → redirect to login with success message | Manual/E2E: submit valid data → redirect to `/login?registered=1` → success message "Account created. Please sign in."; user can sign in |
| AC-4 | Duplicate email: no user created, clear message | Register with existing email → 409 → "This email is already registered." on register page |
| AC-5 | Missing/invalid email or password &lt; 8: validation message | Frontend validators + backend 400; message shown in alert or field errors |
| AC-6 | Backend unit tests | Out of scope (backend step) |
| AC-7 | Backend integration tests | Out of scope (backend step) |
| AC-8 | Shared password util in admin user create and registration | User-create and register both import PASSWORD_MIN_LENGTH from `@zapatismo/validation-constants`; same min length (8) |

## 10. Change Summary

- **Files added:** `apps/frontend/src/app/features/register/register.component.ts`
- **Files modified:** `apps/frontend/package.json` (dependency `@zapatismo/validation-constants`), `apps/frontend/src/app/app.routes.ts` (route `register`), `apps/frontend/src/app/core/auth/auth.service.ts` (register method), `apps/frontend/src/app/core/auth/auth.models.ts` (RegisterRequest, RegisterResponse), `apps/frontend/src/app/features/login/login.component.ts` (link, success message, RouterLink, ActivatedRoute), `apps/frontend/src/app/features/users/user-create.component.ts` (shared PASSWORD_MIN_LENGTH).
- **Routes added:** `/register` (public, no guard).
- **API endpoints integrated:** `POST /api/auth/register` (from AuthService.register()).
- **Notes:** Build passes. Warning: `@zapatismo/validation-constants` is CommonJS (optimization bailout); acceptable for this ticket; ESM can be addressed in package later if needed.

## 11. Open Points / Risks

- [ ] **CommonJS warning:** `@zapatismo/validation-constants` is not ESM — build reports optimization bailout. Low impact; no resolution required for this ticket. If desired later, package could expose ESM build.
- No other open points; scope limited to frontend; no backend/prisma/openapi/ios changes.
