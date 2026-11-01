# Prompt: start a performance session

Fill in the `{{placeholders}}`, delete lines that do not apply, and paste it as the first message of a new agent session **inside the project you want to speed up**. The agent needs access to `improve-velocity` (clone it next to the project or copy `docs/`, `harness/`, `prompts/`, `templates/` in).

---

```text
Goal: make section changes in {{PROJECT}} fast and fluid.

Follow improve-velocity/docs/PROCESS.md exactly, phase by phase. Read these first:
improve-velocity/docs/PROCESS.md, CULPRITS.md, METRICS.md, AGENT-RULES.md.

Targets
- Every section change fully visible within {{200}} ms at normal CPU, first visit and warm,
  for every account type: {{admin / normal user / ...}}.
- Fluid: no blank frames, flicker, layout shift or long tasks; at most one isolated skipped frame.
- First paint must already be the final look.

Constraints
- {{Do not change the interface. If a visible change is unavoidable, list it and ask first.}}
- {{Target devices: phone first (390x844), then desktop.}}
- Test the PRODUCTION build with realistic backend latency ({{100}} ms) and realistic data volume.
- Backend for tests: {{build a mock / use staging at URL (never production)}}.
- Security: any change that removes a server-side check from a path must be justified in
  writing and you must prove no data is reachable without validation elsewhere.

How to work
- Phase 0: ask me anything unclear in ONE round (with a recommended answer for each).
- Build the harness first (improve-velocity/harness), prove it works, record a baseline
  at 1x, 2x and 4x CPU. Then fix ONE class of problem at a time, re-measure, keep or revert.
- Models: small/fast model for read-only research; strongest model for building, verifying and fixing.
  Effort high, not max. Run independent read-only work in parallel.
- Keep a change log (improve-velocity/templates/VELOCITY-LOG.md) and a decision log
  (templates/DECISIONS.md). Trade-offs are written down the same day.
- Before merging: an INDEPENDENT review by a different agent (improve-velocity/prompts/REVIEW.md).
  Fix every finding or justify it, then re-run all suites.
- Commits: separate speed changes / other changes / docs / review fixes. PR from templates/PR-BODY.md.
- Merge rules: {{open a draft PR and wait for my OK / you may merge after the review}}.

Working autonomously
- {{Work without asking until the exit criteria in PROCESS.md hold, then report. Stop and ask only
  if reality contradicts the plan, a new dependency is needed, or a fix needs an interface change.}}

Report at the end with improve-velocity/prompts/REPORT.md: before/after numbers, what changed for
the user, what you could NOT meet and why, trade-offs, and existing problems you found but did not fix.
```
