# Requirement Sheet – 29 – Native iOS App (Swift/SwiftUI) for Zapatismo

## 0. Quick Facts
- **Ticket-ID:** 29
- **Short Description (1 sentence):** A native iOS app (Swift, SwiftUI) that lets users log in with email/password, request HealthKit permissions for Running and Walking, and automatically sync new HealthKit workouts to the existing Zapatismo backend.
- **Goal / Value (max 5 bullets):**
  - Mobile access to Zapatismo for iOS users (login, workout sync).
  - Workout data sourced from Apple Health via HealthKit (no Strava in the app).
  - Secure storage of JWT in Keychain; automatic redirect to login on 401.
  - Background sync of new workouts (HealthKit → backend) to keep data up to date without opening the app.
  - Idempotent sync using an external identifier (e.g. HealthKit UUID) to avoid duplicate workouts.
- **Affected Roles:** End user (athlete) using the iOS app.
- **Affected Modules/Components (conceptual):** New iOS app under `apps/ios/`; consumption of existing backend auth and workouts APIs; HealthKit (permissions, observer, workout read); device Keychain.
- **In-Scope (max 5 bullets):**
  - iOS app in monorepo at `apps/ios/` (Swift, SwiftUI).
  - Login (email + password) against existing backend; JWT stored in Keychain; 401 triggers return to login.
  - HealthKit permission request for Running and Walking workout types.
  - Background delivery of new HealthKit workouts and sync to backend (e.g. POST workout with external id for idempotency).
  - Configurable backend base URL (e.g. Staging vs Production).
- **Out-of-Scope (max 5 bullets):**
  - Strava integration in the app (backend may still use Strava for web/other clients).
  - Changes to backend business logic or Prisma schema (unless explicitly agreed as a separate dependency).
  - Android or other native clients.
  - Shoe management, workout list UI, or editing workouts in the app (only sync of new workouts from HealthKit).
  - Deep link or universal link handling (unless explicitly added later).

## 1. Context & Problem Statement
- **Current State (As-Is):** Zapatismo provides a web frontend (Angular) and NestJS backend. Workouts are synced from Strava via the backend. There is no native mobile app; iOS users cannot use HealthKit as the primary workout source.
- **Problem / Pain:** iOS users who record workouts in Apple Health (e.g. Apple Watch, iPhone) have no way to get those workouts into Zapatismo without going through Strava or manual entry on the web.
- **Target State (To-Be, without implementation details):** An iOS app exists in the repo under `apps/ios/`. Users can sign in with the same credentials as the web app. The app requests HealthKit access for Running and Walking. When new workouts appear in HealthKit, the app syncs them to the backend in the background. Duplicate syncs for the same workout are avoided by using a stable external identifier (e.g. HealthKit workout UUID). The app uses the existing auth and workout APIs; backend and Prisma remain the source of truth.
- **Assumptions (if any were stated):** Backend base URL is configurable (e.g. build/run configuration). Existing endpoints `POST /api/auth/login` and `POST /api/workouts` (or an idempotent variant) are used; no new backend features are assumed unless clarified in open points.
- **Non-Goals:** No Strava in the iOS app; no backend schema or API contract changes in this ticket unless required and agreed.

## 2. Stakeholders & Roles
| Role | Goal/Interest | Rights/Constraints |
|------|----------------|-------------------|
| End user (athlete) | Log in once, have HealthKit workouts synced to Zapatismo automatically | Must have an existing Zapatismo account (same as web). Must grant HealthKit permissions. |
| Developer / Operator | Maintain one codebase (monorepo), clear API contract, no manual prod changes | App must work with existing backend; config via build/configuration, no hardcoded secrets. |

## 3. User Journeys / Use Cases

### UC 1: First-time login
- **Primary Actor:** End user.
- **Trigger:** User opens the app and is not authenticated.
- **Preconditions:** User has a Zapatismo account (e.g. created via web).
- **Flow:**
  1. App shows login screen (email, password).
  2. User enters credentials and submits.
  3. App sends credentials to backend (e.g. POST /api/auth/login).
  4. Backend returns JWT on success.
  5. App stores JWT securely (Keychain) and transitions to the main/post-login experience (e.g. permission or home).
- **Outcome:** User is authenticated; subsequent requests use the stored JWT.
- **Alternatives / Abort Paths:** Invalid credentials → show error, stay on login. Network error → show error, allow retry.

