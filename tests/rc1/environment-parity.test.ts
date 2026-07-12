import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const checker = path.resolve("scripts/check-local-env.mjs");
const secretKeys = ["DATABASE_URL", "SESSION_SECRET", "JWT_SECRET", "ADMIN_EMAIL"];

function run(envFile?: string, env: NodeJS.ProcessEnv = {}) {
  const cwd = mkdtempSync(path.join(tmpdir(), "trading-mentor-env-"));
  if (envFile !== undefined) writeFileSync(path.join(cwd, ".env"), envFile);
  const cleanEnv = { PATH: process.env.PATH, HOME: process.env.HOME, ...env };
  for (const key of secretKeys) if (!(key in env)) delete cleanEnv[key];
  const result = spawnSync(process.execPath, [checker], { cwd, env: cleanEnv, encoding: "utf8" });
  rmSync(cwd, { recursive: true, force: true });
  return result;
}

test("missing .env is blocked without host values", () => {
  const result = run();
  assert.equal(result.status, 1);
  assert.match(result.stdout, /\.env: missing/);
  assert.match(result.stdout, /STATUS: BLOCKED/);
});

test("valid .env is loaded by the shared Node loader", () => {
  const result = run("DATABASE_URL=postgresql://local.invalid/test\nSESSION_SECRET=local-secret\nADMIN_EMAIL=local@example.test\n");
  assert.equal(result.status, 0);
  assert.match(result.stdout, /STATUS: OK/);
  assert.doesNotMatch(result.stdout, /local-secret|local\.invalid/);
});

test("malformed required configuration remains blocked", () => {
  const result = run("DATABASE_URL postgresql://local.invalid/test\nSESSION_SECRET=local-secret\nADMIN_EMAIL=local@example.test\n");
  assert.equal(result.status, 1);
  assert.match(result.stdout, /MISSING: DATABASE_URL/);
  assert.doesNotMatch(result.stdout, /local-secret/);
});

test("shell values override conflicting .env values", () => {
  const result = run(
    "DATABASE_URL=not-a-url\nSESSION_SECRET=file-secret\nADMIN_EMAIL=file@example.test\n",
    { DATABASE_URL: "postgresql://shell.invalid/test", SESSION_SECRET: "shell-secret", ADMIN_EMAIL: "shell@example.test" },
  );
  assert.equal(result.status, 0);
  assert.match(result.stdout, /STATUS: OK/);
  assert.doesNotMatch(result.stdout, /shell-secret|file-secret|shell\.invalid|file@example/);
});
