# Prompt: the final report

Use this structure for the end-of-work message to the owner. Short, plain language, user-visible change first. Never hide a failure.

---

```text
**{{Project}} — speed and smoothness** · PR: {{url}} ({{merged / open}})

**What you will notice**
- {{section changes: before → after, in plain words}}
- {{any visible change to the interface, listed explicitly}}

**What to check** (on {{device}})
1. {{action}} → {{what you should see}}
2. ...

**Numbers** (production build, {{100}} ms backend latency, {{N}} rows)
| Section | Before | After (1×) | After (2×) | After (4×) |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |
Fluidity: blank frames {{0}}, flicker {{0}}, layout shift {{0}}, long tasks {{0}}, skipped frames {{≤1 isolated}}.

**Checks** (real output)
- typecheck {{✅/❌}} · lint {{result vs base branch}} · build {{✅/❌}}
- functional suite {{n/n}} · visual + contrast {{0 failures across n combinations}}
- independent review: {{done by whom; findings: n; all fixed / which justified}}

**What I could not meet, and why**
- {{e.g. 4× CPU: Activity 250–330 ms; the profile shows browser paint work in a GPU-less test browser}}

**Trade-offs** (also in the decision log)
- {{security / accessibility / behaviour trade-offs, each in one line}}

**Not in this change**
- {{things the owner might expect that are out of scope}}

**Existing problems found, not fixed**
- {{one line each}}

**Decisions for you**
- {{question, with a recommended option}}
```
