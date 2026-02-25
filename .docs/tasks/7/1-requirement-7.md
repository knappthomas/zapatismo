# Requirement Sheet – 7 – Workout Management (Workout Tracking)

## 0. Quick Facts

- **Ticket-ID:** 7
- **Short Description (1 sentence):** A normal (non-admin) user can manage workouts in a dedicated backoffice space: view workouts in a list, add, edit, and delete workouts, with workout type (Running/Walking), start/end date-time, steps (integer, max 100000), distance (km), required location (max 50 chars), and optional association to a shoe from their existing shoes; a shoe linked to any workout cannot be deleted.
- **Goal / Value (max 5 bullets):**
  - Users (role USER) can maintain their workout history in the backoffice (workout-tracking domain).
  - Each workout has: type (e.g. Running, Walking), start and end date-time, steps count, distance in km, location, and optional link to a shoe from the user’s shoes.
  - Users can view all workouts in a list, add a new workout from the overview, and edit or delete workouts (delete with confirmation).
  - Backend exposes a validated CRUD API for workouts and persists data; behaviour is covered by unit and integration tests.
  - No HealthKit sync in this ticket; manual entry only.
- **Affected Roles:** Authenticated user (role USER) only for workout management; admin (ADMIN) does not see or manage workouts.
- **Affected Modules/Components (conceptual):** Backend: workout resource (CRUD API, persistence, validation, optional link to shoe); Frontend: navigation (Workouts item visible only to USER), workouts list overview, add/edit/delete flows, shoe selector from user’s shoes.
- **In-Scope (max 5 bullets):**
  - Backend: Workout entity persistence, REST API for list/create/get/update/delete workouts; access for authenticated USER only (per-user ownership); validation and DTOs; OpenAPI in sync; optional association to Shoe (user’s shoes only).
  - Frontend: Menu item "Workouts" (visible only to USER) leading to workouts list overview; "Add Workout" on overview; edit and delete per workout (delete with confirmation); ability to assign or change the shoe used from existing shoes.
  - Workout attributes: workout type (Running or Walking), start date-time, end date-time, steps (integer, 0–100000), distance (km, 0–100000), location (required, max 50 chars), optional shoe reference.
  - Backend unit tests for new/changed logic; backend integration tests for behaviour that touches the database or HTTP layer.
  - A Prisma test data migration (in `prisma/test-migrations/`) that inserts workout test data for local and CI/stage testing (data-only; dev/stage only, not production).
  - Documentation and acceptance criteria verifiable by running backend unit and integration tests.
- **Out-of-Scope (max 5 bullets):**
  - HealthKit sync or any import from external workout sources; data is entered manually in the backoffice only.
  - Admin seeing or managing workouts; cross-user workout visibility (workouts are strictly per-user).
  - iOS app changes; workout management is backoffice (web) only in this ticket.
  - Automatic "distance done" updates on shoes based on workouts (future); shoe association is stored but no automatic aggregation in this ticket.
  - Redesign of existing backoffice layout or auth flows beyond adding a menu item and workout routes.
- **Resolved constraints:** Workout types = Running, Walking. Location = required, max 50 characters. Steps = integer only, max 100000. Distance = non-negative (max 100000 km). Shoe deletion = prevented when the shoe is linked to any workout.

---

## 1. Context & Problem Statement

- **Current State (As-Is):**
  - Shoe management exists for users (task 6). No workout entity or workout management exists in backend or frontend.
  - Users have no way to record or manage workouts (type, duration, steps, distance, location, which shoe was used).
- **Problem / Pain:**
  - Users cannot track their workouts (runs, walks, etc.) or associate them with shoes. Workout tracking is a core part of the domain and a prerequisite for future features (e.g. shoe usage statistics).
- **Target State (To-Be, without implementation details):**
  - An authenticated user (role USER) can open "Workouts" in the menu and see a list of their workouts. They can add a new workout (type Running or Walking, start/end, steps, distance, required location, optional shoe), edit an existing workout, or delete a workout after confirmation. The user can choose which of their existing shoes was used for a workout. The backend exposes a validated, documented API for workout CRUD and persists data; new/changed backend behaviour is covered by unit tests and by integration tests where the feature touches the database or HTTP.
- **Assumptions (if any were stated):**
  - "User" means role USER (not ADMIN). Workout management is available only to users with role USER; admin does not see "Workouts" and cannot manage workouts (same pattern as shoes).
  - Domain is workout-tracking; no HealthKit sync in this ticket—workouts are created and edited manually in the backoffice.
  - "Dedicated space (like shoes)" means a separate menu item and routes for workouts, with list view (no grid view required for workouts).
  - Shoe used in a workout must be one of the authenticated user’s existing shoes (per-user shoe list).
