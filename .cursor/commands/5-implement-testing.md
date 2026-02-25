You are Cursor in the project "Zapatismo".

Goal: Step 5 (Testing Implementation) — implement ONLY Cypress **E2E** tests for exactly ONE ticket, and document everything in:
`.docs/tasks/[ticket-id]/5-testing-[ticket-id].md`

This command implements Cypress tests in the Zapatismo Angular frontend only.

NON-NEGOTIABLES:
- **No Cypress component tests. E2E only.**
- Follow the repo testing conventions in: `.cursor/rules/cypress-testing.mdc` (must read and comply).
- Strictly follow the ticket plan. Do **exactly** what is planned — no extra test cases beyond the plan.
- Use fixtures for component/page states (empty/loading/loaded/error). Do not hardcode state in specs.
- Use `cy.intercept()` with fixtures for server responses and error paths.
- Exactly **one smoke test** total (per conventions). Do not add duplicate “app is up” checks.
- Put specs in feature subfolders: `apps/frontend/cypress/e2e/<feature>/<feature>.cy.ts` (not directly under `e2e/`).
- Page Objects must live next to the spec: `apps/frontend/cypress/e2e/<feature>/po/` and **extend `MainPO`** from `apps/frontend/cypress/page-objects/MainPO.ts`.
- Page objects must use a scoped `protected root` based on a stable selector.
- If stable selectors are missing, add minimal `data-cy` attributes to the Angular UI **only if necessary**, and document every such change.

INPUT:
- Ticket ID (= [ticket-id])

BINDING SOURCES (must read, else abort):
1) Requirements:
   `.docs/tasks/[ticket-id]/1-requirement-[ticket-id].md`
2) Implementation plan (esp. Testing Plan + Acceptance Criteria mapping):
   `.docs/tasks/[ticket-id]/2-plan-[ticket-id].md`
3) Frontend implementation log (for routes/components/selectors/endpoints):
   `.docs/tasks/[ticket-id]/4-frontend-[ticket-id].md`
4) Cypress conventions:
   `apps/frontend/.cursor/rules/cypress-testing.mdc`  (path may be `.cursor/rules/cypress-testing.mdc` depending on repo; find and read it)

DOCUMENTATION (for frontend structure and conventions):
- **Frontend layout & routing:** `.docs/system/frontend.md` — features, routes, core/services, where specs and fixtures live.
- **Project rules:** `.docs/system/project-rules.md` — testing and documentation expectations.

OUTPUT ARTIFACT:
- Create documentation file:
  `.docs/tasks/[ticket-id]/5-testing-[ticket-id].md`
  Use it as the single source of truth for step 5.

SCOPE:
- Implement Cypress E2E tests for the feature(s) changed by the ticket.
- Do not change backend/prisma/openapi/docker.
- Do not add tests for unrelated areas.
- Do not introduce new test frameworks or patterns outside `cypress-testing.mdc`.

WORKFLOW (execute in this order):

0) Initialize documentation
- Create `.docs/tasks/[ticket-id]/5-testing-[ticket-id].md` and write the template below.
- Keep appending as you work.

1) Extract planned test cases
- From the plan’s Testing section and the requirement sheet ACs:
  - List the exact E2E scenarios that must exist.
  - If the plan is missing concrete E2E scenarios, STOP and document "UNRESOLVED: missing test definitions in plan".

2) Identify feature scope + routes + endpoints
- Use `.docs/tasks/[ticket-id]/4-frontend-[ticket-id].md` to identify:
  - routes to visit
  - UI entry points
  - API endpoints used (for intercepts)
  - selectors or `data-cy` attributes available

3) Choose repo “golden path” references
- Find at least one existing Cypress spec in `apps/frontend/cypress/e2e/**` that matches the complexity:
  - uses fixtures
  - uses intercepts
  - uses page objects extending MainPO
- Document the reference file paths and patterns to copy.

4) Implement Page Object(s)
- For each tested feature, create:
  `apps/frontend/cypress/e2e/<feature>/po/<Feature>PO.ts`
- Must extend `MainPO` from `apps/frontend/cypress/page-objects/MainPO.ts`
- Must scope queries using the PO `root` getter and stable selectors.
- Prefer `data-cy` selectors. If missing, add minimal `data-cy` to Angular templates (only as needed).

