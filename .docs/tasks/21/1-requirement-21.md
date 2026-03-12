# Requirement Sheet – 21 – Admin: Create New User

## 0. Quick Facts

- **Ticket-ID:** 21
- **Short Description (1 sentence):** As an admin, the user can create a new user from the users overview page by clicking a "Nutzer anlegen" button and entering all required data, including the new user's password.
- **Goal / Value (max 5 bullets):**
  - Admins can onboard new users without using the database or API directly.
  - Single, clear entry point for user creation from the existing users overview.
  - Password is set by the admin at creation time (no self-registration flow).
- **Affected Roles:** Admin
- **Affected Modules/Components (conceptual):** Frontend: users overview page (/users); Backend: user creation endpoint (existing) and its tests.
- **In-Scope (max 5 bullets):**
  - "Nutzer anlegen" button on the /users overview page.
  - UI for entering all data required to create a user (including password).
  - Submitting the data to the backend create-user API and handling success and error responses.
  - Backend unit tests for the create-user behaviour (success and conflict).
  - Backend integration test(s) for create-user (persistence and HTTP boundary).
- **Out-of-Scope (max 5 bullets):**
  - Self-registration or password-reset flows.
  - Editing or deleting users.
  - Changing the existing user list or detail behaviour beyond adding the create entry point.
  - Changes to the existing create-user API contract (only frontend and tests in scope).

## 1. Context & Problem Statement

- **Current State (As-Is):** The backend exposes a create-user API (admin-only). The frontend has a users overview page (/users) that lists users; there is no UI to create a new user.
- **Problem / Pain:** Admins cannot create new users from the application; they would need to call the API directly or use another mechanism.
- **Target State (To-Be, without implementation details):** On the users overview page, an admin sees a "Nutzer anlegen" button. Using it, the admin can enter all data needed to create a user (including password) and submit. On success, the new user is created and the admin receives clear feedback; on error (e.g. duplicate email), the admin sees an appropriate message and can correct input.
- **Assumptions (if any were stated):** Only admins can access the users overview and create users; authentication and role checks remain as today. The existing create-user API remains the single backend contract for creation.
- **Non-Goals:** No self-service registration; no user edit/delete in this ticket; no change to the list/detail API or response shape beyond what is already defined.

## 2. Stakeholders & Roles

| Role   | Goal/Interest                                      | Rights/Constraints                    |
|--------|----------------------------------------------------|--------------------------------------|
| Admin  | Create new users (email, password, role) from the UI | Must be authenticated as ADMIN only  |
| User   | Not applicable for this feature                    | —                                    |

## 3. User Journeys / Use Cases

### UC 1: Create a new user from the users overview

- **Primary Actor:** Admin
- **Trigger:** Admin wants to add a new user and goes to the users overview page.
- **Preconditions:** Admin is logged in and has the ADMIN role; users overview page is accessible.
- **Flow (numbered, precise):**
  1. Admin opens the users overview page (/users).
  2. Admin sees a "Nutzer anlegen" (Create user) button.
  3. Admin clicks "Nutzer anlegen".
  4. A way is presented to enter user data: at least email, password, and optionally role.
  5. Admin enters email, password, and optionally selects role.
  6. Admin submits the form.
  7. System sends the data to the create-user API.
  8. If the API returns success: the new user is created; the admin is redirected to the user overview page and can see the new user in the list.
  9. If the API returns an error (e.g. email already in use): the admin sees an error message and can correct the input without losing other entered data where reasonable.
- **Outcome:** New user exists in the system with the given email, password (stored hashed), and role; admin is redirected to the user overview with clear success or error feedback.
- **Alternatives / Abort Paths:** Admin cancels or navigates away without submitting; invalid input is validated (e.g. password length, email format) and submission is blocked or errors shown until corrected.

### UC 2: Admin cannot create user when not authorized

