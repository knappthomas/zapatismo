# Requirement Sheet – 22 – Bulk Assign Shoe to Workouts

## 0. Quick Facts

- **Ticket-ID:** 22
- **Short Description (1 sentence):** A user can multi-select workouts on the workouts overview page and assign a single shoe to all selected workouts via a toolbar action and modal, after which the overview is refreshed.
- **Goal / Value (max 5 bullets):**
  - Users can assign a shoe to many workouts in one action instead of editing each workout individually.
  - Fewer clicks and less navigation (no need to open each workout’s edit page).
  - Shoe-based kilometer tracking remains accurate with less effort.
- **Affected Roles:** User (logged-in user with access to workouts and shoes).
- **Affected Modules/Components (conceptual):** Frontend: workouts overview page (/workouts), workouts table (list part), new selection column, toolbar, assign-shoe modal. Backend: possibly a new bulk-assign endpoint or reuse of existing workout-update API.
- **In-Scope (max 5 bullets):**
  - Select column at the start of the workouts table with multi-select (per row) and optional select-all.
  - Toolbar visible when at least one workout is selected, with an “Assign Shoe” action.
  - Modal opened by “Assign Shoe”: dropdown of the user’s shoes and an “Update” (confirm) control.
  - On confirm: every selected workout is assigned to the chosen shoe; overview data is refreshed.
  - Backend: either new bulk-assign behaviour or use of existing update contract; if new backend behaviour, unit and integration tests as required below.
- **Out-of-Scope (max 5 bullets):**
  - Changing how single-workout edit assigns a shoe (existing edit flow unchanged).
  - Bulk actions other than “Assign Shoe” (e.g. bulk delete, bulk unassign).
  - Changing the list of columns or the shoe display in the table beyond adding the select column.
  - Unassigning a shoe in bulk (clearing shoe from many workouts) unless explicitly added later.

## 1. Context & Problem Statement

- **Current State (As-Is):** Workouts are linked to shoes to track kilometers. The workouts overview (/workouts) shows a table of all workouts (type, start, end, distance, location, shoe, actions). To set or change the shoe for a workout, the user must open that workout’s edit page and select a shoe there.
- **Problem / Pain:** Assigning the same shoe to many workouts (e.g. after a Strava sync or after adding a new shoe) requires repeated navigation to each workout’s edit page and selecting the shoe each time.
- **Target State (To-Be, without implementation details):** On the workouts overview, the user can select one or more rows (workouts). When at least one is selected, a toolbar appears with an “Assign Shoe” action. Using it opens a modal where the user picks a shoe from their list and confirms. After confirmation, all selected workouts are assigned to that shoe and the overview is refreshed so the table shows the updated shoe for those workouts.
- **Assumptions (if any were stated):** The user has access to the workouts overview and to their shoes list; authentication and authorization remain as today (e.g. USER role). Workouts and shoes are already associated in the domain (workout can reference one shoe); the backend already supports updating a single workout’s shoe.
- **Non-Goals:** No change to single-workout edit flow; no other bulk actions in this ticket; no change to Strava sync or default-shoe behaviour.

## 2. Stakeholders & Roles

| Role   | Goal/Interest                                           | Rights/Constraints                         |
|--------|---------------------------------------------------------|--------------------------------------------|
| User   | Assign one shoe to many workouts from the overview      | Authenticated; can only see/edit own workouts and shoes |
| Admin  | Not primary actor for this feature                      | Per current rules (e.g. no access to user workouts) |

## 3. User Journeys / Use Cases

### UC 1: Bulk assign a shoe to selected workouts

