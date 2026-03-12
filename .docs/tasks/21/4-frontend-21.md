# Frontend Implementation Log – 21 – Admin: Create New User

## 0. Inputs
- Requirement sheet: `.docs/tasks/21/1-requirement-21.md`
- Implementation plan: `.docs/tasks/21/2-plan-21.md`
- Frontend conventions: `.docs/system/frontend.md`
- Architecture: `.docs/system/setup-architecture.md`
- Project rules: `.docs/system/project-rules.md`

## 1. Scope Confirmation
- In scope (frontend only): ✅
- Out of scope (backend/prisma/openapi/ios): ✅
- Plan-following mode (no extras): ✅

## 2. Repo Golden Paths Used (References)
Concrete reference files followed:
- **Feature structure reference:** `apps/frontend/src/app/features/shoes/shoe-form.component.ts` — standalone component, reactive form, validation, submit/cancel, formError signal, HttpErrorResponse handling, navigate on success.
- **Routing reference:** `app.routes.ts` — `path: 'shoes/new'` sibling of `path: 'shoes'`, `loadComponent`, `canActivate: [userGuard]`; same pattern for users with adminGuard.
- **Service/API reference:** `apps/frontend/src/app/core/services/users.service.ts` (getAll, getById), `shoes.service.ts` (create returning Observable).
- **Error handling reference:** `shoe-form.component.ts` — `errorMessage(err: HttpErrorResponse)` for 404/403/body.message; form-level `formError` signal; `alert alert-error` for display.
- **Auth/guards reference:** `core/auth/auth.guard.ts` — `adminGuard` for /users; already applied on users route.
- **UI styling reference:** `user-list.component.ts` (table, alert, loading), `shoe-form.component.ts` (form-control, input input-bordered, btn btn-primary, btn-ghost, label).

## 3. Work Executed (Traceable to Plan)

### WP-3: Frontend UsersService create method
- **Plan reference:** Add `create(dto)` in users.service.ts returning `Observable<User>`; use User model.
- **What changed:** Added `CreateUserDto` interface and `create(dto)` method calling `POST /api/users`.
- **Files:** `apps/frontend/src/app/core/services/users.service.ts`
- **Notes:** Response typed as `User` (dates as strings from JSON).

### WP-4: Create-user page and route
- **Plan reference:** New UserCreateComponent with reactive form (email, password min 8, role dropdown), submit/cancel, error display; route `users/new` with adminGuard.
- **What changed:** Created `UserCreateComponent` with reactive form (email, password, role default USER), validation (email format, password min 8), submit → UsersService.create, on success navigate to `/users?success=new`, on error set formError; cancel links to `/users`. Added route `path: 'users/new'` with adminGuard (sibling of `users`, more specific path first).
- **Files:** `apps/frontend/src/app/features/users/user-create.component.ts`, `apps/frontend/src/app/app.routes.ts`
- **Notes:** Password input type=password; form labels in German per "Nutzer anlegen" context.

### WP-5: "Nutzer anlegen" button on users overview
- **Plan reference:** Button labeled "Nutzer anlegen" navigating to `/users/new`.
- **What changed:** Added button/link "Nutzer anlegen" with `routerLink="/users/new"` in UserListComponent.
- **Files:** `apps/frontend/src/app/features/users/user-list.component.ts`
- **Notes:** Page already admin-only via route guard.

### WP-6: Success feedback and error handling on list
- **Plan reference:** On create success navigate with query param success=new; UserListComponent refetch on init; show success alert when success=new; map 409 → "Diese E-Mail-Adresse wird bereits verwendet", 4xx/5xx → generic.
- **What changed:** Create page navigates to `['/users'], { queryParams: { success: 'new' } }`. UserListComponent reads `success=new` from query params and sets successMessage for alert; list is refetched on init (ngOnInit getAll). Error mapping in UserCreateComponent: 409 → "Diese E-Mail-Adresse wird bereits verwendet.", else body.message or generic "Ein Fehler ist aufgetreten. Bitte erneut versuchen."
- **Files:** `apps/frontend/src/app/features/users/user-create.component.ts`, `apps/frontend/src/app/features/users/user-list.component.ts`
- **Notes:** No backend/prisma/openapi changes.

