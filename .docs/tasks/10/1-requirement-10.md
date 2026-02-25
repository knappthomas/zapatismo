# Requirement Sheet – 10 – Strava Workout Sync

## 0. Quick Facts
- **Ticket-ID:** 10
- **Short Description (1 sentence):** Users can sync running and walking workouts from Strava into the Zapatismo Portal via a "Sync Strava" flow (date range, backend import) and configure Strava-related settings on a dedicated Settings page.
- **Goal / Value (max 5 bullets):**
  - Import workout data from Strava into the portal without manual entry.
  - Single, user-driven sync with configurable "from" date (default: last sync date).
  - Only running and walking activities; mapped to existing WorkoutType model.
  - Central place (Settings) for Strava-related configuration required by the integration.
  - Backend-only Strava API usage; idempotent import to avoid duplicates on re-sync.
- **Affected Roles:** Authenticated user (athlete).
- **Affected Modules/Components (conceptual):** Workouts overview (UI + sync trigger), Sync Strava modal (from-date input), Backend sync/import (Strava API client, mapping, persistence), Settings page (Strava config), Last-sync state (per user).
- **In-Scope (max 5 bullets):**
  - "Sync Strava" button on Workouts Overview; modal to choose FROM-date (default: last sync date, or 30 days ago if no previous sync); backend import from Strava for that range.
  - New Settings page for Strava: connect/disconnect Strava account (OAuth 2.0) and view connection status; app-level Client ID/Secret remain in environment only.
  - Import only running and walking activities; map Strava activity types to internal WorkoutType (RUNNING, WALKING).
  - Idempotent import (by external activity identifier) so re-syncs do not create duplicate workouts.
  - Backend unit and integration tests for new/changed sync and Strava-related behaviour.
- **Out-of-Scope (max 5 bullets):**
  - Syncing from sources other than Strava.
  - Automatic/scheduled sync (only user-triggered sync in scope).
  - Editing or deleting Strava-linked workouts in a Strava-specific way (normal CRUD remains).
  - Strava-specific UI beyond sync trigger and Settings (e.g. no Strava activity browser).
  - Native mobile app or HealthKit integration.

## 1. Context & Problem Statement
- **Current State (As-Is):** Workouts are created manually in the portal. There is no integration with Strava; no Settings page exists.
- **Problem / Pain:** Users who record activities in Strava cannot bring that data into Zapatismo without manual re-entry.
- **Target State (To-Be, without implementation details):** User can trigger a sync from the Workouts Overview by choosing a "from" date (defaulting to last sync if available). Backend calls the Strava API, imports only running and walking activities in the chosen range, maps them to the internal workout model, and stores them without duplicates. Strava-related configuration (e.g. connection/credentials or non-secret options) is manageable from a dedicated Settings page. Project rules (secrets in environment, backend-only Strava access) are respected.
- **Assumptions (if any were stated):** Strava is the authorised workout data source; only running and walking are imported; mapping from Strava types to internal WorkoutType is defined; sync is triggered by the user from the web UI.
- **Non-Goals:** Automatic sync; support for other activity types; exposing Strava API keys to the frontend; manual SQL or schema changes outside migrations.

## 2. Stakeholders & Roles
| Role | Goal/Interest | Rights/Constraints |
|------|---------------|-------------------|
| Authenticated user (athlete) | Sync their Strava running/walking workouts into the portal; set FROM-date for sync; access Settings for Strava config. | Can only sync their own data; must be logged in; config must comply with security rules (no secrets in UI). |
| System / Backend | Reliably call Strava API, map activities, persist without duplicates; enforce idempotency and type filtering. | Backend-only Strava access; secrets from environment or secure storage. |

## 3. User Journeys / Use Cases

