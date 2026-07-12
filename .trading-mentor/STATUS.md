# The Trading Mentor Status

## Snapshot

Date: 2026-07-12 local CDT

- Canonical repository: `/Users/kail/Documents/GitHub/the-trading-mentor`
- Canonical branch: `master`
- Verified RC1 base: `d2e8eabd499ea85cc67933d72e447bc04f558ed1`
- RC1 branch: `codex/trading-mentor-rc1-finish-v1`
- Draft PR: `https://github.com/kailcalvin99/The-Trading-Mentor/pull/18`
- Live domain remains unchanged: `https://thetradingmentorai.com/`

## Completed

- Local development startup and `check:local-env` share Node's built-in environment-file loader.
- Drizzle migrations are the sole authority for migrated tables; API startup no longer creates `beta_feedback_logs`.
- Migration `0001` supports a fresh database or the exact legacy table while rejecting incompatible structures and avoiding duplicate foreign keys.
- Smart Journal supports three nullable, compressed chart screenshots through schema, API, generated contracts, form controls, and saved-entry display.
- `/risk-shield` renders the existing Risk Shield page.
- Public legal links use the routes registered by the application.
- Misleading paid-plan free-trial and contradictory founder-lifetime wording were removed.
- Missing AI configuration returns a deterministic disabled response without calling a provider.
- Generated web API requests use the configured API origin, so rendered Smart Journal saves reach the local API instead of the Vite origin.
- Tour introduction navigation stops when the current route already matches, preventing the persisted introduction/remount update loop.

## Validated

- Frozen pnpm install, library/mobile/root TypeScript, API build, web build, Drizzle static check, 17 focused RC1 tests, and `git diff --check` pass.
- Rendered local checks passed for landing, login navigation, signup form, pricing surface, and corrected legal links.
- Static migration tests cover fresh, exact-legacy, incompatible-contract, row-preservation, foreign-key, idempotency, journal, and startup-authority contracts.
- Disposable PostgreSQL 16 execution passed for fresh, exact-legacy, and missing-foreign-key states. Legacy rows remained intact, the foreign key was singular, the three chart columns were nullable, and the Drizzle journal recorded all three migrations.
- A synthetic local account passed registration, login, authenticated Risk Shield rendering, API-backed three-chart persistence and re-fetch, no-image trade compatibility, chart-payload rejection cases, and deterministic disabled-AI behavior.
- Rendered synthetic-account validation passed for stable tour transition, two single-submit no-image journal saves, exact database row counts, and the saved three-chart layout after an authenticated API-created test entry.
- A focused jsdom/Vitest render of the production Smart Journal component passed JPEG, PNG, and WebP selection through the real file inputs, FileReader, compression, preview, independent remove/replace, accessible labels, payload validation, single-submit, and no-image paths.

## Proposed

- Re-run checkout with Stripe test-mode configuration and AI with an approved non-production provider only in a later protected staging lane if live-provider staging is desired.

## Protected / Manual

- Issue #8 remains open for Stripe key rotation and host secret-manager confirmation.
- Deployment, DNS, production database migration, live Stripe, and live AI require separate founder approval.

## Production-Unverified

- Production migration, production authentication, live AI, live Stripe, deployment, and customer workflows were not exercised.
- Production browser/provider execution remains unverified; the RC1 file-control contract is validated autonomously with synthetic browser `File` objects through the production component and handlers.
- No production system, customer data, credential, provider, payment, or deployment was accessed.