- **Primary Actor:** User
- **Trigger:** User wants to assign the same shoe to several workouts and is on the workouts overview.
- **Preconditions:** User is logged in with access to /workouts; workouts overview shows at least one workout; user has at least one shoe (to assign).
- **Flow (numbered, precise):**
  1. User opens the workouts overview page (/workouts).
  2. User sees the workouts table with a new select column at the beginning (e.g. checkboxes).
  3. User selects one or more workouts via the select column (and optionally a “select all” control if present).
  4. A toolbar appears because at least one workout is selected; it includes an “Assign Shoe” button (or equivalent label).
  5. User clicks “Assign Shoe”.
  6. A modal opens showing a dropdown (or equivalent) of all shoes available to the user and a way to confirm (e.g. “Update” button).
  7. User selects one shoe and clicks the confirm control (e.g. “Update”).
  8. The system assigns the selected shoe to every selected workout.
  9. The modal closes and the overview is refreshed (e.g. list reloaded); the table shows the assigned shoe for the affected workouts.
- **Outcome:** All selected workouts are linked to the chosen shoe; the user sees the updated data without leaving the overview.
- **Alternatives / Abort Paths:** User closes the modal without confirming → no assignments change. User deselects all rows → toolbar hides. If the user has no shoes, the modal either does not offer a valid choice or shows an appropriate message (see validations).

### UC 2: User cancels or clears selection

- **Primary Actor:** User
- **Trigger:** User has selected workouts but decides not to assign a shoe or to change selection.
- **Preconditions:** Same as UC 1; at least one workout is selected and toolbar is visible.
- **Flow:** User closes the assign-shoe modal without confirming, or deselects all rows. Toolbar is hidden when no row is selected.
- **Outcome:** No workouts are changed; selection state is cleared or modal dismissed as appropriate.

### UC 3: Authorization and data isolation

- **Primary Actor:** System / User
- **Trigger:** Request to assign a shoe to workouts.
- **Preconditions:** User is authenticated; backend enforces ownership of workouts and shoes.
- **Flow:** Only the current user’s workouts can be selected and updated; only the current user’s shoes can be chosen. Backend rejects or does not expose other users’ data.
- **Outcome:** No cross-user data leakage; 403/404 behaviour as per existing API rules.

## 4. Functional Requirements (MUST/SHOULD/MAY)

| ID   | Requirement (clear, atomic)                                                                 | Priority | Rationale / Value | Notes |
|------|----------------------------------------------------------------------------------------------|----------|-------------------|-------|
| FR-1 | The workouts table on /workouts has a select column at the beginning allowing the user to select one or more rows (workouts). | MUST    | Enables bulk selection. | Per-row selection required. |
| FR-2 | When at least one workout is selected, a toolbar is visible with an “Assign Shoe” action (or equivalent label). | MUST    | Entry point for bulk assign. | Toolbar may contain only this action in scope. |
| FR-3 | When the user triggers “Assign Shoe”, a modal opens that shows the list of shoes available to the user (e.g. dropdown) and a confirm control (e.g. “Update” button). | MUST | User must choose which shoe to assign. | “Available” = shoes owned by the user. |
| FR-4 | When the user selects a shoe and confirms in the modal, the system assigns that shoe to every selected workout. | MUST | Core bulk-assign behaviour. | Implementation may use one bulk API or multiple single updates. |
| FR-5 | After a successful bulk assign, the modal closes and the workouts overview is refreshed so the table shows the updated shoe for the affected workouts. | MUST | User sees result without manual refresh. | |
| FR-6 | Selection state (which rows are selected) is clear and can be changed (select/deselect) or cleared (e.g. when no row selected, toolbar is hidden). | MUST | Usability and predictability. | |
| FR-7 | Only the current user’s workouts can be selected and updated; only the current user’s shoes can be chosen. Backend enforces ownership. | MUST | Security and data isolation. | Align with existing workout/shoe APIs. |
| FR-8 | If the user has no shoes, the assign-shoe flow must handle this (e.g. disable confirm, show message, or do not offer the action) so the user cannot confirm without a valid shoe. | MUST | Avoid invalid state. | |
| FR-9 | New or changed backend behaviour for bulk-assign (e.g. a dedicated bulk-assign endpoint) MUST be covered by unit tests (isolated, no real DB; e.g. service with mocked dependencies). | MUST | Quality and regression safety. | Only if backend adds new behaviour. |
| FR-10| Behaviour that touches the database or HTTP boundary for bulk-assign MUST be covered by at least one integration test (real DB or test double as defined in the repo). | MUST | Ensures bulk-assign works at API/DB level. | Only when backend implements bulk-assign (persistence/HTTP). |
| FR-11| On API or network failure during bulk assign, the user receives clear feedback (e.g. error message) and the modal can be dismissed; selection may be preserved so the user can retry. | SHOULD | Usability. | |
| FR-12| Optional “select all” (e.g. header checkbox) to select every workout currently shown in the list in one click. (At the moment there is no pagination, so this selects all workouts in the list.) | MAY     | Convenience. | Can be deferred. |

