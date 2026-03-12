# Implementation Plan – docker-1 – Docker Setup for Staging & Production

## 0. Scope Check
- Requirement sheet present and reviewed: ✅
- Fits Zapatismo architecture constraints: ✅
- In-Scope summary (bullets):
  - Dockerfiles for backend and frontend (production builds; frontend multi-stage with nginx).
  - Two docker-compose files (staging, production): mysql, backend, frontend; internal network; frontend as reverse proxy to backend; only internal host ports exposed.
  - Host-level nginx documentation for routing staging.domain and domain to the stacks.
  - Two GitHub Actions workflows: deploy-staging (push to `staging`), deploy-production (push to `main`); build images, push to ghcr.io, SSH deploy; staging runs DB reset+seed, production runs migrate deploy only.
  - .env.example per environment; documented Angular API URL handling at build time.
- Out-of-Scope summary (bullets):
  - Docker for local development; local remains npm/Node-based.
  - Changes to `.github/workflows/system-tests.yml`.
  - TLS/HTTPS or Traefik/Caddy in this ticket.
  - Managed MySQL provisioning or data migration; only DATABASE_URL contract and ability to remove mysql from compose.
  - Any application business logic, API contract, or schema change.
- Key assumptions (only if explicitly stated in requirements):
  - Node.js v22; Scaleway VPS runs Docker and docker compose; local dev does not use this Docker setup.
- UNRESOLVED items blocking implementation (if any): None.

## 1. Architecture Mapping (High-Level)
| Layer | Responsibility for this ticket | Notes |
|-------|-------------------------------|-------|
| Angular (apps/frontend) | No new features. Build produces static assets; runtime uses existing `environment.apiUrl` (/api). Documentation of build-time API URL and runtime proxy. | No code change to app logic; possible addition of production build config if different apiUrl ever needed (requirement: document current behaviour). |
| Backend (apps/backend, NestJS) | No new endpoints or logic. Wrapped in a production Docker image (build + run via node dist/main); image includes Prisma for migrate/seed executed by workflows. | Stateless; env-based config unchanged. |
| Database (MySQL via Prisma) | No schema changes. MySQL as a service in each compose; DATABASE_URL points to compose MySQL or external (managed) DB. Migrations applied by workflow/exec, not by schema edits. | |
| OpenAPI contract | No change. | |
| Docker/Compose | Add backend and frontend Dockerfiles; add docker-compose.staging.yml and docker-compose.production.yml at repo root; internal network; frontend proxies /api to backend. | |
| iOS (apps/app-ios) | Not in scope. | N/A |

## 2. Work Breakdown Structure (WBS)
- **WP-1:** Backend Dockerfile
  - Goal: Production image for NestJS: install deps, copy prisma, generate client, build, run node dist/main.
  - Affected area(s): docker (new file)
  - Depends on: —
  - Deliverables: `apps/backend/Dockerfile` (or root-level with context); pinned base image (e.g. node:22-alpine); no secrets in image.

- **WP-2:** Frontend Dockerfile
  - Goal: Multi-stage build: stage 1 build Angular static assets (ng build); stage 2 serve with nginx, proxy /api to backend.
  - Affected area(s): docker (new file), frontend (nginx config asset)
  - Depends on: —
  - Deliverables: `apps/frontend/Dockerfile` (or root-level with context); nginx config that proxies /api to backend service; pinned base images.

- **WP-3:** Docker Compose – Staging
  - Goal: One compose file for staging: mysql, backend, frontend; internal network; frontend reverse proxy; only internal host port(s) exposed for host nginx.
  - Affected area(s): docker
  - Depends on: WP-1, WP-2
  - Deliverables: `docker-compose.staging.yml` (or equivalent name) at repo root; .env consumed from server.

- **WP-4:** Docker Compose – Production
  - Goal: Same structure as staging but production-oriented (different project name/ports if needed); mysql optional via DATABASE_URL.
  - Affected area(s): docker
  - Depends on: WP-1, WP-2
  - Deliverables: `docker-compose.production.yml` at repo root; documented way to remove mysql and use external DB.

