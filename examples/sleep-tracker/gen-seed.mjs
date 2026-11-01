// Builds seed.json (PostgREST rows) from the app's own deterministic demo seed, anchored to "now",
// and stretched to ~190 nights so the charts page reads a realistic volume.
// Usage: APP_DIR=/path/to/app node --import ./register.mjs gen-seed.mjs > seed.json
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const app = process.env.APP_DIR;
const imp = (p) => import(pathToFileURL(path.join(app, 'src', p)).href);
const { buildDemoSeed, demoNightExceptions } = await imp('server/seed.ts');
const { nightToRow, eveningCheckToRow, napToRow } = await imp('server/repo-supabase.ts');

const nowIso = new Date().toISOString();
const seed = buildDemoSeed(nowIso);
const DAY = 86400000;
const shiftIso = (iso, n) => (iso ? new Date(Date.parse(iso) - n * DAY).toISOString() : iso);
const shiftDate = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') - n * DAY).toISOString().slice(0, 10);

const nights = [], checks = [], naps = [];
for (const k of [0, 1, 2]) { // 0 = as seeded, 1..2 = older copies (60 and 120 days back)
  const n = k * 60;
  for (const x of seed.nights) nights.push(nightToRow({ ...x, nightDate: shiftDate(x.nightDate, n), bedAt: { ...x.bedAt, value: shiftIso(x.bedAt.value, n) }, wakeAt: { ...x.wakeAt, value: shiftIso(x.wakeAt.value, n) } }, nowIso));
  for (const c of seed.checks ?? []) checks.push(eveningCheckToRow({ ...c, date: shiftDate(c.date, n) }, nowIso));
  for (const p of seed.naps ?? []) naps.push(napToRow({ ...p, date: shiftDate(p.date, n), startAt: shiftIso(p.startAt, n) }));
}
const events = seed.events.map((e, i) => ({ id: i + 1, idempotency_key: e.idempotencyKey, type: e.type, ts: e.ts, source: e.source }));
const ex = demoNightExceptions(seed.nights);
const night_exceptions = Object.entries(ex).flatMap(([night_date, slugs]) => slugs.map((slug) => ({ night_date, slug })));
const exception_types = [['malattia', 'Malattia', 3], ['viaggio', 'Viaggio', 5], ['festa', 'Festa', 2]].map(([slug, label, uses]) => ({ slug, label, uses }));
process.stdout.write(JSON.stringify({ nights, evening_checks: checks, naps, events, night_exceptions, exception_types, questions_log: [], settings: [{ key: 'target_sleep_minutes', value: 450 }], api_tokens: [] }));
