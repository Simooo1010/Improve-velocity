#!/bin/bash
# Start the mock backend and the PRODUCTION build of the app under test.
#   examples/finance-tracker/serve.sh <path-to-app> [mock-user-email]
# Build the app first against the mock:
#   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=anon npm run build
#
# Kill by PORT, never with `pkill -f <name>`: the pattern also matches the shell that is running
# your command (its own command line contains the name) and kills your session.
HERE="$(cd "$(dirname "$0")" && pwd)"
APP="${1:?path to the app}"
EMAIL="${2:-test@example.com}"

fuser -k 3111/tcp >/dev/null 2>&1 || true     # an old server on the port serves a STALE build
fuser -k 54321/tcp >/dev/null 2>&1 || true
sleep 1

MOCK_EMAIL="$EMAIL" MOCK_LATENCY="${MOCK_LATENCY:-100}" nohup node "$HERE/mock-supabase.js" > "$HERE/mock.log" 2>&1 &
( cd "$APP" && NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=anon nohup npx next start -p 3111 > "$HERE/next.log" 2>&1 & )

for i in $(seq 1 30); do curl -s -o /dev/null http://localhost:3111/login && break; sleep 1; done
echo "app: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3111/login)  mock user: $EMAIL  latency: ${MOCK_LATENCY:-100} ms"
