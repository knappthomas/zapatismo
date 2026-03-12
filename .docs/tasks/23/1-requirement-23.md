# Requirement Sheet – 23 – Default Running Shoe and Default Walking Shoe

## 0. Quick Facts
- **Ticket-ID:** 23
- **Short Description (1 sentence):** Replace the single "default shoe" with two type-specific defaults (default running shoe and default walking shoe); the user sets them on the shoe edit page, and Strava sync assigns newly imported workouts to the matching default by workout type (running vs walking).
- **Goal / Value (max 5 bullets):**
  - Support the common case: different shoes for running vs walking (e.g. running shoe and walking shoe).
  - One shoe MAY be default for both running and walking, or the user may set different shoes for each type.
  - Strava sync automatically assigns running workouts to the default running shoe and walking workouts to the default walking shoe when set.
  - User configures both defaults in one place (shoe edit page) with clear, type-specific options.
  - Reduces manual reassignment after sync while respecting workout type.
- **Affected Roles:** Authenticated user (athlete).
- **Affected Modules/Components (conceptual):** Shoes (default-for-running and default-for-walking configuration; edit page to set/clear each; overview **grid view** shows two badge types: **Default Running** and **Default Walking**, replacing the current single Default badge), Strava sync (import logic: choose default shoe by workout type when creating workouts), Workouts (assignment of workout to shoe at import time by type).
- **In-Scope (max 5 bullets):**
  - Two default configurations per user: default running shoe and default walking shoe. At most one shoe per user can be default for running; at most one per user can be default for walking. The same shoe can be default for both.
  - User sets or clears "default for running" and "default for walking" on the **shoe edit page** (e.g. two independent options per shoe).
  - During Strava sync, each newly created RUNNING workout is assigned to the user's default running shoe when set; each newly created WALKING workout is assigned to the user's default walking shoe when set. If no default for that type, the workout is created without a shoe.
  - Migration of existing single "default shoe" behaviour: the current single default is replaced by type-specific defaults; existing users who had one default shoe MUST have that shoe treated as default for both running and walking after the change (so sync behaviour for them does not regress).
  - Backend unit and integration tests for type-specific default behaviour and sync assignment by workout type.
- **Out-of-Scope (max 5 bullets):**
  - Changing how already-synced workouts are assigned (no bulk reassignment of existing workouts in this ticket).
  - Defaults for any workout type other than RUNNING and WALKING (only these two types have default-shoe semantics).
  - Strava-side shoe or gear mapping; assignment is purely in Zapatismo.
  - Automatic or scheduled sync; only user-triggered sync is in scope.
  - Changing the Strava OAuth or connection flow.

## 1. Context & Problem Statement
- **Current State (As-Is):** The user can set exactly one shoe as "default". During Strava sync, every newly imported workout (running and walking) is assigned to that single default shoe. Users who use different shoes for running vs walking cannot get type-specific auto-assignment.
- **Problem / Pain:** Users typically use different shoes for running and for walking. A single default shoe forces them to either assign one type manually after every sync or accept incorrect assignments for one of the types.
- **Target State (To-Be, without implementation details):** The user can set a default running shoe and a default walking shoe (possibly the same shoe). On the shoe edit page, the user sets or clears "default for running" and "default for walking" for that shoe. During Strava sync, each newly created running workout is assigned to the default running shoe (if set), and each newly created walking workout is assigned to the default walking shoe (if set). If no default is set for a given type, newly imported workouts of that type are not assigned to any shoe. At most one shoe per user is default for running; at most one per user is default for walking.
- **Assumptions (if any were stated):** Workout types RUNNING and WALKING are already defined and used by Strava sync; Strava activity types map to these (e.g. Run → RUNNING, Walk/Hike → WALKING). Existing single-default behaviour is replaced; migration ensures current default shoe becomes default for both types so behaviour does not regress for existing users.
- **Non-Goals:** Bulk reassignment of existing workouts; defaults for other activity types; Strava gear integration; automatic/scheduled sync.

