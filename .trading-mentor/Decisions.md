# The Trading Mentor Decisions

## Active Decisions

### 2026-06-09: Canonical Local Repo Location

Decision:

Use `/Users/kail/Documents/GitHub/the-trading-mentor` as the canonical local repo.

Reason:

It is a git repo and contains the full monorepo structure. `/Users/kail/Downloads/The-Trading-Mentor-main` appears to be an export copy without a normal `.git`.

### 2026-06-08: Documentation-First Setup

Decision:

Install the project brain before modifying app code.

Reason:

The app is already live and Replit-shaped. Migration and business guardrails should exist before risky changes.

### 2026-06-08: Move Off Replit in Phases

Decision:

Do not attempt a one-step migration.

Reason:

Auth, database, Stripe, AI, CORS, cookies, web build, mobile build, and domain DNS all carry Replit assumptions.

### 2026-06-08: Remove Local Secret Values From `.replit`

Decision:

Remove Stripe key values from local `.replit`.

Reason:

Secrets should not live in tracked config files. Rotate keys before public GitHub work.

## Pending Decisions

- What GitHub repository should become canonical?
- Which provider should host the Express API?
- Which provider should host PostgreSQL?
- Should web and API deploy together first, or split web/API after migration?
- Which AI provider should replace the Replit Gemini integration?
- What is the legal/compliance boundary for paid AI mentor responses?
