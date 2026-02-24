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

Zapatismo follows a classic **3-tier architecture**, with an **iOS app** as the data source for workout data (HealthKit is on-device only; there is no server-side Apple API for workouts):

```
┌─────────────────────────┐     ┌─────────────────────────┐
│   Angular Frontend      │     │   iOS App (iPhone)      │
│   (Web UI)              │     │   HealthKit → REST       │
└────────────┬────────────┘     └────────────┬────────────┘
             │                               │
             └───────────────┬───────────────┘
                             ▼
              ┌─────────────────────────┐
              │ NestJS Backend          │
              │ (Stateless REST API)    │
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
| **Xcode**          | Build and run the iOS app (not containerized) |

Backend, frontend, and database run in Docker for local development. The iOS app is built and run on a Mac with Xcode (simulator or device).

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
- Importing and normalizing Apple Workout data
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

### 3.5 iOS App (Workout Data Source)

**Native iOS app (Swift), in `apps/app-ios/`**

Apple does not provide a server-side or REST-based HealthKit API. Workout data lives only on the user’s iPhone (and Apple Watch); access requires an app running on the device with HealthKit entitlements and user authorization.

**Purpose:**

- Read running/walking workouts from HealthKit on the iPhone
- Sync data to the Zapatismo backend via the same REST API (idempotent endpoints)
- Support background sync where possible (HealthKit Background Delivery, BGTaskScheduler, Background URLSession), within Apple’s constraints

**Principles:**

- **REST client only:** The app does not implement business logic; it reads HealthKit and uploads to backend. Normalization and persistence are backend responsibilities.
- **API contract:** Use the same OpenAPI-defined endpoints as the web frontend (or a dedicated import/sync API documented in OpenAPI).
- **Idempotent usage:** Backend must accept re-syncs and duplicate uploads (e.g. anchored incremental sync); see `docs/research-apple-workout.md` for patterns.

**Responsibilities:**

- Request HealthKit read authorization for workout types
- Query workouts (e.g. `HKWorkoutType`, filtered for running/walking) via HealthKit APIs
- Incremental sync where supported (e.g. `HKAnchoredObjectQuery`, Background Delivery)
- Upload payloads to backend over HTTPS (e.g. Background URLSession for reliability)
- Optional: minimal UI for authorization and sync status

**Tooling and runtime:**

- Xcode; build for iOS (simulator or device)
- Not run in Docker; requires Mac and iOS device or simulator for development and testing

Detailed design constraints, background behaviour, and limitations are documented in `docs/research-apple-workout.md`.

---

### 3.6 Containerization

**Docker**

Backend and frontend run in containers:

- **MySQL** – database server
- **Backend** – NestJS API
- **Frontend** – Angular app (build + serve or static)
- **Optional** – dedicated Prisma migration container

The **iOS app** is built and run via Xcode (Mac only); it is not containerized.

**Goals:**

- Identical local and production behavior for backend and frontend
- One-command startup for DB + backend + frontend
- No “works on my machine” situations for the containerized stack

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
| iOS app   | HealthKit read & upload to backend (REST client)   |
| Backend   | Business logic & API                              |
| Database  | Persistence                                       |
| Prisma    | Schema & migration management                     |

- The frontend and iOS app **never** access the database directly.
- The database is **never** aware of client structure.

---

### 4.3 API as Contract

The API is the **formal contract** between clients (web frontend, iOS app) and backend.

- OpenAPI specification is generated from NestJS
- DTOs are explicit
- Database schema is not exposed directly
- No leaking of internal persistence models
- The iOS app uses the same REST contract (e.g. workout import/sync endpoints) as documented in OpenAPI

The OpenAPI spec is considered part of the documentation and **must** be version-controlled.

---

## 5. Repository Structure (Monorepo)

The project uses a **monorepo**.

**Example structure:**

```
/
├── apps/
│   ├── backend/          # NestJS API
│   ├── frontend/         # Angular app (web)
│   └── app/              # iOS app (HealthKit → REST to backend)
├── packages/
│   └── api-contract/     # Optional: shared OpenAPI types
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── docs/
    ├── setup-architecture.md
    └── research-apple-workout.md   # HealthKit / iOS sync design
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
- **No** ORM “auto-magic” without migration traceability

The system is deliberately **simple**.

---

## 10. Architectural Summary

**Zapatismo uses:**

| Category   | Technology              |
|-----------|--------------------------|
| Frontend  | Angular (web); Tailwind CSS + daisyUI |
| iOS app   | Native iOS (Swift), HealthKit, REST client |
| Backend   | NestJS (TypeScript)      |
| Database  | MySQL                    |
| ORM / migrations | Prisma, Prisma Migrate |
| API contract | OpenAPI              |
| Runtime   | Docker (backend, frontend, DB); Xcode (iOS app) |
| Repo      | Monorepo (`apps/backend`, `apps/frontend`, `apps/app`) |
| Truth     | Repository as single source of truth |

The architecture is intentionally:

- **Traceable** – changes are versioned and documented
- **Deterministic** – same inputs yield same results
- **Reproducible** – environment can be recreated from repo
- **Boring (in the positive sense)** – no unnecessary complexity
- **Maintainable** – long-term clarity and consistency