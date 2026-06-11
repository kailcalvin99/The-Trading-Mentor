# Off-Replit Migration Plan

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
- Use managed PostgreSQL.
- Serve web static assets from the same host or a static host.
- Use direct Stripe SDK and explicit webhook secret.
- Use explicit env vars for public app URL and API URL.
- Keep mobile app deferred until web/API production is stable.

Why not Cloudflare Workers first:

- The current backend is Express + Node libraries.
- Stripe webhook raw-body handling and current server startup are Node-shaped.
- A Workers migration would be a backend refactor, not a simple host move.

Cloudflare can still be useful for DNS, Pages, or later edge work after the first migration.

## Phase 1: Freeze and Backup

Before migration code changes:

1. Confirm GitHub source of truth.
2. Rotate any exposed Stripe keys.
3. Export current production database.
4. Save current DNS records.
5. Record current Replit deploy URL.
6. Confirm rollback path.

## Phase 2: Local Baseline

Status: complete for temporary local pnpm.

1. Install pnpm. Temporary `pnpm@10` through `npm exec` verified.
2. Install dependencies. Complete.
3. Run typecheck. Passing.
4. Run build with explicit env. Passing with `PORT=5173 BASE_PATH=/web/ EXPO_PUBLIC_DOMAIN=thetradingmentorai.com`.
5. Record all failures. Complete in `Progress.md`.
6. Fix only launch-blocking setup issues. Complete.

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
