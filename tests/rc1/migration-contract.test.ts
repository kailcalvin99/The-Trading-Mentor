import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("lib/db/migrations/0001_numerous_mysterio.sql", "utf8");
const journal = JSON.parse(readFileSync("lib/db/migrations/meta/_journal.json", "utf8"));
const indexSource = readFileSync("artifacts/api-server/src/index.ts", "utf8");
const seedSource = readFileSync("artifacts/api-server/src/seed.ts", "utf8");

test("fresh path creates the legacy table and Drizzle journals 0001", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "beta_feedback_logs"/);
  assert.ok(journal.entries.some((entry: { tag: string }) => entry.tag === "0001_numerous_mysterio"));
});

test("exact legacy path validates structure and preserves rows", () => {
  assert.match(migration, /actual_columns IS DISTINCT FROM ARRAY/);
  assert.match(migration, /Existing beta_feedback_logs table does not match/);
  assert.match(migration, /column_default LIKE 'nextval/);
  assert.match(migration, /column_default = 'now\(\)'/);
  assert.doesNotMatch(migration, /DROP TABLE|TRUNCATE|DELETE FROM/);
});

test("idempotent path avoids duplicate table and foreign key", () => {
  assert.match(migration, /IF NOT EXISTS[\s\S]*c\.contype = 'f'/);
  assert.equal((migration.match(/ADD CONSTRAINT "beta_feedback_logs_user_id_users_id_fk"/g) || []).length, 1);
});

test("application startup no longer owns migrated table creation", () => {
  assert.doesNotMatch(indexSource, /runLocalMigrations/);
  assert.doesNotMatch(seedSource, /CREATE TABLE IF NOT EXISTS beta_feedback_logs/);
});
