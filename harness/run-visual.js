#!/usr/bin/env node
// Visual + accessibility sweep: for every theme x viewport x route it takes a screenshot and
// scans every visible text element for WCAG contrast (4.5:1, or 3:1 for large text).
// Use it whenever an optimisation touches colours, fonts, animation start states or themes,
// and always when you ADD a theme.
//
//   node harness/run-visual.js <config.js>
//
// Config keys used: baseUrl, setup(ctx, theme), themes[{name, apply?}], viewports[{name,width,height}],
// routes[], interactions[{label, route, action(page)}] (e.g. open a sheet before scanning), outDir.

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const cfg = require(path.resolve(process.argv[2] || 'velocity.config.js'));
const themes = cfg.themes ?? [{ name: 'default' }];
const viewports = cfg.viewports ?? [{ name: 'phone', width: 390, height: 844 }, { name: 'desktop', width: 1280, height: 800 }];
const outDir = path.resolve(cfg.outDir ?? 'velocity-shots');
fs.mkdirSync(outDir, { recursive: true });

// Runs inside the page. Returns text elements below the contrast threshold.
const scan = () => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  // the canvas converts ANY css colour (rgb, oklab, color-mix results...) to sRGB for us
  const rgba = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const over = (f, b) => [f[0] * f[3] + b[0] * (1 - f[3]), f[1] * f[3] + b[1] * (1 - f[3]), f[2] * f[3] + b[2] * (1 - f[3]), 1];
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const page = rgba(getComputedStyle(document.body).backgroundColor);
  const base = page[3] ? page : [255, 255, 255, 1];
  const bgOf = (el) => {
    const layers = [];
    for (let n = el; n; n = n.parentElement) { const c = rgba(getComputedStyle(n).backgroundColor); if (c[3] > 0) layers.push(c); if (c[3] >= 1) break; }
    let b = layers.length && layers[layers.length - 1][3] >= 1 ? layers.pop() : base;
    while (layers.length) b = over(layers.pop(), b);
    return b;
  };
  const opacityOf = (el) => { let o = 1; for (let n = el; n && n !== document.documentElement; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity); return o; };
  const out = [];
  const check = (el, color, label) => {
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') return;
    const op = opacityOf(el); if (op < 0.5) return; // mid-animation or hidden
    const bg = bgOf(el); const fg0 = rgba(color); fg0[3] *= op;
    const size = parseFloat(cs.fontSize); const weight = parseInt(cs.fontWeight) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5; const cr = ratio(over(fg0, bg), bg);
    if (cr < need) out.push({ cr: Math.round(cr * 100) / 100, need, text: label.slice(0, 40), cls: (el.className && String(el.className).slice(0, 60)) || el.tagName, size });
  };
  document.querySelectorAll('body *').forEach((el) => {
    if (el.closest('svg') && el.tagName !== 'text') return;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
    if (own.length && !['SCRIPT', 'STYLE'].includes(el.tagName)) check(el, getComputedStyle(el).color, own.map((n) => n.textContent.trim()).join(' '));
    if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.placeholder) check(el, getComputedStyle(el, '::placeholder').color, 'placeholder: ' + el.placeholder);
  });
  const seen = new Set();
  return out.filter((o) => { const k = o.text + o.cls; if (seen.has(k)) return false; seen.add(k); return true; }).sort((a, b) => a.cr - b.cr);
};

(async () => {
  const browser = await chromium.launch();
  let total = 0, combos = 0; const errors = [];
  for (const theme of themes) {
    for (const vp of viewports) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.width < 600 });
      if (cfg.setup) await cfg.setup(ctx, theme);
      const page = await ctx.newPage();
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
      page.on('pageerror', (e) => errors.push('pageerror ' + String(e).slice(0, 160)));
      const visit = async (label, route, action) => {
        await page.goto(cfg.baseUrl + route, { waitUntil: 'networkidle' });
        await page.waitForTimeout(cfg.settleMs ?? 500);
        if (action) { await action(page); await page.waitForTimeout(500); }
        const off = await page.evaluate(scan); combos++; total += off.length;
        await page.screenshot({ path: path.join(outDir, `${theme.name}-${vp.name}-${label.replace(/\W+/g, '_')}.png`) });
        if (off.length) { console.log(`CONTRAST ${theme.name}/${vp.name}/${label}: ${off.length}`); off.slice(0, 6).forEach((o) => console.log(`   ${o.cr}:1 (need ${o.need}) ${o.size}px "${o.text}" [${o.cls}]`)); }
      };
      for (const r of cfg.routes ?? ['/']) await visit(r === '/' ? 'home' : r, r);
      for (const i of cfg.interactions ?? []) await visit(i.label, i.route, i.action);
      await ctx.close();
    }
  }
  console.log(`\ncontrast scan: ${total} elements below threshold across ${combos} theme/viewport/route combinations · console errors: ${errors.length}`);
  if (errors.length) console.log(errors.slice(0, 3));
  await browser.close();
  process.exit(total || errors.length ? 1 : 0);
})();