- **Non-Goals:**
  - HealthKit or external sync; admin workout management; iOS workout UI; automatic shoe distance aggregation; implementation details (schema, DTOs) in this requirement.

---

## 2. Stakeholders & Roles

| Role | Goal/Interest | Rights/Constraints |
|------|----------------|--------------------|
| Normal user (USER) | Manage own workouts: add, view list, edit, delete; assign which shoe was used from own shoes. | Authenticated; workouts and shoe association strictly per-user; only sees and manages own workouts. |
| Admin (ADMIN) | Administration features only. | Does NOT see "Workouts" menu; cannot view or manage workouts. Only USER can. |
| Frontend developer | Implement menu (Workouts only for USER), list overview, create/edit/delete UI, shoe selector. | Must use API contract only; Tailwind + daisyUI. |
| Backend developer | Implement workout CRUD API, persistence, validation, tests. | Stateless; DTOs; OpenAPI in sync; unit + integration tests per project rules. |

---

## 3. User Journeys / Use Cases

### UC 1: View workouts list

- **Primary Actor:** Authenticated user (USER).
- **Trigger:** User wants to see all their workouts.
- **Preconditions:** User is logged in; Workouts feature and menu exist; user has permission to access workouts.
- **Flow:**
  1. User opens the backoffice and selects "Workouts" in the menu.
  2. System shows the workouts list with key information per workout (e.g. type, date, distance, shoe if set).
- **Outcome:** User sees their workouts in list view.
- **Alternatives / Abort Paths:** No workouts yet → empty state. Not authenticated → redirect to login.

### UC 2: Add a new workout

- **Primary Actor:** Authenticated user (USER).
- **Trigger:** User wants to record a new workout.
- **Preconditions:** User is logged in and on workouts overview or equivalent entry point.
- **Flow:**
  1. User clicks "Add Workout" (or equivalent) on the overview page.
  2. System shows a form to enter: workout type (Running or Walking), start date-time, end date-time, steps, distance (km), location (required, max 50 chars), and optional shoe (chosen from the user’s existing shoes).
  3. User fills in the fields and submits.
  4. System validates input, creates the workout, and returns the user to the overview or shows success (overview updated).
- **Outcome:** New workout is persisted and visible in the list; optional shoe association is stored.
- **Alternatives / Abort Paths:** Validation errors → clear messages; user cancels → return to overview without creating.

### UC 3: Edit an existing workout

- **Primary Actor:** Authenticated user (USER).
- **Trigger:** User wants to change a workout’s details or the shoe used.
- **Preconditions:** User is on workouts overview and at least one workout exists.
- **Flow:**
  1. User clicks "Edit" on a workout in the list.
  2. System opens edit form with current values: type, start, end, steps, distance, location, shoe (if any).
  3. User changes one or more fields (including selecting or clearing the shoe) and saves.
  4. System validates, updates the workout, and reflects changes (e.g. return to overview or success message).
- **Outcome:** Workout is updated and list shows new data.
- **Alternatives / Abort Paths:** Validation errors → messages; not found or no permission → appropriate error; cancel → return without saving.

### UC 4: Delete a workout (with confirmation)

- **Primary Actor:** Authenticated user (USER).
- **Trigger:** User wants to remove a workout.
- **Preconditions:** User is on workouts overview (or edit) and the workout exists.
- **Flow:**
  1. User triggers delete (e.g. from overview or edit).
  2. System shows a confirmation (e.g. "Are you sure you want to delete this workout?").
  3. User confirms.
  4. System deletes the workout and updates the list (workout no longer listed).
- **Outcome:** Workout is removed from the user’s list.
- **Alternatives / Abort Paths:** User cancels confirmation → no delete. Not found or no permission → error message.

### UC 5: Assign or change shoe used for a workout

- **Primary Actor:** Authenticated user (USER).
- **Trigger:** User wants to set or change which shoe was used for a workout.
- **Preconditions:** User is creating or editing a workout; user has at least one shoe (to assign) or may leave workout without a shoe.
- **Flow:**
  1. In add or edit workout form, user sees a control to select a shoe (from their existing shoes) or "none".
  2. User selects one of their shoes or clears the selection.
  3. On save, system stores the association (or no shoe if cleared).
