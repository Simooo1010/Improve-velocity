# Harness

Framework-agnostic tools that measure a web app in a real browser (Playwright + Chromium). They only use the DOM, the URL and standard performance APIs.

```bash
cd harness && npm install          # installs Playwright; then: npx playwright install chromium
cp velocity.config.template.js ../velocity.config.js   # fill it in
node harness/run-navigation.js velocity.config.js --throttle 1
```

| Tool | Use it to |
|---|---|
| `run-navigation.js` | **Section-change speed and fluidity.** Clicks every navigation control twice (first visit, warm); fails on slow changes, blank frames, flicker, layout shift, long tasks, double mounts, scroll jumps and console errors. Flags: `--throttle 1\|2\|4`, `--max-ms`, `--max-drops`. |
| `run-visual.js` | **Screenshots + contrast scan** of every theme × viewport × route (and open sheets). Run whenever colours, fonts, themes or animation start states change. |
| `profile.js` | **CPU profile of one section change**, split into browser paint work (`(program)`) vs JavaScript. Use it when something is still slow and you do not know why. |
| `latency-proxy.js` | **Adds a fixed delay** (default 100 ms) to every request in front of staging or a mock, so network-bound problems show up. |
| `lib/probe.js` | The in-page measurement code (read it to understand exactly what each metric means). |

## The config file

`velocity.config.template.js` documents every key. The ones that matter:

- `baseUrl`, `startPath`: where to go. Always a **production build**.
- `setup(ctx)`: how to be logged in (cookies, storage, headers). Any mechanism.
- `navSelector`: matches **only the visible** controls that switch sections.
- `mainSelector`, `sectionRootSelector`, `spinnerSelector`: how the probe finds the replaced element and "still loading".
- `maxMs`, `maxDrops`, `maxGapMs`: the limits (defaults 200 / 1 / 50).
- `routes`, `themes`, `interactions`: for the visual sweep.

## Backends

- **Staging**: run `latency-proxy.js` in front of it and point the app at the proxy. Never production data or credentials.
- **Mock**: see `../examples/finance-tracker/mock-supabase.js` for a small mock with auth, per-table endpoints, CORS and configurable latency. Seed hundreds of rows.

## Writing your functional suite

The navigation harness proves speed and fluidity, not correctness. Add a functional script for what you touched (redirects, saves, lists, search, scroll reset, back/forward, rapid navigation, totals, server HTML). `../docs/PROCESS.md` Phase 8 lists the checks that almost always apply.

## Gotchas

- Kill servers by port (`fuser -k PORT/tcp`), never `pkill -f <name>`.
- Make sure nothing else is listening on the app's port, or you measure a stale build.
- A bare `nav a`/`nav button` selector can match a hidden desktop menu: target the visible one.
- Headless Chrome paints in software: compare before/after, do not trust absolute paint numbers. See `../docs/METRICS.md`.