### UC 1: Trigger Strava sync with FROM-date
- **Primary Actor:** Authenticated user.
- **Trigger:** User clicks "Sync Strava" on the Workouts Overview page.
- **Preconditions:** User is logged in; a modal or popup is shown; user may have a previous sync (then FROM-date is pre-filled).
- **Flow (numbered, precise):**
  1. User clicks "Sync Strava".
  2. System opens a modal (or popup) with a FROM-date field.
  3. System pre-fills FROM-date: if the user had a previous successful sync, use that sync’s date (or equivalent lower bound); otherwise default to 30 days ago.
  4. User may change the FROM-date; "until" is implicitly "now" (or current time).
  5. User confirms (e.g. "Sync" / "Import").
  6. Frontend sends a sync request to the backend with the chosen FROM-date (and user context from session).
  7. Backend calls the Strava API, fetches activities in the range, filters to running and walking, maps to internal workout model, and persists (idempotent by external activity ID).
  8. Backend returns a result (e.g. count imported, or success/error).
  9. System closes the modal and updates the overview (e.g. list refreshes); last-sync date is stored for future defaults.
- **Outcome:** Workouts from Strava in the chosen range appear in the portal; next time the modal opens, FROM-date defaults to this sync.
- **Alternatives / Abort Paths:** User cancels modal (no sync). Backend or Strava error: show clear message; do not update last-sync date on failure.

### UC 2: Configure Strava-related settings
- **Primary Actor:** Authenticated user.
- **Trigger:** User opens the Settings page (e.g. from navigation).
- **Preconditions:** User is logged in; Settings page exists and shows Strava section.
- **Flow (numbered, precise):**
  1. User navigates to Settings.
  2. System displays a Strava section: connection status (e.g. Connected / Not connected) and ability to connect or disconnect Strava (OAuth 2.0 flow; no secrets in UI—Client ID/Secret stay in environment).
  3. User connects Strava (e.g. "Connect Strava" → redirect to Strava → callback → backend stores tokens) or disconnects; status updates accordingly.
  4. After connecting, sync from Workouts Overview can use the stored tokens.
- **Outcome:** User’s Strava account is linked or unlinked; connection status is visible; sync can run when connected.
- **Alternatives / Abort Paths:** User leaves without saving (no change). Validation error: show message and do not save.

## 4. Functional Requirements (MUST/SHOULD/MAY)

| ID | Requirement (clear, atomic) | Priority | Rationale / Value | Notes |
|----|-----------------------------|----------|-------------------|--------|
| FR-1 | A "Sync Strava" button MUST be present on the Workouts Overview page. | MUST | User must be able to start sync from the overview. | |
| FR-2 | Clicking "Sync Strava" MUST open a modal (or popup) where the user can set a FROM-date for the import range; "until" is current time. | MUST | User controls how far back to import. | |
| FR-3 | The FROM-date in the modal MUST default to the date of the last successful sync when available; when there has never been a sync, it MUST default to 30 days ago. | MUST | Sensible default; avoid re-importing same range when possible. | |
| FR-4 | The backend MUST call the Strava API to fetch activities in the requested date range for the authenticated user. | MUST | Core sync behaviour. | |
| FR-5 | The backend MUST import only activities that are running or walking; other activity types MUST be ignored. | MUST | Aligns with existing WorkoutType (RUNNING, WALKING). | |
| FR-6 | The backend MUST map Strava activity types to the internal WorkoutType (RUNNING, WALKING) consistently. | MUST | Single, well-defined mapping. | |
| FR-7 | Import MUST be idempotent: the same Strava activity MUST NOT create duplicate workouts when synced again (e.g. by external activity identifier). | MUST | Re-sync safety; project research. | |
| FR-8 | A dedicated Settings page MUST exist with a Strava section where the user can connect or disconnect their Strava account (OAuth 2.0) and see connection status; app-level Client ID and Client Secret MUST be in environment only, never in the UI. | MUST | Single place for Strava connection; OAuth as required by Strava. | |
| FR-9 | After a successful sync, the system MUST persist the sync date (or equivalent) so the next sync modal can default the FROM-date. | MUST | Enables FR-3. | |
| FR-10 | Strava authentication MUST use OAuth 2.0; credentials and tokens (Client ID, Client Secret, access/refresh tokens) MUST be handled server-side only; frontend MUST NOT receive or display them. | MUST | Security; Strava API requirement. | |
| FR-11 | New or changed backend logic for Strava sync and mapping MUST be covered by unit tests (isolated, no real DB). | MUST | Quality; regression prevention. | |
| FR-12 | Behaviour that touches the database or the Strava API (or its test double) MUST be covered by integration tests. | MUST | Boundary and persistence correctness. | |
| FR-13 | Sync result (success/failure and, on success, e.g. number of workouts imported) SHOULD be shown to the user after the operation. | SHOULD | Clear feedback. | |
| FR-14 | On sync failure (e.g. Strava API error, auth error), the user SHOULD see an understandable error message and last-sync date MUST NOT be updated. | SHOULD | Predictable error behaviour. | |
| FR-15 | The Settings page MAY expose read-only connection status (e.g. "Connected" / "Not connected") if applicable. | MAY | Transparency. | |

