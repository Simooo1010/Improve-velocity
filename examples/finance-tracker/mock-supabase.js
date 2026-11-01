// Mock Supabase (auth + PostgREST) with configurable latency, for E2E timing tests.
const http = require('http');
const LAT = Number(process.env.MOCK_LATENCY || 100);
const EMAIL = process.env.MOCK_EMAIL || 'test@example.com';
const UID = '11111111-1111-1111-1111-111111111111';

const user = { id: UID, aud: 'authenticated', role: 'authenticated', email: EMAIL, app_metadata: {}, user_metadata: {}, created_at: '2025-01-01T00:00:00Z' };
const now = Date.now();
const day = 86400000;
const tx = [];
let id = 1;
const add = (title, amount, type, daysAgo) =>
  tx.push({ id: String(id++).padStart(8, '0') + '-0000-0000-0000-000000000000', user_id: UID, title, amount, type, created_at: new Date(now - daysAgo * day - (id % 7) * 3600000).toISOString() });
const names = ['Spesa supermercato', 'Caffè', 'Benzina', 'Affitto', 'Cena fuori', 'Abbonamento musica', 'Farmacia', 'Treno', 'Libri', 'Cinema'];
for (let d = 0; d < 90; d++) {
  add(`${names[d % names.length]} [generale]`, 5 + ((d * 7) % 60) + 0.5, 'expense', d);
  if (d % 9 === 0) add(`Stipendio [generale]`, 1500 + d, 'income', d);
  if (d % 11 === 0) add(`Risparmio [risparmi]`, 100 + d, 'income', d);
  if (d % 13 === 0) add(`Volo [viaggi]`, 120 + d, 'expense', d);
}
add('[DEBT:{"type":"to_me","person":"Marco","desc":"Cena","status":"active"}] [generale]', 150, 'income', 3);
add('[DEBT:{"type":"by_me","person":"Giulia","desc":"Biglietti","status":"active"}] [generale]', 60, 'expense', 5);
add('Trasferimento [generale-transfer]', 200, 'expense', 8);
add('Trasferimento [risparmi-transfer]', 200, 'income', 8);
const wallets = ['generale|Generale|0', 'risparmi|Risparmi|1', 'viaggi|Viaggi|2'].map((s, i) => {
  const [slug, name, position] = s.split('|');
  return { id: 'w' + i, user_id: UID, slug, name, description: null, position: Number(position), created_at: '2025-01-01T00:00:00Z' };
});

const tables = { transactions: tx, wallets, action_logs: [], ai_analysis: [], chat_sessions: [], chat_messages: [], user_ai_memory: [], oauth_clients: [], oauth_codes: [], oauth_tokens: [] };
let reqCount = 0;
const log = [];

http.createServer((req, res) => {
  const origin = req.headers.origin || '*';
  const cors = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': req.headers['access-control-request-headers'] || '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    'Access-Control-Expose-Headers': 'Content-Range,Content-Profile',
  };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/__count') { res.writeHead(200, cors); return res.end(JSON.stringify({ reqCount, log: log.splice(0) })); }
  reqCount++;
  log.push(req.method + ' ' + url.pathname);
  let body = '';
  req.on('data', c => (body += c));
  req.on('end', () => setTimeout(() => {
    const send = (code, obj) => { res.writeHead(code, { ...cors, 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    if (url.pathname === '/auth/v1/user') return send(200, user);
    if (url.pathname === '/auth/v1/token') return send(200, { access_token: 'x.y.z', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r', user });
    if (url.pathname.includes('jwks')) return send(200, { keys: [] });
    const m = url.pathname.match(/^\/rest\/v1\/([a-z_]+)/);
    if (m) {
      const rows = tables[m[1]] || [];
      const wantsObject = (req.headers.accept || '').includes('vnd.pgrst.object');
      if (req.method === 'GET') return send(200, wantsObject ? rows[0] || null : rows);
      let parsed = []; try { parsed = JSON.parse(body || '[]'); } catch {}
      parsed = Array.isArray(parsed) ? parsed : [parsed];
      return send(req.method === 'POST' ? 201 : 200, wantsObject ? parsed[0] : parsed);
    }
    send(200, {});
  }, LAT));
}).listen(54321, () => console.log('mock supabase on 54321, latency', LAT, 'ms, user', EMAIL));
