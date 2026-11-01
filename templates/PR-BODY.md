## What changes for the user
- {{Sections change in X ms (was Y ms). Plain words.}}
- {{Every visible change to the interface, listed.}}

## What changed
- {{One line per area: layout/animation, auth on the navigation path, prefetch, lists, memoisation...}}
- {{Docs: decision log, change log.}}

## Checks
- typecheck {{✅}} · lint {{result, compared with the base branch}} · build {{✅}}
- Section-change harness (production build, {{100}} ms latency, {{N}} rows, both account types): worst {{ms}} at 1×, {{ms}} at 2×; blank {{0}}, flicker {{0}}, layout shift {{0}}, long tasks {{0}}
- Visual + contrast sweep: {{0 failures across N combinations}}
- Functional suite: {{n/n}}
- Independent review: {{by whom; findings and what was done}}

## Trade-offs
- {{Each, in one line. Security first.}}

## Not in this PR
- {{What the owner might expect but is not here.}}
- {{Existing problems found, not fixed.}}
