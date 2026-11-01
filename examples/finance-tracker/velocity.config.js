// Worked example: the personal finance tracker (Next.js 16 App Router, Supabase auth, Tailwind).
// Run it from the repo root after starting the app and the mock backend (see README.md).
//
//   node harness/run-navigation.js examples/finance-tracker/velocity.config.js
//   node harness/run-visual.js     examples/finance-tracker/velocity.config.js
//   node harness/profile.js        examples/finance-tracker/velocity.config.js --nav 1 --throttle 4

const EMAIL = process.env.MOCK_EMAIL || 'test@example.com';
const UID = '11111111-1111-1111-1111-111111111111';
const b64url = (s) => Buffer.from(s).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// @supabase/ssr keeps the session in a cookie named sb-<first label of the project hostname>-auth-token,
// value "base64-" + base64url(JSON session). With the mock on localhost the name is sb-localhost-auth-token.
const jwt = b64url('{"alg":"HS256","typ":"JWT"}') + '.' + b64url(JSON.stringify({ sub: UID, email: EMAIL, role: 'authenticated', aud: 'authenticated', exp: 4102444800 })) + '.sig';
const session = { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r', user: { id: UID, email: EMAIL, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2025-01-01T00:00:00Z' } };

module.exports = {
  baseUrl: 'http://localhost:3111',
  startPath: '/dashboard',

  async setup(ctx, theme) {
    await ctx.addCookies([{ name: 'sb-localhost-auth-token', value: 'base64-' + b64url(JSON.stringify(session)), domain: 'localhost', path: '/' }]);
    if (theme && theme.name !== 'default') await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch {} }, theme.name);
  },

  // Bottom pill nav on phones. A bare `nav button` would also match the hidden desktop sidebar.
  navSelector: 'nav.pill-nav button',
  mainSelector: 'main',
  spinnerSelector: '.animate-spin',

  maxMs: 200,
  maxDrops: 1,

  extraTransitions: [
    { label: 'home -> log', before: async (page) => { await page.locator('nav.pill-nav button').first().click(); await page.waitForTimeout(800); }, action: (page) => page.locator('button[title="Registro Attività"]').click() },
  ],

  routes: ['/dashboard', '/dashboard/wallets', '/dashboard/transactions', '/dashboard/debts', '/dashboard/analytics', '/dashboard/activity', '/dashboard/ai-chat', '/dashboard/log'],
  themes: [{ name: 'dark' }, { name: 'light' }],
  interactions: [
    { label: 'add-sheet', route: '/dashboard', action: (page) => page.locator('button:has-text("Entrata")').first().click() },
  ],
  outDir: 'velocity-shots',
};