5) Implement Spec(s)
- Create/modify:
  `apps/frontend/cypress/e2e/<feature>/<feature>.cy.ts`
- Required describe blocks:
  - `describe('<Feature>')`
  - `describe('Component States')` (fixture-driven: empty/loading/loaded/error) — only the states required by the plan
  - `describe('Error Handling')` — only errors explicitly planned (4xx/5xx fixtures)
  - `describe('Smoke')` — ONLY if this ticket is the chosen place for the single smoke test; otherwise do not add one
- Use `cy.intercept()` for:
  - success responses (fixtures)
  - error responses (fixtures + statusCode)
- Drive different UI states via fixtures; do not hardcode response bodies inline.

6) Fixtures
- Add fixtures under:
  `apps/frontend/cypress/fixtures/<feature>/`
- Use small, named-by-state files:
  - `empty.json`, `loaded.json`, `error-404.json`, `error-500.json`, etc.
- Ensure fixture content matches the backend payload shape used by the frontend.

7) Run tests + sanity checks
- Run the Cypress E2E command used in this repo (discover package scripts; document exact command).
- Ensure tests are stable and not timing-flaky (use intercept + wait on aliases instead of arbitrary waits).
- Ensure you did not add tests beyond the planned list.

DOCUMENTATION TEMPLATE
(write into `.docs/tasks/[ticket-id]/5-testing-[ticket-id].md` and keep it updated)

---
# Cypress E2E Testing – <TICKET-ID> – <SHORT TITLE>

## 0. Inputs
- Requirement sheet: `.docs/tasks/<TICKET-ID>/1-requirement-<TICKET-ID>.md`
- Implementation plan: `.docs/tasks/<TICKET-ID>/2-plan-<TICKET-ID>.md`
- Frontend implementation log: `.docs/tasks/<TICKET-ID>/4-frontend-<TICKET-ID>.md`
- Cypress conventions: `.cursor/rules/cypress-testing.mdc` (or repo path used)
- Frontend layout: `.docs/system/frontend.md`
- Project rules: `.docs/system/project-rules.md`

## 1. Scope Confirmation
- In scope (Cypress E2E only): ✅/❌
- Out of scope (backend/prisma/openapi/ios): ✅/❌
- Plan-following mode (no extras): ✅/❌
- Smoke test rule respected (only one in repo): ✅/❌ (explain)

## 2. Planned Test Cases (from Plan)
Map the plan’s test strategy to concrete E2E tests:
| Planned item | Spec / describe / it title | Fixture(s) | Intercepts | Notes |
|---|---|---|---|---|

## 3. Repo Golden Paths Used (References)
- Spec reference(s):
- Page Object reference(s):
- Fixture reference(s):
- Patterns adopted (brief):

## 4. Test Infrastructure
### 4.1 Specs created/modified
- `apps/frontend/cypress/e2e/<feature>/<feature>.cy.ts`

### 4.2 Page Objects created/modified
- `apps/frontend/cypress/e2e/<feature>/po/<Feature>PO.ts` (extends `MainPO`)

### 4.3 Fixtures created/modified
- `apps/frontend/cypress/fixtures/<feature>/...`

### 4.4 Selectors / data-cy
- Existing selectors used:
- Any new `data-cy` added to Angular templates (list files + reasons):

## 5. Implemented Scenarios
For each scenario:
- What it validates:
- Route visited:
- Intercepts (method + url + alias):
- Fixture(s):
- Assertions (high-level):

## 6. Error Handling Coverage (only planned)
| Error case | Intercept | Fixture | Expected UI behavior |
|---|---|---|---|

## 7. Acceptance Criteria Traceability
| AC ID | E2E coverage (spec + test name) | Verification |
|---|---|---|

## 8. How to Run
- Command(s):
- Optional: run single spec:

## 9. Change Summary
- Files added/modified:
- Notes:

## 10. Open Points / Risks (UNRESOLVED)
- [ ] Item – why it matters – proposed resolution
---

QUALITY GATE (must satisfy before finishing):
- Only E2E tests (no Cypress component tests).
- Spec + PO + fixtures follow `cypress-testing.mdc` conventions.
- All tests implemented are explicitly planned (no extras).
- Exactly one smoke test rule respected.
- Tests use intercepts + fixtures for states and errors.
- Documentation in `5-testing-<ticket-id>.md` is complete and traceable.