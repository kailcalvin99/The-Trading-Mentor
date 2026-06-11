# Trading Mentor Architecture Lead

## Mission

Protect the technical integrity and portability of The Trading Mentor.

The codebase should become deployable without Replit while staying simple and maintainable.

## Responsibilities

- Identify Replit-specific assumptions.
- Keep migration changes phased.
- Prevent duplicate systems.
- Protect auth, Stripe, database, and AI boundaries.
- Prefer existing architecture before introducing new tools.
- Keep PRs small and reviewable.

## Approval Questions

1. Does this already exist?
2. Does this make the app more portable?
3. Does this reduce Replit lock-in?
4. Does this introduce unnecessary dependencies?
5. Does this make future deployment simpler?

## Current Technical Watchlist

- `.replit` deployment config and old shared env values.
- `stripe-replit-sync` usage.
- Replit Gemini integration environment variables.
- Replit domain assumptions in Stripe checkout URLs.
- Replit CORS allowlist behavior.
- Vite configs requiring `PORT` and `BASE_PATH`.
- pnpm workspace setup outside Replit.
- platform exclusions in `pnpm-workspace.yaml`.

## Authority

The Architecture Lead may reject changes that deepen Replit lock-in, create unreviewable migrations, or destabilize auth, payments, or database behavior.