- **Outcome:** Workout is linked to the chosen shoe or has no shoe; list/detail shows the assigned shoe when present.
- **Alternatives / Abort Paths:** No shoes in system → selector shows empty or "none" only. A shoe that is linked to any workout cannot be deleted; the user must first remove or change the shoe assignment on those workouts if they want to delete the shoe.

---

## 4. Functional Requirements (MUST/SHOULD/MAY)

| ID | Requirement (clear, atomic) | Priority (MUST/SHOULD/MAY) | Rationale / Value | Notes |
|----|-----------------------------|----------------------------|-------------------|-------|
| FR-1 | The backend MUST expose a REST API to list workouts for the authenticated user (e.g. list endpoint returning the user’s workouts). | MUST | Overview data. | Workouts are strictly per-user. |
| FR-2 | The backend MUST expose a REST API to create a workout with: workout type, start date-time, end date-time, steps (number), distance (km), location (string), and optional shoe reference (identifier of one of the user’s shoes). | MUST | Add workout. | Validation and DTOs at boundary; shoe optional. |
| FR-3 | The backend MUST expose a REST API to get one workout by identifier (for edit/detail). | MUST | Edit flow. | Only if the workout belongs to the authenticated user. |
| FR-4 | The backend MUST expose a REST API to update an existing workout (same attributes as create, including optional shoe). | MUST | Edit flow. | Idempotent for same payload; validation at boundary. |
| FR-5 | The backend MUST expose a REST API to delete a workout. | MUST | Delete flow. | Only if the workout belongs to the authenticated user. |
| FR-6 | Workout list, create, get, update, and delete MUST be available only to authenticated users with role USER; admin (ADMIN) MUST NOT have access to workout endpoints. | MUST | Normal user only. | Backend must restrict workout API to USER role. |
| FR-7 | The backend MUST validate all workout input (e.g. required fields, types, ranges, end date-time not before start) and return clear error responses for invalid input. | MUST | Data quality and UX. | Business rule: end ≥ start. |
| FR-8 | When a workout references a shoe, that shoe MUST belong to the same authenticated user; the backend MUST reject or ignore a shoe reference that is not the user’s. | MUST | Data integrity; no cross-user shoe link. | Create and update. |
| FR-9 | The frontend MUST provide a "Workouts" menu item in the main navigation that leads to the workouts overview; this item MUST be visible only to users with role USER (not to ADMIN). | MUST | Discoverability. | Same pattern as Shoes. |
| FR-10 | The workouts overview MUST show a list of the user’s workouts with key information (e.g. type, start/end or date, distance, shoe if set). | MUST | User request. | List view only (no grid required). |
| FR-11 | On the overview, each workout MUST have an "Edit" action that allows editing details or deleting the workout. | MUST | User request. | Delete only after confirmation. |
| FR-12 | The frontend MUST show a confirmation step before deleting a workout. | MUST | Avoid accidental deletion. | User must explicitly confirm. |
| FR-13 | The overview MUST provide an "Add Workout" button (or equivalent) that starts the create-workout flow. | MUST | User request. | Leads to form/page to create a new workout. |
| FR-14 | In create and edit workout forms, the frontend MUST allow the user to select which shoe was used from their existing shoes, or to leave no shoe assigned. | MUST | User request. | Shoe selector from user’s shoes only. |
| FR-15 | New or changed backend behaviour for workouts MUST be covered by unit tests (isolated, no real DB; e.g. services with mocked dependencies). | MUST | Project rules; quality. | Backend in scope. |
| FR-16 | Behaviour that touches the database or HTTP boundaries for workouts MUST be covered by integration tests (real DB or test double as defined in the repo). | MUST | Project rules; regression. | At least one integration test covering workout CRUD or list. |
| FR-17 | API contract (OpenAPI) MUST be kept in sync with workout endpoints and MUST NOT expose persistence-internal details. | MUST | Project rules. | DTOs only. |
| FR-18 | Workout type MUST be one of: Running, Walking; the backend MUST reject any other value. | MUST | Data consistency. | Exactly two types. |
| FR-19 | Steps MUST be a non-negative integer with a maximum of 100000; distance MUST be non-negative (km) with a maximum of 100000. | MUST | Data integrity. | Validation at API and optionally at persistence. |
| FR-20 | Location MUST be required and MUST have a maximum length of 50 characters; the backend MUST reject missing or over-length location. | MUST | Data quality. | Create and update. |
| FR-21 | A shoe MUST NOT be deletable when it is linked to one or more workouts; the backend MUST reject shoe deletion in that case and return a clear error (e.g. 409 or 400). | MUST | Referential integrity. | Affects shoe delete endpoint; implementation may live in shoe or workout module. |
| FR-22 | There MUST be a Prisma test data migration (under the repo’s test-migrations mechanism, e.g. `prisma/test-migrations/`) that inserts workout test data for testing (local, CI, or stage). The migration MUST be data-only (no schema changes) and MUST NOT run in production. | MUST | Reproducible test data; manual and automated testing. | Per project rules: test migrations are dev/stage only. |

