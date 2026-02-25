# Implementation Plan – 4 – Backend Unit/Integration Tests and GitHub CI/CD

## 0. Scope Check

- Requirement sheet present and reviewed: ✅
- Fits Zapatismo architecture constraints: ✅
- **In-Scope summary (bullets):**
  - Test framework and runner (Jest) in `apps/backend/` with unit and integration test execution.
  - Documented npm scripts for unit tests and integration tests (separate commands).
  - At least one minimal unit test and one minimal integration test as proof of setup.
  - One GitHub Actions workflow running backend tests on every push to every branch.
  - Documentation in root `README.md`, `.docs/system/backend.md`, and `apps/backend/README.md` for running tests and integration-test preconditions.
- **Out-of-Scope summary (bullets):**
  - Frontend or Strava/sync testing; E2E/system tests spanning frontend + backend + DB.
  - Deployment steps in the same workflow; coverage gates or minimum coverage %.
  - Migration execution in CI only as required to run integration tests (i.e. apply migrations to test DB).
- **Key assumptions (only if explicitly stated in requirements):**
  - Jest is the test runner (per requirement sheet §10 Resolved Decisions).
  - Integration tests in CI use the simpler option (lightweight DB); MySQL service container in CI is acceptable to avoid maintaining a second DB engine.
- **UNRESOLVED items blocking implementation (if any):** None.

---

## 1. Architecture Mapping (High-Level)

| Layer | Responsibility for this ticket | Notes |
|-------|---------------------------------|-------|
| Angular (apps/frontend) | None | Out of scope. |
| Backend (apps/backend, NestJS) | Host test code (unit + integration), Jest config, npm scripts | All test code and runner config live in backend. |
| Database (MySQL via Prisma) | Used by integration tests only; test DB in CI via service container | No schema changes; migrations applied in CI to create test DB schema. |
| OpenAPI contract | None | No API or DTO changes. |
| Docker/Compose | None for this ticket | CI uses GitHub-hosted runner and MySQL service container. |
| Strava integration | None | Out of scope. |
| Repository (`.github/workflows/`) | One workflow runs backend test scripts on every push | New workflow file; no secrets in repo. |

---

## 2. Work Breakdown Structure (WBS)

- **WP-1: Jest and test runner setup**
  - Goal: Install Jest, ts-jest, @types/jest in `apps/backend`; add Jest config so tests are discoverable and runnable; keep existing script names (`test`, `test:watch`, `test:cov`) working for unit tests.
  - Affected area(s): backend (package.json, new Jest config file or package.json jest section).
  - Depends on: none.
  - Deliverables: Jest runs via `npm run test` from `apps/backend`; at least one placeholder unit test so the suite is non-empty and passes.

- **WP-2: Integration test script and separation**
  - Goal: Add a single, documented npm script (e.g. `test:integration`) that runs only integration tests; clear separation from unit tests (e.g. file pattern or Jest project).
  - Affected area(s): backend (package.json, Jest config).
  - Depends on: WP-1.
  - Deliverables: `npm run test:integration` runs integration tests; unit and integration tests are mutually exclusive by pattern or config.

- **WP-3: Minimal unit test**
  - Goal: At least one unit test that runs with the unit-test command and passes (proof of setup).
  - Affected area(s): backend (new spec file, e.g. next to a service or in `src/`).
  - Depends on: WP-1.
  - Deliverables: One unit test file; test passes when running `npm run test`.

- **WP-4: Minimal integration test**
  - Goal: At least one integration test that runs with the integration-test command, uses a backing store (DB or HTTP), and passes.
  - Affected area(s): backend (e.g. `test/` or `src/**/*.integration-spec.ts`, NestJS testing module, PrismaService, test DB).
  - Depends on: WP-2. Integration test must run against MySQL (local or CI service container); migrations applied in CI before integration tests.
  - Deliverables: One integration test (e.g. in-memory app or supertest against real app + DB); test passes when DB is available and `npm run test:integration` is run.

- **WP-5: GitHub Actions workflow**
  - Goal: One workflow that runs on every push to every branch, runs backend unit and integration tests in a clean environment, using the same test commands as local; CI provides MySQL for integration tests without manual setup.
  - Affected area(s): repository (`.github/workflows/`).
  - Depends on: WP-1–WP-4.
  - Deliverables: Workflow file (e.g. `backend-tests.yml`); no secrets in file; uses Node setup, npm install (from root), MySQL service container, run migrations then unit then integration tests; status visible on commit/PR.

- **WP-6: Documentation**
  - Goal: Document how to run unit and integration tests locally and what must be running for integration tests; update all three required locations.
  - Affected area(s): root README, `.docs/system/backend.md`, `apps/backend/README.md`.
  - Depends on: WP-2, WP-4, WP-5 (so commands and preconditions are final).
  - Deliverables: Root `README.md`, `.docs/system/backend.md`, and `apps/backend/README.md` each contain a short section on running backend tests and integration-test preconditions (e.g. MySQL must be running for integration tests).

---

## 3. Backend Plan (NestJS)

### 3.1 Modules / Components to touch

- **Module(s):** None for production code; test utilities may introduce a test module or reuse `AppModule` / `TestingModule` in integration tests.
- **Controller(s):** None (optional: integration test may call one controller via supertest).
- **Service(s):** None for production behavior; unit test may target one service (e.g. `UsersService` or a small helper); integration test may target service + Prisma or one HTTP endpoint.
- **Repository/Prisma access layer:** Integration tests use `PrismaService` and real DB; no new repository layer.

### 3.2 REST Endpoints

No new or changed endpoints. Integration test may exercise an existing endpoint (e.g. `GET /api/users` or health) for proof of HTTP + DB integration.

