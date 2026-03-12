# Requirement Sheet – 28 – Self-Registration

## 0. Quick Facts

- **Ticket-ID:** 28
- **Short Description (1 sentence):** A new user can register via a public registration flow: from the login page they follow a link to a registration form (email, password), submit, and then obtain access to the platform.
- **Goal / Value (max 5 bullets):**
  - Users can create their own account without admin involvement.
  - Single, clear path from login page to registration and into the app.
  - Reduces dependency on backoffice for onboarding.
  - Keeps the flow minimal (no email verification, no extra validation) for a personal platform.
- **Affected Roles:** Unauthenticated visitor (new user), existing users (unchanged), admin (unchanged).
- **Affected Modules/Components (conceptual):** Frontend: login page (link), new registration page and form; Backend: public registration endpoint and service logic; Auth: unchanged for login.
- **In-Scope (max 5 bullets):**
  - Link on the login page that leads to the registration form.
  - Registration form with email and password; user can submit to register.
  - Backend capability to create a user from the registration flow (public, no admin auth); new user has role USER.
  - After successful registration, the user is redirected to the login page with a success message and can sign in.
  - Backend unit tests and integration tests for registration behaviour.
  - Shared password validation (minimum length 8): a common util used by backend and frontend for both admin user creation and registration.
- **Out-of-Scope (max 5 bullets):**
  - Email verification (no confirmation emails or links).
  - Captcha, rate limiting, or advanced anti-abuse beyond duplicate-email handling.
  - Password strength rules beyond minimum length 8 (same as admin).
  - Changing the existing admin-only user-creation flow or backoffice behaviour.
  - Password reset or “forgot password” flows.

## 1. Context & Problem Statement

- **Current State (As-Is):** New users can only be created by an admin via the backoffice (e.g. users overview and create-user form). There is no way for an unauthenticated person to create an account.
- **Problem / Pain:** Every new user must be created by an admin; there is no self-service registration.
- **Target State (To-Be, without implementation details):** On the login page, the user sees a link to register. Clicking it leads to a registration form where they enter email and password (minimum length 8, same as admin). After confirming registration, they are redirected to the login page with a success message and can sign in to access the platform. The platform remains minimal: no email verification, no extra validation beyond what is necessary. Password validation (min length 8) is implemented via a common util shared between backend and frontend and used by both admin user creation and registration.
- **Assumptions (if any were stated):** The platform is personal use; no validation beyond the minimal necessary (e.g. duplicate email check) and no email sending are required. Newly registered users receive the USER role (not ADMIN).
- **Non-Goals:** Email verification, captcha, complex validation, changes to admin user creation.

## 2. Stakeholders & Roles

| Role | Goal/Interest | Rights/Constraints |
|------|----------------|-------------------|
| Unauthenticated visitor | Wants to create an account and use the platform | Can open login page and follow link to registration; no prior account required |
| Newly registered user | Wants to access the app after registering | Gets USER role; can use the app like any other non-admin user |
| Admin | Manages users via backoffice | Unchanged; can still create users via existing admin flow |
| Existing user | Signs in as today | Unchanged; login flow unchanged |

## 3. User Journeys / Use Cases

### UC 1: Open registration from login

- **Primary Actor:** Unauthenticated visitor
- **Trigger:** User is on the login page and wants to register
- **Preconditions:** User is not authenticated; login page is displayed
- **Flow:**
  1. User sees the login form and a link to registration (e.g. “Register” or “Create account”).
  2. User clicks the link.
  3. User is taken to the registration form (dedicated route/page).
- **Outcome:** User is on the registration form and can enter email and password.
- **Alternatives / Abort Paths:** User closes the page or navigates away — no system action.

### UC 2: Register and obtain access

- **Primary Actor:** Unauthenticated visitor
- **Trigger:** User has filled in the registration form (email, password) and confirms (e.g. clicks “Register” or “Create account”).
- **Preconditions:** User is on the registration form; email and password are provided as required.
- **Flow:**
  1. User submits the registration form.
  2. System creates a new user with the given email and password (stored securely), with role USER.
  3. System redirects the user to the login page with a success message (e.g. “Account created. Please sign in.”).
  4. User signs in on the login page and can then use the platform according to their role (USER).
- **Outcome:** A new user account exists; the user is on the login page with a success message and can sign in to access the tool.
- **Alternatives / Abort Paths:** If the email is already in use, the system rejects registration and shows a clear message (e.g. “This email is already registered”); the user can correct the email or go to login. On other errors, the system shows an appropriate message and the user can retry or go back.

