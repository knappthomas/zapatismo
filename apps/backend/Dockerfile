# Build context: repo root (docker build -f apps/backend/Dockerfile .)
# Multi-stage: builder for deps + build, runner for production + Prisma CLI (migrate/seed)

# -----------------------------------------------------------------------------
# Stage 1: Builder – install deps, generate Prisma client, build NestJS
# -----------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Copy workspace and app package files
COPY package.json package-lock.json* ./
COPY apps/backend/package.json ./apps/backend/

# Install all dependencies (including dev for build)
RUN npm ci

# Copy Prisma schema and migrations (required for generate and for final image)
COPY prisma ./prisma/
RUN npx prisma generate

# Copy backend source and build
COPY apps/backend ./apps/backend/
RUN npm run build --workspace=@zapatismo/backend

# -----------------------------------------------------------------------------
# Stage 2: Runner – production runtime + Prisma CLI for migrate/seed in workflows
# -----------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

# Copy workspace and backend package files for install
COPY package.json package-lock.json* ./
COPY apps/backend/package.json ./apps/backend/

# Production deps only; then Prisma CLI + ts-node for migrate/seed via docker compose exec
RUN npm ci --omit=dev && npm install prisma ts-node typescript

# Copy Prisma (schema, migrations, seed) from builder
COPY --from=builder /app/prisma ./prisma/

# Generate Prisma client in runner (required for app and for prisma migrate/seed)
RUN npx prisma generate

# Copy built backend
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist/

# App runs from /app; Prisma commands are run from /app so they see prisma/
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "apps/backend/dist/src/main.js"]
