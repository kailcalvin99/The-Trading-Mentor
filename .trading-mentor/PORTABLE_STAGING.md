# Portable Staging Contract

## Status

Repository contract complete and statically validated. No host, database, secret, deployment, DNS, live Stripe, or live AI action has occurred.

## Runtime and topology

- Node.js: `>=20.12.0`; package manager: pnpm.
- Preferred topology: one public HTTPS origin. Serve the Vite output under `/web/*`, fall back unknown `/web/*` routes to `/web/index.html`, and reverse proxy `/api/*` to Express.
- Web build: `PORT=5173 BASE_PATH=/web/ EXPO_PUBLIC_DOMAIN=thetradingmentorai.com pnpm --filter @workspace/web build`.
- API build: `pnpm --filter @workspace/api-server build`.
- API start: `pnpm --filter @workspace/api-server start`.
- Liveness: `/api/healthz` (process only). Readiness: `/api/readyz` (bounded `SELECT 1`).

## Environment contract

| Variable | Exposure | Requirement |
| --- | --- | --- |
| `PORT` | private config | Required by API |
| `NODE_ENV` | private config | `production` on a deployed service |
| `DATABASE_URL` | secret | Required by API and migration job |
| `SESSION_SECRET` or `JWT_SECRET` | secret | Required for authentication |
| `PUBLIC_APP_URL` | private config | Required in production; absolute HTTPS origin only |
| `ALLOWED_ORIGINS` | private config | Required for split-origin web/API; exact comma-separated origins |
| `ADMIN_EMAIL` | private config | Optional explicit admin identity; no automatic first-user admin |
| `VITE_API_URL` | public build config | `/api` for the preferred same-origin topology |
| `AI_ENABLED` | private config | Defaults disabled; set `true` only with approved provider controls |
| Gemini variables | secrets/config | Required only for a separately approved enabled AI mode |
| Stripe secret/webhook variables | secrets | Required only for separately approved Stripe test/live work |
| `ENABLE_DESTRUCTIVE_ADMIN_RESET` | private config | Defaults false and is ignored in production |

Browser-visible `VITE_*` values are never secrets. `PUBLIC_APP_URL` is server-owned and is the sole authority for checkout redirects.

## Controlled jobs

Normal API startup performs no schema migration, seed, Stripe synchronization, webhook creation, or Stripe backfill.

- Database migration: `pnpm --filter @workspace/db migrate` in a separately approved controlled job.
- Legacy Stripe bootstrap (temporary): `pnpm stripe:bootstrap`. This command may mutate Stripe and its sync schema, so it requires explicit staging approval and must never be part of application startup.

AI remains globally disabled unless `AI_ENABLED=true`. Credentials alone do not enable it. The destructive admin reset is unavailable in production.

## Deployment sequence and rollback

1. Build immutable web and API artifacts.
2. Create isolated staging resources only after approval.
3. Install staging secrets through the host secret manager.
4. Run migrations as a separate job, then require `/api/readyz` to pass.
5. Serve `/web/*` with SPA fallback and proxy `/api/*`; run synthetic auth, journal, disabled-AI, and mocked/test-checkout smoke tests.
6. Roll back application code by restoring the prior artifact. Database rollback must use the approved backup/restore or forward-recovery plan; startup never auto-migrates.

Production database baselining, backup/restore rehearsal, Stripe dashboard/webhook configuration, AI provider enablement, monitoring, deployment, and DNS remain protected and production-unverified.
