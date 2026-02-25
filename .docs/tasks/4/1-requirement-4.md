# Requirement Sheet – 4 – Backend Unit/Integration Tests and GitHub CI/CD

## 0. Quick Facts

- **Ticket-ID:** 4
- **Short Description (1 sentence):** Introduce a unit and integration test setup for the NestJS backend and a GitHub Actions workflow to run those tests in CI/CD.
- **Goal / Value (max 5 bullets):**
  - Enable automated verification of backend behavior (unit and integration).
  - Catch regressions before merge via CI.
  - Establish a repeatable, repo-based test and CI setup for the backend.
  - Align with project rule: no manual production changes; automation (CI/CD) required.
  - Provide a foundation for future test coverage growth.
- **Affected Roles:** Developers (backend), PR reviewers, CI/CD consumers.
- **Affected Modules/Components (conceptual):** `apps/backend/` only; GitHub Actions (repository-level workflow).
- **In-Scope (max 5 bullets):**
  - Test framework and runner setup in `apps/backend/` (unit + integration).
  - Ability to run unit tests and integration tests locally (npm scripts).
  - At least one minimal unit test and one minimal integration test as proof of setup.
  - One GitHub Actions workflow that runs backend tests on every push to every branch.
  - Documentation of how to run tests and how CI is triggered.
- **Out-of-Scope (max 5 bullets):**
  - Frontend or iOS app testing.
  - End-to-end or system tests spanning frontend + backend + DB in this ticket.
  - Deployment steps (e.g. deploy to staging/production) in the same workflow.
  - Migration execution or DB seeding as part of this CI workflow (unless required to run integration tests).
  - Coverage gates or quality thresholds (e.g. minimum coverage %) as a MUST for this ticket.

---

## 1. Context & Problem Statement

- **Current State (As-Is):**
  - Backend has npm scripts (`test`, `test:watch`, `test:cov`) that reference Jest, but no Jest (or other test runner) is installed in devDependencies; no test files exist; no CI workflow exists.
  - There is no automated way to verify backend behavior on commit or PR.
- **Problem / Pain:**
  - Regressions can be merged without automated checks; refactors and new features lack a safety net; project rules expect CI/CD and reproducibility, but backend testing is not automated.
- **Target State (To-Be, without implementation details):**
  - Backend has a working test setup: developers can run unit tests and integration tests locally via defined commands.
  - A GitHub Actions workflow runs the same backend tests on every push to every branch, so that test failures block or clearly signal before merge.
  - The setup is documented and committed; no manual, one-off steps are required to run tests or CI.
- **Assumptions (if any were stated):**
  - Scope is limited to `apps/backend/`; CI workflow is repository-level (e.g. under `.github/workflows/`) but only invokes backend test steps.
  - “System testing” in the original request is interpreted as “automated testing of the backend system” (unit + integration), not full end-to-end user journeys across frontend and backend.
- **Non-Goals:**
  - Full test coverage of all backend modules; frontend/iOS testing; deployment automation; coverage enforcement in this ticket.

---

## 2. Stakeholders & Roles

| Role | Goal/Interest | Rights/Constraints |
|------|----------------|---------------------|
| Backend developer | Write and run unit/integration tests locally; get fast feedback from CI on PR | Must use repo tooling and conventions; no secrets in repo |
| PR reviewer | See CI status (pass/fail) for backend tests before approving | Relies on workflow running on correct branch/events |
| Project / repo owner | Automated quality gate; alignment with “CI/CD, no manual prod changes” | Workflow runs in GitHub; no proprietary or off-GitHub CI required for this ticket |

---

## 3. User Journeys / Use Cases

### UC 1: Run backend unit tests locally

- **Primary Actor:** Backend developer
- **Trigger:** Developer wants to verify code after changes.
- **Preconditions:** Repository cloned; dependencies installed (e.g. `npm install` from root or backend); no running backend or DB required for unit tests (if unit tests are isolated).
- **Flow:**
  1. Developer navigates to backend context (e.g. `apps/backend/` or repo root with workspace).
  2. Developer runs the defined command to execute unit tests (e.g. `npm run test` or equivalent).
  3. Test runner executes unit tests and reports results (pass/fail, optional summary).
  4. Developer reads output and fixes any failures.
- **Outcome:** Developer gets a clear pass/fail result for unit tests without starting the full stack.
- **Alternatives / Abort Paths:** Command not found or misconfigured → documented setup steps must resolve it. No tests run → at least one placeholder unit test exists so the suite is non-empty.

### UC 2: Run backend integration tests locally

- **Primary Actor:** Backend developer
- **Trigger:** Developer wants to verify behavior against a real or test database (or other external boundary).
- **Preconditions:** Test runner and integration test setup configured; database (or substitute) available as per design (e.g. local MySQL, test container, or in-memory).
- **Flow:**
  1. Developer ensures required services (e.g. MySQL for integration tests) are running, if required.
  2. Developer runs the defined command for integration tests (e.g. `npm run test:integration` or equivalent).
  3. Test runner executes integration tests and reports results.
  4. Developer reads output and fixes any failures.
