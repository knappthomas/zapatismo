# Frontend Implementation Log – 22 – Bulk Assign Shoe to Workouts

## 0. Inputs
- Requirement sheet: `.docs/tasks/22/1-requirement-22.md`
- Implementation plan: `.docs/tasks/22/2-plan-22.md`
- Frontend conventions: `.docs/system/frontend.md`
- Architecture: `.docs/system/setup-architecture.md`
- Project rules: `.docs/system/project-rules.md`

## 1. Scope Confirmation
- In scope (frontend only): ✅
- Out of scope (backend/prisma/openapi/ios): ✅
- Plan-following mode (no extras): ✅

## 2. Repo Golden Paths Used (References)
Concrete reference files you followed:
- Feature structure reference: `apps/frontend/src/app/features/workouts/workouts-overview.component.ts`, `workouts-list-part.component.ts` (existing workouts feature with modal, list, signals, services).
- Routing reference: `app.routes.ts` – /workouts already exists with userGuard; no route changes.
- Service/API reference: `core/services/workouts.service.ts`, `core/services/shoes.service.ts` – HttpClient, environment.apiUrl, getList/update patterns.
- Error handling reference: `workouts-overview.component.ts` – sync modal: `syncError()` signal, `alert alert-error`, `messageFromSyncError` for API errors; delete confirm modal pattern.
- Auth/guards reference: `app.routes.ts` (userGuard on workouts), `core/auth/auth.guard.ts`.
- UI styling reference: daisyUI `modal`, `modal-box`, `modal-action`, `btn`, `alert`, `table`, `form-control`, `select`; Tailwind utilities.

## 3. Work Executed (Traceable to Plan)
### WP-4: Frontend – Selection state and table select column
- Plan reference: Plan §2 WBS WP-4; §6.1 Components (WorkoutsListPartComponent select column).
- What changed: Added select column at start of workouts table; per-row checkbox; header “select all” checkbox; selection state in overview (signal selectedIds); list-part inputs showSelectColumn, selectedIds and output selectionChange.
- Files: `apps/frontend/src/app/features/workouts/workouts-list-part.component.ts`, `workouts-overview.component.ts`.
- Notes: Optional “select all” implemented (MAY in requirement); indeterminate state on header when partial selection.

### WP-5: Frontend – Toolbar and Assign Shoe action
- Plan reference: Plan §2 WBS WP-5.
- What changed: Toolbar shown when selectedIds().length > 0; “Assign Shoe” button opens assign-shoe modal.
- Files: `apps/frontend/src/app/features/workouts/workouts-overview.component.ts`.
- Notes: Toolbar is a simple bar with count and one button; no navbar changes.

### WP-6: Frontend – Assign-shoe modal
- Plan reference: Plan §2 WBS WP-6; §6.3 validations (shoe required; no shoes → message/disable).
- What changed: Modal with shoe dropdown (ShoesService.getList()), “Update” and “Cancel”; no shoe selected → confirm disabled; no shoes → alert message, no dropdown, confirm disabled.
- Files: `apps/frontend/src/app/features/workouts/workouts-overview.component.ts`.
- Notes: Same daisyUI modal pattern as sync and delete modals; single shoe auto-selected when only one shoe.

### WP-7: Frontend – Call bulk-assign API and refresh
- Plan reference: Plan §2 WBS WP-7; §6.2 Data flow.
- What changed: WorkoutsService.bulkAssignShoe(workoutIds, shoeId); on confirm call API; on success close modal, clear selection, loadWorkouts(); on error show message in modal, keep modal dismissible (FR-11).
- Files: `apps/frontend/src/app/core/services/workouts.service.ts`, `workouts-overview.component.ts`.
- Notes: Error message extracted via messageFromBulkAssignError (same pattern as sync).

## 4. Routing / Navigation
- Routes added/changed: None. /workouts already exists.
- Guards applied: userGuard (unchanged).
- Navbar changes: None.

