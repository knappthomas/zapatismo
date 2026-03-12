# Docker Hosting – Staging & Production

This document describes how to run Zapatismo on a Linux server (e.g. Scaleway VPS) using Docker and the repo’s compose files, and how the Angular API URL works with the nginx proxy.

## Table of Contents

1. [Angular API URL (build-time and runtime)](#1-angular-api-url-build-time-and-runtime)
2. [Host nginx configuration (subdomain routing)](#2-host-nginx-configuration-subdomain-routing)
3. [Server setup (step-by-step)](#3-server-setup-step-by-step)
4. [Switching to managed MySQL](#4-switching-to-managed-mysql)
5. [GitHub Actions secrets](#5-github-actions-secrets)

---

## 1. Angular API URL (build-time and runtime)

- The Angular app uses **`apiUrl: '/api'`** in `apps/frontend/src/environments/environment.ts` (relative URL).
- **No build-time backend URL** is required: the frontend is built once and served by nginx. All API requests go to the same origin (`/api`).
- **At runtime**, the frontend is served by nginx inside the frontend container. That nginx is configured to **proxy `/api` to the backend service** (e.g. `http://backend-staging:3000` or `http://backend-prod:3000`). So the browser calls `https://staging.domain/api/...`, the host nginx forwards to the frontend container, and the container’s nginx forwards `/api` to the backend. No absolute API base URL is needed at build time.
- If you ever need a **different API base** (e.g. absolute URL for another deployment), you would add a build-time replacement (e.g. Angular `fileReplacements` or env injection) and document it here.

---

## 2. Host nginx configuration (subdomain routing)

The Docker stacks expose **only internal host ports** (staging: `127.0.0.1:30080`, production: `127.0.0.1:30081`). A **host-level nginx** in front of Docker routes subdomains to these ports.

Example (replace `staging.example.com` and `example.com` with your domains):

```nginx
# Staging
server {
    listen 80;
    server_name staging.example.com;
    location / {
        proxy_pass http://127.0.0.1:30080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Production
server {
    listen 80;
    server_name example.com;
    location / {
        proxy_pass http://127.0.0.1:30081;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

- **Staging:** `staging.example.com` → `127.0.0.1:30080` (frontend-staging).
- **Production:** `example.com` → `127.0.0.1:30081` (frontend-prod).
- TLS/HTTPS (e.g. Let’s Encrypt) can be added later in front of this nginx; it is out of scope for the Docker setup itself.

---

## 3. Server setup (step-by-step)

1. **Install Docker and Docker Compose** on the server (e.g. Ubuntu: Docker docs or `docker compose` plugin).
2. **Clone the repo** (or copy the compose files and `.env.*.example`) into a directory on the server, e.g. `/opt/zapatismo` or `~/zapatismo`. This path will be used as the deploy path in GitHub Actions.
3. **Staging**
   - Copy `.env.staging.example` to `.env.staging` in the repo root on the server.
   - Set all variables (see [.env.staging.example](../../.env.staging.example)); in particular set `REGISTRY_IMAGE_PREFIX` (e.g. `ghcr.io/myorg/zapatismo`), MySQL password, `DATABASE_URL` pointing at `mysql-staging:3306`, JWT and Strava credentials.
   - Run:  
     `docker compose -f docker-compose.staging.yml pull`  
     `docker compose -f docker-compose.staging.yml up -d`
   - Staging frontend is then reachable on `127.0.0.1:30080`; use host nginx to expose it as `staging.domain`.
4. **Production**
   - Copy `.env.production.example` to `.env.production`.
   - Set variables (including `REGISTRY_IMAGE_PREFIX`, `DATABASE_URL` for `mysql-prod:3306` or your external DB), then:  
     `docker compose -f docker-compose.production.yml pull`  
     `docker compose -f docker-compose.production.yml up -d`
   - Production frontend is on `127.0.0.1:30081`; use host nginx to expose it as `domain`.
5. **Configure host nginx** as in [§2](#2-host-nginx-configuration-subdomain-routing) so that `staging.domain` → 30080 and `domain` → 30081.
6. **GitHub Actions**: Configure the [secrets listed in §5](#5-github-actions-secrets) so that push to `staging` deploys staging and push to `main` deploys production.

---

## 4. Switching to managed MySQL

To use Scaleway Managed MySQL (or any external MySQL) instead of the MySQL container:

1. Create the managed database and obtain the **connection string** (e.g. `mysql://user:pass@host:port/dbname`).
2. In the server’s **`.env.production`** (or `.env.staging`), set **`DATABASE_URL`** to that connection string.
3. In **`docker-compose.production.yml`** (or staging):
   - Remove or comment out the **`mysql-prod`** service and its **volume** (`mysql-prod-data`).
   - Remove **`backend-prod`**’s `depends_on: mysql-prod` (and any `condition: service_healthy`).
4. Run **`docker compose -f docker-compose.production.yml up -d`** so only backend and frontend start. The backend will connect to the external database via `DATABASE_URL`; no code or Dockerfile change is required.
5. Apply migrations as usual (e.g. as part of the deploy workflow: `docker compose exec -T backend-prod npx prisma migrate deploy`).

---

## 5. GitHub Actions secrets

Configure these in the repo’s **Settings → Secrets and variables → Actions**.

### Deploy Staging (workflow: `deploy-staging.yml`)

| Secret | Description |
|--------|-------------|
| `STAGING_SSH_HOST` | Hostname or IP of the staging server. |
| `STAGING_SSH_USER` | SSH user for the staging server. |
| `STAGING_SSH_KEY` | Private key for SSH (full key, including `-----BEGIN ... -----`). |
| `STAGING_DEPLOY_PATH` | Path on the server where the repo (or compose files) lives (e.g. `/opt/zapatismo`). |

The server’s `.env.staging` must define all variables required by `docker-compose.staging.yml` (including `REGISTRY_IMAGE_PREFIX`). The workflow uses **`GITHUB_TOKEN`** for pushing images to ghcr.io (no extra registry secret needed if the repo has package write permission).

### Deploy Production (workflow: `deploy-production.yml`)

| Secret | Description |
|--------|-------------|
| `PROD_SSH_HOST` | Hostname or IP of the production server. |
| `PROD_SSH_USER` | SSH user. |
| `PROD_SSH_KEY` | Private key for SSH. |
| `PROD_DEPLOY_PATH` | Path on the server to the repo/compose (e.g. `/opt/zapatismo`). |

The server’s `.env.production` must define all variables required by `docker-compose.production.yml` (including `REGISTRY_IMAGE_PREFIX`).

---

No application secrets (e.g. `DATABASE_URL`, `JWT_SECRET`, Strava credentials) should be stored in the repo or in image layers; they are provided only via the server’s `.env.staging` / `.env.production` and, if needed, via GitHub Actions secrets for injectable values.