- **Outcome:** Developer gets a clear pass/fail result for integration tests; documentation states how to provide DB (or that it is provided automatically).
- **Alternatives / Abort Paths:** DB not available → clear error or skip with instructions. No integration tests yet → at least one minimal integration test exists as proof of setup.

### UC 3: CI runs backend tests on every push

- **Primary Actor:** CI system (GitHub Actions), observed by developer and reviewer
- **Trigger:** Every push to any branch.
- **Preconditions:** GitHub Actions enabled for the repo; workflow file committed; secrets/env configured if needed (e.g. test DB URL or none if using in-memory DB).
- **Flow:**
  1. On trigger, workflow starts (e.g. “Backend tests” job).
  2. Workflow checks out repo, sets up Node (and optionally database/service container if integration tests need it).
  3. Workflow installs dependencies and runs backend unit tests.
  4. Workflow runs backend integration tests (if applicable), with DB/service as defined.
  5. Workflow reports success or failure; status appears on commit/PR.
- **Outcome:** Backend test results are visible in GitHub; failures block or clearly warn before merge, per project policy.
- **Alternatives / Abort Paths:** Workflow misconfigured → fix workflow or document required secrets. Flaky tests → out of scope for this ticket (stability can be a follow-up).

---

## 4. Functional Requirements (MUST/SHOULD/MAY)

| ID | Requirement (clear, atomic) | Priority | Rationale / Value | Notes |
|----|-----------------------------|----------|-------------------|-------|
| FR-1 | A test runner and framework are installed and configured in `apps/backend/` so that tests can be executed from the command line. | MUST | Without this, no tests can run. | Use Jest: best fit for NestJS/TypeScript stack and supported by `@nestjs/testing`. |
| FR-2 | Unit tests can be run via a single, documented npm (or workspace) script from the backend or repo root. | MUST | Developers and CI need a single entry point for unit tests. | e.g. `npm run test` in `apps/backend`. |
| FR-3 | Integration tests can be run via a single, documented npm (or workspace) script; integration tests are clearly separated from unit tests (e.g. separate script or pattern). | MUST | Enables running heavier tests only when needed and in CI. | How DB is provided (container, env) is implementation. |
| FR-4 | At least one unit test exists that runs with the unit-test command and passes. | MUST | Proof that unit test setup works. | Placeholder or minimal test is acceptable. |
| FR-5 | At least one integration test exists that runs with the integration-test command and passes, and that demonstrates integration with a backing store or HTTP layer (e.g. DB or in-memory). | MUST | Proof that integration test setup works. | Exact scope (one controller, one service + DB) is implementation. |
| FR-6 | A GitHub Actions workflow file exists that runs backend unit and integration tests on every push to every branch. | MUST | Delivers “CI/CD pipeline with GitHub” for backend testing. | Trigger: push to any branch. |
| FR-7 | The CI workflow uses the same test commands as local (or equivalent) so that “runs locally” implies “runs in CI” for the same commit. | MUST | Avoids “works on my machine” and ensures CI is representative. | Same scripts, same Node version family where possible. |
| FR-8 | Documentation describes how to run unit and integration tests locally and what (if anything) must be running (e.g. MySQL). It MUST be present in the root `README.md`, in `.docs/system/backend.md`, and in `apps/backend/README.md`. | MUST | Onboarding and reproducibility; single source of truth. | Obligatory; all three locations must be updated. |
| FR-9 | CI workflow runs in a clean environment (e.g. checkout, install, run) without relying on host-specific state. | MUST | Reproducibility and fairness of CI. | Use standard GitHub-hosted runner and explicit steps. |
| FR-10 | If integration tests require a database, CI provides it without manual setup; prefer the simpler option (e.g. in-memory or lightweight DB) for ease of creation and maintenance. | MUST | Otherwise integration tests cannot run in CI. | Realistic DB testing is delegated to a separate workflow in a stage environment. |
| FR-11 | Test and CI setup do not introduce secrets or credentials in the repository; any test-only config uses env or safe defaults. | MUST | Project rule: no secrets in repo. | e.g. test DB URL from env or default to localhost in CI. |

---

## 5. Data & Interfaces (conceptual)

- **Data objects (terms + meaning, no final fields):**
  - **Test suite:** Set of unit tests (isolated, no real DB) and integration tests (with DB or HTTP boundary).
  - **Test run result:** Pass/fail plus optional summary (counts, duration); produced by the test runner.
  - **CI run:** One workflow execution; inputs = repo state (branch, commit), outputs = job status (success/failure) and logs.
- **Inputs / Outputs (high-level):**
  - **Local:** Developer runs script(s) → test runner runs tests → stdout/exit code (and optional coverage report).
  - **CI:** GitHub triggers workflow → workflow runs test script(s) → workflow passes or fails; status visible on commit/PR.
- **External systems / integrations:**
  - **GitHub Actions:** Host for CI; workflow runs on GitHub’s infrastructure; may use actions from marketplace or inline steps.
  - **Database (integration tests):** MySQL or equivalent; may be provided as service container in CI or local instance; no production DB used.