## 5. Data & Interfaces (conceptual)
- **Data objects (terms + meaning, no final fields):**
  - **Sync request:** User identity (from session), FROM-date (start of range); "until" is implicit (now).
  - **Sync result:** Success/failure; optionally count of imported workouts and/or errors.
  - **Last-sync state:** Per user, the date (or timestamp) of the last successful sync, used to default the FROM-date in the modal.
  - **Strava configuration:** App-level: Client ID and Client Secret (environment only). Per user: connection status (connected/not connected), ability to connect (OAuth 2.0) or disconnect; backend stores refresh token (and access token/expiry) server-side after OAuth callback.
  - **Workout (internal):** Existing model (e.g. type RUNNING/WALKING, start/end time, distance, etc.); imported activities must fit this model; external identifier used for idempotency is not exposed in the public API contract.
- **Inputs / Outputs (high-level):**
  - **Sync:** In: FROM-date, authenticated user. Out: success/failure, optional counts/messages.
  - **Settings:** In: user edits (within allowed set). Out: current Strava-related config (no secrets); save confirmation or validation errors.
  - **Last-sync:** Read when opening sync modal; updated by backend after successful sync.
- **External systems / integrations:** Strava API (OAuth and activity listing); backend is the only component that talks to Strava.
- **Authorization / AuthN/AuthZ:** User must be authenticated; sync and settings apply to the current user only; Strava tokens/credentials are per user or app-level as designed, never exposed to frontend.

## 6. States, Validations & Error Cases

### 6.1 States / Modes
- **Relevant states / flags:** User has/has not completed a previous sync (drives default FROM-date). Strava connection/configuration valid or invalid (may affect sync availability or error type).
- **Transitions:** First sync → last-sync set after success. Subsequent sync → FROM-date defaulted from last-sync; after success, last-sync updated.

### 6.2 Validations
| Field/Topic | Rule | Error Reaction | Visible Where (UI/API) | Condition |
|-------------|------|----------------|------------------------|-----------|
| FROM-date | Must be a valid date; should not be in the future. | Reject request or show validation message. | Modal / API response | On submit. |
| FROM-date | Should be ≤ "now". | Reject or warn. | Modal | On submit. |
| Strava config | Required fields present and valid for API use. | Do not start sync; show message. | Settings / sync flow | Before or during sync. |

### 6.3 Error Cases / Edge Cases
| Case | Trigger | Expected System Behavior | User Feedback | Category |
|------|---------|---------------------------|---------------|----------|
| Strava API unavailable | Network or Strava outage. | Sync fails; no workouts imported; last-sync unchanged. | Clear error message. | External failure. |
| Strava auth expired or invalid | Token refresh fails or no token. | Sync fails; suggest re-connecting in Settings. | Message + optional link to Settings. | Auth. |
| No activities in range | Strava returns empty list. | Sync succeeds; 0 imported. | Success with "0 workouts imported" or similar. | Normal. |
| Partial import failure | Some activities fail mapping or validation. | Import valid ones; idempotency preserved; optionally report count of skipped/failed. | Success with note or warning if applicable. | Degradation. |
| Duplicate activity (re-sync) | Same Strava activity synced again. | No duplicate workout created. | No error; count may exclude duplicates. | Idempotency. |
| Not running/walking | Activity type not RUNNING or WALKING. | Activity ignored. | Reflected in result (e.g. "X imported, Y skipped"). | Filter. |

