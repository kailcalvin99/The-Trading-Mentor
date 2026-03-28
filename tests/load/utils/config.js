export const BASE_URL = __ENV.BASE_URL || "http://localhost:3000/api";

export const THRESHOLDS = {
  http_req_duration: ["p(95)<2000"],
  http_req_failed: ["rate<0.01"],
};

export const AI_THRESHOLDS = {
  http_req_duration: ["p(95)<8000"],
  http_req_failed: ["rate<0.05"],
};

export const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
};

export function authHeaders(token) {
  return {
    ...DEFAULT_HEADERS,
    Authorization: `Bearer ${token}`,
  };
}

export function makeRampScenario(target, duration, rampDuration = "2m") {
  return {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: rampDuration, target },
      { duration, target },
      { duration: "30s", target: 0 },
    ],
  };
}

export function makeSoakScenario(target, soakDuration = "5m", rampDuration = "2m") {
  return {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: rampDuration, target },
      { duration: soakDuration, target },
      { duration: "30s", target: 0 },
    ],
  };
}
