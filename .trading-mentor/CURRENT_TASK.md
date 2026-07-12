# Current Task

## Active Task

Trading Mentor Release Candidate 1 codebase finish and founder review.

Draft review: `https://github.com/kailcalvin99/The-Trading-Mentor/pull/18`

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

## Proposed

- Founder reviews the RC1 draft PR.
- Repeat browser image selection, preview, remove, and replacement using an approved file-upload-capable browser path.

## Protected / Manual

- Keep Stripe rotation issue #8 open.
- Do not merge, deploy, migrate production data, change DNS, or use live Stripe/AI in this lane.

## Production-Unverified

- Production hosting, database, AI, Stripe, and customer workflows remain untouched.
- Browser file attachment remains unavailable through the installed bridge; rendered selection, preview, remove, and replacement are therefore unverified.

## Acceptance Decision

RC1 remains `RC1 CODEBASE INCOMPLETE` because rendered three-image selection, preview, remove, and replacement remain unverified. The rendered save and update-loop blockers now pass.
