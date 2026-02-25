# Zapatismo Backend

NestJS REST API for the Zapatismo monorepo. Stateless, MySQL-backed, with JWT auth and OpenAPI (Swagger) documentation.

**Full documentation:** [.docs/system/backend.md](../../.docs/system/backend.md) and [.docs/system/setup-architecture.md](../../.docs/system/setup-architecture.md).

---

## Quick start

**Prerequisites:** Docker (for MySQL), Node.js. Dependencies are installed from the **repo root** (npm workspaces).

```bash
# 1. Start MySQL (from repo root)
cd misc/mysql && docker compose up -d && cd ../..

# 2. Install dependencies (from repo root)
npm install

# 3. Copy env files (first time only)
cp .env.development .env
cp apps/backend/.env.development apps/backend/.env

# 4. Migrations and Prisma client (from repo root)
npm run prisma:migrate
npm run prisma:generate

# 5. Seed admin user (from repo root)
npm run prisma:seed

# 6. Start the backend
cd apps/backend && npm run start:dev
```

- **API:** `http://localhost:3000/api`
- **Swagger UI:** `http://localhost:3000/api/docs`

Default seeded admin: `admin@zapatismo.local` / `admin123` (see `.env.development`).

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run start:dev` | Start with watch (hot reload) |
| `npm run start` | Start once |
| `npm run start:prod` | Run built app (`node dist/main`) |
| `npm run build` | Compile to `dist/` |
| `npm run lint` | ESLint (if configured) |
| `npm run test` | Run **unit** tests (Jest; no DB required) |
| `npm run test:integration` | Run **integration** tests (Jest; requires MySQL) |
| `npm run test:watch` | Unit tests in watch mode |
| `npm run test:cov` | Unit tests with coverage |

Prisma commands (`migrate`, `generate`, `seed`, `reset`, `studio`, `test-migrations`) are run from the **repo root** via root `package.json`.

## Running tests

- **Unit tests:** `npm run test` (from `apps/backend`). No database or other services required.
- **Integration tests:** `npm run test:integration` (from `apps/backend`). **MySQL must be running** and reachable via `DATABASE_URL` (e.g. start with `docker compose up -d` in `misc/mysql` from repo root, and ensure `.env` or `.env.development` sets `DATABASE_URL`). Integration tests use the same database config as development; use a separate DB or test DB name if you want to avoid touching dev data.

---

## Structure

- **`src/main.ts`** — Bootstrap, global `/api` prefix, Swagger, validation pipe.
- **`src/app.module.ts`** — Root module; global `JwtAuthGuard` (all routes require JWT unless `@Public()`).
- **`src/prisma/`** — Global `PrismaModule` / `PrismaService` (DB access).
- **`src/auth/`** — Login, JWT strategy, guards, `@Public()`, `@Roles()`, DTOs.
- **`src/users/`** — User CRUD; admin-only create/list, authenticated get-by-id.

Controllers handle HTTP only; services hold domain logic. DTOs define request/response shapes; Prisma models are not exposed. Validation is global (`class-validator` + `ValidationPipe` with `whitelist` / `forbidNonWhitelisted`).

---

## API overview

| Method | Path | Access |
|--------|------|--------|
| `POST` | `/api/auth/login` | Public |
| `GET`  | `/api/users` | Admin only |
| `GET`  | `/api/users/:id` | Authenticated |
| `POST` | `/api/users` | Admin only |

Use **Swagger** at `/api/docs` to try endpoints (Authorize with the JWT from login).

---

## Environment

See `apps/backend/.env.development` for local defaults. Copy to `.env` and override as needed. Main variables:

- `DATABASE_URL` — MySQL connection string.
- `JWT_SECRET` — Signing key for JWTs.
- `JWT_EXPIRATION` — e.g. `1h`.
- `PORT` — Listen port (default `3000`).

Never commit production secrets; use real environment variables in production.

---

## Adding a new feature

1. Define the model in **`prisma/schema.prisma`** (at repo root), then `npm run prisma:migrate` and `npm run prisma:generate`.
2. Add a module under `src/<feature>/` (module, controller, service, DTOs).
3. Register the module in `app.module.ts`.
4. Use `@ApiProperty()` on DTOs and Swagger decorators on controllers; keep OpenAPI in sync.

Details and conventions: [.docs/system/backend.md](../../.docs/system/backend.md#7-adding-a-new-feature-module).
