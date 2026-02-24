# Zapatismo -- Frontend

This document describes the Angular frontend (`apps/frontend/`). It covers architecture, conventions, and guidance for future feature development. For the overall system architecture, see [setup-architecture.md](./setup-architecture.md). For project-wide rules, see [project-rules.md](./project-rules.md). For the backend API it consumes, see [backend.md](./backend.md).

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Repository Layout](#2-repository-layout)
3. [Technology & Styling](#3-technology--styling)
4. [Application Architecture](#4-application-architecture)
5. [Authentication & Route Protection](#5-authentication--route-protection)
6. [Routing](#6-routing)
7. [Environment Configuration](#7-environment-configuration)
8. [Adding a New Feature](#8-adding-a-new-feature)
9. [API Integration](#9-api-integration)
10. [Dev Server & Proxy](#10-dev-server--proxy)

---

## 1. Quick Start

Prerequisites: Node.js installed, backend running on `http://localhost:3000` (see [backend.md](./backend.md)).

```bash
# From the repo root
cd apps/frontend

# Install dependencies
npm install

# Start the dev server (port 4200, proxies /api to backend)
npm start
```

The app is available at `http://localhost:4200`. API requests are proxied to the backend via `proxy.conf.json`.

---

## 2. Repository Layout

```
apps/frontend/
├── angular.json              # CLI config (build, serve, proxy, fileReplacements)
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript config (strict mode)
├── tsconfig.app.json         # App-specific TS config
├── proxy.conf.json           # Dev server: proxy /api → localhost:3000
├── .postcssrc.json           # PostCSS: Tailwind CSS plugin
├── public/                   # Static assets (favicon, etc.)
└── src/
    ├── main.ts               # Bootstrap entry point
    ├── index.html             # HTML shell
    ├── styles.css             # Global styles (Tailwind + daisyUI imports)
    ├── environments/
    │   ├── environment.ts              # Production defaults
    │   └── environment.development.ts  # Local dev overrides
    └── app/
        ├── app.ts             # Root component (<router-outlet>)
        ├── app.config.ts      # Application providers (router, HTTP, interceptors)
        ├── app.routes.ts      # Top-level route table
        ├── core/              # Singletons: auth, API services, models
        │   ├── auth/
        │   │   ├── auth.models.ts
        │   │   ├── auth.service.ts
        │   │   ├── auth.guard.ts
        │   │   └── auth.interceptor.ts
        │   ├── models/
        │   │   └── user.model.ts
        │   └── services/
        │       └── users.service.ts
        ├── shared/            # Stateless, reusable utilities
        │   └── utils/
        │       └── storage.util.ts
        ├── layout/            # App shell (navbar + content area)
        │   ├── main-layout.component.ts
        │   └── navbar.component.ts
        └── features/          # Lazy-loaded feature pages
            ├── login/
            │   └── login.component.ts
            ├── dashboard/
            │   └── dashboard.component.ts
            └── users/
                └── user-list.component.ts
```

### Directory conventions

| Directory | Purpose | Rules |
|-----------|---------|-------|
| `core/` | Singleton services, guards, interceptors, shared models | Provided in root; never imported by other `core/` items circularly |
| `shared/` | Stateless utility functions and reusable components | No service dependencies; pure functions preferred |
| `layout/` | App shell components (navbar, sidebar, footer) | Used by the route config as the authenticated wrapper |
| `features/` | One subdirectory per page/feature | Lazy-loaded via `loadComponent`; self-contained |

---

## 3. Technology & Styling

| Aspect | Choice |
|--------|--------|
| Framework | Angular 20 (standalone components, no NgModules) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 + daisyUI v5 |
| HTTP | Angular `HttpClient` with functional interceptors |
| State | Angular signals for reactive local state |
| Routing | Angular Router with functional guards and lazy loading |

### Styling setup

Tailwind CSS is integrated via PostCSS. The configuration lives in two files:

- `.postcssrc.json` -- registers the `@tailwindcss/postcss` plugin.
- `src/styles.css` -- imports Tailwind and activates daisyUI:

```css
@import "tailwindcss";
@plugin "daisyui";
```

Use Tailwind utility classes for layout and spacing. Use daisyUI component classes (`btn`, `card`, `navbar`, `table`, `alert`, `badge`, etc.) for UI elements. No custom CSS framework or component library.

---

## 4. Application Architecture

### Standalone components

Every component is standalone (the Angular 20 default). There are no `NgModule` declarations. Dependencies are declared in the component's `imports` array.

### Application bootstrap

The app is bootstrapped in `main.ts` using `bootstrapApplication(App, appConfig)`. All global providers are registered in `app.config.ts`:

- `provideRouter(routes)` -- route table from `app.routes.ts`.
- `provideHttpClient(withFetch(), withInterceptors([authInterceptor]))` -- HTTP client with the auth interceptor.
- `provideZoneChangeDetection({ eventCoalescing: true })` -- zone.js change detection.

### Signals for state

The frontend uses Angular signals instead of RxJS `BehaviorSubject` for synchronous reactive state. The main signal-based state is in `AuthService`:

- `currentUser: Signal<JwtPayload | null>` -- the decoded JWT payload of the logged-in user.
- `isAuthenticated: Signal<boolean>` -- computed from `currentUser`, checking token expiration.

RxJS is still used for HTTP calls (`Observable`-based), but local component state and auth state use signals.

---

## 5. Authentication & Route Protection

### How authentication works

The frontend mirrors the backend's JWT-based auth. The flow:

1. User submits email and password on the login page.
2. `AuthService.login()` sends `POST /api/auth/login`.
3. The backend returns `{ accessToken }`.
4. The token is stored in `localStorage` (via `storage.util.ts`) and decoded in-memory to populate the `currentUser` signal.
5. On subsequent requests, `authInterceptor` attaches the `Authorization: Bearer <token>` header.
6. On page reload, `AuthService` reads the stored token, checks expiration, and restores state.

### Token handling

- Tokens are decoded client-side using `atob()` (no external JWT library).
- Expiration is checked against `Date.now()` using the `exp` claim.
- Expired or invalid tokens are discarded from storage on load.

### Route guards

Two functional guards protect routes in `app.routes.ts`:

| Guard | Behaviour |
|-------|-----------|
| `authGuard` | Redirects to `/login` if not authenticated |
| `adminGuard` | Redirects to `/login` if not authenticated; redirects to `/dashboard` if authenticated but not `ADMIN` |

Guards are applied declaratively in the route config via `canActivate`.

### Auth interceptor

`authInterceptor` is a functional `HttpInterceptorFn` registered in `app.config.ts`. It attaches the Bearer token to every outgoing HTTP request when a token is present. No URL filtering is applied (all requests get the header if a token exists).

### Logout

`AuthService.logout()` clears the token from `localStorage`, resets the `currentUser` signal to `null`, and navigates to `/login`.

---

## 6. Routing

### Route structure

```
/login          → LoginComponent           (public)
/               → MainLayoutComponent      (authGuard, shell)
  /dashboard    → DashboardComponent       (child of layout)
  /users        → UserListComponent        (adminGuard)
  /             → redirects to /dashboard
```

### Key patterns

- **Public routes** (e.g., `/login`) are defined outside the authenticated layout wrapper and have no guard.
- **Protected routes** are children of the `MainLayoutComponent` route, which applies `authGuard`. This ensures the navbar and layout shell are rendered for all authenticated pages.
- **Role-restricted routes** add `adminGuard` on top of the parent's `authGuard`.
- **Lazy loading**: all feature components use `loadComponent` with dynamic imports. This produces separate JS chunks per feature, keeping the initial bundle small.

### Default redirect

The root path `/` inside the layout redirects to `/dashboard`. Unauthenticated users hitting any protected route are redirected to `/login` by `authGuard`.

---

## 7. Environment Configuration

Environment files live in `src/environments/`:

| File | Used when | Values |
|------|-----------|--------|
| `environment.ts` | Production build | `apiUrl: '/api'` |
| `environment.development.ts` | Dev build (`ng serve`) | `apiUrl: 'http://localhost:3000/api'` |

The `angular.json` `development` configuration uses `fileReplacements` to swap `environment.ts` with `environment.development.ts` during dev builds.

Services import from `environments/environment` and get the correct values automatically based on the build configuration.

---

## 8. Adding a New Feature

When adding a new page or feature area, follow this pattern:

### 1. Create the component

Create a new directory under `features/`:

```
src/app/features/your-feature/
└── your-feature.component.ts
```

Use a standalone component with an inline template (or separate `.html` if the template is large). Import any Angular modules or shared components in the component's `imports` array.

### 2. Create a service (if needed)

If the feature calls backend API endpoints, add a service in `core/services/`:

```
src/app/core/services/your-feature.service.ts
```

Register it with `providedIn: 'root'`. Use `HttpClient` and the `environment.apiUrl` base URL.

### 3. Add a model (if needed)

If the feature introduces new data types, add them in `core/models/`:

```
src/app/core/models/your-feature.model.ts
```

Keep model interfaces aligned with the backend's response DTOs.

### 4. Register the route

Add a route entry in `app.routes.ts`:

```typescript
{
  path: 'your-feature',
  loadComponent: () =>
    import('./features/your-feature/your-feature.component').then((m) => m.YourFeatureComponent),
  canActivate: [authGuard],  // or [adminGuard] for admin-only
}
```

Place it as a child of the layout route (for authenticated pages) or at the top level (for public pages).

### 5. Add a nav link (if needed)

Add a link in `navbar.component.ts`. Use `@if (auth.hasRole('ADMIN'))` to conditionally show admin-only links.

### 6. Verify

- Run `npm start` and verify the page renders.
- Run `npm run build` to check for compilation errors.

---

## 9. API Integration

### Principles

- The frontend communicates with the backend **exclusively** via the REST API.
- No business logic in the frontend. The backend owns domain rules; the frontend is a presentation layer.
- Models are hand-typed to match backend DTOs. OpenAPI codegen can be added later.

### Current services

| Service | Endpoints | Access |
|---------|-----------|--------|
| `AuthService` | `POST /api/auth/login` | Public |
| `UsersService` | `GET /api/users`, `GET /api/users/:id` | Admin / Authenticated |

### Adding a new API service

```typescript
@Injectable({ providedIn: 'root' })
export class YourFeatureService {
  private readonly baseUrl = `${environment.apiUrl}/your-feature`;

  constructor(private readonly http: HttpClient) {}

  getAll() {
    return this.http.get<YourModel[]>(this.baseUrl);
  }
}
```

The `authInterceptor` automatically attaches the JWT token to all requests.

---

## 10. Dev Server & Proxy

### Proxy configuration

During development, `ng serve` runs on port 4200. The `proxy.conf.json` file proxies `/api` requests to the backend at `http://localhost:3000`:

```json
{
  "/api": {
    "target": "http://localhost:3000",
    "secure": false,
    "changeOrigin": true
  }
}
```

This avoids CORS issues during local development. The proxy is registered in `angular.json` under `serve.options.proxyConfig`.

In production, the frontend is served as static files and `/api` routes are handled by the backend directly (or via a reverse proxy like nginx). The production environment uses `apiUrl: '/api'` (relative path), so no proxy is needed.

### Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `npm start` | `ng serve` | Dev server with proxy and live reload |
| `npm run build` | `ng build` | Production build to `dist/frontend/` |
| `npm run watch` | `ng build --watch --configuration development` | Continuous dev build |
