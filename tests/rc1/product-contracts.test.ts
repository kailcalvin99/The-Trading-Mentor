import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync("artifacts/web/src/App.tsx", "utf8");
const journal = readFileSync("artifacts/web/src/pages/SmartJournal.tsx", "utf8");
const tradeRoute = readFileSync("artifacts/api-server/src/routes/trades/index.ts", "utf8");
const tradeSchema = readFileSync("lib/db/src/schema/trades.ts", "utf8");
const welcome = readFileSync("artifacts/web/src/pages/Welcome.tsx", "utf8");
const pricing = readFileSync("artifacts/web/src/pages/Pricing.tsx", "utf8");
const tourGuide = readFileSync("artifacts/web/src/components/TourGuide.tsx", "utf8");

test("Risk Shield route renders the existing surface", () => {
  assert.match(app, /const RiskShield = lazy/);
  assert.match(app, /path="risk-shield" element={<RiskShield \/>}/);
  assert.doesNotMatch(app, /path="risk-shield" element={<Navigate/);
});

test("trade create and read contracts retain all three chart fields", () => {
  for (const field of ["higherTimeframeChart", "setupTimeframeChart", "entryTimeframeChart"]) {
    assert.match(tradeSchema, new RegExp(field));
    assert.match(tradeRoute, new RegExp(field));
    assert.match(journal, new RegExp(field));
  }
  assert.match(tradeRoute, /validateChartImages/);
  assert.match(tradeRoute, /\.returning\(\)/);
});

test("landing account and pricing CTAs use supported routes without a paid trial claim", () => {
  assert.match(welcome, /to="\/signup"/);
  assert.match(welcome, /to="\/login"/);
  assert.match(welcome, /href="#pricing"/);
  assert.doesNotMatch(welcome, /Start Free Trial/);
  assert.match(welcome, /to: "\/terms-of-service"/);
  assert.match(welcome, /to: "\/privacy-policy"/);
  assert.match(welcome, /to: "\/refund-policy"/);
});

test("AI and checkout acceptance boundaries are deterministic mocks", () => {
  let aiCalls = 0;
  let stripeCalls = 0;
  const disabledAI = () => ({ enabled: false, message: "AI mentor is unavailable in this RC1 smoke test." });
  const mockedCheckout = () => ({ boundary: "mock", url: null });
  assert.deepEqual(disabledAI(), { enabled: false, message: "AI mentor is unavailable in this RC1 smoke test." });
  assert.deepEqual(mockedCheckout(), { boundary: "mock", url: null });
  assert.equal(aiCalls, 0);
  assert.equal(stripeCalls, 0);
  assert.match(tradeRoute, /AI mentor is unavailable because this environment has no AI provider configured/);
  assert.match(pricing, /create-checkout-session/);
  assert.doesNotMatch(pricing, /price locks in for life/);
});

test("the rendered web client sends generated API requests to the configured API origin", () => {
  const main = readFileSync("artifacts/web/src/main.tsx", "utf8");
  assert.match(main, /VITE_API_URL\?\.replace\(\/\\\/api/);
  assert.match(main, /configureAuth\(\{[\s\S]*baseUrl:\s*GENERATED_API_BASE_URL/);
});

test("tour introduction navigation stabilizes when the current route already matches", () => {
  assert.match(tourGuide, /location\.pathname\s*!==\s*targetRoute/);
  assert.match(tourGuide, /\[state\.machineState, state\.currentStep, location\.pathname\]/);
});