### 3.3 Validation & Error Handling

- **Input validation approach:** N/A (no new API).
- **Domain validation approach:** N/A.
- **Error mapping:** Test failures map to Jest exit code non-zero and CI job failure.
- **Logging/Auditing:** Test runner output and CI logs only; no additional audit logging.

---

## 4. Data / Prisma Plan

### 4.1 Prisma schema changes

- **Models to add/modify:** None.
- **Relations/indices constraints:** None.
- **Backfill / defaults:** None.

### 4.2 Migration steps

- **Migration name suggestion:** N/A (no schema change).
- **Steps:** In CI, run existing migrations against the MySQL service container so the test database has the current schema before integration tests. Use `npx prisma migrate deploy` (or equivalent) with `DATABASE_URL` pointing at the service container.
- **Seed/test data impact:** Integration tests may create/delete test data in the test DB; use a dedicated test DB URL (e.g. `zapatismo_test`) so dev data is not affected. No seed required for CI unless tests depend on it.

Rules: Prisma Migrate only; no manual SQL. Migrations are applied in CI only to provide a ready DB for integration tests.

---

## 5. OpenAPI / Contract Plan

- **Spec changes:** None.
- **Regeneration steps:** None.
- **Client impact:** None.

---

## 6. Frontend Plan (Angular)

### 6.1 UX / Screens / Routes

- Screens affected: None.
- Routes affected: None.
- Components to add/modify: None. This ticket does not touch the frontend.

### 6.2 Data flow

- Services / API client usage: N/A.
- State management approach: N/A.
- Error display patterns: N/A.

### 6.3 Frontend validations

| Validation | Location (Frontend/Backend) | Rationale |
|------------|-----------------------------|-----------|
| N/A        | —                           | No frontend changes. |

---

## 7. Strava / Workout Sync (ONLY if required)

- Not required. No changes to Strava integration.

---

## 8. Testing Plan

- **Backend tests**
  - **Unit:** Jest; run with `npm run test` from `apps/backend`. At least one unit test; no DB required. Use `@nestjs/testing` and mocks for Prisma/dependencies where appropriate.
  - **Integration (DB):** Jest; run with `npm run test:integration`. At least one integration test that uses PrismaService and MySQL (or equivalent). Locally: MySQL must be running (e.g. Docker). CI: MySQL service container; run migrations then integration tests.
- **Frontend tests:** None in this ticket.
- **E2E (Cypress):** None in this ticket.
- **Contract / OpenAPI:** None in this ticket.

---

## 9. Acceptance Criteria Traceability

| AC ID | Implementation touchpoints | Test(s) / Verification |
|-------|----------------------------|-------------------------|
| AC-1 | WP-1, WP-3: Jest config + unit script + at least one unit test | Run `npm run test` from backend; exit 0 and at least one test passes. |
| AC-2 | Same unit test | Change one assertion to fail; run `npm run test`; exit non-zero and failure visible in output. |
| AC-3 | WP-2, WP-4: Integration script + at least one integration test | With MySQL available, run `npm run test:integration`; exit 0 and at least one test passes. |
| AC-4 | WP-5: GitHub Actions workflow | Push to any branch; workflow runs unit and integration tests; job succeeds when all pass. |
| AC-5 | WP-5: Same workflow | Introduce a failing test and push; workflow job fails; failure visible in Actions run and on commit/PR. |
| AC-6 | WP-5: Workflow under `.github/workflows/`, no secrets | Inspect workflow file; confirm no hardcoded secrets or production credentials. |
| AC-7 | WP-6: Docs in root README, backend.md, apps/backend/README | Read all three; confirm they describe how to run unit and integration tests and what must run for integration tests (e.g. MySQL). |

---

## 10. Execution Sequence

1. **WP-1 – Jest setup:** Add Jest, ts-jest, @types/jest to `apps/backend` devDependencies; add Jest configuration (e.g. `jest.config.ts` or `package.json` jest section) so `*.spec.ts` (unit) are picked up; ensure `npm run test` runs and exits 0 (with a placeholder test).
2. **WP-3 – Unit test:** Add at least one unit test (e.g. `users.service.spec.ts` or `app.controller.spec.ts`) that passes.
3. **WP-2 – Integration script:** Configure Jest to run integration tests separately (e.g. second Jest project or pattern like `*.integration-spec.ts`), and add `npm run test:integration` script in `apps/backend/package.json`.
4. **WP-4 – Integration test:** Add at least one integration test that uses DB (e.g. `TestingModule` with `PrismaModule`, create/read one entity, or supertest to one endpoint); ensure it passes when MySQL is available.
5. **WP-5 – GitHub Actions:** Create `.github/workflows/backend-tests.yml` (or similar): trigger on push to all branches; checkout; set Node version (pin to same major as local); install from root (`npm ci`); start MySQL service container; set `DATABASE_URL` for test DB; run Prisma migrate deploy; run `npm run test -w @zapatismo/backend`; run `npm run test:integration -w @zapatismo/backend` (or equivalent from backend directory); no secrets in file.
6. **WP-6 – Documentation:** Update root `README.md`, `.docs/system/backend.md`, and `apps/backend/README.md` with sections on running backend unit and integration tests and integration-test preconditions (MySQL).
7. **Verification:** Run unit and integration tests locally; push and confirm workflow runs and status appears on commit/PR; verify AC-2 and AC-5 by forcing a failure.

---

## 11. Risks & Open Points (UNRESOLVED)

- None. Requirement sheet and resolved decisions are sufficient. If integration tests prove flaky in CI, stability is explicitly out of scope and can be a follow-up.

---

*End of Implementation Plan – Ticket 4*