## 2. Stakeholders & Roles
| Role | Goal/Interest | Rights/Constraints |
|------|---------------|-------------------|
| Authenticated user (athlete) | Set default running shoe and default walking shoe so that synced running and walking workouts are auto-assigned correctly; change or clear either default when needed. | Can only set defaults among their own shoes; must be logged in. |
| System / Backend | Enforce at most one default running and one default walking per user; use the appropriate default during sync when creating workouts by type. | Defaults are stored per user; sync reads defaults by type and assigns at creation time. |

## 3. User Journeys / Use Cases

### UC 1: Set default running shoe and default walking shoe
- **Primary Actor:** Authenticated user.
- **Trigger:** User wants running and walking synced workouts to be assigned to the correct shoes (e.g. running shoe for runs, walking shoe for walks).
- **Preconditions:** User is logged in; user has at least one shoe; shoe edit page exists.
- **Flow (numbered, precise):**
  1. User opens the **edit page** of a shoe (e.g. their running shoe).
  2. User sets this shoe as "default for running" (and optionally leaves "default for walking" unset). User saves.
  3. System records this shoe as the user's default running shoe; any previous default running shoe for that user is cleared so that only one shoe is default for running.
  4. User opens the **edit page** of another shoe (e.g. their walking shoe) and sets it as "default for walking". User saves.
  5. System records this shoe as the user's default walking shoe; any previous default walking shoe for that user is cleared.
  6. On the Shoes overview (grid view), the running shoe shows the **Default Running** badge and the walking shoe shows the **Default Walking** badge.
- **Outcome:** Default running shoe and default walking shoe are set (possibly different shoes). Future syncs assign running workouts to the default running shoe and walking workouts to the default walking shoe.
- **Alternatives / Abort Paths:** User can set the same shoe as default for both running and walking in one edit (both options checked). User cancels or does not save (no change).

### UC 2: Set one shoe as default for both running and walking
- **Primary Actor:** Authenticated user.
- **Trigger:** User uses the same shoe for all activities and wants it as the only default.
- **Preconditions:** User is logged in; user has at least one shoe.
- **Flow (numbered, precise):**
  1. User opens the **edit page** of that shoe.
  2. User sets both "default for running" and "default for walking" for this shoe. User saves.
  3. System records this shoe as default for running and as default for walking (at most one per user for each type).
  4. On the Shoes overview (grid view), this shoe shows both the **Default Running** and **Default Walking** badges.
- **Outcome:** All newly synced running and walking workouts are assigned to this shoe.
- **Alternatives / Abort Paths:** User cancels or does not save (no change).

### UC 3: Clear default for one type
- **Primary Actor:** Authenticated user.
- **Trigger:** User no longer wants automatic assignment for one type (e.g. will assign walking workouts manually).
- **Preconditions:** User is logged in; user has a default walking shoe set.
- **Flow (numbered, precise):**
  1. User opens the **edit page** of the shoe that is currently default for walking.
  2. User clears "default for walking" (keeps "default for running" if set) and saves.
  3. System clears the default walking shoe for that user; no shoe is default for walking.
  4. Next syncs create walking workouts without shoe assignment; running behaviour is unchanged if default running is still set.
- **Outcome:** Only one type has a default; the other type has no default and sync does not assign a shoe for that type.
- **Alternatives / Abort Paths:** User cancels or does not save (no change).

### UC 4: Sync with type-specific default shoes
- **Primary Actor:** Authenticated user.
- **Trigger:** User runs a Strava sync (e.g. "Sync Strava" from Workouts Overview with FROM-date).
- **Preconditions:** User is logged in; Strava is connected; user may have default running shoe and/or default walking shoe set (or neither).
- **Flow (numbered, precise):**
  1. User triggers sync (FROM-date, confirm).
  2. Backend fetches activities from Strava, maps to RUNNING or WALKING where applicable, creates workouts idempotently by external ID.
  3. When creating each new RUNNING workout: if the user has a default running shoe set, assign that shoe to the workout; otherwise create without a shoe.
  4. When creating each new WALKING workout: if the user has a default walking shoe set, assign that shoe to the workout; otherwise create without a shoe.
  5. Backend returns sync result; last-sync date is updated on success.
  6. User sees the result; Workouts overview shows new workouts linked to the correct shoe by type when defaults were set.
