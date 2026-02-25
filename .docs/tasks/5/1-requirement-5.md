# Requirement Sheet – 5 – Frontend Cypress E2E Test Strategy and System

## 0. Quick Facts

- **Ticket-ID:** 5
- **Short Description (1 sentence):** Define and implement a frontend Cypress E2E test strategy and system with a standardised spec structure (Component Test, e2e with fixtures and smoke), and adjust or extend the existing Cypress configuration as needed.
- **Goal / Value (max 5 bullets):**
  - Consistent, predictable structure for all E2E spec files (component-level checks, fixture-driven e2e, smoke with real server).
  - Clear separation between lightweight UI checks, fixture-based state tests, and real end-to-end flows.
  - Smoke tests aligned with Prisma test-migration data for reproducible, real-server verification.
  - Cypress E2E runs in CI (GitHub Actions) together with backend tests as part of a single system-tests workflow.
  - Better maintainability and onboarding for frontend E2E tests.
- **Affected Roles:** Frontend developers, PR reviewers, CI consumers, anyone running or extending E2E tests.
- **Affected Modules/Components (conceptual):** Frontend: `apps/frontend/` (Cypress config, support, e2e specs, fixtures, page objects); GitHub Actions: workflow for system tests (backend + Cypress); optional alignment with `.cursor/rules/cypress-testing.mdc` and project docs.
- **In-Scope (max 5 bullets):**
  - Mandatory describe-block structure in E2E spec files: "Component Test", "e2e" (with subblocks "fixtures" and "smoke").
  - Component Test block: lightweight checks (e.g. field length, show/hide, validation) without depending on real server; may use intercepts/fixtures.
  - e2e/fixtures subblock: tests that drive different UI states using fixture data (no real server calls).
  - e2e/smoke subblock: real E2E tests that perform real server calls and align with data from Prisma test migrations.
  - Review and adjust/extend existing Cypress configuration and support files; run Cypress E2E in CI via a unified system-tests workflow (renamed from backend-tests; backend and Cypress jobs).
- **Out-of-Scope (max 5 bullets):**
  - Backend or iOS test changes (backend remains covered by ticket 4; this is frontend Cypress only).
  - Cypress Component Testing (mount-based); only E2E-style specs with the described structure.
  - Full coverage of every screen or feature in this ticket; strategy and structure plus representative specs.
  - Changing Prisma test-migrations content or runner; only alignment of smoke tests with existing test-migration data.
  - Deployment to staging or production (CI runs tests only).

---

## 1. Context & Problem Statement

- **Current State (As-Is):**
  - Cypress is configured in `apps/frontend/` (cypress.config.ts, support/e2e.ts, commands, fixtures, one login spec).
  - Existing login spec uses describe blocks "Component" and "Smoke" but does not follow the desired naming ("Component Test", "e2e" with "fixtures" and "smoke" subblocks).
  - No formal strategy document that defines the three tiers (component-level, fixture-driven e2e, smoke with real server) and how they map to describe blocks.
  - Prisma test-migrations (e.g. `prisma/test-migrations/`) provide known test data (e.g. seeded users); smoke tests are not explicitly required to align with this data today.
- **Problem / Pain:**
  - Inconsistent or unclear organisation of E2E specs makes it hard to know where to add new tests (component checks vs fixture states vs real flows).
  - Smoke tests that hit the real server may drift from available test data, causing flakiness or unclear expectations.
  - Cypress config and rules may need tuning to support the chosen structure (e.g. env, baseUrl, fixtures path, or future tags for smoke vs non-smoke).
- **Target State (To-Be, without implementation details):**
  - Every E2E spec file follows a single, documented structure: one describe "Component Test" (lightweight UI/component checks), one describe "e2e" containing describe "fixtures" (fixture-driven state tests) and describe "smoke" (real server, aligned with test-migration data).
  - Strategy is documented; existing specs (e.g. login) are refactored to match; new specs are created using this structure.
  - Cypress configuration and support files are adjusted or extended only as needed to support this strategy (e.g. baseUrl, fixtures, env, or run options).
  - A single GitHub Actions workflow (system tests) runs backend tests and Cypress E2E on every push; Cypress job provisions MySQL, applies migrations and test-migrations, starts backend and frontend, then runs Cypress headless.
- **Assumptions (if any were stated):**
  - "Component Test" means in-spec, E2E-style tests that focus on component-level behaviour (field length, show/hide, validation), not Cypress Component Testing (mount). They may use cy.visit and cy.intercept with fixtures.
  - Smoke tests require a running backend and (where applicable) test DB with test-migrations applied so that real server responses match documented test data.
  - Existing Cypress setup (Angular app, baseUrl, proxy to backend) remains the runtime context.