### UC 2: Request HealthKit permissions (Running, Walking)
- **Primary Actor:** End user.
- **Trigger:** App needs to read workouts (e.g. after login or when enabling sync).
- **Preconditions:** User is authenticated; device supports HealthKit; user has not yet granted or has previously denied permission.
- **Flow:**
  1. App requests authorization to read workout data for types Running and Walking (and any types required to enumerate workouts, as per platform rules).
  2. System shows HealthKit permission sheet.
  3. User grants or denies access.
  4. App records the result and proceeds only for read access to the required workout types.
- **Outcome:** If granted, app can read Running and Walking workouts from HealthKit. If denied, app does not sync; user can be informed and directed to Settings if applicable.
- **Alternatives / Abort Paths:** User denies → no sync; show clear message. HealthKit unavailable (e.g. simulator/device) → graceful degradation or message.

### UC 3: Background sync of new HealthKit workouts
- **Primary Actor:** System (app in background).
- **Trigger:** New workout(s) appear in HealthKit (e.g. after a run recorded by Apple Watch). Platform delivers an update (e.g. via HealthKit background delivery / observer).
- **Preconditions:** User is authenticated (valid JWT in Keychain); HealthKit read permission granted for the relevant types; backend is reachable.
- **Flow:**
  1. App is notified of new or updated workout data in HealthKit (mechanism to be implemented, e.g. observer/background delivery).
  2. App reads the relevant workout(s) from HealthKit (type, start/end time, distance, steps if available, and a stable identifier such as UUID).
  3. For each workout, app maps type to backend values (e.g. Running → "RUNNING", Walking → "WALKING"); only these types are synced.
  4. App sends each workout to the backend (e.g. POST to workouts API) including a stable external identifier so the backend can treat the request as idempotent (no duplicate workout for same external id).
  5. On success (or “already exists”), app considers that workout synced; on 401, app clears credentials and returns user to login on next foreground.
- **Outcome:** New HealthKit workouts appear in the user’s Zapatismo account without duplicate entries; sync works in background where the platform allows.
- **Alternatives / Abort Paths:** 401 → clear JWT, redirect to login when app is next opened. Network/server error → retry later (policy to be defined). Unsupported workout type → skip or ignore.

### UC 4: Session expiry (401) and return to login
- **Primary Actor:** End user / App.
- **Trigger:** Any backend request returns 401 Unauthorized (e.g. expired or invalid JWT).
- **Preconditions:** App holds a stored JWT and makes authenticated requests.
- **Flow:**
  1. App receives 401 from the backend.
  2. App clears the stored JWT from Keychain (and any in-memory session).
  3. App presents the login screen so the user can sign in again.
- **Outcome:** User must re-authenticate; no use of invalid credentials.
- **Alternatives / Abort Paths:** Optional: retry once with token refresh if the backend later supports refresh tokens (out of scope for this ticket unless agreed).

## 4. Functional Requirements (MUST/SHOULD/MAY)
| ID | Requirement (clear, atomic) | Priority | Rationale / Value | Notes |
|----|-----------------------------|----------|-------------------|--------|
| FR-1 | The app MUST allow the user to log in with email and password using the existing backend auth endpoint (e.g. POST /api/auth/login). | MUST | Same identity as web; no new backend auth. |
| FR-2 | The app MUST store the JWT from a successful login in the device Keychain (or equivalent secure storage) and use it for subsequent authenticated API requests. | MUST | Security; no plain-text or UserDefaults. |
| FR-3 | When any authenticated request receives a 401 response, the app MUST clear the stored token and present the login screen (on next appropriate user-facing transition). | MUST | Secure handling of session expiry. |
| FR-4 | The app MUST request HealthKit authorization to read workout data for types Running and Walking (and any types necessary to observe new workouts per platform API). | MUST | Required for sync. |
| FR-5 | The app MUST sync new HealthKit workouts (Running and Walking only) to the backend. Sync MUST use a stable external identifier (e.g. HealthKit workout UUID) so that the same workout is not created twice (idempotent behaviour). | MUST | Correctness and data quality. |
| FR-6 | Workout type mapping MUST be: Running → "RUNNING", Walking → "WALKING". Other HealthKit workout types MAY be ignored or skipped. | MUST | Align with backend workout type enum. |
| FR-7 | Each synced workout MUST be sent with at least: type, start time, end time (ISO8601), distance (km), steps (or 0 if unavailable), location (e.g. "Apple Health"), and external identifier. | MUST | Backend contract and idempotency. |
| FR-8 | The app MUST support a configurable backend base URL (e.g. for Staging vs Production) without hardcoding production URLs in source. | MUST | Safe deployment and testing. |
| FR-9 | New workouts SHOULD be synced in the background when the platform supports it (e.g. HealthKit background delivery / observer). | SHOULD | Good UX; sync without opening the app. |
| FR-10 | The app MUST NOT include Strava integration; workout input is HealthKit only. | MUST | Scope boundary. |
| FR-11 | Backend and Prisma schema MUST remain unchanged unless a minimal change (e.g. optional externalId on create) is agreed to support idempotent create; see Open Points. | MUST | Repo and architecture rules. |

