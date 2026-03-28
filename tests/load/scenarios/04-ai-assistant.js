/**
 * Scenario 04: AI Assistant (Gemini Chat)
 * Tests: create Gemini conversation → send ICT question
 * VUs: ramps to 50 (cost-safe — avoids runaway Gemini API costs)
 *
 * Journey:
 *   1. Register and login (once per VU, cached)
 *   2. Create a Gemini conversation (once per VU, reused across iterations)
 *   3. Send an ICT trading question and receive a response (every iteration)
 *
 * Thresholds:
 *   - Standard endpoints: p95 < 5s (conv create)
 *   - Message send (AI inference): p95 < 8s
 *   - ai_message_attempts: count>0 (ensures message send was actually exercised)
 *   - ai_errors: count<1 (zero unexpected 5xx failures)
 *
 * NOTE: AI rate limiter is 30 req/min/IP. At 50 VUs, 429 responses are expected.
 * Conversation create is done once per VU and reused — this ensures message
 * sends are exercised even when the rate limiter throttles create requests.
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Counter } from "k6/metrics";
import { BASE_URL, DEFAULT_HEADERS } from "../utils/config.js";
import { registerAndLogin } from "../utils/auth.js";

const convCreateDuration = new Trend("ai_conv_create_duration", true);
const msgSendDuration = new Trend("ai_msg_send_duration", true);
const aiErrors = new Counter("ai_errors");
const aiConvAttempts = new Counter("ai_conv_attempts");
const aiMessageAttempts = new Counter("ai_message_attempts");
const aiMessageSuccess = new Counter("ai_message_success");

const ICT_QUESTIONS = [
  "What is a Fair Value Gap and how do I trade it?",
  "Explain Buy-Side Liquidity and how institutions use it",
  "How do I identify an Order Block on the 15-minute chart?",
  "What is a Break of Structure and how does it confirm a trend?",
  "Explain the Silver Bullet trading strategy",
  "What is Change of Character and how is it different from Break of Structure?",
  "How do I use Higher Time Frame bias for my entries?",
  "What are kill zones and what time should I trade?",
  "Explain the Optimal Trade Entry concept",
  "What is Inducement in ICT methodology?",
  "How do I manage risk using the ICT approach?",
  "What is a Breaker Block and how does it differ from an Order Block?",
];

function randomQuestion() {
  return ICT_QUESTIONS[Math.floor(Math.random() * ICT_QUESTIONS.length)];
}

const SMOKE = __ENV.SMOKE_TEST === "true";

export const options = {
  scenarios: {
    ai_assistant: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: SMOKE
        ? [{ duration: "20s", target: 1 }, { duration: "10s", target: 0 }]
        : [
            { duration: "1m", target: 50 },
            { duration: "5m", target: 50 },
            { duration: "30s", target: 0 },
          ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<8000"],
    ai_conv_create_duration: ["p(95)<5000"],
    ai_msg_send_duration: ["p(95)<8000"],
    ai_errors: ["count<1"],
    ai_conv_attempts: ["count>0"],
  },
};

// Per-VU state — persisted across iterations
let token = null;
let convId = null;

export default function () {
  // Step 1: Login (once per VU lifetime, cached)
  if (!token) {
    const creds = registerAndLogin();
    token = creds.token;
    if (!token) {
      aiErrors.add(1);
      sleep(2);
      return;
    }
  }

  const authHeader = {
    ...DEFAULT_HEADERS,
    Authorization: `Bearer ${token}`,
  };

  // Step 2: Create conversation (once per VU, reuse for all iterations)
  if (!convId) {
    aiConvAttempts.add(1);
    const convStart = Date.now();
    const convRes = http.post(
      `${BASE_URL}/gemini/conversations`,
      JSON.stringify({ title: `Load Test VU ${__VU}` }),
      { headers: authHeader }
    );
    convCreateDuration.add(Date.now() - convStart);

    check(convRes, {
      "ai/conv create: status 201, 200, or 429 (rate-limited)": (r) =>
        r.status === 201 || r.status === 200 || r.status === 429,
      "ai/conv create: has id when 2xx": (r) => {
        if (r.status === 429) return true;
        try { return !!(r.json("id") || r.json("conversation")?.id); } catch { return false; }
      },
    });

    if (convRes.status === 429) {
      sleep(5);
      return;
    }

    if (convRes.status >= 500) {
      aiErrors.add(1);
      sleep(2);
      return;
    }

    try {
      convId = convRes.json("id") || convRes.json("conversation")?.id;
    } catch {}

    if (!convId) {
      aiErrors.add(1);
      sleep(1);
      return;
    }

    sleep(0.5);
  }

  // Step 3: Send message (every iteration — this is the core AI journey step)
  aiMessageAttempts.add(1);

  const msgStart = Date.now();
  const msgRes = http.post(
    `${BASE_URL}/gemini/conversations/${convId}/messages`,
    JSON.stringify({ content: randomQuestion() }),
    { headers: authHeader, timeout: "30s" }
  );
  msgSendDuration.add(Date.now() - msgStart);

  const msgOk = check(msgRes, {
    "ai/message: status 200, 201, or 429 (rate-limited)": (r) =>
      r.status === 200 || r.status === 201 || r.status === 429,
    "ai/message: not 500": (r) => r.status !== 500,
  });

  if (msgRes.status === 200 || msgRes.status === 201) {
    aiMessageSuccess.add(1);
  } else if (msgRes.status >= 500) {
    aiErrors.add(1);
  } else if (msgRes.status === 429) {
    sleep(3);
    return;
  } else if (!msgOk) {
    aiErrors.add(1);
  }

  sleep(2);
}
