# Requirement Sheet – 10-1 – Default Shoe for Strava Sync

## 0. Quick Facts
- **Ticket-ID:** 10-1
- **Short Description (1 sentence):** The user can mark one shoe as "default"; during every Strava sync, every newly imported workout is automatically assigned to that default shoe when a default is set.
- **Goal / Value (max 5 bullets):**
  - Reduce manual work after sync: no need to assign each workout to a shoe one by one.
  - Single, clear rule: one default shoe per user; sync uses it when present.
  - Consistent behaviour: every sync run assigns all imported workouts to the default shoe (if selected).
  - No change to sync flow when no default shoe is set (workouts remain unassigned to a shoe).
  - Keeps assign-to-shoe and sync behaviour aligned with user expectations.
- **Affected Roles:** Authenticated user (athlete).
- **Affected Modules/Components (conceptual):** Shoes (model: "default" attached to the shoe; edit page to set/clear default; overview shows default indicator), Strava sync (import logic: use default shoe when creating workouts), Workouts (assignment of workout to shoe at import time).
- **In-Scope (max 5 bullets):**
  - User can set exactly one of their shoes as "default" and clear the default; at most one default shoe per user at any time. The default is a property of the shoe; when a shoe is deleted, its default status is deleted with it.
  - During Strava sync, every newly created workout MUST be assigned to the user's default shoe when a default shoe is set.
  - When no default shoe is set, sync behaviour is unchanged: newly imported workouts are not assigned to any shoe.
  - Backend unit and integration tests for default-shoe behaviour and sync assignment.
  - Shoe **edit page**: user sets or clears "default" for that shoe. Shoes **overview page**: the default shoe is visibly marked as default (read-only indicator).
- **Out-of-Scope (max 5 bullets):**
  - Changing how already-synced workouts are assigned (no bulk reassignment of existing workouts in this ticket).
  - Multiple default shoes or default-per-activity-type; only one global default shoe per user.
  - Strava-side shoe or gear mapping; assignment is purely in Zapatismo.
  - Automatic sync or scheduled sync; only user-triggered sync is in scope (as in ticket 10).
  - Changing the Strava OAuth or connection flow.

## 1. Context & Problem Statement
- **Current State (As-Is):** Strava sync imports running and walking workouts into the portal. Imported workouts are not assigned to any shoe (shoe is unset). Users must manually assign each workout to a shoe after sync if they want to track shoe usage.
- **Problem / Pain:** Manual assign-to-shoe after every sync is tedious when the user consistently uses one primary shoe for most activities.
- **Target State (To-Be, without implementation details):** User can designate one of their shoes as "default". Whenever the user runs a Strava sync, every workout created in that sync is automatically linked to the default shoe. If the user has not set a default shoe, sync behaviour is unchanged (workouts created without a shoe assignment). User can change or clear the default at any time; only one shoe per user can be default at a time.
- **Assumptions (if any were stated):** Strava integration (ticket 10) is in place; workouts and shoes are per user; sync creates workouts via existing idempotent import; one default per user is sufficient.
- **Non-Goals:** Bulk reassignment of existing workouts; multiple defaults; Strava gear integration; automatic/scheduled sync.

## 2. Stakeholders & Roles
| Role | Goal/Interest | Rights/Constraints |
|------|---------------|-------------------|
| Authenticated user (athlete) | Set one shoe as default so that synced workouts are auto-assigned; change or clear default when needed. | Can only set default among their own shoes; must be logged in. |
| System / Backend | Enforce at most one default per user; use default shoe during sync when creating workouts. | Default is stored per user; sync reads default and assigns at creation time. |

## 3. User Journeys / Use Cases

### UC 1: Set default shoe
- **Primary Actor:** Authenticated user.
- **Trigger:** User wants their next (and future) Strava syncs to assign workouts to a specific shoe.
- **Preconditions:** User is logged in; user has at least one shoe; shoe edit page exists.
- **Flow (numbered, precise):**
  1. User opens the **edit page** of the shoe they want as default.
  2. User sets this shoe as default (e.g. checkbox or "Set as default" on the edit form).
  3. System records that this shoe is the user's default (default is attached to the shoe); any previous default for that user is cleared so that only one shoe is default.
  4. User saves; system confirms. On the Shoes overview, this shoe is visibly marked as default.
