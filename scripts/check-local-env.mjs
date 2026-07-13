#!/usr/bin/env node

import { loadLocalEnv } from "./load-local-env.mjs";

const root = process.cwd();

function hasValue(key) {
  return Boolean(process.env[key]);
}

function getValue(key) {
  return process.env[key] || "";
}

function isPostgresUrl(value) {
  if (!value) return false;

  try {
    const parsed = new URL(value);
    return parsed.protocol === "postgres:" || parsed.protocol === "postgresql:";
  } catch {
    return false;
  }
}

function printCheck(label, ok, detail) {
  const status = ok ? "PASS" : "MISSING";
  console.log(`${status}: ${label}${detail ? ` (${detail})` : ""}`);
}

const dotenv = loadLocalEnv({ cwd: root });

console.log("Trading Mentor local env check");
console.log(`cwd: ${root}`);
console.log(`.env: ${dotenv.exists ? "present" : "missing"}`);

const checks = [
  [
    "DATABASE_URL",
    isPostgresUrl(getValue("DATABASE_URL")),
    "required for API/database boot; must start with postgres:// or postgresql://",
  ],
  [
    "SESSION_SECRET or JWT_SECRET",
    hasValue("SESSION_SECRET") || hasValue("JWT_SECRET"),
    "required for auth cookies/tokens",
  ],
];

console.log("\nRequired for local API startup:");
for (const [label, ok, detail] of checks) {
  printCheck(label, ok, detail);
}

const optionalChecks = [
  ["PUBLIC_APP_URL", hasValue("PUBLIC_APP_URL"), "required for paid checkout redirect URLs"],
  ["ADMIN_EMAIL", hasValue("ADMIN_EMAIL"), "matching registrations receive the admin role"],
  ["STRIPE_SECRET_KEY", hasValue("STRIPE_SECRET_KEY"), "needed for paid checkout tests"],
  ["AI_ENABLED", getValue("AI_ENABLED").toLowerCase() === "true", "AI is disabled unless explicitly enabled"],
  [
    "AI_INTEGRATIONS_GEMINI_API_KEY",
    hasValue("AI_INTEGRATIONS_GEMINI_API_KEY"),
    "needed for AI Assistant tests",
  ],
  ["FINNHUB_API_KEY", hasValue("FINNHUB_API_KEY"), "needed for live calendar data"],
  ["TWELVE_DATA_API_KEY", hasValue("TWELVE_DATA_API_KEY"), "needed for Chart Lab candles"],
];

console.log("\nOptional feature checks:");
for (const [label, ok, detail] of optionalChecks) {
  printCheck(label, ok, detail);
}

const requiredOk = checks.every(([, ok]) => ok);

console.log("\nFinal status:");
if (requiredOk) {
  console.log("STATUS: OK");
  process.exit(0);
}

console.log("STATUS: BLOCKED");
console.log("Set the missing required values in your local shell or ignored .env file. Do not paste real values into chat, docs, commits, issues, or PRs.");
process.exit(1);
