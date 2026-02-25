# Implementation Plan – 5 – Frontend Cypress E2E Test Strategy and System

## 0. Scope Check

- Requirement sheet present and reviewed: ✅
- Fits Zapatismo architecture constraints: ✅
- **In-Scope summary (bullets):**
  - Mandatory describe-block structure in E2E specs: "Component Test", "e2e" with subblocks "fixtures" and "smoke".
  - Component Test: lightweight UI checks (field length, show/hide, validation) without real server; may use intercepts/fixtures.
  - e2e/fixtures: tests driving UI states via fixture data and intercepts (no real server).
  - e2e/smoke: real HTTP to backend; alignment with Prisma test-migration data (e.g. seeded user).
  - Review/adjust Cypress config and support files; document strategy in `.cursor/rules/cypress-testing.mdc` or project docs.
  - Refactor existing login spec to the new structure; ensure at least one smoke test verifies a real user flow.
  - Single GitHub Actions workflow (system-tests) running backend tests and Cypress E2E on every push (Cypress job: MySQL, migrations, test-migrations, backend, frontend, then Cypress headless).
- **Out-of-Scope summary (bullets):**
  - Backend or iOS test changes (ticket 4 covers backend).
  - Cypress Component Testing (mount-based).
  - Full coverage of every screen; strategy and structure plus representative specs only.
  - Changing Prisma test-migrations content or runner; only alignment of smoke tests with existing test data.
  - Deployment to staging or production.
- **Key assumptions (from requirements):**
  - "Component Test" = in-spec E2E-style tests for component-level behaviour (validation, show/hide, disable); may use cy.visit and cy.intercept with fixtures; not mount-based.
  - Smoke tests require running backend and DB with test-migrations applied; credentials (e.g. from test-migrations) are dev/test only and documented.
  - Existing Cypress setup (Angular, baseUrl, proxy to backend) remains the runtime context.
- **UNRESOLVED items blocking implementation:** None.

---

## 1. Architecture Mapping (High-Level)

| Layer | Responsibility for this ticket | Notes |
|-------|--------------------------------|-------|
| Angular (apps/frontend) | Cypress specs, fixtures, support, config; no app code changes except possibly data-cy if needed. | E2E test strategy and structure only. |
| Backend (apps/backend, NestJS) | None. | Backend tests remain as in ticket 4; no API or code changes. |
| Database (MySQL via Prisma) | None. | Test-migrations already exist; smoke tests align with their data. |
| OpenAPI contract | None. | No API changes. |
| Docker/Compose | None. | CI uses GitHub Actions services (MySQL); no docker-compose change required. |
| GitHub Actions | Single system-tests workflow: backend-tests job + cypress-e2e job (migrations, test-migrations, start backend/frontend, run Cypress headless). | Workflow may already exist (system-tests.yml); verify and adjust to match requirements. |
| iOS (apps/app-ios) | N/A. | Not in scope. |

---

## 2. Work Breakdown Structure (WBS)

- **WP-1: Document three-tier E2E structure and update Cypress rule**
  - Goal: Single source of truth for "Component Test", "e2e/fixtures", "e2e/smoke" and when to use each.
  - Affected area(s): `.cursor/rules/cypress-testing.mdc` (and optionally `.docs/system/` if a dedicated E2E doc is added).
  - Depends on: None.
  - Deliverables: Updated cypress-testing.mdc describing the three-tier structure, block names, and intended use; note that smoke tests rely on Prisma test-migration data (e.g. document which credentials/data smoke tests use).

- **WP-2: Review and adjust Cypress configuration and support**
  - Goal: Ensure config supports the strategy (baseUrl, specPattern, fixturesFolder, env if needed); support file remains minimal.
  - Affected area(s): `apps/frontend/cypress.config.ts`, `apps/frontend/cypress/support/e2e.ts`, `apps/frontend/cypress/support/commands.ts`.
  - Depends on: None.
  - Deliverables: Any necessary config/support changes (e.g. baseUrl, fixturesFolder, or comments); no structural change if current config is sufficient.

- **WP-3: Refactor login spec to new describe-block structure**
  - Goal: Login spec has exactly one top-level describe "Component Test", one "e2e" with nested "fixtures" and "smoke"; existing tests moved into the correct blocks.
  - Affected area(s): `apps/frontend/cypress/e2e/login/login.cy.ts`.
  - Depends on: WP-1 (so placement is unambiguous).
  - Deliverables: Refactored login.cy.ts: Component Test (e.g. disable submit when email/password invalid); e2e/fixtures (login success, 401, 500, network error via intercepts); e2e/smoke (app load + redirect to login; optional: real login with test-migration user).

