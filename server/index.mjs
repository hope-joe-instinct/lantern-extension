import http from 'node:http';
import { rankWithJev } from './ranking.mjs';
const PORT = Number(process.env.PORT || 8787), MAX_BODY = 350_000;
function json(res, status, body, origin='') {
  res.writeHead(status, { 'content-type':'application/json', 'access-control-allow-origin':origin, 'access-control-allow-headers':'content-type', 'access-control-allow-methods':'POST,OPTIONS', 'vary':'Origin' });
  res.end(JSON.stringify(body));
}
function allowedOrigin(origin) {
  const exact = process.env.ALLOWED_ORIGIN;
  if (exact) return origin === exact ? origin : '';
  return origin?.startsWith('chrome-extension://') ? origin : '';
}
const server = http.createServer((req,res) => {
  const origin = allowedOrigin(String(req.headers.origin || ''));
  if (req.method === 'OPTIONS') return origin ? json(res,204,{},origin) : json(res,403,{ error:'Origin not allowed' });
  if (req.method !== 'POST' || req.url !== '/api/rank') return json(res,404,{ error:'Not found' },origin);
  if (!origin) return json(res,403,{ error:'Origin not allowed' });
  let raw=''; req.on('data', chunk => { raw += chunk; if (raw.length > MAX_BODY) req.destroy(); });
  req.on('end', async () => {
    try {
      const input=JSON.parse(raw), query=String(input.query || '').trim();
      if (!query || query.length > 500) return json(res,400,{ error:'Query must be 1-500 characters' },origin);
      if (!process.env.TYPESAFE_API_KEY) return json(res,503,{ error:'Lantern proxy is missing TYPESAFE_API_KEY' },origin);
      json(res,200,await rankWithJev({ query, passages:input.passages, apiKey:process.env.TYPESAFE_API_KEY }),origin);
    } catch (error) { json(res,502,{ error:error.message || 'Ranking failed' },origin); }
  });
});
server.listen(PORT,'127.0.0.1',() => console.log(`Lantern proxy listening on http://127.0.0.1:${PORT}`));
