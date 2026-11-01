#!/usr/bin/env node
// CPU profile of ONE section change. Use it when a section is still slow and you do not know why.
//
//   node harness/profile.js <config.js> [--nav 1] [--throttle 4]
//
// Reading the output:
//   (program)  native browser work: style recalculation, layout, paint, compositing.
//              Big => the DOM is too large/complex, or paint effects are expensive
//              (blur/backdrop-filter, large shadows, many layers). Fix by rendering less.
//   (idle)     the browser had nothing to do (good).
//   named JS   your code and libraries. Big => compute too much on mount (memoise, defer, page).
// NOTE: headless Chrome without a GPU paints in software, so "(program)" is inflated compared
// with a real phone. Use it to compare before/after, not as an absolute number.

const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const cfg = require(path.resolve(args.find((a) => !a.startsWith('--')) || 'velocity.config.js'));
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? Number(args[i + 1]) : d; };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: cfg.viewport ?? { width: 390, height: 844 }, isMobile: true });
  if (cfg.setup) await cfg.setup(ctx);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.goto(cfg.baseUrl + (cfg.startPath ?? '/'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(cfg.warmupMs ?? 1500);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: opt('throttle', 4) });
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  await cdp.send('Profiler.start');
  await page.locator(cfg.navSelector).nth(opt('nav', 1)).click();
  await page.waitForTimeout(900);
  const { profile } = await cdp.send('Profiler.stop');
  const nodes = Object.fromEntries(profile.nodes.map((n) => [n.id, n]));
  const self = {};
  profile.samples.forEach((id, i) => {
    const f = nodes[id].callFrame;
    const key = `${f.functionName || '(anonymous)'}  ${f.url.split('/').pop().slice(0, 28)}:${f.lineNumber}`;
    self[key] = (self[key] || 0) + profile.timeDeltas[i] / 1000;
  });
  const total = Object.values(self).reduce((a, b) => a + b, 0);
  console.log(`sampled ${Math.round(total)} ms (CPU throttle ${opt('throttle', 4)}x)`);
  Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([k, v]) => console.log(String(Math.round(v)).padStart(6), 'ms', k));
  await browser.close();
})();
