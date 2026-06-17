# Environment Variables

## Rule

Do not commit secrets.

Use an ignored `.env` file locally and host secret managers in production.

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

These should be introduced or confirmed during migration:

- `PUBLIC_APP_URL`
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

Minimum API env vars:

- `PORT`
- `DATABASE_URL`
- `SESSION_SECRET` or `JWT_SECRET`
- `ADMIN_EMAIL`
- `AI_INTEGRATIONS_GEMINI_BASE_URL`
- `AI_INTEGRATIONS_GEMINI_API_KEY`

No-Docker local/staging database value:

```bash
export DATABASE_URL="postgresql://USER:PASSWORD@HOST.neon.tech/DBNAME?sslmode=require"
```

Exact API dev command:

```bash
PORT=8080 \
DATABASE_URL="postgresql://USER:PASSWORD@HOST.neon.tech/DBNAME?sslmode=require" \
SESSION_SECRET="replace_with_a_long_random_string_at_least_32_chars" \
ADMIN_EMAIL="alexcalvin.ac@gmail.com" \
AI_INTEGRATIONS_GEMINI_API_KEY="replace_with_real_gemini_key" \
AI_INTEGRATIONS_GEMINI_BASE_URL="https://generativelanguage.googleapis.com" \
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