- **Non-Goals:**
  - Introducing Cypress Component Testing; no mount-based component tests. Deployment to staging/production.

---

## 2. Stakeholders & Roles

| Role | Goal/Interest | Rights/Constraints |
|------|----------------|--------------------|
| Frontend developer | Add and run E2E tests in a clear structure; get fast feedback for component vs smoke | Must follow the described spec structure; may extend config within project rules |
| PR reviewer | Understand where tests live (Component Test vs fixtures vs smoke) and that smoke aligns with test data | Relies on docs and consistent naming |
| Project / repo owner | Maintainable, scalable E2E strategy; no duplication of "app is up" smoke tests | Strategy documented; config in repo |

---

## 3. User Journeys / Use Cases

### UC 1: Add E2E tests for a new feature

- **Primary Actor:** Frontend developer
- **Trigger:** New feature or screen that must be covered by E2E tests.
- **Preconditions:** Cypress strategy and structure are documented; existing specs follow the pattern.
- **Flow:**
  1. Developer creates or opens the spec file for the feature (e.g. under `cypress/e2e/<feature>/<feature>.cy.ts`).
  2. Developer adds tests under describe "Component Test" for lightweight checks (field length, show/hide, validation), using intercepts/fixtures as needed.
  3. Developer adds tests under describe "e2e" → describe "fixtures" for different UI states driven by fixture data.
  4. Developer adds tests under describe "e2e" → describe "smoke" for real server flows, using credentials or data that match Prisma test-migrations (e.g. seeded user).
  5. Developer runs the Cypress suite (open or headless) and verifies all pass.
- **Outcome:** New tests are in the correct blocks; component, fixture-driven, and smoke tests are clearly separated.
- **Alternatives / Abort Paths:** No smoke test if feature has no real-server flow → only Component Test and fixtures blocks may be present for that spec.

### UC 2: Run only component and fixture-driven tests (no real server)

- **Primary Actor:** Frontend developer
- **Trigger:** Developer wants fast feedback without starting the backend.
- **Preconditions:** Cypress config may support excluding or tagging specs (optional); or developer runs specific spec files that contain only Component Test and e2e/fixtures.
- **Flow:**
  1. Developer starts frontend only (or uses existing config that points at frontend).
  2. Developer runs Cypress (e.g. open or run) for specs or describe blocks that do not require real server (Component Test, e2e/fixtures).
  3. Tests use cy.intercept and fixtures; no real API calls.
  4. Developer sees pass/fail for those tests.
- **Outcome:** Fast iteration on UI behaviour without backend. (If config does not support exclusion, this may be "run all and skip smoke when backend is down" or run a subset of files.)
- **Alternatives / Abort Paths:** Backend required by baseUrl or proxy only for visit; intercepts can still stub API.

### UC 3: Run smoke tests against real backend and test-migration data

- **Primary Actor:** Frontend developer or CI
- **Trigger:** Need to verify real user flows against running backend.
- **Preconditions:** Backend running; DB has schema applied and test-migrations applied (e.g. seeded user from `prisma/test-migrations/`).
- **Flow:**
  1. Developer (or CI) ensures backend and test DB state (migrations + test-migrations) are ready.
  2. Developer runs Cypress including the "e2e" → "smoke" tests (full run or smoke-only if supported).
  3. Smoke tests perform real HTTP requests to the backend (e.g. login with seeded user, load dashboard).
  4. Assertions align with expected data from test-migrations (e.g. user can log in with documented test credentials).
- **Outcome:** Confidence that the app works end-to-end with the documented test data.
- **Alternatives / Abort Paths:** Backend or DB not ready → smoke tests fail with clear errors; documented preconditions must state that test-migrations must be applied.

### UC 4: Onboard to Cypress structure and config

- **Primary Actor:** New developer or reviewer
- **Trigger:** Need to understand where to put tests and how to run them.
- **Preconditions:** Strategy and structure are documented (requirement sheet, `.cursor/rules/cypress-testing.mdc`, or `.docs/system/`).
- **Flow:**
  1. Developer reads the documented structure (Component Test, e2e/fixtures, e2e/smoke).
  2. Developer looks at one existing spec (e.g. login) as reference.
  3. Developer runs Cypress using documented npm scripts (e2e, e2e:run, e2e:headless).
  4. Developer applies the same structure to new or updated specs.
- **Outcome:** Consistent structure across specs; config and commands are clear.

