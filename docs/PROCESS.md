# The process

This is the loop, in order. Follow every phase. Skipping the measuring phases is how agents end up reporting speed-ups that do not exist.

```
0 Intake ─ 1 Recon ─ 2 Harness ─ 3 Baseline ─┐
                                              ▼
              ┌──────────── 4 Fix loop ◄──────┤
              │   change → check → measure    │
              ▼                               │
        5 Fluidity pass ── 6 Profile the rest ┘ (until the exit criteria hold)
              ▼
7 Visual regression ─ 8 Functional regression ─ 9 Independent review ─ 10 Ship ─ 11 Report
```

Principles that apply everywhere:

- **Measure, then change.** Every claim in the final report has a number from the harness next to it.
- **One class of change per iteration**, so you know which change bought what (and can revert one without losing the rest).
- **Test the production build**, never the dev server.
- **Realistic network**: add latency between the app and its backend, or network-bound problems look free.
- **Do not change the interface** unless it is the cause. If you must, say exactly what changed.
- **Write trade-offs down** the same day (security and accessibility trade-offs especially).

---

## Phase 0 — Intake

Ask the owner once, in one round, with a recommended answer for each. Do not start before you have these:

| Question | Why it matters | Typical default |
|---|---|---|
| What is the target? (e.g. "a section change is fully visible within 200 ms") | Defines done | 200 ms |
| What does "fluid" mean? | Defines the second goal | no blank frames, flicker, layout shift or long tasks; at most one skipped frame |
| Which devices and widths matter most? | Picks viewports and throttling | phone first, then desktop |
| What must not change? (look, copy, behaviour) | Limits the fixes | the interface; disclose any visible change |
| Is there a staging backend or test account? If not, may you build a mock? | Needed for data and login | mock with 100 ms latency |
| Approval rules: may you merge? who reviews? | Avoids unauthorised merges | PR, independent review, owner approves merge |
| Known slow places or recent complaints | Saves recon time | none |

Write the answers into the change log ([`templates/VELOCITY-LOG.md`](../templates/VELOCITY-LOG.md)).

## Phase 1 — Recon (read-only)

A small, fast model is enough here. Goal: a **ranked list of hypotheses with evidence** (`file:line`), not fixes.

1. **Identify the stack** (framework, router, data layer, auth, styling, animation library). Read the project's own agent instructions first (`CLAUDE.md`, `AGENTS.md`, `README`). If the framework ships docs inside `node_modules`, read the relevant ones before writing any code: versions drift from your training data.
2. **Trace the section-change path**, from tap to pixels:
   `control` → `router` → `server middleware / edge / proxy` → `layout` → `route code (JS chunk)` → `data` → `render` → `animation`.
   For each step ask: does it wait on the network? does it wait on an animation? does it do work that is repeated?
3. **Search for the usual suspects** ([`CULPRITS.md`](CULPRITS.md) has a grep for each):

```bash
# animations that block or stack
grep -rnE "AnimatePresence|mode=\"wait\"|exit=\{|transition-group|<Transition|v-motion|animate:" src app
grep -rnE "initial=\{\{[^}]*opacity: ?0" src app
grep -rnE "(duration|delay): [0-9.]+" src app
# network on the navigation or mount path
grep -rnE "getUser\(|getSession\(|fetch\(|axios|useSWR|useQuery|supabase\.auth" src app middleware* proxy*
cat middleware.* proxy.* 2>/dev/null
# navigation without prefetch
grep -rnE "router\.push|navigate\(|location\.href|<a href" src app components
# work on every render
grep -rnE "\.map\(|\.filter\(|\.reduce\(|\.sort\(" src app | grep -v useMemo
# long lists
grep -rnE "\.map\(\(" src app | wc -l
```

4. Output a table: *hypothesis · evidence (file:line) · expected gain · risk*. Do **not** fix anything yet.

## Phase 2 — Build the harness

A strong model, because this is the part that must be right.