## 7. Non-Functional Requirements
- **Security:** Strava client ID, client secret, and tokens only in environment or secure server storage; never in frontend or logs. No PII/credentials in logs.
- **Privacy / Compliance:** Only the authenticated user’s data is synced; Strava data usage must align with Strava’s terms and user consent.
- **Performance / Scalability:** Sync may take several seconds for large ranges; consider timeout and user feedback (e.g. loading state). Respect Strava rate limits (default: 200 requests per 15 minutes, 2,000 per day, per application; see [Strava Getting Started](https://developers.strava.com/docs/getting-started/)).
- **Logging / Auditing:** Log sync start/success/failure and errors without logging request/response bodies that contain tokens or PII.
- **Usability / Accessibility:** Modal and Settings form must be usable (keyboard, focus, labels) and styled with Tailwind/daisyUI.
- **Operability:** Sync is user-triggered; no mandatory background jobs in scope.

## 8. Acceptance Criteria (testable)
- AC-1: Given the user is on the Workouts Overview page, when the page is loaded, then a "Sync Strava" button is visible.
- AC-2: Given the user clicks "Sync Strava", when the modal opens, then a FROM-date field is present and is pre-filled: with the last successful sync date when available, otherwise with 30 days ago.
- AC-3: Given the user has set a FROM-date and confirmed sync, when the backend processes the request, then it calls the Strava API and imports only running and walking activities in the range, and does not create duplicate workouts for the same Strava activity on re-sync.
- AC-4: Given a successful sync, when the user opens the sync modal again, then the FROM-date defaults to the date of the last successful sync.
- AC-5: Given a sync failure (e.g. Strava API error), when the backend returns an error, then the user sees an understandable message and the last-sync date is not updated.
- AC-6: Given the user navigates to Settings, when the Strava section is shown, then the user can see connection status and connect or disconnect their Strava account (OAuth 2.0); no Strava secrets are displayed.
- AC-7: Given the repo and dependencies, when the documented backend unit-test command is run, then all unit tests pass (including tests for new/changed Strava sync and mapping logic).
- AC-8: Given the database (or test double) is available, when the documented backend integration-test command is run, then all integration tests pass (including tests for sync behaviour that uses the DB or Strava boundary).

## 9. Dependencies, Risks, Impact
- **Dependencies:** Strava API availability and rate limits; OAuth and token storage design; existence of a Settings route and navigation entry. Per [Strava Getting Started](https://developers.strava.com/docs/getting-started/), Strava API terms require implementing webhooks to know when an athlete has deauthorized the application—implementation plan should consider webhook support for deauthorization to comply with terms.
- **Risks / open technical uncertainties:** Rate limits on first large import (200/15min, 2,000/day default); token refresh handling under load; webhook endpoint and verification if deauthorization webhooks are implemented.
- **Impact on existing functionality:** Workouts overview gains a button and modal; new Settings page; new backend sync endpoint and possible new persisted state (last-sync, external activity ID for idempotency); no change to existing manual workout CRUD contract.

## 10. Resolved Open Points
- **Strava config in Settings:** Resolved by research (Appendix A). Settings page provides: connect/disconnect Strava (OAuth 2.0) and connection status. Client ID and Client Secret are app-level and stay in environment only; per-user tokens are stored server-side after OAuth.
- **OAuth vs API key:** Resolved. "API-Key" was only an example; Strava requires OAuth 2.0. The system MUST use OAuth 2.0 for Strava authentication.
- **Default FROM-date when no previous sync:** Resolved. Default is **30 days ago** when the user has never completed a sync.

## Appendix A. Strava API – Authentication and Import (Research Summary)

*This appendix summarises what the Strava API requires for valid authentication and import of activity data. It informs FR-8, FR-10 and the Settings/Sync design; it is not implementation specification.*

### App registration
- Application must be registered at [Strava My API Application](https://www.strava.com/settings/api) (see [Getting Started](https://developers.strava.com/docs/getting-started/)).
- Registration yields **Client ID** (integer) and **Client Secret**; the secret must never be shared or stored in the frontend → **environment variables only** for Zapatismo.
- **Authorization Callback Domain:** Must be set in the Strava app settings. For local development use localhost (or similar); for production use the real callback domain. The OAuth `redirect_uri` must match this configuration.

### Authentication (OAuth 2.0)
- **Flow:** Three-legged OAuth 2.0. No long-lived “API key” for user data; OAuth is required.
- **Authorize (web):** Redirect user to `GET https://www.strava.com/oauth/authorize` with query parameters: `client_id`, `redirect_uri`, `response_type=code`, `scope` (e.g. `activity:read_all`). User grants or denies; Strava redirects to `redirect_uri` with `code` (and `scope` accepted).
- **Token exchange:** Backend calls `POST https://www.strava.com/oauth/token` with `client_id`, `client_secret`, `code`, `grant_type=authorization_code`. Response: **access_token** (short-lived, ~6 hours), **refresh_token**, **expires_at** (and athlete summary). Client secret must not leave the backend.
- **Token refresh:** Access tokens expire. To refresh: `POST https://www.strava.com/oauth/token` with `client_id`, `client_secret`, `grant_type=refresh_token`, `refresh_token`. Response includes new access_token and possibly a new refresh_token; Strava recommends always persisting the latest refresh_token (older one may be invalidated).
- **Storage:** Client ID and Client Secret in env. Per user: store refresh_token (and optionally access_token + expires_at) server-side (e.g. database); use for API calls and refresh when needed.

### Scopes for activity import
- To list the authenticated athlete’s activities (including “Only Me” visibility): scope **`activity:read_all`** is required. `activity:read` alone does not include private activities and can lead to missing data or permission errors.
- Request `activity:read_all` (and only required scopes) in the authorization URL.

### Listing activities (import)
- **Endpoint:** `GET https://www.strava.com/api/v3/athlete/activities` (or equivalent v3 “List Athlete Activities”).
- **Query parameters:** `after` (epoch timestamp, start of range), `before` (epoch timestamp, end of range), `page`, `per_page` (e.g. default 30). Use `after` / `before` to implement FROM-date and “until now”.
- **Authorization:** Header `Authorization: Bearer <access_token>`; token must be valid (refresh if expired).
- **Response:** List of activities (summary); each has an external ID, type, start date, distance, duration, etc., which the backend maps to the internal workout model. Filter to running and walking only; map Strava activity types to RUNNING / WALKING.

### Deauthorization
- `POST https://www.strava.com/oauth/deauthorize` with current `access_token` revokes the app’s access for that athlete; all tokens for that user are invalidated. Useful for “Disconnect Strava” in Settings.

### Rate limits
- Per [Getting Started](https://developers.strava.com/docs/getting-started/): usage is limited per application on a 15-minute and daily basis. Default limits: **200 requests every 15 minutes**, **2,000 requests per day**. Sync and token refresh must stay within these limits; pagination and batching of activity requests may be needed for large date ranges.

### Webhooks (Strava API terms)
- Per [Getting Started](https://developers.strava.com/docs/getting-started/) (section “Why Do I Need Webhooks?”): **Strava API terms require implementing webhooks to know when an athlete has deauthorized your application.** The implementation plan should include handling deauthorization events (e.g. invalidate local tokens and update connection status) to comply with terms. Webhooks can also be used to receive activity updates and visibility changes, reducing polling and rate-limit pressure; that is optional for this ticket.

### Summary for Zapatismo
| Item | Where / How |
|------|-------------|
| Client ID, Client Secret | Environment variables only; never in UI or frontend. |
| User connection | OAuth 2.0: redirect to Strava → user authorizes → callback with code → backend exchanges for tokens → store refresh_token (and access_token/expires_at) per user server-side. |
| Settings page | Show connection status; “Connect Strava” (starts OAuth), “Disconnect” (call deauthorize and clear stored tokens). No secrets in UI. |
| Sync | Use stored access_token (refresh if expired) and call athlete activities with `after`/`before`; scope `activity:read_all`; filter and map to RUNNING/WALKING; idempotent by Strava activity ID. |

*References: [Strava Getting Started](https://developers.strava.com/docs/getting-started/), [Strava Authentication](https://developers.strava.com/docs/authentication/), [Strava OAuth](https://developers.strava.com/docs/oauth/), [Strava API Reference – Activities](https://developers.strava.com/docs/reference/#api-Activities).*

---

QUALITY GATE (before finishing):
- Requirements are atomic, unambiguous, testable.
- No implementation details (no code, no final DTOs, no migrations).
- Resolved open points documented; no remaining UNRESOLVED ambiguities.
- Scope and Out-of-Scope are clearly separated.
