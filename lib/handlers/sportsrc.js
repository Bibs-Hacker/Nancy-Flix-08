const football=require('../football-state');
/* NANCYFLIX - SportSRC V3 fallback bridge (server only).
 *
 *   GET /api/sportsrc?action=account
 *   GET /api/sportsrc?action=matches&status=inprogress|notstarted&date=YYYY-MM-DD
 *   GET /api/sportsrc?action=scores&date=YYYY-MM-DD
 *   GET /api/sportsrc?action=detail&id=<match id>
 *   GET /api/sportsrc?action=stream&id=<match id>
 *
 * The key lives ONLY in the host environment (SPORTSRC_KEY) and is never
 * returned to the browser. Upstream JSON is normalised here so the client
 * never depends on undocumented field names. No stream is proxied or
 * re-hosted: embedUrl values are passed through untouched for the existing
 * NANCYFLIX player to mount.
 */
const BASE = 'https://api.sportsrc.org/v3/';
const TIMEOUT = 9000;
const TTL = { account: 300000, matches: 60000, scores: 60000, detail: 45000, stream: 45000, sports: 600000 };
const cache = new Map();
const pending = new Map();
const ACTIONS = new Set(['account','matches','detail','stream']); // Free-access routes only.
const ID = /^[A-Za-z0-9._-]{1,160}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function keyOf(action, params) { return action + '?' + [...params.entries()].sort().map(p => p.join('=')).join('&'); }

function upstreamURL(action, params) {
  const u = new URL(BASE);
  u.searchParams.set('type', action === 'matches' || action === 'scores' ? action : action);
  if (action === 'matches') u.searchParams.set('sport', 'football');
  for (const [k, v] of params) if (k !== 'action' && v) u.searchParams.set(k, v);
  return u.toString();
}

function httpsOnly(raw, base) {
  try {
    const u = new URL(String(raw || ''), base || undefined);
    if (u.protocol !== 'https:' || u.username || u.password) return '';
    return u.toString();
  } catch (e) { return ''; }
}

function kickoff(n){const v=Number(n);if(n==null||n===''||!Number.isFinite(v)||v<=0)return null;const d=new Date(v*1000);return isNaN(d.getTime())?null:d.toISOString();}
function clean(s, max) { return String(s == null ? '' : s).replace(/[<>&]/g, '').trim().slice(0, max || 160); }

/* matches/scores: {data:[{league:{...},matches:[...]}]} - flatten, keep flags. */
function flatten(body) {
  const leagues = Array.isArray(body && body.data) ? body.data : [];
  const out = [];
  for (const group of leagues) {
    if (!group || typeof group !== 'object') continue;
    const lg = group.league || {};
    const list = Array.isArray(group.matches) ? group.matches : [];
    for (const m of list) {
      if (!m || typeof m !== 'object' || !m.id) continue;
      const teams = m.teams || {};
      out.push({
        id: clean(m.id, 160),
        title: clean(m.title || ((teams.home && teams.home.name) || '') + ' vs ' + ((teams.away && teams.away.name) || ''), 120),
        league: clean(m.league_name || lg.name || 'Football', 80),
        country: clean(m.country || lg.country || '', 60),
        kickoff: kickoff(m.timestamp),
        timestamp: kickoff(m.timestamp) ? Number(m.timestamp) : null,
        status: clean(m.status, 24),
        statusDetail: clean(m.status_detail || m.status_display || m.timer || '', 32),
        isLive: m.is_live === true || String(m.status) === 'inprogress',
        hasStream: m.has_stream !== false,
        score: m.score ? {
          home: m.score.home == null ? null : Number(m.score.home),
          away: m.score.away == null ? null : Number(m.score.away)
        } : null,
        home: clean(teams.home && teams.home.name, 60),
        away: clean(teams.away && teams.away.name, 60)
      });
    }
  }
  return out;
}

