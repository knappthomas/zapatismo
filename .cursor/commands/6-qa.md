You are Cursor in the project **"Zapatismo"**.

Goal: Step 6 — **Formal Quality Audit** of an already implemented ticket.  
This step is **evaluation only**: compare **Requirement (Step 1)** + **Plan (Step 2)** against the **real code implementation**.

You must produce exactly one audit document and **MUST NOT change any code**.

---

## NON-NEGOTIABLES

- **Evaluation only:** No implementation, no code changes, no refactors, no “how to fix”.
- **Traceability:** Every finding must be referencable to a concrete artifact:
  - file path + function/class/section (or a clearly identifiable place)
  - or a concrete section in the requirement/plan docs
  - No speculation.
- **No recommendations:** Only state **OK / NOK / Not verifiable**.  
  If **NOK**, describe the deviation and cite where.
- **Strict scope discipline:** Audit what the ticket claims to do; do not expand scope.
- **Language:** English.

---

## INPUT

- **Ticket ID** (= **[ticket-id]**)

When executing: actively ask for the ticket ID if not given.

---

## PREPARATION

1) Verify the directory exists:
   - `.docs/tasks/[ticket-id]/`

2) Verify these **required documents** exist (hard gate):
   - `.docs/tasks/[ticket-id]/1-requirement-[ticket-id].md`
   - `.docs/tasks/[ticket-id]/2-plan-[ticket-id].md`

3) **Abort rule:** If any required document is missing → **abort**.
   - Output: clear message which file(s) are missing
   - Do **not** create an audit file

4) If not aborted: load relevant artifacts (read-only):
   - Requirement sheet: `1-requirement-[ticket-id].md`
   - Implementation plan: `2-plan-[ticket-id].md`
   - Backend log (if exists): `.docs/tasks/[ticket-id]/3-backend-[ticket-id].md`
   - Frontend log (if exists): `.docs/tasks/[ticket-id]/4-frontend-[ticket-id].md`
   - Testing log (if exists): `.docs/tasks/[ticket-id]/5-testing-[ticket-id].md`

5) Load project constraints (read-only):
   - Architecture: `.docs/system/setup-architecture.md`
   - Frontend conventions: `.docs/system/frontend.md` (if present)
   - Cypress conventions: `.cursor/rules/cypress-testing.mdc` (or repo path used)
   - Any repo-level steering rules in `.cursor/rules/` that are relevant (read-only)

6) Determine where the implementation actually is (read-only):
   - Backend: `apps/backend/**`, `prisma/**`, possible OpenAPI locations per repo
   - Frontend: `apps/frontend/**`
   - Cypress: `apps/frontend/cypress/**`
   - CI: `.github/workflows/**`

7) Create exactly one output file:
   - `.docs/tasks/[ticket-id]/6-qa-[ticket-id].md`
   Use it for the entire audit.

---

## YOUR TASK

Perform a **structured audit** of the implemented ticket against:
- Requirement Sheet (Step 1)
- Implementation Plan (Step 2)
- Zapatismo architecture constraints (`setup-architecture.md`)
- Frontend conventions (`frontend.md`, if present)
- Cypress conventions (`cypress-testing.mdc`, if relevant for this ticket)

Each checkpoint must be graded:
- **OK**
- **NOK**
- **Not verifiable** (only if reference artifacts are missing OR the ticket scope doesn’t touch it)

If **NOK**, include:
- what deviates
- where it deviates (file/section)
- **severity:** `critical` | `medium` | `low`

---

## AUDIT CHECKPOINTS (minimum)

Use and grade at least these checkpoints (add more only if they are explicitly relevant to this ticket):

### A) Document completeness & traceability
1. Requirement sheet exists and is structured; key FR/AC are present
2. Plan exists and maps FR/AC to concrete work packages and touchpoints

### B) Scope compliance (no extras)
3. Implementation stays within In-Scope and avoids Out-of-Scope items
4. No “unplanned refactors” beyond the plan

### C) Functional requirement implementation
5. Each MUST requirement (FR-*) is implemented or explicitly marked as not in scope
6. Acceptance Criteria (AC-*) are verifiable via code/tests/logs

### D) Backend & database (if ticket affects backend)
7. Backend remains stateless REST (no session persistence, no hidden state)
8. Prisma changes only via Prisma Migrate; migrations exist and match plan
9. DB schema changes match plan and do not leak into API directly
10. Endpoints match plan: method/path/auth/DTO intent (no Prisma entity exposure)
11. Validation + error handling follow repo patterns (not ad-hoc)
12. Backend tests exist as planned and pass (or at least are documented as run)

### E) OpenAPI / Contract (if ticket affects API contract)
13. Contract changes match plan and are consistent with implementation

### F) Frontend (if ticket affects frontend)
14. Frontend changes match plan: routes/components/services
15. Frontend architecture conventions followed (`frontend.md`, if present)
16. No business logic duplication in UI (only presentation + orchestration)
17. Error handling UX aligns with existing patterns (not invented)

### G) Cypress / Testing (if ticket affects tests)
18. Cypress spec structure matches `cypress-testing.mdc` conventions (e.g., fixtures vs smoke rules, selectors, intercept usage)
19. Fixtures organization follows conventions
20. Smoke test rule respected (if the repo defines “exactly one smoke test”)
21. CI workflow matches plan (if plan includes it), e.g. system-tests runs as described

### H) Build & test safety
22. Repo build/test capability not obviously violated (evidence: logs, package scripts, workflow, or documented runs)

---

## OUTPUT FORMAT

Create **exactly one** Markdown document at:
`.docs/tasks/[ticket-id]/6-qa-[ticket-id].md`

No extra chapters. No prose outside the template below.

---

# QA Audit – <TICKET-ID>

## 0. Preconditions

- Ticket ID:
- QA execution date:
- Audited artifacts in `.docs/tasks/<TICKET-ID>/`:
  - Present:
  - Missing (if any):
- Abort due to missing required docs: YES / NO

---

## 1. Audit Results (Per Checkpoint)

For each checkpoint:

### <N>. <Checkpoint title>
- **Status:** OK | NOK | Not verifiable
- **Reference(s):** (Requirement section / Plan section / file path + identifiable location)
- **Finding:** (1–2 sentences: what you checked and what you found)
- **Deviation (NOK only):** (exactly what deviates and where)
- **Severity (NOK only):** critical | medium | low

*(Repeat for all checkpoints A–H relevant to this ticket.)*

---

## 2. Deviations Overview

| # | Checkpoint (short) | Status | Severity |
|---|---------------------|--------|----------|
| 1 | ...                 | ...    | ...      |

---

## 3. Overall Assessment

- Count OK:
- Count NOK (critical):
- Count NOK (medium):
- Count NOK (low):
- Count Not verifiable:

**Acceptable to merge/release:** YES | NO

Rule:
- Acceptable = YES only if there are **no** NOK with severity **critical**
- and required docs were present (no abort)

---

## 4. Key References (Optional)

Short list of the most important referenced files/sections used for the audit (no implementation details).

---

QUALITY GATE (before finishing):

- Every finding is referencable (file/section) OR explicitly “Not verifiable” with reason.
- No speculation, no recommendations, no implementation details.
- Output is only the audit document in `6-qa-<ticket-id>.md`.
- No code changes were made.