# Implementation Plan – 10 – Strava Workout Sync

## 0. Scope Check
- Requirement sheet present and reviewed: ✅
- Fits Zapatismo architecture constraints: ✅
- **In-Scope summary (bullets):**
  - "Sync Strava" button on Workouts Overview; modal with FROM-date (default: last sync date or 30 days ago); backend import from Strava for that range.
  - New Settings page with Strava section: connect/disconnect (OAuth 2.0), connection status; Client ID/Secret in environment only.
  - Import only running and walking; map Strava activity types to internal WorkoutType (RUNNING, WALKING); idempotent import by external activity ID.
  - Persist last-sync date per user for next modal default; sync result and error feedback in UI.
  - Backend unit and integration tests for sync and Strava-related behaviour; optional webhook for deauthorization (Strava API terms).
- **Out-of-Scope summary (bullets):**
  - Other data sources; automatic/scheduled sync; Strava-specific edit/delete UI; native mobile or HealthKit.
- **Key assumptions (from requirements):**
  - Strava is the authorised workout data source; only running and walking imported; mapping from Strava types to WorkoutType is defined; sync is user-triggered from the web UI.
- **UNRESOLVED items blocking implementation:** None. Webhook for deauthorization is in scope as a compliance consideration; plan includes it as an optional/later work package if needed for Strava terms.

## 1. Architecture Mapping (High-Level)
| Layer | Responsibility for this ticket | Notes |
|-------|-------------------------------|-------|
| Angular (apps/frontend) | Workouts Overview: add "Sync Strava" button and sync modal (FROM-date, submit, result/error). New Settings page with Strava section (connection status, Connect/Disconnect). Call backend for authorize URL, status, disconnect, sync. | No Strava secrets; no direct Strava API calls. |
| Backend (apps/backend, NestJS) | New Strava module: OAuth (authorize URL, callback, disconnect), connection status, sync endpoint. Strava API client (token refresh, list activities). Map activities to workout model; idempotent import via WorkoutsService or Prisma. Optional webhook for deauthorization. | Stateless; tokens and secrets in DB/env only. |
| Database (MySQL via Prisma) | Store per-user Strava tokens (and optionally Strava athlete ID for webhook). Store last-sync date per user. Add external ID on Workout for idempotency (not exposed in API). | Prisma Migrate only. |
| OpenAPI contract | New endpoints: GET strava/authorize-url, GET strava/callback, GET strava/status, POST strava/disconnect, POST strava/sync. New DTOs for sync request/response, status response. | No exposure of tokens or externalId. |
| Docker/Compose | No change unless env vars for Strava are documented for local runs. | Optional: document STRAVA_* in .env.development. |
| iOS (apps/app-ios) | N/A | Not in scope. |

## 2. Work Breakdown Structure (WBS)
- **WP-1:** Prisma schema and migration for Strava and sync
  - Goal: Add storage for Strava connection (tokens, athlete ID), last-sync date, and workout external ID for idempotency.
  - Affected area(s): prisma
  - Depends on: —
  - Deliverables: Updated schema; one migration; Prisma client regenerated.

- **WP-2:** Backend Strava module – OAuth and status
  - Goal: Endpoints and logic for authorize URL, OAuth callback (exchange code, store tokens), disconnect (deauthorize + clear), and connection status.
  - Affected area(s): backend
  - Depends on: WP-1
  - Deliverables: StravaModule, controller, service, DTOs; env vars (STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, callback URL).

- **WP-3:** Backend Strava API client and sync
  - Goal: HTTP client for Strava (token refresh, list activities with after/before). Filter running/walking; map to internal WorkoutType; map Strava fields to Workout (start/end time, distance; steps/location per existing schema—e.g. 0 or placeholder when not provided by Strava); idempotent import (by external ID); update last-sync on success.
  - Affected area(s): backend (Strava + Workouts)
  - Depends on: WP-1, WP-2
  - Deliverables: Strava client/service methods; sync endpoint; WorkoutsService extended for idempotent create-by-externalId (or equivalent); sync request/response DTOs.

- **WP-4:** OpenAPI and API contract
  - Goal: Document new Strava endpoints and DTOs in Swagger; keep spec version-controlled.
  - Affected area(s): backend (OpenAPI)
  - Depends on: WP-2, WP-3
  - Deliverables: @Api* decorators; DTOs with @ApiProperty; spec verifiable at /api/docs.

