# Culprits: what makes section changes slow or janky

Each entry: **symptom** (what you see), **detect** (how to find it with a grep and a measurement), **fix**, **cost** (what the fix gives up), and stack notes. They are ordered by how often they were the main cause. Measure before and after each one.

Use the grep patterns as starting points: adapt names to your stack.

---

## A. Animation and transitions

### A1. Exit-then-enter route animation (the biggest single cause)
- **Symptom**: every section change has a fixed minimum delay (exit time + enter time) before anything new shows. Typical: 0.18 s out + 0.18 s in = 360 ms.
- **Detect**: `grep -rnE "AnimatePresence|mode=.wait.|<Transition|transition-group|<ViewTransition|exit="`; the harness `url` metric is short but `visible` is 300+ ms.
- **Fix**: swap the section immediately. If you want motion, keep **one short ease-in** (60–100 ms) on the new section only, starting from **60% opacity, never 0%**.
- **Cost**: the old page no longer animates out. Disclose that to the owner.
- **Stack notes**: framer-motion `AnimatePresence mode="wait"`; Vue `<Transition mode="out-in">`; Svelte `transition:`/`out:`; Angular route animations; CSS View Transitions (keep the duration under ~100 ms or disable for in-app navigation).

### A2. Animations without an explicit duration, or with long delays and staggers
- **Symptom**: elements keep moving 300–600 ms after the section is mounted (library defaults are often springs that take ~400 ms to settle). `visible` is high although `url` is low.
- **Detect**: `grep -rnE "(duration|delay): [0-9.]+|staggerChildren|transition=\{\{ delay"`. Elements with `transition={{ delay: x }}` and no `duration` **do not inherit** a global default duration: they fall back to the library default.
- **Fix**: set a global default (e.g. a config provider) **and** give every override an explicit duration; cap staggers (e.g. first 5 items, about 10 ms apart).
- **Cost**: less "choreography".

### A3. Stacked fades from 0% opacity → blank frames
- **Symptom**: a brief empty dip between sections (the harness reports `blank` frames). The old page is removed instantly while the new page, and every block inside it, fades in from 0%: their opacities multiply.
- **Detect**: `grep -rnE "initial=\{\{[^}]*opacity: ?0"`; harness `blank > 0`.
- **Fix**: one fade at the layout level that starts at ≥ 50%; remove opacity from nested `initial` values (keep, at most, a small transform).
- **Cost**: none visible; sections look steadier.

### A4. Animation start states written into the server-rendered HTML → dimmed first paint
- **Symptom**: on a full page load the page is dimmed or shifted until JavaScript loads, then jumps to the final look. Worst on slow phones. (Often introduced by an "optimisation" that removed a wrapper which used to suppress first-render animation.)
- **Detect**: fetch the page without JS and inspect the HTML: `curl -s URL | grep -E "opacity:0|translateY"`. The functional suite should assert there are none.
- **Fix**: skip start states during the first render only (e.g. `initial={hydrated ? start : false}` where `hydrated` is false on the server and during hydration; React: `useSyncExternalStore(() => () => {}, () => true, () => false)`). Remove inner start states that you cannot gate.
- **Cost**: none.

### A5. Per-item `layout` animations on long lists
- **Symptom**: mounting a list is slow; scrolling janky; `(program)` time in the profile is large.
- **Detect**: `grep -rn "layout" ` on animation components inside `.map(`.
- **Fix**: drop `layout`/FLIP animations on rows (or only keep them for removal); render fewer rows (C1).
- **Cost**: siblings jump instead of gliding after a delete.

---

## B. Network on the navigation path

### B1. Auth validation over the network on every navigation (middleware / proxy / edge)
- **Symptom**: every section change costs one backend round trip (100–400 ms in production). In the harness without latency it looks free: **always test with latency**.
- **Detect**: read the middleware/proxy file; `grep -rnE "getUser\(|verifyToken|auth\.|fetch\(" middleware* proxy*`; the harness `url` metric is dominated by it.
- **Fix**: decide **redirects** from the session cookie locally (signature/expiry checked or just presence) and let the **data layer** (row-level security, API route checks) be the real authorisation. Validate over the network only where staleness matters (e.g. the login page, so a revoked session does not bounce users to the dashboard).
- **Cost (SECURITY, must be written down)**: a forged or revoked cookie can load the empty app shell until it expires. Confirm that **no data** is reachable without server-side validation: every API route and server component that returns data must validate on its own.
- **Stack notes**: Supabase `getSession()` vs `getUser()` (`getSession` on the server does not hit the network; do not read `session.user` on the server or the library warns); NextAuth `getToken` vs `getServerSession`; Clerk/Auth0 middleware local verification; JWT with asymmetric keys can be verified locally (`getClaims`-style) without a network call.

### B2. Network auth/identity calls on every mount and before every save
- **Symptom**: a spinner or delay on every section mount; saves have a hidden extra round trip first.
- **Detect**: `grep -rnE "auth\.getUser\(\)|getCurrentUser\(\)|/api/me|/session"` in components and hooks; harness shows requests per change (log them from your mock).
- **Fix**: read the identity from the locally stored session (no network), or from a context loaded **once above the routes**. Keep server-side authorisation unchanged.
- **Cost**: the UI may use a slightly stale identity until the token expires. Authorisation is unaffected if the server validates.

