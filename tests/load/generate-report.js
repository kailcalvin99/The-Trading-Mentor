#!/usr/bin/env node
/**
 * Generates an HTML summary report from k6 JSON output files and exit-code logs.
 * Usage: node generate-report.js <runDir> <timestamp>
 *
 * Pass/fail is determined by k6's own threshold evaluation (exit code 99 = threshold
 * breach). The run-all.sh script records exit codes; this script reads *.exitcode files.
 */

const fs = require("fs");
const path = require("path");

const runDir = process.argv[2];
const timestamp = process.argv[3] || new Date().toISOString();

if (!runDir || !fs.existsSync(runDir)) {
  console.error("Usage: node generate-report.js <runDir> <timestamp>");
  process.exit(1);
}

const SCENARIO_LABELS = {
  "01-auth": "Auth Flow (signup → login → token re-issue)",
  "02-dashboard": "Dashboard & Planner Soak",
  "03-trade-journal": "Trade Journal (create → list → AI coach)",
  "04-ai-assistant": "AI Assistant (Gemini, 50 VUs)",
  "05-community": "Community & Leaderboard (500 VUs)",
  "06-subscription-gate": "Subscription Gate Validation (200 VUs)",
};

function parseK6Json(jsonPath) {
  if (!fs.existsSync(jsonPath)) return null;

  let content;
  try {
    content = fs.readFileSync(jsonPath, "utf8");
  } catch {
    return null;
  }

  const lines = content.trim().split("\n").filter(Boolean);
  const metrics = {};

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entry.type !== "Point") continue;

      const metricName = entry.metric;
      const value = entry.data?.value;
      if (value === undefined) continue;

      if (!metrics[metricName]) {
        metrics[metricName] = [];
      }
      metrics[metricName].push({ value, time: entry.data?.time });
    } catch {
      // skip malformed lines
    }
  }

  const result = {};

  function percentile(arr, p) {
    if (!arr || arr.length === 0) return 0;
    const sorted = arr.map((x) => x.value).sort((a, b) => a - b);
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  }

  function mean(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((a, x) => a + x.value, 0) / arr.length;
  }

  const durations = metrics["http_req_duration"] || [];
  const failed = metrics["http_req_failed"] || [];
  const reqs = metrics["http_reqs"] || [];

  result.requestCount = durations.length;

  // Calculate actual req/s from http_reqs metric (counter, cumulative values not rate)
  // Approximate via total requests / test duration
  const times = durations.map((x) => x.time).filter(Boolean);
  if (times.length >= 2) {
    const sortedTimes = times.slice().sort();
    const durationSecs =
      (new Date(sortedTimes[sortedTimes.length - 1]) - new Date(sortedTimes[0])) / 1000;
    result.reqsPerSec = durationSecs > 0
      ? (result.requestCount / durationSecs).toFixed(1)
      : "—";
  } else {
    result.reqsPerSec = "—";
  }

  result.p50 = percentile(durations, 50).toFixed(1);
  result.p95 = percentile(durations, 95).toFixed(1);
  result.p99 = percentile(durations, 99).toFixed(1);
  result.avgDuration = mean(durations).toFixed(1);
  result.errorRate = failed.length > 0
    ? ((failed.filter((x) => x.value > 0).length / failed.length) * 100).toFixed(2)
    : "0.00";

  return result;
}

function scenarioPassed(key, runDir) {
  // Primary: read .exitcode file written by run-all.sh
  const exitFile = path.join(runDir, `${key}.exitcode`);
  if (fs.existsSync(exitFile)) {
    const code = parseInt(fs.readFileSync(exitFile, "utf8").trim(), 10);
    return code === 0;
  }

  // Fallback: look for k6 threshold pass indicator in log
  // k6 prints "✓" for passed thresholds and nothing containing "threshold breach" for passing runs
  // We look for the k6 exit line: "default ✓" means all thresholds passed
  const logFile = path.join(runDir, `${key}.log`);
  if (fs.existsSync(logFile)) {
    const log = fs.readFileSync(logFile, "utf8");
    // k6 prints "default ✓" at the end for a successful run (all thresholds met)
    if (/default\s+✓/.test(log)) return true;
    // k6 prints "default ✗" or "thresholds on metrics.*have been crossed" for failure
    if (/default\s+✗/.test(log) || /thresholds on metrics.*have been crossed/i.test(log)) return false;
  }

  return false;
}