function sourcesOf(body) {
  const d = (body && body.data) || {};
  const raw = Array.isArray(d.sources) ? d.sources : Array.isArray(body && body.sources) ? body.sources : [];
  const out = [];
  const seen = new Set();
  for (const s of raw) {
    if (!s || typeof s !== 'object') continue;
    const url = httpsOnly(s.embedUrl || s.embed_url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ source: clean(s.source || s.source_name || 'source', 40), embedUrl: url, hd: s.hd === true });
  }
  return out;
}

async function call(action, params, key) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const r = await fetch(upstreamURL(action, params), {
      headers: { 'X-API-KEY': key, Accept: 'application/json' },
      signal: ctl.signal
    });
    let body = null;
    try { body = await r.json(); } catch (e) { body = null; }
    return { status: r.status, headers: r.headers, body };
  } finally { clearTimeout(timer); }
}

module.exports = async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET') { res.status(405).json({ ok: false, error: 'Use GET' }); return; }

  let params;
  try { params = new URL(req.url || '/', 'https://nancyflix.invalid').searchParams; }
  catch (e) { res.status(400).json({ ok: false, error: 'Invalid request' }); return; }

  const action = String(params.get('action') || '').toLowerCase();
  if (!ACTIONS.has(action)) {
    res.status(400).json({ ok: false, error: 'Unknown action. Use account, matches, detail or stream.' });
    return;
  }

  const key = String(process.env.SPORTSRC_KEY || '').trim();
  if (!key) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(503).json({ ok: false, configured: false, error: 'SportSRC is not configured on this deployment (SPORTSRC_KEY is missing in the host environment).' });
    return;
  }

  const id = String(params.get('id') || '').trim();
  if (['detail', 'stream'].includes(action) && !ID.test(id)) {
    res.status(400).json({ ok: false, configured: true, error: 'A valid match id is required.' });
    return;
  }
  const date = String(params.get('date') || '').trim();
  if (date && (!DAY.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)) {
    res.status(400).json({ ok: false, configured: true, error: 'Date must use YYYY-MM-DD.' });
    return;
  }
  const status = String(params.get('status') || '').trim().toLowerCase();
  const keep = new URLSearchParams();
  if (id) keep.set('id', id);
  if (date) keep.set('date', date);
  if (status) keep.set('status', status);

  if(status&&!['inprogress','notstarted','finished','scheduled','live','ended'].includes(status)){res.status(400).json({ok:false,error:'Unsupported match status.'});return;}
  const zone=params.get('timezone');if(zone&&zone!=='Africa/Nairobi'){res.status(400).json({ok:false,error:'Only Africa/Nairobi timezone is supported.'});return;}if(zone)keep.set('timezone',zone);
  const keyId = keyOf(action, keep);
  const hit = cache.get(keyId);
  if (hit && hit.until > Date.now()) {
    res.setHeader('Cache-Control', 'private, max-age=30');
    res.status(200).json(Object.assign({}, hit.payload, { cached: true }));
    return;
  }
  if (pending.has(keyId)) {
    const shared = await pending.get(keyId);
    res.setHeader('Cache-Control','no-store');res.status(shared.ok?200:shared.upstream==='rate_limited'?429:shared.upstream==='unauthorised'?502:503).json(Object.assign({}, shared, { cached: true }));
    return;
  }

  const job = (async () => {
    let out;
    try {
      if(action==='matches'&&keep.get('timezone')==='Africa/Nairobi'&&keep.get('date')){
        const start=Date.parse(keep.get('date')+'T00:00:00+03:00');
        const dates=[new Date(start).toISOString().slice(0,10),new Date(start+24*3600000-1).toISOString().slice(0,10)];
        const results=await Promise.all([...new Set(dates)].map(utcDay=>{const p=new URLSearchParams(keep);p.delete('timezone');p.set('date',utcDay);return call(action,p,key);}));
        out=results.find(r=>r.status!==200||r.body?.success===false)||{...results.at(-1),body:{success:true,data:results.flatMap(r=>Array.isArray(r.body?.data)?r.body.data:[])}};
      }else{const p=new URLSearchParams(keep);p.delete('timezone');out=await call(action,p,key);}
    }
    catch (e) {
      const timeout = e && (e.name === 'AbortError' || e.name === 'TimeoutError');
      return { ok: false, configured: true, upstream: timeout ? 'timeout' : 'network', error: timeout ? 'SportSRC did not answer in time. Try again shortly.' : 'SportSRC could not be reached.' };
    }
    const quota = {
      limit: out.headers.get('x-ratelimit-limit'),
      remaining: out.headers.get('x-ratelimit-remaining'),
      plan: out.headers.get('x-plan')
    };
    if (out.status === 401 || out.status === 403) {
      return { ok: false, configured: true, upstream: 'unauthorised', error: 'SportSRC rejected the API key. Check SPORTSRC_KEY in the host environment.', quota };
    }
    if (out.status === 429) {
      return { ok: false, configured: true, upstream: 'rate_limited', error: 'SportSRC daily limit reached. The existing providers are still available.', quota };
    }
    if (!out.body || typeof out.body !== 'object') {
      return { ok: false, configured: true, upstream: 'invalid_json', error: 'SportSRC returned an unreadable response.' };
    }
    if (out.status >= 500) {
      return { ok: false, configured: true, upstream: 'server_error', error: 'SportSRC is temporarily unavailable.', quota };
    }
    if(out.status>=400){return {ok:false,configured:true,upstream:'rejected',error:'SportSRC rejected this request.',quota};}
    if (out.body.success === false) {
      return { ok: false, configured: true, upstream: 'rejected', error: clean(out.body.message || 'SportSRC rejected this request.', 200), quota };
    }
    if (action === 'matches' || action === 'scores') {
      let matches=flatten(out.body);const seen=new Set();matches=matches.filter(m=>{if(seen.has(m.id))return false;seen.add(m.id);return true;});if(keep.get('timezone')==='Africa/Nairobi'&&keep.get('date'))matches=matches.filter(m=>m.timestamp&&football.date(m.timestamp*1000)===keep.get('date'));if(keep.get('status'))matches=football.filter(matches,keep.get('status'));matches=matches.map(m=>({...m,normalizedStatus:football.state(m),timezone:'Africa/Nairobi'}));
      return {
        ok: true, configured: true, action, matches,
        total: matches.length,
        live: matches.filter(m => m.isLive).length,
        withStream: matches.filter(m => m.hasStream).length,
        quota
      };
    }
    if (action === 'detail' || action === 'stream') {
      const sources = sourcesOf(out.body);
      return {
        ok: true, configured: true, action,
        sources,
        playable: sources.length > 0, playbackVerified: false,
        match: action === 'detail' ? {
          id,
          venue: clean(((out.body.data || {}).venue || {}).name || '', 90),
          referee: clean(((out.body.data || {}).referee || {}).name || (out.body.data || {}).referee || '', 90)
        } : null,
        quota
      };
    }
    if (action === 'account') {
      const d = out.body.data || {};
      return {
        ok: true, configured: true, action,
        plan: clean(d.plan || d.plan_name || '', 40),
        used: d.used == null ? null : Number(d.used),
        limit: d.limit == null ? null : Number(d.limit),
        remaining: d.remaining == null ? null : Number(d.remaining),
        reset: clean(d.reset || d.resets || '', 60),
        quota
      };
    }
    return { ok: true, configured: true, action, data: out.body.data == null ? null : out.body.data };
  })();

  pending.set(keyId, job);
  let payload;
  try { payload = await job; }
  finally { pending.delete(keyId); }

  if (payload.ok) {
    cache.set(keyId, { payload, until: Date.now() + (TTL[action] || 60000) });
    if (cache.size > 240) cache.delete(cache.keys().next().value);
    res.setHeader('Cache-Control', 'private, max-age=30');
    res.status(200).json(payload);
    return;
  }
  res.setHeader('Cache-Control', 'no-store');
  res.status(payload.upstream === 'unauthorised' ? 502 : payload.upstream === 'rate_limited' ? 429 : 503).json(payload);
};
