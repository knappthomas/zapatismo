You are Cursor in the project "Zapatismo".

Goal: Step 2 of the binding process — create an actionable implementation plan for exactly ONE ticket.

IMPORTANT (Non-negotiables):
- This step does NOT implement anything. It produces a structured plan.
- The plan MUST be based on:
  1) The Requirement Sheet created in step 1:
     `.docs/tasks/[ticket-id]/1-requirement-[ticket-id].md`
  2) The project architecture constraints in:
     `.docs/system/setup-architecture.md`
- You MUST scan the codebase to decide WHAT must change WHERE (files/modules), consistent with the architecture.

DOCUMENTATION (read for constraints and conventions):
- **Architecture & stack:** `.docs/system/setup-architecture.md` — 3-tier, Prisma, OpenAPI, Docker, iOS role.
- **Project rules:** `.docs/system/project-rules.md` — migrations, backend/frontend/API conventions, repo workflow.
- **Backend (when planning API/DB):** `.docs/system/backend.md` — NestJS/Prisma layout, modules, REST, OpenAPI.
- **Frontend (when planning UI):** `.docs/system/frontend.md` — Angular layout, routing, auth, styling (Tailwind + daisyUI).
- **iOS / HealthKit (only if ticket affects iOS app or workout sync):** `.docs/system/research-apple-workout.md` — background sync, HealthKit constraints.
- No speculation. If requirements are missing/unclear: mark as "UNRESOLVED" and propose concrete questions.
- Be explicit about scope and sequencing.
- Prefer minimal changes; no architectural drift.

INPUT (ask me when executing):
- Ticket ID (= [ticket-id])

PREPARATION:
- Verify the requirements file exists:
  `.docs/tasks/[ticket-id]/1-requirement-[ticket-id].md`
  If missing: STOP and tell me to run step 1 first.
- Create the plan file:
  `.docs/tasks/[ticket-id]/2-plan-[ticket-id].md`
- Use that file for all output.
- Language: English.

YOUR TASK:
Transform the requirement sheet into a concrete implementation plan aligned with Zapatismo architecture:
- Angular frontend (apps/frontend)
- NestJS backend (apps/backend)
- Prisma schema + migrations (prisma/)
- OpenAPI contract generation/usage (as defined in the repo)
- Docker / compose integration (if required)
- iOS app (apps/app-ios) ONLY if the requirement explicitly affects it

Hard constraints from setup-architecture.md you must enforce in the plan:
- Backend is stateless REST API (no session state, no filesystem persistence).
- DB is the single source of truth (MySQL via Prisma).
- API is the contract (OpenAPI; DTOs explicit; DB schema not exposed).
- Frontend has UI logic only; no business logic duplication.
- Prisma Migrate is the only way to change schema (no manual SQL).
- Keep the system intentionally simple (no microservices, no CQRS, no premature eventing).

PLANNING RULES:
- Map each requirement (FR-*) to concrete work items and target locations.
- Include file-level hints (create/modify) and module boundaries.
- Include endpoint list if API changes are needed (HTTP method, path, request/response DTO names).
- Include data model changes only at the level of Prisma models + migration steps (no full SQL).
- Include validation placement rules: what must be validated in Angular vs backend.
- Include error handling strategy (HTTP codes, error shapes) consistent with existing patterns.
- Include test plan: unit/integration/e2e as applicable to the repo setup.
- Include acceptance criteria traceability: each AC maps to verification steps/tests.

OUTPUT FORMAT:
Generate exactly one Markdown document using the following template.
No additional chapters. No prose outside the template.

---

# Implementation Plan – <TICKET-ID> – <SHORT TITLE>

## 0. Scope Check
- Requirement sheet present and reviewed: ✅/❌
- Fits Zapatismo architecture constraints: ✅/❌
- In-Scope summary (bullets):
- Out-of-Scope summary (bullets):
- Key assumptions (only if explicitly stated in requirements):
- UNRESOLVED items blocking implementation (if any):

## 1. Architecture Mapping (High-Level)
| Layer | Responsibility for this ticket | Notes |
|---|---|---|
| Angular (apps/frontend) | ... | ... |
| Backend (apps/backend, NestJS) | ... | ... |
| Database (MySQL via Prisma) | ... | ... |
| OpenAPI contract | ... | ... |
| Docker/Compose | ... | ... |
| iOS (apps/app-ios) | ... | ... |

## 2. Work Breakdown Structure (WBS)
List each work package as:
- WP-<N>: <Name>
  - Goal:
  - Affected area(s): (frontend/backend/prisma/openapi/docker/ios)
  - Depends on:
  - Deliverables:

## 3. Backend Plan (NestJS)
### 3.1 Modules / Components to touch
- Module(s):
- Controller(s):
- Service(s):
- Repository/Prisma access layer:

### 3.2 REST Endpoints
| HTTP | Path | Purpose | Request DTO | Response DTO | AuthN/AuthZ | Errors |
|---|---|---|---|---|---|---|

Rules:
- Stateless REST only.
- No business logic in controllers beyond orchestration/validation.
- Use explicit DTOs; do not expose Prisma entities directly.

### 3.3 Validation & Error Handling
- Input validation approach:
- Domain validation approach:
- Error mapping (HTTP status + payload shape):
- Logging/Auditing considerations:

## 4. Data / Prisma Plan
### 4.1 Prisma schema changes
- Models to add/modify:
- Relations/indices constraints (conceptual):
- Backfill / defaults (if required):

### 4.2 Migration steps
- Migration name suggestion:
- Steps to generate/apply migration:
- Seed/test data impact (if relevant):

Rules:
- Prisma Migrate only; no manual SQL.

## 5. OpenAPI / Contract Plan
- How the OpenAPI spec changes (new endpoints, DTOs, fields):
- Regeneration steps (where/how in the repo):
- Client impact (Angular typed client generation if used):

## 6. Frontend Plan (Angular)
### 6.1 UX / Screens / Routes
- Screens affected:
- Routes affected:
- Components to add/modify:

### 6.2 Data flow
- Services / API client usage:
- State management approach (keep minimal):
- Error display patterns:

### 6.3 Frontend validations
| Validation | Location (Frontend/Backend) | Rationale |
|---|---|---|

## 7. iOS App Plan (ONLY if required)
- HealthKit data access changes:
- Sync payload/API usage changes:
- Background behavior considerations:

## 8. Testing Plan
- Backend tests:
  - Unit:
  - Integration (DB):
- Frontend tests:
  - Unit:
  - E2E (Cypress) (if applicable in repo):
- Contract tests / OpenAPI verification (if applicable):

## 9. Acceptance Criteria Traceability
Map each AC to verification steps:
| AC ID | Implementation touchpoints | Test(s) / Verification |
|---|---|---|

## 10. Execution Sequence
Ordered steps (1..N) that a developer should follow, including:
- Prisma migration order
- Backend changes
- OpenAPI generation
- Frontend changes
- Test execution

## 11. Risks & Open Points (UNRESOLVED)
- [ ] Item – why it matters – proposed resolution

QUALITY GATE (before finishing):
- Every FR and AC from the requirement sheet is mapped to concrete work.
- No architectural drift beyond setup-architecture.md.
- No implementation details/code.
- All uncertainties captured as UNRESOLVED with precise questions.