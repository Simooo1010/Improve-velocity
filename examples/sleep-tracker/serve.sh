#!/bin/bash
# Start the mock backend and the PRODUCTION build of the sleep tracker app.
#   examples/sleep-tracker/serve.sh <path-to-app>
# Build first, against the mock (placeholder values on the command line, never in a file):
#   cd <app> && NEXT_PUBLIC_SUPABASE_URL=http://localhost:54322 SUPABASE_SERVICE_ROLE_KEY=x npm run build
# Kill by PORT, never `pkill -f <name>`.
HERE="$(cd "$(dirname "$0")" && pwd)"
APP="${1:?path to the app}"
fuser -k 3112/tcp >/dev/null 2>&1 || true
fuser -k 54322/tcp >/dev/null 2>&1 || true
sleep 1
MOCK_LATENCY="${MOCK_LATENCY:-100}" nohup node "$HERE/mock-supabase.js" > "$HERE/mock.log" 2>&1 &
( cd "$APP" && NEXT_PUBLIC_SUPABASE_URL=http://localhost:54322 SUPABASE_SERVICE_ROLE_KEY=x \
  APP_LOGIN_PASSWORD=harness-password-not-a-secret nohup npx next start -p 3112 > "$HERE/next.log" 2>&1 & )
for i in $(seq 1 30); do curl -s -o /dev/null http://localhost:3112/login && break; sleep 1; done
echo "app: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3112/login)  latency: ${MOCK_LATENCY:-100} ms"
