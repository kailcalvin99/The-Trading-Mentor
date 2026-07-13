# Current Task

## Active Task

Repository-controlled portable staging readiness. RC1 is merged; this task creates no external resources.

## Completed

- Environment checker/runtime parity.
- Safe legacy `beta_feedback_logs` migration handling and Drizzle-only schema authority.
- Smart Journal Multi-Chart Review with three persisted nullable image fields.
- Risk Shield route, public legal-route, CTA truth, and accessibility corrections.
- Deterministic disabled-AI and mocked-checkout safety tests.

## Validated

- Required install, typecheck, build, Drizzle static check, focused tests, and diff checks pass.
- Public landing, login, signup, pricing, and legal-link rendering were checked locally.
- Disposable PostgreSQL migration execution passed for fresh and exact legacy states, including row preservation, foreign-key idempotency, journal truth, and nullable chart columns.
- Synthetic local registration/login and authenticated API persistence passed for three-chart and no-chart trades; authenticated Risk Shield rendered in the browser.
- Rendered Smart Journal saves now reach the configured API, create exactly one row per submission, and show saved entries after re-fetch.
- The tour introduction route guard prevents the reproduced maximum-update-depth remount cycle.
- Production Smart Journal file inputs and handlers pass focused component validation for three compressed previews, independent removal/replacement, one final three-field payload, and a single no-image payload.

## Proposed

- Founder reviews the staging-readiness draft PR. A separately approved lane selects and creates isolated staging resources.

## Protected / Manual

- Keep Stripe rotation issue #8 open.
- Do not merge, deploy, create resources, install secrets, migrate production data, change DNS, or use live Stripe/AI in this lane.

## Production-Unverified

- Production hosting, live browser/provider configuration, live AI, live Stripe, and customer workflows remain unverified by design.

## Acceptance Decision

All authorized RC1 codebase acceptance criteria pass. Decision: `RC1 CODEBASE COMPLETE — PRODUCTION UNVERIFIED`.
