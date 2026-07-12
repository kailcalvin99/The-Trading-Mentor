# Off-Replit Migration Plan

## RC1 Codebase Status — 2026-07-12

Completed:

- Development `.env` loading and the local environment checker use the same Node runtime path.
- Drizzle migrations are the only schema authority for `beta_feedback_logs`.
- Migration `0001` supports fresh and exact legacy-table states while rejecting incompatible structures.
- `pnpm --filter @workspace/db migrate` refuses to run without `DATABASE_URL`.

Validated:

- Static Drizzle migration consistency and RC1 SQL/journal contract tests pass.

Protected/manual:

- Production database identity, export/import, Stripe, hosting, DNS, and secrets remain outside RC1 scope.

Production-unverified:

- No PostgreSQL migration was executed; no existing disposable local PostgreSQL instance was available.
- Do not run migrations against Replit, Neon staging, production, or an unidentified database from this status alone.

## Goal

Move The Trading Mentor off Replit without breaking the current live site, losing data, or breaking payments.

## Current Replit Touchpoints

Configuration:

- `.replit`
- `.replitignore`
- Replit remotes
- `replit.md`

Dependencies:

- `@replit/connectors-sdk`
- `stripe-replit-sync`
- `@replit/vite-plugin-cartographer`
- `@replit/vite-plugin-dev-banner`
- `@replit/vite-plugin-runtime-error-modal`

Environment:

- `REPLIT_DOMAINS`
- `REPLIT_DEV_DOMAIN`
- `REPLIT_DEPLOYMENT`
- `REPL_ID`
- `REPLIT_INTERNAL_APP_DOMAIN`
- `REPLIT_EXPO_DEV_DOMAIN`
- Replit Gemini env vars

Code assumptions:

- Stripe managed webhook setup depends on Replit domain env.
- Checkout success/cancel URLs use Replit env fallback.
- CORS allows Replit domains.
- Cookie behavior changes based on Replit env.
- Mobile scripts infer deployment domains from Replit env.
- Gemini integration expects Replit AI integration endpoints.

## Recommended Target Architecture

Fastest safe path:

- Keep Express API as a normal Node service.
- Use Neon Postgres as the managed PostgreSQL database.
- Serve the Vite web app from Cloudflare Pages.
- Run the Express API on Railway as a normal Node service.
- Use direct Stripe SDK and explicit webhook secret.
- Use explicit env vars for public app URL and API URL.
- Keep mobile app deferred until web/API production is stable.

Why not Cloudflare Workers first:

- The current backend is Express + Node libraries.
- Stripe webhook raw-body handling and current server startup are Node-shaped.
- A Workers migration would be a backend refactor, not a simple host move.

Cloudflare is useful now for Pages/static hosting. Cloudflare Workers should wait until a later backend refactor, if ever needed.

Current cheapest staging recommendation:

- Web: Cloudflare Pages
- API: Railway
- DB: Neon Postgres

Cost-control note: re-check provider pricing before production cutover. This recommendation is for the smallest staging path, not a final long-term infrastructure contract.

## Phase 1: Freeze and Backup

Before migration code changes:

1. Confirm GitHub source of truth.
2. Rotate any exposed Stripe keys.
3. Export current production database.
4. Save current DNS records.
5. Record current Replit deploy URL.
6. Confirm rollback path.

## Phase 2: Local Baseline

Status: documented for local Mac web/API startup in `LOCAL_MAC_SETUP.md`.

Current local blockers found during the cost-control setup pass:

- Docker is not installed on this Mac, so the documented local PostgreSQL container path cannot run yet.
- The shell does not currently have `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_EMAIL`, or Gemini env vars set.
- API startup should be verified after those env vars and a local PostgreSQL database are available.
- The web dev server can be started with explicit `PORT`, `BASE_PATH`, and `VITE_API_URL`, but useful authenticated app testing still needs the API.

Next local baseline steps:

1. Create a Neon Postgres database or install Docker Desktop.
2. Prefer Neon if Docker is missing or Alex wants the fastest staging-like path.
3. Export the minimum API env vars from `LOCAL_MAC_SETUP.md`.
4. Run `pnpm --filter @workspace/db push`.
5. Run API and web in separate terminals.
6. Keep Replit live until staging passes smoke tests.

## Phase 3: Make Config Portable

Required changes:

- Add explicit `PUBLIC_APP_URL` or equivalent.
- Add explicit `API_BASE_URL` or equivalent.
- Add explicit `STRIPE_WEBHOOK_SECRET`.
- Remove Replit domain fallback from payment URLs.
- Replace Replit CORS fallback with explicit `ALLOWED_ORIGINS`.
- Make cookie policy controlled by environment.
- Make Vite build work with local defaults or documented env vars.

## Phase 4: Stripe Migration

1. Create Stripe test webhook endpoint for staging.
2. Verify raw-body webhook handling.
3. Verify checkout session creation.
4. Verify checkout success.
5. Verify subscription update.
6. Verify cancellation/downgrade.
7. Verify founder discount behavior.
8. Only then configure live webhook.

## Phase 5: Database Migration

1. Identify current Replit PostgreSQL connection.
2. Export database.
3. Create new managed PostgreSQL instance.
4. Import into staging.
5. Run schema validation.
6. Verify users, subscriptions, trades, journal, prop account, conversations, and admin settings.
7. Backup before production cutover.

## Phase 6: Staging Deploy

Smallest safe staging option for the current architecture:

- Deploy the Express API as a Railway Node web service.
- Use Neon Postgres for staging `DATABASE_URL`.
- Serve the Vite web build from Cloudflare Pages.
- Use explicit staging env vars instead of Replit-injected domains.
- Keep Stripe in test mode for staging.

This is preferred over a Cloudflare Workers rewrite because the current backend is Express/Node-shaped.

Mobile remains frozen in this phase. Expo/mobile validation should not block the web/API/DB staging path unless a web or API change explicitly touches mobile behavior.

Smoke test:

- `/api/health`
- web app load
- login
- signup
- admin access
- pricing page
- checkout session
- Stripe webhook
- daily planner
- journal
- risk shield
- AI assistant disabled or working

## Phase 7: Production Cutover

1. Keep Replit live.
2. Deploy production replacement.
3. Set production env vars.
4. Configure Stripe live webhook.
5. Smoke test direct host URL.
6. Update DNS.
7. Smoke test `https://thetradingmentorai.com/`.
8. Monitor errors and payments.
9. Keep Replit rollback available until stable.

## Rollback

Rollback must be possible before DNS changes.

Minimum rollback plan:

- Restore previous DNS A/CNAME records.
- Re-enable old Stripe webhook if changed.
- Keep old Replit database untouched until new database is validated.
- Keep Replit deploy live until at least one stable production window passes.
