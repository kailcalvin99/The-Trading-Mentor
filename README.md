# The Trading Mentor

The Trading Mentor is a full-stack trading education and performance-review platform for ICT/SMC futures traders.

It was originally built on Replit. The current priority is moving it into a durable GitHub and non-Replit production workflow without breaking the live site.

## Live Site

`https://thetradingmentorai.com/`

## Local Repo

Current local source of truth:

`/Users/kail/Documents/GitHub/the-trading-mentor`

This has been moved out of Downloads. The remaining source-control step is connecting a real GitHub remote.

## Stack

- pnpm workspaces
- React + Vite web app
- Express API server
- PostgreSQL + Drizzle ORM
- Expo mobile app
- Stripe subscriptions
- AI assistant integration

## Important Docs

Read these before code changes:

- `AGENTS.md`
- `CONSTITUTION.md`
- `TRADING_MENTOR_AGENT.md`
- `CODEX_AUTOMATION_WORKFLOW.md`
- every file in `agents/`
- `.trading-mentor/STATUS.md`
- `.trading-mentor/CURRENT_TASK.md`
- `.trading-mentor/MIGRATION_OFF_REPLIT.md`

## Setup

This project uses pnpm. Do not use `npm install`.

For the current Mac local-run path, use:

- `.trading-mentor/LOCAL_MAC_SETUP.md`

Baseline checks with global pnpm:

```bash
pnpm run typecheck
```

```bash
PORT=5173 BASE_PATH=/web/ EXPO_PUBLIC_DOMAIN=thetradingmentorai.com pnpm run build
```

```bash
git diff --check
```

## Current Migration Priority

1. Connect to GitHub.
2. Install pnpm/Corepack permanently.
3. Choose staging host and managed Postgres.
4. Continue removing Replit-specific production assumptions in small, reviewed phases.
5. Keep the live domain untouched until staging is verified.
