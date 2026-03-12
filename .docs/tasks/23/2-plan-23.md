# Implementation Plan – 23 – Default Running Shoe and Default Walking Shoe

## 0. Scope Check
- Requirement sheet present and reviewed: ✅
- Fits Zapatismo architecture constraints: ✅
- In-Scope summary (bullets):
  - Two type-specific defaults per user (default running shoe, default walking shoe); at most one per type; same shoe may be default for both.
  - Shoe edit page: set/clear "default for running" and "default for walking" (two independent options).
  - Strava sync: assign new RUNNING workouts to default running shoe when set; new WALKING workouts to default walking shoe when set; no default for type → workout created without shoe.
  - Migration: existing single default shoe becomes default for both running and walking (backward compatibility).
  - Shoes overview (grid and list): badges "Default Running" and "Default Walking" (replacing single "Default").
  - Sync modal: separate messages when no default running shoe and when no default walking shoe (each shown only when that default is missing).
  - Backend unit and integration tests for type-specific defaults and sync assignment by type.
- Out-of-Scope summary (bullets):
  - Bulk reassignment of already-synced workouts; defaults for workout types other than RUNNING/WALKING; Strava gear mapping; automatic/scheduled sync; Strava OAuth/connection flow changes.
- Key assumptions (only if explicitly stated in requirements):
  - Workout types RUNNING and WALKING are already defined; Strava activity types map via existing `mapStravaTypeToWorkoutType` (Run → RUNNING, Walk/Hike → WALKING).
- UNRESOLVED items blocking implementation (if any): None.

## 1. Architecture Mapping (High-Level)
| Layer | Responsibility for this ticket | Notes |
|-------|--------------------------------|-------|
| Angular (apps/frontend) | Shoe edit: two checkboxes (default for running, default for walking). Shoes overview (grid + list): two badge types "Default Running" / "Default Walking". Sync modal: two separate warnings (no default running / no default walking). | Uses existing shoes API and sync API; model and payload types extended. |
| Backend (apps/backend, NestJS) | Shoes: update logic for two default flags; at most one per type; new finders by type. Strava sync: resolve default shoe by workout type (RUNNING/WALKING) and pass correct shoeId when creating workouts. | ShoesService, StravaService; no new endpoints. |
| Database (MySQL via Prisma) | Shoe model: replace `isDefault` with `isDefaultForRunning` and `isDefaultForWalking`. Migration backfills current default to both. | Prisma Migrate only. |
| OpenAPI contract | Shoe response and update DTOs: replace `isDefault` with `isDefaultForRunning` and `isDefaultForWalking`. | Regenerated from NestJS/Swagger. |
| Docker/Compose | No change. | — |
| iOS (apps/app-ios) | N/A | Not in scope. |

## 2. Work Breakdown Structure (WBS)
- **WP-1:** Prisma schema and migration for type-specific default shoes
  - Goal: Replace single `isDefault` with `isDefaultForRunning` and `isDefaultForWalking`; backfill existing default to both.
  - Affected area(s): prisma
  - Depends on: —
  - Deliverables: Updated `schema.prisma`; one migration (add columns, backfill, drop old column); `prisma generate` run.

- **WP-2:** Backend shoes module – DTOs and service
  - Goal: API and logic for two default flags; enforce at most one per type; find default by type.
  - Affected area(s): backend (shoes)
  - Depends on: WP-1
  - Deliverables: Update `ShoeResponseDto`, `UpdateShoeDto`; `ShoesService` (update, findDefaultRunningShoeId, findDefaultWalkingShoeId); no new endpoints.

- **WP-3:** Backend Strava sync – assign shoe by workout type
  - Goal: For each new RUNNING workout use default running shoe; for each new WALKING workout use default walking shoe.
  - Affected area(s): backend (strava)
  - Depends on: WP-2
  - Deliverables: `StravaService.sync()` uses type-specific default shoe IDs; idempotent re-sync unchanged (createByExternalId only runs for new workouts).

- **WP-4:** OpenAPI / contract
  - Goal: Contract reflects new shoe DTO fields; no breaking client usage beyond planned frontend changes.
  - Affected area(s): openapi (via backend DTOs)
  - Depends on: WP-2
  - Deliverables: Regenerate/verify Swagger spec; document change if client codegen is used.

- **WP-5:** Frontend shoe model and API usage
  - Goal: Frontend types and payloads use `isDefaultForRunning` and `isDefaultForWalking` instead of `isDefault`.
  - Affected area(s): frontend (core models, shoes service)
  - Depends on: WP-2
  - Deliverables: `Shoe` model; `UpdateShoePayload`; any service methods that send/read default flags.

