# Frontend Implementation Log – 6 – Shoe Management in Backoffice (Normal User)

## 0. Inputs
- Requirement sheet: `.docs/tasks/6/1-requirement-6.md`
- Implementation plan: `.docs/tasks/6/2-plan-6.md`
- Frontend conventions: `.docs/system/frontend.md`
- Architecture: `.docs/system/setup-architecture.md`
- Project rules: `.docs/system/project-rules.md`

## 1. Scope Confirmation
- In scope (frontend only): ✅
- Out of scope (backend/prisma/openapi/ios): ✅
- Plan-following mode (no extras): ✅

## 2. Repo Golden Paths Used (References)
Concrete reference files you followed:
- Feature structure reference: `apps/frontend/src/app/features/users/user-list.component.ts` (standalone, signals, service inject, loading/error/list pattern).
- Routing reference: `app.routes.ts` (lazy loadComponent, authGuard, adminGuard as children of layout).
- Service/API reference: `core/services/users.service.ts` (baseUrl from environment.apiUrl, HttpClient get/getById).
- Error handling reference: `features/login/login.component.ts` (errorMessage signal, alert alert-error, HttpErrorResponse handling); `features/users/user-list.component.ts` (error signal, alert alert-error on getAll error).
- Auth/guards reference: `core/auth/auth.guard.ts` (authGuard, adminGuard); `core/auth/auth.service.ts` (hasRole).
- UI styling reference (daisyUI/Tailwind usage): `layout/navbar.component.ts` (navbar, menu, btn, badge); `features/users/user-list.component.ts` (table, table-zebra); login (card, btn-primary, input input-bordered).

## 3. Work Executed (Traceable to Plan)
### WP-5: Frontend route and guard (USER-only shoes)
- Plan reference: Route /shoes and guard so only USER can access; ADMIN redirected.
- What changed: Added `userGuard` in `auth.guard.ts` (allow USER, redirect non-USER to /dashboard). Added routes `shoes`, `shoes/new`, `shoes/:id/edit` with `userGuard`.
- Files: `app/core/auth/auth.guard.ts`, `app/app.routes.ts`.
- Notes: userGuard mirrors adminGuard logic for role USER.

### WP-6: Frontend navbar (Shoes link for USER only)
- Plan reference: Show "Shoes" in menu only for role USER.
- What changed: Navbar "Shoes" link with `@if (auth.hasRole('USER'))`, placed before admin-only "Users".
- Files: `app/layout/navbar.component.ts`.

### WP-7: Frontend shoes feature (overview, form, delete)
- Plan reference: Overview (grid + list), Add Shoe, Edit, Delete with confirmation; form validations maxlength 75, max 100000.
- What changed: Added `core/models/shoe.model.ts`, `core/services/shoes.service.ts`, `features/shoes/shoes-overview.component.ts`, `features/shoes/shoe-form.component.ts`. Overview: grid/list toggle, Add Shoe button, list/grid of shoes with photo and key info, Edit (routerLink to edit), Delete with daisyUI modal confirmation. Form: create (shoes/new) and edit (shoes/:id/edit) with photoUrl, brandName, shoeName, buyingDate, buyingLocation, kilometerTarget; maxlength 75 on name/brand, max 100000 on km target; required and URL pattern on photoUrl.
- Files: `core/models/shoe.model.ts`, `core/services/shoes.service.ts`, `features/shoes/shoes-overview.component.ts`, `features/shoes/shoe-form.component.ts`.
- Notes: Delete confirmation uses a dialog with Cancel and Delete buttons; backend errors shown in form via formError signal.

### WP-8: Cypress E2E (Component Test block for shoe validation)
- Plan reference: Component Test block for shoe form: max length 75 (name, brand), max value 100000 (km target); no real server required.
- What changed: Added `cypress/e2e/shoes/shoes.cy.ts` with "Component Test" describe (assert maxlength 75 on shoe name and brand, max 100000 and min 0 on kilometer target). Added `cypress/e2e/shoes/po/ShoeFormPO.ts`. Used fake JWT in localStorage to visit /shoes/new without real backend. Added e2e/fixtures examples (empty list, list with one shoe via intercept).
- Files: `cypress/e2e/shoes/shoes.cy.ts`, `cypress/e2e/shoes/po/ShoeFormPO.ts`.
- Notes: No mount; E2E visit with stubbed auth (localStorage token).

## 4. Routing / Navigation
- Routes added: `shoes` (overview), `shoes/new` (create form), `shoes/:id/edit` (edit form). All under layout with `userGuard`.
- Guards applied: `userGuard` on all three shoes routes (USER only; ADMIN redirected to /dashboard).
- Navbar changes: "Shoes" link added, visible only when `auth.hasRole('USER')`.

