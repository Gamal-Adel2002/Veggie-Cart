# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

pnpm workspace monorepo on Node.js 24 with TypeScript 5.9. A FreshVeg grocery delivery app with an Express API server and a React storefront, backed by PostgreSQL + Drizzle ORM.

## Key Commands

```
# Workspace
pnpm run typecheck        # Typecheck all packages
pnpm run build            # Typecheck + build all packages

# Dev servers (run in parallel)
pnpm --filter @workspace/api-server run dev       # API server (PORT env, default 8080)
pnpm --filter @workspace/grocery-store run dev    # Storefront (PORT env, default 22204)
pnpm --filter @workspace/api-server run build     # Build API server
pnpm --filter @workspace/api-server run start     # Start API server

# Database
pnpm --filter @workspace/db run push              # Push Drizzle schema to DB
pnpm --filter @workspace/db run push-force        # Force push Drizzle schema

# API Codegen
pnpm --filter @workspace/api-spec run codegen     # Generate React hooks + Zod schemas from OpenAPI spec

# Scripts
pnpm --filter @workspace/scripts run seed         # Seed the database

# Linting & Formatting
pnpm run format         # Format all code with prettier
```

## Structure

```
artifacts/
  api-server/          # Express 5 API (JWT auth, routes in src/routes/)
  grocery-store/       # React 19 + Vite storefront (Tailwind 4, Zustand, wouter)
lib/
  api-spec/            # OpenAPI spec + Orval codegen config
  api-client-react/    # Generated React Query hooks + custom fetch
  api-zod/             # Generated Zod schemas from OpenAPI
  db/                  # Drizzle ORM schema + DB connection
scripts/               # Utility scripts (seed, etc.)
```

## TypeScript

Every package extends `tsconfig.base.json` (`composite: true`). Root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — `.d.ts` files only; JS bundling is handled by esbuild (api-server) / vite (grocery-store) / tsx (scripts).

## API Server (`artifacts/api-server`)

Routes mounted at `/api`:
- `/health` — health check
- `/auth` — signup, login, logout, me, location update, admin login
- `/categories` — GET all categories with product counts
- `/products` — GET/POST/PUT/DELETE products with image upload
- `/orders` — Customer order CRUD
- `/admin/orders` — Admin order management (list, update status, assign delivery)
- `/admin/stats` — Dashboard stats
- `/upload` + `/uploads/*` — Image upload + static serving
- `/delivery/*` — Delivery portal (login, orders, complete)
- `/chat/public` + `/chat/private/*` — Chat system with SSE notifications

## Storefront (`artifacts/grocery-store`)

- State: Zustand (`src/store.ts`) for auth, cart, language, delivery token/person
- Routing: wouter
- API: Generated React Query hooks from `@workspace/api-client-react`, wrapped in `src/hooks/use-auth-api.ts`
- Auth token injected globally via `setAuthTokenGetter` in `App.tsx`
- Features: EN/AR language toggle with RTL support, Leaflet map for delivery location, admin panel, delivery portal, public feed + private chat

## Auth

**JWT with httpOnly cookie**. Login/signup set `Set-Cookie: token=<jwt>; HttpOnly; SameSite=Lax; Max-Age=7days`. Middleware checks `req.cookies.token` first, falls back to `Authorization: Bearer <token>`. Frontend Zustand store holds the token; `credentials: 'include'` in custom-fetch sends cookies automatically.

## Order Status Lifecycle

`waiting` → `accepted` or `rejected` → `preparing` → `with_delivery` → `completed`

## Important

- Import from `@workspace/api-client-react` (barrel), **NOT** from `@workspace/api-client-react/src/generated/api` (deep path)
- Package manager is **pnpm only** (root `preinstall` script blocks npm/yarn)
- Use pnpm filters (e.g., `pnpm --filter @workspace/db run push`) to run commands in specific packages
- Always run `pnpm install` at the root to install/rebuild all workspace dependencies

## Development Practices

1. **Database Changes**: 
   - Modify schema in `lib/db/src/schema/`
   - Run `pnpm --filter @workspace/db run push` to apply changes
   - For destructive changes, use `push-force`

2. **API Changes**:
   - Update OpenAPI spec in `lib/api-spec/openapi.yaml`
   - Run codegen: `pnpm --filter @workspace/api-spec run codegen`
   - Implement changes in API routes under `artifacts/api-server/src/routes/`

3. **Frontend Changes**:
   - Components in `artifacts/grocery-store/src/components/`
   - Pages in `artifacts/grocery-store/src/pages/`
   - API calls use generated hooks from `@workspace/api-client-react`

4. **Environment Variables**:
   - Copy `.env.example` to `.env` for local development
   - Key variables: DATABASE_URL, JWT_SECRET, PORT, etc.

5. **Testing**:
   - No test framework configured yet - tests would be manual or need to be added
   - Consider adding vitest/jest for frontend and jest for backend when implementing tests