---

## 5. Data & Interfaces (conceptual)

- **Data objects (terms + meaning, no final fields):**
  - **Workout:** A single workout record. Conceptual attributes: workout type (Running or Walking), start date-time, end date-time, steps (integer, 0–100000), distance (km, 0–100000), location (required, max 50 characters), optional reference to a Shoe (user’s shoes only). Workouts are strictly per-user.
  - **Workout list:** Collection of workouts owned by the authenticated user (overview).
  - **Shoe (existing):** Referenced by workout; must be one of the user’s shoes (from shoe management). A shoe linked to any workout cannot be deleted.
- **Inputs / Outputs (high-level):**
  - **Inputs:** Create/update: workout type (Running | Walking), start date-time, end date-time, steps (integer, 0–100000), distance (km, 0–100000), location (required, max 50 chars), optional shoe identifier. List: optional pagination/filter (implementation). Get/delete: workout identifier.
  - **Outputs:** List: array of workout summaries (key info + optional shoe reference). Get: full workout details (including shoe info if present). Create/update: created/updated workout or identifier. Delete: success or error.
- **External systems / integrations:** None. No HealthKit or external sync in this ticket.
- **Authorization / AuthN/AuthZ requirements:** All workout endpoints require authentication (JWT) and role USER. Only the owning user may list/create/update/delete their workouts. Shoe reference must refer to a shoe owned by the same user. Admin (ADMIN) does not have access to workout endpoints or UI.

---

## 6. States, Validations & Error Cases

### 6.1 States / Modes

- **Relevant states / flags:** Workout exists / deleted. Overview: list view. Form: create / edit. Delete: confirmation not shown / confirmation shown / confirmed (deleted). Shoe: assigned / not assigned.
- **Transitions:** Create → workout exists. Edit → save → workout updated. Delete confirm → workout deleted. Shoe selector: choose shoe or clear.

### 6.2 Validations

| Field/Topic | Rule | Error Reaction | Visible Where (UI/API) | Condition |
|-------------|------|----------------|------------------------|-----------|
| Start date-time | Required; valid date-time. | 4xx + message. | API; UI. | Create/update |
| End date-time | Required; valid date-time; must be after or equal to start. | 4xx + message. | API; UI. | Create/update |
| Workout type | Exactly one of: Running, Walking. | 4xx + message. | API; UI. | Create/update |
| Steps | Non-negative integer; maximum 100000. | 4xx + message. | API; UI. | Create/update |
| Distance | Non-negative number; unit km; maximum 100000. | 4xx + message. | API; UI. | Create/update |
| Location | Required; non-empty string; maximum 50 characters. | 4xx + message. | API; UI. | Create/update |
| Shoe reference | If present, must be an identifier of a shoe belonging to the authenticated user. | 4xx or 403. | API; UI. | Create/update |
| Workout identifier (get/update/delete) | Must exist and belong to the authenticated user. | 404 or 403. | API; UI. | Get, update, delete |

### 6.3 Error Cases / Edge Cases

| Case | Trigger | Expected System Behavior | User Feedback | Category |
|------|---------|---------------------------|---------------|----------|
| Unauthenticated request | Call workout API without valid JWT. | 401 Unauthorized. | Redirect to login or error message. | Auth |
| Forbidden (wrong user or admin) | User tries to get/update/delete another user’s workout, or admin calls workout API. | 403 Forbidden or 404. | Clear message. | AuthZ |
| Workout not found | Get/update/delete with non-existent or invalid id. | 404 Not Found. | Message in UI. | Functional |
| Validation error (create/update) | Missing or invalid fields (e.g. end before start, invalid type). | 400 (or 422) with error details. | Field-level or summary message. | Validation |
| Shoe not owned by user | Create/update with shoe id that is not the user’s shoe. | 400 or 403 with message. | Clear message. | Validation |
| Shoe linked to workouts | User (or API) attempts to delete a shoe that is linked to one or more workouts. | 409 Conflict (or 400) with message that shoe is in use. | Clear message; shoe not deleted. | Business rule |
| Delete confirmation cancelled | User cancels in confirmation step. | No delete; stay on overview or edit. | No error. | UX |

