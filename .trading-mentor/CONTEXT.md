# The Trading Mentor Context

## Operating Context

The Trading Mentor is a Replit-built full-stack trading education platform that Alex wants to move off Replit and turn into a successful business.

The app is already feature-rich. The highest-ROI work is not adding more features. The highest-ROI work is making the repo durable, the deployment portable, the payments trustworthy, and the offer clear.

## Current Source of Truth

Canonical local source of truth:

`/Users/kail/Documents/GitHub/the-trading-mentor`

This has been moved out of Downloads. The remaining source-control task is adding the real GitHub remote and pushing a review branch.

Do not use:

`/Users/kail/Documents/docs`

That folder currently contains a small LifeOS prototype and is not the Trading Mentor source.

## Live Domain

Production domain:

`https://thetradingmentorai.com/`

The live domain is reachable and appears to serve through Google Frontend.

Do not change DNS until replacement hosting is verified and rollback is documented.

## Product Shape

The product currently appears to include:

- auth
- subscriptions
- founder discount logic
- pricing
- dashboard
- ICT Academy
- daily planner
- risk shield
- smart journal
- analytics
- admin dashboard
- AI assistant
- mobile app

## Technical Shape

Current repo shape:

- `artifacts/api-server`: Express 5 API
- `artifacts/web`: React + Vite web app
- `artifacts/mobile`: Expo mobile app
- `artifacts/mockup-sandbox`: component preview
- `lib/db`: Drizzle/PostgreSQL
- `lib/api-spec`: OpenAPI/Orval
- `lib/api-client-react`: generated client hooks
- `lib/api-zod`: generated validation
- `lib/integrations-gemini-ai`: Replit-style Gemini integration
- `scripts`: utility scripts

## Current Guardrails

- Keep the current live site safe.
- Do not change app behavior until baseline checks run.
- Do not commit secrets.
- Do not rely on Replit-only env vars for the long-term production plan.
- Keep trading education safety stronger than conversion pressure.
- Do not ship profit claims, personalized advice, or signal-like behavior.

## Strategic Priority

Stabilize the business foundation before growth:

1. Source control and local setup.
2. Secret hygiene.
3. Baseline typecheck/build.
4. Replit dependency audit.
5. Hosting/database/Stripe migration plan.
6. Staging deploy.
7. Domain cutover.
8. Launch bug fixes.
9. Conversion and retention.