## 5. UI Components
| Component | Path | Responsibility | Notes |
|-----------|------|----------------|--------|
| ShoesOverviewComponent | features/shoes/shoes-overview.component.ts | Grid/list toggle, list shoes with photo and key info, Add Shoe link, Edit/Delete per shoe, delete confirmation modal | Uses signals for shoes, loading, error, viewMode, shoeToDelete, deleting. |
| ShoeFormComponent | features/shoes/shoe-form.component.ts | Create (shoes/new) and edit (shoes/:id/edit) form; photo URL, brand, name, date, location, km target; validations and submit | Resolves id from route for edit; loads shoe and patches form; create/update via ShoesService. |

## 6. API Integration
### 6.1 Services
| Service | Path | Endpoints used |
|---------|------|----------------|
| ShoesService | core/services/shoes.service.ts | GET /api/shoes (getList), GET /api/shoes/:id (getOne), POST /api/shoes (create), PATCH /api/shoes/:id (update), DELETE /api/shoes/:id (delete) |

### 6.2 Models
| Model | Path | Notes |
|-------|------|-------|
| Shoe, CreateShoePayload, UpdateShoePayload | core/models/shoe.model.ts | Aligned with backend ShoeResponseDto and CreateShoeDto. |

## 7. Validations & Error Handling
- Frontend validations implemented: photoUrl required + URL pattern; brandName/shoeName required, maxLength(75); buyingDate required; kilometerTarget required, min(0), max(100000). Input attributes: maxlength="75" on name/brand, min="0" max="100000" on km target.
- Backend error display: formError signal set from HttpErrorResponse (404, 403, or body.message); displayed in alert alert-error above form. Overview: error signal on getList/delete failure with alert.
- Notes: Same pattern as login (errorMessage + alert) and user-list (error + alert).

## 8. Tests (if applicable)
- Tests added: `cypress/e2e/shoes/shoes.cy.ts` (Component Test: maxlength 75 for name/brand, max 100000 and min 0 for km target; e2e/fixtures: empty list and list with one shoe).
- How to run: From `apps/frontend`: `npm run e2e` (Cypress UI) or `npm run e2e:run` (headless). Frontend must be running at baseUrl; Component Test and fixtures do not require backend.
- Coverage summary: AC-11 (form limits) covered by Component Test; AC-1/AC-2/overview visible covered by fixtures.

## 9. Acceptance Criteria Traceability
| AC ID | UI touchpoints (components/routes) | Verification / Test |
|-------|------------------------------------|----------------------|
| AC-1 | Route /shoes, userGuard, ShoesOverviewComponent | Login as USER, click Shoes in menu → overview (grid or list). |
| AC-2 | Overview: grid/list toggle, photo + key info per shoe | Switch view; both grid and list show photo, name, brand, km target. |
| AC-3 | Add Shoe → /shoes/new, form submit, ShoesService.create | Click Add Shoe, fill valid data, submit → redirect to overview with new shoe. |
| AC-4 | Edit on overview → /shoes/:id/edit, form save, ShoesService.update | Edit shoe, save → overview reflects changes. |
| AC-5 | Delete + confirm → ShoesService.delete | Trigger delete, confirm → shoe removed from list. |
| AC-6 | Delete modal Cancel | Trigger delete, cancel → shoe still in list. |
| AC-7 | Form and backend validation errors | Invalid/missing data → formError or backend message shown. |
| AC-11 | Form inputs: maxlength 75, max 100000 | Cypress Component Test: assert attributes. |
| AC-12 | Cypress Component Test block | shoes.cy.ts "Component Test" describe with max length and max value checks. |

## 10. Change Summary
- Files added: `app/core/models/shoe.model.ts`, `app/core/services/shoes.service.ts`, `app/features/shoes/shoes-overview.component.ts`, `app/features/shoes/shoe-form.component.ts`, `cypress/e2e/shoes/shoes.cy.ts`, `cypress/e2e/shoes/po/ShoeFormPO.ts`.
- Files modified: `app/core/auth/auth.guard.ts` (userGuard), `app/app.routes.ts`, `app/layout/navbar.component.ts`.
- Routes added: shoes, shoes/new, shoes/:id/edit (all userGuard).
- API endpoints integrated: GET/POST /api/shoes, GET/PATCH/DELETE /api/shoes/:id.
- Notes: No backend, Prisma, or OpenAPI files modified.

## 11. Open Points / Risks
- [ ] None. Photo URL validation is simple pattern (http(s)://); backend enforces full URL validation.
