# Velocity log

The agent's running record. Copy to the project (e.g. `docs/VELOCITY-LOG.md`) and fill it in as you work. It is the source for the final report.

## Intake (Phase 0)

- Target: {{section change fully visible within N ms}}
- Fluid means: {{no blank frames, flicker, layout shift, long tasks; ≤ 1 isolated skipped frame}}
- Devices / viewports: {{phone 390×844, desktop 1280×800}}
- Must not change: {{interface, copy, ...}}
- Backend for tests: {{mock | staging URL}}, latency {{100}} ms, data volume {{N rows}}
- Account types to test: {{...}}
- Approval / merge rules: {{...}}

## Hypotheses (Phase 1)

| # | Hypothesis | Evidence (file:line) | Expected gain | Risk |
|---|---|---|---|---|
| 1 | | | | |

## Baseline (Phase 3), production build

```
paste the raw harness output for 1×, 2×, 4× and for each account type
```

## Changes (Phase 4)

| # | Change | Files | Before (worst) | After (worst) | Kept? | Risk / trade-off |
|---|---|---|---|---|---|---|
| 1 | | | | | | |

## Fluidity (Phase 5)

| Run | blank | flicker | cls | long tasks | drops | Notes |
|---|---|---|---|---|---|---|

## Profile of what is left (Phase 6)

- Section: {{...}} · `(program)` {{ms}} · top JS {{...}} · conclusion: {{...}}

## Suites

- Visual/contrast: {{0 failures across N combinations}}
- Functional: {{n/n}} — list of checks
- Lint / typecheck / build vs base branch: {{...}}

## Review (Phase 9)

- Reviewer: {{agent / model}} · findings: {{n}} · fixed: {{...}} · justified: {{...}}

## Open items / not met

- {{...}}
