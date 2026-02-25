# Implementation Plan – 6 – Shoe Management in Backoffice (Normal User)

## 0. Scope Check

- Requirement sheet present and reviewed: ✅
- Fits Zapatismo architecture constraints: ✅
- **In-Scope summary (bullets):**
  - Backend: Shoe entity (Prisma), REST CRUD API (list/create/get/update/delete), USER-only access, validation and DTOs, OpenAPI in sync, unit and integration tests.
  - Frontend: "Shoes" menu item (visible only to USER), shoes overview (grid + list), Add Shoe / Edit / Delete with confirmation, shoe form with photo URL, brand, name, buying date, location, km target; input limits 75 chars and 100000 km; Cypress Component Test block for validation limits.
  - Database: Shoe model with per-user ownership; schema enforces max lengths and km target cap.
  - **Test data (obligatory):** Shoe test data via Prisma test-migrations, using the existing USER from `prisma/test-migrations/00002_thomas_user.ts` (thomas@zapatismo.local / thomas) as owner; new test-migration adds shoes for this user so integration and E2E tests can rely on it.
- **Out-of-Scope summary (bullets):**
  - Linking shoes to workouts; "distance done" per shoe; admin seeing/managing shoes; iOS app changes; photo upload (URL only); redesign of existing backoffice beyond new menu and routes.
- **Key assumptions (only if explicitly stated in requirements):**
  - "Normal user" = role USER; admin (ADMIN) does not see Shoes menu and must not access shoe endpoints (403 or equivalent).
  - Buying date: required unless product decision says otherwise (requirement lists it in form; validation table says "optional or required per product decision" — implement as required; can be relaxed later).
- **UNRESOLVED items blocking implementation (if any):** None.

---

## 1. Architecture Mapping (High-Level)

| Layer | Responsibility for this ticket | Notes |
|-------|--------------------------------|-------|
| Angular (apps/frontend) | Shoes menu (USER only), shoes overview (grid/list), create/edit/delete flows, form validation (maxlength 75, max 100000), delete confirmation; Cypress Component Test block for validation. | New feature under `features/shoes/`; route guarded for USER only; navbar conditional on `hasRole('USER')`. |
| Backend (apps/backend, NestJS) | Shoe CRUD API; USER-only access via @Roles(Role.USER) + RolesGuard; validation at boundary; per-user ownership (filter by request.user.id). | New ShoesModule; no business logic in controller. |
| Database (MySQL via Prisma) | Shoe table with user relation; column constraints for string length (75) and km target (e.g. max 100000). | Prisma Migrate only. |
| OpenAPI contract | New DTOs and endpoints for shoes; spec regenerated from NestJS/Swagger. | @ApiProperty on DTOs; @ApiTags, @ApiBearerAuth on controller. |
| Docker/Compose | No change. | — |
| iOS (apps/app-ios) | No change. | Out of scope. |

---

## 2. Work Breakdown Structure (WBS)

- **WP-1: Prisma schema and migration (Shoe model)**
  - Goal: Add Shoe model with ownership and constraints.
  - Affected area(s): prisma
  - Depends on: —
  - Deliverables: `prisma/schema.prisma` updated; migration created and committed; Prisma client regenerated.

- **WP-1b: Test data – shoes for thomas user (obligatory)**
  - Goal: Add obligatory shoe test data via test-migrations, using the existing USER from `00002_thomas_user.ts` (thomas@zapatismo.local, role USER) as owner.
  - Affected area(s): prisma/test-migrations
  - Depends on: WP-1
  - Deliverables: New test-migration file (e.g. `00003_shoes_for_thomas.ts`) that creates one or more Shoe records for the thomas user (look up user by email thomas@zapatismo.local, then create shoes). Integration and E2E tests use this data; run `npm run prisma:test-migrations` in dev/stage to apply.

