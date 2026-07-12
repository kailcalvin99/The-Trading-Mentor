# The Trading Mentor Progress

## 2026-07-12 — RC1 Finish

- Verified `origin/master` at `d2e8eabd499ea85cc67933d72e447bc04f558ed1` and isolated work in a non-cloud `/tmp` worktree.
- Unified local `.env` loading between API development startup and the environment checker using Node's built-in loader.
- Removed API-startup table creation and made Drizzle migrations the schema authority.
- Hardened migration `0001` for fresh and exact legacy `beta_feedback_logs` states without deleting rows or duplicating its foreign key.
- Added three nullable Multi-Chart Review images to trades across database, API, generated types, and Smart Journal UI.
- Restored the standalone Risk Shield route and corrected stale legal routes across public pages.
- Added 15 focused tests for environment parity, migration contracts, chart images, routes, AI-disabled behavior, and checkout isolation.
- Passed frozen install, all requested TypeScript baselines, API/web builds, Drizzle static check, focused tests, and diff check.
- Rendered public-flow QA passed; the later disposable-database audit supplied direct authenticated API and migration evidence described below.
- Installed an approved local container runtime and executed PostgreSQL 16 migrations in an isolated, localhost-only disposable container.
- Passed fresh, exact-legacy, missing-foreign-key, repeated-migration, row-preservation, journal, nullable-chart-column, and legacy no-image-read checks.
- Passed synthetic registration/login, authenticated Risk Shield rendering, API three-chart persistence/re-fetch, no-chart compatibility, all four chart rejection cases, and disabled-AI evidence without live providers.
- Browser Multi-Chart controls rendered, but local-file attachment was unavailable through the existing Chrome bridge. A no-image UI save created no row and coincided with maximum-update-depth console errors, so RC1 remains incomplete pending a focused browser-flow correction and recheck.

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
- Reviewed PR #6 and found it was too broad because it deleted many files that exist on `origin/master`.
- Created corrected branch `codex/trading-mentor-foundation-v2` from `origin/master` with only project-brain docs and ignore rules.
- Opened corrected draft PR #7: `https://github.com/kailcalvin99/The-Trading-Mentor/pull/7`.
- Commented on PR #6 that it is superseded by PR #7.
- Deleted superseded branch `codex/trading-mentor-foundation-pr` locally and remotely.
- Deleted unusable orphan branch `codex/trading-mentor-foundation` locally and remotely.
- Created issue #8 for Stripe key rotation.
- Created issue #9 for existing mobile TypeScript baseline failures.
- Left Replit remotes in place until founder review.

## Not Yet Complete

- founder review of corrected draft PR #7.
- Stripe key rotation issue #8.
- mobile TypeScript baseline issue #9.
- branch/default-base decision for `main` versus `master`.
- production hosting decision.
- database migration.
- Stripe webhook migration.
- DNS cutover.
