# Requirement Sheet – 6 – Shoe Management in Backoffice (Normal User)

## 0. Quick Facts

- **Ticket-ID:** 6
- **Short Description (1 sentence):** A normal (non-admin) user can manage shoes in the backoffice: view shoes in grid or list, add, edit, and delete shoes (with confirmation), each with photo, brand, name, buying date, location, and kilometer target.
- **Goal / Value (max 5 bullets):**
  - Users (role USER) can maintain their own shoe inventory in the backoffice.
  - Each shoe has consistent attributes: photo, brand, name, buying date, buying location, kilometer target.
  - Users can switch between grid and list overview and perform full CRUD (create, read, update, delete) with clear UX (e.g. confirmation before delete).
  - Backend exposes a well-defined, validated API for shoe CRUD; persistence is versioned via migrations.
  - Backend behaviour is covered by unit and integration tests; acceptance is verifiable by automated tests.
- **Affected Roles:** Authenticated user (role USER) only for shoe management; admin (ADMIN) sees only administration features and does not see or manage shoes.
- **Affected Modules/Components (conceptual):** Backend: shoe resource (CRUD API, persistence, validation); Frontend: navigation/menu (Shoes item visible only to USER), shoes overview (grid/list), shoe create/edit/delete flows, shoe photo as URL.
- **In-Scope (max 5 bullets):**
  - Backend: Shoe entity persistence, REST API for list/create/get/update/delete shoes; access for authenticated USER only (per-user ownership); validation and DTOs; OpenAPI in sync.
  - Frontend: Menu item "Shoes" (visible only to USER) leading to shoes overview; grid-view and list-view options; "Add Shoe" to create; "Edit" per shoe to edit or delete (delete with confirmation).
  - Shoe attributes: photo URL (required), brand name (max 75 chars), shoe name (max 75 chars), buying date, buying location, kilometer target in km (max 100000; retirement tracking; "distance done" is future).
  - Validation enforced at database (column/constraint), API (validation), and frontend (input maxlength/max); Cypress Component Test block covers these limits.
  - Backend unit tests for new/changed logic; backend integration tests for behaviour that touches the database or HTTP layer.
  - Documentation/acceptance criteria that can be verified by running backend unit and integration tests.
- **Out-of-Scope (max 5 bullets):**
  - Linking shoes to workouts or training data; "how many kilometers were done with this shoe" (future ticket).
  - Admin seeing or managing shoes; cross-user shoe visibility (shoes are strictly per-user).
  - Strava integration changes; shoe management is backoffice (web) only in this ticket.
  - Redesign of existing backoffice layout or auth flows beyond adding a menu item and shoes routes.
  - Photo upload or server-side image storage; photo is a URL only (no upload required).

---

## 1. Context & Problem Statement

- **Current State (As-Is):**
  - Backoffice has navigation (e.g. Dashboard; Users for admin). No shoe entity or shoe management exists in backend or frontend.
  - Users (role USER) have no way to maintain a list of their shoes with the described attributes.
- **Problem / Pain:**
  - Users cannot record which shoes they own, when and where they bought them, or a kilometer target (e.g. for replacement). This is a prerequisite for future features (e.g. linking workouts to shoes).
- **Target State (To-Be, without implementation details):**
  - An authenticated user (normal user, role USER) can open "Shoes" in the menu and see an overview of their shoes in either grid or list view (photo and important information visible). They can add a new shoe, edit an existing shoe’s details, or delete a shoe after confirmation. Each shoe has: photo, brand name, shoe name, buying date, buying location, kilometer target. The backend exposes a validated, documented API for shoe CRUD and persists data; new/changed backend behaviour is covered by unit tests and by integration tests where the feature touches the database or HTTP.
- **Assumptions (if any were stated):**
  - "Normal user" means role USER (not ADMIN). Shoe management is available only to users with role USER; admin (ADMIN) does not see the "Shoes" menu and cannot manage shoes (clear separation: admin sees only administration features).
  - "Backoffice" is the existing web frontend after login; "menu" is the main navigation (e.g. navbar) where "Shoes" is added and shown only to USER.
  - "Kilometer target" is a number in km (kilometers) for tracking when a shoe is retired; "how many kilometers were done with this shoe" is implemented in a future feature—for now the user only enters the target value in km.
