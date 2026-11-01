# Improve velocity

A repeatable process, and a small test harness, for making a web app **fast and fluid** when AI agents are building it. Point an agent at this repo, tell it your target, and it follows the same loop that took a real app from about **520 ms to 105–150 ms per section change** with no blank frames, flicker or layout jumps (see [`docs/CASE-STUDY.md`](docs/CASE-STUDY.md)).

It is **not tied to a stack**. The process and the harness work from what a browser can see (the DOM, the URL, frame timing), so they apply to React, Next.js, Vue, Nuxt, Svelte, Astro, Remix, Angular, or plain HTML. Stack-specific advice is labelled as such.

## Why this exists

AI agents are good at writing code and bad at noticing it is slow. Left alone they guess, change several things at once, and report "should be faster". This repo replaces guessing with a loop:

1. say what "fast" and "fluid" mean in numbers,
2. build a test that measures them in a real browser,
3. record a baseline,
4. fix one class of problem at a time and re-measure,
5. have a different agent review the result,
6. ship with the trade-offs written down.

## What is in here

| Path | What it is |
|---|---|
| [`docs/PROCESS.md`](docs/PROCESS.md) | The full process, phase by phase, with the commands and the exit criteria. **Start here.** |
| [`docs/CULPRITS.md`](docs/CULPRITS.md) | Catalogue of what makes apps slow or janky: symptom, how to detect it, how to fix it, what it costs. |
| [`docs/METRICS.md`](docs/METRICS.md) | Exactly what is measured, the thresholds, and the limits of the measurements. |
| [`docs/AGENT-RULES.md`](docs/AGENT-RULES.md) | Rules for the AI agents doing the work (measure first, disclose trade-offs, independent review, honesty). |
| [`docs/CASE-STUDY.md`](docs/CASE-STUDY.md) | The real run this was extracted from: numbers per step, what worked, what did not. |
| [`prompts/`](prompts) | Paste-ready prompts: start a session, run the independent review, write the final report. |
| [`templates/`](templates) | Change log, decision log and pull-request templates. |
| [`harness/`](harness) | Framework-agnostic test harness (Playwright): section-change speed + fluidity, visual and contrast sweep, CPU profile, latency proxy. |
| [`examples/finance-tracker/`](examples/finance-tracker) | A complete worked config: Next.js + Supabase auth, with a mock backend. |

## Use it in a project (5 minutes)

1. Copy `harness/` into your project (or keep this repo next to it) and `npm i -D playwright` in it.
2. Copy `harness/velocity.config.template.js` to `velocity.config.js` and fill it in: base URL, how to log in, which controls switch sections.
3. Open [`prompts/START.md`](prompts/START.md), fill in the placeholders, and paste it to your agent.
4. The agent runs the process in `docs/PROCESS.md`. You review the report and the pull request.

To make the agent remember the process in every session, add this to the project's `CLAUDE.md` / `AGENTS.md`:

```md
## Performance work
When asked to improve speed or smoothness, follow `improve-velocity/docs/PROCESS.md`.
Measure first with `improve-velocity/harness`. Never claim a speed-up without before/after numbers.
```

## What it will and will not do

It finds and removes the causes of slow section changes (animation waits, network calls on the navigation path, missing prefetch, work repeated on every render, long lists, first-paint glitches), and it proves the result. It does **not** replace profiling on a real device: the harness runs headless Chrome, which paints in software. Use its numbers to compare before and after and to catch regressions; confirm on the phone you care about.

## Requirements

Node 18+, Playwright with Chromium, and a way to run a **production build** of your app locally. Staging or a mock backend for anything that needs data or login (never production data or credentials).

## License

Not set. Add one before sharing publicly.