- **Outcome:** Running workouts are assigned to the default running shoe when set; walking workouts to the default walking shoe when set; missing default for a type leaves that type's workouts unassigned. Idempotent re-sync does not change shoe assignment of existing workouts.
- **Alternatives / Abort Paths:** Sync failure: no workouts created; last-sync unchanged. No default for a type: workouts of that type created without shoe.

## 4. Functional Requirements (MUST/SHOULD/MAY)

| ID | Requirement (clear, atomic) | Priority (MUST/SHOULD/MAY) | Rationale / Value | Notes |
|----|-----------------------------|----------------------------|-------------------|--------|
| FR-1 | The system MUST support two default-shoe configurations per user: "default running shoe" and "default walking shoe". At most one shoe per user can be default for running; at most one shoe per user can be default for walking. The same shoe MAY be default for both. | MUST | Core rule; enables type-specific assignment. | |
| FR-2 | The user MUST be able to set or clear "default for running" for a shoe from the **shoe edit page**. | MUST | User configures default running in one defined place. | |
| FR-3 | The user MUST be able to set or clear "default for walking" for a shoe from the **shoe edit page**. | MUST | User configures default walking in one defined place. | |
| FR-4 | When the user sets a shoe as default for running, the system MUST clear the previous default for running so that only one shoe is default for running. When the user sets a shoe as default for walking, the system MUST clear the previous default for walking so that only one shoe is default for walking. | MUST | Enforces at most one default per type. | |
| FR-5 | During Strava sync, when creating a new RUNNING workout, the backend MUST assign it to the user's default running shoe when a default running shoe is set; otherwise the workout MUST be created without a shoe. | MUST | Core sync behaviour for running. | |
| FR-6 | During Strava sync, when creating a new WALKING workout, the backend MUST assign it to the user's default walking shoe when a default walking shoe is set; otherwise the workout MUST be created without a shoe. | MUST | Core sync behaviour for walking. | |
| FR-7 | The **Shoes overview page** (grid view of shoes) MUST show two distinct badge types: **Default Running** and **Default Walking**. The current single "Default" badge is replaced by these: a shoe that is default for running shows a "Default Running" badge; a shoe that is default for walking shows a "Default Walking" badge; a shoe that is default for both shows both badges. Set/clear for each type is only on the shoe edit page. | MUST | Transparency; clear UX; grid view explicitly supports two badge types. | |
| FR-8 | Existing users who currently have one shoe set as "default" MUST, after the change, have that shoe treated as default for both running and walking until they change it (migration / backward compatibility). | MUST | No regression for existing users. | |
| FR-9 | New or changed backend logic for type-specific default shoes and sync assignment by workout type MUST be covered by unit tests (isolated, no real DB). | MUST | Quality; regression prevention. | |
| FR-10 | Behaviour that touches the database or sync flow (reading default by type, workout creation with shoe by type) MUST be covered by integration tests. | MUST | Boundary and persistence correctness. | |
| FR-11 | Default-for-running and default-for-walking MUST be stored as properties of shoes (or equivalent per-user configuration tied to shoes). When a shoe is deleted, any default designation for that shoe is removed; no stale reference remains. | MUST | Logical consistency. | |
| FR-12 | Idempotent re-sync (same Strava activity imported again) MUST NOT change the shoe assignment of the existing workout; assignment applies only to newly created workouts. | MUST | Idempotency and predictability. | |
| FR-13 | The sync modal (or equivalent) MUST show **separate** messages when no default is set: one message when the user has no default running shoe (e.g. "No default running shoe set; synced running workouts will not be assigned to a shoe"), and a separate message when the user has no default walking shoe (e.g. "No default walking shoe set; synced walking workouts will not be assigned to a shoe"). Each message is shown only when the corresponding default is missing. | MUST | User awareness before sync; clear, type-specific feedback. | Resolved: separate messages for running / walking. |