- **Authorization / AuthN/AuthZ requirements:**
  - No production or sensitive systems used by tests; test DB (if any) is ephemeral or dedicated test instance; no real user credentials in tests.

---

## 6. States, Validations & Error Cases

### 6.1 States / Modes

- **Relevant states / flags:**
  - Test run: not started / running / passed / failed.
  - CI job: queued / running / success / failure / cancelled.
- **Transitions:** Test run goes from running → passed or failed. CI job goes from queued → running → success or failure (or cancelled).

### 6.2 Validations

| Field/Topic | Rule | Error Reaction | Visible Where (UI/API) | Condition |
|-------------|------|----------------|------------------------|-----------|
| Test script exists | Backend must define unit and integration test scripts. | Build/CI fails if script missing. | npm / CI logs | Always |
| Test file pattern | Test files must be picked up by runner (e.g. `*.spec.ts` or `*.test.ts`). | No tests run or wrong tests run. | Local / CI output | Always |
| Integration test DB | If integration tests need DB, it must be reachable in CI. | Job fails with clear error (e.g. connection refused). | CI logs | When integration tests run |

### 6.3 Error Cases / Edge Cases

| Case | Trigger | Expected System Behavior | User Feedback | Category |
|------|---------|---------------------------|---------------|----------|
| Unit test failure | One unit test asserts false. | Unit test script exits non-zero; CI job fails. | Red X on commit/PR; logs show failing test. | Functional |
| Integration test failure | DB unavailable or assertion fails. | Integration test script exits non-zero; CI job fails. | Same as above. | Functional |
| No tests found | Test pattern matches no files. | Runner reports 0 tests; prefer failure or warning so it’s visible. | Logs | Configuration |
| Wrong Node version | CI uses different Node than local. | Tests should still run; version should be pinned in workflow. | N/A | Operational |
| Flaky test | Test fails intermittently. | No specific behavior required in this ticket; follow-up for stability. | N/A | Out of scope |

---

## 7. Non-Functional Requirements

- **Security:** No production credentials or secrets in repo or in workflow config; test-only credentials via GitHub secrets or non-sensitive env if needed.
- **Privacy / Compliance:** Tests must not use real PII; use fixtures or synthetic data.
- **Performance / Scalability:** CI run time SHOULD be reasonable (e.g. under a few minutes for current backend size); no hard limit in this ticket.
- **Logging / Auditing:** Test runner output and CI logs are sufficient to diagnose failures; no additional audit logging required for tests.
- **Usability / Accessibility:** N/A (developer tooling only).
- **Operability (monitoring, alerts):** CI status is visible in GitHub; no separate monitoring required for this ticket.

---

## 8. Acceptance Criteria (testable)

- **AC-1:** Given the repo is cloned and dependencies installed, When the developer runs the documented unit-test command from the backend (or prescribed path), Then all unit tests execute and at least one passes, and the command exits with code 0 when all pass.
- **AC-2:** Given any unit test is changed to fail (e.g. force a failing assertion), When the unit-test command is run, Then the command exits with non-zero and the failure is visible in the output.
- **AC-3:** Given the documented integration-test preconditions (e.g. DB running or provided), When the developer runs the documented integration-test command, Then all integration tests execute and at least one passes, and the command exits with code 0 when all pass.
- **AC-4:** Given a push or pull request to the branch(es) configured in the workflow, When the workflow runs, Then it runs backend unit tests and integration tests (or the single combined test run if designed so) and the job succeeds when all tests pass.
- **AC-5:** Given a commit that introduces a failing backend test, When the workflow runs for that commit, Then the workflow job fails and the failure is visible in the GitHub Actions run and on the commit/PR.
- **AC-6:** The GitHub Actions workflow file is under version control (e.g. `.github/workflows/...`) and does not contain secrets or production credentials.
- **AC-7:** Documentation exists in the root `README.md`, in `.docs/system/backend.md`, and in `apps/backend/README.md`, stating how to run unit and integration tests locally and what (if anything) must be running for integration tests.

---

## 9. Dependencies, Risks, Impact

- **Dependencies (teams / services / configs):** GitHub Actions available for the repo; npm (or equivalent) for install and run; for integration tests in CI, use the simpler option (in-memory or lightweight DB) so no Docker/MySQL service container is required in this workflow.
- **Risks / open technical uncertainties:** None; test runner (Jest) and integration DB strategy (simple option) are decided.
- **Impact on existing functionality:** Adding tests and CI does not change production behavior; existing `test` scripts in backend may be replaced or extended to point at the new runner and structure.

---

## 10. Resolved Decisions (formerly Open Points)

- **Branch/event policy:** The workflow MUST run on **every push to every branch**. No restriction to `development` or PR-only.
- **Integration test DB in CI:** Use the **simpler option**—easier to create and maintain (e.g. in-memory or lightweight DB). Full realism against MySQL is out of scope for this CI workflow; a separate action workflow in a stage environment will cover that.
- **Test runner:** Use **Jest**. It is the best fit for the backend stack (NestJS, TypeScript), is supported by `@nestjs/testing`, and matches the existing script names in `package.json`.

---

*End of Requirement Sheet – Ticket 4*
