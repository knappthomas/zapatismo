# Requirement Sheet – docker-1 – Docker Setup for Staging & Production

## 0. Quick Facts
- **Ticket-ID:** docker-1
- **Short Description (1 sentence):** Dockerize backend and frontend for staging and production deployment on a Scaleway VPS, with root-level docker-compose per environment, two GitHub Actions deploy pipelines (staging branch → staging.domain with DB reset+seed; main → domain with migrate deploy), images pushed to ghcr.io, SSH-based rollout, and documented .env and Angular build-time backend URL handling.
- **Goal / Value (max 5 bullets):**
  - Enable one-command staging/production deployment on a Linux VPS (Scaleway) using Docker.
  - Reproducible, version-controlled container builds (Dockerfiles) and stack definition (docker-compose per environment).
  - Two isolated environments on the same server: staging (staging.domain) and production (domain), each with own containers and database.
  - Automated deploy via GitHub Actions: push to `staging` → staging deploy with DB reset+seed; push to `main` → production deploy with migrate only.
  - Clear path to switch from containerized MySQL to Scaleway Managed MySQL by changing only DATABASE_URL and removing the mysql service from compose.
  - Documented environment variables and Angular build-time backend URL so operators and future migrations are unambiguous.
- **Affected Roles:** DevOps / operator deploying and running staging or production; developer who needs to understand build and env contract.
- **Affected Modules/Components (conceptual):** Backend (NestJS) build and runtime image; Frontend (Angular) build and nginx serving; MySQL (optional in stack, one instance per environment); docker-compose per environment (staging/production); GitHub Actions deploy workflows (deploy-staging.yml, deploy-production.yml); host-level nginx on the server for subdomain routing; environment configuration (.env per environment).
- **In-Scope (max 5 bullets):**
  - Dockerfiles for backend and frontend (production-oriented builds; frontend multi-stage with nginx).
  - Two docker-compose files (staging, production): each with mysql, backend, frontend; frontend as reverse proxy to backend; internal network; only internal ports exposed to host (not 80/443 directly — host nginx handles that).
  - Host-level nginx configuration on the Scaleway server routing `staging.domain` → staging stack and `domain` → production stack.
  - Two GitHub Actions workflows (deploy-staging.yml, deploy-production.yml): build images, push to ghcr.io, SSH to Scaleway, run docker compose pull and up -d; staging additionally runs DB reset + seed, production runs prisma migrate deploy only.
  - .env.example per environment listing all variables required on the server (and for builds where needed).
  - Documented handling of Angular backend URL at build time (and how it relates to runtime proxy).
- **Out-of-Scope (max 5 bullets):**
  - Using Docker for local development; local workflow remains npm/Node-based as today.
  - Modifying `.github/workflows/system-tests.yml` or existing test logic.
  - Implementing TLS/HTTPS or reverse proxy in front of Docker (e.g. Traefik, Caddy); only the stack and deploy pipeline are in scope; TLS can be added later.
  - Managed MySQL setup or migration of data; only the contract (DATABASE_URL) and ability to remove mysql from compose are in scope.
  - Any change to application business logic, API contract, or database schema.

## 1. Context & Problem Statement
- **Current State (As-Is):** Zapatismo is an npm monorepo (NestJS backend, Angular frontend, Prisma/MySQL). MySQL is already run via Docker Compose in `misc/mysql/`. Backend and frontend are run locally with npm (e.g. `npm run start:dev`, `ng serve`). There is no standardized way to run the full stack in a production-like way on a VPS or to automate deployment.
- **Problem / Pain:** Staging and production deployment on a Scaleway server require a defined, repeatable container setup and an automated deploy path. Without Dockerfiles and a single docker-compose, deployment is manual and environment drift is likely. Without a deploy workflow, releases are error-prone and not traceable.
- **Target State (To-Be, without implementation details):** (1) Backend and frontend have production-ready Dockerfiles; (2) two docker-compose files (staging, production) each define mysql (optional), backend, and frontend, with the frontend serving the Angular app and proxying API requests to the backend; (3) a host-level nginx on the server routes subdomains: `staging.domain` → staging stack, `domain` → production stack; (4) two GitHub Actions workflows: push to `staging` branch triggers staging deploy (DB reset + seed), push to `main` triggers production deploy (migrate only); both build images, push to ghcr.io, and deploy via SSH; (5) all required environment variables are documented in .env.example per environment; (6) the way the frontend gets the backend API URL at build time is documented so that staging/production builds are correct.
- **Assumptions (if any were stated):** Node.js v22; Scaleway VPS is Linux and can run Docker and docker compose; existing `misc/mysql/docker-compose.yml` can be used as reference or folded into the root compose; local development continues without using this Docker setup.
- **Non-Goals:** Local Docker-based dev; changing system-tests.yml; implementing TLS in this ticket; managed DB provisioning or data migration; new application features.

