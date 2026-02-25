# Backend Implementation Log – 10 – Strava Workout Sync

## 0. Inputs
- Requirement sheet: `.docs/tasks/10/1-requirement-10.md`
- Implementation plan: `.docs/tasks/10/2-plan-10.md`
- Architecture: `.docs/system/setup-architecture.md`
- Project rules: `.docs/system/project-rules.md`
- Backend & Prisma: `.docs/system/backend.md`

## 1. Scope Confirmation
- In scope (backend/db only): ✅
- Out of scope (frontend/iOS/etc): ✅
- Plan-following mode (no extras): ✅

## 2. Repo Patterns Used (References)
- Backend module pattern: `apps/backend/src/workouts/workouts.module.ts`, `shoes/shoes.module.ts`
- Controller pattern: `apps/backend/src/workouts/workouts.controller.ts` (ApiTags, ApiBearerAuth, RequestUser, Roles/Guards)
- Validation pattern: `class-validator` in DTOs; global ValidationPipe in `main.ts` (whitelist, forbidNonWhitelisted)
- Error handling pattern: NestJS HTTP exceptions (`BadRequestException`, `NotFoundException`, etc.) in services; no custom filter
- Prisma access pattern: `PrismaService` injected in services; used directly (no separate repository layer)
- Test pattern: Unit `*.spec.ts` with mocked `PrismaService`; integration `test/*.integration-spec.ts` with TestingModule, real PrismaModule, ConfigModule

## 3. Work Executed (Traceable to Plan)

### WP-1: Prisma schema and migration for Strava and sync
- Plan reference: §4 Data / Prisma Plan
- What changed: Added `StravaConnection` model; `User.lastStravaSyncAt`; `Workout.externalId` (unique, indexed). Migration created and applied.
- Files: `prisma/schema.prisma`, `prisma/migrations/20260225160000_add_strava_connection_and_workout_external_id/migration.sql`
- Notes: Migration was created manually (non-interactive env); `prisma migrate deploy` applies it.

### WP-2: Backend Strava module – OAuth and status
- Plan reference: §3.2 REST Endpoints
- What changed: New `StravaModule` with `StravaController`, `StravaService`. Endpoints: GET authorize-url, GET callback (public), GET status, GET last-sync, POST disconnect, POST sync. DTOs and JWT state for OAuth callback.
- Files: `src/strava/*`, `app.module.ts`
- Notes: Callback and webhook are @Public(); protected routes use @Roles(Role.USER) + RolesGuard.

### WP-3: Backend Strava API client and sync
- Plan reference: §3.2, §4
- What changed: StravaService uses native `fetch()` for token exchange, refresh, list activities, deauthorize. Sync filters running/walking, maps types, calls `WorkoutsService.createByExternalId` (idempotent). Updates `User.lastStravaSyncAt` on success. `WorkoutsService.createByExternalId` added.
- Files: `src/strava/strava.service.ts`, `src/strava/strava-api.types.ts`, `src/workouts/workouts.service.ts`, `src/workouts/workouts.module.ts`
- Notes: 502 BadGatewayException for Strava API/config failures.

### WP-4: OpenAPI and API contract
- Plan reference: §5 OpenAPI Plan
- What changed: All new DTOs have @ApiProperty; controller has @ApiTags('strava'), @ApiBearerAuth(), and per-route @Api*Response. No regeneration step; Swagger built from code at runtime.
- Files: All `src/strava/dto/*`, `src/strava/strava.controller.ts`

### WP-7: Backend unit tests
- Plan reference: §8 Testing Plan
- What changed: `strava.service.spec.ts` (mapping, status, lastSync, sync with mocks, webhook verify/event); `workouts.service.spec.ts` (createByExternalId idempotent and create path).
- Files: `src/strava/strava.service.spec.ts`, `src/workouts/workouts.service.spec.ts`

### WP-8: Backend integration tests
- Plan reference: §8
- What changed: `test/strava.integration-spec.ts` – status (connected true/false), sync with mocked fetch (import + lastStravaSyncAt, idempotent second sync), getLastSyncAt. Real DB; Strava HTTP mocked.
- Files: `test/strava.integration-spec.ts`