- **WP-5:** Frontend – Settings page and Strava section
  - Goal: New Settings route and page; Strava section showing connection status and Connect/Disconnect actions (OAuth flow via backend URL redirect).
  - Affected area(s): frontend
  - Depends on: WP-4
  - Deliverables: Settings component, route, nav link; Strava settings service calling backend; no secrets in UI.

- **WP-6:** Frontend – Sync Strava on Workouts Overview
  - Goal: "Sync Strava" button; modal with FROM-date (default last sync or 30 days ago), submit, loading and result/error; refresh list on success.
  - Affected area(s): frontend
  - Depends on: WP-4
  - Deliverables: Button and sync modal on workouts-overview; service method for sync and for last-sync/status if needed for default date.

- **WP-7:** Backend unit tests (Strava and sync)
  - Goal: Unit tests for Strava type mapping, idempotency logic, sync flow with mocked Strava client and Prisma.
  - Affected area(s): backend
  - Depends on: WP-2, WP-3
  - Deliverables: *.spec.ts for StravaService (and sync-related WorkoutsService if any); mocks for HTTP and Prisma.

- **WP-8:** Backend integration tests (Strava and sync)
  - Goal: Integration tests for sync endpoint and OAuth callback path with real DB (and mocked Strava HTTP).
  - Affected area(s): backend
  - Depends on: WP-3
  - Deliverables: *.integration-spec.ts covering sync and optionally callback; test DB preconditions.

- **WP-9:** Strava deauthorization webhook (required for go-live)
  - Goal: Endpoint for Strava webhook (subscription verification GET; event POST). On deauthorization, clear stored tokens for that athlete. Required for Strava API terms when going to production.
  - Affected area(s): backend
  - Depends on: WP-2
  - Deliverables: Webhook controller endpoint; lookup by Strava athlete ID; clear connection. Env: STRAVA_WEBHOOK_VERIFY_TOKEN.

## 3. Backend Plan (NestJS)
### 3.1 Modules / Components to touch
- **Module(s):** New `StravaModule`. Optionally extend `WorkoutsModule` or `WorkoutsService` for idempotent create-by-externalId (internal use only, not a new public endpoint).
- **Controller(s):** New `StravaController` (authorize-url, callback, status, disconnect, sync). Optional: webhook endpoint in same or separate controller.
- **Service(s):** New `StravaService` (build authorize URL, exchange code, refresh token, deauthorize, get status); Strava API client (list activities, map types); sync orchestration (fetch activities, filter, map, upsert workouts, update last-sync). `WorkoutsService`: add internal method for idempotent create/upsert by externalId (used only by Strava sync).
- **Repository/Prisma access layer:** Prisma used in StravaService for StravaConnection and User last-sync; WorkoutsService (or Prisma in StravaService) for workout upsert by externalId.

### 3.2 REST Endpoints
| HTTP | Path | Purpose | Request DTO | Response DTO | AuthN/AuthZ | Errors |
|------|-----|---------|-------------|-------------|-------------|--------|
| GET | /api/strava/authorize-url | Return Strava OAuth authorize URL for frontend redirect | — | { url: string } | JWT | 401 |
| GET | /api/strava/callback | OAuth callback: exchange code, store tokens, redirect to frontend Settings | Query: code, (state) | Redirect 302 | Public (Strava redirects here) | 400 on invalid code |
| GET | /api/strava/status | Connection status (connected true/false; no tokens) | — | { connected: boolean } | JWT | 401 |
| POST | /api/strava/disconnect | Deauthorize with Strava and clear stored tokens | — | 204 or 200 | JWT | 401, 502 if Strava fails |
| POST | /api/strava/sync | Run sync for authenticated user; body: fromDate (ISO date) | SyncRequestDto (fromDate) | SyncResponseDto (imported, skipped?, message?) | JWT | 400 invalid date, 401, 502 Strava/auth errors |
| GET | /api/strava/last-sync | Return last successful sync date for FROM-date default | — | { lastSyncAt: string \| null } | JWT | 401 |

Rules: Stateless REST only. No business logic in controllers beyond orchestration/validation. Explicit DTOs; do not expose Prisma entities or tokens.

### 3.3 Validation & Error Handling
- **Input validation:** FROM-date: valid ISO date, not in future; validate in controller/DTO (class-validator).
- **Domain validation:** Sync: user must have Strava connected; valid token (refresh if expired). Reject with clear 4xx/5xx and message.
- **Error mapping:** 400 invalid request; 401 unauthorized; 502 bad gateway for Strava errors; 200/201 with success payload. Do not expose tokens or stack traces.
- **Logging/Auditing:** Log sync start/success/failure and errors; do not log request/response bodies containing tokens or PII.