---

## 7. Non-Functional Requirements

- **Security:** Workout endpoints require authentication; users only access their own workouts and can reference only their own shoes. No secrets in API responses; no PII in logs.
- **Privacy / Compliance:** Workout data is user data; store and transmit only as needed; no unnecessary logging of full payloads.
- **Performance / Scalability:** List endpoint should support a reasonable number of workouts per user (pagination if needed; implementation). No N+1 or heavy queries without justification.
- **Logging / Auditing:** Log errors and access failures; do not log full request/response bodies that could contain PII.
- **Usability / Accessibility:** Forms and list usable with keyboard and screen readers where feasible; consistent with existing backoffice (Tailwind + daisyUI).
- **Operability:** No new monitoring or alerting required in this ticket beyond existing backend health.

---

## 8. Acceptance Criteria (testable)

- **AC-1:** Given an authenticated user (USER), When they open the backoffice and click "Workouts" in the menu, Then the workouts list overview is shown.
- **AC-2:** Given the overview, When the user clicks "Add Workout" and submits valid data (type, start, end, steps, distance, location, optional shoe), Then a new workout is created and appears in the list.
- **AC-3:** Given a workout in the list, When the user clicks "Edit" and changes details (including shoe) then saves, Then the workout is updated and the list reflects the changes.
- **AC-4:** Given a workout in the list (or edit), When the user triggers delete and confirms, Then the workout is deleted and no longer appears in the list.
- **AC-5:** Given the user triggers delete, When they cancel the confirmation, Then the workout is not deleted.
- **AC-6:** Given invalid or missing required data on create/update (e.g. end before start, invalid type), When the user submits, Then the backend returns a validation error and the user sees clear feedback (API and/or form).
- **AC-7:** Given create or edit workout form, When the user selects a shoe from the list of their shoes (or clears selection), Then on save the workout is stored with the chosen shoe reference or with no shoe.
- **AC-8:** Given the repo and dependencies, When the documented backend unit-test command is run, Then all backend unit tests pass (including those for workout-related logic).
- **AC-9:** Given a database available and the backend integration-test command is run, When the integration tests execute, Then all backend integration tests pass (including at least one that covers workout persistence or workout HTTP endpoints).
- **AC-10:** Given a user attempts to assign a shoe that does not belong to them to a workout, When the request is sent, Then the backend rejects it with an appropriate error (4xx/403).
- **AC-11:** Given a shoe is linked to one or more workouts, When a delete for that shoe is requested, Then the backend rejects the deletion with a clear error (e.g. 409) and the shoe is not deleted.
- **AC-12:** Given the repo’s test-migrations mechanism, When the workout test data migration is applied (e.g. in local or CI/stage), Then workout test data is inserted as defined by the migration, so that manual and automated tests can run against known data.

---

## 9. Dependencies, Risks, Impact

- **Dependencies (teams / services / configs):** Existing auth (JWT, roles); Prisma and MySQL for persistence; existing Shoe entity and per-user shoe list (task 6); existing Prisma test-migrations mechanism (`prisma/test-migrations/`, dev/stage only); frontend routing and navbar (role-based visibility for "Workouts"); OpenAPI generation. No external services.
- **Risks / open technical uncertainties:** None. Shoe deletion when linked to workouts is explicitly prevented (FR-21).
- **Impact on existing functionality:** New menu item "Workouts" (visible only to USER) and routes; new backend module and persistence. Shoe delete endpoint must enforce: do not delete if shoe is linked to any workout (FR-21). Workouts reference shoes by identifier. Admin continues to see only administration features.

---

## 10. Open Points (Resolved)

All previously open points have been resolved:

1. **Workout types:** The allowed values are **Running** and **Walking** (exactly two types).
2. **Location:** Location is **required** and has a **maximum length of 50** characters.
3. **Steps and distance:** Steps are **integer only** with a **maximum of 100000**. Distance (km) is non-negative with a **maximum of 100000**.
4. **Shoe deletion:** The system **prevents deletion** of a shoe when it is linked to any workout. The backend must reject shoe deletion in that case with a clear error (e.g. 409 Conflict); the user must remove or change the workout–shoe association first if they want to delete the shoe.

---

*End of Requirement Sheet – Ticket 7*