1. **Install without touching the project's lockfile**: `npm install --no-package-lock` (if `npm ci` says the lockfile is out of sync, that is a pre-existing problem: report it, do not "fix" it here).
2. **Run a production build** against a backend you control:
   - mock the backend (`examples/finance-tracker/mock-supabase.js` is a template: auth endpoint, a REST endpoint per table, CORS, configurable latency), **or**
   - put `harness/latency-proxy.js` in front of staging.
   Realistic latency is the single most important setting: 100 ms is a fair default.
3. **Seed realistic data**: hundreds of rows, not three. List rendering problems only show with real volume.
4. **Write `velocity.config.js`** from `harness/velocity.config.template.js`. Check the navigation selector matches **only visible** controls (a hidden desktop menu that also matches makes clicks time out).
5. **Sanity-check the harness itself** before trusting it:
   - it counts the expected number of nav controls,
   - a click on the current section is reported as a no-op, not as 0 ms,
   - it fails on a deliberately slow change (add a temporary 500 ms wait and confirm the run goes red),
   - it fails if the old and new sections are never both distinguishable (adjust `sectionRootSelector`).
6. **Start servers by port, kill by port.** `fuser -k PORT/tcp`. Never `pkill -f <name>`: its pattern also matches the shell running your command and kills the session. An old server on the same port serves a stale build and silently invalidates every measurement.

## Phase 3 — Baseline

Run, and save the raw output in the change log:

```bash
node harness/run-navigation.js velocity.config.js --throttle 1
node harness/run-navigation.js velocity.config.js --throttle 2
node harness/run-navigation.js velocity.config.js --throttle 4
```

- For **each account/permission type** that shows a different navigation.
- Every section **twice**: round 1 (first visit, after prefetch) and round 2 (warm).
- Note the slowest section, the shape of the numbers, and which metric fails. Typical baselines: 400–900 ms per change.

## Phase 4 — The fix loop

For each hypothesis, highest expected gain and lowest risk first:

1. Make **one class** of change (e.g. "remove the exit animation wait").
2. Check: typecheck, lint, production build. Lint failures that existed before are not yours: compare with the base branch and report them separately.
3. Restart the server on the new build, run the harness (1× and 4× at least).
4. **Keep or revert.** Keep only changes with a measured gain, or that are required by a goal (e.g. fixing a flicker).
5. Add a row to the change log: *change · files · before · after · risk*.

Typical order and what each usually buys (from the case study):

| Order | Class of fix | Typical gain |
|---|---|---|
| 1 | Remove animation waits (exit-then-enter), shorten entrances | 300+ ms |
| 2 | Take network calls off the navigation path (middleware auth, per-mount auth checks) | 100–400 ms |
| 3 | Prefetch every section | removes first-visit fetch |
| 4 | Memoise derived data; stop recomputing on every render | 20–100 ms on heavy pages |
| 5 | Render long lists in pages; defer off-screen sections | 50–200 ms on list pages |
| 6 | Everything else the profiler shows | varies |

**Stop rules.** Stop the loop when (a) the exit criteria hold, or (b) the profiler shows the remainder is browser paint work that your harness environment inflates (see [`METRICS.md`](METRICS.md) → "Limits"), or (c) a further gain would need an interface change the owner has not approved. In case (b) or (c), report it instead of forcing it.

## Phase 5 — Fluidity pass

Speed is not enough. The harness records, during every change: frame gaps and skipped frames, blank frames, opacity flicker, root remounts, layout shift, long tasks and scroll jumps.

- A **blank frame** (nothing visible for a moment) usually means stacked fades from 0% opacity, or the old section removed before the new one is visible. Fix: never start a fade at 0% on a section change; keep one fade at the layout level; remove nested fades.
- **Flicker** (opacity going down after it started rising) usually means a remount: two components both animate the same element.
- **Long tasks** mean one synchronous chunk of work: split it (defer, page, memoise).
- **First paint** must already be the final look. Animation start states that are written into server-rendered HTML leave the page dimmed or shifted until JavaScript loads. Skip the start state during the first render only.