## 4. Routing / Navigation
- **Routes added/changed:** Added `path: 'users/new'` → UserCreateComponent, placed before `path: 'users'` so `/users/new` matches first.
- **Guards applied:** `adminGuard` on both `users/new` and `users`.
- **Navbar changes:** None (plan did not require navbar changes).

## 5. UI Components
| Component | Path | Responsibility | Notes |
|-----------|------|----------------|--------|
| UserCreateComponent | apps/frontend/src/app/features/users/user-create.component.ts | Create-user form: email, password, role; validation; submit/cancel; API error display | New; standalone; Tailwind + daisyUI |
| UserListComponent | apps/frontend/src/app/features/users/user-list.component.ts | Users list; "Nutzer anlegen" button; success alert when ?success=new; load users on init | Modified: button, successMessage, ActivatedRoute for query |

## 6. API Integration

### 6.1 Services
| Service | Path | Endpoints used |
|---------|------|----------------|
| UsersService | apps/frontend/src/app/core/services/users.service.ts | GET /api/users (existing), GET /api/users/:id (existing), POST /api/users (create – added) |

### 6.2 Models
| Model | Path | Notes |
|-------|------|--------|
| User | core/models/user.model.ts | Existing; used as create response type |
| Role | core/models/user.model.ts | Existing; used in form and CreateUserDto |
| CreateUserDto | core/services/users.service.ts | New interface: email, password, role? |

## 7. Validations & Error Handling
- **Frontend validations implemented:** Email: required + Validators.email. Password: required + minLength(8). Role: required, dropdown ADMIN/USER (default USER). Submit disabled when form invalid.
- **Backend error display approach:** Same pattern as shoe-form: formError signal; errorMessage(err) for 409 → "Diese E-Mail-Adresse wird bereits verwendet.", else err.error.message or generic message; alert alert-error in template.
- **Notes:** No plaintext password after submit (input type=password only); no logging of password in frontend.

## 8. Tests (if applicable)
- **Tests added/updated:** None (plan: "No explicit requirement for new unit or E2E tests").
- **How to run:** N/A.
- **Coverage summary:** N/A.

## 9. Acceptance Criteria Traceability
| AC ID | UI touchpoints (components/routes) | Verification / Test |
|-------|-----------------------------------|---------------------|
| AC-1 | UserListComponent: "Nutzer anlegen" button visible on /users | Manual: load /users as admin, confirm button visible |
| AC-2 | UserCreateComponent: form with email, password, role | Manual: click button, confirm form fields |
| AC-3 | UsersService.create, UserCreateComponent submit, redirect to /users, UserListComponent refetch | Manual: submit valid data, check redirect and list |
| AC-4 | UserCreateComponent: 409 → formError "Diese E-Mail-Adresse wird bereits verwendet." | Manual: submit existing email, see error |
| AC-5 | UserCreateComponent: email/password validators, submit disabled when invalid | Manual: invalid email or short password, errors shown |
| AC-6 | adminGuard on users and users/new; backend 403 for non-admin | Existing guards; manual for non-admin |

## 10. Change Summary
- **Files added:** `apps/frontend/src/app/features/users/user-create.component.ts`
- **Files modified:** `apps/frontend/src/app/app.routes.ts`, `apps/frontend/src/app/core/services/users.service.ts`, `apps/frontend/src/app/features/users/user-list.component.ts`
- **Routes added:** `users/new` → UserCreateComponent (adminGuard)
- **API endpoints integrated:** POST /api/users (from UsersService.create), called in UserCreateComponent.onSubmit
- **Notes:** No backend, prisma, openapi, or Docker files modified.

## 11. Open Points / Risks
- None. Create API and auth are existing; scope limited to UI and frontend service.
