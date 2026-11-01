// In-page probe. Injected with page.evaluate(installProbe, { mainSelector, spinnerSelector }).
// It measures ONE section change at a time: call window.__velocity.start(label) right before the
// click, then read window.__velocity.read() once `settled` is set.
// Framework-agnostic: it only looks at the DOM, the URL and the browser's own performance APIs.
//
// Metrics (all in ms, measured from the click):
//   url       the address changed (client-side router committed)
//   visible   the NEW section's root is mounted, the OLD one is gone, and every animated
//             element inside the main area is at least 95% opaque
//   settled   visible AND no spinner left
//   maxGap    longest gap between two animation frames during the change
//   drops     number of gaps over 33.5 ms (a skipped frame at 60 Hz)
//   blank     frames where no text inside the main area was at least 50% visible
//   swaps     how many times the section root element was replaced (must be 1)
//   flicker   frames where the new section's opacity went DOWN after it started rising
//   cls       layout shift score during the change
//   long      long tasks (>50 ms) during the change
//   scrollMax furthest the page scrolled from the top during the change

module.exports = function installProbe({ mainSelector = 'main', spinnerSelector = '.animate-spin', sectionRootSelector = null } = {}) {
  window.__long = [];
  window.__shifts = [];
  try {
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push({ t: e.startTime, d: e.duration }))).observe({ type: 'longtask', buffered: false });
  } catch {}
  try {
    new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__shifts.push({ t: e.startTime, v: e.value }); })).observe({ type: 'layout-shift', buffered: false });
  } catch {}

  const rootOf = () => {
    const m = document.querySelector(mainSelector);
    // The "section root" is the element that gets REPLACED when the section changes.
    // Preferred: give it a selector in the config (sectionRootSelector).
    // Fallback heuristic: main > (transition wrapper) > page root.
    const el = sectionRootSelector
      ? document.querySelector(sectionRootSelector)
      : m && m.firstElementChild && m.firstElementChild.firstElementChild;
    return { m, el };
  };
  const cumulativeOpacity = (el) => {
    let o = 1;
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity);
    return o;
  };

  window.__velocity = {
    start(label) {
      window.__long.length = 0;
      window.__shifts.length = 0;
      const { el: oldEl } = rootOf();
      const c = (window.__velocity.cur = {
        label, t0: performance.now(), oldEl, path0: location.pathname,
        tUrl: null, tVisible: null, tSettled: null,
        frames: [], blank: 0, swaps: 0, lastEl: oldEl, flicker: 0, lastOp: null, scrollMax: 0,
      });
      const tick = () => {
        if (window.__velocity.cur !== c) return;
        if (c.tSettled && performance.now() - c.t0 > c.tSettled + 300) return; // keep sampling 300 ms after settle
        const { m, el } = rootOf();
        const now = performance.now();
        c.frames.push(now);
        if (el && el !== c.lastEl) { c.swaps++; c.lastEl = el; }
        if (c.tUrl === null && location.pathname !== c.path0) c.tUrl = now - c.t0;
        if (c.tUrl !== null) {
          let seen = false;
          const tw = document.createTreeWalker(m || document.body, NodeFilter.SHOW_TEXT);
          for (let n = tw.nextNode(), i = 0; n && i < 400; n = tw.nextNode(), i++) {
            if (!n.textContent.trim()) continue;
            if (cumulativeOpacity(n.parentElement) >= 0.5) { seen = true; break; }
          }
          if (!seen) c.blank++;
          if (el && el !== c.oldEl) {
            const o = cumulativeOpacity(el);
            if (c.lastOp !== null && o < c.lastOp - 0.02) c.flicker++;
            c.lastOp = o;
          }
        }
        c.scrollMax = Math.max(c.scrollMax, Math.abs(window.scrollY));
        if (c.tUrl !== null && c.tVisible === null && el && el !== c.oldEl && !document.body.contains(c.oldEl)) {
          const animating = [...(m || document).querySelectorAll('[style*="opacity"]')].some((e) => parseFloat(getComputedStyle(e).opacity) < 0.95);
          if (cumulativeOpacity(el) >= 0.95 && !animating) c.tVisible = now - c.t0;
        }
        if (c.tVisible !== null && c.tSettled === null && !document.querySelector(`${mainSelector} ${spinnerSelector}`)) c.tSettled = now - c.t0;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
    read() {
      const c = window.__velocity.cur;
      const gaps = c.frames.slice(1).map((t, i) => t - c.frames[i]);
      return {
        label: c.label, path: location.pathname,
        url: c.tUrl, visible: c.tVisible, settled: c.tSettled,
        maxGap: gaps.length ? Math.max(...gaps) : 0,
        drops: gaps.filter((g) => g > 33.5).length,
        blank: c.blank, swaps: c.swaps, flicker: c.flicker,
        cls: window.__shifts.reduce((a, b) => a + b.v, 0),
        longMax: window.__long.length ? Math.max(...window.__long.map((l) => l.d)) : 0,
        scrollMax: c.scrollMax,
      };
    },
  };
};