### B3. No prefetch because navigation is programmatic
- **Symptom**: the first visit to each section is slower than the second (round 1 vs round 2 in the harness).
- **Detect**: `grep -rnE "router\.push|navigate\(|history\.push"` on plain buttons (link components prefetch, buttons do not).
- **Fix**: prefetch every target section after the navigation mounts (e.g. `router.prefetch(href)` in an effect keyed on the list of hrefs, not on a new array each render), or use the framework's link component.
- **Cost**: a little background bandwidth.
- **Note**: prefetch usually fetches data/payload, not always the page's **JavaScript**; the first visit may still pay script parse time (see D1).

### B4. Data refetched on every mount
- **Symptom**: spinner on every section; the same request repeated when you return.
- **Detect**: log backend requests per change in the mock; `grep -rnE "useEffect\(.*fetch|useQuery|useSWR"`.
- **Fix**: load shared data once in a provider above the routes (the layout), cache, and update optimistically on writes; give per-section queries a stale time.
- **Cost**: staleness; needs an invalidation story.

---

## C. Rendering work

### C1. Long lists mounted all at once
- **Symptom**: list sections are the slowest; time grows with the amount of data; dropped frames on mount.
- **Detect**: seed hundreds or thousands of rows in the mock; `grep -rn "\.map(" ` over unbounded arrays; harness `visible` grows with data.
- **Fix**: render the first page (e.g. 20 rows), load more with an `IntersectionObserver` sentinel (re-arm it after each page so a sentinel still on screen keeps loading), reset the page count when the filter changes. Or virtualise. Keep totals and empty states based on the **full** list, not the visible slice.
- **Cost**: DOM search (Ctrl+F) only sees rendered rows; select-all/bulk actions must work on the data, not the DOM.

### C2. Derived data recomputed on every render
- **Symptom**: each interaction or section mount burns CPU in your own code (profile shows your functions).
- **Detect**: `grep -rnE "\.(filter|map|reduce|sort)\(" | grep -v useMemo` on large arrays inside component bodies.
- **Fix**: memoise with correct dependencies (`useMemo`, Vue `computed`, Svelte `$derived`, Solid `createMemo`); compute totals in one pass.
- **Cost**: none if dependencies are right; a stale value if they are not (test it).

### C3. Off-screen sections rendered synchronously
- **Symptom**: a page has an expensive section far below the fold that delays the first paint.
- **Fix**: mount it right after first paint (two `requestAnimationFrame`s, or `requestIdleCallback`). Keep the above-the-fold part synchronous.
- **Cost**: the lower section appears a frame or two later; harmless below the fold.

### C4. Expensive paint effects
- **Symptom**: the profile is mostly `(program)` (style/layout/paint), worse while a fade runs over content: large `backdrop-filter` blurs, big soft shadows on many elements, many composited layers.
- **Fix**: reduce blur radius/area, avoid blurs over animating content, drop shadows on repeated elements, use `will-change` sparingly. **Judge it on a real device**: GPU-less headless Chrome inflates this.
- **Cost**: visual style may change; ask the owner.

### C5. Layout shift
- **Symptom**: content jumps after load (images without size, fonts swapping, late data).
- **Detect**: harness `cls > 0`. **Fix**: reserve space (width/height, skeletons of the final size), self-host fonts with a metric-matched fallback.

---

## D. Scripts and first load

### D1. First visit pays JavaScript parse/execute for the route (cold chunk)
- **Symptom**: first visit of a section occasionally drops a frame that the warm visit does not.
- **Fix ideas**: preload route chunks on idle, split heavy dependencies, avoid huge client components (move compute to the server or defer it).
- **Cost**: bandwidth. Often acceptable to leave: one isolated skipped frame on a first visit is not visible.

### D2. Fonts
- **Symptom**: layout shift or a different font for a moment; a render-blocking CSS `@import` of a font host.
- **Fix**: self-host (e.g. `next/font`), pin a fallback stack, `font-display: swap`, subset.

---

## E. Things that look like culprits but are not (check before "fixing")

- The framework's dev server (slow by design). Always measure a production build.
- localhost with zero latency hiding network-bound problems. Add latency.
- Headless Chrome software rendering inflating paint time. Compare before/after; do not chase absolute numbers.
- A single skipped frame of 34–40 ms on a first visit with no long task: noise at the limit of what 60 Hz sampling can tell.

## F. Detection recipe (any stack)

1. Seed realistic data and latency, run the baseline.
2. List what happens between the click and the pixels (Phase 1 in `PROCESS.md`).
3. Rank hypotheses by (expected gain × certainty ÷ risk).
4. After each fix, re-measure at 1× and 4× CPU and keep/revert on evidence.
5. When the numbers stop improving, profile (`harness/profile.js`) instead of guessing.
