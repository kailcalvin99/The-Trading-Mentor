#!/bin/bash
set -e

EXPO_PORT=${PORT:-18115}

get_bundle_url() {
  local expo_router_dir
  expo_router_dir=$(node -e "
    try {
      const r = require.resolve('expo-router/entry', { paths: ['$(pwd)'] });
      console.log(require('path').dirname(require('path').dirname(r)));
    } catch(e) {
      process.exit(1);
    }
  " 2>/dev/null) || true

  if [ -n "$expo_router_dir" ]; then
    local rel_path="${expo_router_dir#$(pwd)/}"
    echo "http://localhost:${EXPO_PORT}/${rel_path}/entry.bundle?platform=ios&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.bytecode=1&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable"
  else
    echo "http://localhost:${EXPO_PORT}/node_modules/.pnpm/expo-router@6.0.23_@types+react-dom@19.1.11_@types+react@19.1.17__@types+react@19.1.17__647f0c9f9fafa8cae778bbb6d28cc5ec/node_modules/expo-router/entry.bundle?platform=ios&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.bytecode=1&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable"
  fi
}

warmup_bundle() {
  local bundle_url
  bundle_url=$(get_bundle_url)
  echo "[warmup] Waiting for Metro to be ready..."
  for i in $(seq 1 60); do
    if curl -sf "http://localhost:${EXPO_PORT}/status" > /dev/null 2>&1; then
      echo "[warmup] Metro is ready. Pre-warming bundle (this may take ~15s)..."
      local http_code
      http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 120 "$bundle_url" 2>/dev/null) || true
      if [ "$http_code" = "200" ] || [ "$http_code" = "304" ]; then
        echo "[warmup] Bundle pre-warm complete (HTTP ${http_code}). Expo Go connections will be instant."
      else
        echo "[warmup] Bundle pre-warm finished (HTTP ${http_code}). Bundle may still be cached by Metro."
      fi
      return
    fi
    sleep 2
  done
  echo "[warmup] Timed out waiting for Metro to start."
}

warmup_bundle &

EXPO_PACKAGER_PROXY_URL="https://$REPLIT_EXPO_DEV_DOMAIN" \
  EXPO_PUBLIC_DOMAIN="$REPLIT_DEV_DOMAIN" \
  EXPO_PUBLIC_REPL_ID="$REPL_ID" \
  REACT_NATIVE_PACKAGER_HOSTNAME="$REPLIT_DEV_DOMAIN" \
  pnpm exec expo start --localhost --port "$EXPO_PORT"
