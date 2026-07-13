# Environment Variables

## Rule

Do not commit secrets.

Use an ignored `.env` file locally and host secret managers in production.

Local development requires Node.js 20.12.0 or newer because API startup and `check:local-env` share Node's built-in environment-file loader. Existing shell or host values take precedence over `.env` values.

Apply committed Drizzle migrations only after confirming the database is disposable or explicitly approved:

```bash
pnpm --filter @workspace/db migrate
```

The migration command refuses to run when `DATABASE_URL` is absent. Never point it at an unknown or production database without an approved migration window.

## Current Variables Seen In Code

Server/API:

- `PORT`
- `DATABASE_URL`
- `SESSION_SECRET`
- `JWT_SECRET`
- `ALLOWED_ORIGINS`
- `APP_DOMAIN`
- `PUBLIC_DOMAIN`
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `ADMIN_EMAIL`
- `PUBLIC_APP_URL`
- `AI_ENABLED`
- `ENABLE_DESTRUCTIVE_ADMIN_RESET`
- `REPLIT_DOMAINS`
- `REPLIT_DEV_DOMAIN`
- `REPLIT_DEPLOYMENT`
- `REPL_ID`

Web/build:

- `PORT`
- `BASE_PATH`
- `VITE_API_URL`

AI:

- `AI_INTEGRATIONS_GEMINI_BASE_URL`
- `AI_INTEGRATIONS_GEMINI_API_KEY`

Mobile:

- `EXPO_PUBLIC_DOMAIN`
- `EXPO_PUBLIC_REPL_ID`
- `REPLIT_EXPO_DEV_DOMAIN`
- `REPLIT_INTERNAL_APP_DOMAIN`

## Migration Target Variables

These remain future or provider-specific migration variables:

- `PUBLIC_API_URL`
- `STRIPE_WEBHOOK_SECRET`
- `COOKIE_SECURE`
- `COOKIE_SAMESITE`
- provider-specific AI key

## Local Build Notes

Current Vite configs require:

```bash
PORT=5173 BASE_PATH=/web/ EXPO_PUBLIC_DOMAIN=thetradingmentorai.com pnpm run build
```

This is a migration target. A normal local build should eventually have safe defaults.

Global `pnpm@10.34.1` is installed on this machine. If another machine does not have pnpm, this temporary form is also verified:

```bash
PORT=5173 BASE_PATH=/web/ EXPO_PUBLIC_DOMAIN=thetradingmentorai.com npm exec --yes pnpm@10 -- run build
```

## Local Web/API Startup Notes

Detailed local Mac commands live in `LOCAL_MAC_SETUP.md`.

### Local Secret Entry Rule

Enter real secrets only in your local Mac Terminal session or in the deployment host secret manager.

Do not paste real `DATABASE_URL`, Gemini keys, Stripe keys, or session secrets into chat, screenshots, docs, Git commits, GitHub issues, or pull requests.

Minimum API startup env vars:

- `PORT`
- `DATABASE_URL`
- `SESSION_SECRET` or `JWT_SECRET`
- `PUBLIC_APP_URL`
- `ADMIN_EMAIL` only when testing explicit administrator assignment

No-Docker local/staging database value:

```bash
read -r -s -p "Paste Neon DATABASE_URL for this shell only: " DATABASE_URL
export DATABASE_URL
printf '\nDATABASE_URL is set for this shell only.\n'
```

After the required API env vars are set in the same Terminal window, start the API with:

```bash
PORT=8080 \
NODE_ENV=development \
pnpm --filter @workspace/api-server dev
```

Minimum web env vars:

- `PORT`
- `BASE_PATH`
- `VITE_API_URL`

Exact web dev command:

```bash
PORT=5173 BASE_PATH=/web/ VITE_API_URL=http://localhost:8080/api pnpm --filter @workspace/web dev
```

Optional but needed for full feature testing:

- `STRIPE_SECRET_KEY`
- `AI_ENABLED=true` plus provider variables only for an explicitly approved AI test
- `pnpm stripe:bootstrap` only in an explicitly approved Stripe test lane; never during API startup
- `AI_INTEGRATIONS_GEMINI_BASE_URL`
- `AI_INTEGRATIONS_GEMINI_API_KEY`
- `TWELVE_DATA_API_KEY`
- `FINNHUB_API_KEY`
- SMTP variables

Current machine check from the cost-control setup pass:

- `node`, `pnpm`, and `npm` are available.
- `docker` is not installed.
- No required API runtime env vars were present in the shell.

## Cheapest Staging Recommendation

- Web: Cloudflare Pages
- API: Railway
- DB: Neon Postgres

Use host secret managers for real values. Do not commit real Neon URLs, Gemini keys, Stripe keys, or session secrets.

Mobile is frozen for this migration phase. Do not require Expo, native builds, or mobile typecheck to pass before validating the non-Replit web/API/DB path.