- **WP-2: Backend Shoes module (DTOs, service, controller)**
  - Goal: Implement shoe CRUD API with validation and USER-only access.
  - Affected area(s): backend, openapi (via Swagger decorators)
  - Depends on: WP-1
  - Deliverables: ShoesModule, ShoesController, ShoesService, DTOs (create/update/response); endpoints registered in AppModule; OpenAPI reflects new API.

- **WP-3: Backend unit tests (ShoesService)**
  - Goal: Cover shoe service logic with mocked Prisma.
  - Affected area(s): backend
  - Depends on: WP-2
  - Deliverables: `shoes.service.spec.ts` with tests for create, findAll, findOne, update, delete; not-found and ownership checks; validation-related behaviour where exercised by service.

- **WP-4: Backend integration tests (shoe + DB/HTTP)**
  - Goal: At least one integration test covering shoe persistence or shoe HTTP.
  - Affected area(s): backend
  - Depends on: WP-2, WP-1b
  - Deliverables: New or extended `*.integration-spec.ts` (e.g. shoe CRUD or list with real DB); preconditions: MySQL, DATABASE_URL, test-migrations applied (thomas user + shoe data from `00002_thomas_user.ts` and `00003_shoes_for_thomas.ts`).

- **WP-5: Frontend route and guard (USER-only shoes)**
  - Goal: Route /shoes and guard so only USER can access; ADMIN redirected.
  - Affected area(s): frontend
  - Depends on: —
  - Deliverables: `userGuard` (allow only USER, redirect ADMIN to /dashboard); route `shoes` with userGuard; optional redirect for `/shoes` when not USER.

- **WP-6: Frontend navbar (Shoes link for USER only)**
  - Goal: Show "Shoes" in menu only for role USER.
  - Affected area(s): frontend
  - Depends on: —
  - Deliverables: Navbar link "Shoes" with `@if (auth.hasRole('USER'))`.

- **WP-7: Frontend shoes feature (overview, form, delete)**
  - Goal: Shoes overview (grid + list), Add Shoe, Edit, Delete with confirmation; form with photo URL, brand, name, buying date, location, km target; frontend validation (maxlength 75, max 100000).
  - Affected area(s): frontend
  - Depends on: WP-2, WP-5, WP-6
  - Deliverables: `features/shoes/` (overview component, form component or create/edit pages, delete confirmation); ShoesService; Shoe model; form validators and input constraints.

- **WP-8: Cypress E2E (Component Test block for shoe validation)**
  - Goal: Component Test block for shoe form: max length 75 (name, brand), max value 100000 (km target); no real server required.
  - Affected area(s): frontend (cypress)
  - Depends on: WP-7
  - Deliverables: `cypress/e2e/shoes/shoes.cy.ts` with "Component Test" describe block; tests for field length and km cap; page object under `po/` if needed.

- **WP-9: OpenAPI and contract verification**
  - Goal: OpenAPI spec in sync; no persistence details exposed.
  - Affected area(s): openapi (backend)
  - Depends on: WP-2
  - Deliverables: Spec regenerated/verified; DTOs only in responses.

---

## 3. Backend Plan (NestJS)

### 3.1 Modules / Components to touch

- **Module(s):** New `ShoesModule` (`src/shoes/shoes.module.ts`).
- **Controller(s):** New `ShoesController` (`src/shoes/shoes.controller.ts`).
- **Service(s):** New `ShoesService` (`src/shoes/shoes.service.ts`).
- **Repository/Prisma access layer:** `PrismaService` (global); no separate repository layer (service uses Prisma directly per existing pattern).

### 3.2 REST Endpoints