## 5. UI Components
| Component | Path | Responsibility | Notes |
|-----------|------|----------------|-------|
| WorkoutsListPartComponent | features/workouts/workouts-list-part.component.ts | Table with optional select column; per-row and select-all checkboxes; emit selectionChange. | New inputs: showSelectColumn, selectedIds; new output: selectionChange. |
| WorkoutsOverviewComponent | features/workouts/workouts-overview.component.ts | Selection state; toolbar when ≥1 selected; assign-shoe modal; call bulkAssignShoe and refresh. | New signals and handlers for selection and assign-shoe flow. |

## 6. API Integration
### 6.1 Services
| Service | Path | Endpoints used |
|---------|------|----------------|
| WorkoutsService | core/services/workouts.service.ts | PATCH /api/workouts/bulk-assign-shoe (new), GET /api/workouts (existing, for refresh) |
| ShoesService | core/services/shoes.service.ts | GET /api/shoes (existing, for modal dropdown) |

### 6.2 Models
| Model | Path | Notes |
|-------|------|-------|
| Workout | core/models/workout.model.ts | Existing; bulk-assign response is Workout[]. |
| Shoe | core/models/shoe.model.ts | Existing; used in modal dropdown. |
| BulkAssignShoePayload | core/services/workouts.service.ts | New interface; workoutIds: number[], shoeId: number. |

## 7. Validations & Error Handling
- Frontend validations implemented: At least one workout selected (toolbar/button only shown when selectedIds().length > 0). In modal: at least one shoe selected before confirm (hasValidShoeSelection() disables “Update”); no shoes → alert and no valid selection (FR-8).
- Backend error display approach: Same as sync modal: assignShoeError signal, alert alert-error in modal, messageFromBulkAssignError extracts message from HTTP error (backend validation/ownership errors).
- Notes: No client-side validation of workoutIds/shoeId shape; backend is single source of truth (plan §6.3).

## 8. Tests (if applicable)
- Tests added/updated: None (plan: frontend unit/E2E optional).
- How to run: N/A.
- Coverage summary: Manual verification or future E2E per AC-1–AC-7.

## 9. Acceptance Criteria Traceability
| AC ID | UI touchpoints (components/routes) | Verification / Test |
|-------|-----------------------------------|----------------------|
| AC-1 | List-part: select column, per-row checkboxes; overview: selectedIds, showSelectColumn=true | Load /workouts, confirm column and checkboxes present and selectable |
| AC-2 | Overview: toolbar with “Assign Shoe” when selectedIds().length > 0 | Select row(s), assert toolbar visible |
| AC-3 | Overview: toolbar inside @if (selectedIds().length > 0) | Deselect all, assert toolbar hidden |
| AC-4 | Overview: assign-shoe modal, shoe select, Update/Cancel | Open modal, choose shoe, confirm |
| AC-5 | Overview: confirmAssignShoe → bulkAssignShoe → close modal, selectedIds.set([]), loadWorkouts() | Confirm assign, assert modal closes, list reloads, shoe shown |
| AC-6 | Overview: closeAssignShoeModal without confirm | Open modal, cancel/backdrop, assert no API call |
| AC-7 | Overview: assignShoeModalShoes().length === 0 → alert, hasValidShoeSelection() false → Update disabled | User with no shoes (or mock empty list) |

## 10. Change Summary
- Files added/modified:
  - `apps/frontend/src/app/features/workouts/workouts-list-part.component.ts` (select column, selection I/O)
  - `apps/frontend/src/app/features/workouts/workouts-overview.component.ts` (selection state, toolbar, assign-shoe modal, API wiring)
  - `apps/frontend/src/app/core/services/workouts.service.ts` (bulkAssignShoe, BulkAssignShoePayload)
- Routes added/changed: None.
- API endpoints integrated: PATCH /api/workouts/bulk-assign-shoe (called from WorkoutsOverviewComponent on confirm); GET /api/workouts (refresh); GET /api/shoes (modal).
- Notes: No backend/prisma/openapi/ios files modified. Build and lint pass.

## 11. Open Points / Risks
- None.
