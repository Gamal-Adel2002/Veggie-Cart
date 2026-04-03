# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── grocery-store/      # React+Vite storefront (FreshVeg)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server for the FreshVeg grocery delivery app. Routes live in `src/routes/` and use JWT auth.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes mounted at `/api`:
  - `GET /health` — health check
  - `/auth` — signup, login, logout, me, location update, admin login
  - `/categories` — GET all categories with product counts
  - `/products` — GET/POST/PUT/DELETE products with image upload
  - `/orders` — Customer order CRUD (POST create, GET list, GET by ID)
  - `/admin/orders` — Admin order management (list all, update status, assign delivery)
  - `/admin/delivery-persons` — Delivery staff CRUD (now includes username/password for portal)
  - `/admin/stats` — Dashboard stats
  - `/upload` — Image upload (multer, stored in `./uploads/`)
  - `/uploads/*` — Static file serving for uploaded images
  - `/delivery/login` — Delivery portal login (username + password → JWT with role='delivery')
  - `/delivery/me` — Get current delivery person info (requireDelivery guard)
  - `/delivery/orders` — Get orders assigned to this delivery person (requireDelivery guard)
  - `/delivery/orders/:id/complete` — Mark an assigned order as completed (requireDelivery guard)
- Auth: JWT via bcryptjs + jsonwebtoken, middleware in `src/middlewares/authenticate.ts`
- WhatsApp: Twilio integration in `src/lib/whatsapp.ts` (sends message on delivery person assignment)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server (port from `PORT` env)

### `artifacts/grocery-store` (`@workspace/grocery-store`)

React + Vite storefront for the FreshVeg grocery delivery application.

- Preview path: `/` (root)
- Features:
  - Homepage with hero section, categories, featured products
  - Shop page with category filter sidebar and product grid
  - Product detail page
  - Cart (Zustand state, persisted to localStorage)
  - Checkout with Leaflet map for delivery location selection
  - Order confirmation page
  - Customer auth: phone-based signup (with profile image upload) and login
  - Account page with order history and location update
  - Admin panel: login, dashboard, orders management, products CRUD, categories CRUD, delivery persons CRUD (with portal credentials)
  - Delivery portal: /delivery/login + /delivery/dashboard — drivers log in with username/password to see and complete assigned orders
  - EN/AR language toggle with RTL support
  - Green-themed, mobile-first design
- State: Zustand store (`src/store.ts`) - auth token, user, cart, language, deliveryToken, deliveryPerson
- Routing: wouter
- API: Generated React Query hooks from `@workspace/api-client-react`
- All hooks wrapped in `src/hooks/use-auth-api.ts` for convenience re-exports
- Auth token injected globally via `setAuthTokenGetter(() => useStore.getState().token)` in `App.tsx` — no per-hook `request` headers needed
- custom-fetch includes `credentials: 'include'` so httpOnly cookie is sent automatically with every request
- `pnpm --filter @workspace/grocery-store run dev` — run the dev server (port from `PORT` env)

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- Tables: users, categories, products, orders, order_items, delivery_persons
- Seeded with: 5 categories, 19 products, 1 admin user (phone: 01000000000, password: admin123), 3 delivery persons
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec.

- Barrel export at `./src/index.ts` - re-exports from generated files
- **Important**: Always import from `@workspace/api-client-react` (barrel), NOT from `@workspace/api-client-react/src/generated/api` (deep path)
- Custom fetch in `src/custom-fetch.ts` - supports `setBaseUrl()` and auth token injection

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.

## Environment Variables / Secrets

- `DATABASE_URL` — PostgreSQL connection string (provided by Replit)
- `JWT_SECRET` — JWT signing secret (defaults to hardcoded fallback)
- `TWILIO_ACCOUNT_SID` — Twilio account SID for WhatsApp notifications
- `TWILIO_AUTH_TOKEN` — Twilio auth token
- `TWILIO_WHATSAPP_FROM` — Twilio WhatsApp sender number (defaults to sandbox `whatsapp:+14155238886`)

## Auth Model

**JWT with httpOnly cookie** — uses JWT for stateless auth, delivered via httpOnly cookie (not express-session server sessions).

- **Login/signup/admin-login**: Set `Set-Cookie: token=<jwt>; HttpOnly; SameSite=Lax; Max-Age=7days`
- **Auth middleware**: Checks `req.cookies.token` first, falls back to `Authorization: Bearer <token>` header
- **Logout**: `res.clearCookie("token")` — actually invalidates the session (not client-side only)
- **Frontend**: Zustand stores the token returned in response body; `setAuthTokenGetter` sends it as Bearer for non-cookie clients; `credentials: 'include'` in custom-fetch sends cookies automatically
- **Why not express-session**: JWT cookie approach satisfies cookie-parser requirement, provides real logout capability, and avoids server-side session store dependency

## Order Status Lifecycle

`waiting` → `accepted` or `rejected`
`accepted` → `preparing`
`preparing` → `with_delivery`
`with_delivery` → `completed`

## WhatsApp Notifications

When a delivery person is assigned to an order, a WhatsApp message is sent via Twilio to the delivery person's phone with:
- 🚚 New Order header
- Customer name and phone
- 📍 Google Maps link to delivery location
- 🛒 Order items with quantities and units
- 💰 Total in EGP

## Chat System

### DB Tables (`lib/db/src/schema/chat.ts`)
- `chatMessagesTable` — both public and private messages. `channel` ∈ {public, private}. `recipientId=null` means admin is recipient (customer→admin); `recipientId=customerId` means admin→customer.
- `chatReactionsTable` — emoji reactions on public messages; unique per (messageId, userId, emoji), toggled.

### Backend (`artifacts/api-server/src/routes/chat.ts`)
- `GET /api/chat/public` — paginated public broadcast messages (open to all)
- `POST /api/chat/public` — admin only: broadcast a message with optional media
- `POST /api/chat/public/:id/react` — toggle emoji reaction (authenticated)
- `GET /api/chat/private` — admin: list all conversations; customer: own thread summary
- `GET /api/chat/private/:customerId` — full thread (admin sees all; customer only their own)
- `POST /api/chat/private/:customerId` — send private message
- `PUT /api/chat/private/:customerId/read` — mark all unread as read
- `POST /api/chat/private/:customerId/typing` — emit typing indicator via SSE

### SSE Events (`notifications.ts`)
- `public_chat_message` — new public broadcast
- `public_chat_reaction` — reaction toggled
- `private_chat_message` — new private message (delivered only to affected parties)
- `chat_read_receipt` — thread marked as read
- `chat_typing` — typing indicator (delivered to other party)

### Frontend Pages
- `/feed` — `PublicFeed.tsx`: customer reads broadcasts and reacts with emoji
- `/messages` — `Messages.tsx`: customer's private thread with support
- `/admin/public-chat` — `PublicChat.tsx`: admin composes + views public broadcasts
- `/admin/private-chats` — `PrivateChats.tsx`: two-panel inbox (conversation list + thread)