## 2. Stakeholders & Roles
| Role | Goal/Interest | Rights/Constraints |
|------|---------------|--------------------|
| DevOps / operator | Deploy and run the app on staging/production with one command; switch DB to managed MySQL later by config only. | Needs documented .env and compose; no secrets in repo. |
| Developer | Understand how backend and frontend are built and how API URL is set for Angular. | Repo remains source of truth; no breaking change to local npm workflow. |
| CI/CD | Reliable, repeatable build and deploy on push (e.g. main or staging). | Uses GitHub secrets for credentials and SSH; does not alter system-tests workflow. |

## 3. User Journeys / Use Cases

### UC 1a: Deploy to Staging
- **Primary Actor:** DevOps / developer.
- **Trigger:** Push to `staging` branch.
- **Preconditions:** GitHub Actions secrets configured for staging (DATABASE_URL_STAGING, JWT_SECRET, Strava credentials, SSH key); server has Docker, docker compose and host nginx; staging docker-compose and Dockerfiles exist.
- **Flow (numbered, precise):**
  1. Developer pushes a commit to the `staging` branch.
  2. GitHub Actions (deploy-staging.yml) builds backend and frontend images (staging-tagged), pushes to ghcr.io.
  3. Workflow SSHs to Scaleway server, runs docker compose pull and docker compose up -d for the staging stack.
  4. Workflow runs `prisma migrate reset --force` followed by seed against the staging database to reset it to a clean known state with test data.
  5. Host nginx routes `staging.domain` to the staging stack's internal port.
  6. Developer opens `staging.domain` in the browser and tests against real infrastructure with test data.
- **Outcome:** Staging environment reflects latest `staging` branch code with a fresh database seeded with test data.
- **Alternatives / Abort Paths:** Build or push failure: workflow fails; staging environment unchanged. DB reset failure: operator inspects logs.

### UC 1b: Deploy to Production
- **Primary Actor:** DevOps / operator.
- **Trigger:** Push (or merge) to `main` branch.
- **Preconditions:** GitHub Actions secrets configured for production (DATABASE_URL, JWT_SECRET, Strava credentials, SSH key); server has Docker, docker compose and host nginx; production docker-compose and Dockerfiles exist.
- **Flow (numbered, precise):**
  1. Operator merges or pushes to `main`.
  2. GitHub Actions (deploy-production.yml) builds backend and frontend images (production-tagged), pushes to ghcr.io.
  3. Workflow SSHs to Scaleway server, runs docker compose pull and docker compose up -d for the production stack.
  4. Workflow runs `prisma migrate deploy` against the production database (schema changes only, no data loss).
  5. Host nginx routes `domain` to the production stack's internal port.
- **Outcome:** Production environment reflects latest `main` code; existing data is preserved.
- **Alternatives / Abort Paths:** Build or push failure: workflow fails; production environment unchanged. Migration failure: backend fails to start; operator inspects logs and resolves schema issue.

### UC 2: Switch database to managed MySQL (Scaleway Managed MySQL)
- **Primary Actor:** DevOps / operator.
- **Trigger:** Decision to use Scaleway Managed MySQL instead of the MySQL container.
- **Preconditions:** Managed MySQL instance exists; connection string (DATABASE_URL) is available.
- **Flow (numbered, precise):**
  1. Operator sets DATABASE_URL in server .env to the managed MySQL connection string.
  2. Operator removes or disables the mysql service from docker-compose (or uses a compose override/profile) so that only backend and frontend run.
  3. Operator runs migrations (as required by project rules) and restarts backend (e.g. via docker compose up -d).
  4. Backend connects to managed MySQL; no code or Dockerfile change required.
