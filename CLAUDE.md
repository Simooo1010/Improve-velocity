# CLAUDE.md: working in this repo

This repo is a **process + harness** for making web apps fast and fluid with AI agents. It is meant to be copied into, or kept next to, other projects.

- The process is `docs/PROCESS.md`. Keep it stack-agnostic: stack-specific advice must be labelled as such (see `docs/CULPRITS.md` "Stack notes").
- The harness (`harness/`) must stay framework-agnostic: it may only rely on the DOM, the URL and standard browser performance APIs. Anything specific to one app belongs in `examples/`.
- Every claim in the docs about numbers comes from `docs/CASE-STUDY.md` or from a harness run. Do not invent numbers.
- When you change the harness, run it against `examples/finance-tracker` (or another real app) and show the output before saying it works.
- Keep prompts in `prompts/` paste-ready, with `{{placeholders}}`.
- No secrets, no production data, no real credentials anywhere in the repo.
- Docs are in English. Short sentences, plain language, commands in fenced blocks.
