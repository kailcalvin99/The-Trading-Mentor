# Founder Notes

## Current Founder Direction

Alex wants The Trading Mentor managed like LifeOS.

Alex also wants to move it off Replit.

The project is almost complete, but has bugs and lacks planning guidelines.

## Founder Workload Principle

Alex should make decisions.

Codex should organize, audit, migrate, fix, verify, and prepare work for review.

## Current Founder Decision Needed

The local repo location is now decided.

Current local source of truth:

`/Users/kail/Documents/GitHub/the-trading-mentor`

Next decision: which GitHub repository should become the canonical remote.

## Recommended Next Codex Prompt

```text
In /Users/kail/Documents/GitHub/the-trading-mentor, connect The Trading Mentor to the canonical GitHub repo. Do not remove Replit remotes until GitHub push is verified. Add the GitHub repo as origin, create a review branch, push it, and open a draft PR. Run git status and git diff --check before pushing.
```

## Founder Merge Rule

Codex prepares work.

Alex reviews and merges.

Do not auto-merge.
