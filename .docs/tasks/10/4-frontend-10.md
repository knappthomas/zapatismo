# Frontend Implementation Log – 10 – Strava Workout Sync

## 0. Inputs
- Requirement sheet: `.docs/tasks/10/1-requirement-10.md`
- Implementation plan: `.docs/tasks/10/2-plan-10.md`
- Frontend conventions: `.docs/system/frontend.md`
- Architecture: `.docs/system/setup-architecture.md`
- Project rules: `.docs/system/project-rules.md`

## 1. Scope Confirmation
- In scope (frontend only): ✅
- Out of scope (backend/prisma/openapi/ios): ✅
- Plan-following mode (no extras): ✅

## 2. Repo Golden Paths Used (References)
Concrete reference files followed:
- **Feature structure reference:** `apps/frontend/src/app/features/workouts/workouts-overview.component.ts` (signals, inject, modal pattern with daisyUI `dialog`/`modal`), `apps/frontend/src/app/features/shoes/shoes-overview.component.ts` (overview + actions, error/loading)
- **Routing reference:** `app.routes.ts` (loadComponent, userGuard for shoes/workouts)
- **Service/API reference:** `core/services/workouts.service.ts` (baseUrl from environment, HttpClient), `core/services/shoes.service.ts`
- **Error handling reference:** workouts-overview (error signal, display in template; delete error message)
- **Auth/guards reference:** `core/auth/auth.guard.ts` (userGuard for USER role), `navbar.component.ts` (auth.hasRole('USER'))
- **UI styling reference:** daisyUI `btn`, `modal`, `modal-box`, `alert`, `card`; Tailwind utilities

## 3. Work Executed (Traceable to Plan)

### WP-5: Frontend – Settings page and Strava section
- **Plan reference:** Section 6.1, 6.2; new route `/settings`, Strava section with connection status, Connect/Disconnect.
- **What changed:** New Settings component with Strava card; Strava service (authorize-url, status, disconnect); new route `/settings` (userGuard); Settings nav link for USER role.
- **Files:** `core/models/strava.model.ts`, `core/services/strava.service.ts`, `features/settings/settings.component.ts`, `app.routes.ts`, `layout/navbar.component.ts`.
- **Notes:** Connect redirects to backend-provided OAuth URL; no secrets in UI. Disconnect calls POST disconnect and refreshes status.

### WP-6: Frontend – Sync Strava on Workouts Overview
- **Plan reference:** Section 6.1, 6.2; "Sync Strava" button, modal with FROM-date (default last-sync or 30 days ago), submit, result/error, refresh list on success.
- **What changed:** Workouts overview: added "Sync Strava" button; inline sync modal with FROM-date input; open modal fetches last-sync and sets default date (or 30 days ago); submit calls POST sync; success shows message and refreshes list, then closes modal; errors shown in modal.
- **Files:** `features/workouts/workouts-overview.component.ts`, `core/services/strava.service.ts`, `core/models/strava.model.ts`.
- **Notes:** FROM-date validated on frontend (not in future); backend remains source of truth for range validity.

## 4. Routing / Navigation
- **Routes added:** `/settings` (lazy-loaded SettingsComponent, canActivate: [userGuard], child of layout).
- **Guards:** userGuard on `/settings` (same as shoes/workouts).
- **Navbar:** Added "Settings" link for USER role (next to Workouts).

## 5. UI Components
| Component | Path | Responsibility | Notes |
|-----------|------|----------------|-------|
| SettingsComponent | features/settings/settings.component.ts | Settings page with Strava section: status, Connect Strava, Disconnect Strava | Standalone; loads status on init; shows error alert on API failure |
| WorkoutsOverviewComponent | features/workouts/workouts-overview.component.ts | Workouts list + "Sync Strava" button + sync modal (FROM-date, Sync/Cancel, result/error) | Extended with sync modal and StravaService; modal inline (daisyUI dialog) |

## 6. API Integration

### 6.1 Services
| Service | Path | Endpoints used |
|---------|------|----------------|
| StravaService | core/services/strava.service.ts | GET /api/strava/authorize-url, GET /api/strava/status, GET /api/strava/last-sync, POST /api/strava/disconnect, POST /api/strava/sync |

### 6.2 Models
| Model | Path | Notes |
|-------|------|-------|
| strava.model.ts | core/models/strava.model.ts | AuthorizeUrlResponse, StravaStatus, LastSyncResponse, SyncRequest, SyncResponse – aligned with backend DTOs |

## 7. Validations & Error Handling
- **Frontend validations:** FROM-date required and must not be in future (sync modal); enforced before calling sync API.
- **Backend error display:** Settings and sync modal show error message from API (err.error?.message or err.message); fallback generic message. Same pattern as existing delete error in workouts-overview.
- **Notes:** No Strava secrets in UI; backend errors (e.g. 502, not connected) surfaced as readable message.

## 8. Tests (if applicable)
- **Tests added/updated:** None (plan: frontend E2E optional; no new frontend unit tests required for this step).
- **How to run:** `npm run e2e` or `npm run e2e:run` from `apps/frontend` for Cypress E2E when added in a later step.
- **Coverage:** N/A for this step.

## 9. Acceptance Criteria Traceability
| AC ID | UI touchpoints (components/routes) | Verification / Test |
|-------|-----------------------------------|----------------------|
| AC-1 | Workouts overview: "Sync Strava" button | Button visible on /workouts (data-cy="sync-strava") |
| AC-2 | Sync modal: FROM-date field, default last-sync or 30 days ago | Modal opens with date pre-filled from GET last-sync or default (data-cy="sync-from-date") |
| AC-3 | Backend sync behaviour | Backend/integration tests (not frontend) |
| AC-4 | After success, next modal open defaults FROM to last sync | Backend updates lastStravaSyncAt; frontend fetches last-sync when opening modal |
| AC-5 | On sync failure: message shown, last-sync not updated | Error shown in modal (data-cy="sync-error"); backend does not update last-sync |
| AC-6 | Settings: Strava section, status, Connect/Disconnect, no secrets | /settings (data-cy="settings-page", "strava-section", "strava-connect"/"strava-disconnect") |
| AC-7, AC-8 | Backend tests | Not frontend |

## 10. Change Summary
- **Files added:** `apps/frontend/src/app/core/models/strava.model.ts`, `apps/frontend/src/app/core/services/strava.service.ts`, `apps/frontend/src/app/features/settings/settings.component.ts`.
- **Files modified:** `apps/frontend/src/app/app.routes.ts`, `apps/frontend/src/app/layout/navbar.component.ts`, `apps/frontend/src/app/features/workouts/workouts-overview.component.ts`.
- **Routes added:** `/settings` (userGuard).
- **API endpoints integrated:** GET strava/authorize-url, GET strava/status, GET strava/last-sync, POST strava/disconnect, POST strava/sync (method + path as in Section 6.1).
- **Notes:** No backend, Prisma, or OpenAPI files modified.

## 11. Open Points / Risks
- None. OAuth callback redirect is handled by backend; frontend only opens authorize URL and displays status after return.