- **WP-6:** Frontend shoe edit page
  - Goal: Two checkboxes: "Default for running" and "Default for walking"; set/clear and save.
  - Affected area(s): frontend (shoes feature)
  - Depends on: WP-5
  - Deliverables: `ShoeFormComponent`: two form controls, two labels/hints, submit payload with both flags.

- **WP-7:** Frontend shoes overview (grid and list)
  - Goal: Show "Default Running" and "Default Walking" badges; a shoe can show one or both.
  - Affected area(s): frontend (shoes feature)
  - Depends on: WP-5
  - Deliverables: `ShoesGridPartComponent` and list table in `ShoesOverviewComponent`: badge logic and labels per FR-7.

- **WP-8:** Frontend sync modal warnings
  - Goal: Separate message when no default running shoe; separate message when no default walking shoe; each only when that default is missing.
  - Affected area(s): frontend (workouts feature)
  - Depends on: WP-5
  - Deliverables: `WorkoutsOverviewComponent`: derive hasDefaultRunningShoe / hasDefaultWalkingShoe from shoes list; two conditional warning blocks with FR-13 text.

- **WP-9:** Backend unit tests
  - Goal: Cover type-specific default behaviour and sync assignment by type.
  - Affected area(s): backend (shoes, strava)
  - Depends on: WP-2, WP-3
  - Deliverables: ShoesService spec (update with both flags, clear other per type; findDefaultRunningShoeId / findDefaultWalkingShoeId); StravaService spec (sync passes correct shoeId for RUNNING vs WALKING, and no shoeId when no default for that type).

- **WP-10:** Backend integration tests
  - Goal: DB and sync flow: defaults by type, sync assigns running to default running and walking to default walking.
  - Affected area(s): backend (test/)
  - Depends on: WP-2, WP-3
  - Deliverables: Shoes integration: PATCH sets default running/walking, at most one per type, list returns correct flags. Strava integration: sync with default running only, default walking only, both, neither; verify workout shoeId by type. Migration backfill covered (existing default becomes both).

## 3. Backend Plan (NestJS)
### 3.1 Modules / Components to touch
- Module(s): ShoesModule, StravaModule (no structural change).
- Controller(s): ShoesController (unchanged; PATCH body and response DTOs change).
- Service(s): ShoesService (update logic, findDefaultRunningShoeId, findDefaultWalkingShoeId); StravaService (sync uses type-specific default IDs).
- Repository/Prisma access layer: Prisma only via existing PrismaService; schema change in WP-1.

### 3.2 REST Endpoints
| HTTP | Path | Purpose | Request DTO | Response DTO | AuthN/AuthZ | Errors |
|------|------|---------|-------------|--------------|-------------|--------|
| GET | /api/shoes | List user's shoes | — | ShoeResponseDto[] (add isDefaultForRunning, isDefaultForWalking) | JWT | — |
| GET | /api/shoes/:id | Get one shoe | — | ShoeResponseDto (same) | JWT, owner | 404 |
| PATCH | /api/shoes/:id | Update shoe | UpdateShoeDto (isDefaultForRunning?, isDefaultForWalking?) | ShoeResponseDto | JWT, owner | 404 |

No new endpoints. Existing sync endpoint unchanged in path/verb; behaviour change internal (shoeId by type).

### 3.3 Validation & Error Handling
- Input validation approach: UpdateShoeDto optional booleans for isDefaultForRunning, isDefaultForWalking; class-validator as today.
- Domain validation approach: Service ensures at most one default per type by clearing other shoes when setting one shoe as default for that type (same pattern as current isDefault).
- Error mapping (HTTP status + payload shape): Unchanged (404 for shoe not found, 403/404 for ownership as today).
- Logging/Auditing considerations: No new mandatory logging; MAY log default changes for debugging.

## 4. Data / Prisma Plan
### 4.1 Prisma schema changes
- Models to add/modify: **Shoe**: remove `isDefault`; add `isDefaultForRunning Boolean @default(false) @map("is_default_for_running")` and `isDefaultForWalking Boolean @default(false) @map("is_default_for_walking")`.
- Relations/indices constraints (conceptual): No new relations or unique constraints; application logic enforces "at most one default per type per user".
- Backfill / defaults (if required): In migration: after adding new columns, `UPDATE shoes SET is_default_for_running = 1, is_default_for_walking = 1 WHERE is_default = 1`; then drop `is_default`.

