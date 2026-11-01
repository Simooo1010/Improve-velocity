# Metrics: what is measured, the thresholds, and the limits

All metrics are measured **in the browser, per section change**, from the click. They only use the DOM, the URL and standard performance APIs, so they work for any framework.

## Definitions

| Metric | Meaning | Default limit |
|---|---|---|
| `url` | ms from the click until the address changed (the client router committed) | informational |
| `visible` | ms until the **new** section root exists, the **old** one is gone, and every element inside the main area that is animating opacity is ≥ 95% opaque | **≤ 200 ms** |
| `settled` | `visible` and no spinner left | informational |
| `maxGap` | longest gap between two animation frames during the change | **≤ 50 ms** |
| `drops` | number of frame gaps > 33.5 ms (a skipped frame at 60 Hz) | **≤ 1** |
| `blank` | frames in which no text in the main area was at least 50% visible | **0** |
| `swaps` | how many times the section root element was replaced | **1** |
| `flicker` | frames in which the new section's opacity went down after it started rising | **0** |
| `cls` | layout shift score during the change (`layout-shift` entries without recent input) | **≤ 0.001** |
| `longMax` | longest task over 50 ms during the change | **0** (no long tasks) |
| `scrollMax` | furthest the page scrolled from the top during the change | **0** |

Why these numbers: about 100 ms reads as instant, 200 ms still feels responsive, and past ~300 ms users notice waiting. 16.7 ms is one frame at 60 Hz; two frames in a row (≈ 33 ms) is a visible hiccup, a single one rarely is. 50 ms is the standard threshold for a "long task".

## Conditions that make the numbers meaningful

1. **Production build**, never the dev server.
2. **Realistic network latency** between app and backend (100 ms default). Without it, network-bound problems read as 0 ms.
3. **Realistic data volume** (hundreds of rows).
4. **Every account type** that sees a different navigation (admin vs normal, feature flags).
5. **Cold and warm**: round 1 (first visit after prefetch) and round 2.
6. **CPU throttle** 1× (reference), 2× (mid-range phone), 4× (low-end phone). Report all three.
7. A **phone-size viewport** first, then desktop.

## How to read results

- `url` low, `visible` high → animation or late data after the route changed. Look at A1–A3, C1–C3.
- `url` high → something on the navigation path waits (B1–B3) or the route code is heavy (F1).
- `blank > 0` → A3. `swaps > 1` or `flicker > 0` → a remount; look for keys that change or two components animating one element.
- `drops` or `longMax` high only under 2×/4× → heavy mount work; profile it.

## Limits (be honest about these)

- **Headless Chrome paints in software.** `(program)` time (style, layout, paint) is inflated compared with a phone GPU. Use the harness to compare before/after and to catch regressions. Confirm on a real device before claiming a number to the owner.
- **CPU throttling is an emulation.** 4× is an extreme case; even a trivial page can take ~200 ms under it with time-based animations, so a 200 ms goal cannot be defined at 4×. Treat 1× as the pass/fail reference, 2× as the realistic phone check, and 4× as a stress report.
- **A mock backend is not your backend.** It proves your front end does not wait where it should not. Confirm against staging when you can.
- **One skipped frame is within the noise** of 60 Hz sampling. Do not chase it unless it repeats on the same section and a profile shows why.
- The measurements say nothing about perceived quality (easing curves, polish). Look at screenshots and the real thing.

## What to put in the report

A table per account type: section · first visit · warm · drops · blank, at 1×, plus a line for 2× and 4×. Before and after. Name the worst case.