- **Outcome:** Same application; only configuration and compose topology change.
- **Alternatives / Abort Paths:** Wrong DATABASE_URL: backend fails to start; operator corrects .env and restarts.

### UC 3: Build and run stack locally via Docker (optional verification)
- **Primary Actor:** Developer / operator.
- **Trigger:** Verify that the same images and compose used in deploy work locally.
- **Preconditions:** Docker and docker compose available; .env (or .env.example) filled for local use.
- **Flow (numbered, precise):**
  1. Operator sets .env (e.g. DATABASE_URL for local MySQL, JWT_SECRET, etc.).
  2. Operator runs docker compose up (or equivalent) at repo root.
  3. MySQL, backend, and frontend start; frontend is reachable (e.g. port 80) and proxies API to backend.
- **Outcome:** Stack runs for smoke-testing; not required for day-to-day local development (which stays npm-based).
- **Alternatives / Abort Paths:** Port conflict or missing env: operator adjusts .env or host ports.

## 4. Functional Requirements (MUST/SHOULD/MAY)

| ID | Requirement (clear, atomic) | Priority (MUST/SHOULD/MAY) | Rationale / Value | Notes |
|----|-----------------------------|----------------------------|-------------------|--------|
| FR-1 | A Dockerfile MUST exist for the backend that produces a production build (e.g. nest build and run via node dist/main). | MUST | Reproducible backend image for staging/production. | |
| FR-2 | A Dockerfile MUST exist for the frontend using a multi-stage build: build Angular static assets, then serve them with nginx. | MUST | Production frontend image without dev server. | |
| FR-3 | Two docker-compose files MUST exist (one for staging, one for production), each defining at least: mysql (MySQL 8.0), backend (NestJS), frontend (Angular + nginx). Services MUST communicate over an internal Docker network. | MUST | Isolated stacks per environment on the same server. | |
| FR-4 | The frontend service MUST act as reverse proxy so that API requests (e.g. /api) are forwarded to the backend. Each stack exposes only an internal host port (not 80/443 directly); a host-level nginx on the server routes subdomains to the correct stack. | MUST | Single entry point per environment; security and simplicity. | |
| FR-5 | The stack MUST be configurable so that MySQL can be removed from the compose and the backend connected to an external database by setting DATABASE_URL only (no code change). | MUST | Future switch to Scaleway Managed MySQL. | |
| FR-6 | Two GitHub Actions workflows MUST exist: `deploy-staging.yml` (triggered by push to `staging` branch) and `deploy-production.yml` (triggered by push to `main` branch). Both MUST build backend and frontend images and push them to GitHub Container Registry (ghcr.io). | MUST | Automated image publishing per environment. | |
| FR-7 | Both workflows MUST connect to the Scaleway server via SSH and run the equivalent of docker compose pull and docker compose up -d for their respective stack. | MUST | Automated deploy. | |
| FR-8 | The staging deploy workflow MUST run `prisma migrate reset --force` followed by the database seed after deploying, to reset the staging DB to a clean state with test data. | MUST | Staging always starts from a known, reproducible data state. | |
| FR-9 | The production deploy workflow MUST run `prisma migrate deploy` (non-destructive, schema changes only) after deploying. No data reset or seed is performed in production. | MUST | Safe production migrations without data loss. | |
| FR-10 | Secrets (DATABASE_URL per environment, JWT_SECRET, Strava API credentials, SSH key for server access) MUST be supplied via GitHub Actions secrets (or equivalent); no secrets MUST be stored in the repository. | MUST | Security and project rules. | |
| FR-11 | An .env.example file MUST exist per environment, listing all environment variables required on the server (and for image builds where applicable), with short descriptions. | MUST | Operator and developer reference. | |
| FR-12 | A host-level nginx configuration MUST be documented that routes `staging.domain` to the staging stack and `domain` to the production stack. | MUST | Subdomain-based environment separation. | |
| FR-13 | The way the Angular app obtains the backend API base URL at build time (and how it relates to runtime proxy) MUST be documented (e.g. in README or .docs). | MUST | Correct staging/production builds. | |
| FR-14 | The existing `.github/workflows/system-tests.yml` MUST NOT be modified by this ticket. | MUST | No regression in existing CI. | |
| FR-15 | Backend and frontend images SHOULD use pinned or explicit base image versions for reproducibility. | SHOULD | Reproducible builds. | |

