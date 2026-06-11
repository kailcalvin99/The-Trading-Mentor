# The Trading Mentor Risks

## Critical

### Secrets in Source History

Stripe test key values were present in `.replit`.

Impact:

- Even test keys should be treated as compromised once committed or shared.

Mitigation:

- Rotate the Stripe test keys.
- Confirm no live keys were committed.
- Keep secrets in host secret manager or ignored `.env` only.
- Consider history cleanup before publishing a public repo.

### Replit Lock-In

The app relies on Replit deployment config, env vars, and integration behavior.

Impact:

- A normal host may fail at build, startup, Stripe webhook registration, AI calls, CORS, cookies, or mobile build.

Mitigation:

- Audit and replace each Replit assumption in a separate migration lane.

### Financial-Safety and Promotional Claims

Trading products can create legal, refund, and trust risk if they imply profits, signals, or personalized advice.

Impact:

- User harm, chargebacks, regulatory risk, account bans, and brand damage.

Mitigation:

- Keep the product education-first.
- Audit all copy and AI responses.
- Get qualified legal review before paid scale.

## High

### Branch Confusion

GitHub `origin/main` appears to contain older LifeOS prototype work, while `origin/master` is the Trading Mentor line used for the corrected foundation branch.

Impact:

- Merging or changing the default branch without review could make the wrong project look canonical.

Mitigation:

- Review the corrected foundation PR against `master`.
- Decide whether to keep `master`, rename it to `main`, or reset `main` only after founder review.
- Do not remove Replit remotes until the GitHub base branch is confirmed.

### Database Migration Unknown

The current production database location and export path are not confirmed.

Impact:

- Moving off Replit could lose users, subscriptions, journals, trades, or admin settings.

Mitigation:

- Identify current database provider.
- Export backup.
- Validate restore into staging before production cutover.

### Stripe Webhook Migration

The current server uses `stripe-replit-sync` and managed webhook setup.

Impact:

- Subscription status may break outside Replit.

Mitigation:

- Move to direct Stripe webhook secret verification in staging.
- Verify checkout, renewal, cancellation, and downgrade paths.

### Domain Cutover Risk

The live domain is already public.

Impact:

- DNS mistakes can create downtime.

Mitigation:

- Deploy staging first.
- Keep Replit live until replacement is verified.
- Document rollback before DNS changes.

## Medium

### Over-Gamification

Casino-style mechanics may weaken trust or encourage impulsive trading.

Mitigation:

- Keep rewards tied to discipline, journaling, and risk limits.
- Remove or soften features that imply trading is entertainment.

### Offer Clarity

Feature-rich products can confuse users before they understand why to pay.

Mitigation:

- Tighten onboarding and pricing.
- Focus the message on discipline, risk, journal, academy, and review.

### Duplicate Local Copies

There are multiple local Trading Mentor folders.

Mitigation:

- Choose one canonical repo.
- Archive duplicates after backup.
