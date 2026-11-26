/* NANCYFLIX score/fixture bridge: private key, cache, date windows and quota cooldown. */
const HOST = 'https://v3.football.api-sports.io';
const ENDPOINTS = new Set(['status', 'timezone', 'countries', 'leagues', 'teams', 'fixtures', 'fixtures/events', 'fixtures/statistics', 'fixtures/lineups', 'fixtures/players', 'standings']);
const PARAMS = ['id', 'fixture', 'league', 'season', 'team', 'date', 'from', 'to', 'live', 'round', 'status', 'timezone', 'venue', 'country', 'name', 'search', 'type', 'current', 'page'];
const cache = new Map(), pending = new Map();
let quotaUntil = 0;

function quotaText(data) { return /daily|request.*limit|limit.*request|quota|too many/i.test(JSON.stringify((data && data.errors) || {})); }
function planText(data) {
  const s = JSON.stringify((data && data.errors) || {});
  return /plan|subscription|not have access|upgrade|paid/i.test(s);
}

function ymd(d) { return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'); }
function dayInZone(offset, zone) {
  const now = new Date(Date.now() + offset * 864e5);
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
      .reduce((a, p) => (a[p.type] = p.value, a), {});
    return parts.year + '-' + parts.month + '-' + parts.day;
  } catch (e) { return ymd(now); }
}

async function upstream(target, key, ttl) {
  const hit = cache.get(target); if (hit && hit.until > Date.now()) return hit;
  if (pending.has(target)) return pending.get(target);
  const job = (async () => {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 12000);
    try {
      const r = await fetch(target, { headers: { 'x-apisports-key': key, Accept: 'application/json' }, signal: ctl.signal });
      let j; try { j = await r.json(); } catch (e) { throw Error('invalid_data'); }
      if (!j || typeof j !== 'object') throw Error('invalid_data');
      j._configured = true; j._status = r.status;
      const daily = r.headers.get('x-ratelimit-requests-remaining');
      const perMinute = r.headers.get('x-ratelimit-remaining');
      if (daily !== null && Number.isFinite(Number(daily))) j._remaining = Number(daily);
      if (perMinute !== null && Number.isFinite(Number(perMinute))) j._minuteRemaining = Number(perMinute);
      const quota = r.status === 429 || quotaText(j);
      if (quota) {
        const seconds = Number(r.headers.get('retry-after'));
        const wait = Number.isFinite(seconds) && seconds > 0 ? Math.min(3600, seconds) : 3600;
        quotaUntil = Date.now() + wait * 1000; j._quota = true; j._remaining = 0; j._retryAfter = wait;
      }
      if (planText(j) && !quota) { j._plan = true; j.response = []; }
      const result = { data: j, status: quota ? 429 : r.ok ? 200 : 502, until: Date.now() + (quota ? 60000 : ttl) };
      if (result.status === 200 || quota) { cache.set(target, result); if (cache.size > 160) cache.delete(cache.keys().next().value); }
      return result;
    } finally { clearTimeout(timer); }
  })();
  pending.set(target, job);
  try { return await job; } finally { pending.delete(target); }
}

function friendlyPlan(ep) {
  return 'The score provider plan does not allow this ' + (ep === 'fixtures' ? 'fixture filter' : 'request') + '. NANCYFLIX switched to the free schedule feed.';
}

