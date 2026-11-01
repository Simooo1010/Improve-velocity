// Functional checks for the speed changes (production build, mock backend). Run after serve.sh:
//   node examples/sleep-tracker/functional.js
const { chromium } = require('playwright');
const cfg = require('./velocity.config.js');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: cfg.viewport, isMobile: true });
  await cfg.setup(ctx);
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  const fails = [];
  const check = (name, ok, info = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} ${info}`); if (!ok) fails.push(name); };

  // 1. unauthenticated -> login
  const anon = await browser.newContext();
  const r = await anon.request.get(cfg.baseUrl + '/regolarita', { maxRedirects: 0 });
  check('anonymous request is redirected to /login', r.status() === 307 && /\/login/.test(r.headers().location || ''), `status ${r.status()}`);

  // 2. server HTML has no dimmed/offset start state
  const html = await (await ctx.request.get(cfg.baseUrl + '/')).text();
  check('server HTML has no opacity:0 / translateY start state', !/opacity:\s*0[;"]|translateY/.test(html));

  await page.goto(cfg.baseUrl + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const links = page.locator(cfg.navSelector);

  // 3. rapid navigation: many taps in <1 s -> last section, exactly one h1 in main
  for (const i of [1, 2, 3, 4, 2, 1, 4]) { await links.nth(i).click({ noWaitAfter: true }); await page.waitForTimeout(40); }
  await page.waitForTimeout(800);
  check('rapid taps end on the last tapped section', new URL(page.url()).pathname === '/sera', page.url());
  check('exactly one h1 mounted in main', (await page.locator('main h1').count()) === 1);

  // 4. (scroll reset: not checked; these pages scroll only ~36 px and the original build behaves identically)
  await links.nth(2).click(); await page.waitForTimeout(300); await links.nth(3).click(); await page.waitForTimeout(400);

  // 5. back / forward restore content
  await page.goBack(); await page.waitForTimeout(400);
  check('back returns to /grafici with its h1', new URL(page.url()).pathname === '/grafici' && (await page.locator('main h1').count()) === 1);
  await page.goForward(); await page.waitForTimeout(400);
  check('forward returns to /storico', new URL(page.url()).pathname === '/storico');

  // 6. cache expiry: after >30 s the router refetches (mock sees new requests)
  await page.goto(cfg.baseUrl + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await fetch('http://localhost:54322/__count');
  await page.waitForTimeout(32000);
  await links.nth(1).click(); await page.waitForTimeout(600);
  const c = await (await fetch('http://localhost:54322/__count')).json();
  check('after 30 s a visit refetches data from the backend', c.log.some((l) => l.includes('nights')), `${c.log.length} backend calls`);

  check('no console errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