### 4.2 Migration steps
- Migration name suggestion: `replace_default_shoe_with_type_specific_defaults`
- Steps to generate/apply migration: (1) Edit `prisma/schema.prisma`: add two new boolean fields, remove `isDefault`. (2) Run `npx prisma migrate dev --name replace_default_shoe_with_type_specific_defaults`. (3) In the generated migration SQL: ensure order is (a) add column `is_default_for_running` (default false), (b) add column `is_default_for_walking` (default false), (c) backfill from `is_default`, (d) drop column `is_default`. (Prisma may generate add-columns then drop; if it does not generate backfill, add a custom SQL step to set both new columns to true where `is_default` was true before dropping.)
- Seed/test data impact: Seed does not set default shoes. Test migrations (e.g. `00003_shoes_for_thomas.ts`) that set `isDefault` must be updated to set `isDefaultForRunning`/`isDefaultForWalking` after schema change; or use raw SQL in test-migrations if they run after schema migration.

## 5. OpenAPI / Contract Plan
- How the OpenAPI spec changes: ShoeResponseDto and UpdateShoeDto: remove `isDefault`; add `isDefaultForRunning` and `isDefaultForWalking` (boolean; in response both required, in update both optional). Sync request/response shapes unchanged.
- Regeneration steps: Spec is generated from NestJS (Swagger decorators); run backend and export from `/api/docs` or project-specific script if any; commit updated spec if versioned.
- Client impact: Angular uses hand-typed models; update `Shoe` and update payload in `apps/frontend` to match (WP-5). No generated client in repo per frontend.md.

## 6. Frontend Plan (Angular)
### 6.1 UX / Screens / Routes
- Screens affected: Shoes overview (grid + list), Shoe edit (form), Workouts overview (sync modal).
- Routes affected: None (same routes).
- Components to add/modify: `ShoeFormComponent` (two checkboxes, labels "Default for running" / "Default for walking", hints); `ShoesGridPartComponent` (two badge types); `ShoesOverviewComponent` (list table: two badge columns or one column with two badge types); `WorkoutsOverviewComponent` (sync modal: two conditional warnings).

### 6.2 Data flow
- Services / API client usage: ShoesService.getList(), getOne(), update() already used; payload/response types updated. Workouts overview already loads shoes for sync modal; use same list to derive hasDefaultRunningShoe and hasDefaultWalkingShoe.
- State management approach: Keep minimal; component state and signals as today.
- Error display patterns: Unchanged (form error, sync error, alert components).

### 6.3 Frontend validations
| Validation | Location (Frontend/Backend) | Rationale |
|------------|-----------------------------|-----------|
| Default flags are booleans | Backend (DTO) | Single source of truth; frontend sends checkboxes as booleans. |
| At most one default per type | Backend (service) | Domain rule; frontend only sends desired flags. |
| Ownership (shoe belongs to user) | Backend | Already enforced. |

## 7. iOS App Plan (ONLY if required)
- Not applicable. Ticket does not affect iOS.

## 8. Testing Plan
- **Backend tests (required):**
  - **Unit:** (1) **ShoesService** (`shoes.service.spec.ts`): update with `isDefaultForRunning`/`isDefaultForWalking` — when setting default for running true, clear other shoes' default-for-running; same for walking; findDefaultRunningShoeId returns id when one shoe has it, null otherwise; findDefaultWalkingShoeId same. (2) **StravaService** (`strava.service.spec.ts`): sync calls findDefaultRunningShoeId and findDefaultWalkingShoeId; for RUNNING activity createByExternalId receives running default shoeId (or undefined if null); for WALKING activity receives walking default shoeId; when no default for type, shoeId undefined. (3) Idempotent re-sync: createByExternalId returns created false → no workout update (existing behaviour; no shoe change).
  - **Integration (DB):** (1) **Shoes** (`test/shoes.integration-spec.ts`): PATCH to set isDefaultForRunning true → only that shoe has isDefaultForRunning true in list; set another shoe as default for running → first cleared; same for walking; one shoe can be default for both; findDefaultRunningShoeId / findDefaultWalkingShoeId (or equivalent via list) reflect state. (2) **Strava** (`test/strava.integration-spec.ts`): Sync with default running shoe only → new running workout has that shoeId, new walking workout has no shoe; with default walking only → opposite; with both → each type gets correct shoe; with neither → no shoe on either. (3) Migration: after applying migration, existing user with one default shoe has that shoe with isDefaultForRunning and isDefaultForWalking true (test via seed or test-migration data).