### WP-9: Strava deauthorization webhook
- Plan reference: §2 WBS WP-9, §3.2
- What changed: GET /api/strava/webhook (subscription verification), POST /api/strava/webhook (event handler). On athlete deauthorization (object_type=athlete, aspect_type=update, updates.authorized=false), delete StravaConnection by stravaAthleteId.
- Files: `src/strava/strava.controller.ts`, `src/strava/strava.service.ts`

## 4. Prisma / Database Changes

### 4.1 Schema changes
- **User:** added `lastStravaSyncAt` (DateTime?, optional).
- **StravaConnection (new):** id, userId (unique FK to User), stravaAthleteId, refreshToken, accessToken, expiresAt, createdAt, updatedAt. Table `strava_connections`.
- **Workout:** added `externalId` (String?, unique, indexed). Table `workouts` column `external_id`.

### 4.2 Migrations
- Migration: `20260225160000_add_strava_connection_and_workout_external_id`
- Commands run: Migration SQL created manually; `npx prisma generate`; `npx prisma migrate deploy` (to apply). For new env: `npx prisma migrate dev --name add_strava_connection_and_workout_external_id` (interactive) or `npx prisma migrate deploy`.

### 4.3 Seed/Test data
- No seed changes. Test migrations unchanged. Integration tests use existing thomas user and create/delete StravaConnection and workout with externalId as needed.

## 5. Backend Changes (NestJS)

### 5.1 Modules / Components touched
- **Modules:** New `StravaModule`. `WorkoutsModule` exports `WorkoutsService`. `AppModule` imports `StravaModule`.
- **Controllers:** New `StravaController` (authorize-url, callback, status, last-sync, disconnect, sync, webhook GET/POST).
- **Services:** New `StravaService` (OAuth, token refresh, activities fetch, sync, webhook handlers). `WorkoutsService`: added `createByExternalId` (idempotent by externalId).
- **Repositories / Prisma:** Prisma used in StravaService (StravaConnection, User) and WorkoutsService (Workout); no separate repository layer.

### 5.2 Endpoints implemented
| HTTP | Path | Purpose | AuthN/AuthZ | Request DTO | Response DTO | Error cases |
|------|-----|---------|-------------|-------------|--------------|-------------|
| GET | /api/strava/authorize-url | Strava OAuth URL | JWT, USER | — | AuthorizeUrlResponseDto | 502 config missing |
| GET | /api/strava/callback | OAuth callback, redirect to frontend | Public | Query: code, state | 302 redirect | 400 invalid code/state |
| GET | /api/strava/status | Connection status | JWT, USER | — | StravaStatusDto | 401 |
| GET | /api/strava/last-sync | Last sync date for modal default | JWT, USER | — | LastSyncResponseDto | 401 |
| POST | /api/strava/disconnect | Deauthorize and clear tokens | JWT, USER | — | void | 401 |
| POST | /api/strava/sync | Run sync from fromDate | JWT, USER | SyncRequestDto | SyncResponseDto | 400 invalid date/not connected, 401, 502 Strava |
| GET | /api/strava/webhook | Webhook subscription verification | Public | Query: hub.mode, hub.verify_token, hub.challenge | JSON hub.challenge | 403 |
| POST | /api/strava/webhook | Webhook event (deauthorization) | Public | Body (Strava payload) | 200 | — |

### 5.3 Validation & Error Handling
- **Validation:** SyncRequestDto: `fromDate` @IsDateString(). Service validates fromDate not in future. class-validator global pipe (main.ts) strips unknown fields.
- **Error mapping:** BadRequestException (400), UnauthorizedException (401), ForbiddenException (403), BadGatewayException (502). No custom filter; Nest built-in.
- **Logging:** StravaService logs warnings on token/webhook failures; no tokens or PII in logs.

## 6. OpenAPI / Contract Changes
- OpenAPI is generated at runtime from NestJS (Swagger at /api/docs). All new DTOs and routes have @ApiProperty and @Api* decorators. No separate spec file or client generation in repo. No changes to existing workout DTOs (externalId not exposed).

## 7. Tests

### Tests added/updated
- **Unit:** `src/strava/strava.service.spec.ts` – mapStravaTypeToWorkoutType (Run/Walk/Ride/etc.), getStatus, getLastSyncAt, sync (not connected, import + lastSync, skip non-run/walk, idempotent, future date), handleWebhookVerify, handleWebhookEvent. `src/workouts/workouts.service.spec.ts` – createByExternalId (create when no existing, skip when existing).
- **Integration:** `test/strava.integration-spec.ts` – getStatus (false/true), sync (import, lastStravaSyncAt, idempotent second sync), getLastSyncAt. Uses real MySQL and mocked fetch for Strava API.