| HTTP | Path | Purpose | Request DTO | Response DTO | AuthN/AuthZ | Errors |
|------|------|---------|--------------|--------------|-------------|--------|
| GET | /api/shoes | List shoes for authenticated user | — | ShoeResponseDto[] | JWT + Role USER | 401, 403 |
| POST | /api/shoes | Create shoe | CreateShoeDto | ShoeResponseDto | JWT + Role USER | 400, 401, 403 |
| GET | /api/shoes/:id | Get one shoe (owner only) | — | ShoeResponseDto | JWT + Role USER | 401, 403, 404 |
| PATCH | /api/shoes/:id | Update shoe (owner only) | UpdateShoeDto | ShoeResponseDto | JWT + Role USER | 400, 401, 403, 404 |
| DELETE | /api/shoes/:id | Delete shoe (owner only) | — | 204 or void | JWT + Role USER | 401, 403, 404 |

Rules:

- All endpoints require authentication and **role USER** via `@Roles(Role.USER)` and `RolesGuard`; ADMIN receives 403.
- Stateless REST only; no business logic in controller beyond orchestration/validation.
- Use explicit DTOs; do not expose Prisma entities.

### 3.3 Validation & Error Handling

- **Input validation approach:** class-validator on CreateShoeDto and UpdateShoeDto (e.g. @IsUrl, @IsString, @MaxLength(75), @IsInt, @Min(0), @Max(100000), @IsDateString or equivalent for buying date); ValidationPipe (global) with whitelist/forbidNonWhitelisted.
- **Domain validation approach:** In service: ensure shoe belongs to requesting user for get/update/delete; return 404 when not found or not owner (do not leak existence to non-owners if desired; 404 is acceptable).
- **Error mapping (HTTP status + payload shape):** 400 for validation errors (NestJS default validation response); 401 unauthenticated; 403 wrong role (e.g. ADMIN); 404 shoe not found or not owner; consistent error shape with existing backend.
- **Logging/Auditing:** Log access failures/errors; do not log full request bodies (PII).

---

## 4. Data / Prisma Plan

### 4.1 Prisma schema changes

- **Models to add:** `Shoe`.
  - Fields (conceptual): `id` (Int, PK, autoincrement), `userId` (Int, FK to User), `photoUrl` (String, required), `brandName` (String, max 75), `shoeName` (String, max 75), `buyingDate` (DateTime or Date), `buyingLocation` (String, optional or required per product; suggest String?), `kilometerTarget` (Int, 0–100000), `createdAt`, `updatedAt`.
  - Relation: `Shoe.user` → `User`; `User.shoes` → `Shoe[]`.
- **Relations/indices:** Index on `userId` for list-by-user queries; unique not required.
- **Backfill / defaults:** None.

### 4.2 Migration steps

- **Migration name suggestion:** `add_shoe_model` or `create_shoe_table`.
- **Steps:** Edit `prisma/schema.prisma` → run `npx prisma migrate dev --name add_shoe_model` → run `npx prisma generate` → commit migration + schema.
- **Seed/test data impact (obligatory):** Add a **new test-migration** (e.g. `00003_shoes_for_thomas.ts`) that creates shoe(s) for the existing thomas user from `prisma/test-migrations/00002_thomas_user.ts` (thomas@zapatismo.local, role USER). Look up user by email, then create one or more Shoe records. Integration and E2E tests must use this data; run `npm run prisma:test-migrations` in dev/stage to apply. Not in production.

Rules: Prisma Migrate only; no manual SQL. Test-migrations are data-only (dev/stage only).

---

## 5. OpenAPI / Contract Plan

- **How the OpenAPI spec changes:** New tag `shoes`; new paths `/api/shoes` (GET, POST) and `/api/shoes/:id` (GET, PATCH, DELETE); new schemas for CreateShoeDto, UpdateShoeDto, ShoeResponseDto (photoUrl, brandName, shoeName, buyingDate, buyingLocation, kilometerTarget, id, userId if exposed, createdAt, updatedAt — no internal persistence details).
- **Regeneration steps:** OpenAPI is generated from NestJS at runtime and via Swagger UI at `/api/docs`; ensure all DTOs have @ApiProperty / @ApiPropertyOptional and controller has @ApiTags('shoes'), @ApiBearerAuth(), and response decorators; export spec if project has a step to dump it (e.g. build or script); commit any versioned spec file if applicable.
- **Client impact:** Frontend uses typed models aligned with DTOs (hand-typed or future OpenAPI client); no breaking change to existing endpoints.