- **WP-5:** GitHub Actions – Deploy Staging
  - Goal: On push to `staging`: build backend and frontend images (staging tags), push to ghcr.io; SSH to Scaleway; docker compose pull + up -d for staging stack; run prisma migrate reset --force and seed via container/exec.
  - Affected area(s): docker, CI/CD
  - Depends on: WP-3
  - Deliverables: `.github/workflows/deploy-staging.yml`; secrets used for registry and SSH and env (no secrets in repo).

- **WP-6:** GitHub Actions – Deploy Production
  - Goal: On push to `main`: build backend and frontend images (production tags), push to ghcr.io; SSH to Scaleway; docker compose pull + up -d for production stack; run prisma migrate deploy only.
  - Affected area(s): docker, CI/CD
  - Depends on: WP-4
  - Deliverables: `.github/workflows/deploy-production.yml`.

- **WP-7:** Environment and documentation
  - Goal: .env.example for staging and production listing all server (and build) variables; host nginx doc; Angular API URL (build-time and runtime proxy) doc.
  - Affected area(s): docs, repo root
  - Depends on: —
  - Deliverables: `.env.example.staging`, `.env.example.production` (or single file with sections); `.docs/system/` or README update for nginx and API URL.

## 3. Backend Plan (NestJS)
### 3.1 Modules / Components to touch
- **Module(s):** None (no new modules).
- **Controller(s):** None.
- **Service(s):** None.
- **Repository/Prisma access layer:** None.

Backend is containerized as-is; no application code changes. Image build and runtime use existing env (DATABASE_URL, JWT_SECRET, Strava vars, etc.).

### 3.2 REST Endpoints
| HTTP | Path | Purpose | Request DTO | Response DTO | AuthN/AuthZ | Errors |
|------|------|---------|--------------|--------------|-------------|--------|
| — | — | No new endpoints. | — | — | — | — |

### 3.3 Validation & Error Handling
- **Input validation approach:** Unchanged.
- **Domain validation approach:** Unchanged.
- **Error mapping:** Unchanged.
- **Logging/Auditing considerations:** Ensure no secrets in image or logs; existing backend logging remains.

## 4. Data / Prisma Plan
### 4.1 Prisma schema changes
- **Models to add/modify:** None.
- **Relations/indices constraints:** None.
- **Backfill / defaults:** None.

### 4.2 Migration steps
- **Migration name suggestion:** N/A (no schema change).
- **Steps to generate/apply migration:** Not applicable. Deploy workflows run existing migrations: staging runs `prisma migrate reset --force` then seed; production runs `prisma migrate deploy`. These are executed via SSH (e.g. `docker compose exec backend npx prisma migrate deploy` or equivalent) after stack is up. Backend image must include Prisma CLI and `prisma/migrations` (and seed script) so that these commands run inside the backend container or a one-off container with same env.
- **Seed/test data impact:** Seed is run in staging deploy only; production never runs seed. Seed script remains `prisma/seed.ts`; backend image build context must allow copying `prisma/` from repo root.

## 5. OpenAPI / Contract Plan
- **How the OpenAPI spec changes:** No change.
- **Regeneration steps:** N/A.
- **Client impact:** None.

## 6. Frontend Plan (Angular)
### 6.1 UX / Screens / Routes
- **Screens affected:** None.
- **Routes affected:** None.
- **Components to add/modify:** None. Optional: ensure production build uses correct `environment.apiUrl` (currently `/api` in both prod and dev; when served behind nginx proxying /api, no change needed). If build-time injection is ever added later, document it; for this ticket, document current behaviour.

### 6.2 Data flow
- **Services / API client usage:** Unchanged; all use `environment.apiUrl` (/api).
- **State management approach:** Unchanged.
- **Error display patterns:** Unchanged.

### 6.3 Frontend validations
| Validation | Location (Frontend/Backend) | Rationale |
|------------|-----------------------------|------------|
| N/A for this ticket | — | No new inputs or flows. |

## 7. iOS App Plan (ONLY if required)
- Not required for this ticket.

## 8. Testing Plan
- **Backend tests (required when backend is in scope):**
  - This ticket does not add new application logic. **No new backend unit or integration tests** for domain behaviour. Verification is: (1) backend and frontend images build successfully; (2) staging and production compose stacks start and frontend proxies /api to backend; (3) existing `.github/workflows/system-tests.yml` is **not modified** and continues to run and pass (AC-10).
  - **Unit:** No new unit tests (reason: infra/containerization only).
  - **Integration (DB):** No new integration tests (reason: same as above).