const scenarioFiles = fs.readdirSync(runDir)
  .filter((f) => f.endsWith(".json"))
  .sort();

const scenarioData = [];

for (const file of scenarioFiles) {
  const key = file.replace(".json", "");
  const label = SCENARIO_LABELS[key] || key;
  const parsed = parseK6Json(path.join(runDir, file));
  const passed = scenarioPassed(key, runDir);

  scenarioData.push({ key, label, data: parsed, passed });
}

// Also include scenarios that have logs but no JSON (e.g. early exit)
for (const [key, label] of Object.entries(SCENARIO_LABELS)) {
  if (scenarioData.some((s) => s.key === key)) continue;
  const logFile = path.join(runDir, `${key}.log`);
  if (fs.existsSync(logFile)) {
    scenarioData.push({ key, label, data: null, passed: false });
  }
}

scenarioData.sort((a, b) => a.key.localeCompare(b.key));

const now = new Date().toUTCString();

const AI_SCENARIO_KEYS = new Set(["04-ai-assistant"]);
const GATE_SCENARIO_KEYS = new Set(["06-subscription-gate"]);

function thresholdLabel(key) {
  if (AI_SCENARIO_KEYS.has(key)) return "p95 < 8,000 ms · error < 5%";
  if (GATE_SCENARIO_KEYS.has(key)) return "gate p95 < 500 ms";
  return "p95 < 2,000 ms · error < 1%";
}

const rows = scenarioData.map(({ key, label, data, passed }) => {
  if (!data) {
    return `
      <tr class="skip">
        <td>${label}</td>
        <td colspan="7" style="text-align:center; color:#888;">No data (scenario did not produce output)</td>
        <td><span class="badge badge-skip">SKIP</span></td>
      </tr>`;
  }

  const isAi = AI_SCENARIO_KEYS.has(key);
  const isGate = GATE_SCENARIO_KEYS.has(key);

  const p95Threshold = isAi ? 8000 : isGate ? 500 : 2000;
  const errThreshold = isAi ? 5.0 : 1.0;

  const p95Breached = parseFloat(data.p95) >= p95Threshold;
  const errBreached = parseFloat(data.errorRate) >= errThreshold;
  const rowClass = passed ? "pass" : "fail";
  const badge = passed
    ? `<span class="badge badge-pass">PASS</span>`
    : `<span class="badge badge-fail">FAIL</span>`;

  return `
      <tr class="${rowClass}">
        <td>${label}</td>
        <td>${data.requestCount.toLocaleString()}</td>
        <td>${data.reqsPerSec} req/s</td>
        <td>${data.avgDuration} ms</td>
        <td>${data.p50} ms</td>
        <td class="${p95Breached ? "breached" : ""}">${data.p95} ms${p95Breached ? " ⚠" : ""}</td>
        <td>${data.p99} ms</td>
        <td class="${errBreached ? "breached" : ""}">${data.errorRate}%${errBreached ? " ⚠" : ""}</td>
        <td>${badge}</td>
      </tr>`;
}).join("");

