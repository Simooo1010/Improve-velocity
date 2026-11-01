// Worked example: Sleep Tracker (Next.js 16 App Router, password login with a signed cookie, Supabase REST).
// Start with serve.sh (production build + mock with latency), then:
//   node harness/run-navigation.js examples/sleep-tracker/velocity.config.js --throttle 1
//   VELOCITY_VIEWPORT=desktop node harness/run-navigation.js examples/sleep-tracker/velocity.config.js
const crypto = require('crypto');
const PASSWORD = 'harness-password-not-a-secret'; // test value, same one serve.sh gives the app
const hmac = (key, msg) => crypto.createHmac('sha256', key).update(msg).digest('hex');
// Same scheme as app/src/lib/auth.ts: cookie "v1.<expiry ms>.<hmac>", key = HMAC(password, label).
const expiry = Date.now() + 7 * 86400000;
const cookie = `v1.${expiry}.` + hmac(hmac(PASSWORD, 'sleep-tracker/session-key/v1'), `v1.${expiry}`);
const desktop = process.env.VELOCITY_VIEWPORT === 'desktop';

module.exports = {
  baseUrl: 'http://localhost:3112',
  startPath: '/',
  async setup(ctx) {
    await ctx.addCookies([{ name: 'st_session', value: cookie, domain: 'localhost', path: '/' }]);
  },
  // Phone: floating pill. Desktop (>= 60rem): sidebar. Match only the visible one.
  navSelector: desktop ? 'nav.side a' : 'nav.navpill a',
  mainSelector: 'main',
  // Pages are fragments (no wrapper): each page's own <h1> is the element replaced on a section change.
  sectionRootSelector: 'main h1',
  spinnerSelector: '[aria-busy="true"]',
  maxMs: 200,
  maxDrops: 1,
  viewport: desktop ? { width: 1280, height: 800 } : { width: 390, height: 844 },
  routes: ['/', '/regolarita', '/grafici', '/storico', '/sera', '/segnali', '/impostazioni'],
  themes: [{ name: 'default' }],
  outDir: 'velocity-shots',
};