---

## 6. Frontend Plan (Angular)

### 6.1 UX / Screens / Routes

- **Screens affected:** New: shoes overview (grid/list), shoe form (create/edit), delete confirmation (modal or inline).
- **Routes affected:** New child under layout: `path: 'shoes'` → shoes overview; optional `shoes/new`, `shoes/:id/edit` or single form with mode; route protected with authGuard + userGuard.
- **Components to add/modify:** New: `features/shoes/` (e.g. shoe-list or shoes-overview component, shoe-form component); navbar component (add link).

### 6.2 Data flow

- **Services / API client usage:** New `ShoesService` in `core/services/` (or equivalent): getList(), getOne(id), create(dto), update(id, dto), delete(id); use `environment.apiUrl` and HttpClient; auth interceptor attaches JWT.
- **State management approach:** Component-level state (signals or local state) for list, selected shoe, view mode (grid/list); no global store required.
- **Error display patterns:** Show API validation/error messages in form or toast/alert consistent with existing app (e.g. daisyUI alert); 403/404 handled with clear message.

### 6.3 Frontend validations

| Validation | Location (Frontend/Backend) | Rationale |
|------------|----------------------------|-----------|
| Max length 75 (shoe name, brand) | Both | Frontend: maxlength + reactive validation for early feedback; Backend: MUST validate (FR-17). |
| Max value 100000 (km target) | Both | Frontend: input max + reactive validation; Backend: MUST validate (FR-18). |
| Photo URL required, valid URL | Both | Frontend: required + pattern/url validator; Backend: MUST validate (FR-16, FR-7). |
| Buying date format/required | Both | Frontend: date input + required; Backend: MUST validate. |

---

## 7. iOS App Plan (ONLY if required)

Not applicable. No iOS changes in this ticket.

---

## 8. Testing Plan

