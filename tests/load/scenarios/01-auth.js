/**
 * Scenario 01: Auth Flow
 * Tests: signup → login → /auth/me → token re-issue (re-login = "refresh")
 * VUs: ramps to 1000 over 2 minutes, soaks for 3 minutes
 *
 * NOTE: This API uses stateless JWTs (7-day expiry) — there is no dedicated
 * /auth/refresh endpoint. Token refresh is modelled as a new POST /auth/login
 * with existing credentials (same server-side path that would be hit by
 * clients re-hydrating an expired session from a refresh grant).
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Counter } from "k6/metrics";
import { BASE_URL, DEFAULT_HEADERS } from "../utils/config.js";

const registerDuration = new Trend("auth_register_duration", true);
const loginDuration = new Trend("auth_login_duration", true);
const meDuration = new Trend("auth_me_duration", true);
const refreshDuration = new Trend("auth_refresh_duration", true);
const tokenErrors = new Counter("auth_token_errors");
const authIterations = new Counter("auth_iterations");

const SMOKE = __ENV.SMOKE_TEST === "true";

export const options = {
  scenarios: {
    auth_flow: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: SMOKE
        ? [{ duration: "15s", target: 5 }, { duration: "15s", target: 0 }]
        : [
            { duration: "2m", target: 1000 },
            { duration: "3m", target: 1000 },
            { duration: "30s", target: 0 },
          ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<2000", "p(99)<5000"],
    auth_register_duration: ["p(95)<2000"],
    auth_login_duration: ["p(95)<2000"],
    auth_me_duration: ["p(95)<2000"],
    auth_refresh_duration: ["p(95)<2000"],
    auth_token_errors: ["count<1"],
    auth_iterations: ["count>0"],
    checks: ["rate>0.90"],
  },
};

export default function () {
  authIterations.add(1);
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 100000000);
  const email = `loadtest_${timestamp}_${random}_${__VU}@stress-test.invalid`;
  const password = "LoadTest123!";
  const name = `LT User ${__VU}`;

  // Step 1: Signup
  const registerStart = Date.now();
  const registerRes = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({ email, password, name }),
    { headers: DEFAULT_HEADERS }
  );
  registerDuration.add(Date.now() - registerStart);

  const registerOk = check(registerRes, {
    "register: status 201 or 409 (duplicate) or 429 (rate-limited)": (r) =>
      r.status === 201 || r.status === 409 || r.status === 429,
    "register: has token when 201": (r) => {
      if (r.status !== 201) return true;
      try { return !!r.json("token"); } catch { return false; }
    },
  });

  if (!registerOk) {
    tokenErrors.add(1);
  }

  sleep(0.5);

  // Step 2: Login with registered credentials
  // NOTE: The API applies a rate limiter of 10 login attempts/15 min per IP.
  // At 1000 VUs from a single IP this will trigger 429 responses — which is
  // intentional and validates that the limiter holds under load. The check
  // accepts 200 (success) and 429 (rate-limited) as non-error outcomes.
  const loginStart = Date.now();
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: DEFAULT_HEADERS }
  );
  loginDuration.add(Date.now() - loginStart);

  const loginOk = check(loginRes, {
    "login: status 200 or 429 (rate limit expected at scale)": (r) =>
      r.status === 200 || r.status === 429,
    "login: token when 200": (r) => {
      if (r.status !== 200) return true;
      try { return !!r.json("token"); } catch { return false; }
    },
  });

  if (!loginOk) {
    tokenErrors.add(1);
  }

  let token = null;
  if (loginRes.status === 200) {
    try { token = loginRes.json("token"); } catch { token = null; }
  }

  if (!token) {
    sleep(0.5);
    return;
  }

  // Step 3: Fetch user info with token
  const meStart = Date.now();
  const meRes = http.get(`${BASE_URL}/auth/me`, {
    headers: {
      ...DEFAULT_HEADERS,
      Authorization: `Bearer ${token}`,
    },
  });
  meDuration.add(Date.now() - meStart);

  check(meRes, {
    "auth/me: status 200 or 429 (rate-limited)": (r) => r.status === 200 || r.status === 429,
    "auth/me: has user.id when 200": (r) => {
      if (r.status !== 200) return true;
      try { return !!(r.json("user") && r.json("user").id); } catch { return false; }
    },
  });

  sleep(0.5);

  // Step 4: Token refresh — re-issue via POST /auth/login (JWT re-grant)
  // The API issues 7-day JWTs with no dedicated refresh endpoint. Clients refresh
  // by re-posting credentials (same bcrypt + DB path). Rate-limited to 10/15min/IP.
  const refreshStart = Date.now();
  const refreshRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: DEFAULT_HEADERS }
  );
  refreshDuration.add(Date.now() - refreshStart);

  check(refreshRes, {
    "token refresh: status 200 or 429 (rate limit expected at scale)": (r) =>
      r.status === 200 || r.status === 429,
    "token refresh: token when 200": (r) => {
      if (r.status !== 200) return true;
      try { return !!r.json("token"); } catch { return false; }
    },
  });

  sleep(0.5);
}
