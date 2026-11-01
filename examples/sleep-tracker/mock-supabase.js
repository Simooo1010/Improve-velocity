// Mock Supabase PostgREST for the sleep tracker, with configurable latency (MOCK_LATENCY, default 100 ms).
// Supports what the app's repo uses: select (whole rows), gte/lte/eq/neq filters, order, maybeSingle/single.
// Writes are accepted and echoed (no persistence). Data: seed.json (see gen-seed.mjs).
const http = require('http');
const LAT = Number(process.env.MOCK_LATENCY || 100);
const T = require('./seed.json');
let reqCount = 0;
const log = [];

function applyFilters(rows, params) {
  let out = rows;
  for (const [k, v] of params) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(k)) continue;
    const m = /^(gte|lte|gt|lt|eq|neq)\.(.*)$/.exec(v);
    if (!m) continue;
    const [, op, val] = m;
    out = out.filter((r) => {
      const a = r[k]; if (a === null || a === undefined) return false;
      const isNum = typeof a === 'number', x = isNum ? Number(val) : String(a), y = isNum ? Number(val) : val;
      const cmp = isNum ? x - y : (String(a) < val ? -1 : String(a) > val ? 1 : 0);
      return { gte: cmp >= 0, lte: cmp <= 0, gt: cmp > 0, lt: cmp < 0, eq: cmp === 0, neq: cmp !== 0 }[op];
    });
  }
  const order = params.get('order');
  if (order) {
    const [col, dir] = order.split('.');
    out = [...out].sort((p, q) => (p[col] < q[col] ? -1 : p[col] > q[col] ? 1 : 0) * (dir === 'desc' ? -1 : 1));
  }
  return out;
}

http.createServer((req, res) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/__count') { res.writeHead(200, cors); return res.end(JSON.stringify({ reqCount, log: log.splice(0) })); }
  reqCount++;
  let body = ''; req.on('data', (c) => (body += c));
  req.on('end', () => setTimeout(() => {
    const send = (code, obj) => { res.writeHead(code, { ...cors, 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    const m = url.pathname.match(/^\/rest\/v1\/([a-z_]+)/);
    if (!m) return send(200, {});
    log.push(req.method + ' ' + m[1] + url.search.slice(0, 60));
    const rows = applyFilters(T[m[1]] || [], url.searchParams);
    const wantsObject = (req.headers.accept || '').includes('vnd.pgrst.object');
    if (req.method === 'GET') return send(200, wantsObject ? rows[0] || null : rows);
    let parsed = []; try { parsed = JSON.parse(body || '[]'); } catch {}
    parsed = Array.isArray(parsed) ? parsed : [parsed];
    send(req.method === 'POST' ? 201 : 200, wantsObject ? parsed[0] : parsed);
  }, LAT));
}).listen(54322, () => console.log('mock supabase (sleep) on 54322, latency', LAT, 'ms'));