### UC 5: CI runs Cypress E2E on every push

- **Primary Actor:** CI system (GitHub Actions), observed by developers and reviewers
- **Trigger:** Every push to any branch.
- **Preconditions:** Workflow file (e.g. system-tests.yml) exists; backend and Cypress jobs defined; no secrets required beyond test DB and test-only JWT.
- **Flow:**
  1. On push, workflow runs (e.g. "System tests") with at least two jobs: backend-tests and cypress-e2e (may run in parallel).
  2. Backend-tests job: checkout, MySQL service, install, Prisma generate + migrate deploy, unit tests, integration tests.
  3. Cypress-e2e job: checkout, MySQL service, install, Prisma generate + migrate deploy + test-migrations, start backend and frontend, wait for both, run Cypress headless (e.g. npm run e2e:headless -w frontend).
  4. Workflow reports success or failure; status visible on commit/PR.
- **Outcome:** Cypress E2E (including Component Test, fixtures, and smoke) runs in CI; failures block or signal before merge.
- **Alternatives / Abort Paths:** Backend or frontend fail to start → Cypress job fails with clear errors. Smoke tests fail (e.g. test-migrations not applied) → fix workflow or test data.

---

## 4. Functional Requirements (MUST/SHOULD/MAY)

| ID | Requirement (clear, atomic) | Priority (MUST/SHOULD/MAY) | Rationale / Value | Notes |
|----|-----------------------------|----------------------------|-------------------|-------|
| FR-1 | Every E2E spec file that is part of this strategy MUST contain a top-level describe block named exactly "Component Test" for lightweight component-level tests (e.g. field length, show/hide, validation). | MUST | Unambiguous structure; single place for quick UI checks. | May use cy.intercept and fixtures; no real server required. |
| FR-2 | Every E2E spec file MUST contain a top-level describe block named exactly "e2e" that has two nested describe subblocks: one named "fixtures" and one named "smoke". | MUST | Clear separation of fixture-driven state tests vs real server tests. | "fixtures": tests that use fixture data and intercepts; "smoke": tests that perform real server calls. |
| FR-3 | Tests under "Component Test" MUST focus on component-level behaviour (field length, show/hide, validation, disable/enable) and MUST NOT depend on real server responses; they MAY use cy.intercept with fixtures. | MUST | Fast, stable checks without backend. | Aligns with "easy component testings" in the request. |
| FR-4 | Tests under "e2e" → "fixtures" MUST drive different UI states using fixture data (e.g. empty, loading, loaded, error) and MUST use intercepts (or equivalent) so that no real server is required for these tests. | MUST | Reproducible state testing; no flakiness from server. | Fixture files under cypress/fixtures/ per feature. |
| FR-5 | Tests under "e2e" → "smoke" MUST perform real HTTP requests to the backend (no stubbing of the endpoints under test) and MUST align with data from Prisma test-migrations (e.g. use seeded users or entities from test-migrations for login and other flows). | MUST | Real E2E verification; single source of truth for test data. | Documentation must state which test-migration data smoke tests rely on. |
| FR-6 | At least one smoke test MUST verify a real user flow (e.g. app loads, unauthenticated redirect to login, or login with test-migration credentials and basic navigation) so that "smoke" is not empty. | MUST | Proof that smoke tier works with real server and test data. | Can be the existing "loads the app and redirects unauthenticated users to login" moved under e2e/smoke. |
| FR-7 | Existing Cypress configuration (cypress.config.ts, support file, fixtures folder) MUST be reviewed and MUST be adjusted or extended only where needed to support this strategy (e.g. baseUrl, specPattern, fixturesFolder, env, or future smoke-only run). | MUST | Config is the single place for behaviour; avoid drift. | No implementation prescribed; "where needed" is sufficient. |
| FR-8 | The Cypress testing rule (e.g. `.cursor/rules/cypress-testing.mdc`) or project documentation MUST be updated to describe the three-tier structure (Component Test, e2e/fixtures, e2e/smoke) and the intended use of each block. | MUST | Onboarding and consistency. | At least one doc location must reflect the new structure. |
| FR-9 | Existing login spec (or the single current E2E spec) MUST be refactored to follow the new describe-block structure: "Component Test", "e2e" with "fixtures" and "smoke" subblocks, with existing tests placed in the appropriate block. | MUST | Proof and reference implementation. | Current "Component" → "Component Test"; current "Smoke" → "e2e" → "smoke"; fixture-based login tests → "e2e" → "fixtures". |
| FR-10 | Fixtures used by "e2e" → "fixtures" tests SHOULD be organised by feature under cypress/fixtures/ (e.g. login/, dashboard/) and named by state (e.g. success.json, error-401.json). | SHOULD | Consistency with existing convention. | Already partially in place. |
| FR-11 | Page objects for a feature SHOULD remain in cypress/e2e/<feature>/po/ and extend the shared base (e.g. MainPO); specs in cypress/e2e/<feature>/<feature>.cy.ts. | SHOULD | Matches existing rule; no structural change required. | As per current cypress-testing rule. |
| FR-12 | A single GitHub Actions workflow (e.g. system-tests.yml) MUST run on every push to every branch and MUST include (1) a job that runs backend unit and integration tests (as today) and (2) a job that runs Cypress E2E headless. The Cypress job MUST provision MySQL, apply Prisma migrations and test-migrations, start the backend and frontend, then run the documented Cypress headless command (e.g. e2e:headless). The workflow MUST be named so that it represents system tests (backend + frontend E2E); the previous backend-only workflow may be renamed or replaced. | MUST | Cypress in CI; single entry point for system tests. | No production secrets; test DB and test-only JWT from env. |

