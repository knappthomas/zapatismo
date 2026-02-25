# Requirement Sheet – 9 – Shoe Usage Statistics (Steps & Distance in Overview Grid)

## 0. Quick Facts

- **Ticket-ID:** 9
- **Short Description (1 sentence):** The user can see, per shoe in the overview grid, how many kilometers and how many steps have been made with that shoe; totals are derived from workouts linked to the shoe, with total steps shown as a number and total kilometers shown as a progress bar (100% = shoe’s target km).
- **Goal / Value (max 5 bullets):**
  - User sees at a glance how much each shoe has been used (steps and distance).
  - Totals are calculated from workouts that are linked to that shoe (single source of truth).
  - Total step count is displayed as a number in the shoes overview grid.
  - Total kilometers are displayed as a progress bar where 100% corresponds to the shoe’s target kilometer value.
  - Backend exposes aggregated totals (or data to compute them); behaviour is covered by unit and integration tests.
- **Affected Roles:** Authenticated user (role USER) viewing the shoes overview; admin (ADMIN) is out of scope for this feature (no change to admin flows).
- **Affected Modules/Components (conceptual):** Backend: shoe list or shoe resource (per-shoe aggregated totals from workouts); Frontend: shoes overview grid (and optionally list view) displaying total steps and km progress.
- **In-Scope (max 5 bullets):**
  - Backend: Provide per-shoe aggregated values—total steps and total distance (km)—calculated from workouts where the workout is linked to that shoe; consumed by the frontend for the overview (e.g. via list response or equivalent).
  - Frontend: Shoes overview **grid** shows for each shoe: total step count as a number, and total kilometer as a progress bar with 100% = shoe’s target km.
  - Correct aggregation rules: only workouts with `shoeId` equal to the shoe’s id are included; sum of `steps`, sum of `distanceKm`.
  - Backend unit tests for new/changed aggregation logic; backend integration tests for behaviour that touches the database or HTTP layer.
  - Acceptance criteria verifiable by running backend unit and integration tests, and by manual/E2E checks on the grid display.
- **Out-of-Scope (max 5 bullets):**
  - Changing how workouts are created or how shoes are assigned to workouts (already in place).
  - Shoe detail page or drill-down into “workouts per shoe” (list of workouts) in this ticket.
  - Dashboard shoes widget: only the **shoes overview grid** is in scope; dashboard may be updated in a follow-up if desired.
  - Changing `kilometerTarget` validation at create/edit time (0 is not expected but handled at display time).
  - Strava integration or external sync; data remains backoffice/workouts only.

---

## 1. Context & Problem Statement

- **Current State (As-Is):**
  - Shoes and workouts exist. Workouts can be linked to a shoe (`shoeId`). The shoes overview has a grid (and list) view showing shoe name, brand, target km, etc., but **no** usage statistics (no total steps or total km per shoe).
- **Problem / Pain:**
  - The user cannot see how much they have used a shoe (steps and distance). They want this visible in the overview grid so they can compare usage and progress toward the shoe’s target km.
- **Target State (To-Be, without implementation details):**
  - In the shoes overview grid, each shoe card shows: (1) total step count as a number, and (2) total kilometers as a progress bar where 100% represents the shoe’s target kilometer value. Totals are calculated from all workouts linked to that shoe. The system provides these totals (or the raw data to compute them) in a way the frontend can use; backend logic is covered by unit and integration tests.
- **Assumptions (if any were stated):**
  - “Overview grid” means the grid view on the shoes overview page (existing grid of shoe cards).
  - “Target-kilometer count of the shoe” is the existing shoe field used as the target (e.g. `kilometerTarget`).
  - Workouts linked to a shoe are those with the corresponding shoe reference (e.g. `shoeId` = shoe id).
- **Non-Goals:**
  - Redesign of shoe CRUD or workout CRUD; no new entities; no implementation details (no DTOs, no schema changes) in this requirement.

---

## 2. Stakeholders & Roles

| Role | Goal/Interest | Rights/Constraints |
|------|----------------|-------------------|
| User (USER) | See per-shoe usage (steps and km) in the shoes overview grid to track progress toward target. | Authenticated; only sees own shoes and aggregates from own workouts. |
| Frontend developer | Display total steps (number) and total km (progress bar, 100% = target) in the grid using data from the API. | Must use API contract; Tailwind + daisyUI. |
| Backend developer | Expose per-shoe totals (steps, distance km) derived from linked workouts; keep API consistent and tested. | Stateless; DTOs; OpenAPI in sync; unit + integration tests. |

---

## 3. User Journeys / Use Cases

### UC 1: View shoe usage (steps and distance) in the overview grid

