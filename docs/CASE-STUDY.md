# Case study: a personal finance tracker

The real run this repo was extracted from. Stack: Next.js 16 (App Router), React 19, Supabase auth + Postgres (row-level security), Tailwind 4, framer-motion. Phone-first PWA. The owner's complaint: "it is just too slow changing sections". The target: **every section change within 200 ms, and fluid, with no UI or animation errors**, without changing the interface more than necessary.

Test setup: production build, a mock Supabase with **100 ms** latency per request, ~120 transactions, two account types (one with an extra AI section), Chromium 390×844. Numbers are "visible" time (new section fully on screen) at 1× CPU unless stated.

## Timeline

| Step | Change | Worst section change | What it showed |
|---|---|---|---|
| 0 | Baseline | **≈ 520 ms** (AI Chat up to 870) | Everything was slow, not one page |
| 1 | Layout: drop `AnimatePresence mode="wait"` (360 ms of exit+enter), prefetch every section, proxy stops calling `getUser()` on each navigation, client reads the stored session instead of `getUser()` | 442 ms | URL now changes in 60–140 ms (was ~520): the delay was almost entirely waiting |
| 2 | Give delayed entrances an explicit duration (they did **not** inherit the global default and used the library's slow spring) | 344 ms | Lesson A2 |
| 3 | Shorter durations, memoise Home totals | 242 ms | Activity page still heavy |
| 4 | Ledgers render 20 rows then load more on scroll; remove per-row `layout`/entrance | **182 ms** | List pages were the cost; Lesson C1 |
| 5 | Memoise Activity/Transactions filters, defer an off-screen section, 60 ms fades | 144–155 ms | |
| 6 | Fluidity metrics added → found **3–13 blank frames** per change | (speed unchanged) | Stacked fades from 0% (Lesson A3) |
| 7 | Layout fades from 60%, nested fades removed | **105–150 ms**, 0 blank frames | Speed and fluidity both green |
| 8 | Independent review found a **dimmed first paint** (start state baked into server HTML) | | Lesson A4; fixed with a hydration-aware start state |

Final (both account types): worst **150 ms** at 1×, 0 blank frames, 0 flicker, 0 layout shift, 0 long tasks, 0 double mounts, occasional single skipped frame on a first visit. At 2× CPU the non-AI account passes everything; the AI account's first Activity visit drops a frame or two. At 4× Activity and Analytics stay above 200 ms (see "What was not met").

## What actually caused it (ranked by gain)

1. **Exit-then-enter route animation**: 360 ms of pure waiting.
2. **Network auth validation on every navigation** in the proxy/middleware (`getUser()` = one Supabase round trip per section change).
3. **Programmatic navigation without prefetch** (buttons calling `router.push`).
4. **Network identity calls on every mount and before every save** (`getUser()` in four providers and many pages).
5. **Long lists mounted at once**, each row a `motion` element with `layout`.
6. **Derived data recomputed on every render.**
7. **Stacked opacity fades** (blank frames) and **start states in server HTML** (dimmed first paint).

## What worked about the process

- **Latency in the harness** exposed causes 2 and 4. On plain localhost they cost nothing.
- **The fluidity metrics** found a defect that the speed metric hid (blank frames), and the reviewer found one the tests missed (dimmed first paint). Measuring speed alone would have shipped both.
- **One class of change per iteration** made every gain attributable and every revert cheap.
- **A functional suite** (23 checks: redirects, lazy lists, search, save, scroll reset, back/forward, rapid navigation, totals equal, server HTML clean) caught nothing broken, which is the point: it let the refactors ship with confidence.
- **A contrast scan** gave an objective check of a theme added in the same work (0 failures across 36 page/theme/viewport combinations) after it found a real failure (a placeholder with no colour).

## What went wrong along the way (so you can skip it)

- `pkill -f "next start"` killed the agent's own shell (the pattern appeared in its own command line). Kill by port.
- A server from an earlier check still held the port and served a stale build: all measurements looked broken until it was killed.
- The first navigation selector (`nav button`) also matched a hidden desktop sidebar, so clicks timed out.
- `npm ci` failed because the repo's lockfile was out of sync: pre-existing; installed with `--no-package-lock` and reported.
- A blanket search-and-replace changed a **server** component by mistake; typecheck and a diff review caught it.
- Elements with `transition={{ delay }}` ignored the global default duration. Always set `duration` explicitly.
- The first version of the "visible" metric only looked at one element and under-reported animations; it had to be tightened to check every animated element.
- Merging was requested before the independent review had finished (usage limit). It was merged on the owner's explicit instruction, the review was completed afterwards, and its findings were fixed in a follow-up PR. Say plainly which gate was open.

## What was not met (reported honestly)

- Under 4× CPU throttle, Activity and Analytics took 250–330 ms. A profile showed the time is browser paint work in a GPU-less headless browser (`(program)`), not JavaScript; even a near-empty page cannot reach 200 ms at 4× with time-based fades. 1× was used as the pass/fail reference and 2× as the realistic phone check.
- One first-visit skipped frame (34–41 ms, no long task) remained on some runs.

## Trade-offs that were written down

- The proxy now trusts the session cookie for redirects (no network). Data stays protected by row-level security and the API routes still validate the user. It validates over the network on `/login` and `/register` only.
- Ledgers show 20 rows first; the rest load on scroll (browser Ctrl+F only sees loaded rows).
- Sections ease in over 60 ms instead of fading out then in; page blocks no longer slide in.

## Existing issues found, not fixed

- The AI routes checked sign-in but not the AI allowlist on the server.
- Reloading one route redirected to Home before the user had loaded.
