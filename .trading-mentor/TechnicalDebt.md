# The Trading Mentor Technical Debt

## RC1 Corrections — 2026-07-12

Completed:

- Local `.env` checker/runtime drift is removed through one Node built-in loader.
- `beta_feedback_logs` creation is removed from API startup; Drizzle migrations are authoritative.
- Exact legacy migration collision handling rejects incompatible structures and creates its foreign key idempotently.
- Smart Journal trade contracts now carry all three Multi-Chart images.
- Risk Shield and public legal routes match registered application routes.
- Smart Journal generated-client requests now use the configured API origin, and tour introduction navigation no longer loops on an already-current route.

Production-unverified:

- Disposable PostgreSQL migration and authenticated image persistence have direct local evidence; production migration remains unverified.
- Browser-selected image preview/remove/replace behavior remains unverified because the available Chrome bridge cannot attach local files.
- Live AI, live Stripe, deployment, DNS, and production data remain untested by design.

## Critical

### Replit-Specific Stripe Startup

Files:

- `artifacts/api-server/src/index.ts`
- `artifacts/api-server/src/stripe/stripeClient.ts`
- `artifacts/api-server/src/stripe/webhookHandlers.ts`

Debt:

- Server startup runs `stripe-replit-sync` migrations and managed webhook setup.
- Webhook base URL can now use explicit non-Replit domain env vars, but `stripe-replit-sync` remains.
- Stripe secret lookup calls a Replit connection endpoint in development.

Target:

- Use direct Stripe SDK.
- Use explicit `STRIPE_WEBHOOK_SECRET`.
- Use configured public app/API URL.

### Replit Domain Checkout URLs

File:

- `artifacts/api-server/src/routes/subscriptions/index.ts`

Debt:

- Checkout success/cancel URLs depend on `REPLIT_DEV_DOMAIN` or request host.

Target:

- Use explicit production app URL env var.

### Replit CORS and Cookie Logic

Files:

- `artifacts/api-server/src/app.ts`
- `artifacts/api-server/src/middleware/auth.ts`

Debt:

- CORS allows Replit domains.
- Cookie SameSite behavior depends on `REPL_ID`.

Target:

- Use explicit allowed origins and environment mode.

## High

### Vite Config Requires Replit-Style Env Vars

Files:

- `artifacts/web/vite.config.ts`
- `artifacts/mockup-sandbox/vite.config.ts`

Debt:

- `PORT` and `BASE_PATH` are required even for normal local commands.
- Replit plugins are included.

Target:

- Provide sane local defaults.
- Keep Replit plugins only while needed, then remove after migration.

### pnpm Workspace Is Not Local-Ready

Debt:

- Current shell lacks `pnpm`.
- `pnpm-workspace.yaml` has platform exclusions described as Replit-specific.

Target:

- Pin `packageManager`.
- Document install path.
- Make Mac/Linux installs work outside Replit.

### Gemini Integration Is Replit-Shaped

Files:

- `lib/integrations-gemini-ai/src/client.ts`
- `lib/integrations-gemini-ai/src/image/client.ts`

Debt:

- Requires `AI_INTEGRATIONS_GEMINI_BASE_URL` and `AI_INTEGRATIONS_GEMINI_API_KEY`.

Target:

- Create provider adapter with explicit direct provider env vars.
- Keep AI disabled gracefully when env vars are missing.

## Medium

### GitHub Remote

Debt:

- The canonical local repo has moved to `/Users/kail/Documents/GitHub/the-trading-mentor`, but no GitHub `origin` remote is configured yet.

Target:

- Create or confirm the GitHub repository, add it as `origin`, and push a review branch before removing Replit remotes.

### Duplicate Project Copies

Debt:

- `/Users/kail/Downloads/The-Trading-Mentor-main` appears to be an export copy without a normal `.git`.
- `/Users/kail/Documents/GitHub/the-trading-mentor` is the better canonical candidate.

Target:

- Archive duplicate after confirming no unique work is missing.