## 5. Data & Interfaces (conceptual)
- **Data objects (terms + meaning, no final fields):**
  - **Default for running / default for walking:** The system holds, per user, which shoe (if any) is the default for running and which (if any) is the default for walking. This is expressed as configuration attached to shoes (e.g. flags or equivalent). At most one shoe per user is default for running; at most one per user is default for walking. The same shoe can hold both. When a shoe is deleted, its default status is removed.
  - **Shoe:** Existing model (user-owned); in addition to current attributes, it carries (or is referenced by) "default for running" and "default for walking" for that user.
  - **Workout:** Existing model with type (RUNNING, WALKING) and optional shoe link. When created during sync, the shoe is chosen by workout type from the user's default running or default walking shoe.
- **Inputs / Outputs (high-level):**
  - **Set/clear default for running and default for walking:** Via the **shoe edit page**. In: user identity (from session), shoe identifier, and whether this shoe should be default for running and/or default for walking. Out: success or validation error. Side effect: setting this shoe as default for running clears any other shoe's default for running (and similarly for walking).
  - **Read defaults:** When listing shoes (overview), the system exposes for each shoe whether it is default for running and/or default for walking. Sync reads the user's default running shoe ID and default walking shoe ID when creating workouts.
  - **Sync:** In: unchanged (user, FROM-date). Out: unchanged (imported count, etc.). Internal: for each new workout, if type is RUNNING and user has default running shoe, set workout's shoe to that; if type is WALKING and user has default walking shoe, set workout's shoe to that; otherwise leave shoe unset.
- **External systems / integrations:** None new; Strava sync is existing. No new external APIs.
- **Authorization / AuthN/AuthZ:** User must be authenticated; defaults can only be set among the user's own shoes; sync and default read are scoped to the current user.

## 6. States, Validations & Error Cases

### 6.1 States / Modes
- **Relevant states / flags:** For each user: (default running shoe ID or none), (default walking shoe ID or none). A shoe can be in one of: not default, default for running only, default for walking only, default for both.
- **Transitions:** User sets shoe A as default for running → A becomes default for running; any other shoe that was default for running is cleared. Same for default for walking. User clears default for running on shoe A → no default for running. Shoe deletion → that shoe's default status is removed for both types.

### 6.2 Validations
| Field/Topic | Rule | Error Reaction | Visible Where (UI/API) | Condition |
|-------------|------|----------------|------------------------|-----------|
| Default for running | At most one shoe per user | When setting this shoe as default for running, clear previous default for running | N/A (automatic) | On save (edit) |
| Default for walking | At most one shoe per user | When setting this shoe as default for walking, clear previous default for walking | N/A (automatic) | On save (edit) |
| Shoe ownership | User can only set defaults for their own shoes | 403 or 404 as per existing API | UI / API | Edit, list |

### 6.3 Error Cases / Edge Cases
| Case | Trigger | Expected System Behavior | User Feedback | Category |
|------|---------|---------------------------|---------------|----------|
| User has default running set, sets another shoe as default for running | Edit second shoe, set "default for running", save | First shoe no longer default for running; second shoe is default for running | Success; overview shows new default | Normal |
| User clears "default for running" on the only default running shoe | Edit, uncheck default for running, save | No default running shoe | Success; sync will not assign running workouts | Normal |
| Sync runs with default running set but no default walking | Sync imports running and walking activities | Running workouts get default running shoe; walking workouts have no shoe | Sync result; workouts list shows correct assignment | Normal |
| Shoe that is default for both is deleted | User deletes shoe | That shoe is removed; no default for running and no default for walking | Success; overview and next sync reflect no defaults for that shoe | Edge |
| Re-sync of same Strava activity | Sync runs again for same date range | Existing workout is not duplicated; shoe assignment of existing workout is not changed | Idempotent result | Idempotency |