**Backend testing (if backend is in scope):** This ticket does not introduce new backend application logic; it adds containerization and deploy. Therefore, no new backend unit or integration tests for domain logic are required. Verification is covered by: (1) images building successfully, (2) compose bringing the stack up, (3) existing system-tests (or other existing tests) still passing. Acceptance criteria reflect these checks.

## 5. Data & Interfaces (conceptual)
- **Data objects (terms + meaning, no final fields):**
  - **Environment configuration:** DATABASE_URL, JWT_SECRET, Strava API client ID/secret (and any callback URL or similar), and any other backend/frontend env vars needed at runtime or build time. Documented in .env.example.
  - **Build-time vs runtime:** Frontend may need an API base URL or proxy path at build time (e.g. for environment injection); at runtime, nginx proxies to backend. The relationship (same-origin vs absolute URL) must be documented.
- **Inputs / Outputs (high-level):**
  - **Staging deploy pipeline input:** Push to `staging` branch, GitHub secrets (DATABASE_URL_STAGING, JWT_SECRET, Strava credentials, SSH key). Output: staging-tagged images in ghcr.io; running staging containers on the server; DB reset and seeded.
  - **Production deploy pipeline input:** Push/merge to `main` branch, GitHub secrets (DATABASE_URL, JWT_SECRET, Strava credentials, SSH key). Output: production-tagged images in ghcr.io; running production containers on the server; migrations applied.
  - **Server .env per environment:** Variables listed in respective .env.example; operator provides values on the server.
- **External systems / integrations:** GitHub (repo, Actions, ghcr.io); Scaleway VPS (SSH, host nginx); optionally Scaleway Managed MySQL (via DATABASE_URL only).
- **Authorization / AuthN/AuthZ:** GitHub Actions uses repository secrets; SSH key restricts who can deploy; application auth unchanged (JWT, etc.).
- **Server topology:**
  - Host nginx routes `staging.domain` → staging stack internal port; `domain` → production stack internal port.
  - Staging stack: mysql-staging, backend-staging, frontend-staging (own Docker network, own DB).
  - Production stack: mysql-prod, backend-prod, frontend-prod (own Docker network, own DB).

## 6. States, Validations & Error Cases

### 6.1 States / Modes
- **Relevant states / flags:** Stack with mysql vs without mysql (backend only needs DATABASE_URL). Deployment: success vs failure (build fail, push fail, SSH fail, compose fail).
- **Transitions:** Add/remove mysql service in compose; change DATABASE_URL; re-run deploy.

### 6.2 Validations
| Field/Topic | Rule | Error Reaction | Visible Where (UI/API) | Condition |
|-------------|------|----------------|------------------------|-----------|
| DATABASE_URL | Must be a valid connection string for MySQL. | Backend fails to start or migrate. | Server logs / deploy failure | Startup. |
| Required env vars | All required variables must be set on server. | Backend or frontend may fail to start. | Server logs / deploy failure | Startup. |
| SSH / server | Server must be reachable and allow SSH with provided key. | Workflow fails at SSH step. | GitHub Actions log | Deploy. |

### 6.3 Error Cases / Edge Cases
| Case | Trigger | Expected System Behavior | User Feedback | Category |
|------|---------|---------------------------|---------------|----------|
| Missing secret in GitHub | Deploy runs but a required secret is not set. | Workflow fails at step that uses the secret. | Red workflow run; log shows missing var or auth error. | Config. |
| Wrong DATABASE_URL on server | Backend starts with invalid or unreachable DB. | Backend process exits or health check fails. | Container exits; operator checks logs. | Config. |
| Image build failure | Dockerfile or build context error. | Build step fails; no push. | Red workflow run. | Build. |
| Compose up failure on server | Missing .env or port conflict. | docker compose up -d fails. | SSH step fails; operator checks server. | Deploy. |
| Frontend wrong API URL at build | Build-time API base URL points to wrong host. | API calls from browser may 404 or go to wrong backend. | Documented so build uses correct env (e.g. relative /api). | Build config. |

