# Zapatismo – Project Rules (Global Rule-Set)

This document defines **global rules and conventions** for the Zapatismo project. Use it as the single reference for coding standards, workflow, and governance. It complements [setup-architecture.md](./setup-architecture.md), which describes the technical architecture.

---

## Table of Contents

1. [General Principles](#1-general-principles)
2. [Repository & Version Control](#2-repository--version-control)
3. [Database & Migrations](#3-database--migrations)
4. [Backend (NestJS)](#4-backend-nestjs)
5. [Frontend (Angular)](#5-frontend-angular)
6. [API Contract (OpenAPI)](#6-api-contract-openapi)
7. [Docker & Local Environment](#7-docker--local-environment)
8. [Documentation](#8-documentation)
9. [Security & Configuration](#9-security--configuration)

---

## 1. General Principles

- **Simplicity first.** Prefer boring, well-understood solutions over novel ones.
- **Explicit over implicit.** No "magic"; behavior should be traceable from code and docs.
- **Repository is source of truth.** Architecture decisions, migrations, and API contract live in the repo and are version-controlled.
- **Stateless backend.** No in-memory session or application state; persistence lives in the database only.
- **No manual production changes.** Schema, config, and deployment steps must be automated and reproducible (CI/CD, migrations, env vars).

---

## 2. Repository & Version Control

- Use the **monorepo** structure: `apps/backend`, `apps/frontend`, `packages/`, `prisma/`, `.docs/system/`.
- **Commit small, logical units.** One concern per commit where possible.
- **No committed secrets.** Use environment variables and `.env` (with `.env` in `.gitignore`). Provide `.env.development` for required keys.
- **Branch strategy:** `development` is the main branch for development. All new work—features, bug fixes, refactors, etc.—must be done in a dedicated branch (e.g. `feature/...`, `bugfix/...`, `hotfix/...`). **Creating a Pull Request (PR) into `development` is mandatory** before any such work is merged.
- **Documentation** that affects the whole project lives under `.docs/system/` and is updated when behavior or architecture changes.

---

## 3. Database & Migrations

- **All schema changes go through Prisma Migrate.** No manual SQL on production; no ad-hoc schema edits in DB tools.
- **Migrations must be part of CI/CD.** Apply migrations in the deployment pipeline or as a dedicated step; never rely on "someone running SQL manually on prod."
- **Every schema change is versioned.** Edit `prisma/schema.prisma`, then run `npx prisma migrate dev --name <short_description>` and commit the generated migration files.
- **No manual edits to existing migration files** after they have been applied (or shared). Fix forward with new migrations.
- **Reproducibility:** A fresh database must be reproducible by running migrations from the repo (no hidden manual steps).
- **Naming:** Use clear, consistent names for tables and columns (e.g. `snake_case` if that's the project convention; align with Prisma defaults).
- **Test migrations:** Data-only migrations in `prisma/test-migrations/` are for local and CI/stage only; they must never alter schema and must never run in production. See [backend.md](./backend.md#test-migrations-devstage-only).

---

## 4. Backend (NestJS)

- **Stateless only.** No in-memory caches or session stores that are required for correctness; use the database.
- **Explicit module boundaries.** Group by feature/domain; avoid circular dependencies.
- **DTOs for all public API.** Request/response shapes are explicit DTOs; do not expose Prisma models or internal entities directly.
- **Validation at the boundary.** Validate and sanitize input in controllers or dedicated pipes; fail fast with clear error responses.
- **Errors:** Use consistent HTTP status codes and error response format; avoid leaking stack traces or internal details in production.
- **OpenAPI:** Keep Swagger/OpenAPI in sync with the API. Regenerate spec when DTOs or routes change.
- **No business logic in controllers.** Controllers orchestrate; domain logic lives in services or domain modules.
- **TypeScript strict mode.** No `any` without a justified exception; prefer strict null checks.

---

## 5. Frontend (Angular)

- **No business logic duplication.** Critical rules and calculations live in the backend; the frontend consumes the API.
- **Communicate only via the REST API.** No direct DB or backend-internal access; use typed clients generated from OpenAPI where possible.
- **UI and UX logic only.** State management, presentation, and user interaction stay in the frontend; domain rules stay in the backend.
- **Styling: Tailwind CSS with daisyUI.** Use Tailwind for utilities and layout; use daisyUI for components and theming. No custom design system unless justified.
- **Consistent structure.** Follow Angular style guide (modules/components, lazy loading where it helps); keep the project navigable.
- **Accessibility and performance.** Consider a11y and performance in components and routing; avoid unnecessary re-renders and large bundles.

---

## 6. API Contract (OpenAPI)

- **API is the contract.** Frontend and backend agree on the OpenAPI spec; no undocumented or informal endpoints for production use.
- **OpenAPI spec is version-controlled** and generated from the backend (e.g. NestJS Swagger). Regenerate and commit when the API changes.
- **No leaking of persistence details.** Response shapes are DTOs, not raw DB column names or internal IDs unless they are part of the public contract.
- **Stability:** Avoid breaking changes to existing endpoints; prefer new versions or additive changes. Document deprecations.

---

## 7. Docker & Local Environment

- **One-command startup.** A single command (e.g. `docker compose up` or project script) should start MySQL, run migrations, and start backend and frontend so that the app runs locally without manual DB setup.
- **No "works on my machine."** Dependencies and runtime are containerized; document any host requirements (e.g. Docker, Node version for tooling).
- **Environment-based configuration.** Use environment variables for URLs, DB credentials, feature flags; no hardcoded production values.
- **Images:** Prefer official or well-maintained base images; pin versions for reproducibility.

---

## 8. Documentation

- **Architecture and setup:** [setup-architecture.md](./setup-architecture.md) is the reference for stack, layers, and workflows. Update it when the architecture changes.
- **Project rules:** This file is the global rule-set. Update it when conventions or governance change.
- **Code-level docs:** Document non-obvious behavior, domain rules, and public APIs (e.g. JSDoc/TSDoc for exported APIs). Prefer clear names over excessive comments.
- **README:** Keep root `README.md` minimal but sufficient to clone, install, and run the app (and point to `.docs/system/` for details).

---

## 9. Security & Configuration

- **Secrets in environment only.** No API keys, passwords, or tokens in code or in committed config files.
- **Sensitive data:** Do not log request/response bodies that may contain PII or credentials; redact where necessary.
- **Dependencies:** Keep frameworks and libraries up to date; address known vulnerabilities in a timely manner.
- **Production vs. local:** Strict separation: production config and secrets are never committed; local defaults are safe and documented in `.env.development`.

---

## Quick Reference

| Area            | Rule in short |
|-----------------|---------------|
| **Migrations**  | Prisma Migrate only; migrations in CI/CD; no manual SQL on prod. |
| **Backend**     | Stateless; DTOs; validation at boundary; OpenAPI in sync. |
| **Frontend**    | API only; no business logic duplication; typed API usage; Tailwind + daisyUI for styling. |
| **API**         | OpenAPI is the contract; version-controlled; no persistence leakage. |
| **Repo**        | Monorepo; no secrets in repo; docs in `.docs/system/`. |
| **Docker**      | One-command local run; env-based config; reproducible. |

---

*When in doubt, prefer the option that is simpler, explicit, and consistent with [setup-architecture.md](./setup-architecture.md) and this rule-set.*