### How to run
- Unit: `npm run test` (from `apps/backend`) or `npm run test --workspace=@zapatismo/backend` (from root). Excludes `*integration-spec*`.
- Integration: `npm run test:integration` (from `apps/backend`). Requires MySQL and DATABASE_URL; run `npx prisma migrate deploy` if migrations not yet applied.

### Coverage summary
- AC-3 (Strava API, running/walking, idempotent): unit sync tests + integration sync test.
- AC-5 (sync failure, last-sync not updated): unit test “throws when Strava not connected”; service does not update lastStravaSyncAt on throw.
- AC-7: All unit tests pass. AC-8: All integration tests pass after migration applied.

## 8. Acceptance Criteria Traceability

| AC ID | Implementation touchpoints (files/functions) | Tests / Verification |
|-------|-----------------------------------------------|----------------------|
| AC-1 | (Frontend) | Out of scope backend |
| AC-2 | GET /api/strava/last-sync; default 30 days in frontend | getLastSyncAt unit + integration |
| AC-3 | StravaService.sync, mapStravaTypeToWorkoutType, WorkoutsService.createByExternalId | strava.service.spec (mapping, sync, idempotent), workouts.service.spec (createByExternalId), strava.integration-spec (sync) |
| AC-4 | User.lastStravaSyncAt updated in StravaService.sync | Unit + integration sync tests |
| AC-5 | Sync throws on failure; lastStravaSyncAt only updated on success path | Unit test “throws when Strava not connected”; code path |
| AC-6 | GET status, GET authorize-url, POST disconnect; (frontend Settings) | Unit getStatus; integration status |
| AC-7 | Unit tests for Strava and Workouts | npm run test |
| AC-8 | Integration tests with DB and mocked Strava | npm run test:integration |

## 9. Change Summary

### Files added
- `prisma/migrations/20260225160000_add_strava_connection_and_workout_external_id/migration.sql`
- `apps/backend/src/strava/strava.module.ts`
- `apps/backend/src/strava/strava.controller.ts`
- `apps/backend/src/strava/strava.service.ts`
- `apps/backend/src/strava/strava.service.spec.ts`
- `apps/backend/src/strava/strava-api.types.ts`
- `apps/backend/src/strava/dto/authorize-url-response.dto.ts`
- `apps/backend/src/strava/dto/strava-status.dto.ts`
- `apps/backend/src/strava/dto/sync-request.dto.ts`
- `apps/backend/src/strava/dto/sync-response.dto.ts`
- `apps/backend/src/strava/dto/last-sync-response.dto.ts`
- `apps/backend/test/strava.integration-spec.ts`

### Files modified
- `prisma/schema.prisma` (User, Workout, StravaConnection)
- `apps/backend/src/app.module.ts` (import StravaModule)
- `apps/backend/src/workouts/workouts.module.ts` (exports WorkoutsService)
- `apps/backend/src/workouts/workouts.service.ts` (createByExternalId; toResponse optional externalId)
- `apps/backend/src/workouts/workouts.service.spec.ts` (createByExternalId tests)

### New/changed endpoints
- GET /api/strava/authorize-url, GET /api/strava/callback, GET /api/strava/status, GET /api/strava/last-sync, POST /api/strava/disconnect, POST /api/strava/sync, GET /api/strava/webhook, POST /api/strava/webhook.

### Prisma migrations
- `20260225160000_add_strava_connection_and_workout_external_id`

### Tests
- Unit: strava.service.spec.ts, workouts.service.spec.ts (extended). Integration: strava.integration-spec.ts.

## 10. Open Points / Risks
- [ ] **Migration in CI** – Ensure CI runs `prisma migrate deploy` before integration tests so the new migration is applied. Documented in backend.md.
- [ ] **Strava env in production** – STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_CALLBACK_URL, FRONTEND_URL, STRAVA_WEBHOOK_VERIFY_TOKEN must be set in production; callback URL must match Strava app settings.
- [ ] **Webhook URL** – For production, Strava webhook subscription must point to the public URL of GET/POST /api/strava/webhook; verification uses STRAVA_WEBHOOK_VERIFY_TOKEN.
