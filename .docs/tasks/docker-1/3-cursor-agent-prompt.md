# Cursor Agent Prompt – docker-1 – Docker Setup for Staging & Production

## Deine Aufgabe

Implementiere das vollständige Docker-Setup für das Zapatismo-Projekt gemäß dem unten beschriebenen Plan. Alle Anforderungen und Acceptance Criteria sind final – setze sie 1:1 um.

---

## Projektkontext

**Zapatismo** ist ein npm-Monorepo mit folgender Struktur:

```
zapatismo/                          ← Repo-Root / Build-Context
├── apps/
│   ├── backend/                    ← NestJS, Port 3000, Paketname @zapatismo/backend
│   │   └── package.json            ← Build-Script: "build": "nest build", Start: "node dist/main"
│   └── frontend/                   ← Angular, Paketname frontend
│       ├── proxy.conf.json         ← Lokaler Dev-Proxy: /api → http://localhost:3000
│       └── src/environments/
│           └── environment.ts      ← apiUrl: '/api' (relativ, funktioniert hinter nginx-Proxy)
├── prisma/
│   ├── schema.prisma               ← MySQL via DATABASE_URL env var
│   ├── migrations/                 ← Prisma-Migrationen
│   └── seed.ts                     ← Seed-Script (ausgeführt via ts-node prisma/seed.ts)
├── misc/mysql/docker-compose.yml   ← Referenz: bestehende MySQL-Konfiguration (NICHT ändern)
├── package.json                    ← Root-Workspace, Prisma-Scripts hier (prisma:migrate etc.)
│                                      Seed: "ts-node prisma/seed.ts"
└── .github/workflows/
    └── system-tests.yml            ← NICHT ANFASSEN – bestehende CI, darf nicht verändert werden
```

**Tech Stack:** Node.js v22, NestJS, Angular, Prisma ORM, MySQL 8.0

**Wichtig:** Lokale Entwicklung bleibt unverändert (npm start etc.). Docker wird ausschließlich für Staging und Production genutzt.

---

## Was zu erstellen ist (7 Deliverables)

### 1. `apps/backend/Dockerfile`

- Build-Context: Repo-Root (wegen `prisma/` Ordner, der auf Root-Ebene liegt)
- Pinned Base Image: `node:22-alpine`
- Schritte: Dependencies installieren (`npm ci`) → Prisma Client generieren (`npx prisma generate`) → NestJS bauen (`npm run build --workspace=@zapatismo/backend`) → Produktions-Start via `node dist/main`
- Das Image muss Prisma CLI, `prisma/migrations/` und `prisma/seed.ts` enthalten, damit Workflows `prisma migrate deploy`, `prisma migrate reset --force` und den Seed via `docker compose exec` ausführen können
- Keine Dev-Dependencies im finalen Image (Multi-Stage empfohlen)
- Keine Secrets im Image

### 2. `apps/frontend/Dockerfile`

- Multi-Stage Build, pinned Base Images
- **Stage 1 (build):** `node:22-alpine` → `ng build --configuration production` → statische Assets in `dist/`
- **Stage 2 (serve):** `nginx:alpine` → kopiert Assets aus Stage 1 → beinhaltet eine nginx-Konfiguration, die `/api` an den Backend-Service (`http://backend:3000`) proxied
- Die nginx-Konfiguration kann als inline `RUN echo ...` oder als separate Datei `apps/frontend/nginx.conf` eingebunden werden
- Angular's `apiUrl: '/api'` in `environment.ts` bleibt unverändert – der nginx-Proxy im Container übernimmt die Weiterleitung zur Laufzeit

### 3. `docker-compose.staging.yml` (Repo-Root)

- Services: `mysql-staging`, `backend-staging`, `frontend-staging`
- Internes Docker-Netzwerk (kein direkter Zugriff von außen auf Backend oder MySQL)
- Frontend exponiert nur einen internen Host-Port für den vorgelagerten Host-nginx (z.B. `127.0.0.1:30080:80`)
- Backend verbindet sich mit MySQL über den internen Service-Namen (`mysql-staging`)
- `DATABASE_URL` und alle anderen Secrets kommen aus `.env.staging` auf dem Server (nie im Repo)
- MySQL: basierend auf `misc/mysql/docker-compose.yml` als Referenz, MySQL 8.0, named volume für Datenpersistenz
- `restart: unless-stopped` für alle Services
- Healthchecks für MySQL

### 4. `docker-compose.production.yml` (Repo-Root)

- Gleiche Struktur wie Staging, aber separater Projekt-Name und separater Host-Port (z.B. `127.0.0.1:30081:80`)
- Services: `mysql-prod`, `backend-prod`, `frontend-prod`
- Dokumentierter Kommentar im File: wie MySQL-Service entfernt und `DATABASE_URL` auf externen Managed MySQL umgestellt wird

