// Copy this file to your project (e.g. `velocity.config.js`) and fill it in.
// Every key is explained. Nothing here is specific to a framework: if you can describe how to
// open your app, which elements switch sections, and which element is replaced when a
// section changes, the harness can measure it.

module.exports = {
  // --- how to reach the app ------------------------------------------------------------------
  // Always test a PRODUCTION build (never the dev server: it is 5 to 20x slower and lies).
  baseUrl: 'http://localhost:3000',
  startPath: '/',            // the page to load first (a page that has the section navigation)

  // --- how to be "logged in" (any mechanism) ------------------------------------------------
  // Called once per browser context. Set cookies, localStorage, headers... whatever your app
  // needs. Return nothing. For apps without login, delete this function.
  async setup(ctx) {
    // await ctx.addCookies([{ name: 'session', value: '...', domain: 'localhost', path: '/' }]);
    // await ctx.addInitScript(() => localStorage.setItem('token', '...'));
  },

  // --- how sections change -------------------------------------------------------------------
  // A selector matching EVERY control that switches section (tabs, bottom nav, sidebar links).
  // It must match only VISIBLE controls for the viewport under test: a hidden desktop sidebar
  // that matches too will make clicks time out. Prefer a specific class over a bare `nav a`.
  navSelector: 'nav a',

  // The element that holds the section content...
  mainSelector: 'main',
  // ...and, if the heuristic (main > wrapper > page root) does not fit your layout, a selector
  // for the element that is REPLACED when the section changes.
  sectionRootSelector: null,
  // Anything matching this inside main counts as "still loading".
  spinnerSelector: '[aria-busy="true"], .spinner, .animate-spin',

  // --- limits ----------------------------------------------------------------------------------
  maxMs: 200,        // section fully visible within this many ms of the click
  maxDrops: 1,       // skipped frames tolerated per change (0 = strict)
  maxGapMs: 50,      // no single frame gap longer than this (the long-task threshold)

  // --- optional --------------------------------------------------------------------------------
  viewport: { width: 390, height: 844 },       // phone first; run again with a desktop viewport
  warmupMs: 1500,                              // time to let prefetch and data loading settle
  extraTransitions: [
    // Changes that are not in the nav, e.g. a header button that opens a detail page:
    // { label: 'home -> detail', action: (page) => page.locator('button[title="Detail"]').click() },
  ],

  // --- visual sweep (run-visual.js) ---------------------------------------------------------
  routes: ['/'],                                // every page to screenshot and contrast-scan
  themes: [{ name: 'default' }],                // add { name: 'dark' }, { name: 'light' } ...
  // Per theme setup: the second argument is the theme object from above.
  // async setup(ctx, theme) { await ctx.addInitScript((t) => localStorage.setItem('theme', t), theme.name); },
  interactions: [
    // Open a sheet/modal and scan it too:
    // { label: 'add-sheet', route: '/', action: (page) => page.locator('button:has-text("Add")').click() },
  ],
  outDir: 'velocity-shots',
};