## 7. Non-Functional Requirements
- **Security:** No change; user can only manage defaults for their own shoes; auth as today.
- **Privacy / Compliance:** No new PII or processing; same as current default-shoe feature.
- **Performance / Scalability:** Sync already loads one default; loading two defaults (running, walking) is equivalent; no new N+1 or heavy queries.
- **Logging / Auditing:** No new mandatory logging beyond existing; MAY log default changes for debugging if desired.
- **Usability / Accessibility:** Edit page must clearly distinguish "default for running" and "default for walking" (e.g. labels, hints). The shoes overview **grid view** must show the two badge types with labels **"Default Running"** and **"Default Walking"** so that at a glance the user can see which shoe is default for which type; a shoe that is default for both shows both badges. The sync modal shows separate messages for missing default running shoe and missing default walking shoe (see FR-13).
- **Operability:** No new monitoring or alerts required for this feature.

## 8. Acceptance Criteria (testable)

- **AC-1:** Given a user with at least two shoes, when the user sets shoe A as default for running and shoe B as default for walking on the shoe edit pages and saves, then the shoes overview grid shows shoe A with the **Default Running** badge and shoe B with the **Default Walking** badge.
- **AC-2:** Given a user with default running shoe and default walking shoe set (same or different shoes), when the user runs a Strava sync that imports both running and walking activities, then each newly created running workout is assigned to the default running shoe and each newly created walking workout is assigned to the default walking shoe.
- **AC-3:** Given a user with only default running shoe set (no default walking shoe), when the user runs a Strava sync that imports walking activities, then newly created walking workouts have no shoe assigned.
- **AC-4:** Given a user who had one shoe set as "default" before this change, when the migration or initial rollout is applied, then that shoe is default for both running and walking until the user changes it (no regression).
- **AC-5:** Given the shoe edit page for a shoe, when the user sets "default for running" and saves, then any other shoe that was default for running is no longer default for running (at most one default per type).
- **AC-5b:** Given a shoe that is default for both running and walking, when the user views the shoes overview grid, then that shoe displays both the **Default Running** and **Default Walking** badges.
- **AC-6:** Given the shoe edit page for a shoe, when the user sets both "default for running" and "default for walking" and saves, then that shoe is the only default for running and the only default for walking (same shoe for both types).
- **AC-7:** Given the repo and dependencies, when the documented backend unit-test command is run, then all unit tests pass (including new or updated tests for type-specific default shoes and sync assignment by type).
- **AC-8:** Given the database is available and test data is in place, when the backend integration-test command is run, then all integration tests pass (including tests that sync assigns running workouts to default running shoe and walking workouts to default walking shoe).
- **AC-9:** Given the sync modal is open, when the user has no default running shoe, the modal shows a separate message that no default running shoe is set (synced running workouts will not be assigned). When the user has no default walking shoe, the modal shows a separate message that no default walking shoe is set (synced walking workouts will not be assigned). Each message is shown only when the corresponding default is missing. Badge labels in the shoes grid are **"Default Running"** and **"Default Walking"**.

## 9. Dependencies, Risks, Impact
- **Dependencies:** Existing shoes module (edit page, overview, API); existing Strava sync and workout creation; existing workout type enum (RUNNING, WALKING). Migration of current single "default" to type-specific defaults (exact strategy is implementation detail).
- **Risks / open technical uncertainties:** None identified; behaviour is a direct extension of the current default-shoe feature with a second dimension (type).
- **Impact on existing functionality:** The single "default shoe" concept is replaced by "default running shoe" and "default walking shoe". API and UI that expose or set "default" will change; migration must preserve the effect of the current default for existing users (that shoe becomes default for both types).

## 10. Resolved Decisions (formerly Open Points)

- [x] **Sync warning:** The sync modal shows **separate messages** for "no default running" and "no default walking" (each shown only when that default is missing). See FR-13 and AC-9.
- [x] **Badge labels:** The two badge types in the shoes grid view use the labels **"Default Running"** and **"Default Walking"**. See FR-7 and AC-9.

QUALITY GATE (before finishing):
- Requirements are atomic, unambiguous, testable.
- No implementation details (no code, no final DTOs, no migrations).
- Ambiguities are either resolved (see §10) or captured as UNRESOLVED with a concrete question.
- Scope and Out-of-Scope are clearly separated.