- **Outcome:** The chosen shoe is the user's default; future syncs will assign newly imported workouts to this shoe. If this shoe is later deleted, the default information is deleted with it (no default remains).
- **Alternatives / Abort Paths:** User cancels or does not save (no change).

### UC 2: Clear default shoe
- **Primary Actor:** Authenticated user.
- **Trigger:** User no longer wants automatic assignment to a shoe (e.g. they use multiple shoes and will assign manually).
- **Preconditions:** User is logged in; user has currently a default shoe set.
- **Flow (numbered, precise):**
  1. User opens the **edit page** of the shoe that is currently default.
  2. User clears the default (e.g. uncheck "Default shoe" or "Remove as default" on the edit form) and saves.
  3. System clears the default for that shoe; no shoe is default for that user.
  4. System confirms; on the Shoes overview, no shoe is marked as default.
- **Outcome:** No default shoe; next syncs will create workouts without shoe assignment (current behaviour).
- **Alternatives / Abort Paths:** User cancels or does not save (no change).

### UC 3: Sync with default shoe
- **Primary Actor:** Authenticated user.
- **Trigger:** User runs a Strava sync (same flow as ticket 10: "Sync Strava" from Workouts Overview with FROM-date).
- **Preconditions:** User is logged in; Strava is connected; user may or may not have a default shoe set.
- **Flow (numbered, precise):**
  1. User triggers sync as today (e.g. "Sync Strava", chooses FROM-date, confirms).
  2. Backend runs the existing sync: fetch activities from Strava, filter running/walking, create workouts idempotently by external ID.
  3. When creating each new workout: if the user has a default shoe set, the backend assigns that shoe to the workout; otherwise the workout is created without a shoe (current behaviour).
  4. Backend returns sync result (e.g. imported count); last-sync date is updated on success.
  5. User sees the result; Workouts overview shows the new workouts, each linked to the default shoe when default was set.
- **Outcome:** Newly imported workouts are assigned to the default shoe when a default exists; otherwise they are unassigned. Re-sync of the same activities does not create duplicates (idempotency unchanged).
- **Alternatives / Abort Paths:** Sync failure: no workouts created; last-sync unchanged. No default set: workouts created without shoe (unchanged behaviour). Default shoe was deleted: the default was attached to the shoe, so it no longer exists; sync uses "no default" behaviour.

### UC 4: Change default shoe
- **Primary Actor:** Authenticated user.
- **Trigger:** User wants a different shoe to be the default (e.g. new pair becomes primary).
- **Preconditions:** User is logged in; user has at least one shoe; optionally a default is already set.
- **Flow (numbered, precise):**
  1. User opens the **edit page** of the other shoe and sets it as default (same as UC 1).
  2. System sets the new shoe as default and clears the previous default (at most one default per user).
  3. User saves; system confirms. On the Shoes overview, only the newly selected shoe is marked as default.
- **Outcome:** New default is in effect; future syncs assign to the new default; already-created workouts are not changed.
- **Alternatives / Abort Paths:** Same as UC 1.

## 4. Functional Requirements (MUST/SHOULD/MAY)

