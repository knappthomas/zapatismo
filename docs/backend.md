# Zapatismo -- Backend & Prisma

This document describes the NestJS backend (`apps/backend/`) and Prisma setup (`prisma/`). It covers architecture, conventions, and guidance for future feature development. For the overall system architecture, see [setup-architecture.md](./setup-architecture.md). For project-wide rules, see [project-rules.md](./project-rules.md).

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Repository Layout](#2-repository-layout)
3. [Prisma & Database](#3-prisma--database)
4. [Backend Architecture](#4-backend-architecture)
5. [Authentication & Security](#5-authentication--security)
6. [REST URL Pattern](#6-rest-url-pattern)
7. [Adding a New Feature Module](#7-adding-a-new-feature-module)
8. [Environment Variables](#8-environment-variables)
9. [OpenAPI / Swagger](#9-openapi--swagger)

---

## 1. Quick Start

Prerequisites: Docker running (for MySQL), Node.js installed.

```bash
# 1. Start MySQL
cd misc/mysql && docker compose up -d && cd ../..

# 2. Install dependencies (from repo root)
npm install

# 3. Copy env files (if first time)
cp .env.development .env
cp apps/backend/.env.development apps/backend/.env

# 4. Run migrations and generate Prisma client
npm run prisma:migrate
npm run prisma:generate

# 5. Seed the admin user
npm run prisma:seed

# 6. Start the backend
cd apps/backend && npm run start:dev
```

The API is available at `http://localhost:3000/api` and Swagger UI at `http://localhost:3000/api/docs`.

---

## 2. Repository Layout

```
/
├── package.json                 # Root: npm workspaces, Prisma scripts
├── prisma/
│   ├── schema.prisma            # Database schema (single source of truth)
│   ├── seed.ts                  # Admin user seeder
│   └── migrations/              # Generated migration SQL files
├── apps/
│   └── backend/
│       ├── package.json         # NestJS dependencies and scripts
│       ├── tsconfig.json
│       ├── nest-cli.json
│       ├── .env.development     # Local dev config (JWT, DB, port)
│       └── src/
│           ├── main.ts          # Bootstrap, global prefix, Swagger, validation
│           ├── app.module.ts    # Root module (imports, global guard)
│           ├── prisma/          # PrismaModule (global)
│           ├── auth/            # AuthModule (JWT, guards, decorators)
│           └── users/           # UsersModule (user CRUD)
└── docs/
```

The root `package.json` uses npm workspaces (`"workspaces": ["apps/*"]`) so that shared dependencies (notably `@prisma/client`) are hoisted to root `node_modules/`. This means `prisma generate` at the root produces a client that both the seed script and the backend can resolve.

---

## 3. Prisma & Database

### Schema location

The Prisma schema lives at `prisma/schema.prisma` in the repo root. This is the single source of truth for the database structure.

### Conventions

- **Table names:** `snake_case`, mapped with `@@map("table_name")`.
- **Column names:** `snake_case` in the database, mapped with `@map("column_name")`. Prisma model fields use `camelCase`.
- **IDs:** Auto-incrementing integers (`@id @default(autoincrement())`).
- **Timestamps:** Every model includes `createdAt` and `updatedAt` with `@default(now())` and `@updatedAt`.
- **Enums:** Defined in Prisma and imported in TypeScript via `@prisma/client`.

### Workflow for schema changes

1. Edit `prisma/schema.prisma`.
2. Run `npm run prisma:migrate` (prompts for a migration name).
3. Prisma generates a SQL migration file in `prisma/migrations/`.
4. Run `npm run prisma:generate` to update the TypeScript client.
5. Commit the schema change **and** the migration file together.

Never edit an already-applied migration file. Fix forward with a new migration.

### Seed

`prisma/seed.ts` creates the initial admin user. It is idempotent (upserts by email) and reads `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from the environment, falling back to dev defaults.

Run it with:

```bash
npm run prisma:seed
```

### Prisma Studio

For interactive database browsing during development:

```bash
npm run prisma:studio
```

---

## 4. Backend Architecture

### Module structure

The backend follows NestJS module conventions. Each domain area is a self-contained module with its own controller, service, and DTOs.

```
src/
├── main.ts              # App bootstrap
├── app.module.ts        # Root module
├── prisma/              # Global database access
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── auth/                # Authentication (JWT)
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/      # Passport strategies
│   ├── guards/          # JwtAuthGuard, RolesGuard
│   ├── decorators/      # @Public(), @Roles()
│   └── dto/
└── users/               # User management
    ├── users.module.ts
    ├── users.controller.ts
    ├── users.service.ts
    └── dto/
```

### PrismaModule

`PrismaModule` is registered as a `@Global()` module, making `PrismaService` injectable anywhere without explicit imports. `PrismaService` extends `PrismaClient` and handles connection lifecycle via `OnModuleInit` / `OnModuleDestroy`.

### Key principles

- **Controllers** handle HTTP concerns only: routing, validation, status codes, Swagger decorators. No business logic.
- **Services** contain all domain logic and database access via `PrismaService`.
- **DTOs** define request/response shapes. Prisma models are never exposed directly in API responses. Every public-facing DTO explicitly lists its fields, excluding sensitive data like `passwordHash`.
- **Validation** is handled globally via `ValidationPipe` in `main.ts` with `whitelist: true` and `forbidNonWhitelisted: true`, so unknown fields are stripped and rejected automatically.

### Configuration

Environment variables are loaded via `@nestjs/config` (`ConfigModule.forRoot()`), configured as a global module. The load order is `.env` first, then `.env.development` as fallback. Access config values via `ConfigService` injection.

---

## 5. Authentication & Security

### Strategy: JWT (stateless)

Authentication uses JSON Web Tokens, which fits the stateless backend principle. There is no server-side session storage.

### How it works

1. Client sends `POST /api/auth/login` with `{ email, password }`.
2. `AuthService` looks up the user by email and compares the password against the stored bcrypt hash.
3. On success, a JWT is signed with the payload `{ sub: userId, email, role }` and returned as `{ accessToken }`.
4. The client includes `Authorization: Bearer <token>` on all subsequent requests.
5. `JwtStrategy` (Passport) extracts and validates the token. On success, `request.user` is populated with `{ id, email, role }`.

### Secure by default

`JwtAuthGuard` is registered as a **global guard** via `APP_GUARD` in `AppModule`. This means every endpoint requires a valid JWT unless explicitly opted out.

To make an endpoint public, apply the `@Public()` decorator:

```typescript
import { Public } from '../auth/decorators/public.decorator';

@Public()
@Post('login')
async login(@Body() dto: LoginDto) { ... }
```

The guard checks for the `isPublic` metadata key. If present and `true`, JWT validation is skipped.

### Role-based access

For admin-only endpoints, use the `@Roles()` decorator together with `RolesGuard`:

```typescript
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

@Post()
@Roles(Role.ADMIN)
@UseGuards(RolesGuard)
async create(@Body() dto: CreateUserDto) { ... }
```

`RolesGuard` reads the required roles from decorator metadata and compares them against `request.user.role` (set by `JwtStrategy`). If no `@Roles()` decorator is present, the guard allows access (JWT authentication still applies).

### Password handling

- Passwords are hashed with `bcrypt` (10 salt rounds) before storage.
- `passwordHash` is never included in API responses. The `UserResponseDto` explicitly lists only safe fields.
- Login error messages are intentionally generic ("Invalid credentials") to avoid revealing whether an email exists.

### User registration

Registration is closed. Only an authenticated admin can create new users via `POST /api/users`. The first admin is bootstrapped via the Prisma seed script.

---

## 6. REST URL Pattern

### Global prefix

All routes are prefixed with `/api`, set in `main.ts` via `app.setGlobalPrefix('api')`.

### Current endpoints

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| `POST` | `/api/auth/login` | Public | Authenticate, receive JWT |
| `GET` | `/api/users` | Admin only | List all users |
| `GET` | `/api/users/:id` | Authenticated | Get user by ID |
| `POST` | `/api/users` | Admin only | Create a new user |

### Access levels

| Level | Mechanism | When to use |
|-------|-----------|-------------|
| **Public** | `@Public()` decorator | Unauthenticated endpoints (login, health checks, public data) |
| **Authenticated** | Default (global `JwtAuthGuard`) | Any endpoint accessible to logged-in users |
| **Role-restricted** | `@Roles(Role.ADMIN)` + `@UseGuards(RolesGuard)` | Endpoints limited to specific roles |

New endpoints are protected by default. You only need to add decorators when deviating from the default (making something public or restricting by role).

---

## 7. Adding a New Feature Module

When adding a new domain area (e.g., workouts, shoes), follow this pattern:

### 1. Define the Prisma model

Edit `prisma/schema.prisma`, then migrate:

```bash
npm run prisma:migrate    # enter a descriptive name
npm run prisma:generate   # regenerate the TypeScript client
```

### 2. Create the module structure

```
src/your-feature/
├── your-feature.module.ts
├── your-feature.controller.ts
├── your-feature.service.ts
└── dto/
    ├── create-your-feature.dto.ts
    └── your-feature-response.dto.ts
```

### 3. Implement the components

- **DTO (request):** Use `class-validator` decorators (`@IsString()`, `@IsNotEmpty()`, etc.) and `@ApiProperty()` for Swagger.
- **DTO (response):** Explicit fields only -- never pass through Prisma models. Add `@ApiProperty()`.
- **Service:** Inject `PrismaService` (available globally). Put all business logic here.
- **Controller:** Inject the service. Add route decorators, Swagger decorators, and access control (`@Roles()` / `@UseGuards(RolesGuard)` if needed, `@Public()` if the endpoint should be unauthenticated).
- **Module:** Register controller and service. Export the service if other modules need it.

### 4. Register the module

Import the new module in `app.module.ts`:

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '.env.development'] }),
    PrismaModule,
    AuthModule,
    UsersModule,
    YourFeatureModule,  // add here
  ],
  // ...
})
export class AppModule {}
```

### 5. Verify

- Build: `npm run build` (from `apps/backend/`)
- Check Swagger: `http://localhost:3000/api/docs`
- Commit the migration file alongside the code changes.

---

## 8. Environment Variables

### Root `.env.development`

| Variable | Purpose | Default |
|----------|---------|---------|
| `DATABASE_URL` | MySQL connection string for Prisma | `mysql://root:root@localhost:3306/zapatismo` |
| `SEED_ADMIN_EMAIL` | Email for the seeded admin user | `admin@zapatismo.local` |
| `SEED_ADMIN_PASSWORD` | Password for the seeded admin user | `admin123` |

### Backend `apps/backend/.env.development`

| Variable | Purpose | Default |
|----------|---------|---------|
| `DATABASE_URL` | MySQL connection string | `mysql://root:root@localhost:3306/zapatismo` |
| `JWT_SECRET` | Secret key for signing JWTs | `dev-jwt-secret-change-in-production` |
| `JWT_EXPIRATION` | Token lifetime | `1h` |
| `PORT` | HTTP listen port | `3000` |

For local development, copy `.env.development` to `.env` in both the root and `apps/backend/`. The `.env` files are gitignored; `.env.development` files are committed as safe local defaults.

In production, all variables must be set via real environment variables. Never commit production secrets.

---

## 9. OpenAPI / Swagger

Swagger is configured in `main.ts` using `@nestjs/swagger`. The Swagger UI is available at `/api/docs` when the backend is running.

All DTOs use `@ApiProperty()` (or `@ApiPropertyOptional()`) decorators so that the OpenAPI spec is auto-generated from the code. The spec includes Bearer auth via `addBearerAuth()` in the Swagger config, enabling the "Authorize" button in the UI for testing protected endpoints.

When adding or modifying endpoints:

1. Add Swagger decorators to the controller (`@ApiTags`, `@ApiOkResponse`, `@ApiCreatedResponse`, etc.).
2. Add `@ApiProperty()` to every DTO field.
3. Add `@ApiBearerAuth()` to controllers with protected endpoints.
4. Verify the spec at `/api/docs` after changes.

The OpenAPI spec should be kept in sync with the codebase at all times and regenerated/committed when the API changes.
