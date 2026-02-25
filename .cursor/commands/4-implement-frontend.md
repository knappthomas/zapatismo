You are Cursor in the project "Zapatismo".

Goal: Step 4 (Frontend Implementation) — implement ONLY the Angular frontend part for exactly ONE ticket.
You will:
- Implement the planned UI/UX changes in `apps/frontend/`
- Integrate with the backend REST API as defined in the plan (and existing contract)
- Add/update frontend tests only if explicitly planned
- Document everything in a single ticket log file

NON-NEGOTIABLES:
- Strictly follow the ticket plan. Do EXACTLY what is planned — no extra refactors, no “nice-to-haves”.
- No backend work. No Prisma changes. No OpenAPI changes. No Docker changes. No iOS changes.
- Frontend owns presentation only. Domain rules stay in the backend.
- Use existing repo patterns from `apps/frontend/` (standalone components, signals, services in `core/`).
- Styling: Tailwind CSS v4 + daisyUI v5 only. No new UI frameworks.
- No global architecture drift: no new state management framework, no new routing paradigm, no new auth flow unless planned.
- Keep changes minimal and traceable to the plan (WP-*) and requirements (FR-*, AC-*).

INPUT:
- Ticket ID (= [ticket-id])

PREPARATION:
1) Verify these input documents exist; if not, STOP and tell me to run step 1 / step 2:
   - `.docs/tasks/[ticket-id]/1-requirement-[ticket-id].md`
   - `.docs/tasks/[ticket-id]/2-plan-[ticket-id].md`

2) Create the implementation log file:
   - `.docs/tasks/[ticket-id]/4-frontend-[ticket-id].md`
   Use this file for ALL documentation of what you changed and why (single source of truth for step 4).

3) Read and follow these docs; enforce their constraints:
   - **Frontend conventions:** `.docs/system/frontend.md` — Angular 20 standalone, Tailwind + daisyUI, core/shared/features layout, routing, API integration.
   - **Architecture:** `.docs/system/setup-architecture.md` — 3-tier boundaries, no business logic in frontend.
   - **Project rules:** `.docs/system/project-rules.md` — frontend and API contract rules.

SCOPE:
- Implement: Angular screens/routes/components/services/models required by the plan.
- Do NOT implement: backend, Prisma, migrations, OpenAPI generation, infrastructure, iOS.

TASKS (execute in this order):

0) Write the header into `.docs/tasks/[ticket-id]/4-frontend-[ticket-id].md` using the template below.
   Then keep appending to this file as you progress.

1) Baseline: Discover existing frontend golden paths (before changing anything)
   - Identify at least one existing feature under `apps/frontend/src/app/features/` that matches the complexity of the ticket.
   - Identify existing patterns for:
     - routing (`app.routes.ts`, `loadComponent`)
     - authenticated layout usage
     - services under `core/services/`
     - auth / guards / interceptor usage
     - error display patterns (alerts, validation messages)
   - Document the concrete reference files you will follow in the log.
   - If you cannot find a suitable reference pattern: STOP and report what is missing (we do not invent new architecture).

2) Implement UI changes exactly as planned
   - Create/modify feature component(s) under:
     `apps/frontend/src/app/features/<feature>/`
   - Ensure components are standalone, import dependencies explicitly, and remain self-contained.
   - Update routing in `app.routes.ts` exactly as planned (authGuard/adminGuard where required).
   - Update navigation (navbar) only if planned.
   - Use Tailwind utility classes + daisyUI components (`btn`, `card`, `table`, `alert`, etc.). No custom component library.

3) Implement API integration exactly as planned
   - Add/modify service(s) in:
     `apps/frontend/src/app/core/services/`
   - Add/modify model interface(s) in:
     `apps/frontend/src/app/core/models/`
   - Use `environment.apiUrl` as base and call REST endpoints via `HttpClient`.
   - Do not embed business rules in the UI; show backend validation/errors properly.
   - Keep local state minimal; use signals for local/component state where appropriate, and Observables for HTTP.

4) Validation & error handling
   - Implement planned frontend validations (only those planned).
   - Ensure backend errors are handled and displayed using the existing patterns (discover and reuse).
   - Do not “improve” error UX beyond the plan.

5) Testing (ONLY if planned)
   - Add/update tests according to existing repo test setup.
   - Document how to run tests.

6) Sanity checks
   - Run frontend lint/build/tests relevant for the repo.
   - Ensure no backend/prisma/openapi files were modified.

OUTPUT REQUIREMENT:
At the end, the log file MUST contain:
- A list of all changed/added files (paths)
- A list of routes added/changed
- A list of API calls/endpoints used (method + path) and where they are called
- UI components added/changed and responsibilities
- Traceability mapping: FR-* and AC-* -> UI touchpoints + verification steps/tests
- Open points/risks (if any)

DOCUMENT TEMPLATE (write this into `.docs/tasks/[ticket-id]/4-frontend-[ticket-id].md` and keep it updated):

---
# Frontend Implementation Log – <TICKET-ID> – <SHORT TITLE>

## 0. Inputs
- Requirement sheet: `.docs/tasks/<TICKET-ID>/1-requirement-<TICKET-ID>.md`
- Implementation plan: `.docs/tasks/<TICKET-ID>/2-plan-<TICKET-ID>.md`
- Frontend conventions: `.docs/system/frontend.md`
- Architecture: `.docs/system/setup-architecture.md`
- Project rules: `.docs/system/project-rules.md`

## 1. Scope Confirmation
- In scope (frontend only): ✅/❌
- Out of scope (backend/prisma/openapi/ios): ✅/❌
- Plan-following mode (no extras): ✅/❌

## 2. Repo Golden Paths Used (References)
Concrete reference files you followed:
- Feature structure reference:
- Routing reference:
- Service/API reference:
- Error handling reference:
- Auth/guards reference:
- UI styling reference (daisyUI/Tailwind usage):

## 3. Work Executed (Traceable to Plan)
For each work package (WP-* from the plan):
### WP-<N>: <Name>
- Plan reference:
- What changed:
- Files:
- Notes:

## 4. Routing / Navigation
- Routes added/changed:
- Guards applied (authGuard/adminGuard):
- Navbar changes (if any):

## 5. UI Components
List components added/modified:
| Component | Path | Responsibility | Notes |
|---|---|---|---|

## 6. API Integration
### 6.1 Services
| Service | Path | Endpoints used |
|---|---|---|

### 6.2 Models
| Model | Path | Notes |
|---|---|---|

## 7. Validations & Error Handling
- Frontend validations implemented:
- Backend error display approach (reference file/pattern):
- Notes:

## 8. Tests (if applicable)
- Tests added/updated:
- How to run:
- Coverage summary (map to ACs where possible):

## 9. Acceptance Criteria Traceability
| AC ID | UI touchpoints (components/routes) | Verification / Test |
|---|---|---|

## 10. Change Summary
- Files added/modified:
- Routes added/changed:
- API endpoints integrated:
- Notes:

## 11. Open Points / Risks
- [ ] Item – impact – proposed resolution
---

QUALITY GATE (must satisfy before finishing):
- All changes map to the plan (WP-*) and requirements (FR-*, AC-*).
- No backend/prisma/openapi/ios changes.
- Standalone components only; follows `frontend.md` conventions.
- Uses only Tailwind + daisyUI for UI.
- Routes/guards match the plan exactly.
- Tests/lint/build pass (if configured in repo).