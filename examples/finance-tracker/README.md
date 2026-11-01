# Worked example: personal finance tracker

Next.js 16 (App Router) + Supabase auth/Postgres + Tailwind + framer-motion. The app is not included; this folder shows how to describe it to the harness and how the mock backend works. The full story is in [`../../docs/CASE-STUDY.md`](../../docs/CASE-STUDY.md).

## Files

- `velocity.config.js`: the harness config. Note how it builds the Supabase **session cookie** (`sb-localhost-auth-token`, value `base64-` + base64url of the session JSON) so the app and its server-side proxy believe the user is signed in; the bottom pill nav selector (`nav.pill-nav button`) so the hidden desktop sidebar is not matched; the theme switch via `localStorage`.
- `mock-supabase.js`: a small mock of the Supabase REST (`/rest/v1/<table>`) and auth (`/auth/v1/user`, `/token`, JWKS) endpoints with CORS and **configurable latency** (`MOCK_LATENCY`, default 100 ms), seeded with ~120 transactions, 3 wallets, debts and transfers. `MOCK_EMAIL` picks the signed-in user (the account type that sees a different navigation).
- `serve.sh`: starts the mock and the production build, killing old servers **by port**.

## Run it

```bash
# 1. build the app against the mock
cd /path/to/app
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=anon npm run build

# 2. start mock + app (second argument = signed-in email)
/path/to/improve-velocity/examples/finance-tracker/serve.sh /path/to/app user@example.com

# 3. measure
cd /path/to/improve-velocity
node harness/run-navigation.js examples/finance-tracker/velocity.config.js --throttle 1
node harness/run-visual.js     examples/finance-tracker/velocity.config.js
node harness/profile.js        examples/finance-tracker/velocity.config.js --nav 1 --throttle 4
```

## Adapting it to your own backend

Replace `mock-supabase.js` with whatever your app calls (or put `harness/latency-proxy.js` in front of staging), and replace the cookie in `setup()` with your own login mechanism. Everything else in the harness stays the same.