Re-run the baseline commands after each fix: a fluidity fix can cost speed and vice versa.

## Phase 6 — Profile what is left

```bash
node harness/profile.js velocity.config.js --nav 1 --throttle 4
```

Read `(program)` (browser style/layout/paint) against named JavaScript. Mostly `(program)` means the DOM is too big or an effect is expensive (blur, backdrop filters, large shadows, hundreds of animated nodes): render less. Mostly JavaScript means compute on mount: memoise, defer, paginate. Do not chase numbers that only exist because the test browser has no GPU.

## Phase 7 — Visual and accessibility regression

Whenever an optimisation touches colours, fonts, animation start states or themes (and always when a theme is added):

```bash
node harness/run-visual.js velocity.config.js
```

It screenshots every theme × viewport × route and scans every visible text element for contrast (4.5:1, or 3:1 for large text), including placeholders and open sheets. **Look at a few screenshots yourself**: a scan cannot judge whether something looks right.

## Phase 8 — Functional regression

Speed changes are refactors; refactors break behaviour. Write a functional suite for **every behaviour you touched** and keep it. Checks that almost always apply:

- Authenticated and unauthenticated redirects still work (and a revoked or stale session behaves sensibly).
- Save/create flows still send the request and update the screen, and no longer wait on removed network calls.
- Lists: first paint shows the first page; scrolling loads the rest; search narrows; clearing restores; counts match the data.
- Scroll resets to the top on section change; back/forward restore content.
- **Rapid navigation** (many taps in under a second) ends on the last section with exactly one section mounted.
- Derived numbers equal what they equalled before (compare displayed totals with the source data).
- The server-rendered HTML contains the **final** look (no dimmed or offset start states).
- No console errors.

## Phase 9 — Independent review

Use a **different agent** from the one that wrote the code (see [`prompts/REVIEW.md`](../prompts/REVIEW.md)): read-only, strongest model, high effort. It reviews the diff for **correctness** (not style), with a fixed list of categories. Fix every finding, or write down why not. Re-run all suites afterwards. In the case study the review found a real regression that all the tests had missed (a dimmed first paint).

## Phase 10 — Ship

- Separate commits: speed changes, other functional changes (e.g. a theme), docs, review fixes.
- Pull request from [`templates/PR-BODY.md`](../templates/PR-BODY.md): user-visible change first, then what changed, then the checks with real numbers, then what is **not** in it.
- Merge only as the owner's rules allow. If the owner says merge now, merge, and say plainly which gates were still open.
- Update the project's decision log ([`templates/DECISIONS.md`](../templates/DECISIONS.md)): what was decided, why, what it replaced, and **every trade-off** (especially security: e.g. a redirect that no longer validates a session over the network).

## Phase 11 — Report

Use [`prompts/REPORT.md`](../prompts/REPORT.md). Always include: before/after numbers per section, what changed for the user (including any visible change to the interface), checks with real output, **what you could not meet and why**, trade-offs, and pre-existing problems you found but did not fix.

---

## Exit criteria

All of these, on a production build, with realistic latency:

- [ ] Every section change fully visible within the target (default 200 ms) at 1× CPU, for every account type, first visit and warm.
- [ ] Fluidity: no blank frames, no flicker, no layout shift, no long tasks, at most one isolated skipped frame, no double mounts.
- [ ] 2× CPU throttle within target or the gap is explained; 4× reported honestly.
- [ ] First paint is the final look.
- [ ] Visual and contrast sweep clean in every theme (if themes or colours were touched).
- [ ] Functional suite green; lint/typecheck/build no worse than the base branch.
- [ ] Independent review done; every finding fixed or justified.
- [ ] Trade-offs and decisions written down; report delivered.

If you cannot meet a criterion, say which and why. Do not move the goalposts silently.
