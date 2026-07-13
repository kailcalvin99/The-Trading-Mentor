# The Trading Mentor Technical Debt

## Staging-readiness corrections — 2026-07-12

Completed:

- Normal startup no longer runs `stripe-replit-sync`, creates webhooks, backfills Stripe, seeds data, or infers jobs from Replit variables.
- Checkout redirect authority is `PUBLIC_APP_URL`; first-user admin promotion is removed.
- AI is globally disabled by default before request writes/streams/provider calls.
- Readiness probes the database with a timeout, shutdown closes the pool, and production cannot invoke the destructive reset.

Remaining / protected:

- The explicit Stripe bootstrap still uses `stripe-replit-sync` and must be replaced or validated only during approved Stripe test staging.
- Production database baseline adoption, backups, monitoring, hosting, secrets, provider configuration, deployment, and DNS remain unverified.

## RC1 Corrections — 2026-07-12

Completed:

- Local `.env` checker/runtime drift is removed through one Node built-in loader.
- `beta_feedback_logs` creation is removed from API startup; Drizzle migrations are authoritative.
- Exact legacy migration collision handling rejects incompatible structures and creates its foreign key idempotently.
- Smart Journal trade contracts now carry all three Multi-Chart images.
- Risk Shield and public legal routes match registered application routes.
- Smart Journal generated-client requests now use the configured API origin, and tour introduction navigation no longer loops on an already-current route.
- Smart Journal file controls have direct production-component coverage through a focused Vitest/jsdom harness using synthetic browser files.

Production-unverified:

- Disposable PostgreSQL migration and authenticated image persistence have direct local evidence; production migration remains unverified.
- Live production browser/provider behavior remains unverified; the codebase file-control contract and disposable-database persistence paths pass.
- Live AI, live Stripe, deployment, DNS, and production data remain untested by design.

## Critical

### Legacy Stripe Bootstrap

Files:

- `artifacts/api-server/src/index.ts`
- `artifacts/api-server/src/stripe/stripeClient.ts`
- `artifacts/api-server/src/stripe/webhookHandlers.ts`

Debt:

- Ordinary startup is clean. The separately invoked `pnpm stripe:bootstrap` command still uses `stripe-replit-sync` temporarily.

Target:

- Use direct Stripe SDK.
- Use explicit `STRIPE_WEBHOOK_SECRET`.
- Use configured public app/API URL.

### Trusted Checkout URLs

File:

- `artifacts/api-server/src/routes/subscriptions/index.ts`

Debt:

- Corrected: checkout success/cancel URLs use validated `PUBLIC_APP_URL` only.

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
