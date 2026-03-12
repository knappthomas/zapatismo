# Build context: apps/frontend (docker build -f apps/frontend/Dockerfile apps/frontend/)
# Multi-stage: build Angular static assets, then serve with nginx (proxy /api to backend)

# -----------------------------------------------------------------------------
# Stage 1: Build Angular production bundle
# -----------------------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json ./
# No package-lock in workspace app; use npm install for reproducible-ish install
RUN npm install

COPY . .
RUN npm run build -- --configuration production

# -----------------------------------------------------------------------------
# Stage 2: Serve with nginx, proxy /api to backend
# -----------------------------------------------------------------------------
FROM nginx:alpine

# envsubst for runtime BACKEND_HOST substitution
RUN apk add --no-cache gettext

# Remove default config; we use our template + entrypoint
RUN rm -f /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/conf.d/default.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENV BACKEND_HOST=backend
EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