module.exports = async function (req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).json({ configured: true, error: 'Use GET' });
  const key = process.env.API_FOOTBALL_KEY || process.env.APIFOOTBALL_KEY || '';
  if (!key) return res.status(503).json({ configured: false, response: [], error: 'Live scores are not configured on the server.' });

  let url; try { url = new URL(req.url, 'https://nancyflix.invalid'); } catch (e) { return res.status(400).json({ error: 'Invalid request' }); }
  const ep = String(url.searchParams.get('ep') || 'status').replace(/^\/+|\/+$/g, '');
  if (!ENDPOINTS.has(ep)) return res.status(400).json({ error: 'Endpoint not allowed' });

  if (quotaUntil > Date.now()) {
    const wait = Math.ceil((quotaUntil - Date.now()) / 1000);
    res.setHeader('Cache-Control', 'public,s-maxage=60'); res.setHeader('Retry-After', String(wait));
    return res.status(429).json({ _configured: true, _quota: true, _remaining: 0, _retryAfter: wait, _fallback: 'football-alt', response: [], error: 'Live-score quota is exhausted. The free schedule is still available.' });
  }

  const qs = new URLSearchParams();
  for (const k of PARAMS) { const v = url.searchParams.get(k); if (v) qs.set(k, v.slice(0, 80)); }
  if (ep === 'fixtures' && qs.has('live')) qs.set('live', 'all');

  /* Plan-safe windows: next/last are paid-only, so they become dated requests. */
  let days = 0;
  const wantsNext = url.searchParams.has('next');
  if (ep === 'fixtures' && (wantsNext || url.searchParams.has('last'))) {
    days = Math.max(2, Math.min(4, Math.ceil((Number(url.searchParams.get('next')) || 20) / 8)));
    days = 3;
  }
  if (ep === 'fixtures' && url.searchParams.get('dates')) days = Math.max(1, Math.min(5, Number(url.searchParams.get('dates')) || 3));
  const zone = qs.get('timezone') || 'Africa/Nairobi';
  qs.delete('date');

  try {
    if (days > 0) {
      const targets = [];
      for (let i = 0; i < days; i++) {
        const q = new URLSearchParams(qs);
        q.set('date', dayInZone(i, zone));
        q.sort();
        targets.push(HOST + '/' + ep + '?' + q.toString());
      }
      const results = [];
      let quota = null, plan = null, remaining = null;
      for (const t of targets) {
        const r = await upstream(t, key, 240000);
        if (r.data && r.data._remaining != null) remaining = r.data._remaining;
        if (r.data && r.data._quota) { quota = r.data; break; }
        if (r.data && r.data._plan) { plan = r.data; continue; }
        if (Array.isArray(r.data.response)) results.push(...r.data.response);
      }
      const seen = new Set();
      const merged = results.filter((f) => {
        const id = f && f.fixture && f.fixture.id;
        if (!id) return true;
        if (seen.has(id)) return false;
        seen.add(id); return true;
      }).sort((a, b) => String((a.fixture && a.fixture.date) || '').localeCompare(String((b.fixture && b.fixture.date) || '')));

      if (quota) {
        res.setHeader('Cache-Control', 'public,s-maxage=60'); res.setHeader('Retry-After', String(quota._retryAfter || 3600));
        return res.status(429).json({ _configured: true, _quota: true, _remaining: 0, _retryAfter: quota._retryAfter || 3600, _fallback: 'football-alt', response: merged, error: 'Live-score quota is exhausted. Showing what was already loaded plus the free schedule.' });
      }
      res.setHeader('Cache-Control', 'public,s-maxage=180,stale-while-revalidate=60');
      if (req.method === 'HEAD') return res.end();
      return res.json({
        _configured: true, _window: days, _remaining: remaining, response: merged,
        _plan: plan ? true : undefined,
        _fallback: (plan || !merged.length) ? 'football-alt' : undefined,
        error: plan ? friendlyPlan('fixtures') : undefined
      });
    }

    qs.sort();
    const query = qs.toString();
    const target = HOST + '/' + ep + (query ? '?' + query : '');
    const seconds = ep === 'fixtures' && qs.has('live') ? 120 : ep.startsWith('fixtures/') ? 300 : 600;
    const result = await upstream(target, key, seconds * 1000);
    if (result.data._plan) {
      res.setHeader('Cache-Control', 'public,s-maxage=120');
      if (req.method === 'HEAD') return res.end();
      return res.json({ _configured: true, _plan: true, _fallback: 'football-alt', _remaining: result.data._remaining, response: [], error: friendlyPlan(ep) });
    }
    res.setHeader('Cache-Control', result.status === 200 ? 'public,s-maxage=' + seconds + ',stale-while-revalidate=30' : result.status === 429 ? 'public,s-maxage=60' : 'no-store');
    if (result.data._quota) res.setHeader('Retry-After', String(result.data._retryAfter || 3600));
    res.status(result.status);
    if (req.method === 'HEAD') return res.end();
    return res.json(result.data);
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(504).json({ configured: true, response: [], error: e.name === 'AbortError' ? 'The live-score feed timed out.' : 'The live-score feed is unavailable.' });
  }
};