### UC 3: Attempt to register with duplicate email

- **Primary Actor:** Unauthenticated visitor
- **Trigger:** User submits the registration form with an email that already exists.
- **Preconditions:** User is on the registration form; email is already associated with an existing account.
- **Flow:**
  1. User submits the form.
  2. System detects duplicate email and does not create a new user.
  3. System returns an error and displays a clear message (e.g. email already in use).
  4. User can change the email or navigate to login.
- **Outcome:** No duplicate account; user is informed.
- **Alternatives / Abort Paths:** None.

## 4. Functional Requirements (MUST/SHOULD/MAY)

| ID | Requirement (clear, atomic) | Priority | Rationale / Value | Notes |
|----|----------------------------|----------|------------------|--------|
| FR-1 | The login page MUST show a link that leads to the registration form. | MUST | Entry point for registration. | Link text and route are design choices. |
| FR-2 | A dedicated registration view MUST be reachable without being authenticated. | MUST | Registration is for new users. | Public route. |
| FR-3 | The registration form MUST collect at least email and password. | MUST | Needed to create an account and later sign in. | No extra required fields unless clarified. |
| FR-4 | The system MUST create a new user when registration is submitted with valid input and the email is not already in use; the new user MUST have role USER. | MUST | Core registration behaviour; prevents admin-only account creation. | Stored password must be hashed (security baseline). |
| FR-5 | The system MUST reject registration when the email is already in use and MUST return a clear, user-visible message. | MUST | Prevents duplicate accounts and informs the user. | Consistent with existing duplicate-email handling. |
| FR-6 | After successful registration, the user MUST be redirected to the login page with a success message so they can sign in. | MUST | User obtains access by signing in after registration. | No automatic sign-in; redirect to login with message. |
| FR-7 | Password MUST have a minimum length of 8 characters for registration, the same rule as for admin-created users. | MUST | Consistency and security baseline. | Same rule in admin area and registration. |
| FR-8 | Password validation (minimum length 8) MUST be implemented via a common util shared between backend and frontend; both admin user creation and registration MUST use this util so the rule is defined once and reused. | MUST | Single source of truth for password rule; avoid duplication. | Util used on server (e.g. DTO/validation) and in frontend (e.g. form validators / shared constant). |
| FR-9 | New or changed backend registration logic MUST be covered by unit tests (isolated, no real DB). | MUST | Project rule: backend behaviour covered by unit tests. | E.g. success, duplicate email, validation. |
| FR-10 | Registration behaviour that touches the database or HTTP boundary MUST be covered by at least one integration test. | MUST | Project rule: persistence and boundaries covered by integration tests. | Real DB or test double as defined in repo. |
| FR-11 | Registration endpoint MUST be public (no authentication required). | MUST | Unauthenticated users must be able to register. | |
| FR-12 | The system SHOULD apply minimal validation necessary for correctness and security (e.g. required fields, duplicate email). | SHOULD | Personal platform; no heavy validation, but basic rules. | No email verification, no captcha. |
| FR-13 | The registration form MAY show a link back to the login page. | MAY | Improves navigation. | |

**Backend testing:** FR-9 (unit tests) and FR-10 (integration tests) satisfy the mandatory backend testing requirements for this ticket.

## 5. Data & Interfaces (conceptual)

- **Data objects (terms + meaning, no final fields):**
  - **Registration input:** Email (unique identifier for the account), password (secret used to authenticate later). No email verification token or extra profile data in scope.
  - **User (existing concept):** Id, email, stored password (hashed), role (USER for self-registered), timestamps. No schema change required for registration itself; same user model as admin-created users.
- **Inputs / Outputs (high-level):**
  - **Input:** Email + password from the registration form.
  - **Output (success):** Success indicator and redirect to login page with a success message; no token returned. No need to expose internal user id or hashed password to the client.
  - **Output (error):** Clear indication of failure (e.g. email already in use, validation error) so the UI can show a message.
- **External systems / integrations:** None for registration (no email sending, no third-party auth in scope).
- **Authorization / AuthN/AuthZ:** Registration is unauthenticated (public). New users get role USER. Existing auth (JWT, guards) unchanged for login and protected routes.

## 6. States, Validations & Error Cases

### 6.1 States / Modes

- **Relevant states / flags:** Unauthenticated user on login page; unauthenticated user on registration page; after successful registration: redirected to login page with success message.
- **Transitions:** Login page → (click register link) → Registration page → (submit valid form) → Login page with success message → (user signs in) → Main app. Registration page → (submit duplicate email) → Stay on registration with error message.

