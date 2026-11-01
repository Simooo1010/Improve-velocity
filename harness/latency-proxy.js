#!/usr/bin/env node
// Reverse proxy that adds a fixed delay to every request, so tests run with a REALISTIC network
// round trip instead of localhost's ~0 ms. Without it, anything that "only" makes a network call
// looks free in the harness and you miss the real culprit (e.g. an auth check on every navigation).
//
//   node harness/latency-proxy.js --listen 54321 --target https://staging.example.com --delay 100
//
// Point the app's API base URL at http://localhost:54321. Works with a real staging backend or
// with a mock. Adds permissive CORS headers so the browser app can call it from another port.
// Staging only: never put production credentials or data through a test harness.

const http = require('http');
const https = require('https');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const listen = Number(opt('listen', 54321));
const target = new URL(opt('target', 'http://localhost:3001'));
const delay = Number(opt('delay', 100));
const lib = target.protocol === 'https:' ? https : http;

http.createServer((req, res) => {
  const cors = {
    'Access-Control-Allow-Origin': req.headers.origin || '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': req.headers['access-control-request-headers'] || '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => setTimeout(() => {
    const up = lib.request({ protocol: target.protocol, hostname: target.hostname, port: target.port || undefined, path: req.url, method: req.method, headers: { ...req.headers, host: target.host } }, (r) => {
      res.writeHead(r.statusCode || 502, { ...r.headers, ...cors });
      r.pipe(res);
    });
    up.on('error', (e) => { res.writeHead(502, cors); res.end(String(e)); });
    up.end(Buffer.concat(chunks));
  }, delay));
}).listen(listen, () => console.log(`latency proxy :${listen} -> ${target.origin} (+${delay} ms per request)`));