- **Non-Goals:**
  - Workout–shoe association; "distance done" per shoe; admin seeing or managing shoes; Strava/sync shoe management; implementation details (schema, DTOs) in this requirement.

---

## 2. Stakeholders & Roles

| Role | Goal/Interest | Rights/Constraints |
|------|----------------|--------------------|
| Normal user (USER) | Manage own shoes: add, view (grid/list), edit, delete with clear feedback | Authenticated; shoes are strictly per-user; only sees and manages own shoes. |
| Admin (ADMIN) | Administration features only; clear separation from user features. | Does NOT see "Shoes" menu; cannot view or manage any shoes. Only user (USER) can do it. |
| Frontend developer | Implement menu (Shoes only for USER), overview, create/edit/delete UI using REST API | Must use API contract only; Tailwind + daisyUI. |
| Backend developer | Implement shoe CRUD API, persistence, validation, tests | Stateless; DTOs; OpenAPI in sync; unit + integration tests per project rules. |

---

## 3. User Journeys / Use Cases

### UC 1: View shoes overview (grid or list)

- **Primary Actor:** Authenticated user (USER).
- **Trigger:** User wants to see all their shoes.
- **Preconditions:** User is logged in; at least the shoes feature and menu exist; user has permission to access shoes.
- **Flow:**
  1. User opens the backoffice and selects "Shoes" in the menu.
  2. System shows the shoes overview with photo and important information for each shoe.
  3. User can switch between grid-view and list-view (both show photo and key info).
- **Outcome:** User sees their shoes in the chosen view.
- **Alternatives / Abort Paths:** No shoes yet → empty state (message or empty list). Not authenticated → redirect to login.

### UC 2: Add a new shoe

- **Primary Actor:** Authenticated user (USER).
- **Trigger:** User wants to register a new shoe.
- **Preconditions:** User is logged in and on shoes overview or equivalent entry point.
- **Flow:**
  1. User clicks "Add Shoe" on the overview page.
  2. System shows a form (or equivalent) to enter: photo, brand name, shoe name, buying date, buying location, kilometer target.
  3. User fills in the fields and submits.
  4. System validates input, creates the shoe, and returns the user to the overview or shows success (overview updated).
- **Outcome:** New shoe is persisted and visible in the overview.
- **Alternatives / Abort Paths:** Validation errors → clear messages; user cancels → return to overview without creating.

### UC 3: Edit an existing shoe

- **Primary Actor:** Authenticated user (USER).
- **Trigger:** User wants to change a shoe’s details.
- **Preconditions:** User is on shoes overview and at least one shoe exists.
- **Flow:**
  1. User clicks "Edit" on a shoe (in grid or list).
  2. System opens edit form (or inline/edit page) with current values: photo, brand name, shoe name, buying date, buying location, kilometer target.
  3. User changes one or more fields and saves.
  4. System validates, updates the shoe, and reflects changes (e.g. return to overview or success message).
- **Outcome:** Shoe is updated and overview shows new data.
- **Alternatives / Abort Paths:** Validation errors → messages; not found or no permission → appropriate error; cancel → return without saving.

### UC 4: Delete a shoe (with confirmation)

- **Primary Actor:** Authenticated user (USER).
- **Trigger:** User wants to remove a shoe.
- **Preconditions:** User is on shoes overview (or edit) and the shoe exists.
- **Flow:**
  1. User clicks "Edit" (or a dedicated delete control) and chooses delete, or a delete action from the overview.
  2. System shows a confirmation (e.g. "Are you sure you want to delete this shoe?").
  3. User confirms.
  4. System deletes the shoe and updates the overview (shoe no longer listed).
- **Outcome:** Shoe is removed from the user’s list.
- **Alternatives / Abort Paths:** User cancels confirmation → no delete. Not found or no permission → error message.

---

## 4. Functional Requirements (MUST/SHOULD/MAY)

