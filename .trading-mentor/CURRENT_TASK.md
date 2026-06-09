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
- Corrected branch `codex/trading-mentor-foundation-v2` is ready for a new draft PR.

## Next Task After This

Open the corrected draft PR, rotate exposed Stripe test keys, then decide whether `master` or `main` should become the canonical base branch before merging.
