# Frontend Implementation Log – 10-1 – Default Shoe for Strava Sync

## 0. Inputs
- Requirement sheet: `.docs/tasks/10-1/1-requirement-10-1.md`
- Implementation plan: `.docs/tasks/10-1/2-plan-10-1.md`
- Frontend conventions: `.docs/system/frontend.md`
- Architecture: `.docs/system/setup-architecture.md`
- Project rules: `.docs/system/project-rules.md`

## 1. Scope Confirmation
- In scope (frontend only): ✅
- Out of scope (backend/prisma/openapi/ios): ✅
- Plan-following mode (no extras): ✅

## 2. Repo Golden Paths Used (References)
Concrete reference files you followed:
- Feature structure reference: `apps/frontend/src/app/features/shoes/` (shoe-form, shoes-grid-part, shoes-overview)
- Routing reference: `app.routes.ts` – existing `/shoes`, `/shoes/:id/edit` (userGuard)
- Service/API reference: `core/services/shoes.service.ts` – getList, getOne, update
- Error handling reference: `shoe-form.component.ts` – formError signal, alert alert-error, errorMessage(err)
- Auth/guards reference: `app.routes.ts` – userGuard on shoes routes
- UI styling reference: daisyUI (alert, btn, form-control, label, card, badge, table)

## 3. Work Executed (Traceable to Plan)

### WP-5: Frontend – model and API usage
- Plan reference: Section 6 Frontend Plan; WP-5 in WBS.
- What changed:
  - **Models:** `Shoe` gained `isDefault: boolean`; `UpdateShoePayload` extended with `isDefault?: boolean`.
  - **Shoe edit form:** Added form control `isDefault` (default false). In edit mode only: checkbox "Default shoe for Strava sync" with helper text. On load, patch `isDefault` from shoe. On update submit, payload includes `isDefault`.
  - **Shoes grid:** Default badge (daisyUI `badge badge-primary badge-sm`) next to shoe name when `shoe.isDefault`; `data-cy="shoe-default-badge"`.
  - **Shoes overview list:** New "Default" table column; badge when `shoe.isDefault`, "—" otherwise; same data-cy for E2E.
- Files: `core/models/shoe.model.ts`, `features/shoes/shoe-form.component.ts`, `features/shoes/shoes-grid-part.component.ts`, `features/shoes/shoes-overview.component.ts`
- Notes: No new routes; no new service methods; create payload unchanged (no isDefault sent on create).

## 4. Routing / Navigation
- Routes added/changed: None (existing `/shoes`, `/shoes/:id/edit`).
- Guards applied: userGuard on shoes routes (unchanged).
- Navbar changes: None.

## 5. UI Components
| Component | Path | Responsibility | Notes |
|-----------+------+----------------|-------|
| ShoeFormComponent | features/shoes/shoe-form.component.ts | Add "Default shoe for Strava sync" checkbox in edit mode; include isDefault in update payload | Checkbox only when isEdit() |
| ShoesGridPartComponent | features/shoes/shoes-grid-part.component.ts | Show default badge when shoe.isDefault | Read-only indicator |
| ShoesOverviewComponent | features/shoes/shoes-overview.component.ts | List view: show default indicator (column/badge) | Read-only |

## 6. API Integration
### 6.1 Services
| Service | Path | Endpoints used |
|---------|------+----------------|
| ShoesService | core/services/shoes.service.ts | GET /api/shoes, GET /api/shoes/:id, PATCH /api/shoes/:id (payload includes optional isDefault) |

### 6.2 Models
| Model | Path | Notes |
|-------|------|-------|
| Shoe | core/models/shoe.model.ts | Added isDefault: boolean |
| UpdateShoePayload | core/models/shoe.model.ts | Extended with optional isDefault?: boolean |

## 7. Validations & Error Handling
- Frontend validations implemented: Checkbox only in edit mode (UX). isDefault boolean and ownership/at-most-one enforced by backend.
- Backend error display approach: Existing formError + alert in shoe-form; errorMessage() for 404/403 and body.message.
- Notes: No new error shapes; backend returns same error format.

## 8. Tests (if applicable)
- Plan: E2E optional – extend shoes E2E for set/clear default and overview indicator. No frontend unit tests required by plan.
- Tests added/updated: None in this step (plan says optional).
- How to run: N/A for this ticket unless E2E extended separately.

## 9. Acceptance Criteria Traceability
| AC ID | UI touchpoints (components/routes) | Verification / Test |
|-------|-----------------------------------|----------------------|
| AC-1 | Shoe edit form (checkbox set default), Shoes overview (grid + list default indicator) | Manual: set default, save, reload overview; E2E if added |
| AC-2 | Shoe edit form (clear default), Shoes overview | Manual: clear default, save, check overview |
| AC-3–AC-6 | Backend behaviour | Backend tests (out of scope for step 4) |
| AC-7–AC-8 | Backend tests | Out of scope for frontend step |

## 10. Change Summary
- Files added/modified:
  - `apps/frontend/src/app/core/models/shoe.model.ts` (Shoe: isDefault; UpdateShoePayload: isDefault?)
  - `apps/frontend/src/app/features/shoes/shoe-form.component.ts` (checkbox in edit mode, form control, patch on load, payload on update)
  - `apps/frontend/src/app/features/shoes/shoes-grid-part.component.ts` (default badge when shoe.isDefault)
  - `apps/frontend/src/app/features/shoes/shoes-overview.component.ts` (list: Default column with badge)
  - `.docs/tasks/10-1/4-frontend-10-1.md` (this log)
- Routes added/changed: None
- API endpoints integrated: GET /api/shoes, GET /api/shoes/:id, PATCH /api/shoes/:id (existing; request body extended with optional isDefault)
- Notes: Backend already exposes isDefault in response and accepts it in PATCH; no backend changes in this step.

## 11. Open Points / Risks
- None.
