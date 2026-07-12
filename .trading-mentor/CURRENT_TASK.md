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

## Proposed

- Founder reviews the RC1 draft PR.
- Fix and repeat the browser Smart Journal save, preview, and remove/replace flow using an approved file-upload-capable browser path.

## Protected / Manual

- Keep Stripe rotation issue #8 open.
- Do not merge, deploy, migrate production data, change DNS, or use live Stripe/AI in this lane.

## Production-Unverified

- Production hosting, database, AI, Stripe, and customer workflows remain untouched.
- Browser file attachment was unavailable through the installed bridge, and the attempted no-image Smart Journal browser save did not persist a row while React reported maximum-update-depth errors.

## Acceptance Decision

RC1 remains `RC1 CODEBASE INCOMPLETE` because the rendered Smart Journal save path failed and the three-image preview/remove/replace path remains unverified, despite successful disposable-database and API persistence evidence.