### 6.2 Validations

| Field/Topic | Rule | Error Reaction | Visible Where (UI/API) | Condition |
|-------------|------|----------------|------------------------|-----------|
| Email | Required; must be usable for login (e.g. valid format). | Reject request; return validation error. | Registration form / API response | On submit |
| Email | Must not already exist. | Reject; return conflict/duplicate-email error. | Registration form / API response | On submit |
| Password | Required; minimum length 8 (same as admin user creation). | Reject request; return validation error. | Registration form / API response | On submit; rule shared via common util (backend and frontend). |

No email verification, no captcha, no password strength rules beyond minimum length 8.

### 6.3 Error Cases / Edge Cases

| Case | Trigger | Expected System Behavior | User Feedback | Category |
|------|---------|---------------------------|---------------|----------|
| Duplicate email | Registration with email that already exists | Do not create user; return conflict. | Clear message (e.g. “This email is already registered”) | Business rule |
| Missing or invalid email | Submit without email or invalid format | Reject; do not create user. | Validation message on form / API | Validation |
| Missing or invalid password | Submit without password or shorter than 8 characters | Reject; do not create user. | Validation message on form / API | Validation; same rule as admin. |
| Backend/DB error | Persistence or server failure | Do not create user; return server error. | Generic error message; user can retry | Failure |

## 7. Non-Functional Requirements

- **Security:** Passwords MUST be stored in hashed form (same as existing user creation). Registration endpoint is public; no sensitive data in logs (e.g. no logging of passwords). No new secrets in frontend; use existing auth mechanism after registration (e.g. token).
- **Privacy / Compliance:** No email sending; no extra data collection in scope. Same privacy considerations as existing user creation.
- **Performance / Scalability:** Registration is a single request; no special performance requirements beyond normal API behaviour.
- **Logging / Auditing:** Log registration attempts (e.g. success/failure, no PII/password). Align with existing logging standards.
- **Usability / Accessibility:** Registration form must be reachable and submittable; link on login must be clearly identifiable. Follow existing frontend conventions (e.g. Tailwind, daisyUI).
- **Operability:** No additional monitoring or alerts required for this feature.

## 8. Acceptance Criteria (testable)

- AC-1: Given an unauthenticated user on the login page, when they look at the page, then a link to the registration form is visible.
- AC-2: Given the user clicks the registration link on the login page, when the app responds, then the user is on the registration form (dedicated route).
- AC-3: Given the user is on the registration form, when they enter a valid email and password (not already in use, password at least 8 characters) and submit, then a new user with role USER is created and the user is redirected to the login page with a success message and can sign in.
- AC-4: Given the user submits the registration form with an email that already exists, when the app responds, then no new user is created and the user sees a clear message that the email is already in use.
- AC-5: Given the user submits the registration form with missing or invalid email or password shorter than 8 characters (per shared validation rule), when the app responds, then no user is created and the user sees an appropriate validation message.
- AC-6: Given the repository and dependencies, when the documented backend unit-test command is run, then all unit tests pass (including those for registration).
- AC-7: Given the database is available and the backend is configured, when the documented backend integration-test command is run, then all integration tests pass (including those for registration).
- AC-8: Given admin user creation and registration both validate password length, when the implementation is in place, then both use the same common util (backend and frontend) for the minimum length (8) so the rule is defined once and reused.

## 9. Dependencies, Risks, Impact

- **Dependencies:** Existing auth mechanism (login, JWT, guards); existing user model and persistence (Prisma); frontend routing and auth service. No external services for registration.
- **Risks / open technical uncertainties:** None significant; registration reuses existing user creation concepts. Optional: decide whether to reuse existing “create user” backend logic (with a public endpoint and fixed role) or add a dedicated “register” endpoint.
- **Impact on existing functionality:** Admin user creation and login remain unchanged. New public registration path and route; no change to existing protected routes or guards beyond ensuring registration route is public.

## 10. Open Points (UNRESOLVED)

- None. Resolved: (1) After registration, redirect to login page with success message. (2) Password minimum length 8, same as admin. (3) Shared password-validation util used by backend and frontend for both admin user creation and registration.

QUALITY GATE (before finishing):
- Requirements are atomic, unambiguous, testable.
- No implementation details (no code, no final DTOs, no migrations).
- Every ambiguity is captured as UNRESOLVED with a concrete question.
- Scope and Out-of-Scope are clearly separated.