## 5. Data & Interfaces (conceptual)

- **Data objects (terms + meaning, no final fields):**
  - **Workout:** Entity shown in the table; has an identifier and an optional shoe reference (for display and for update). User can only see and select their own workouts.
  - **Shoe:** Entity the user can assign; has an identifier and display name (e.g. brand + model). User can only see and choose their own shoes.
  - **Selection:** Set of workout identifiers currently selected in the table.
  - **Bulk-assign input (conceptual):** A set of workout identifiers and one shoe identifier. Output: success (all updated) or failure (with appropriate error information).
- **Inputs / Outputs (high-level):**
  - User input: which rows are selected; which shoe is chosen in the modal; confirm/cancel.
  - System output: updated workout list (after refresh) with shoe shown for each workout; or error message if the assign operation fails.
- **External systems / integrations (if relevant):** None beyond the existing backend REST API (workouts and shoes).
- **Authorization / AuthN/AuthZ requirements:** Same as existing workouts and shoes: authenticated user, ownership of workouts and shoes enforced by the backend. No new roles required.

## 6. States, Validations & Error Cases

### 6.1 States / Modes

- **Relevant states / flags:** No row selected; one or more rows selected (toolbar visible); assign-shoe modal open/closed; assign in progress (loading); assign success or error.
- **Transitions:** Select rows → toolbar appears; click “Assign Shoe” → modal opens; choose shoe and confirm → assign runs → success: modal close + refresh; error: show message, modal may stay or close. Cancel/close modal → no assign; deselect all → toolbar hides.

### 6.2 Validations

| Field/Topic     | Rule (conceptual)                          | Error Reaction              | Visible Where (UI/API) | Condition   |
|-----------------|--------------------------------------------|-----------------------------|------------------------|-------------|
| Shoe selection  | User must select exactly one shoe to assign | Confirm disabled or error   | UI (modal)             | Before submit |
| Workout IDs     | All must belong to current user             | Backend rejects (e.g. 403/404) | API + UI message      | On submit    |
| Shoe ID         | Must belong to current user                | Backend rejects (e.g. 400/403) | API + UI message      | On submit    |
| At least one workout selected | Required to show toolbar and allow Assign Shoe | Button disabled or hidden when none selected | UI | Always       |

### 6.3 Error Cases / Edge Cases

| Case                        | Trigger                         | Expected System Behavior                 | User Feedback                 | Category   |
|-----------------------------|----------------------------------|------------------------------------------|-------------------------------|------------|
| No shoe selected in modal   | User clicks confirm without picking a shoe | Confirm disabled or validation message   | Inline in modal               | Validation |
| Shoe not found / not owned  | Backend rejects shoeId          | API returns error                        | Error message in modal or toast | Business   |
| Workout not found / not owned | Backend rejects one or more workout IDs | API returns error                     | Error message; no partial update or clear message | Business   |
| Network / server error      | API unreachable or 5xx          | Request fails                            | Generic error message         | Technical  |
| Partial failure (if multiple single updates used) | One of N updates fails        | Show generic error; no rollback of already-applied updates      | Generic error message; selection may be kept for retry | Technical  |

