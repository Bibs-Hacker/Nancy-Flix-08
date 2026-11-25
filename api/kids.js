/* NANCYFLIX Kids catalogue.
 * Lists freely available animation from the Internet Archive public collections.
 * Playback uses the archive.org embed player, so no video is stored or re-streamed here.
 */
const CACHE = new Map();
const TTL = 3 * 3600 * 1000;
const CATS = {
  cartoons: '(collection:animationandcartoons OR collection:more_animation)',
  classics: 'collection:classic_cartoons',
  stories: '(collection:animationandcartoons OR collection:more_animation) AND (subject:"children\'s films" OR subject:"fairy tales" OR subject:"nursery rhymes")',
  learn: '(collection:animationandcartoons OR collection:more_animation) AND (subject:education OR subject:science OR subject:"animated films")'
};

function json(res, status, body, maxAge) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=' + (maxAge || 1800) + ', stale-while-revalidate=120');
  res.end(JSON.stringify(body));
}

function safeId(v) {
  const s = String(v || '');
  return /^[A-Za-z0-9._-]{1,80}$/.test(s) ? s : '';
}

module.exports = async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { ok: false, error: 'Use GET' });

  let url;
  try { url = new URL(req.url, 'https://nancyflix.invalid'); } catch (e) { return json(res, 400, { ok: false, error: 'Invalid request' }); }
  const cat = String(url.searchParams.get('cat') || 'cartoons').toLowerCase();
  const base = CATS[cat] || CATS.cartoons;
  const page = Math.min(20, Math.max(1, Number(url.searchParams.get('page')) || 1));
  const search = String(url.searchParams.get('q') || '').replace(/["\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);

  let query = base + ' AND mediatype:movies';
  if (search) {
    const tokens = search.split(' ').filter(Boolean).map((t) => 'title:(' + t + ')').join(' AND ');
    if (tokens) query += ' AND ' + tokens;
  }

  const key = cat + '|' + page + '|' + search.toLowerCase();
  const hit = CACHE.get(key);
  if (hit && hit.until > Date.now()) {
    res.setHeader('X-NF-Cache', 'hit');
    return json(res, 200, hit.data);
  }

  const params = [
    ['q', query], ['fl[]', 'identifier'], ['fl[]', 'title'], ['fl[]', 'year'], ['fl[]', 'description'],
    ['sort[]', 'downloads desc'], ['rows', '24'], ['page', String(page)], ['output', 'json']
  ];
  const target = 'https://archive.org/advancedsearch.php?' + params.map((p) => p[0] + '=' + encodeURIComponent(p[1])).join('&');

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 12000);
  try {
    const r = await fetch(target, { headers: { Accept: 'application/json' }, signal: ctl.signal });
    if (!r.ok) throw new Error('upstream');
    const j = await r.json();
    const docs = (j && j.response && j.response.docs) || [];
    const items = docs.map((d) => {
      const id = safeId(d.identifier);
      if (!id) return null;
      const raw = Array.isArray(d.description) ? d.description[0] : d.description;
      const desc = String(raw || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150);
      return {
        id,
        title: String(d.title || id).replace(/\s+/g, ' ').trim().slice(0, 90),
        year: Number(d.year) && Number(d.year) > 1900 && Number(d.year) < 2100 ? Number(d.year) : null,
        desc,
        thumb: 'https://archive.org/services/img/' + encodeURIComponent(id),
        embed: 'https://archive.org/embed/' + encodeURIComponent(id),
        page: 'https://archive.org/details/' + encodeURIComponent(id)
      };
    }).filter(Boolean);

    const data = {
      ok: true,
      cat,
      page,
      total: (j && j.response && j.response.numFound) || items.length,
      hasMore: Boolean(j && j.response && j.response.numFound > page * 24),
      items
    };
    CACHE.set(key, { data, until: Date.now() + TTL });
    if (CACHE.size > 60) CACHE.delete(CACHE.keys().next().value);
    return json(res, 200, data, 3600);
  } catch (e) {
    return json(res, 503, {
      ok: false,
      error: e.name === 'AbortError' ? 'The kids catalogue took too long to answer.' : 'The kids catalogue is unavailable right now.',
      items: []
    }, 120);
  } finally {
    clearTimeout(timer);
  }
};
