# ICT NQ Futures Trading Mentor App

## Overview

Full-stack mobile trading app built with Expo React Native + Express API. Dark-themed professional UI with 4 core modules for ICT (Inner Circle Trader) NQ Futures trading. Includes authentication, subscription management, and admin dashboard.

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
- **Auth**: JWT (jsonwebtoken) + bcryptjs

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   ├── web/                # React + Vite web app
│   ├── mobile/             # Expo React Native app
│   └── mockup-sandbox/     # Component preview server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Authentication & Subscriptions

### Auth System
- JWT-based authentication with httpOnly cookies + Bearer token
- First registered user automatically becomes admin
- First 20 users get "Founder" status with 50% discount for 6 months
- Password hashing with bcryptjs (12 rounds)

### Database Tables
- `users` — id, email, password_hash, name, role (user/admin), is_founder, founder_number
- `subscription_tiers` — id, name, level (0=Free, 1=Standard, 2=Premium), monthly_price, annual_price, features (jsonb)
- `user_subscriptions` — user_id, tier_id, status, billing_cycle, custom prices, founder discount tracking
- `admin_settings` — key-value store for global config (founder_limit, founder_discount_pct, annual_discount_pct, etc.)

### Subscription Tiers
- **Free** (Level 0): Academy (5 lessons), Daily Planner, AI Mentor (3/day), Daily Spin
- **Standard** (Level 1, $29.99/mo): Full Academy, Risk Shield, unlimited AI Mentor
- **Premium** (Level 2, $59.99/mo): Everything + Smart Journal, Analytics, Leaderboard, TradingView Webhooks

### API Routes
- `POST /api/auth/register` — register (auto-founder for first 20)
- `POST /api/auth/login` — login, returns JWT
- `GET /api/auth/me` — current user + subscription
- `POST /api/auth/logout` — clear cookie
- `GET /api/subscriptions/tiers` — list tiers + founder spots
- `POST /api/subscriptions/subscribe` — subscribe/upgrade
- `GET /api/subscriptions/my` — current subscription
- `GET/PUT /api/admin/users` — manage users
- `PUT /api/admin/users/:id/subscription` — set custom pricing per user
- `GET/PUT /api/admin/tiers` — manage tier pricing
- `GET/PUT /api/admin/settings` — global config

### Frontend Features
- Login/Signup pages with founder spot counter
- Founder welcome modal with crown animation
- Pricing page with monthly/annual toggle and founder discount display
- Admin dashboard with user management, tier editing, global settings
- Casino-game elements: daily streak, spin wheel, achievements, premium teasers
- Sidebar shows user profile, subscription status, founder badge
- Feature locking based on subscription tier (not just localStorage)

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly`

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server with auth middleware, subscription management, and admin routes.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS (credentials), cookie-parser, JSON/urlencoded, routes at `/api`, seeds defaults
- Middleware: `src/middleware/auth.ts` — JWT auth, admin role check
- Routes: auth, subscriptions, admin, gemini, prop, trades, webhook
- Seed: `src/seed.ts` — creates default tiers and admin settings on startup

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

- Schema files: users.ts, subscriptions.ts, admin_settings.ts, conversations.ts, messages.ts, trades.ts, prop_account.ts
- Production migrations handled by Replit on publish. Dev: `pnpm --filter @workspace/db run push`

### `artifacts/web` (`@workspace/web`)

React + Vite web application with auth-gated access.

- Auth: `src/contexts/AuthContext.tsx` — JWT session management, tier checking
- Pages: Login, Signup (with founder modal), Pricing (with annual toggle), Admin dashboard
- Casino elements: `src/components/CasinoElements.tsx` — daily streak, spin wheel, achievements, premium teasers
- Layout: Subscription-aware navigation with user menu, admin link, upgrade prompts
- Free users see casino sidebar on right with spin wheel, streaks, achievements, and blurred premium content
- Preview path: `/web/`

### `artifacts/mobile` (`@workspace/mobile`)

Expo React Native mobile app with 4 tabs (same as before, no auth changes yet).

### `artifacts/mockup-sandbox` (`@workspace/mockup-sandbox`)

Vite + React component preview server for canvas mockups.