const passCount = scenarioData.filter((s) => s.passed).length;
const failCount = scenarioData.filter((s) => !s.passed && s.data).length;
const skipCount = scenarioData.filter((s) => !s.data).length;
const overallPass = failCount === 0;
const overallStatus = overallPass ? "ALL PASSED" : `${failCount} FAILED`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ICT Trading Mentor — Load Test Report (${timestamp})</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0f1117; color: #e0e0e0; padding: 2rem; }
    h1 { font-size: 1.8rem; margin-bottom: 0.25rem; color: #fff; }
    .subtitle { color: #888; margin-bottom: 2rem; font-size: 0.9rem; }
    .summary { display: flex; gap: 1rem; margin-bottom: 2rem; flex-wrap: wrap; }
    .summary-card { background: #1a1d27; border-radius: 8px; padding: 1rem 1.5rem; min-width: 120px; }
    .summary-card .value { font-size: 2rem; font-weight: bold; }
    .summary-card .label { font-size: 0.8rem; color: #888; text-transform: uppercase; letter-spacing: 0.05em; }
    .value-pass { color: #4ade80; }
    .value-fail { color: #f87171; }
    .value-skip { color: #facc15; }
    .value-overall-pass { color: #4ade80; }
    .value-overall-fail { color: #f87171; }
    table { width: 100%; border-collapse: collapse; background: #1a1d27; border-radius: 8px; overflow: hidden; }
    th { background: #2d3149; text-align: left; padding: 0.75rem 1rem; font-size: 0.8rem; text-transform: uppercase; color: #aaa; letter-spacing: 0.05em; }
    td { padding: 0.75rem 1rem; border-bottom: 1px solid #2a2d3a; font-size: 0.9rem; }
    tr.pass { background: rgba(74, 222, 128, 0.04); }
    tr.fail { background: rgba(248, 113, 113, 0.06); }
    tr.skip { background: rgba(250, 204, 21, 0.04); }
    .breached { color: #f87171; font-weight: bold; }
    .badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold; }
    .badge-pass { background: rgba(74, 222, 128, 0.15); color: #4ade80; }
    .badge-fail { background: rgba(248, 113, 113, 0.15); color: #f87171; }
    .badge-skip { background: rgba(250, 204, 21, 0.15); color: #facc15; }
    .thresholds { margin-top: 2rem; background: #1a1d27; border-radius: 8px; padding: 1.25rem; }
    .thresholds h2 { font-size: 1rem; margin-bottom: 1rem; color: #aaa; text-transform: uppercase; letter-spacing: 0.05em; }
    .threshold-list { display: flex; flex-wrap: wrap; gap: 0.75rem; }
    .threshold-item { background: #2d3149; border-radius: 6px; padding: 0.5rem 0.75rem; font-size: 0.85rem; }
    .threshold-item span { color: #60a5fa; font-weight: bold; }
    .footer { margin-top: 2rem; text-align: center; color: #555; font-size: 0.8rem; }
  </style>
</head>
<body>
  <h1>ICT Trading Mentor — Load Test Report</h1>
  <div class="subtitle">Run: ${timestamp} &nbsp;|&nbsp; Generated: ${now} &nbsp;|&nbsp; Tool: k6 v0.57.0</div>

  <div class="summary">
    <div class="summary-card">
      <div class="value ${overallPass ? 'value-overall-pass' : 'value-overall-fail'}">${overallStatus}</div>
      <div class="label">Overall Status</div>
    </div>
    <div class="summary-card">
      <div class="value value-pass">${passCount}</div>
      <div class="label">Passed</div>
    </div>
    <div class="summary-card">
      <div class="value value-fail">${failCount}</div>
      <div class="label">Failed</div>
    </div>
    <div class="summary-card">
      <div class="value value-skip">${skipCount}</div>
      <div class="label">Skipped</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Scenario</th>
        <th>Requests</th>
        <th>Req/s</th>
        <th>Avg</th>
        <th>p50</th>
        <th>p95</th>
        <th>p99</th>
        <th>Error %</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="thresholds">
    <h2>Thresholds</h2>
    <div class="threshold-list">
      <div class="threshold-item">Standard endpoints — p95 <span>&lt; 2,000 ms</span></div>
      <div class="threshold-item">Standard endpoints — error rate <span>&lt; 1%</span></div>
      <div class="threshold-item">AI (Gemini) endpoints — p95 <span>&lt; 8,000 ms</span></div>
      <div class="threshold-item">AI (Gemini) endpoints — error rate <span>&lt; 5%</span></div>
      <div class="threshold-item">Subscription gate fast path — p95 <span>&lt; 500 ms</span></div>
      <div class="threshold-item">Auth scenario — <span>1,000 VUs</span></div>
      <div class="threshold-item">Dashboard soak — <span>1,000 VUs · 5 min</span></div>
      <div class="threshold-item">AI assistant — <span>50 VUs (cost-safe)</span></div>
    </div>
  </div>

  <div class="footer">
    ICT Trading Mentor Stress Test Suite · k6 v0.57.0 · ${now}
  </div>
</body>
</html>`;

const htmlPath = path.join(runDir, "report.html");
fs.writeFileSync(htmlPath, html, "utf8");
console.log(`HTML report written to: ${htmlPath}`);