- **Backend tests (required):**
  - **Unit:** Cover `ShoesService`: create (success, validation delegated to DTO); findAll (returns only current user's shoes, mocked Prisma); findOne (success, not found, not owner → 404); update (success, not found, not owner); delete (success, not found, not owner). Use mocked PrismaService; no real DB. File: `apps/backend/src/shoes/shoes.service.spec.ts`.
  - **Integration (DB):** At least one integration test that touches the database or HTTP layer for shoes: e.g. list shoes for thomas user, or create/get/update/delete with thomas. **Preconditions (obligatory):** MySQL running, DATABASE_URL set; **test-migrations applied** so that `00002_thomas_user.ts` (thomas@zapatismo.local / thomas) and the new shoe test-migration (e.g. `00003_shoes_for_thomas.ts`) have run. Use thomas user (and his shoe data) for assertions. File: extend existing `test/database.integration-spec.ts` or add `test/shoes.integration-spec.ts`.
- **Frontend tests:**
  - **Unit:** Optional for components/services per project norms; not explicitly required by requirement sheet beyond Cypress.
  - **E2E (Cypress):** New spec `cypress/e2e/shoes/shoes.cy.ts`. **Component Test** describe block: tests that verify shoe name and brand accept at most 75 characters and kilometer target ≤ 100000; no real server required. **e2e/fixtures**: use fixture data as needed. **e2e/smoke**: if adding a real shoes flow, use **thomas user** (thomas@zapatismo.local / thomas) and rely on shoe data from test-migrations (project allows one smoke in login; shoes e2e can be fixtures-only or add smoke per project rules).
- **Contract/OpenAPI:** Verify at `/api/docs` that shoe endpoints and DTOs appear correctly; no formal contract test required unless repo already has one.

---

## 9. Acceptance Criteria Traceability

| AC ID | Implementation touchpoints | Test(s) / Verification |
|-------|----------------------------|-------------------------|
| AC-1 | Route /shoes, userGuard, Shoes overview component | Manual or E2E: login as USER, click Shoes, see overview (grid or list default). |
| AC-2 | Overview component: grid/list toggle, display photo + key info | Manual or E2E: switch view; assert both show photo and info. |
| AC-3 | Add Shoe button, create form, ShoesService.create, backend POST | E2E (fixtures or smoke): submit valid data; assert shoe in list. |
| AC-4 | Edit action, form prefill, ShoesService.update, backend PATCH | E2E or manual: edit and save; overview reflects changes. |
| AC-5 | Delete action, confirmation, ShoesService.delete, backend DELETE | E2E or manual: delete with confirm; shoe removed from list. |
| AC-6 | Confirmation modal/page: cancel button | E2E or manual: trigger delete, cancel; shoe still present. |
| AC-7 | Backend validation (400), frontend form errors | Unit (service/validation), E2E fixtures: invalid payload → error message. |
| AC-8 | ShoesService unit tests | Run backend unit tests; all pass including shoes. |
| AC-9 | Shoe integration test (DB or HTTP) | Run backend integration tests (test-migrations applied: thomas user + shoe data); all pass including shoe test. |
| AC-10 | Prisma schema: String(75), Int range/check for km | Migration + schema review; optional integration test inserting over limit (expect DB or app error). |
| AC-11 | Frontend form: maxlength 75, max 100000 | Cypress Component Test: assert input attributes/validation. |
| AC-12 | Cypress Component Test block for shoes | Run Cypress Component Test block in shoes.cy.ts; includes max length and max value checks. |

---

## 10. Execution Sequence

1. **Prisma:** Add `Shoe` model to `schema.prisma`; run `npx prisma migrate dev --name add_shoe_model`; run `npx prisma generate`. Commit schema + migration.
2. **Test data (obligatory):** Add `prisma/test-migrations/00003_shoes_for_thomas.ts` (or next lexicographic name) that creates shoe(s) for the user from `00002_thomas_user.ts` (thomas@zapatismo.local). In dev/stage run `npm run prisma:test-migrations` to apply. Commit the new test-migration file.
3. **Backend:** Create ShoesModule (DTOs, ShoesService, ShoesController); register in AppModule; implement USER-only access and per-user ownership; add Swagger decorators. Verify `/api/docs` and manual API test.
4. **Backend tests:** Add `shoes.service.spec.ts` (unit); add or extend integration spec for shoes (DB or HTTP), using thomas user and shoe test data from test-migrations. Run unit and integration test commands.
5. **Frontend guard and route:** Add `userGuard` (USER only, redirect ADMIN to /dashboard); add route `shoes` with authGuard + userGuard and lazy-loaded component(s).
6. **Frontend navbar:** Add "Shoes" link with `@if (auth.hasRole('USER'))`.
7. **Frontend shoes feature:** Implement ShoesService and Shoe model; overview (grid/list), form (create/edit), delete with confirmation; form validation and input constraints (maxlength 75, max 100000).
8. **Cypress:** Add `cypress/e2e/shoes/shoes.cy.ts` with Component Test block for max length and max value; add page object if needed; add fixtures under `cypress/fixtures/shoes/` if needed for e2e blocks.
9. **OpenAPI:** Confirm spec is in sync; commit if spec is versioned.
10. **Full verification:** Run backend unit + integration tests (integration tests require test-migrations applied: thomas user + shoe data); run Cypress (Component Test and e2e as applicable); manual check for ADMIN (no Shoes link, 403 on shoe API) and USER (full flow; can use thomas@zapatismo.local / thomas and existing shoe data).

---

## 11. Risks & Open Points (UNRESOLVED)

- [ ] None at this time. Photo URL format (e.g. strict URL validator) is an implementation detail; use @IsUrl or equivalent and document in DTO.

---

*End of Implementation Plan – Ticket 6*
