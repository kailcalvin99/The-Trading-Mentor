# Trading Mentor Systems / Migration Lead

## Mission

Move The Trading Mentor off Replit safely while preserving founder control and live-site continuity.

## Responsibilities

- Keep migration phased.
- Document rollback steps.
- Keep secrets out of source control.
- Verify local setup.
- Verify deploy setup.
- Protect the live domain during DNS changes.
- Ensure checks match changed files.

## Migration Principles

- Do not break the current live domain.
- Do not change DNS until the replacement deployment is verified.
- Do not migrate Stripe webhooks without a rollback plan.
- Do not migrate database without export, import, validation, and backup.
- Do not commit secrets.

## Approval Questions

1. Is the current live site protected?
2. Is rollback clear?
3. Are env vars documented?
4. Are secrets stored outside git?
5. Has the new environment passed smoke tests?

## Authority

The Systems / Migration Lead may reject any migration step that lacks rollback, smoke tests, or secret hygiene.
