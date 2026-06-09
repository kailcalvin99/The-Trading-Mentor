# The Trading Mentor Roadmap

## Current Phase

Phase 0: Business and migration foundation.

## MVP Completion Estimate

70%

Why not higher:

- The product has many features.
- The repo is still Replit-shaped.
- Local setup is verified with global `pnpm@10.34.1`.
- Payment, auth, database, and AI behavior must be validated outside Replit.
- Trust/compliance boundaries need a careful audit before paid growth.

## Phase 0: Project Brain

Status: Complete

- Add AGENTS.md and leadership rules.
- Add Constitution and agent model.
- Add `.trading-mentor` project brain.
- Add off-Replit migration plan.
- Add business operating plan.
- Remove local checked-in Stripe key values from `.replit`.

## Phase 1: Canonical Repo and Local Baseline

Goal: make the project safe to work on outside Replit.

Tasks:

- Move the canonical repo out of Downloads.
- Connect to a real GitHub repo.
- Remove or archive duplicate copies.
- Install pnpm locally.
- Confirm dependencies install.
- Run `pnpm run typecheck`.
- Run `PORT=5173 BASE_PATH=/web/ pnpm run build`.
- Record all failures as technical debt before broad code edits.

Status:

- Local move complete.
- Global `pnpm@10.34.1` installed.
- Dependency install complete.
- Typecheck passing.
- Production build passing with explicit env.
- GitHub remote and duplicate archive remain open.

## Phase 2: Replit Dependency Audit

Goal: list every Replit dependency before removing anything.

Areas:

- `.replit`
- Replit remotes
- Replit env vars
- Replit Vite plugins
- `stripe-replit-sync`
- Gemini integration env vars
- mobile build scripts
- CORS and cookie behavior
- success/cancel URL generation
- deployment build commands

## Phase 3: Infrastructure Decision

Goal: choose the simplest off-Replit production architecture.

Recommended direction:

- Managed PostgreSQL for database.
- Normal Node host for Express API.
- Static web app served by the same host or a separate static host.
- Direct Stripe webhooks with explicit webhook secret.
- Direct Gemini/OpenAI-style provider integration instead of Replit integration wrapper.

Do not force Cloudflare Workers first unless Alex approves a larger backend refactor.

## Phase 4: Staging Migration

Goal: deploy a non-production staging copy before DNS changes.

Tasks:

- Configure env vars in new host.
- Import database into staging.
- Run migrations.
- Configure Stripe test webhook.
- Verify login/signup.
- Verify pricing page.
- Verify checkout success/cancel.
- Verify API health.
- Verify AI assistant failure behavior if AI env vars are missing.
- Verify web app route refreshes.

## Phase 5: Production Cutover

Goal: move the live domain without losing rollback.

Tasks:

- Backup database.
- Freeze risky deploys.
- Configure production env vars.
- Configure Stripe live webhook.
- Smoke test direct production URL.
- Lower DNS TTL if needed.
- Change DNS.
- Verify domain.
- Keep Replit live temporarily for rollback.
- Decommission Replit after stable monitoring.

## Phase 6: Business Hardening

Goal: turn the product into a credible paid business.

Tasks:

- Tighten onboarding.
- Clarify free and paid value.
- Audit pricing.
- Add trust-safe disclaimers.
- Improve first-week retention loop.
- Add support and refund workflows.
- Build founder-led content funnel.
- Add analytics only after privacy and event naming are clear.
