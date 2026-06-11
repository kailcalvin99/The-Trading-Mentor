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