### 5. `.github/workflows/deploy-staging.yml`

- **Trigger:** `push` auf Branch `staging`
- **Schritte:**
  1. Checkout
  2. Login zu ghcr.io (via `GITHUB_TOKEN` oder Secret)
  3. Backend-Image bauen und als `ghcr.io/<owner>/zapatismo-backend:staging` pushen (Build-Context: Repo-Root, Dockerfile: `apps/backend/Dockerfile`)
  4. Frontend-Image bauen und als `ghcr.io/<owner>/zapatismo-frontend:staging` pushen
  5. Per SSH auf Scaleway-Server verbinden (Secret: `STAGING_SSH_KEY`, `STAGING_SSH_HOST`, `STAGING_SSH_USER`)
  6. Auf dem Server: `docker compose -f docker-compose.staging.yml pull`
  7. Auf dem Server: `docker compose -f docker-compose.staging.yml up -d`
  8. Auf dem Server: `docker compose -f docker-compose.staging.yml exec -T backend-staging npx prisma migrate reset --force`
  9. Auf dem Server: `docker compose -f docker-compose.staging.yml exec -T backend-staging npx ts-node prisma/seed.ts`
- Alle Secrets via GitHub Actions Secrets – keine Hardcoded-Werte

### 6. `.github/workflows/deploy-production.yml`

- **Trigger:** `push` auf Branch `main`
- **Schritte:**
  1. Checkout
  2. Login zu ghcr.io
  3. Backend-Image bauen und als `ghcr.io/<owner>/zapatismo-backend:latest` pushen
  4. Frontend-Image bauen und als `ghcr.io/<owner>/zapatismo-frontend:latest` pushen
  5. Per SSH auf Scaleway-Server verbinden (Secret: `PROD_SSH_KEY`, `PROD_SSH_HOST`, `PROD_SSH_USER`)
  6. Auf dem Server: `docker compose -f docker-compose.production.yml pull`
  7. Auf dem Server: `docker compose -f docker-compose.production.yml up -d`
  8. Auf dem Server: `docker compose -f docker-compose.production.yml exec -T backend-prod npx prisma migrate deploy`
- **Kein** Reset, **kein** Seed – Produktionsdaten werden nicht angefasst

### 7. Dokumentation und `.env.example` Dateien

**`.env.staging.example`** und **`.env.production.example`** (Repo-Root) – je mit allen benötigten Variablen und kurzer Beschreibung. Mindestens:
- `DATABASE_URL` – MySQL Connection String
- `JWT_SECRET` – JWT-Signatur-Secret
- `STRAVA_CLIENT_ID` – Strava API Client ID
- `STRAVA_CLIENT_SECRET` – Strava API Client Secret
- `STRAVA_REDIRECT_URI` – Strava OAuth Callback URL
- Alle weiteren Variablen, die im Backend-Code via `process.env` oder NestJS ConfigService verwendet werden

**`.docs/system/docker-hosting.md`** – neue Dokumentationsdatei mit:
- Host-nginx-Konfiguration für Subdomain-Routing (`staging.domain` → Port 30080, `domain` → Port 30081)
- Erklärung Angular API URL: `apiUrl: '/api'` ist relativ → nginx im Frontend-Container proxied `/api` zur Laufzeit an `http://backend:3000` → kein Build-Time-Wert nötig
- Schritt-für-Schritt: Server-Setup (Docker installieren, .env Dateien anlegen, nginx konfigurieren)
- Schritt-für-Schritt: MySQL auf Managed DB umstellen (DATABASE_URL ändern, mysql-Service aus compose entfernen, `docker compose up -d`)
- Welche GitHub Actions Secrets müssen angelegt werden und für welchen Workflow

---

## Constraints (nicht verhandelbar)

- `system-tests.yml` darf **nicht** verändert werden
- Kein Docker für lokale Entwicklung – lokale npm-Workflows bleiben unberührt
- Keine Änderungen an Application-Code (kein neuer Endpoint, keine Schema-Änderung, kein neues Angular-Feature)
- Keine Secrets im Repo oder in Image-Layern
- Build-Context für Backend-Dockerfile muss Repo-Root sein (wegen `prisma/` auf Root-Ebene)
- Angular `environment.ts` bleibt unverändert (`apiUrl: '/api'`)

---

## Verifikation nach der Umsetzung

Prüfe nach der Implementierung:
1. `docker build -f apps/backend/Dockerfile .` baut erfolgreich (aus Repo-Root)
2. `docker build -f apps/frontend/Dockerfile apps/frontend/` baut erfolgreich
3. `docker compose -f docker-compose.staging.yml up -d` startet alle drei Services
4. `docker compose -f docker-compose.production.yml up -d` startet alle drei Services
5. `.github/workflows/system-tests.yml` ist unverändert
6. Kein Secret, keine Credential ist in irgendeiner der neuen Dateien hardcoded