## 7. Non-Functional Requirements
- **Security:** Secrets only in environment and GitHub secrets; no credentials in repo or in image layers. SSH key with minimal required access. Backend not exposed directly to the internet when frontend proxies.
- **Privacy / Compliance:** No change to data handling; deployment must not log secrets or PII.
- **Performance / Scalability:** Images should be built with production in mind (e.g. minimal layers, no dev deps in final image). Compose is single-host; scaling is out of scope.
- **Logging / Auditing:** Deploy workflow logs success/failure; no secret values in logs. Application logging unchanged.
- **Usability / Accessibility:** N/A for infra ticket.
- **Operability:** One-command deploy (pipeline + compose up). Documented .env and trigger branch; migrations run as part of deploy or documented manual step.

## 8. Acceptance Criteria (testable)
- AC-1: Given the repo with new Dockerfiles, when building backend and frontend images (e.g. docker build) with documented build args/env if any, then both images build successfully.
- AC-2: Given the built images and a valid staging .env, when running the staging docker compose up -d, then mysql-staging, backend-staging, and frontend-staging start; frontend is reachable on the configured staging host port and API requests to /api are proxied to the backend and succeed.
- AC-3: Given the built images and a valid production .env, when running the production docker compose up -d, then mysql-prod, backend-prod, and frontend-prod start; frontend is reachable on the configured production host port and API requests to /api are proxied to the backend and succeed.
- AC-4: Given DATABASE_URL in .env pointing to an external MySQL and the mysql service removed (or not started), when starting only backend and frontend with docker compose, then the backend connects to the external database and the app works as in AC-2/AC-3.
- AC-5: Given a push to the `staging` branch with secrets configured, when the deploy-staging.yml workflow runs, then it builds and pushes images, deploys the staging stack via SSH, runs prisma migrate reset --force and seed, and completes without error; the staging DB contains only seeded test data.
- AC-6: Given a push to `main` with secrets configured, when the deploy-production.yml workflow runs, then it builds and pushes images, deploys the production stack via SSH, runs prisma migrate deploy (no data reset), and completes without error; existing production data is preserved.
- AC-7: Given the host nginx configuration documentation, when an operator configures nginx on the Scaleway server, then `staging.domain` resolves to the staging stack and `domain` resolves to the production stack.
- AC-8: Given the repository, when opening the .env.example files for staging and production, then every variable needed on the server (and for builds where applicable) is listed with a short description.
- AC-9: Given the documentation, when a reader looks for how the Angular app gets the backend API URL at build time and how runtime proxy works, then this is clearly described (e.g. in README or .docs).
- AC-10: Given the repo, when the existing system-tests workflow runs, then it still runs and passes unchanged (no modification to system-tests.yml in this ticket).

## 9. Dependencies, Risks, Impact
- **Dependencies:** Existing monorepo layout (apps/backend, apps/frontend), Prisma schema and migrations, existing system-tests.yml; Scaleway VPS with Docker; GitHub org/repo with Actions and ghcr.io enabled.
- **Risks / open technical uncertainties:** Angular build may require backend URL at build time—documentation and .env.example must make this explicit so staging/production builds use correct values (e.g. relative /api).
- **Impact on existing functionality:** None on application behaviour. Local development remains npm-based. New artifacts: Dockerfiles, root docker-compose, deploy workflow, .env.example; existing misc/mysql/docker-compose can remain as reference or be superseded by root compose.

## 10. Open Points (UNRESOLVED)
- [x] **Trigger branch:** `staging` branch → staging deploy; `main` branch → production deploy. ✓ Resolved.
- [x] **Migrations in deploy:** Staging: `prisma migrate reset --force` + seed (run as workflow step after compose up). Production: `prisma migrate deploy` (run as workflow step after compose up, non-destructive). ✓ Resolved.
- [x] **Subdomain routing:** `staging.domain` → staging stack; `domain` → production stack via host-level nginx on the Scaleway server. ✓ Resolved.

QUALITY GATE (before finishing):
- Requirements are atomic, unambiguous, testable.
- No implementation details (no code snippets, no final Dockerfile or compose YAML, no exact env key names beyond what’s needed for clarity).
- Ambiguities captured as UNRESOLVED with concrete questions.
- Scope and Out-of-Scope clearly separated.
