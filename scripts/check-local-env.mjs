#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env");

function parseDotEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return { exists: false, values: {}, malformedLines: 0 };
  }

  const values = {};
  let malformedLines = 0;
  const raw = fs.readFileSync(filePath, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) {
      malformedLines += 1;
      continue;
    }

    const [, key, value] = match;
    values[key] = value.replace(/^['"]|['"]$/g, "");
  }

  return { exists: true, values, malformedLines };
}

function hasValue(key, dotenvValues) {
  return Boolean(process.env[key] || dotenvValues[key]);
}

function printCheck(label, ok, detail) {
  const status = ok ? "PASS" : "MISSING";
  console.log(`${status}: ${label}${detail ? ` (${detail})` : ""}`);
}

const dotenv = parseDotEnv(envPath);

console.log("Trading Mentor local env check");
console.log(`cwd: ${root}`);
console.log(`.env: ${dotenv.exists ? "present" : "missing"}`);

if (dotenv.exists && dotenv.malformedLines > 0) {
  console.log(`WARN: .env has ${dotenv.malformedLines} non-empty line(s) that are not KEY=value entries`);
}

const checks = [
  ["DATABASE_URL", hasValue("DATABASE_URL", dotenv.values), "required for API/database boot"],
  [
    "SESSION_SECRET or JWT_SECRET",
    hasValue("SESSION_SECRET", dotenv.values) || hasValue("JWT_SECRET", dotenv.values),
    "required for auth cookies/tokens",
  ],
  ["ADMIN_EMAIL", hasValue("ADMIN_EMAIL", dotenv.values), "required for first admin role"],
];

console.log("\nRequired for local API startup:");
for (const [label, ok, detail] of checks) {
  printCheck(label, ok, detail);
}

const optionalChecks = [
  ["STRIPE_SECRET_KEY", hasValue("STRIPE_SECRET_KEY", dotenv.values), "needed for paid checkout tests"],
  [
    "AI_INTEGRATIONS_GEMINI_API_KEY",
    hasValue("AI_INTEGRATIONS_GEMINI_API_KEY", dotenv.values),
    "needed for AI Assistant tests",
  ],
  ["FINNHUB_API_KEY", hasValue("FINNHUB_API_KEY", dotenv.values), "needed for live calendar data"],
  ["TWELVE_DATA_API_KEY", hasValue("TWELVE_DATA_API_KEY", dotenv.values), "needed for Chart Lab candles"],
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