**Note:** This ticket affects the frontend (Cypress E2E) and the GitHub Actions workflow. Backend unit/integration test requirements are unchanged (ticket 4); this ticket adds the Cypress job and workflow rename.

---

## 5. Data & Interfaces (conceptual)

- **Data objects (terms + meaning, no final fields):**
  - **Component Test:** A describe block containing tests that assert component-level behaviour (field length, show/hide, validation) without real server; may use stubbed API via fixtures.
  - **e2e/fixtures:** A describe subblock containing tests that assert UI states (empty, loading, loaded, error) driven by fixture data and intercepts.
  - **e2e/smoke:** A describe subblock containing tests that perform real server calls and rely on Prisma test-migration data (e.g. seeded user) for assertions.
  - **Test-migration data:** Data created by scripts in `prisma/test-migrations/` (e.g. users, roles); used as the single source of truth for smoke test credentials and expected state.
- **Inputs / Outputs (high-level):**
  - **Input:** Spec files (structure + test code), Cypress config, fixtures (JSON or other), running frontend (and for smoke: running backend + DB with test-migrations applied).
  - **Output:** Cypress run result (pass/fail), optional screenshots/videos; documentation of structure and run commands.
- **External systems / integrations:**
  - **Frontend dev server:** Served at baseUrl (e.g. localhost:4200); proxy to backend for real API calls.
  - **Backend API (smoke only):** Real HTTP; must be running with DB and test-migrations applied when running smoke tests.
- **Authorization / AuthN/AuthZ requirements:**
  - Smoke tests MAY use credentials that match test-migration data (e.g. seeded user); these MUST NOT be production credentials and MUST be documented (e.g. in docs or fixture metadata). No secrets in repo.

---

## 6. States, Validations & Error Cases

### 6.1 States / Modes

- **Relevant states / flags:**
  - Spec run: not started / running / passed / failed.
  - Test type: Component Test (no real server) / e2e fixtures (no real server) / e2e smoke (real server required).
  - Backend: not running / running with test-migrations applied.
- **Transitions:** Running Component Test or fixtures tests does not require backend. Running smoke tests requires backend and test-migrations; if backend is down, smoke tests fail.

### 6.2 Validations

| Field/Topic | Rule | Error Reaction | Visible Where (UI/API) | Condition |
|-------------|------|----------------|------------------------|-----------|
| Describe block names | Specs must have "Component Test" and "e2e" with "fixtures" and "smoke". | Convention only; no automated enforcement in this ticket. | N/A | Always |
| Fixture usage in e2e/fixtures | Tests under e2e/fixtures must not call real server for the flows under test. | Test may fail or be flaky if server is used. | Cypress output | When running e2e/fixtures |
| Smoke test data | Smoke tests must use data that exists after test-migrations. | Smoke test fails if credentials or data are wrong or missing. | Cypress output | When running smoke |
| Config | baseUrl and proxy (if any) must allow frontend and (for smoke) backend to be reached. | Visit or API calls fail. | Cypress / browser | When running tests |

### 6.3 Error Cases / Edge Cases