**Backend testing:** This ticket does not introduce new backend code or schema changes by default. If a minimal backend change is added (e.g. optional `externalId` on POST /api/workouts for idempotency), that change MUST be covered by existing or new unit and integration tests as per project rules. The requirement sheet does not add new backend test requirements if the backend remains unchanged.

## 5. Data & Interfaces (conceptual)
- **Data objects (terms + meaning, no final fields):**
  - **Credentials:** Email (string), password (string) — used only for login request.
  - **Token:** Opaque JWT string — stored after login, sent in Authorization header, cleared on 401.
  - **Workout (to backend):** Type (RUNNING | WALKING), start time and end time (ISO8601), distance in km, steps (integer), location (string), external identifier (string, e.g. HealthKit UUID). Optional: shoe id if the app or backend supports it later.
- **Inputs / Outputs (high-level):**
  - Login: Input = email, password. Output = JWT (and possibly user info if returned by backend).
  - Sync: Input = workout read from HealthKit (type, times, distance, steps, stable id). Output = HTTP success or idempotent “already exists” behaviour; no duplicate workout created.
- **External systems / integrations:** Existing Zapatismo backend (REST); Apple HealthKit (read workouts, background delivery). No Strava in the app.
- **Authorization / AuthN/AuthZ:** User authenticates with email/password; backend issues JWT. All workout API calls use Bearer JWT. HealthKit authorization is separate (user grants read to the app).

## 6. States, Validations & Error Cases

### 6.1 States / Modes
- **Relevant states / flags:** Authenticated (has valid JWT) vs unauthenticated; HealthKit authorized vs denied vs not determined; sync in progress vs idle; app in foreground vs background.
- **Transitions:** Login success → authenticated. 401 → unauthenticated. Grant HealthKit → authorized. New data in HealthKit → trigger sync. Sync success / “already exists” → no duplicate.

### 6.2 Validations
| Field/Topic | Rule | Error Reaction | Visible Where (UI/API) | Condition |
|-------------|------|----------------|-------------------------|-----------|
| Email | Valid email format | Show validation error | Login screen | On submit or blur |
| Password | Non-empty | Show validation error | Login screen | On submit |
| Backend URL | Non-empty, valid URL form | App may fail to connect | Config / build | At build or launch |
| Workout end time | End ≥ start | Do not send invalid workout | Sync logic | Before POST |
| Workout type | Only RUNNING, WALKING | Skip or ignore | Sync logic | When reading from HealthKit |

### 6.3 Error Cases / Edge Cases
| Case | Trigger | Expected System Behavior | User Feedback | Category |
|------|---------|---------------------------|---------------|----------|
| Invalid login | Wrong email/password | Do not store token; stay on login | Error message | Auth |
| Network error on login | No connectivity / server down | Do not store token; allow retry | Error message | Network |
| 401 on any API call | Expired or invalid JWT | Clear token; show login when appropriate | Login screen | Auth |
| HealthKit denied | User denies read | No sync; do not send workouts | Message that sync is disabled | Permission |
| HealthKit unavailable | Simulator or unsupported device | No sync; avoid crash | Message or hide sync | Environment |
| Backend rejects workout (4xx) | Validation or business rule | Do not retry same payload indefinitely; optional local flag | Optional: sync status or error log | Sync |
| Duplicate external id | Same HealthKit workout synced again | Backend returns success or “already exists”; no second workout created | None required | Idempotency |