| ID | Requirement (clear, atomic) | Priority (MUST/SHOULD/MAY) | Rationale / Value | Notes |
|----|-----------------------------|----------------------------|-------------------|-------|
| FR-1 | The backend MUST expose a REST API to list shoes for the authenticated user (e.g. list endpoint returning the user’s shoes). | MUST | Overview data. | Shoes are strictly per-user; list returns only the requesting user’s shoes. |
| FR-2 | The backend MUST expose a REST API to create a shoe with: photo URL (required), brand name, shoe name, buying date, buying location, kilometer target (number in km). | MUST | Add shoe. | Validation and DTOs at boundary; photo is a URL to any image (no upload required). |
| FR-3 | The backend MUST expose a REST API to get one shoe by identifier (for edit/detail). | MUST | Edit flow. | Only if the shoe belongs to the authenticated user (per-user ownership). |
| FR-4 | The backend MUST expose a REST API to update an existing shoe (same attributes as create). | MUST | Edit flow. | Idempotent for same payload; validation at boundary. |
| FR-5 | The backend MUST expose a REST API to delete a shoe. | MUST | Delete flow. | Only if the shoe belongs to the authenticated user (per-user ownership). |
| FR-6 | Shoe list, create, get, update, and delete MUST be available only to authenticated users with role USER; admin (ADMIN) MUST NOT have access to shoe endpoints. | MUST | Normal user only; admin sees no shoes. | Backend must restrict shoe API to USER role; ADMIN receives 403 or no route. |
| FR-7 | The backend MUST validate all shoe input (e.g. required fields including photo URL, types, ranges) and return clear error responses for invalid input. | MUST | Data quality and UX. | Photo URL required; kilometer target as number in km. |
| FR-8 | The frontend MUST provide a "Shoes" menu item in the main navigation that leads to the shoes overview; this item MUST be visible only to users with role USER (not to ADMIN). | MUST | Discoverability; admin sees only admin features. | Same backoffice navigation pattern; conditional on role. |
| FR-9 | The shoes overview MUST support at least two view modes: grid-view and list-view; both MUST show photo and important information per shoe. | MUST | User request. | "Important information" to be chosen in implementation (e.g. name, brand, km target). |
| FR-10 | On the overview, each shoe MUST have an "Edit" action that allows editing details or deleting the shoe. | MUST | User request. | Edit and delete may be on one screen or separate; delete only after confirmation. |
| FR-11 | The frontend MUST show a confirmation step before deleting a shoe (e.g. modal or confirmation message). | MUST | Avoid accidental deletion. | User must explicitly confirm. |
| FR-12 | The overview MUST provide an "Add Shoe" button (or equivalent) that starts the create-shoe flow. | MUST | User request. | Leads to form/page to create a new shoe. |
| FR-13 | New or changed backend behaviour for shoes MUST be covered by unit tests (isolated, no real DB; e.g. services with mocked dependencies). | MUST | Project rules; quality. | Backend in scope. |
| FR-14 | Behaviour that touches the database or HTTP boundaries for shoes MUST be covered by integration tests (real DB or test double as defined in the repo). | MUST | Project rules; regression. | At least one integration test covering shoe CRUD or list. |
| FR-15 | API contract (OpenAPI) MUST be kept in sync with shoe endpoints and MUST NOT expose persistence-internal details. | MUST | Project rules. | DTOs only. |
| FR-16 | The shoe photo MUST be required and MUST be a URL to any image; no upload of image files is required. | MUST | Product decision. | Backend and frontend accept and store/display a photo URL only. |
| FR-17 | Shoe name and brand name MUST be restricted to a maximum of 75 characters each. The database schema MUST enforce this limit (e.g. column length); the backend API MUST validate and reject values exceeding 75 characters with a clear error. | MUST | Data integrity; consistent limits across layers. | Applies to create and update. |
| FR-18 | The kilometer target MUST be restricted to a maximum value of 100000 (km). The database schema MUST enforce this limit; the backend API MUST validate and reject values greater than 100000 with a clear error. | MUST | Data integrity; reasonable upper bound. | Applies to create and update. |
| FR-19 | The frontend MUST enforce the same limits at input time: shoe name and brand input fields MUST have a maximum length of 75 characters (e.g. maxlength attribute or equivalent); kilometer target input MUST restrict the value to at most 100000. | MUST | Early feedback; avoid submitting invalid data. | Angular form/input constraints. |
| FR-20 | The shoe form validation (max length 75 for shoe name and brand, max value 100000 for kilometer target) MUST be covered by Cypress E2E tests within the "Component Test" describe block (e.g. field length, validation behaviour without requiring real server). | MUST | Regression protection; alignment with E2E strategy. | Per project Cypress structure (Component Test block). |

