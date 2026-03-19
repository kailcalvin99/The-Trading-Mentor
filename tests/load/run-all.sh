#!/usr/bin/env bash
# =============================================================================
# ICT Trading Mentor — Full Load Test Suite Runner
# Runs all k6 scenarios sequentially and generates a consolidated HTML report.
#
# Usage:
#   BASE_URL=http://localhost:8080/api bash tests/load/run-all.sh [--smoke]
#
# Options:
#   --smoke   Run with reduced VUs/duration (smoke validation, ~2 min total).
#             Each scenario uses 5 VUs and 30s stages instead of production load.
#             Production (default) run uses 1000 VUs and 5-8 min stages.
#
# Exit codes:
#   0  — all scenarios passed their thresholds
#   1  — one or more scenarios breached a threshold or errored
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORTS_DIR="${SCRIPT_DIR}/reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RUN_DIR="${REPORTS_DIR}/run-${TIMESTAMP}"
SUMMARY_FILE="${RUN_DIR}/summary.txt"
BASE_URL="${BASE_URL:-http://localhost:8080/api}"
SMOKE_TEST="false"

for arg in "$@"; do
  if [ "$arg" = "--smoke" ]; then
    SMOKE_TEST="true"
  fi
done

mkdir -p "${RUN_DIR}"

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

SCENARIOS=(
  "01-auth.js:Auth Flow (signup → login → /auth/me → token re-issue):full"
  "02-dashboard.js:Dashboard & Planner Soak:full"
  "03-trade-journal.js:Trade Journal (create → list → export → AI coach):full"
  "04-ai-assistant.js:AI Assistant (Gemini chat, 50 VUs):safe"
  "05-community.js:Community & Leaderboard (read-heavy, 500 VUs):full"
  "06-subscription-gate.js:Subscription Gate (401/403 validation, 200 VUs):full"
)

print_header() {
  echo ""
  echo "═══════════════════════════════════════════════════════════════════"
  echo "  $1"
  echo "═══════════════════════════════════════════════════════════════════"
}

print_result() {
  local scenario="$1"
  local status="$2"
  local duration="$3"
  if [ "$status" = "PASS" ]; then
    echo "  [PASS]  ${scenario}  (${duration}s)"
  elif [ "$status" = "FAIL" ]; then
    echo "  [FAIL]  ${scenario}  (${duration}s)"
  else
    echo "  [SKIP]  ${scenario}"
  fi
}

MODE="production (1000 VUs)"
if [ "${SMOKE_TEST}" = "true" ]; then
  MODE="smoke (5 VUs, 30s)"
fi

print_header "ICT Trading Mentor — 1000-VU Stress Test Suite"
echo "  Base URL  : ${BASE_URL}"
echo "  Timestamp : ${TIMESTAMP}"
echo "  Mode      : ${MODE}"
echo "  Reports   : ${RUN_DIR}"
echo ""

{
  echo "ICT Trading Mentor — 1000-VU Stress Test Suite"
  echo "================================================"
  echo "Base URL  : ${BASE_URL}"
  echo "Timestamp : ${TIMESTAMP}"
  echo "Mode      : ${MODE}"
  echo ""
} > "${SUMMARY_FILE}"

for scenario_entry in "${SCENARIOS[@]}"; do
  IFS=':' read -r script label type <<< "${scenario_entry}"
  scenario_file="${SCRIPT_DIR}/scenarios/${script}"
  output_json="${RUN_DIR}/${script%.js}.json"
  output_log="${RUN_DIR}/${script%.js}.log"
  exit_code_file="${RUN_DIR}/${script%.js}.exitcode"

  echo ""
  echo "Running: ${label}"
  echo "  Script : ${scenario_file}"

  if [ ! -f "${scenario_file}" ]; then
    echo "  WARNING: Script not found, skipping."
    echo "0" > "${exit_code_file}"
    SKIP_COUNT=$((SKIP_COUNT + 1))
    print_result "${label}" "SKIP" "—"
    echo "SKIP  | ${label}" >> "${SUMMARY_FILE}"
    continue
  fi

  START_TIME=$(date +%s)

  set +e
  k6 run \
    --env BASE_URL="${BASE_URL}" \
    --env SMOKE_TEST="${SMOKE_TEST}" \
    --out "json=${output_json}" \
    "${scenario_file}" 2>&1 | tee "${output_log}"
  EXIT_CODE=$?
  set -e

  # Save exit code for HTML report pass/fail determination
  echo "${EXIT_CODE}" > "${exit_code_file}"

  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))

  if [ $EXIT_CODE -eq 0 ]; then
    PASS_COUNT=$((PASS_COUNT + 1))
    print_result "${label}" "PASS" "${DURATION}"
    echo "PASS  | ${label} (${DURATION}s)" >> "${SUMMARY_FILE}"
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
    print_result "${label}" "FAIL" "${DURATION}"
    echo "FAIL  | ${label} (${DURATION}s) — k6 exit code ${EXIT_CODE}" >> "${SUMMARY_FILE}"
  fi
done

print_header "Suite Complete — Results"
echo ""
echo "  Passed  : ${PASS_COUNT}"
echo "  Failed  : ${FAIL_COUNT}"
echo "  Skipped : ${SKIP_COUNT}"
echo ""

{
  echo ""
  echo "Results"
  echo "-------"
  echo "Passed  : ${PASS_COUNT}"
  echo "Failed  : ${FAIL_COUNT}"
  echo "Skipped : ${SKIP_COUNT}"
  echo ""
  if [ "${FAIL_COUNT}" -eq 0 ]; then
    echo "STATUS: ALL THRESHOLDS MET"
  else
    echo "STATUS: ${FAIL_COUNT} SCENARIO(S) BREACHED THRESHOLDS"
  fi
} >> "${SUMMARY_FILE}"

node "${SCRIPT_DIR}/generate-report.js" "${RUN_DIR}" "${TIMESTAMP}" 2>/dev/null || true

echo "  Summary : ${SUMMARY_FILE}"
echo "  HTML    : ${RUN_DIR}/report.html"
echo ""

cat "${SUMMARY_FILE}"

if [ "${FAIL_COUNT}" -gt 0 ]; then
  exit 1
fi
