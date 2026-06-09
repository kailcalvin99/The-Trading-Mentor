# The Trading Mentor Progress

## 2026-06-08

- Located likely canonical project at `/Users/kail/Documents/GitHub/the-trading-mentor`.
- Confirmed `/Users/kail/Documents/docs` is not the Trading Mentor source.
- Confirmed the likely canonical folder is a git repo on branch `master`.
- Confirmed the repo has multiple Replit remotes.
- Confirmed the app was built as a pnpm workspace with web, API, mobile, mockup sandbox, shared db, API spec, and generated client packages.
- Confirmed live domain `https://thetradingmentorai.com/` is reachable.
- Confirmed the live domain responds through Google Frontend.
- Confirmed current shell does not have `pnpm` installed.
- Confirmed no local `node_modules` install is present in the repo.
- Identified Replit-specific assumptions in `.replit`, Vite config, API CORS, auth cookie behavior, Stripe startup, Stripe webhooks, checkout URLs, mobile scripts, and Gemini integration.
- Added project-brain docs and leadership rules.
- Removed local checked-in Stripe key values from `.replit`.
- Added ignore rules for `.env`, `.env.*`, and `.config/`.

## 2026-06-09

- Installed workspace dependencies with temporary `pnpm@10` through `npm exec`.
- Fixed generated API export duplication in `lib/api-zod`.
- Fixed Gemini integration TypeScript issues by adding Node types and importing `AbortError` from `p-retry`.
- Added missing `@google/genai` dependency for the API server.
- Fixed API Gemini route typing for tool declarations and conversations.
- Fixed API Stripe startup/build issues by removing unsupported migration config, adding required pool config, typing Replit connection response data, removing top-level await, and allowing explicit public domain env vars.
- Fixed mobile type errors in journal delete calls and Expo Router navigation mapping.
- Aligned React type catalog versions to avoid cross-package React ref type conflicts.
- Fixed web TypeScript issues in AI assistant, discipline gate, button group, pricing, settings, and smart journal.
- Confirmed `npm exec --yes pnpm@10 -- run typecheck` passes.
- Confirmed `PORT=5173 BASE_PATH=/web/ EXPO_PUBLIC_DOMAIN=thetradingmentorai.com npm exec --yes pnpm@10 -- run build` passes.
- Confirmed `git diff --check` passes.
- Added `artifacts/mobile/static-build/` to `.gitignore` as generated build output.
- Moved the repo to `/Users/kail/Documents/GitHub/the-trading-mentor`.
- Installed global `pnpm@10.34.1`.
- Added explicit mobile `babel-preset-expo` dev dependency so Expo Metro can resolve the Babel preset under pnpm.
- Confirmed `pnpm run typecheck` passes from the moved repo.
- Confirmed `PORT=5173 BASE_PATH=/web/ EXPO_PUBLIC_DOMAIN=thetradingmentorai.com pnpm run build` passes from the moved repo.
- Added GitHub `origin` as `git@github.com:kailcalvin99/The-Trading-Mentor.git`.
- Pushed sanitized PR branch `codex/trading-mentor-foundation-pr`.
- Opened draft PR #6: `https://github.com/kailcalvin99/The-Trading-Mentor/pull/6`.
- Left Replit remotes in place until founder review.

## Not Yet Complete

- founder review of draft PR #6.
- branch/default-base decision for `main` versus `master`.
- production hosting decision.
- database migration.
- Stripe webhook migration.
- DNS cutover.
