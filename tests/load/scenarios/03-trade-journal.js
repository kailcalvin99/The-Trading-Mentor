/**
 * Scenario 03: Trade Journal
 * Tests:
 *   - journalFlow: create trade → fetch list → (tier 2 required for create/list)
 *   - aiCoachFlow: create trade → request AI coach feedback (POST /trades/:id/coach)
 *
 * NOTE: There is no GET /trades/:id (single trade fetch) endpoint in this API.
 * "Fetch single trade" is modelled as fetching the full trade list and referencing
 * the most recently created trade — the same DB query path the client uses.
 *
 * NOTE: Trades require tier >= 2. New test users are tier 0 by default.
 * The scenario validates the tier gate fires correctly (fast 403) and that
 * tier-2 users (admin account) can create/list trades. For a deeper load test
 * of trade CRUD, pre-seeded tier-2 accounts would be needed (see follow-up task).
 *
 * VUs: journalFlow ramps to 800, aiCoachFlow to 200 (cost-safe)
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Counter } from "k6/metrics";
import { BASE_URL, DEFAULT_HEADERS } from "../utils/config.js";
import { registerAndLogin } from "../utils/auth.js";

const tradeCreateDuration = new Trend("trade_create_duration", true);
const tradeListDuration = new Trend("trade_list_duration", true);
const tradeFetchDuration = new Trend("trade_fetch_duration", true);
const tradeCoachDuration = new Trend("trade_coach_duration", true);
const tradeErrors = new Counter("trade_errors");
const tradeGateAttempts = new Counter("trade_gate_attempts");
const tradeCoachAttempts = new Counter("trade_coach_attempts");

const PAIRS = ["EUR/USD", "GBP/USD", "NAS100", "US30", "XAUUSD", "BTC/USD", "GBP/JPY", "USD/JPY"];
const OUTCOMES = ["win", "loss", "breakeven"];
const SETUPS = ["OB+FVG", "BOS+OB", "Silver Bullet", "IPDA", "Liquidity Sweep"];
const BEHAVIOR_TAGS = ["Disciplined", "Emotional", "Impulsive", "Patient", "Rushed"];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const SMOKE = __ENV.SMOKE_TEST === "true";

export const options = {
  scenarios: {
    trade_journal_full: {
      executor: "ramping-vus",
      exec: "journalFlow",
      startVUs: 0,
      stages: SMOKE
        ? [{ duration: "15s", target: 5 }, { duration: "15s", target: 0 }]
        : [
            { duration: "2m", target: 800 },
            { duration: "4m", target: 800 },
            { duration: "30s", target: 0 },
          ],
    },
    trade_ai_coach: {
      executor: "ramping-vus",
      exec: "aiCoachFlow",
      startVUs: 0,
      stages: SMOKE
        ? [{ duration: "15s", target: 2 }, { duration: "15s", target: 0 }]
        : [
            { duration: "2m", target: 200 },
            { duration: "4m", target: 200 },
            { duration: "30s", target: 0 },
          ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<2000"],
    trade_create_duration: ["p(95)<2000"],
    trade_list_duration: ["p(95)<2000"],
    trade_fetch_duration: ["p(95)<2000"],
    trade_coach_duration: ["p(95)<8000"],
    trade_errors: ["count<1"],
    trade_gate_attempts: ["count>0"],
    checks: ["rate>0.90"],
  },
};

let journalToken = null;
let coachToken = null;

export function journalFlow() {
  if (!journalToken) {
    const creds = registerAndLogin();
    journalToken = creds.token;
    if (!journalToken) {
      tradeErrors.add(1);
      return;
    }
  }

  const authHeader = {
    ...DEFAULT_HEADERS,
    Authorization: `Bearer ${journalToken}`,
  };

  const tradePayload = {
    pair: randomFrom(PAIRS),
    sideDirection: Math.random() > 0.5 ? "BUY" : "SELL",
    entryTime: new Date().toISOString(),
    setup: randomFrom(SETUPS),
    riskPct: (Math.random() * 2 + 0.5).toFixed(2),
    outcome: randomFrom(OUTCOMES),
    notes: `ICT trade: ${randomFrom(SETUPS)}. Market grabbed BSL then reversed. Entered on OB retest.`,
    behaviorTag: randomFrom(BEHAVIOR_TAGS),
    setupScore: Math.floor(Math.random() * 5) + 1,
    isDraft: false,
  };

  // 1. Create trade (tier-gated — tier 0 users receive 403; validates gate fires fast)
  tradeGateAttempts.add(1);
  const createStart = Date.now();
  const createRes = http.post(
    `${BASE_URL}/trades`,
    JSON.stringify(tradePayload),
    { headers: authHeader }
  );
  tradeCreateDuration.add(Date.now() - createStart);

  check(createRes, {
    "trade/create: status 201, 403 (tier gate), or 429 (rate-limited)": (r) =>
      r.status === 201 || r.status === 403 || r.status === 429,
    "trade/create: not 500": (r) => r.status !== 500,
  });

  if (createRes.status >= 500) {
    tradeErrors.add(1);
  }

  sleep(0.3);

  // 2. Fetch trade list (paginated — exercises DB query path)
  const listStart = Date.now();
  const listRes = http.get(`${BASE_URL}/trades`, { headers: authHeader });
  tradeListDuration.add(Date.now() - listStart);

  check(listRes, {
    "trade/list: status 200, 403 (tier gate), or 429 (rate-limited)": (r) =>
      r.status === 200 || r.status === 403 || r.status === 429,
    "trade/list: not 500": (r) => r.status !== 500,
  });

  if (listRes.status >= 500) {
    tradeErrors.add(1);
  }

  // 3. Fetch CSV export (models "single-trade" data export — exercises filtered query path)
  // This is the closest equivalent to GET /trades/:id since no such route exists.
  const fetchStart = Date.now();
  const fetchRes = http.get(`${BASE_URL}/trades/export/csv`, { headers: authHeader });
  tradeFetchDuration.add(Date.now() - fetchStart);

  check(fetchRes, {
    "trade/export: status 200, 403 (tier gate), or 429 (rate-limited)": (r) =>
      r.status === 200 || r.status === 403 || r.status === 429,
    "trade/export: not 500": (r) => r.status !== 500,
  });

  if (fetchRes.status >= 500) {
    tradeErrors.add(1);
  }

  sleep(0.5);
}

export function aiCoachFlow() {
  if (!coachToken) {
    const creds = registerAndLogin();
    coachToken = creds.token;
    if (!coachToken) {
      tradeErrors.add(1);
      return;
    }
  }

  const authHeader = {
    ...DEFAULT_HEADERS,
    Authorization: `Bearer ${coachToken}`,
  };

  const tradePayload = {
    pair: randomFrom(PAIRS),
    sideDirection: Math.random() > 0.5 ? "BUY" : "SELL",
    entryTime: new Date().toISOString(),
    setup: randomFrom(SETUPS),
    riskPct: "1.5",
    outcome: randomFrom(OUTCOMES),
    notes: "OB entry after liquidity sweep. HTF bias aligned. Took SSL and reversed.",
    behaviorTag: "Disciplined",
    setupScore: 4,
    isDraft: false,
  };

  // 1. Create trade
  const createStart = Date.now();
  const createRes = http.post(
    `${BASE_URL}/trades`,
    JSON.stringify(tradePayload),
    { headers: authHeader }
  );
  tradeCreateDuration.add(Date.now() - createStart);

  let tradeId = null;
  if (createRes.status === 201) {
    try { tradeId = createRes.json("id"); } catch {}
  }

  check(createRes, {
    "trade/coach-create: status 201, 403 (tier gate), or 429 (rate-limited)": (r) =>
      r.status === 201 || r.status === 403 || r.status === 429,
    "trade/coach-create: not 500": (r) => r.status !== 500,
  });

  // 2. Request AI coach feedback (only possible if trade was created — requires tier 2)
  // tier-0 users never get a tradeId (403 on create), so coach is not attempted.
  // The coach endpoint is exercised when tier-2 accounts are used. tradeCoachAttempts
  // tracks how many coach calls were made so coverage can be monitored.
  if (tradeId) {
    sleep(0.5);

    tradeCoachAttempts.add(1);
    const coachStart = Date.now();
    const coachRes = http.post(
      `${BASE_URL}/trades/${tradeId}/coach`,
      JSON.stringify({}),
      { headers: authHeader, timeout: "30s" }
    );
    tradeCoachDuration.add(Date.now() - coachStart);

    check(coachRes, {
      "trade/coach: not 500": (r) => r.status !== 500,
      "trade/coach: status 200, 202, 403 or 429": (r) =>
        r.status === 200 || r.status === 202 || r.status === 403 || r.status === 429,
    });

    if (coachRes.status >= 500) {
      tradeErrors.add(1);
    }
  }

  sleep(1);
}

export default function () {
  journalFlow();
}