## 7. Non-Functional Requirements
- **Security:** JWT only in Keychain (or equivalent); no credentials in logs; HTTPS for all backend communication. No secrets in repo; backend URL and config via build/configuration.
- **Privacy / Compliance:** HealthKit data is read only for sync; user must explicitly grant access. No sharing of HealthKit data with third parties other than the Zapatismo backend under user’s account.
- **Performance / Scalability:** Background sync should not block the UI; batching or rate-limiting of POST requests may be applied to avoid overloading the backend.
- **Logging / Auditing:** No PII or credentials in logs; optional high-level sync success/failure for support.
- **Usability / Accessibility:** Login screen must be usable (labels, focus, errors). Permission and error messages must be clear.
- **Operability:** Backend URL and environment are configurable so that staging and production can be targeted without code change.

## 8. Acceptance Criteria (testable)
- AC-1: Given valid credentials, when the user submits login, then the app receives a JWT and stores it in Keychain and the user leaves the login screen.
- AC-2: Given stored JWT, when the app makes an authenticated request and the backend returns 401, then the app clears the token and shows the login screen on next appropriate transition.
- AC-3: Given HealthKit permission granted for Running and Walking, when a new Running or Walking workout appears in HealthKit, then the app eventually sends it to the backend with the correct type, times, distance, steps (or 0), location, and external id; and the backend does not create a duplicate for the same external id.
- AC-4: Given the same HealthKit workout is triggered for sync again (same external id), when the app sends it to the backend, then no second workout is created for that user (idempotent).
- AC-5: Given a HealthKit workout type other than Running or Walking, when the app processes workouts, then that workout is not sent to the backend (or is ignored).
- AC-6: Given the app is built with a configured backend base URL (e.g. Staging), when the app runs, then it uses that URL for auth and workout API calls (no hardcoded production URL in source).
- AC-7: Given the user has not granted HealthKit read access, when sync would run, then the app does not send workouts and the user can be informed that sync is disabled.
- AC-8: Given the backend is unchanged and no new backend tests are added, when existing backend unit and integration tests are run, then they still pass. (If a minimal backend change is introduced for externalId/idempotency, then new or updated tests for that behaviour must pass.)

## 9. Dependencies, Risks, Impact
- **Dependencies:** Existing backend auth (POST /api/auth/login) and workouts API. Backend must support idempotent create by external identifier for POST /api/workouts (or equivalent); see Open Points. Apple developer account and HealthKit entitlement for the app. Xcode and iOS SDK; deployment target to be defined (e.g. iOS 15+).
- **Risks / open technical uncertainties:** HealthKit background delivery behaviour and battery impact; exact observer/query API to use. Backend currently does not expose externalId on the public create endpoint — idempotency may require a small backend change or a separate endpoint.
- **Impact on existing functionality:** None on web frontend or Strava sync if backend is unchanged. If backend is extended to accept optional externalId on create, existing callers (web, Strava) must remain supported; createByExternalId already exists for Strava.

## 10. Open Points (UNRESOLVED)
- [ ] **Backend idempotency:** The current public API POST /api/workouts (CreateWorkoutDto) does not include `externalId`. The backend has internal `createByExternalId` (used by Strava) for idempotent create. To avoid duplicates from the iOS app, one of: (a) extend CreateWorkoutDto with optional `externalId` and implement idempotent create in the existing create endpoint, (b) add a dedicated endpoint (e.g. POST /api/workouts/import) for clients that send externalId, or (c) have the app track “already synced” external IDs locally and skip re-sending. Which approach should be used, and who decides?
- [ ] **Minimum iOS version:** Which minimum deployment target (e.g. iOS 15, 16) is required for the app and for the chosen HealthKit background delivery approach?
- [ ] **Shoe assignment:** Backend supports optional shoeId on create and default shoes per type (e.g. for Strava). Should the iOS app send a shoe id when syncing (e.g. user-selectable default), or is “no shoe” acceptable for HealthKit-origin workouts for now?

QUALITY GATE (before finishing):
- Requirements are atomic, unambiguous, testable.
- No implementation details (no code, no final DTOs, no migrations).
- Every ambiguity is captured as UNRESOLVED with a concrete question.
- Scope and Out-of-Scope are clearly separated.