- **Primary Actor:** Admin (or non-admin attempting access).
- **Trigger:** A non-admin user tries to open the create-user flow or call the create endpoint.
- **Preconditions:** User is logged in but does not have ADMIN role (or endpoint is called without valid admin auth).
- **Flow:** Access to the users overview and create flow is restricted to ADMIN; backend create endpoint rejects non-admin calls with 403.
- **Outcome:** Only admins can create users; others receive a forbidden/redirect response.
- **Alternatives / Abort Paths:** Redirect to dashboard or login as per existing auth rules.

## 4. Functional Requirements (MUST/SHOULD/MAY)

| ID    | Requirement (clear, atomic)                                                                 | Priority | Rationale / Value | Notes |
|-------|----------------------------------------------------------------------------------------------|----------|-------------------|-------|
| FR-1  | On the /users overview page, an actionable control (e.g. button) labeled "Nutzer anlegen" is visible to the admin. | MUST     | Entry point for creation. | — |
| FR-2  | The admin can enter at least: email, password, and optionally role for the new user.        | MUST     | Matches backend create contract. | Role default as per backend (e.g. USER). |
| FR-3  | The frontend submits the entered data to the existing create-user API when the admin confirms. | MUST    | Creation happens via API only. | — |
| FR-4  | On successful creation, the admin is redirected to the user overview page and receives clear success feedback; the new user appears in the list. | MUST | Confirms outcome. | — |
| FR-5  | On API error (e.g. 409 conflict for duplicate email), the admin sees an understandable error message and can correct input. | MUST | Usability and error handling. | — |
| FR-6  | Input validation: email format and password minimum length (8 characters) are validated before or at submit; invalid data is rejected with clear feedback. No additional password rules (e.g. complexity). | MUST | Data quality and alignment with backend rules. | Backend and frontend must both enforce min length 8. |
| FR-7  | Only users with ADMIN role can see and use the "Nutzer anlegen" flow and the create-user API. | MUST | Security and consistency with existing auth. | — |
| FR-8  | New or changed backend create-user behaviour is covered by unit tests (isolated, no real DB; e.g. service with mocked dependencies). | MUST | Quality and regression safety. | Backend create logic must have unit tests (success + conflict). |
| FR-9  | Behaviour that uses the database or HTTP boundary for user creation is covered by at least one integration test (real DB or test double as defined in the repo). | MUST | Ensures create flow works end-to-end at API level. | Required because creation involves persistence. |
| FR-10 | Password is not displayed in clear text after submission and is not logged or exposed in the UI beyond the input field. | MUST | Security and privacy. | — |
| FR-11 | The create form or flow can be abandoned (e.g. cancel) without creating a user. | SHOULD  | UX. | — |

## 5. Data & Interfaces (conceptual)

- **Data objects (terms + meaning, no final fields):**
  - **User (for creation):** Identity (e.g. email), secret (password, never stored in clear), role (e.g. ADMIN or USER). Backend stores a hash of the password and does not return it.
  - **Create result:** Success: representation of the created user (e.g. id, email, role, timestamps). Error: conflict when email already exists; other errors as per API contract.
- **Inputs / Outputs (high-level):**
  - Input: Email, password, optional role.
  - Output: Created user representation on success; error payload on failure (e.g. 409 for duplicate email).
- **External systems / integrations (if relevant):** None; only the existing backend REST API.
- **Authorization / AuthN/AuthZ requirements:** Only authenticated users with ADMIN role may access the users overview and the create-user API. Frontend and backend must enforce this.

## 6. States, Validations & Error Cases

### 6.1 States / Modes

- **Relevant states / flags:** User is on users overview; user has opened the create flow (form/dialog visible); form is pristine / dirty / submitting; creation succeeded or failed.
- **Transitions:** Open create flow → enter data → submit → (success → redirect to user overview page; error → stay in form with error message). Cancel → close form / back to list without creating.

### 6.2 Validations

| Field/Topic   | Rule (conceptual)                          | Error Reaction              | Visible Where (UI/API) | Condition   |
|---------------|--------------------------------------------|-----------------------------|------------------------|-------------|
| Email         | Valid email format                         | Block submit or show error  | UI (and API)           | On submit or blur |
| Email         | Must not already exist                     | Show error from API (409)   | UI                     | After API response |
| Password      | Non-empty; minimum length 8 characters; no other restrictions | Block submit or show error  | UI (and API)           | On submit    |
| Role          | If present, must be allowed value          | Reject invalid value        | UI (and API)           | On submit    |

