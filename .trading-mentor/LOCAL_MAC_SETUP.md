# Local Mac Setup

## Purpose

Run the existing web app and API locally without moving the live site off Replit yet.

This is a cost-control and staging-prep path. It is not a product expansion, repo cleanup, Stripe migration, mobile migration, or full Replit removal.

## Current Shape

The project is a pnpm workspace with:

- Express API: `artifacts/api-server`
- React/Vite web app: `artifacts/web`
- PostgreSQL/Drizzle data layer: `lib/db`
- Gemini AI integration through explicit environment variables outside Replit

Keep mobile deferred unless it blocks web/API validation.

## Prerequisites

- Node.js
- pnpm
- Neon Postgres, Docker Desktop, or another PostgreSQL 16 path
- Gemini API key

Verified on this Mac during the setup pass:

```bash
node -v
```

```bash
pnpm -v
```

Current blocker on this Mac:

```bash
docker --version
```

returned `docker: command not found`, so local Docker Postgres cannot be started until Docker Desktop or another PostgreSQL path is installed.

Fastest no-Docker path:

- Create a Neon Postgres project.
- Copy the pooled or direct Neon connection string.
- Use that connection string as `DATABASE_URL`.
- Keep the database empty for staging/local validation unless you are intentionally testing an imported backup.

## Required Local Environment Variables

Minimum API startup:

```bash
export PORT=8080
```

```bash
export DATABASE_URL="postgresql://USER:PASSWORD@HOST.neon.tech/DBNAME?sslmode=require"
```

```bash
export SESSION_SECRET="replace_with_a_long_random_string_at_least_32_chars"
```

```bash
export ADMIN_EMAIL="alexcalvin.ac@gmail.com"
```

```bash
export AI_INTEGRATIONS_GEMINI_BASE_URL="https://generativelanguage.googleapis.com"
```

```bash
export AI_INTEGRATIONS_GEMINI_API_KEY="replace_with_real_gemini_key"
```

Optional local feature variables:

- `STRIPE_SECRET_KEY`: needed to test paid checkout locally.
- `TWELVE_DATA_API_KEY`: needed for Chart Lab candle data.
- `FINNHUB_API_KEY`: needed for live market/economic calendar data.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`: needed for outbound email.

Minimum web startup:

```bash
export PORT=5173
```

```bash
export BASE_PATH="/web/"
```

```bash
export VITE_API_URL="http://localhost:8080/api"
```

Never commit real `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_EMAIL`, or Gemini values.

## Managed PostgreSQL With Neon

Use this path when Docker is missing or Alex wants the cheapest staging-like database setup.

Database actions:

1. Create a Neon project named `the-trading-mentor-local` or `the-trading-mentor-staging`.
2. Copy the Postgres connection string from Neon.
3. Make sure the URL includes SSL, usually `?sslmode=require`.
4. Set it in the terminal session before running Drizzle or the API.

Terminal command:

```bash
export DATABASE_URL="postgresql://USER:PASSWORD@HOST.neon.tech/DBNAME?sslmode=require"
```

Push the existing Drizzle schema into Neon:

```bash
pnpm --filter @workspace/db push
```

Do not edit the database schema for this staging-readiness step. The goal is only to prove that the current schema can be pushed and the current API can connect outside Replit.

## Local PostgreSQL With Docker

Use this only after Docker Desktop is installed and running.

```bash
docker run --name trading-mentor-postgres -e POSTGRES_USER=tradingmentor -e POSTGRES_PASSWORD=tradingmentor -e POSTGRES_DB=trading_mentor -p 5432:5432 -d postgres:16
```

If the container already exists but is stopped:

```bash
docker start trading-mentor-postgres
```

Set the matching database URL:

```bash
export DATABASE_URL="postgresql://tradingmentor:tradingmentor@localhost:5432/trading_mentor"
```

Push the existing Drizzle schema into the local database:

```bash
pnpm --filter @workspace/db push
```

Do not change the schema for local setup unless the existing app cannot start without it.

## Install

This repo intentionally blocks npm installs. Use pnpm.

```bash
pnpm install --frozen-lockfile
```

If pnpm is not installed globally, use:

```bash
npm exec --yes pnpm@10 -- install --frozen-lockfile
```

## Start API

Terminal 1:

```bash
cd /Users/kail/Documents/GitHub/the-trading-mentor
```

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

Health check:

```bash
curl -i http://localhost:8080/api/healthz
```

Expected result:

```text
{"status":"ok"}
```

Known current blocker: this command requires `DATABASE_URL`, `SESSION_SECRET` or `JWT_SECRET`, `ADMIN_EMAIL`, `AI_INTEGRATIONS_GEMINI_BASE_URL`, and `AI_INTEGRATIONS_GEMINI_API_KEY`.

Stripe is intentionally not part of this local startup command. Do not refactor Stripe during the staging-readiness step. Paid checkout can be tested later with Stripe test mode after the API and DB path are stable.

## Start Web

Terminal 2:

```bash
cd /Users/kail/Documents/GitHub/the-trading-mentor
```

```bash
PORT=5173 BASE_PATH=/web/ VITE_API_URL=http://localhost:8080/api pnpm --filter @workspace/web dev
```

Open:

```text
http://localhost:5173/web/
```

The web dev server can start without secrets, but authenticated app screens need the API and database to be running.

## Build Check

Use the existing Replit-compatible build env until portable defaults are introduced.

```bash
PORT=5173 BASE_PATH=/web/ EXPO_PUBLIC_DOMAIN=thetradingmentorai.com pnpm run build
```

## Smallest Non-Replit Staging Path

Use a normal Node host for the current Express app plus managed PostgreSQL. This avoids a backend rewrite.

Cheapest recommended staging shape:

- Web: Cloudflare Pages serving the Vite static build
- API: Railway running `@workspace/api-server` as a Node service
- DB: Neon Postgres using `DATABASE_URL`
- Explicit staging env vars for app URL, API URL, CORS, cookies, Gemini, and Stripe test mode
- Replit live deployment and DNS left untouched until staging passes smoke tests

Avoid Cloudflare Workers for the first staging move. The current API is Express/Node-shaped and Stripe webhook raw-body behavior is already built for Node.

Mobile is frozen for this migration phase. Do not let mobile typecheck, Expo, or native build issues block the web/API/DB staging path.

## Staging Smoke Test

Before any DNS or live Replit change:

1. API health: `/api/healthz`
2. Web app loads at the staging URL.
3. Signup works.
4. Login works.
5. Dashboard loads.
6. Smart Journal can save a trade.
7. AI Assistant either works with Gemini or fails with a clear non-production blocker.
8. Pricing page loads.
9. Stripe checkout is tested only in Stripe test mode.

## Still Replit-Dependent

Do not remove these yet:

- `.replit`
- `.replitignore`
- Replit remotes
- `replit.md`
- `stripe-replit-sync`
- `@replit/connectors-sdk`
- `@replit/vite-plugin-*`

Later migration work should replace:

- Replit domain fallbacks in Stripe success/cancel URLs.
- Replit managed Stripe webhook setup.
- Replit CORS allowances.
- Cookie policy based on `REPL_ID`.
- Mobile scripts that infer Replit deployment domains.
- Replit Gemini integration assumptions.

## What Not To Touch Yet

- Mobile app.
- Stripe live behavior.
- DNS.
- Database schema.
- Duplicate files.
- Repo organization.
- Replit deployment files.
- Product features.