| ID | Requirement (clear, atomic) | Priority (MUST/SHOULD/MAY) | Rationale / Value | Notes |
|----|-----------------------------|----------------------------|-------------------|--------|
| FR-1 | The system MUST support the concept of a "default shoe" per user: at most one shoe per user can be marked as default at any time. | MUST | Core rule; prevents ambiguity during sync. | |
| FR-2 | The user MUST be able to set one of their shoes as default from the **shoe edit page** (and clear the default there). | MUST | User must be able to choose default in one defined place. | |
| FR-3 | The user MUST be able to clear the default on the shoe edit page (so that no shoe is default). | MUST | User can opt out of auto-assignment. | |
| FR-4 | When the user sets a different shoe as default, the system MUST clear the previous default so that only one shoe is default. | MUST | Enforces at most one default. | |
| FR-5 | During Strava sync, when creating each new workout, the backend MUST assign the workout to the user's default shoe when a default shoe is set for that user. | MUST | Core sync behaviour. | |
| FR-6 | During Strava sync, when the user has no default shoe set, the backend MUST create workouts without a shoe assignment (unchanged behaviour). | MUST | Backward compatibility; no breaking change. | |
| FR-7 | The **Shoes overview page** MUST visibly mark which shoe (if any) is the current default (read-only indicator). Set/clear default is only on the shoe edit page. | MUST | Transparency on overview; clear UX split. | |
| FR-8 | New or changed backend logic for default shoe and sync assignment MUST be covered by unit tests (isolated, no real DB). | MUST | Quality; regression prevention. | |
| FR-9 | Behaviour that touches the database or sync flow (default shoe read, workout creation with shoe) MUST be covered by integration tests. | MUST | Boundary and persistence correctness. | |
| FR-10 | The default MUST be stored as a property of the shoe. When a shoe is deleted, the default information is deleted with it (no separate "default" reference remains). | MUST | Logical consistency; no stale default. | |
| FR-11 | Idempotent re-sync (same Strava activity imported again) MUST NOT change the shoe assignment of the existing workout; assignment applies only to newly created workouts. | MUST | Idempotency and predictability. | |

## 5. Data & Interfaces (conceptual)
- **Data objects (terms + meaning, no final fields):**
  - **Default (on shoe):** The information "is this shoe the default" is **attached to the shoe itself** (e.g. a flag or equivalent). At most one shoe per user can be default at any time. When a shoe is deleted, that shoe's default status is deleted with it—no separate default reference remains.
  - **Shoe:** Existing model (user-owned); one of them may be marked as default via a property on the shoe. No change to core shoe attributes beyond the default designation.
  - **Workout:** Existing model; optional link to a shoe. When created during sync and user has a default shoe, that link is set to the default shoe.
- **Inputs / Outputs (high-level):**
  - **Set/clear default:** Done via the **shoe edit page**. In: user identity (from session), shoe identifier (the one being edited), and whether it should be default or not. Out: success or validation error. Side effect: when setting this shoe as default, any previous default for that user is cleared (only one default per user).
  - **Read default:** When listing shoes (overview), the system exposes for each shoe whether it is the default so the overview can show a visible "default" marker. Sync reads the user's default shoe (if any) when creating workouts.
  - **Sync:** In: unchanged (user, FROM-date). Out: unchanged (imported count, etc.). Internal: when creating a workout, if user has a default shoe, set workout's shoe reference to that default.
- **External systems / integrations:** None new; Strava sync is existing. No new external APIs.
- **Authorization / AuthN/AuthZ:** User must be authenticated; default can only be set among the user's own shoes; sync and default read are scoped to the current user.

## 6. States, Validations & Error Cases

### 6.1 States / Modes
- **Relevant states / flags:** User has zero or one default shoe (one shoe has the default flag set). During sync: default present or absent.
- **Transitions:** No default → set default on edit (one shoe becomes default). Default set → set another shoe as default on its edit page (previous cleared, new one set). Default set → clear default on that shoe's edit page (no default). Default shoe deleted → default is attached to the shoe, so it is deleted with the shoe; no default remains.

### 6.2 Validations
| Field/Topic | Rule | Error Reaction | Visible Where (UI/API) | Condition |
|-------------|------|----------------|------------------------|-----------|
| Default shoe | Must be a shoe owned by the current user. | Reject request; do not set default. | API response / UI | On set default. |
| Default shoe | At most one default per user. | Setting a new default clears the previous one. | N/A (automatic) | On set default. |
| Sync | Default shoe must exist and belong to user when used. | Default is on the shoe; if that shoe was deleted, no default exists—sync does not assign. | N/A | During sync. |

