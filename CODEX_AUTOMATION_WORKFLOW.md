# The Trading Mentor Codex Automation Workflow

## Purpose

Define how Codex helps Alex build The Trading Mentor as a serious business while keeping work scoped, checkable, migration-safe, and founder-approved.

## Automation-First Principle

Codex should reduce execution friction.

Automation should not weaken product judgment, financial-safety boundaries, or founder control.

## Core Rule

Do not mix unrelated lanes in one change.

Migration work, product work, revenue work, compliance copy, and UI polish should usually be separate PRs.

## Default Prompt Sequence

### 1. Docs Update Prompt

```text
Update The Trading Mentor documentation for [topic]. Keep this documentation-only: do not modify app code, package files, routes, UI, backend, database, Stripe behavior, environment config, or deployment config unless explicitly requested. Follow AGENTS.md and /agents guidance. Run git diff --check and report the result.
```

### 2. Audit Prompt

```text
Audit [area] against AGENTS.md, CONSTITUTION.md, TRADING_MENTOR_AGENT.md, CODEX_AUTOMATION_WORKFLOW.md, and /agents. Identify bugs, risks, launch blockers, and highest-ROI fixes. Do not implement unless explicitly requested. Provide file references and a prioritized action list.
```

### 3. Implement Prompt

```text
Implement [specific change] in [owned files or area]. Keep the PR small and scoped. Reuse existing systems. Do not touch unrelated files. Run the required checks from CODEX_AUTOMATION_WORKFLOW.md and report exact results.
```

### 4. Migration Prompt

```text
Prepare the next off-Replit migration step for [area]. Do not break the current live domain. Document current Replit assumptions, required env vars, rollback steps, and smoke tests before code changes. Implement only the approved scoped change and run the required checks.
```

### 5. QA Prompt

```text
QA the current branch for [change or release]. Verify expected behavior, auth/session behavior, pricing/payment behavior if touched, responsive states if UI changed, and required workflow checks. Do not broaden scope. Report pass/fail results with exact commands and limitations.
```

## Work Lanes

### Documentation / Strategy Lane

Owns:

- AGENTS.md
- CONSTITUTION.md
- TRADING_MENTOR_AGENT.md
- CODEX_AUTOMATION_WORKFLOW.md
- /agents
- .trading-mentor/*
- business plan
- migration plan

Avoid touching:

- app code
- package files
- deployment config
- payment behavior
- database schema

### Migration / Infrastructure Lane

Owns:

- Replit removal plan
- hosting config
- environment variables
- database migration
- Stripe webhook migration
- domain DNS plan
- CI/deploy scripts

Avoid touching:

- unrelated UI
- feature behavior
- pricing copy unless needed for launch safety

### Product / Feature Lane

Owns:

- user flows
- dashboard behavior
- academy flow
- journal behavior
- risk shield behavior
- admin settings

Avoid touching:

- infrastructure
- unrelated pages
- broad redesign

### Design Lane

Owns:

- visual polish
- responsive layout
- premium dark/gold aesthetic
- component styling

Avoid touching:

- data logic
- backend
- auth
- Stripe
- database

### Compliance / Trust Lane

Owns:

- disclaimers
- promotional claims
- risk language
- AI response boundaries
- Terms and Privacy review notes
- pricing transparency

Avoid touching:

- legal conclusions without attorney review
- hidden changes to billing behavior

## Check Matrix

Documentation-only changes:

- `git diff --check`

Application code changes:

- `pnpm run typecheck`
- `git diff --check`

Build-impacting changes:

- `PORT=5173 BASE_PATH=/web/ pnpm run build`
- `git diff --check`

Package/dependency changes:

- Use pnpm.
- Explain why the package change is necessary.
- Confirm lockfile changes are intentional.
- Run install/typecheck/build checks appropriate to the package.

Migration/config changes:

- Confirm current live site is not broken.
- Document rollback.
- Run typecheck/build where applicable.
- Smoke test auth, pricing, API health, and web app load.

Payment or subscription changes:

- Use Stripe test mode first.
- Verify checkout success/cancel URLs.
- Verify webhook handling.
- Verify subscription status in the database.
- Do not ship without founder review.

## Current Local Setup Caveat

This repo is a pnpm workspace, but the current shell may not have pnpm installed.

Do not silently switch to npm. The root `preinstall` script intentionally blocks npm installs.

Set up pnpm explicitly before package or build work.

## Merge Policy

Codex does not auto-merge by default.

Never auto-merge work that touches:

- app code
- UI
- backend
- database
- auth
- payment
- Stripe
- Gemini/AI
- package files
- lockfiles
- deployment config
- environment config
- domain/DNS

Docs-only work may be prepared for founder review after `git diff --check`, but Alex still reviews and merges unless he explicitly authorizes otherwise.

## Founder Approval

Alex is the final approval authority before merge, launch, domain changes, payment changes, and legal/compliance decisions.