---

## 5. Data & Interfaces (conceptual)

- **Data objects (terms + meaning, no final fields):**
  - **Shoe:** A single shoe record. Conceptual attributes: photo URL (required; URL to any image, no upload), brand name (max 75 characters), shoe name (max 75 characters), buying date, buying location, kilometer target (number in km, 0–100000; for retirement tracking; "distance done" is future). Shoes are strictly per-user (each user sees and manages only their own).
  - **Shoe list:** Collection of shoes owned by the authenticated user (overview).
- **Inputs / Outputs (high-level):**
  - **Inputs:** Create/update: photo URL (required), brand name, shoe name, buying date, buying location, kilometer target (number, unit km). List: optional pagination/filter (implementation). Get/delete: shoe identifier.
  - **Outputs:** List: array of shoe summaries (photo URL + important info). Get: full shoe details. Create/update: created/updated shoe or identifier. Delete: success or error.
- **External systems / integrations:** None required beyond existing auth and frontend–backend REST. Photo is a URL only (no server-side image storage or upload).
- **Authorization / AuthN/AuthZ requirements:** All shoe endpoints require authentication (JWT) and role USER. Only the owning user may list/create/update/delete their shoes (per-user ownership). Admin (ADMIN) does not have access to shoe endpoints or UI.

---

## 6. States, Validations & Error Cases

### 6.1 States / Modes

- **Relevant states / flags:** Shoe exists / deleted. Overview: grid view / list view. Form: create / edit. Delete: confirmation not shown / confirmation shown / confirmed (deleted).
- **Transitions:** Create → shoe exists. Edit → save → shoe updated. Delete confirm → shoe deleted. View switch → grid ↔ list (no server state).

### 6.2 Validations

| Field/Topic | Rule | Error Reaction | Visible Where (UI/API) | Condition |
|-------------|------|----------------|------------------------|-----------|
| Required fields (e.g. shoe name, brand, photo URL) | Must be present (and non-empty where applicable). | 4xx + message. | API response; form errors in UI. | Create/update |
| Shoe name | Maximum 75 characters. | 4xx + message. | API; UI (input maxlength). | Create/update |
| Brand name | Maximum 75 characters. | 4xx + message. | API; UI (input maxlength). | Create/update |
| Kilometer target | Numeric; non-negative; maximum 100000 (km); unit is km; for retirement tracking. | 4xx + message. | API; UI (input max). | Create/update |
| Photo URL | Required; must be a valid URL to an image (no upload). | 4xx + message. | API; UI. | Create/update |
| Buying date | Valid date; optional or required per product decision. | 4xx + message. | API; UI. | Create/update |
| Shoe identifier (get/update/delete) | Must exist and belong to the authenticated user. | 404 or 403. | API; UI. | Get, update, delete |

### 6.3 Error Cases / Edge Cases

| Case | Trigger | Expected System Behavior | User Feedback | Category |
|------|---------|---------------------------|---------------|----------|
| Unauthenticated request | Call shoe API without valid JWT. | 401 Unauthorized. | Redirect to login or error message. | Auth |
| Forbidden (wrong user or admin) | User tries to get/update/delete another user’s shoe, or admin calls shoe API. | 403 Forbidden or 404. | Clear message. | AuthZ |
| Shoe not found | Get/update/delete with non-existent or invalid id. | 404 Not Found. | Message in UI. | Functional |
| Validation error (create/update) | Missing or invalid fields. | 400 (or 422) with error details. | Field-level or summary message. | Validation |
| Shoe name or brand over 75 characters | User or API sends name/brand longer than 75 characters. | Backend: 400 with message; DB rejects if not caught by API. Frontend: input maxlength prevents or shows error. | Clear message. | Validation |
| Kilometer target over 100000 | User or API sends km target &gt; 100000. | Backend: 400 with message; DB rejects if not caught by API. Frontend: input constraint prevents or shows error. | Clear message. | Validation |
| Delete confirmation cancelled | User cancels in confirmation step. | No delete; stay on overview or edit. | No error. | UX |

