# Zapatismo – Agent Instructions

## Cursor Cloud specific instructions

### Architecture overview

3-tier monorepo: Angular frontend (`apps/frontend`, port 4200) → NestJS backend (`apps/backend`, port 3000) → MySQL 8.0 (Docker, port 3306). See `.docs/system/setup-architecture.md` for full details.

### Running services

**MySQL** must be running before the backend starts. Start it with:

```bash
sudo dockerd &>/tmp/dockerd.log &   # only if Docker daemon isn't already running
sleep 3
cd misc/mysql && sudo docker compose up -d && cd ../..
```

Wait for MySQL to be healthy before proceeding (~5–10 seconds).

**Environment files**: Copy `.env.development` → `.env` at both root and `apps/backend/` levels. These are already committed with dev defaults (localhost DB, dev JWT secret).

```bash
cp .env.development .env
cp apps/backend/.env.development apps/backend/.env
```

**Prisma**: After env files are in place and MySQL is up, generate the client and run migrations:

```bash
npx prisma generate
npx prisma migrate dev
npx prisma db seed   # seeds admin user: admin@zapatismo.local / admin123
```

**Backend** (dev mode): `cd apps/backend && npm run start:dev` — runs on port 3000 with hot reload. Swagger UI at `http://localhost:3000/api/docs`.

**Frontend** (dev mode): `cd apps/frontend && npx ng serve --host 0.0.0.0` — runs on port 4200, proxies `/api` to backend via `proxy.conf.json`.

### Gotchas

- **No ESLint config or Jest installed**: The backend `package.json` has `lint` and `test` scripts, but ESLint is not in devDependencies and there is no ESLint config file. Jest is also not in devDependencies, and there are no test files. These scripts are placeholders for future use.
- **npm workspaces**: The repo uses npm workspaces. Run `npm install` from root — it hoists all workspace dependencies. Do not run `npm install` inside individual app directories.
- **Prisma seed deprecation warning**: The `package.json#prisma` config for seeding triggers a deprecation notice about migrating to `prisma.config.ts`. This is cosmetic and does not affect functionality.
- **Docker in Cloud VM**: Docker daemon must be started manually (`sudo dockerd`) since systemd is not available. The daemon config uses `fuse-overlayfs` storage driver and `iptables-legacy`.
- **Frontend test runner (Karma)**: The frontend `ng test` command uses Karma with Chrome. In headless environments, you may need `--browsers ChromeHeadless`.
