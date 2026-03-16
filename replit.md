# ICT NQ Futures Trading Mentor App

## Overview

Full-stack mobile trading app built with Expo React Native + Express API. Gold/black premium dark-themed professional UI with 4 core modules for ICT (Inner Circle Trader) NQ Futures trading. Includes authentication, subscription management, and admin dashboard.

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
- **Auth**: JWT (jsonwebtoken) + bcryptjs, httpOnly cookies only (no localStorage tokens)

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

## Design System

- **Primary color**: Gold (`hsl(43 76% 52%)`) — #D4AF37 family
- **Background**: Deep navy-black (`hsl(240 25% 4%)`)
- **Fonts**: Playfair Display (serif, headings), Inter (sans-serif, body)
- **Aesthetic**: Sophisticated, expensive, minimal with gold accents on dark backgrounds
- **Logo**: SVG chart-line icon with gold gradient and "ICT" text

## Authentication & Subscriptions

### Auth System
- JWT-based authentication with httpOnly cookies only (secure + SameSite=None on Replit)
- CORS restricted to Replit domains, localhost, and configurable ALLOWED_ORIGINS
- First registered user automatically becomes admin
- First 20 users get "Founder" status with 50% discount for 6 months
- Password hashing with bcryptjs (12 rounds)
- Post-signup redirect goes directly to Daily Planner (skips Welcome)

### Database Tables
- `users` — id, email, password_hash, name, role (user/admin), is_founder, founder_number
- `subscription_tiers` — id, name, level (0=Free, 1=Standard, 2=Premium), monthly_price, annual_price, features (jsonb)
- `user_subscriptions` — user_id, tier_id, status, billing_cycle, custom prices, founder discount tracking
- `admin_settings` — key-value store for global config (branding, founder, discipline, planner, AI mentor, feature toggles)

### Subscription Tiers
- **Free** (Level 0): Academy (5 lessons), Daily Planner, AI Mentor (3/day), Daily Spin
- **Standard** (Level 1, $29.99/mo): Full Academy, Risk Shield, unlimited AI Mentor
- **Premium** (Level 2, $59.99/mo): Everything + Smart Journal, Analytics, Leaderboard, TradingView Webhooks

### Stripe Payment Integration
- **Stripe SDK**: `stripe` + `stripe-replit-sync` installed at workspace root
- **Stripe Client**: `artifacts/api-server/src/stripe/stripeClient.ts` — fetches key from `STRIPE_SECRET_KEY` env var
- **Webhook Handler**: `artifacts/api-server/src/stripe/webhookHandlers.ts` — processes webhook via `stripe-replit-sync`
- **Webhook Route**: Registered in `app.ts` BEFORE `express.json()` at `/api/stripe/webhook` with `express.raw()`
- **Stripe Init**: `index.ts` runs `runMigrations` → `getStripeSync` → `findOrCreateManagedWebhook` → `syncBackfill` on startup
- **Seed Script**: `scripts/src/seed-stripe-products.ts` — creates Stripe products/prices and writes Price IDs to `subscription_tiers` table
  - Run: `STRIPE_SECRET_KEY=<key> pnpm --filter @workspace/scripts run seed-stripe`
