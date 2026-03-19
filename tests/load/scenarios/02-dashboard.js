/**
 * Scenario 02: Dashboard & Planner Soak
 * Tests: authenticated GET of user data, planner entries, and kill-zone context.
 *
 * NOTE: Kill-zone timers are not a standalone HTTP endpoint in this API.
 * They are computed client-side from the session timezone and provided as
 * context to the Gemini AI assistant (see GET /gemini/conversations/:id/messages).
 * This scenario covers the dashboard-related server endpoints: /auth/me,
 * /planner (list + date-specific), and /subscriptions/tiers.
 * The Gemini conversation list endpoint is also exercised as it's loaded on
 * the dashboard to show "recent AI sessions".
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Counter } from "k6/metrics";
import { BASE_URL, DEFAULT_HEADERS } from "../utils/config.js";
import { registerAndLogin } from "../utils/auth.js";

const plannerDuration = new Trend("dashboard_planner_duration", true);
const meDuration = new Trend("dashboard_me_duration", true);
const convDuration = new Trend("dashboard_conv_list_duration", true);
const dashErrors = new Counter("dashboard_errors");
const serverErrors = new Counter("dashboard_server_errors");

const SMOKE = __ENV.SMOKE_TEST === "true";

export const options = {
  scenarios: {
    dashboard_soak: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: SMOKE
        ? [{ duration: "15s", target: 5 }, { duration: "15s", target: 0 }]
        : [
            { duration: "2m", target: 1000 },
            { duration: "5m", target: 1000 },
            { duration: "30s", target: 0 },
          ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<2000", "p(99)<5000"],
    dashboard_planner_duration: ["p(95)<2000"],
    dashboard_me_duration: ["p(95)<2000"],
    dashboard_conv_list_duration: ["p(95)<2000"],
    dashboard_errors: ["count<1"],
    dashboard_server_errors: ["count<1"],
    checks: ["rate>0.90"],
  },
};

let token = null;

export default function () {
  if (!token) {
    const creds = registerAndLogin();
    token = creds.token;
    if (!token) {
      dashErrors.add(1);
      return;
    }
  }

  const authHeader = {
    ...DEFAULT_HEADERS,
    Authorization: `Bearer ${token}`,
  };

  // 1. Fetch current user info (loaded on every dashboard mount)
  const meStart = Date.now();
  const meRes = http.get(`${BASE_URL}/auth/me`, { headers: authHeader });
  meDuration.add(Date.now() - meStart);

  check(meRes, {
    "dashboard/me: status 200 or 429": (r) => r.status === 200 || r.status === 429,
    "dashboard/me: has user when 200": (r) => {
      if (r.status !== 200) return true;
      try { return !!(r.json("user") && r.json("user").id); } catch { return false; }
    },
  });

  if (meRes.status >= 500) {
    serverErrors.add(1);
    sleep(1);
    return;
  }
  if (meRes.status !== 200 && meRes.status !== 429) {
    dashErrors.add(1);
    sleep(1);
    return;
  }
  if (meRes.status === 429) {
    sleep(2);
    return;
  }

  sleep(0.3);

  // 2. Load planner entries list (last 30 days)
  const plannerStart = Date.now();
  const plannerRes = http.get(`${BASE_URL}/planner`, { headers: authHeader });
  plannerDuration.add(Date.now() - plannerStart);

  check(plannerRes, {
    "planner/list: status 200 or 429": (r) => r.status === 200 || r.status === 429,
    "planner/list: has entries when 200": (r) => {
      if (r.status !== 200) return true;
      try { return Array.isArray(r.json("entries")); } catch { return false; }
    },
  });

  sleep(0.2);

  // 3. Load planner for today's date
  const today = new Date().toISOString().split("T")[0];
  const plannerDateRes = http.get(`${BASE_URL}/planner/${today}`, { headers: authHeader });
  check(plannerDateRes, {
    "planner/today: status 200 or 429": (r) => r.status === 200 || r.status === 429,
  });

  sleep(0.2);

  // 4. Load subscription tiers (used to render upgrade/dashboard gate)
  const tiersRes = http.get(`${BASE_URL}/subscriptions/tiers`, { headers: authHeader });
  check(tiersRes, {
    "subscriptions/tiers: status 200 or 429": (r) => r.status === 200 || r.status === 429,
    "subscriptions/tiers: has tiers when 200": (r) => {
      if (r.status !== 200) return true;
      try { return Array.isArray(r.json("tiers")); } catch { return false; }
    },
  });

  sleep(0.2);

  // 5. List Gemini conversations (AI session history shown on dashboard)
  const convStart = Date.now();
  const convRes = http.get(`${BASE_URL}/gemini/conversations`, { headers: authHeader });
  convDuration.add(Date.now() - convStart);

  check(convRes, {
    "dashboard/gemini conversations: status 200 or 429": (r) =>
      r.status === 200 || r.status === 429,
  });

  sleep(0.5);
}