---

## 7. Non-Functional Requirements

- **Security:** Shoe endpoints require authentication; authorization so that users only access their own shoes (or as defined). No secrets in API responses; no PII in logs.
- **Privacy / Compliance:** Shoe data is user data; store and transmit only as needed; no unnecessary logging of full payloads.
- **Performance / Scalability:** List endpoint should support reasonable number of shoes per user (pagination if needed; implementation). No N+1 or heavy queries without justification.
- **Logging / Auditing:** Log errors and access failures; do not log full request/response bodies that could contain PII.
- **Usability / Accessibility:** Forms and overview usable with keyboard and screen readers where feasible; consistent with existing backoffice (Tailwind + daisyUI).
- **Operability:** No new monitoring or alerting required in this ticket beyond existing backend health.

---

## 8. Acceptance Criteria (testable)

- **AC-1:** Given an authenticated user (USER), When they open the backoffice and click "Shoes" in the menu, Then the shoes overview is shown (grid or list by default).
- **AC-2:** Given the overview, When the user switches view, Then both grid-view and list-view show each shoe’s photo and important information.
- **AC-3:** Given the overview, When the user clicks "Add Shoe" and submits valid data (photo URL, brand, name, date, location, km target in km), Then a new shoe is created and appears in the overview.
- **AC-4:** Given a shoe in the overview, When the user clicks "Edit" and changes details then saves, Then the shoe is updated and the overview reflects the changes.
- **AC-5:** Given a shoe in the overview (or edit), When the user triggers delete and confirms, Then the shoe is deleted and no longer appears in the overview.
- **AC-6:** Given the user triggers delete, When they cancel the confirmation, Then the shoe is not deleted.
- **AC-7:** Given invalid or missing required data on create/update, When the user submits, Then the backend returns a validation error and the user sees clear feedback (API and/or form).
- **AC-8:** Given the repo and dependencies, When the documented backend unit-test command is run, Then all backend unit tests pass (including those for shoe-related logic).
- **AC-9:** Given a database available and the backend integration-test command is run, When the integration tests execute, Then all backend integration tests pass (including at least one that covers shoe persistence or shoe HTTP endpoints).
- **AC-10:** Given the database schema for shoes, When a value longer than 75 characters is written for shoe name or brand (or a value greater than 100000 for kilometer target), Then the database constraint prevents or rejects it (schema enforces the limits).
- **AC-11:** Given the shoe create/edit form, When the user interacts with shoe name and brand inputs, Then each field accepts at most 75 characters (e.g. maxlength); when the user interacts with kilometer target, Then the value is restricted to at most 100000.
- **AC-12:** Given the Cypress E2E spec for shoes, When the "Component Test" describe block is run, Then it includes tests that verify max length (75) for shoe name and brand and max value (100000) for kilometer target (e.g. field length or validation behaviour), without requiring the real server.

---

## 9. Dependencies, Risks, Impact

- **Dependencies (teams / services / configs):** Existing auth (JWT, roles); Prisma and MySQL for persistence; frontend routing and navbar (role-based visibility for "Shoes"); OpenAPI generation. No external services; photo is URL only.
- **Risks / open technical uncertainties:** None major; photo URL validation (e.g. URL format) is implementation detail.
- **Impact on existing functionality:** New menu item "Shoes" (visible only to USER) and routes; new backend module and tables. Admin continues to see only administration features (e.g. Users); navbar shows "Shoes" only for USER. Users list and dashboard unchanged.

---

## 10. Open Points (Resolved)

All previously open points have been resolved:

1. **Shoe ownership:** Shoes are strictly per-user. No admin or other sharing; each user sees and manages only their own shoes.
2. **Admin and "Shoes" menu:** Admin sees only administration features and no user features. An admin does NOT see "Shoes" and cannot manage any shoes. Only a user (role USER) can see and manage shoes.
3. **Photo:** Photo is required and must be a URL to any image. No upload is required; the system stores and displays the URL only.
4. **Kilometer target:** The value is for tracking when a shoe is retired. The feature "how many kilometers were done with this shoe" is implemented in the future. For this ticket, the user can only enter a number with the unit km (kilometers).

---

*End of Requirement Sheet – Ticket 6*