- **WP-4: Add or align smoke test with test-migration data**
  - Goal: At least one smoke test verifies a real user flow; smoke tests use data from test-migrations (e.g. `thomas@zapatismo.local` / `thomas` from `prisma/test-migrations/00002_thomas_user.ts`).
  - Affected area(s): `apps/frontend/cypress/e2e/login/login.cy.ts` (e2e/smoke block).
  - Depends on: WP-3.
  - Deliverables: Smoke block contains at least: (1) unauthenticated redirect to login; (2) optionally, login with test-migration credentials and basic navigation. Documentation of which test-migration data smoke tests rely on (in rule or backend.md).

- **WP-5: Verify and adjust GitHub Actions system-tests workflow**
  - Goal: One workflow runs on every push; backend-tests job (unit + integration); cypress-e2e job (MySQL, migrate deploy, test-migrations, start backend + frontend, wait, Cypress headless). Workflow named for system tests (backend + frontend E2E).
  - Affected area(s): `.github/workflows/system-tests.yml` (and removal of `.github/workflows/backend-tests.yml` if it still exists and is replaced).
  - Depends on: None (can run in parallel with WP-1–WP-4).
  - Deliverables: system-tests.yml with both jobs; cypress-e2e applies test-migrations and runs `npm run e2e:headless -w frontend`; env (e.g. CYPRESS_baseUrl) set as needed; backend-tests workflow removed if replaced.

- **WP-6: Organise fixtures by feature (SHOULD)**
  - Goal: Fixtures used by e2e/fixtures tests organised by feature under `cypress/fixtures/` (e.g. login/, dashboard/) with state-based names.
  - Affected area(s): `apps/frontend/cypress/fixtures/` (already has login/success.json, error-401.json, error-500.json).
  - Depends on: WP-3.
  - Deliverables: Confirm or adjust fixture layout to match FR-10; no change if already compliant.

---

## 3. Backend Plan (NestJS)

No backend changes. This ticket is frontend Cypress E2E and CI only.

---

## 4. Data / Prisma Plan

No Prisma schema or migration changes. Test-migrations (e.g. `prisma/test-migrations/00002_thomas_user.ts`) are existing; smoke tests will align with their data (e.g. `thomas@zapatismo.local` / `thomas`). No edits to test-migration files.

---

## 5. OpenAPI / Contract Plan

No OpenAPI or API contract changes.

---

## 6. Frontend Plan (Angular)

### 6.1 UX / Screens / Routes

- No user-facing UI changes. Optional: add or reuse `data-cy` attributes only if needed for selectors in refactored specs.

### 6.2 Cypress specs, config, and docs

- **Specs:** One spec in scope for refactor: `cypress/e2e/login/login.cy.ts`. Structure: describe "Component Test" (lightweight validation/disable tests); describe "e2e" → describe "fixtures" (intercept-driven login success/error tests); describe "e2e" → describe "smoke" (real server: redirect, optionally real login with test-migration user).
- **Config:** `cypress.config.ts` — review baseUrl, specPattern, fixturesFolder, env; extend only where needed.
- **Support:** `e2e.ts`, `commands.ts` — review; add commands only if needed for the strategy.
- **Page objects:** Keep `cypress/e2e/login/po/LoginPO.ts` and `cypress/page-objects/MainPO.ts`; no structural change (FR-11).

### 6.3 Frontend validations

| Validation | Location | Rationale |
|------------|----------|-----------|
| Describe block names and structure | Convention + code review | No automated enforcement in this ticket. |
| Fixture usage in e2e/fixtures | Spec author / review | Tests under e2e/fixtures must use intercepts; no real server for those tests. |
| Smoke test credentials | Docs + test-migrations | Smoke tests use test-migration data only; documented in rule or backend.md. |

---

## 7. iOS App Plan

Not required. Ticket does not affect iOS.

---

## 8. Testing Plan