## 4. Data / Prisma Plan
### 4.1 Prisma schema changes
- **Models to add:** `StravaConnection` (or equivalent): `userId` (FK to User, unique), `stravaAthleteId` (for webhook lookup), `refreshToken`, `accessToken`, `expiresAt`; timestamps. Option: store only refreshToken and derive access when needed (Strava allows refresh to get new access_token).
- **Models to modify:** `User`: add `lastStravaSyncAt` (DateTime?, optional). `Workout`: add `externalId` (String?, unique, indexed) for idempotency; nullable for manually created workouts.
- **Relations/indices:** StravaConnection.userId unique. Workout.externalId unique. Index on Workout(externalId) for fast lookup.
- **Backfill / defaults:** None. Existing workouts have externalId null.

### 4.2 Migration steps
- **Migration name suggestion:** `add_strava_connection_and_workout_external_id`
- **Steps:** Edit `prisma/schema.prisma` (StravaConnection model, User.lastStravaSyncAt, Workout.externalId). Run `npx prisma migrate dev --name add_strava_connection_and_workout_external_id`. Run `npx prisma generate`.
- **Seed/test data impact:** Test migrations can add a StravaConnection for an existing user if integration tests need it; optional.

## 5. OpenAPI / Contract Plan
- **Spec changes:** New tag e.g. `strava`; new endpoints and DTOs (SyncRequestDto, SyncResponseDto, StravaStatusDto, AuthorizeUrlResponseDto). No new fields on existing workout DTOs (externalId stays internal).
- **Regeneration:** OpenAPI is generated from NestJS at runtime; ensure all new DTOs and routes have @ApiProperty and @Api* on controller. Commit any exported spec if the repo version-controls it.
- **Client impact:** Frontend may add typed methods for new endpoints (hand-typed or future OpenAPI client); no change to existing workout types.

## 6. Frontend Plan (Angular)
### 6.1 UX / Screens / Routes
- **Screens affected:** Workouts Overview (button + modal). New Settings page (Strava section).
- **Routes affected:** New route `/settings` (authGuard, userGuard). Workouts overview unchanged path.
- **Components to add/modify:** New `SettingsComponent` (or `SettingsPageComponent`) with Strava section. New `SyncStravaModalComponent` (or inline modal in workouts-overview): FROM-date input, Sync/Cancel, loading and result/error. Modify `WorkoutsOverviewComponent`: add "Sync Strava" button and modal trigger; on success refresh list and close modal.

### 6.2 Data flow
- **Services:** New or extended: `StravaSettingsService` (or `StravaService`) for authorize-url, status, disconnect, sync, last-sync. Uses `HttpClient` and `environment.apiUrl`; auth interceptor attaches JWT.
- **State:** Minimal: modal open/closed and FROM-date in component; last-sync fetched when opening modal to set default. No global Strava state beyond what’s needed for Settings and sync.
- **Error display:** Sync: show error message in modal or toast; do not update last-sync on failure. Settings: show connection status and errors on connect/disconnect.

### 6.3 Frontend validations
| Validation | Location (Frontend/Backend) | Rationale |
|------------|-----------------------------|-----------|
| FROM-date present and not future | Frontend + Backend | UX feedback; backend is source of truth. |
| FROM-date ≤ now | Backend | Reject invalid range. |
| Connect/Disconnect only when logged in | Frontend (guard) + Backend (JWT) | Backend enforces auth. |

## 7. iOS App Plan (ONLY if required)
- Not applicable (N/A).

## 8. Testing Plan
- **Backend – Unit tests:**
  - **StravaService (and mapping):** Map Strava activity type strings (e.g. "Run", "Walk", "Virtual Run") to WorkoutType (RUNNING, WALKING); unknown types excluded. Use mocked HTTP for Strava API responses.
  - **Sync flow:** With mocked Prisma and mocked Strava client: sync returns correct counts; idempotent call (same externalId) does not create duplicate workout; last-sync date updated only on success.
  - **WorkoutsService:** If new method for idempotent create by externalId: unit test with mocked Prisma (findFirst by externalId returns existing vs null; create called only when no existing).
  - Files: `strava.service.spec.ts`, optionally `workouts.service.spec.ts` for new method.
