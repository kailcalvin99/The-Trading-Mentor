import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import test from "node:test";
import { buildCheckoutUrls, getPublicAppUrl } from "../../artifacts/api-server/src/config/publicAppUrl";
import { AI_DISABLED_RESPONSE, isAiEnabled, requireAiEnabled } from "../../artifacts/api-server/src/config/ai";
import { roleForRegistration } from "../../artifacts/api-server/src/security/adminRole";
import { destructiveResetAllowed } from "../../artifacts/api-server/src/security/destructiveReset";
import { checkDatabaseReadiness } from "../../artifacts/api-server/src/operations/readiness";
import { closeServerAndPool } from "../../artifacts/api-server/src/operations/shutdown";

test("trusted public application URL is strict and host-header independent", () => {
  assert.throws(() => getPublicAppUrl({ NODE_ENV: "production" }), /required/);
  assert.throws(() => getPublicAppUrl({ NODE_ENV: "production", PUBLIC_APP_URL: "bad" }), /valid absolute/);
  assert.throws(() => getPublicAppUrl({ NODE_ENV: "production", PUBLIC_APP_URL: "http://example.test" }), /HTTPS/);
  assert.equal(getPublicAppUrl({ NODE_ENV: "development", PUBLIC_APP_URL: "http://localhost:5173/" }).href, "http://localhost:5173/");
  const urls = buildCheckoutUrls({ NODE_ENV: "production", PUBLIC_APP_URL: "https://staging.example.test/" });
  assert.equal(urls.successUrl, "https://staging.example.test/web/pricing?success=1");
  assert.equal(urls.cancelUrl, "https://staging.example.test/web/pricing?canceled=1");
  assert.doesNotMatch(JSON.stringify(urls), /malicious/);
});

test("registration admin ownership is explicit and normalized", () => {
  assert.equal(roleForRegistration("first@example.test", {}), "user");
  assert.equal(roleForRegistration("second@example.test", { ADMIN_EMAIL: "admin@example.test" }), "user");
  assert.equal(roleForRegistration(" ADMIN@EXAMPLE.TEST ", { ADMIN_EMAIL: "admin@example.test" }), "admin");
  assert.equal(roleForRegistration("admin@example.test", { ADMIN_EMAIL: " ADMIN@EXAMPLE.TEST " }), "admin");
});

test("AI disabled contract is centralized and rejects before route handlers", () => {
  assert.equal(isAiEnabled({}), false);
  assert.equal(isAiEnabled({ AI_ENABLED: "true" }), true);
  let nextCalls = 0;
  let status = 0;
  let body: unknown;
  requireAiEnabled({} as never, { status(value: number) { status = value; return this; }, json(value: unknown) { body = value; return this; } } as never, () => { nextCalls += 1; });
  assert.equal(status, 503);
  assert.deepEqual(body, AI_DISABLED_RESPONSE);
  assert.equal(nextCalls, 0);

  const gemini = readFileSync("artifacts/api-server/src/routes/gemini/index.ts", "utf8");
  const trades = readFileSync("artifacts/api-server/src/routes/trades/index.ts", "utf8");
  for (const route of [/post\("\/transcribe", requireAiEnabled/, /post\("\/conversations", requireAiEnabled/, /post\("\/conversations\/:id\/messages", requireAiEnabled/]) assert.match(gemini, route);
  assert.match(trades, /post\("\/:id\/coach", authRequired, tierRequired\(2\), requireAiEnabled/);
});

test("readiness handles healthy, failed, and timed-out database probes", async () => {
  assert.equal(await checkDatabaseReadiness({ query: async () => ({ rows: [{ "?column?": 1 }] }) }, 20), true);
  assert.equal(await checkDatabaseReadiness({ query: async () => { throw new Error("secret database detail"); } }, 20), false);
  assert.equal(await checkDatabaseReadiness({ query: async () => new Promise(() => {}) }, 5), false);
});

test("shutdown closes both server and database pool", async () => {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  let poolClosed = 0;
  await closeServerAndPool(server, { end: async () => { poolClosed += 1; } });
  assert.equal(poolClosed, 1);
  assert.equal(server.listening, false);
});

test("destructive reset is default denied and always denied in production", () => {
  assert.equal(destructiveResetAllowed({ NODE_ENV: "development" }), false);
  assert.equal(destructiveResetAllowed({ NODE_ENV: "production", ENABLE_DESTRUCTIVE_ADMIN_RESET: "true" }), false);
  assert.equal(destructiveResetAllowed({ NODE_ENV: "test", ENABLE_DESTRUCTIVE_ADMIN_RESET: "true" }), true);
});

test("ordinary API startup contains no Stripe configuration mutation authority", () => {
  const startup = readFileSync("artifacts/api-server/src/index.ts", "utf8");
  assert.doesNotMatch(startup, /stripe-replit-sync|findOrCreateManagedWebhook|syncBackfill|runMigrations/);
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(pkg.scripts["stripe:bootstrap"], "tsx scripts/stripe-bootstrap.ts");
});

test("portable API ESM bundle supplies a Node require bridge", () => {
  const build = readFileSync("artifacts/api-server/build.ts", "utf8");
  assert.match(build, /createRequire/);
  assert.match(build, /const require = createRequire\(import\.meta\.url\)/);
});