- **Checkout Flow**: `POST /api/subscriptions/create-checkout-session` creates Stripe Checkout session, redirects user to Stripe
- **Free Downgrade**: `POST /api/subscriptions/subscribe` handles free-tier downgrade (cancels Stripe subscription)
- **Founder Discount**: Auto-applies coupon (repeating, 6 months) for founder users during checkout
- **Webhook Secret**: Managed by `stripe-replit-sync` via `findOrCreateManagedWebhook()` — no manual `STRIPE_WEBHOOK_SECRET` env var needed
- **Env Vars**: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` set as shared env vars
- **DB Columns**: `stripe_price_id_monthly`, `stripe_price_id_annual` on tiers; `stripe_customer_id`, `stripe_subscription_id`, `stripe_checkout_session_id` on user_subscriptions

### API Routes
- `POST /api/auth/register` — register (auto-founder for first 20)
- `POST /api/auth/login` — login, returns JWT in cookie
- `GET /api/auth/me` — current user + subscription
- `POST /api/auth/logout` — clear cookie
- `GET /api/subscriptions/tiers` — list tiers + founder spots
- `POST /api/subscriptions/subscribe` — subscribe/downgrade to free tier
- `POST /api/subscriptions/create-checkout-session` — create Stripe Checkout session for paid tiers
- `GET /api/subscriptions/my` — current subscription
- `POST /api/stripe/webhook` — Stripe webhook endpoint (raw body, before express.json)
- `POST /api/stripe/checkout-completed` — internal Stripe event handler
- `GET/PUT /api/admin/users` — manage users
- `PUT /api/admin/users/:id/subscription` — set custom pricing per user
- `GET/PUT /api/admin/tiers` — manage tier pricing
- `GET/PUT /api/admin/settings` — global config (admin-only)
- `GET /api/admin/app-config` — public endpoint returning non-sensitive config (branding, toggles, discipline settings, routine items)

### Admin Configuration Panel (Settings Tab)
Seven collapsible sections:
1. **Branding**: App name, tagline (drives Login/Layout/Header text)
2. **Founder Program**: Founder limit, discount %, duration, annual discount
3. **Discipline & Risk**: Cooldown duration (hours), consecutive loss threshold, gate lockout (minutes), daily/weekly risk limits
4. **Daily Planner**: Configurable routine checklist items (label, description, icon)
5. **AI Mentor**: Custom system prompt override (blank = built-in ICT prompt)
6. **Feature Toggles**: On/off switches for Discipline Gate, Cooldown Timer, Hall of Fame, Win Rate Estimator, Casino Elements, Daily Spin
7. **Danger Zone**: Hard reset with 2-step confirmation

- `AppConfigContext.tsx` provides `useAppConfig()` hook — fetches `/api/admin/app-config` once, shares config to all components
- Feature toggles control runtime rendering of features across DailyPlanner, CoolDownOverlay, DisciplineGate
- Tier features are now editable from the admin Tiers tab (add/remove feature text)
- AI mentor system prompt is kept server-side only (excluded from public config endpoint)

### Frontend Features
- Login/Signup pages with gold branding and serif headings
- **Dashboard** (`/dashboard`): Main hub landing page with ICT mascot, gamified status row (level/rank/streak/badges), daily spin wheel, slot machine daily challenge, ICT quick reference flip-cards (12 terms), live market sessions board, achievements, premium teaser, and quick-nav cards
- **ICT Academy** now at `/academy` (previously at `/`)
- **IndexRedirect** (`/`) → redirects to `/dashboard` after welcome tour
- Founder welcome modal with crown animation
- Pricing page with monthly/annual toggle and founder discount display
- Admin dashboard with user management, tier editing, global settings, AI Assistant panel
- Casino-game elements: daily streak, spin wheel, achievements, premium teasers, slot machine mission generator
- Sidebar shows user profile, subscription status, founder badge; Dashboard is first nav item
- Feature locking based on subscription tier

### AI Assistant (Persistent Global Chat)
- **Web**: Top bar input (desktop) + floating action button (mobile) with slide-out side drawer
- **Mobile**: Floating action button on all tabs with full-screen modal drawer
- **Component**: `artifacts/web/src/components/AIAssistant.tsx` (web), `artifacts/mobile/components/AIAssistant.tsx` (mobile)
- **Backend**: `artifacts/api-server/src/routes/gemini/index.ts` — Gemini function calling with tool declarations
- **User tools**: navigate, log_trade, get_journal_entries, get_analytics_summary, calculate_position_size, complete_planner_items, get_user_context
- **Admin tools**: list_users_summary, get_platform_stats, get_inactive_users, suggest_system_prompt
- **Context injection**: Current page, route, user name, tier level, admin status, routine completion sent with each message
- **Admin AI panel**: Dedicated AI chat in Admin page with "Generate Platform Summary" and "AI-Draft System Prompt" buttons
- **Mentor tab removed**: Previously in ICT Academy (web and mobile), now replaced by persistent global AI assistant

### Discipline & Psychology Features
- **Discipline Gate** (`DisciplineGate.tsx`): Daily 3-question quiz (narrative/math/awareness) before accessing trading tools. 3/3 required, configurable lockout on failure (default 60 min). Respects `feature_discipline_gate` toggle. Stored per day in localStorage.
- **Adaptive Glossary**: Glossary terms have basic + advanced tiers. Advanced unlocks when user completes related lessons (`requiredLessons` field). Terms with advanced tiers: FVG, MSS, Liquidity Sweep, OTE, Kill Zone.
- **Win-Rate Estimator**: Shows projected win-rate in Trade Plan section based on API trade history. Filters by bias and session focus. Respects `feature_win_rate_estimator` toggle.
- **Cool Down Timers** (`CoolDownOverlay.tsx`): Tracks consecutive losses via `recordTradeResult()` (wired into SmartJournal). Configurable threshold (default 2) and duration (default 4 hours). Duration stored at activation time to survive reloads. Respects `feature_cooldown_timer` toggle.
- **Hall of Fame** (`HallOfFame.tsx`): Discipline streak tracking (current/best/total). 7 achievements (First Step → ICT Elite). Recorded when morning routine is completed. Respects `feature_hall_of_fame` toggle. Data in localStorage.
- **Graduation Celebration** (`GraduationCelebration.tsx`): Full-screen confetti + diploma animation when all lessons + quiz completed.
- **TradingView Indicators** (Tools tab in Academy): 12 recommended indicators organized by category (Core/Supporting/Optional). Each card expands to show description, ICT concept mapping, setup instructions, and TradingView search term. Includes "Recommended Starter Setup" section. Data in `RECOMMENDED_INDICATORS` array in `academy-data.ts`.

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly`

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server with auth middleware, subscription management, and admin routes.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS (restricted origins), cookie-parser, JSON/urlencoded, routes at `/api`, seeds defaults
- Middleware: `src/middleware/auth.ts` — JWT auth with httpOnly cookies, secure+SameSite=None on Replit, admin role check
- Routes: auth, subscriptions, admin, gemini, prop, trades, webhook
- Seed: `src/seed.ts` — creates default tiers and admin settings on startup

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

- Schema files: users.ts, subscriptions.ts, admin_settings.ts, conversations.ts, messages.ts, trades.ts, prop_account.ts
- Production migrations handled by Replit on publish. Dev: `pnpm --filter @workspace/db run push`

### `artifacts/web` (`@workspace/web`)

React + Vite web application with auth-gated access.

- Auth: `src/contexts/AuthContext.tsx` — JWT session management via cookies, tier checking
- Pages: Login, Signup (with founder modal), Pricing (with annual toggle), Admin dashboard
- Casino elements: `src/components/CasinoElements.tsx` — daily streak, spin wheel, achievements, premium teasers
- Layout: Subscription-aware navigation with user menu, admin link, upgrade prompts
- Free users see casino sidebar on right with spin wheel, streaks, achievements, and blurred premium content
- Preview path: `/web/`

### `artifacts/mobile` (`@workspace/mobile`)

Expo React Native mobile app with 4 tabs (same as before, no auth changes yet).

### `artifacts/mockup-sandbox` (`@workspace/mockup-sandbox`)

Vite + React component preview server for canvas mockups.
