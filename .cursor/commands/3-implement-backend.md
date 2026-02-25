You are Cursor in the project "Zapatismo".

Goal: Step 3 (Backend Implementation) — implement ONLY the backend part for exactly ONE ticket:
- Database changes (MySQL via Prisma)
- Prisma schema + migration(s)
- NestJS backend changes (controllers/services/repositories)
- Contract alignment (OpenAPI) only as required by the plan
- Tests for backend + DB integration as required by the plan
- Document everything in a single ticket log file

NON-NEGOTIABLES:
- Strictly follow the ticket plan. Do EXACTLY what is planned — no extra refactors, no “nice-to-haves”.
- No frontend work. No Angular changes. No iOS changes.
- Backend must remain stateless REST.
- DB is the source of truth; schema changes only via Prisma Migrate (no manual SQL).
- No “creative” architecture: no CQRS, no event buses, no microservices, no new infra unless explicitly planned.
- Do not expose Prisma entities directly in API responses.
- Controllers are thin: mapping + validation + orchestrate service calls.
- Keep error handling consistent with existing repo patterns (find and reuse them).
- Every change must be traceable to the plan (WP-*) and requirements (FR-*, AC-*).

INPUT:
- Ticket ID (= [ticket-id])

PREPARATION:
1) Verify these input documents exist; if not, STOP and tell me to run step 1 / step 2:
   - `.docs/tasks/[ticket-id]/1-requirement-[ticket-id].md`
   - `.docs/tasks/[ticket-id]/2-plan-[ticket-id].md`

2) Create the implementation log file:
   - `.docs/tasks/[ticket-id]/3-backend-[ticket-id].md`
   Use this file for ALL documentation of what you changed and why (single source of truth for step 3).

3) Read and follow these docs; enforce their constraints:
   - **Architecture:** `.docs/system/setup-architecture.md`
   - **Project rules:** `.docs/system/project-rules.md`
   - **Backend & Prisma:** `.docs/system/backend.md` — modules, Prisma, validation, OpenAPI, test migrations.

SCOPE:
- Implement: Prisma schema + migration(s) + NestJS backend + required backend tests + any planned OpenAPI contract updates.
- Do NOT implement: frontend, iOS, styling, UX, new product features not listed in requirements/plan.

TASKS (execute in this order):

0) Write the header into `.docs/tasks/[ticket-id]/3-backend-[ticket-id].md` using the template below.
   Then keep appending to this file as you progress.

1) Baseline: Discover existing backend patterns in THIS repo (before changing anything)
   - Find existing NestJS modules/controllers/services patterns.
   - Find existing validation patterns (class-validator pipes? zod? custom?).
   - Find existing error/exception -> HTTP mapping patterns (filters, interceptors, standard error body).
   - Find existing Prisma usage patterns (where PrismaClient is instantiated, repository layer conventions).
   - Find test patterns (unit/integration, test DB setup, docker-compose usage).
   Document the concrete reference files you chose as the blueprint in the log.

2) Prisma / Database implementation (only if the plan requires schema changes)
   - Update `prisma/schema.prisma` exactly as described in the plan (section "Data / Prisma Plan").
   - Create migration(s) using Prisma Migrate.
   - Ensure migrations apply cleanly.
   - If planned: update seed/test data.
   - Document:
     - Prisma model diffs (high-level)
     - Migration name(s)
     - Commands run
     - Any constraints/indexes added (as planned)

3) Backend implementation (NestJS)
   - Implement/modify modules/controllers/services/repositories exactly according to the plan:
     - Endpoints: method + path + auth rules + request/response DTOs
     - Validation rules: as planned (what validated where)
     - Business logic placement: in services; controllers orchestrate only
     - Persistence: Prisma access follows repo pattern
   - Keep changes minimal and plan-driven.

4) OpenAPI / Contract alignment (ONLY if the plan requires it)
   - Update the OpenAPI spec and/or generation outputs exactly as planned.
   - Regenerate artifacts if this repo uses generation.
   - Document the exact files changed and generation commands.

5) Testing
   - Implement tests as specified in the plan (backend unit and/or integration with DB).
   - Ensure tests pass locally.
   - Document test commands and what the tests cover (mapped to ACs where possible).

6) Sanity checks
   - Run lint/typecheck/test commands relevant to the backend.
   - Ensure migration is included and reproducible.
   - Ensure no frontend files were changed.

OUTPUT REQUIREMENT:
At the end, the log file MUST contain:
- A list of all changed/added files (paths)
- All new/changed endpoints (method + path)
- All Prisma migrations (names) and schema changes summary
- Tests added/updated + how to run
- Traceability mapping: FR-* and AC-* -> code touchpoints/tests
- Open points/risks (if any)

DOCUMENT TEMPLATE (write this into `.docs/tasks/[ticket-id]/3-backend-[ticket-id].md` and keep it updated):

---
# Backend Implementation Log – <TICKET-ID> – <SHORT TITLE>

## 0. Inputs
- Requirement sheet: `.docs/tasks/<TICKET-ID>/1-requirement-<TICKET-ID>.md`
- Implementation plan: `.docs/tasks/<TICKET-ID>/2-plan-<TICKET-ID>.md`
- Architecture: `.docs/system/setup-architecture.md`
- Project rules: `.docs/system/project-rules.md`
- Backend & Prisma: `.docs/system/backend.md`

## 1. Scope Confirmation
- In scope (backend/db only): ✅
- Out of scope (frontend/iOS/etc): ✅
- Plan-following mode (no extras): ✅

## 2. Repo Patterns Used (References)
List concrete reference files you followed:
- Backend module pattern:
- Controller pattern:
- Validation pattern:
- Error handling pattern:
- Prisma access pattern:
- Test pattern:

## 3. Work Executed (Traceable to Plan)
For each work package (WP-* from the plan):
### WP-<N>: <Name>
- Plan reference:
- What changed:
- Files:
- Notes:

## 4. Prisma / Database Changes
### 4.1 Schema changes
- Summary:

### 4.2 Migrations
- Migration(s):
- Commands run:

### 4.3 Seed/Test data
- Changes (if any):
- Commands run:

## 5. Backend Changes (NestJS)
### 5.1 Modules / Components touched
- Modules:
- Controllers:
- Services:
- Repositories / Prisma layer:

### 5.2 Endpoints implemented
| HTTP | Path | Purpose | AuthN/AuthZ | Request DTO | Response DTO | Error cases |
|---|---|---|---|---|---|---|

### 5.3 Validation & Error Handling
- Validation rules implemented:
- Error mapping used (reference file):
- Notes:

## 6. OpenAPI / Contract Changes (if applicable)
- Files changed:
- Regeneration commands:
- Notes:

## 7. Tests
- Tests added/updated:
- How to run:
- Coverage summary (map to ACs where possible):

## 8. Acceptance Criteria Traceability
| AC ID | Implementation touchpoints (files/functions) | Tests / Verification |
|---|---|---|

## 9. Change Summary
- Files added/modified:
- New/changed endpoints:
- Prisma migrations:
- Tests:

## 10. Open Points / Risks
- [ ] Item – impact – proposed resolution
---

QUALITY GATE (must satisfy before finishing):
- All changes map to the plan (WP-*) and requirements (FR-*, AC-*).
- No frontend/iOS changes.
- Prisma migration(s) created and reproducible.
- Endpoints match the plan exactly (paths, methods, DTO shapes).
- Error handling follows existing repo patterns (references included).
- Tests pass.