- **Backend tests:** No change. Backend remains covered by ticket 4 (unit + integration). This ticket does not add backend tests.
- **Cypress E2E (this ticket):**
  - **Component Test + e2e/fixtures:** Covered by refactored login spec; runnable without backend (intercepts). Verification: run Cypress with only frontend and confirm Component Test and e2e/fixtures pass.
  - **e2e/smoke:** Covered by refactored login spec; requires backend + DB with test-migrations. Verification: run full Cypress with backend and test-migrations applied; at least one smoke test (e.g. redirect to login, and optionally real login) passes.
- **CI:** The system-tests workflow is the integration check: backend-tests job + cypress-e2e job both run; Cypress job applies test-migrations and runs Cypress headless. Success/failure of the workflow verifies the full system (backend + Cypress E2E).
- **No new unit or integration tests** for backend or frontend application code; only E2E spec structure, content, and CI execution.

---

## 9. Acceptance Criteria Traceability

| AC ID | Implementation touchpoints | Test(s) / Verification |
|-------|----------------------------|-------------------------|
| AC-1 | Cypress config, npm scripts (e2e, e2e:run), frontend deps | Run `npm run e2e` or `npm run e2e:run` from frontend; Cypress starts and loads spec(s). |
| AC-2 | login.cy.ts refactor (WP-3) | Read spec file; confirm one describe "Component Test", one "e2e" with nested "fixtures" and "smoke". |
| AC-3 | Component Test block in login.cy.ts | Run Component Test block with or without backend; tests pass without real server. |
| AC-4 | e2e/fixtures block in login.cy.ts | Run e2e/fixtures block; tests pass using fixtures and intercepts. |
| AC-5 | e2e/smoke block + test-migrations (WP-4) | With backend running and test-migrations applied, run smoke block; at least one smoke test passes (e.g. redirect to login; optionally login with test user). |
| AC-6 | cypress.config.ts, support files (WP-2) | Review config/support against strategy; apply any needed adjustments. |
| AC-7 | cypress-testing.mdc or project docs (WP-1) | Open rule or docs; three-tier structure and purpose of each block are described. |
| AC-8 | system-tests.yml (WP-5) | Push to a branch; workflow runs; backend-tests and cypress-e2e jobs run; cypress-e2e applies migrations + test-migrations, starts backend + frontend, runs Cypress headless; workflow success/failure visible on commit/PR. |

---

## 10. Execution Sequence

1. **Documentation:** Update `.cursor/rules/cypress-testing.mdc` with the three-tier structure (Component Test, e2e/fixtures, e2e/smoke), block names, and intended use; document that smoke tests rely on Prisma test-migration data (e.g. reference `prisma/test-migrations/` and example credentials). (WP-1)
2. **Cypress config and support:** Review `cypress.config.ts`, `cypress/support/e2e.ts`, `cypress/support/commands.ts`; apply only necessary changes (e.g. baseUrl, fixturesFolder, or env). (WP-2)
3. **Workflow:** Ensure `.github/workflows/system-tests.yml` exists and matches requirements (name, on push, backend-tests job, cypress-e2e job with MySQL, migrate deploy, test-migrations, start backend + frontend, wait, e2e:headless). Remove or replace `backend-tests.yml` if it is superseded. (WP-5)
4. **Login spec refactor:** Restructure `cypress/e2e/login/login.cy.ts`: add top-level describe "Component Test" (move or add lightweight tests: e.g. disable submit when email/password invalid); add top-level describe "e2e" with nested "fixtures" and "smoke". Move intercept-based login tests (success, 401, 500, network error) under e2e/fixtures. Move "loads the app and redirects unauthenticated users to login" under e2e/smoke. (WP-3)
5. **Smoke test and test-migration alignment:** In e2e/smoke, ensure at least one test verifies a real flow (redirect already counts). Optionally add a smoke test that logs in with test-migration user (e.g. `thomas@zapatismo.local` / `thomas`) and asserts basic navigation. Document in the rule or backend.md which test-migration data smoke tests use. (WP-4)
6. **Fixtures:** Confirm fixtures under `cypress/fixtures/login/` are organised by feature and state; adjust if needed. (WP-6)
7. **Verification:** Run `npm run e2e` (or e2e:run) from frontend; run with backend + test-migrations for full suite. Confirm CI: push and check system-tests workflow (both jobs, Cypress headless success when all tests pass).

---

## 11. Risks & Open Points (UNRESOLVED)

- None. All requirements are clear; test-migration data (e.g. thomas user) exists; workflow pattern is defined.

---

*End of Implementation Plan – Ticket 5*