| Case | Trigger | Expected System Behavior | User Feedback | Category |
|------|---------|---------------------------|---------------|----------|
| Backend down during smoke | Smoke test runs but backend is not running. | Smoke test fails (e.g. network error or non-2xx). | Cypress failure; clear error. | Operational |
| Test-migrations not applied | Smoke test uses seeded user but DB has no seed. | Login or data-dependent assertion fails. | Cypress failure. | Setup |
| Wrong describe name | New spec uses "Component" instead of "Component Test" or omits "e2e"/"fixtures"/"smoke". | No runtime error; convention violation. | Code review / docs. | Process |
| Fixture file missing | e2e/fixtures test references a fixture that does not exist. | Cypress fails loading fixture. | Cypress error. | Functional |

---

## 7. Non-Functional Requirements

- **Security:** No production credentials in repo; smoke test credentials (e.g. from test-migrations) are for dev/stage only and documented.
- **Privacy / Compliance:** Fixtures and test data must not contain real PII; use synthetic or documented test data only.
- **Performance / Scalability:** Component Test and e2e/fixtures should run without backend for speed; smoke tests may be slower and optional in fast feedback loops if config supports it.
- **Logging / Auditing:** Cypress default output and screenshots on failure are sufficient; no additional audit logging required.
- **Usability / Accessibility:** N/A (developer tooling).
- **Operability (monitoring, alerts):** CI workflow status is visible in GitHub (commit/PR); Cypress job success/failure is part of the same workflow as backend tests. No separate monitoring required.

---

## 8. Acceptance Criteria (testable)

- **AC-1:** Given the repo and frontend dependencies installed, When the documented Cypress open or run command is executed from the frontend app (e.g. `npm run e2e` or `npm run e2e:run`), Then Cypress starts and can load the existing E2E spec(s).
- **AC-2:** Given the refactored login spec (or the single spec under scope), When the spec file is read, Then it contains exactly one top-level describe "Component Test", one top-level describe "e2e", and inside "e2e" two nested describe blocks named "fixtures" and "smoke".
- **AC-3:** Given the refactored spec, When tests under "Component Test" are run (with or without backend), Then they pass and do not require real server responses for the behaviour they assert (e.g. validation, show/hide).
- **AC-4:** Given the refactored spec, When tests under "e2e" → "fixtures" are run, Then they pass using fixture data and intercepts (no real server required for those tests).
- **AC-5:** Given the backend is running and Prisma test-migrations have been applied, When tests under "e2e" → "smoke" are run, Then at least one smoke test passes and verifies a real user flow (e.g. app load and redirect to login, or login with test-migration user and basic navigation).
- **AC-6:** Given the Cypress configuration and support files, When they are reviewed against the strategy, Then any necessary adjustments or extensions are made (e.g. baseUrl, fixturesFolder, or documentation in config) so that the three-tier structure is supported.
- **AC-7:** Given a developer looking for the E2E structure rules, When they open the Cypress testing rule or project documentation, Then the three-tier structure (Component Test, e2e/fixtures, e2e/smoke) and the purpose of each block are clearly described.
- **AC-8:** Given a push to any branch, When the system-tests workflow runs, Then the backend-tests job and the cypress-e2e job both run (e.g. in parallel). The cypress-e2e job applies migrations and test-migrations, starts backend and frontend, and runs Cypress headless; when all tests pass, the workflow succeeds. When Cypress E2E tests fail, the workflow fails and the failure is visible on the commit/PR.

---

## 9. Dependencies, Risks, Impact

- **Dependencies (teams / services / configs):** Frontend app and build; for smoke tests and CI: backend and MySQL with schema and test-migrations applied. GitHub Actions; Node 22; npm workspaces. Documentation of test-migrations (e.g. in `.docs/system/backend.md`) and how to run them.
- **Risks / open technical uncertainties:** Cypress job runtime (backend + frontend start + wait + Cypress) may be slower than backend-only; optional future work: Cypress env or tags to run only "smoke" or only "Component Test" + "fixtures" for faster feedback.
- **Impact on existing functionality:** Existing login spec is refactored (describe names and placement of tests); behaviour of tests should remain equivalent. The previous backend-tests workflow is replaced by system-tests.yml (backend job unchanged in behaviour; Cypress job added). No change to production app code except possibly data-cy or test hooks if needed.

---

## 10. Open Points (UNRESOLVED)

- [ ] **Ticket ID:** The requirement uses Ticket-ID **5** as the next sequential task. If the project uses a different numbering scheme, replace "5" with the correct ID and rename the file/directory accordingly.

### Resolved

- **Cypress in CI:** In scope. The GitHub Actions workflow is renamed to system-tests.yml and includes a Cypress E2E job that runs after backend and frontend are started, with MySQL, migrations, and test-migrations applied.

---

*End of Requirement Sheet – Ticket 5*