- **Backend – Integration tests:**
  - **Sync endpoint:** Authenticated POST /api/strava/sync with valid fromDate; mock Strava HTTP (e.g. with NestJS custom provider or fetch mock) to return a few activities; assert workouts created in DB with correct externalId and type; assert last-sync updated; second sync with same data does not create duplicates.
  - **OAuth callback:** GET /api/strava/callback?code=... with mocked token exchange; assert StravaConnection and optionally User.lastStravaSyncAt or tokens stored; redirect to frontend URL.
  - **Status:** GET /api/strava/status when connected vs not connected.
  - Preconditions: MySQL running, DATABASE_URL; test user and optionally test StravaConnection. File: `strava.integration-spec.ts` (and/or extend workouts integration if sync is under WorkoutsModule).
- **Frontend – Unit:** Optional; focus on E2E for user flows.
- **Frontend – E2E (Cypress):** Workouts Overview: "Sync Strava" button visible; open modal, FROM-date defaulted (mock last-sync or 30 days); submit sync (mock API success/error); show result or error. Settings: navigate to Settings; Strava section shows status; Connect redirects (or mock); Disconnect (mock) updates status. Add to existing `workouts.cy.ts` or new `strava.cy.ts` / `settings.cy.ts`.
- **Contract/OpenAPI:** Manual or automated check that /api/docs shows new endpoints and DTOs.

## 9. Acceptance Criteria Traceability
| AC ID | Implementation touchpoints | Test(s) / Verification |
|-------|---------------------------|-------------------------|
| AC-1 | Workouts Overview: "Sync Strava" button in template | E2E: button visible on /workouts |
| AC-2 | Modal WITH FROM-date; default from last-sync or 30 days ago | Backend last-sync endpoint; frontend default in modal; E2E |
| AC-3 | Backend calls Strava API; imports only running/walking; idempotent by external ID | Integration test: sync with mocked Strava; unit test mapping and idempotency |
| AC-4 | After success, next modal open defaults FROM to last sync | Backend updates lastStravaSyncAt; frontend fetches last-sync when opening modal; E2E |
| AC-5 | On sync failure: user sees message; last-sync not updated | Backend returns error and does not update lastStravaSyncAt; frontend shows error; E2E/unit |
| AC-6 | Settings: Strava section with status and Connect/Disconnect (OAuth); no secrets | Settings page + Strava section; backend OAuth and status endpoints; E2E |
| AC-7 | Backend unit tests pass for new/changed Strava sync and mapping | WP-7; `npm run test` in backend |
| AC-8 | Backend integration tests pass for sync/DB/Strava boundary | WP-8; `npm run test:integration` in backend |

## 10. Execution Sequence
1. **WP-1:** Prisma schema changes (StravaConnection, User.lastStravaSyncAt, Workout.externalId). Generate and apply migration; `prisma generate`.
2. **WP-2:** Implement StravaModule (controller + service): authorize-url, callback, disconnect, status. Env vars and callback URL configuration.
3. **WP-3:** Implement Strava API client (refresh token, list activities); sync endpoint; filter running/walking; map types; idempotent workout create/upsert; update last-sync. Add WorkoutsService method for create-by-externalId if used.
4. **WP-4:** Add OpenAPI decorators and DTOs for all new endpoints; verify at /api/docs.
5. **WP-5:** Frontend Settings page and Strava section (route, nav link, service, Connect/Disconnect and status).
6. **WP-6:** Frontend Workouts Overview: Sync Strava button, modal (FROM-date, default from last-sync or 30 days), submit, result/error, list refresh.
7. **WP-7:** Backend unit tests (Strava mapping, idempotency, sync with mocks).
8. **WP-8:** Backend integration tests (sync endpoint, callback, status with real DB and mocked Strava).
9. **WP-9:** Webhook endpoint for Strava deauthorization; clear tokens on event (required for go-live).
10. Run full backend test suite and frontend E2E; fix any regressions.

## 11. Risks & Open Points (RESOLVED)
- [x] **Strava env and callback URL** – Add Strava-related variables to `.env` / `apps/backend/.env.development`: `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_CALLBACK_URL`, `FRONTEND_URL`, `STRAVA_WEBHOOK_VERIFY_TOKEN`. Production: set same keys in deployment env; callback URL must match Strava app settings.
- [x] **Webhook for go-live** – Implement webhook (WP-9). Required for Strava API terms when going to production.
- [x] **Rate limits** – Strava default limits (200/15min, 2000/day) are accepted as sufficient for our purpose. Paginate activity list as needed; no extra cap or warning required unless we see issues.

QUALITY GATE (before finishing):
- Every FR and AC from the requirement sheet is mapped to concrete work.
- No architectural drift beyond setup-architecture.md.
- No implementation details/code in the plan.
- Uncertainties captured as above; no blocking UNRESOLVED items for implementation start.
