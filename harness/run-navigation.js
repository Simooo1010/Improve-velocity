#!/usr/bin/env node
// Section-change speed + fluidity test.
//
//   node harness/run-navigation.js <config.js> [--throttle 1|2|4] [--max-ms 200] [--max-drops 1]
//
// For every section reachable from `navSelector` it clicks twice (first visit after prefetch,
// then warm), measures each change with lib/probe.js, and exits non-zero if the speed limit,
// the fluidity rules or "no console errors" are broken. Requires Playwright (`npm i -D playwright`).

const path = require('path');
const { chromium } = require('playwright');
const installProbe = require('./lib/probe');

const args = process.argv.slice(2);
const cfgPath = path.resolve(args.find((a) => !a.startsWith('--')) || 'velocity.config.js');
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? Number(args[i + 1]) : def; };
const cfg = require(cfgPath);
const THROTTLE = opt('throttle', 1);
const MAX_MS = opt('max-ms', cfg.maxMs ?? 200);
const MAX_DROPS = opt('max-drops', cfg.maxDrops ?? 1);
const MAX_GAP = cfg.maxGapMs ?? 50;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: cfg.viewport ?? { width: 390, height: 844 }, isMobile: (cfg.viewport?.width ?? 390) < 600 });
  if (cfg.setup) await cfg.setup(ctx);
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 200)));
  if (THROTTLE > 1) await (await ctx.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });

  await page.goto(cfg.baseUrl + (cfg.startPath ?? '/'), { waitUntil: 'networkidle' });
  const probeArgs = { mainSelector: cfg.mainSelector ?? 'main', spinnerSelector: cfg.spinnerSelector ?? '.animate-spin', sectionRootSelector: cfg.sectionRootSelector ?? null };
  await page.evaluate(installProbe, probeArgs);
  await page.waitForTimeout(cfg.warmupMs ?? 1500); // let prefetches and data contexts settle

  const nav = page.locator(cfg.navSelector);
  const count = await nav.count();
  const results = [];
  const measure = async (label, action) => {
    await page.evaluate((l) => window.__velocity.start(l), label);
    await action();
    await page.waitForFunction(() => { const c = window.__velocity.cur; return c && c.tSettled !== null; }, null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(320); // keep sampling after settle
    results.push(await page.evaluate(() => window.__velocity.read()));
  };

  for (const round of [1, 2]) {
    for (let i = 0; i < count; i++) await measure(`round ${round} · nav #${i}`, () => nav.nth(i).click());
  }
  for (const extra of cfg.extraTransitions ?? []) {
    if (extra.before) await extra.before(page);
    await measure(extra.label, () => extra.action(page));
  }

  const real = results.filter((r) => r.url !== null); // a click on the current section changes nothing
  let failed = false;
  for (const r of real) {
    const why = [
      !(r.visible <= MAX_MS) && `visible ${Math.round(r.visible)} ms > ${MAX_MS}`,
      r.drops > MAX_DROPS && `${r.drops} dropped frames`,
      r.maxGap > MAX_GAP && `frame gap ${Math.round(r.maxGap)} ms`,
      r.blank > 0 && `${r.blank} blank frames`,
      r.swaps > 1 && `root swapped ${r.swaps}x`,
      r.flicker > 0 && `opacity flicker x${r.flicker}`,
      r.cls > 0.001 && `layout shift ${r.cls.toFixed(3)}`,
      r.longMax > 50 && `long task ${Math.round(r.longMax)} ms`,
      r.scrollMax > 1 && `scrolled ${Math.round(r.scrollMax)} px`,
    ].filter(Boolean);
    if (why.length) failed = true;
    console.log(`${why.length ? 'FAIL' : 'ok  '} ${r.label.padEnd(24)} ${r.path.padEnd(28)} url=${Math.round(r.url)}ms visible=${Math.round(r.visible)}ms gap=${Math.round(r.maxGap)}ms drops=${r.drops} blank=${r.blank}${why.length ? '  <- ' + why.join('; ') : ''}`);
  }
  const worst = Math.max(0, ...real.map((r) => r.visible ?? Infinity));
  console.log(`\nthrottle ${THROTTLE}x · changes measured: ${real.length} · worst visible: ${Math.round(worst)} ms (limit ${MAX_MS}) · console errors: ${errors.length}`);
  if (errors.length) console.log(errors.slice(0, 3));
  await browser.close();
  process.exit(failed || errors.length ? 1 : 0);
})();
