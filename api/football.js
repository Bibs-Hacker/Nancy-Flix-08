/* NANCYFLIX · API-Football bridge (v3)
   ------------------------------------------------------------------
   Keeps the API key on the server. The browser only ever calls
   /api/football?ep=fixtures&live=all

   Env var (set it in your host dashboard, never in the HTML):
     API_FOOTBALL_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
   Optional: APIFOOTBALL_KEY is accepted as a fallback name.
------------------------------------------------------------------ */

const HOST = 'https://v3.football.api-sports.io';

/* only endpoints NANCYFLIX actually uses */
const ENDPOINTS = new Set([
  'status',
  'timezone',
  'countries',
  'leagues',
  'teams',
  'fixtures',
  'fixtures/events',
  'fixtures/statistics',
  'fixtures/lineups',
  'fixtures/players',
  'standings'
]);

/* query keys that may be forwarded upstream */
const PARAMS = [
  'id', 'fixture', 'league', 'season', 'team', 'date', 'from', 'to',
  'live', 'next', 'last', 'round', 'status', 'timezone', 'venue',
  'country', 'name', 'search', 'type', 'current', 'page'
];

module.exports = async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, OPTIONS');
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    return res.json({ configured: true, error: 'Use GET' });
  }

  const key = process.env.API_FOOTBALL_KEY || process.env.APIFOOTBALL_KEY || '';
  if (!key) {
    res.statusCode = 503;
    return res.json({
      configured: false,
      error: 'API_FOOTBALL_KEY is not set on the server',
      hint: 'Add API_FOOTBALL_KEY in your host environment variables, then redeploy.'
    });
  }

  let url;
  try {
    url = new URL(req.url, 'http://localhost');
  } catch (e) {
    res.statusCode = 400;
    return res.json({ configured: true, error: 'Bad request URL' });
  }

  const ep = String(url.searchParams.get('ep') || 'status').replace(/^\/+/, '').replace(/\/+$/, '');
  if (!ENDPOINTS.has(ep)) {
    res.statusCode = 400;
    return res.json({ configured: true, error: 'Endpoint not allowed: ' + ep });
  }

  const qs = new URLSearchParams();
  PARAMS.forEach(function (k) {
    const v = url.searchParams.get(k);
    if (v !== null && v !== '') qs.set(k, v.slice(0, 80));
  });
  if (ep === 'fixtures' && qs.has('live') && qs.get('live') !== 'all') qs.set('live', 'all');

  const target = HOST + '/' + ep + (qs.toString() ? '?' + qs.toString() : '');
  const ctl = new AbortController();
  const timer = setTimeout(function () { ctl.abort(); }, 12000);

  try {
    const upstream = await fetch(target, {
      headers: { 'x-apisports-key': key, 'Accept': 'application/json' },
      signal: ctl.signal,
      cache: 'no-store'
    });
    clearTimeout(timer);

    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { data = { response: [], errors: { parse: 'Upstream did not return JSON' } }; }
    if (data && typeof data === 'object') {
      data._configured = true;
      const left = upstream.headers.get('x-ratelimit-requests-remaining');
      if (left !== null) data._remaining = Number(left);
      data._status = upstream.status;
    }

    /* keep the free plan safe: a short shared cache, no long-term storage */
    res.setHeader('Cache-Control', 'public, s-maxage=25, stale-while-revalidate=45');
    res.statusCode = upstream.ok ? 200 : (upstream.status === 429 ? 429 : 502);
    return res.json(data);
  } catch (err) {
    clearTimeout(timer);
    res.statusCode = 504;
    return res.json({
      configured: true,
      response: [],
      error: err && err.name === 'AbortError' ? 'The football feed timed out' : 'Could not reach the football feed'
    });
  }
};