- **Frontend tests:** No new frontend tests (reason: no UI or logic changes).
- **E2E (Cypress):** Unchanged; system-tests workflow runs existing E2E.
- **Contract tests / OpenAPI:** None for this ticket.
- **Verification mapped to AC:** AC-1 (image build), AC-2/AC-3 (compose up + proxy), AC-4 (external DB), AC-5/AC-6 (workflows), AC-7 (nginx doc), AC-8 (.env.example), AC-9 (API URL doc), AC-10 (system-tests unchanged).

## 9. Acceptance Criteria Traceability
| AC ID | Implementation touchpoints | Test(s) / Verification |
|-------|----------------------------|-------------------------|
| AC-1 | WP-1, WP-2: Dockerfiles; build with documented args/env | Manual or CI: `docker build` for backend and frontend |
| AC-2 | WP-3: staging compose; WP-1, WP-2: images | Run staging compose with valid .env; curl frontend port and /api |
| AC-3 | WP-4: production compose; WP-1, WP-2 | Run production compose with valid .env; same checks |
| AC-4 | WP-3/WP-4: compose without mysql service; DATABASE_URL to external DB | Remove mysql from compose, set DATABASE_URL, compose up backend+frontend only |
| AC-5 | WP-5: deploy-staging.yml; build, push, SSH, compose up, reset+seed | Push to staging branch; workflow succeeds; staging DB seeded |
| AC-6 | WP-6: deploy-production.yml; build, push, SSH, compose up, migrate deploy | Push to main; workflow succeeds; prod data preserved |
| AC-7 | WP-7: nginx documentation | Operator follows doc to route staging.domain and domain |
| AC-8 | WP-7: .env.example per environment | Open .env.example.staging and .env.example.production; all vars listed with descriptions |
| AC-9 | WP-7: API URL documentation | Reader finds build-time vs runtime proxy explanation in .docs or README |
| AC-10 | No change to system-tests.yml | system-tests.yml unchanged; workflow still runs and passes |

## 10. Execution Sequence
1. **Documentation and env examples (WP-7 partial):** Add .env.example.staging and .env.example.production (or equivalent) and document host nginx + Angular API URL (build-time and runtime). Enables consistent env and deploy docs early.
2. **Backend Dockerfile (WP-1):** Create Dockerfile for backend; build context = repo root; copy prisma + apps/backend; install deps, prisma generate, nest build; CMD run node dist/main. Use pinned base (e.g. node:22-alpine).
3. **Frontend Dockerfile (WP-2):** Multi-stage: build stage (node, ng build production); run stage (nginx); add nginx config that proxies /api to backend host. Pin base images.
4. **Docker Compose staging (WP-3):** Create docker-compose.staging.yml at root: services mysql, backend, frontend; internal network; frontend depends on backend; expose only host port(s) for frontend (e.g. 30080:80) for host nginx. Backend needs DATABASE_URL pointing to mysql service.
5. **Docker Compose production (WP-4):** Create docker-compose.production.yml; same structure; document removal of mysql and use of external DATABASE_URL.
6. **Deploy workflow staging (WP-5):** Add deploy-staging.yml: trigger push to staging; build backend and frontend images; push to ghcr.io; SSH to server; in staging directory run docker compose pull and up -d; run prisma migrate reset --force and seed (e.g. via docker compose exec backend) using backend image that has prisma and migrations.
7. **Deploy workflow production (WP-6):** Add deploy-production.yml: trigger push to main; build and push images; SSH; production compose up; run prisma migrate deploy only.
8. **Verification:** Build both images locally; run staging and production compose with .env; verify /api proxy; run system-tests workflow (no edits) and confirm it still passes.

## 11. Risks & Open Points (UNRESOLVED)
- None. Requirement sheet open points are resolved. If Angular later needs a build-time API base URL (e.g. absolute URL), WP-7 documentation should state current behaviour (relative /api) and where to add build args if needed.

---

QUALITY GATE (before finishing):
- Every FR and AC from the requirement sheet is mapped to concrete work. ✅
- No architectural drift beyond setup-architecture.md. ✅
- No implementation details/code. ✅
- All uncertainties captured as UNRESOLVED with precise questions. ✅ (None.)