- **Primary Actor:** Authenticated user (USER).
- **Trigger:** User opens the shoes overview and selects grid view to see how much each shoe has been used.
- **Preconditions:** User is logged in; shoes overview and grid view exist; shoes and optionally workouts exist.
- **Flow:**
  1. User navigates to the shoes overview and ensures grid view is active.
  2. System displays each shoe in the grid with: total step count (number) and total kilometers (progress bar, 100% = shoe’s target km).
  3. Totals are computed from workouts that are linked to that shoe.
- **Outcome:** User sees at a glance the steps and km per shoe and progress toward the target km.
- **Alternatives / Abort Paths:** Shoe with no linked workouts → total steps = 0, total km = 0, progress bar at 0%. Not authenticated → redirect to login.

### UC 2: Interpret progress toward target

- **Primary Actor:** Authenticated user (USER).
- **Trigger:** User wants to know how close a shoe is to its target kilometers.
- **Preconditions:** User is on the shoes overview grid; shoe has a target km value.
- **Flow:**
  1. User looks at the progress bar for a shoe.
  2. Progress bar represents total km done vs. target km (100% = target reached or exceeded).
- **Outcome:** User can see whether a shoe is under, at, or over target without opening detail or workouts list.
- **Alternatives / Abort Paths:** Target = 0 (should not occur) → progress bar uses default 800 km as denominator (see §6).

---

## 4. Functional Requirements (MUST/SHOULD/MAY)

| ID | Requirement (clear, atomic) | Priority | Rationale / Value | Notes |
|----|----------------------------|----------|-------------------|--------|
| FR-1 | Per-shoe total steps and total distance (km) are calculated by summing, for all workouts linked to that shoe, the workout’s steps and distance (e.g. `distanceKm`) respectively. | MUST | Single source of truth: workouts. | Only workouts with shoeId = shoe.id. |
| FR-2 | The system (backend) exposes to the frontend, for each shoe in the list (or equivalent), the aggregated total steps and total distance km for that shoe. | MUST | Frontend needs data to render number and progress bar. | Contract and representation are defined in implementation plan. |
| FR-3 | In the shoes overview **grid**, each shoe card shows the total step count as a number. | MUST | User-requested: “total step count as a number”. | |
| FR-4 | In the shoes overview **grid**, each shoe card shows the total kilometers as a progress bar where 100% corresponds to the shoe’s target kilometer value. | MUST | User-requested: “total kilometer as a progress bar (100% is the target-kilometer count)”. | |
| FR-5 | When a shoe has no linked workouts, total steps and total km are zero; the progress bar shows 0% (or equivalent). | MUST | Predictable behaviour for new or unused shoes. | |
| FR-6 | When total km equals or exceeds the shoe’s target km, the progress bar MUST NOT exceed 100% (cap at 100%). | MUST | Avoid misleading “over 100%” bar; requirement is to cap. | |
| FR-7 | When the shoe’s target km is 0 (should not occur in normal use), the progress bar MUST use a default value of 800 km as the denominator (100%) so that division by zero is avoided and display remains meaningful. | MUST | Defensive handling; product decision: 800 km default. | |
| FR-8 | New or changed backend aggregation logic is covered by unit tests (isolated, no real DB). | MUST | Project rules: backend behaviour covered by unit tests. | |
| FR-9 | Behaviour that uses the database or HTTP layer for shoe aggregates is covered by at least one integration test. | MUST | Project rules: persistence/HTTP covered by integration tests. | |
| FR-10 | The same totals (steps, km) MAY be shown in the shoes overview **list** view for consistency. | MAY | Improves consistency; not required for this ticket. | |

---

## 5. Data & Interfaces (conceptual)

- **Data objects (terms + meaning, no final fields):**
  - **Shoe:** Existing concept (id, name, brand, target km, etc.). For display, the system must provide (or allow derivation of) **total steps** and **total distance km** per shoe.
  - **Total steps (per shoe):** Sum of `steps` over all workouts where the workout’s shoe reference equals this shoe’s id.
  - **Total distance km (per shoe):** Sum of distance (e.g. `distanceKm`) over the same set of workouts.
  - **Target km:** The shoe’s existing target value; 100% of the progress bar corresponds to this value. If the stored value is 0, 800 km is used as the default denominator for the progress bar (defensive handling; 0 is not expected).

- **Inputs / Outputs (high-level):**
  - **Input:** User requests shoes list (existing flow); no new user input for aggregation.
  - **Output:** For each shoe, the frontend receives (or can compute) total steps and total km so it can render the number and the progress bar (percentage = total km / effective target km, capped at 100%; effective target = 800 km when stored target is 0, otherwise the shoe’s target km).

- **External systems / integrations:** None.

- **Authorization / AuthN/AuthZ:** Same as existing shoes list: only the authenticated owner sees their shoes; aggregates are computed only from that user’s workouts linked to their shoes.

---

## 6. States, Validations & Error Cases

