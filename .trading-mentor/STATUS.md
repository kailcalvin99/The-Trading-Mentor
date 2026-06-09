# The Trading Mentor Status

## Snapshot

Date: 2026-06-09 local CDT

Local repo:

`/Users/kail/Documents/GitHub/the-trading-mentor`

Branch:

`codex/trading-mentor-foundation-pr`

GitHub remote:

`git@github.com:kailcalvin99/The-Trading-Mentor.git`

Draft PR:

`https://github.com/kailcalvin99/The-Trading-Mentor/pull/6`

Live domain:

`https://thetradingmentorai.com/`

Current live hosting clue:

- DNS resolves to `34.111.179.208`.
- HTTP response reports `server: Google Frontend`.
- The site is publicly reachable.

## Product State

The app is a full-stack pnpm monorepo originally built on Replit.

Major surfaces documented in `replit.md`:

- Dashboard
- ICT Academy
- Daily Planner
- Risk Shield
- Smart Journal
- Analytics
- Pricing
- Admin
- Settings
- Persistent AI Assistant

Core stack:

- pnpm workspaces
- React + Vite web app
- Expo mobile app
- Express API server
- PostgreSQL + Drizzle ORM
- Stripe subscriptions
- Gemini AI integration through Replit-style env vars

## Current Business Read

MVP estimate: 70%

The product appears feature-rich and close to useful, but not business-ready until the infrastructure, trust, payment, and migration risks are handled.

## Local Baseline

Status: passing

Commands verified:

```bash
npm exec --yes pnpm@10 -- install
npm exec --yes pnpm@10 -- run typecheck
PORT=5173 BASE_PATH=/web/ EXPO_PUBLIC_DOMAIN=thetradingmentorai.com npm exec --yes pnpm@10 -- run build
pnpm run typecheck
PORT=5173 BASE_PATH=/web/ EXPO_PUBLIC_DOMAIN=thetradingmentorai.com pnpm run build
git diff --check
```

Notes:

- `pnpm@10.34.1` is installed globally.
- The full production build now completes for API, web, mockup sandbox, and mobile static Expo output.
- Build artifacts are ignored through `.gitignore`.

## Confirmed Risks

- Replit-specific deployment assumptions still remain in code and config.
- Stripe test keys were stored in `.replit`; they have been removed locally and should be rotated.
- `.config/` was untracked and is now ignored.
- The repo has been moved out of Downloads.
- GitHub `origin` is configured.
- Multiple Replit remotes still exist and should not be removed until the PR is reviewed.
- `stripe-replit-sync` is still tied into server startup and webhooks, though API startup no longer requires top-level await and can use explicit non-Replit domain env vars.
- Stripe success/cancel URLs use Replit domain env fallback.
- CORS and cookies contain Replit-specific behavior.

## Current Best Next Action

Review draft PR #6 and rotate exposed Stripe test keys before more product work.

Recommended next task:

1. Review draft PR #6.
2. Rotate the exposed Stripe test keys.
3. Decide whether `master` or `main` should become the canonical GitHub base branch.
4. Create staging hosting and managed Postgres.
5. Continue Replit migration with Stripe checkout/webhook URLs, CORS, cookies, and Gemini env handling.