- **Frontend tests:** Unit: update shoe form and overview specs if present to use new fields and badges. E2E (Cypress): update shoes and workouts fixtures and selectors — default badge selectors (e.g. `shoe-default-badge`) may become two (e.g. `shoe-default-running-badge`, `shoe-default-walking-badge`); sync modal warnings: two separate data-cy for "no default running" and "no default walking"; update expectations in `shoes.cy.ts` and `workouts.cy.ts`.
- **Contract tests / OpenAPI verification:** Optional; manual check of Swagger that Shoe response and update DTOs show new fields and no `isDefault`.

## 9. Acceptance Criteria Traceability
| AC ID | Implementation touchpoints | Test(s) / Verification |
|-------|----------------------------|-------------------------|
| AC-1 | Shoe edit (both flags), shoes overview grid badges | E2E or manual: set A default running, B default walking → grid shows correct badges. |
| AC-2 | Strava sync: assign by type | Integration: sync with both defaults set → running workout → default running shoe; walking → default walking shoe. |
| AC-3 | Sync: no default walking | Integration: default running only, import walking → workout has no shoe. |
| AC-4 | Migration backfill | Migration SQL + integration: user with previous default → that shoe isDefaultForRunning and isDefaultForWalking true. |
| AC-5 | Service clears previous default when setting new one | Unit + integration: set shoe B as default for running → shoe A no longer default for running. |
| AC-5b | Grid shows both badges when shoe is default for both | Frontend: grid component shows "Default Running" and "Default Walking" when both true. |
| AC-6 | Edit: set both flags on one shoe | Unit/integration: update with both true → only that shoe is default for both types. |
| AC-7 | Backend unit tests | Jest unit: shoes.service.spec, strava.service.spec (as in section 8). |
| AC-8 | Backend integration tests | Jest integration: shoes.integration-spec, strava.integration-spec (as in section 8). |
| AC-9 | Sync modal messages and badge labels | Frontend: two warnings (data-cy); grid/list labels "Default Running" and "Default Walking". |

## 10. Execution Sequence
1. **WP-1:** Update Prisma schema (add isDefaultForRunning, isDefaultForWalking; remove isDefault). Generate migration with backfill step. Run `npx prisma migrate dev --name replace_default_shoe_with_type_specific_defaults`. Run `npx prisma generate`. Update `prisma/test-migrations` if any set isDefault (e.g. 00003) to use new columns after migration.
2. **WP-2:** Backend shoes: ShoeResponseDto, UpdateShoeDto, ShoesService (update logic for both flags; findDefaultRunningShoeId, findDefaultWalkingShoeId). Remove findDefaultShoeId or replace usages with type-specific calls.
3. **WP-3:** StravaService.sync: get defaultRunningShoeId and defaultWalkingShoeId; in loop, pass shoeId from defaultRunningShoeId when workoutType is RUNNING, from defaultWalkingShoeId when WALKING.
4. **WP-4:** Verify OpenAPI/Swagger (backend run, check /api/docs).
5. **WP-5:** Frontend: Shoe model and UpdateShoePayload; ShoesService if it types the payload.
6. **WP-6:** ShoeFormComponent: two checkboxes and form controls; submit both flags.
7. **WP-7:** ShoesGridPartComponent and ShoesOverviewComponent (list): two badge types with labels "Default Running" and "Default Walking".
8. **WP-8:** WorkoutsOverviewComponent: sync modal — compute hasDefaultRunningShoe and hasDefaultWalkingShoe from shoes list; show two separate warning messages when respective default is missing.
9. **WP-9:** Backend unit tests (shoes.service.spec, strava.service.spec).
10. **WP-10:** Backend integration tests (shoes.integration-spec, strava.integration-spec); ensure migration backfill covered.
11. Run frontend E2E tests; update fixtures and selectors as needed (WP-8 and badge selectors).
12. Manual smoke: edit shoe defaults, run sync, check overview badges and sync messages.

## 11. Risks & Open Points (UNRESOLVED)
- None. Migration backfill is standard; behaviour is a direct extension of current default-shoe feature.

QUALITY GATE (before finishing):
- Every FR and AC from the requirement sheet is mapped to concrete work. ✅
- No architectural drift beyond setup-architecture.md. ✅
- No implementation details/code (plan only). ✅
- All uncertainties captured as UNRESOLVED with precise questions. N/A (no unresolved items.)