### 6.3 Error Cases / Edge Cases

| Case                     | Trigger                    | Expected System Behavior                    | User Feedback                    | Category   |
|--------------------------|----------------------------|---------------------------------------------|----------------------------------|------------|
| Duplicate email          | Create with existing email | Backend returns 409 (or equivalent)         | Message that email is in use     | Business   |
| Invalid email format     | Invalid email in form      | Validation fails                             | Inline or submit-time message   | Validation |
| Password too short       | Password below min length  | Validation fails                             | Inline or submit-time message   | Validation |
| Not authenticated        | Unauthenticated request    | 401; redirect to login                      | Login page or error              | Auth       |
| Not admin                 | Non-admin calls create     | 403; no access to button/API                | Forbidden / redirect             | Auth       |
| Network / server error   | API unreachable or 5xx     | Request fails                                | Generic error message           | Technical  |

## 7. Non-Functional Requirements

- **Security:** Passwords must be sent only over HTTPS; backend hashes and stores passwords; no logging or display of plaintext passwords. Only ADMIN can create users.
- **Privacy / Compliance:** No PII in logs (e.g. no email in error logs if policy requires); handle user data according to existing project rules.
- **Performance / Scalability:** No specific targets; create is a single user action; validation and API call should feel responsive.
- **Logging / Auditing:** No new mandatory logging beyond existing; do not log request bodies containing passwords.
- **Usability / Accessibility (if relevant):** Form must be usable (labels, focus, errors readable); button and form accessible to keyboard and assistive tech where applicable.
- **Operability (monitoring, alerts) (if relevant):** No new requirements.

## 8. Acceptance Criteria (testable)

- AC-1: Given an admin is on the /users overview page, when the page has loaded, then a "Nutzer anlegen" button (or equivalent label) is visible.
- AC-2: Given the admin has clicked "Nutzer anlegen", when the create flow is shown, then the admin can enter email, password, and optionally role.
- AC-3: Given valid email, password (at least 8 characters), and optional role, when the admin submits, then the create-user API is called with these data and a new user is created; the admin is redirected to the user overview page and the new user appears in the list.
- AC-4: Given the admin submits with an email that already exists, when the API responds with conflict, then the admin sees an error message indicating the email is in use and can change the email and retry.
- AC-5: Given the admin enters invalid data (e.g. invalid email or password too short), when the admin submits, then validation prevents submission or shows clear errors and no user is created.
- AC-6: Given a logged-in user without ADMIN role, when they access the users area, then they cannot use the create-user flow (and/or are redirected) and the create-user API returns 403 for them.
- AC-7: Given the repo and dependencies, when the documented backend unit-test command is run, then all backend unit tests pass, including tests for user creation (success and duplicate-email conflict).
- AC-8: Given the database (or test double) is available and the backend integration-test command is defined and run, when the integration tests are executed, then all integration tests pass, including at least one test that verifies creating a user via the API and persistence.

## 9. Dependencies, Risks, Impact

- **Dependencies (teams / services / configs):** Existing backend create-user API and auth (ADMIN guard); frontend users overview and auth guard; OpenAPI/typed client may need to expose create method if not yet used.
- **Risks / open technical uncertainties:** None significant; create API already exists. If the project has no integration test setup yet, adding it is in scope for this ticket where integration tests are required.
- **Impact on existing functionality:** No change to existing list or detail behaviour; only addition of button and create flow. Backend contract unchanged; only tests and frontend are added or extended.

## 10. Resolved Open Points

- **Redirect after success:** The admin is redirected to the user overview page after successful creation (not "add another").
- **Password rules:** Minimum length is 8 characters; no additional restrictions (e.g. no complexity requirements). Frontend and backend must both enforce this.

---

*Quality gate: Requirements are atomic and testable; no implementation details (no code, no final DTOs, no migrations); scope and out-of-scope are clearly separated; backend unit and integration testing requirements included.*
