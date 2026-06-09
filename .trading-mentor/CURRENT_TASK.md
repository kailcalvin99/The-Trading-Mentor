# Current Task

## Active Task

GitHub handoff and founder review.

## Status

Ready for founder review.

## Scope

Documentation, governance, project setup, repo hygiene, dependency setup, and narrow launch-blocking TypeScript/build fixes.

Allowed changes:

- AGENTS.md
- CONSTITUTION.md
- TRADING_MENTOR_AGENT.md
- CODEX_WORKFLOW.md
- CODEX_AUTOMATION_WORKFLOW.md
- /agents
- .trading-mentor/*
- README.md
- .env.example
- .gitignore
- secret removal from `.replit`
- package manifests and lockfile
- TypeScript fixes needed for baseline checks
- API startup changes needed for non-Replit builds
- local repo move to `/Users/kail/Documents/GitHub/the-trading-mentor`
- global pnpm setup

Not allowed in this task:

- UI changes
- database schema changes
- Gemini/AI behavior changes
- DNS changes
- hosting changes

## Acceptance Criteria

- Project brain exists in-repo.
- Replit migration risks are documented.
- Business operating plan exists.
- Repo ignores local env files and `.config/`.
- No secret values remain in `.replit`.
- `git diff --check` passes.
- Dependency install passes.
- Typecheck passes.
- Production build passes with explicit local env.
- Repo is moved out of Downloads.
- Global pnpm works.
- GitHub `origin` is configured.
- Corrected draft PR #7 is open.
- Stripe key rotation is tracked in issue #8.
- Existing mobile TypeScript baseline failures are tracked in issue #9.

## Next Task After This

Review PR #7, rotate exposed Stripe test keys, and fix the existing mobile typecheck baseline before production migration work.
