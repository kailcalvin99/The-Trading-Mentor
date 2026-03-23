#!/usr/bin/env bash
# Smoke test for Code Editor API endpoints.
# Usage: bash artifacts/api-server/scripts/smoke-test.sh
# Requires: jwt package available in artifacts/api-server/node_modules

set -e

API_BASE="http://localhost:${PORT:-8080}/api"

cd "$(dirname "$0")/.."

TOKEN=$(node -e "
const jwt = require('jsonwebtoken');
const secret = process.env.SESSION_SECRET;
if (!secret) { console.error('SESSION_SECRET not set'); process.exit(1); }
const token = jwt.sign({ userId: 27, email: process.env.ADMIN_EMAIL || 'admin@example.com' }, secret, { expiresIn: '1h' });
process.stdout.write(token);
" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "FAIL: Could not generate admin JWT (SESSION_SECRET missing?)"
  exit 1
fi

PASS=0
FAIL=0

check() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "  PASS [$label]"
    PASS=$((PASS + 1))
  else
    echo "  FAIL [$label] expected=$expected got=$actual"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "=== Code Editor Smoke Test ==="
echo ""

echo "[1] GET /api/admin/files (file list)"
FILES_STATUS=$(curl -s -o /tmp/smoke_files.json -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" "$API_BASE/admin/files")
FILE_COUNT=$(node -e "try{const d=JSON.parse(require('fs').readFileSync('/tmp/smoke_files.json','utf8')); process.stdout.write(String(d.files.length))}catch(e){process.stdout.write('0')}")
check "HTTP 200" "200" "$FILES_STATUS"
check "files > 0" "true" "$([ "$FILE_COUNT" -gt 0 ] && echo true || echo false)"
echo "  Files returned: $FILE_COUNT"

echo ""
echo "[2] POST /api/gemini/conversations (create conversation)"
CONV_STATUS=$(curl -s -o /tmp/smoke_conv.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Smoke Test Conversation"}' \
  "$API_BASE/gemini/conversations")
CONV_ID=$(node -e "try{const d=JSON.parse(require('fs').readFileSync('/tmp/smoke_conv.json','utf8')); process.stdout.write(String(d.id||''))}catch(e){process.stdout.write('')}")
check "HTTP 201" "201" "$CONV_STATUS"
check "has id" "true" "$([ -n "$CONV_ID" ] && echo true || echo false)"
echo "  Conversation ID: $CONV_ID"

echo ""
echo "[3] POST /api/gemini/conversations/:id/messages (Gemini streaming)"
if [ -n "$CONV_ID" ]; then
  MSG_STATUS=$(curl -s -o /tmp/smoke_stream.txt -w "%{http_code}" \
    -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"content":"Say HELLO in one word"}' \
    --max-time 30 \
    "$API_BASE/gemini/conversations/$CONV_ID/messages")
  HAS_DATA=$(grep -c "^data:" /tmp/smoke_stream.txt 2>/dev/null || echo 0)
  check "HTTP 200" "200" "$MSG_STATUS"
  check "SSE frames > 0" "true" "$([ "$HAS_DATA" -gt 0 ] && echo true || echo false)"
  echo "  SSE frames received: $HAS_DATA"
  echo "  Response preview:"
  head -5 /tmp/smoke_stream.txt
else
  echo "  SKIP (no conversation ID)"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
