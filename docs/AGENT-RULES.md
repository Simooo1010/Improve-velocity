# Rules for AI agents doing performance work

These apply to any agent (Claude Code, Cursor, Copilot agents, others). Copy the ones that matter into the project's own `CLAUDE.md` / `AGENTS.md`.

## Evidence

1. **Never claim a speed-up without before and after numbers** from the harness, on a production build, with realistic latency.
2. **Show the output.** Paste the real command output for lint, typecheck, build and every test. A summary like "all good" is not evidence.
3. **Report failures and gaps plainly**: what did not meet the target, why, and what would be needed. Do not move the goalposts, do not mock a result, do not skip a failing check.
4. **Pre-existing problems are not yours**: compare with the base branch (stash or check out, run, restore). Report them separately and do not "fix" them inside a performance change unless asked.

## Scope and honesty about the interface

5. **Do not change the interface** to gain speed unless it is the cause and there is no alternative. List every visible change (animation timings, removed effects, pagination of lists) in the pull request and the report, in plain words for a non-technical owner.
6. **Trade-offs are written down the same day**, in the decision log, with the reason and what it replaced. Security and accessibility trade-offs are mandatory entries.
7. **Security.** Anything that removes a server-side check from a path (e.g. validating a session over the network on every navigation) must be justified in writing, and you must verify that **no data** is reachable without validation elsewhere (data layer, API routes). If you cannot verify it, do not ship it.
8. **No secrets** in files, logs, chat output or the harness. The harness runs against a mock or staging, never production data or credentials.

## Process

9. **Measure first**, one class of change per iteration, keep or revert on evidence.
10. **Build the harness before the fixes**, and prove the harness itself (it must fail on a deliberately slow change).
11. **An independent reviewer** (a different agent, read-only, strongest available model, high effort) checks the diff for correctness before merge. Fix every finding or justify it. The author never reviews their own work.
12. **A functional suite** covers every behaviour you touched, and stays in the project. Every bug you fix gets a check that would have caught it.
13. **Merging**: follow the owner's rules. If the owner explicitly tells you to merge before a gate is complete, do it, and say exactly which gate was still open and when it will be closed. Never merge on your own initiative.
14. **Do not weaken tests, lints or types** to get green. Never skip, quarantine or delete a test to make a run pass.

## Models and parallelism (adapt to your tools)

15. Research and read-only sweeps: a small, fast model.
16. Building the harness, implementing fixes, verifying, reviewing: the strongest available model.
17. Effort: high, not maximum (maximum costs far more for little extra quality).
18. Run independent work in parallel (e.g. two read-only investigations). Do **not** run two agents editing the same files.
19. Subagents share the machine: if a long job hits a rate limit, resume it later instead of starting a new one.

## Environment hygiene (things that burned real sessions)

20. **Kill servers by port** (`fuser -k PORT/tcp`). `pkill -f <name>` matches your own command line and can kill your shell.
21. **An old server on the port serves a stale build** and invalidates measurements. Check the port is free before starting.
22. **Install dependencies without rewriting the lockfile** (`npm install --no-package-lock`) when the lockfile is out of sync; report that as a pre-existing issue.
23. **Build-time network**: a font or asset fetched at build time can fail in a sandbox; distinguish that from a code error.
24. **Selectors**: a navigation selector that also matches a hidden desktop menu makes clicks time out. Match only visible controls.
25. **Placeholder environment variables** for builds go on the command line, never into a committed file.

## Communication

26. Write for the owner: plain language, the user-visible change first, then the details. Keep replies short; the record lives in commits, the PR and the decision log.
27. Ask the owner a question only when the answer changes what you do and you cannot decide from the evidence. Give a recommended option.
