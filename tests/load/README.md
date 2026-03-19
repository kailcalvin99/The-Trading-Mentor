# ICT Trading Mentor — 1000-VU Load Test Suite

End-to-end stress tests for the ICT Trading Mentor API, built with [k6](https://k6.io).

## Prerequisites

- **k6** must be installed (already available in this Replit environment via Nix — `k6 v0.57.0`)
- The API server must be running (see Workflows panel — "API Server" on port 8080)

## Running the Tests

### Run all scenarios sequentially (full suite)

```bash
BASE_URL=http://localhost:8080/api bash tests/load/run-all.sh
```

The runner will:
1. Execute each scenario in order
2. Stream live k6 output to the terminal
3. Save per-scenario JSON metrics, logs, and exit codes in `tests/load/reports/run-<timestamp>/`
4. Generate an HTML report at `tests/load/reports/run-<timestamp>/report.html`
5. Print a pass/fail summary to stdout and exit 1 if any scenario fails

### Run a single scenario

```bash
BASE_URL=http://localhost:8080/api k6 run tests/load/scenarios/01-auth.js
```

### Override the target URL (e.g. production)

```bash
BASE_URL=https://your-deployed-domain.repl.co/api bash tests/load/run-all.sh
```

## Scenarios

| # | File | User Journey | VUs | Key Thresholds |
|---|------|-------------|-----|------------|
| 1 | `01-auth.js` | signup → login → `/auth/me` → token re-issue | 1,000 | p95 < 2s |
| 2 | `02-dashboard.js` | `/auth/me` + planner + subscriptions + Gemini conversation list | 1,000 | p95 < 2s |
| 3 | `03-trade-journal.js` | trade create → list → CSV export; AI coach (200 VUs) | 800 + 200 | p95 < 2s; coach p95 < 8s |
| 4 | `04-ai-assistant.js` | create Gemini conversation → send ICT question | 50 | p95 < 8s |
| 5 | `05-community.js` | browse posts → post detail + comments → leaderboard | 500 | p95 < 2s |
| 6 | `06-subscription-gate.js` | unauthenticated 401 + free-tier 403 speed check | 200 | gate p95 < 500ms |

## Thresholds

| Endpoint type | p95 response time |
|---|---|
| Standard API endpoints | < 2,000 ms |
| AI (Gemini) endpoints | < 8,000 ms |
| Auth gates (401/403) | < 500 ms |

> **Note on error-rate thresholds**: Several scenarios intentionally generate 4xx responses
> (403 for tier-gated endpoints, 401 for unauthenticated requests, 429 for rate-limited calls).
> These are validated via k6 `check()` assertions rather than the global `http_req_failed`
> threshold so that correct server behavior doesn't count as an "error".

## Key Load Test Findings (built-in API limits)

Running at 1,000 concurrent VUs from a single IP will surface the following API rate limiters.
These are **expected, correct behaviors** that the load test validates:

| Rate Limiter | Limit | Applied to |
|---|---|---|
| General API limiter | 300 req / 15 min / IP | All `/api/*` routes |
| Login limiter | 10 req / 15 min / IP | `POST /api/auth/login` |
| AI (Gemini) limiter | 30 req / 1 min / IP | `POST /api/gemini/*` |

At full 1,000-VU scale from a single load-testing machine, the general limiter (300/15min)
will be saturated almost immediately, causing 429 responses. This is the correct behavior —
the load test proves the rate limiter holds under pressure. For a full throughput test without
rate-limit interference, run against a server configured with higher limits or from distributed IPs.

## Reports

Each run creates a timestamped directory under `tests/load/reports/`:

```
tests/load/reports/run-20260319_143022/
  ├── report.html              # HTML summary (open in browser)
  ├── summary.txt              # Plain-text pass/fail summary
  ├── 01-auth.json             # Raw k6 metrics (NDJSON)
  ├── 01-auth.log              # Full k6 terminal output
  ├── 01-auth.exitcode         # k6 exit code (0 = pass, non-zero = fail)
  ├── 02-dashboard.json
  ├── 02-dashboard.log
  └── ...
```

The HTML report shows: request count, req/s, avg/p50/p95/p99 latency, error rate, and PASS/FAIL
status per scenario with threshold-aware coloring (AI scenarios use 8s threshold, gate uses 500ms).

## Out of Scope

- Mobile Expo app direct load testing (mobile uses the same API — API scenarios cover it)
- Permanent CI integration (future task)
- Infrastructure changes or auto-scaling
- Testing third-party services (Stripe, Gemini) at full 1,000-VU scale — AI scenarios cap at 50 VUs

## Notes on AI Scenarios

The AI assistant scenario caps at **50 VUs** and trade coach at **200 VUs** to avoid runaway
Gemini API costs. Both use a 30-second request timeout and have relaxed p95 < 8s thresholds
because AI inference is inherently variable in latency.

## Notes on Trade Journal Scenario

Trade endpoints require a tier-2 (premium) subscription. Newly registered test users have tier 0.
The scenario validates that tier-gating fires correctly (fast 403) and no 500 errors occur.
A follow-up task to pre-seed tier-2 test accounts would enable full trade CRUD load testing.
