# Zapatismo – System Architecture & Tech Stack

## Table of Contents

1. [Purpose of this Document](#1-purpose-of-this-document)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Technology Stack](#3-technology-stack)
4. [System Design Principles](#4-system-design-principles)
5. [Data Architecture](#5-data-architecture)
6. [Repository Structure (Monorepo)](#6-repository-structure-monorepo)
7. [Development Workflow](#7-development-workflow)
8. [Hosting Strategy](#8-hosting-strategy-initial-direction)
9. [Non-Goals (Intentional Constraints)](#9-non-goals-intentional-constraints)
10. [Architectural Summary](#10-architectural-summary)
11. [Suggested Next Steps](#11-suggested-next-steps)

---

## 1. Purpose of this Document

This document defines the technical architecture, technology stack, and structural conventions of the **Zapatismo** system.

It serves as:

- **Architectural reference** for the codebase
- **Implementation boundary definition** between frontend, backend, and database
- **Governance document** for future architectural changes
- **Single source of truth** within the repository

The system is intentionally **simple**, **explicit**, and **reproducible**.

---

## 2. High-Level Architecture

Zapatismo follows a classic **3-tier architecture**, with the **Strava API** as the data source for workout data (workouts are synced from Strava instead of a native iOS app):

```
┌─────────────────────────┐
│   Angular Frontend      │
│   (Web UI)              │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│ NestJS Backend           │────▶│   Strava API            │
│ (REST API; syncs        │     │   (workout data source) │
│  workouts from Strava)  │     └─────────────────────────┘
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│   MySQL Database        │
└─────────────────────────┘
```

**Supporting tooling:**

| Component        | Role                                      |
|------------------|-------------------------------------------|
| **Prisma Migrate** | Schema evolution and versioned migrations |
| **OpenAPI**        | API contract definition and documentation |
| **Docker**         | Local (and production) containerization   |

Backend, frontend, and database run in Docker for local development. Workout data is obtained via the Strava API (OAuth and API credentials configured in the backend environment).

---

## 3. Technology Stack

### 3.1 Database

**MySQL**

**Rationale:**

- Mature and proven relational database
- Strong Docker support
- Well-understood operational behavior
- Excellent compatibility with Prisma

**Role in system:**

- Stores all persistent domain data
- Stores normalized training sessions
- Stores shoe entities and derived metrics
- Stores import metadata and audit information

---

### 3.2 Migration Management

**Prisma Migrate**

**Purpose:**

- Schema evolution
- Reproducible database state
- Version-controlled migrations

**Principles:**

- No manual schema changes in production
- Every schema change is versioned
- Migrations are committed to the repository
- Database state is reproducible from scratch

---

### 3.3 Backend

**NestJS (TypeScript)**

| Aspect              | Choice                    |
|---------------------|---------------------------|
| Runtime             | Node.js                   |
| Framework           | NestJS                    |
| ORM / DB layer      | Prisma                    |
| API documentation   | OpenAPI (Swagger)         |

**Architectural principles:**

- Stateless REST API
- No in-memory state as source of truth
- No server-side session storage
- All persistent state in MySQL
- Explicit module boundaries

**Responsibilities:**

The backend is responsible for:

- CRUD operations for domain entities
- Importing and normalizing workout data from the Strava API
- Computing derived metrics (e.g., mileage per shoe)
- Providing OpenAPI-documented REST endpoints
- Input validation and error handling
- Domain-level decision logic

---

### 3.4 Frontend

**Angular**

**Purpose:**

- User interface layer
- Data visualization
- Filtering and analysis views

**Principles:**

- No business logic duplication
- UI-focused logic only
- Communicates exclusively via REST API
- Typed API integration based on OpenAPI (e.g., generated clients)

**Styling: Tailwind CSS with daisyUI**

- **Tailwind CSS** for utility-first CSS and layout.
- **daisyUI** as the component/theme layer on top of Tailwind (buttons, cards, modals, themes, etc.).

This keeps the UI minimal and consistent without custom design system work in early phases.

---

### 3.5 Strava API (Workout Data Source)

**Workout data is synced via the Strava API.**

The backend (or a dedicated sync process) uses the Strava API to fetch running and walking activities. Users connect their Strava account (e.g. OAuth); the backend then imports and normalizes activities into the local database.

**Purpose:**

- Obtain workout data (running/walking activities) from Strava instead of a native iOS app
- Keep a single, server-side integration point for workout data
- Support idempotent import (e.g. by Strava activity ID) so re-syncs do not create duplicates

**Principles:**

- **Backend-only integration:** All Strava API calls and normalization happen in the backend. The frontend does not talk to Strava directly.
- **API contract:** Workout import/sync endpoints are documented in OpenAPI; any client (e.g. future admin UI for triggering sync) uses the same contract.
- **Idempotent usage:** Import logic must handle re-syncs and duplicate fetches (e.g. by external ID) without creating duplicate workouts.

**Responsibilities:**

- OAuth (or token-based) connection to Strava for authenticated users
- Fetch activities from Strava API (running/walking), map to internal workout model
- Store credentials or tokens securely (environment or per-user tokens); never expose Strava secrets to the frontend

Detailed design notes and constraints are documented in [research-strava-api.md](./research-strava-api.md).

---

### 3.6 Containerization

**Docker**

Backend and frontend run in containers:

- **MySQL** – database server
- **Backend** – NestJS API
- **Frontend** – Angular app (build + serve or static)
- **Optional** – dedicated Prisma migration container

No native mobile app is required; workout data comes from the Strava API.

**Goals:**

- Identical local and production behavior for backend and frontend
- One-command startup for DB + backend + frontend
- No "works on my machine" situations for the containerized stack

---

## 4. System Design Principles

### 4.1 Stateless Backend

The backend **must** be stateless.

This means:

- No in-memory user session storage
- No reliance on local filesystem for persistent data
- All state in the database
- Horizontal scalability possible without redesign

**If background jobs are introduced later:**

- They must be idempotent
- They must not rely on in-memory state
- Prefer queue-based or scheduled-task architecture

---

### 4.2 Separation of Concerns

| Layer      | Responsibility                                    |
|-----------|----------------------------------------------------|
| Frontend  | Presentation & user interaction (web)              |
| Backend   | Business logic, API, Strava API integration       |
| Database  | Persistence                                       |
| Prisma    | Schema & migration management                     |

- The frontend **never** accesses the database or Strava directly; it uses only the backend REST API.
- The database is **never** aware of client structure.

---

### 4.3 API as Contract

The API is the **formal contract** between clients (web frontend) and backend.

- OpenAPI specification is generated from NestJS
- DTOs are explicit
- Database schema is not exposed directly
- No leaking of internal persistence models
- Workout import/sync (from Strava) is implemented in the backend and exposed via OpenAPI-documented endpoints where needed

The OpenAPI spec is considered part of the documentation and **must** be version-controlled.

---

## 5. Repository Structure (Monorepo)

The project uses a **monorepo**.

**Example structure:**

```
/
├── apps/
│   ├── backend/          # NestJS API (Strava integration for workouts)
│   ├── frontend/         # Angular app (web)
├── packages/
│   └── api-contract/     # Optional: shared OpenAPI types
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── .docs/
    └── system/
        ├── setup-architecture.md
        └── research-strava-api.md   # Strava API as workout data source
```

The repository is the **single source of truth**, including:

- Documentation
- Architecture decisions
- Migration history
- API contract

---

## 6. Development Workflow

### 6.1 Local Setup

A single command should:

- Start the MySQL container
- Apply migrations
- Start the backend
- Start the frontend

No manual DB setup steps (e.g., no hand-run SQL for schema).

---

### 6.2 Schema Changes

1. Update `prisma/schema.prisma`
2. Generate migration: `npx prisma migrate dev --name <description>`
3. Commit migration files
4. Apply migration (automated in startup or CI)
5. Regenerate Prisma client as needed

**No** direct SQL execution outside the migration process.

---

### 6.3 API Changes

1. Modify DTOs and/or controllers in NestJS
2. Regenerate OpenAPI spec
3. Update or regenerate frontend API client; verify Angular compatibility
4. Commit backend and frontend changes together when they depend on each other

---

### 6.4 Frontend E2E tests (Cypress)

E2E tests live in `apps/frontend/cypress/` and are run with Cypress.

**Run assumptions:**

- The frontend must be running (e.g. `ng serve` in `apps/frontend`, typically at `http://localhost:4200`) when running E2E tests.
- For flows that call the API, the backend must be running (e.g. Docker or local on port 3000).

**Commands (from `apps/frontend`):**

- `npm run e2e` — opens the Cypress UI for developing and debugging tests.
- `npm run e2e:run` — runs tests headlessly (suitable for CI).

---

## 7. Hosting Strategy (Initial Direction)

The system is designed for:

- Containerized deployment
- Backend and database separated (e.g., different containers/services)
- Environment-variable-based configuration

The production hosting decision will define:

- Container orchestration (e.g., Docker Compose vs. managed platform)
- Managed MySQL vs. self-hosted
- CI/CD pipeline strategy

The architecture **does not** assume any specific cloud provider.

---

## 8. Non-Goals (Intentional Constraints)

To maintain clarity and avoid architectural drift:

- **No** microservices (single backend service)
- **No** premature event-driven architecture
- **No** complex CQRS setup
- **No** frontend-heavy business logic
- **No** ORM "auto-magic" without migration traceability

The system is deliberately **simple**.

---

## 10. Architectural Summary

**Zapatismo uses:**

| Category   | Technology              |
|-----------|--------------------------|
| Frontend  | Angular (web); Tailwind CSS + daisyUI |
| Workout data source | Strava API (backend integration) |
| Backend   | NestJS (TypeScript)      |
| Database  | MySQL                    |
| ORM / migrations | Prisma, Prisma Migrate |
| API contract | OpenAPI              |
| Runtime   | Docker (backend, frontend, DB) |
| Repo      | Monorepo (`apps/backend`, `apps/frontend`) |
| Truth     | Repository as single source of truth |

The architecture is intentionally:

- **Traceable** – changes are versioned and documented
- **Deterministic** – same inputs yield same results
- **Reproducible** – environment can be recreated from repo
- **Boring (in the positive sense)** – no unnecessary complexity
- **Maintainable** – long-term clarity and consistency