### 6.1 States / Modes

- **Relevant states:** Shoe has zero linked workouts vs. one or more. Total km &lt; target vs. = target vs. &gt; target (display: cap at 100%).
- **Transitions:** No new state machine; aggregates change when workouts are added/updated/deleted or shoe assignment changes.

### 6.2 Validations

| Field/Topic | Rule | Error Reaction | Visible Where | Condition |
|-------------|------|----------------|---------------|-----------|
| Total steps | Sum of non-negative integers; never negative. | N/A (derived). | Grid (number). | Backend must only sum; workout steps already validated. |
| Total km | Sum of non-negative distances; never negative. | N/A (derived). | Grid (progress bar). | Same. |
| Progress bar denominator (target km) | Target km = 0 should never occur; if it is 0, use 800 km as default denominator. | Progress bar percentage = total km / 800; no division by zero. | Grid. | When shoe’s target km is 0. |

### 6.3 Error Cases / Edge Cases

| Case | Trigger | Expected System Behavior | User Feedback | Category |
|------|---------|---------------------------|---------------|----------|
| Shoe has no linked workouts | User views grid; shoe has no workouts with this shoeId. | Total steps = 0, total km = 0; progress bar 0%. | “0” and empty/0% bar. | Happy path. |
| Total km &gt; target km | Many workouts; sum of distance exceeds shoe target. | Progress bar capped at 100%. | Bar full (100%). | Display rule. |
| Shoe target km = 0 | Edge data (0 should not occur). | Use default 800 km as denominator for progress bar; display as total km / 800, capped at 100%. | Progress bar remains meaningful. | Edge. |
| Shoes list API failure | Network or server error when loading shoes (with aggregates). | Same as current shoes list error handling (e.g. error message, retry). | Existing error UX. | Existing. |

---

## 7. Non-Functional Requirements

- **Security:** No new endpoints or data beyond current shoes list scope; aggregates only from the authenticated user’s workouts and shoes. No PII added.
- **Privacy / Compliance:** No change.
- **Performance / Scalability:** Aggregation should be efficient (e.g. single query or bounded work per user); avoid N+1 when loading shoes with totals.
- **Logging / Auditing:** No new audit requirement; follow existing backend logging for errors.
- **Usability / Accessibility:** Progress bar and number must be readable and correctly associated with the shoe (e.g. labels or context). Prefer accessible progress indicator (e.g. `role="progressbar"` and `aria-*` as per implementation).
- **Operability:** No new monitoring requirement.

---

## 8. Acceptance Criteria (testable)

- **AC-1:** Given a shoe with one or more linked workouts, when the user opens the shoes overview in grid view, then each shoe card shows the total step count (sum of steps of those workouts) as a number.
- **AC-2:** Given a shoe with a target km &gt; 0 and linked workouts, when the user opens the shoes overview in grid view, then the shoe card shows a progress bar for total km where 100% corresponds to the shoe’s target km, and the bar is capped at 100% if total km ≥ target.
- **AC-2b:** Given a shoe with target km = 0 (edge case), when the progress bar is computed, then 800 km is used as the denominator (100%) so the bar displays without division by zero.
- **AC-3:** Given a shoe with no linked workouts, when the user opens the shoes overview in grid view, then that shoe shows total steps 0 and total km progress at 0% (or equivalent).
- **AC-4:** Given the repo and dependencies, when the documented backend unit-test command is run, then all unit tests pass (including new tests for aggregation logic).
- **AC-5:** Given the database is available and migrations applied, when the backend integration-test command is run, then all integration tests pass (including tests for shoe list or aggregate behaviour that touches the DB/HTTP).

---

## 9. Dependencies, Risks, Impact

- **Dependencies:** Existing shoes and workouts modules; workout `shoeId` and shoe `kilometerTarget` semantics unchanged. Frontend depends on backend providing (or enabling) per-shoe totals.
- **Risks / open technical uncertainties:** None major; aggregation is straightforward. Target km = 0 is handled by using 800 km as default denominator (§6).
- **Impact on existing functionality:** Shoes list API may gain new response fields (or a new endpoint); frontend grid gains two display elements. Existing shoe CRUD and workout CRUD unchanged. List view unchanged unless FR-9 is implemented.

---

## 10. Open Points (UNRESOLVED)

- None. **Resolved – Target km = 0:** Shoe target km = 0 should never occur in normal use. If it is 0 (edge case), the system MUST use a default value of **800 km** as the progress bar denominator (100%) so that the bar displays correctly and no division by zero occurs.

QUALITY GATE (before finishing):
- Requirements are atomic, unambiguous, testable.
- No implementation details (no code, no final DTOs, no migrations).
- Every ambiguity is captured as UNRESOLVED with a concrete question.
- Scope and Out-of-Scope are clearly separated.