### 6.3 Error Cases / Edge Cases
| Case | Trigger | Expected System Behavior | User Feedback | Category |
|------|---------|---------------------------|---------------|----------|
| Set default for shoe of another user | Request with shoe ID not owned by user. | Reject; do not change default. | Validation error. | Security / validation. |
| Default shoe deleted | User deletes the shoe that is currently default. | Default is attached to the shoe, so it is deleted with the shoe; no default remains. Sync uses "no default" behaviour until user sets another shoe as default. | Overview no longer shows a default; sync creates unassigned workouts. | Data consistency. |
| Re-sync same activities | User runs sync again for same date range. | No new workouts created (idempotency); existing workouts keep their current shoe assignment. | Import count 0 or "no new"; no change to existing workouts. | Idempotency. |
| Sync with default set | Normal sync; user has default shoe. | Each newly created workout gets default shoe assigned. | Workouts appear with that shoe in overview. | Happy path. |
| No shoes | User has no shoes; tries to set default (if UI allows). | No shoe to set; or UI does not offer set-default when no shoes. | Clear message or disabled action. | Edge. |

## 7. Non-Functional Requirements
- **Security:** Default shoe must be scoped to the authenticated user; only the user's own shoes can be set as default. No privilege escalation.
- **Privacy / Compliance:** No new PII or external data; default is a user preference only.
- **Performance / Scalability:** Reading default shoe during sync adds minimal overhead (one lookup per user per sync). No new external calls.
- **Logging / Auditing:** Optional: log when default is set or cleared (without logging secrets). Sync logging unchanged.
- **Usability / Accessibility:** Default-setting and clearing controls must be clearly labelled and consistent with Tailwind/daisyUI; keyboard and screen-reader friendly.
- **Operability:** No new background jobs; sync remains user-triggered.

## 8. Acceptance Criteria (testable)
- AC-1: Given the user has at least one shoe, when the user sets one shoe as default on that shoe's edit page and saves, then that shoe is stored as the user's default, any previous default is cleared, and the Shoes overview visibly marks that shoe as default.
- AC-2: Given the user has a default shoe set, when the user clears the default on that shoe's edit page and saves, then no shoe is default and the Shoes overview no longer shows any shoe as default.
- AC-3: Given the user has a default shoe set, when the user runs a Strava sync and new workouts are imported, then each newly created workout is assigned to the default shoe.
- AC-4: Given the user has no default shoe set, when the user runs a Strava sync and new workouts are imported, then each newly created workout has no shoe assigned (unchanged behaviour).
- AC-5: Given the user sets shoe A as default then sets shoe B as default, when the user runs a Strava sync, then newly imported workouts are assigned to shoe B (only one default; previous cleared).
- AC-6: Given a workout was previously synced (with or without default), when the user runs sync again for the same date range (re-sync), then no duplicate workout is created and existing workout's shoe assignment is not changed.
- AC-7: Given the repo and dependencies, when the documented backend unit-test command is run, then all unit tests pass (including tests for default-shoe and sync-assignment logic).
- AC-8: Given the database (or test double) is available, when the documented backend integration-test command is run, then all integration tests pass (including tests for sync with default shoe and set/clear default).

## 9. Dependencies, Risks, Impact
- **Dependencies:** Strava sync (ticket 10) must be in place; Shoes and Workouts modules and APIs exist; frontend has a Shoes overview and a shoe edit page.
- **Risks / open technical uncertainties:** None; default-on-shoe and UI placement are resolved (see Section 10).
- **Impact on existing functionality:** Sync logic gains one read (user's default shoe) and sets shoe on create when default exists; otherwise unchanged. Shoe overview shows default indicator (read-only); shoe edit page gains set/clear default. No change to workout CRUD or Strava OAuth.

## 10. Resolved Open Points
- **Default stored on the shoe:** The information "which shoe is default" is **attached to the shoe itself**. When a shoe is deleted, the default information is deleted with it (logical; no separate default reference that could become stale).
- **Where to set/clear default and where to show it:** The user **changes** default on the **edit page of a shoe** (set or clear there). On the **overview page**, the default shoe is **visibly marked as default** (read-only indicator; no edit action on the overview).

QUALITY GATE (before finishing):
- Requirements are atomic, unambiguous, testable.
- No implementation details (no code, no final DTOs, no migrations).
- Resolved open points documented; no remaining UNRESOLVED ambiguities.
- Scope and Out-of-Scope are clearly separated.
