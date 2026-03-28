/**
 * Scenario 06: Subscription Gate
 * Tests:
 *  - Unauthenticated requests → must return 401 fast (no data leaked)
 *  - Authenticated free-tier (tier 0) user on premium-gated endpoints → must return 403 fast
 *  - Free-tier user on non-gated endpoints → must return 200 (not over-blocked)
 *
 * The purpose of this scenario is to validate that:
 *  1. The auth middleware blocks correctly (401 for no token)
 *  2. The tier gate blocks correctly (403 for tier 0 on tier 2+ routes)
 *  3. Both rejections are fast (<500ms) and do NOT return a 200 with payload
 *
 * VUs: ramps to 200 over 1 minute, soaks 3 minutes
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Counter } from "k6/metrics";
import { BASE_URL, DEFAULT_HEADERS } from "../utils/config.js";
import { registerAndLogin } from "../utils/auth.js";

const gateResponseDuration = new Trend("subscription_gate_duration", true);
const unauthDuration = new Trend("subscription_unauth_duration", true);
const unexpectedErrors = new Counter("subscription_unexpected_errors");

// Endpoints that require tier >= 2 (premium) — free-tier users must get 403, not 200
const PREMIUM_TIER_ENDPOINTS = [
  "/trades",
  "/leaderboard",
];

// Endpoints that require any valid auth — unauthenticated must get 401, not 200
const AUTH_REQUIRED_ENDPOINTS = [
  "/auth/me",
  "/planner",
  "/community/posts",
];

const SMOKE = __ENV.SMOKE_TEST === "true";

export const options = {
  scenarios: {
    subscription_gate: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: SMOKE
        ? [{ duration: "15s", target: 5 }, { duration: "15s", target: 0 }]
        : [
            { duration: "1m", target: 200 },
            { duration: "3m", target: 200 },
            { duration: "30s", target: 0 },
          ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<2000"],
    subscription_gate_duration: ["p(95)<500"],
    subscription_unauth_duration: ["p(95)<500"],
    subscription_unexpected_errors: ["count<1"],
    checks: ["rate>0.90"],
  },
};

let freeToken = null;

export default function () {
  // Authenticate as a free-tier (tier 0) user — all newly registered users are tier 0
  if (!freeToken) {
    const creds = registerAndLogin();
    freeToken = creds.token;
    if (!freeToken) {
      unexpectedErrors.add(1);
      return;
    }
  }

  const freeAuthHeader = {
    ...DEFAULT_HEADERS,
    Authorization: `Bearer ${freeToken}`,
  };

  // 1. Unauthenticated requests — must get 401 (or 429 if rate-limited) — never 200
  for (const endpoint of AUTH_REQUIRED_ENDPOINTS) {
    const start = Date.now();
    const res = http.get(`${BASE_URL}${endpoint}`, { headers: DEFAULT_HEADERS });
    unauthDuration.add(Date.now() - start);

    const ok = check(res, {
      "unauth: 401 (or 429 rate-limited), never 200": (r) =>
        r.status === 401 || r.status === 429,
      "unauth: response fast (<500ms)": (r) => r.timings.duration < 500,
    });

    if (!ok || res.status === 200) {
      // 200 here would mean the auth guard is broken — critical error
      unexpectedErrors.add(1);
    }

    sleep(0.1);
  }

  // 2. Free-tier user on premium-gated endpoints — must get 403, never 200 with payload
  for (const endpoint of PREMIUM_TIER_ENDPOINTS) {
    const start = Date.now();
    const res = http.get(`${BASE_URL}${endpoint}`, { headers: freeAuthHeader });
    gateResponseDuration.add(Date.now() - start);

    const unexpectedAccess = res.status === 200;

    check(res, {
      "premium gate: 403 or 429 (rate-limited) — not 200 data leak": (r) =>
        r.status === 403 || r.status === 429,
      "premium gate: response fast (<500ms)": (r) => r.timings.duration < 500,
    });

    if (unexpectedAccess) {
      // A 200 on a premium-gated endpoint for a tier-0 user is a security failure
      unexpectedErrors.add(1);
    } else if (res.status >= 500) {
      unexpectedErrors.add(1);
    }

    sleep(0.1);
  }

  // 3. Free-tier user CAN access non-gated endpoints (validate no over-blocking)
  const meRes = http.get(`${BASE_URL}/auth/me`, { headers: freeAuthHeader });
  const meOk = check(meRes, {
    "free-tier user: /auth/me accessible (200 or 429)": (r) =>
      r.status === 200 || r.status === 429,
  });

  if (!meOk) {
    unexpectedErrors.add(1);
  }

  sleep(0.5);
}