## 7. Non-Functional Requirements

- **Security:** Only the authenticated user’s workouts and shoes are selectable and updatable; backend must enforce ownership on any new or used endpoints. No new exposure of PII.
- **Privacy / Compliance:** No new data collection or logging of sensitive data beyond existing workout/shoe handling.
- **Performance / Scalability:** Bulk assign should complete in a reasonable time for typical selection sizes (e.g. tens of workouts); UI should show loading state during the operation. There is no maximum selection size; user may select any number of workouts shown.
- **Logging / Auditing:** No new mandatory logging; do not log full request bodies if they contain many IDs (optional).
- **Usability / Accessibility:** Select column and toolbar must be keyboard- and screen-reader-friendly where applicable; modal must be focusable and closable; labels and errors must be clear.
- **Operability (monitoring, alerts):** No new requirements.

## 8. Acceptance Criteria (testable)

- AC-1: Given the user is on /workouts with at least one workout in the table, when the page has loaded, then a select column (e.g. checkboxes) is present at the beginning of the table and the user can select one or more rows.
- AC-2: Given at least one workout is selected, when the user looks at the page, then a toolbar is visible with an “Assign Shoe” (or equivalent) action.
- AC-3: Given no workout is selected, when the user looks at the page, then the “Assign Shoe” toolbar is not visible (or the action is disabled).
- AC-4: Given the user has selected one or more workouts and clicks “Assign Shoe”, when the modal opens, then the user sees a list (e.g. dropdown) of their shoes and a confirm control (e.g. “Update”); the user can select a shoe and confirm.
- AC-5: Given the user has selected a shoe and confirmed in the modal, when the assign operation succeeds, then the modal closes, the overview data is refreshed, and the table shows the assigned shoe for each of the previously selected workouts.
- AC-6: Given the user has selected workouts and opens the assign-shoe modal, when the user closes the modal without confirming, then no workouts are updated and selection (if still visible) remains unchanged.
- AC-7: Given the user has no shoes, when they open the assign-shoe modal (or attempt to use “Assign Shoe”), then they cannot complete the assign (e.g. confirm disabled or message that no shoes are available).
- AC-8: Given the backend implements new bulk-assign behaviour (e.g. bulk-assign endpoint), when the documented backend unit-test command is run, then all backend unit tests pass, including tests for the new bulk-assign behaviour.
- AC-9: Given the backend implements bulk-assign that touches the database or HTTP boundary, when the backend integration-test command is run (with DB/test double available), then all integration tests pass, including at least one test that verifies bulk-assign via the API and persistence.

## 9. Dependencies, Risks, Impact

- **Dependencies (teams / services / configs):** Existing workouts list API, shoes list API, and (if reused) single workout-update API; frontend workouts overview and list part component; auth/role guards unchanged.
- **Risks / open technical uncertainties:** If the solution uses multiple single PATCH requests and one fails, show a generic error (no rollback). No maximum selection size; if a single bulk endpoint is added, design may still consider very large payloads for robustness.
- **Impact on existing functionality:** Existing single-workout edit and shoe assignment there remain unchanged. Workouts overview gains a select column and toolbar; table layout may shift slightly. No change to Strava sync or default-shoe logic.

## 10. Resolved Open Points

- **Partial failure:** If multiple single-workout updates are used and one update fails, show a generic error to the user. No rollback of already-applied updates.
- **Max selection size:** No maximum; the user may select any number of workouts.
- **Select-all scope:** There is no pagination at the moment. If “select all” is implemented, it selects every workout currently shown in the list.

---

QUALITY GATE (before finishing):
- Requirements are atomic, unambiguous, testable.
- No implementation details (no code, no final DTOs, no migrations).
- Scope and Out-of-Scope are clearly separated.
- Backend testing (unit + integration) required when backend adds new behaviour.
