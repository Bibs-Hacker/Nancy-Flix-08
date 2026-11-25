/* NANCYFLIX share image proxy: streams a stored poster, or the bundled default card. */
const store = require('./share-card.js');

function fallback(req, res) {
  res.statusCode = 302;
  res.setHeader('Location', '/og-share.jpg');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.end();
}

module.exports = async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; return res.end(); }
  let id = '';
  try { id = new URL(req.url, 'https://nancyflix.invalid').searchParams.get('id') || ''; } catch (e) {}
  if (!/^[A-Za-z0-9_-]{6,32}$/.test(id)) return fallback(req, res);

  const hit = store._cards.get(id);
  if (hit && Date.now() - hit.at < 7 * 24 * 3600e3) {
    res.statusCode = 200;
    res.setHeader('Content-Type', hit.type);
    res.setHeader('Content-Length', hit.buf.length);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Robots-Tag', 'noindex');
    if (req.method === 'HEAD') return res.end();
    return res.end(hit.buf);
  }

  const url = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (url && key) {
    for (const ext of ['jpg', 'png']) {
      try {
        const r = await fetch(url + '/storage/v1/object/share-cards/' + id + '.' + ext, {
          headers: { Authorization: 'Bearer ' + key, apikey: key }
        });
        if (r.ok) {
          const buf = Buffer.from(await r.arrayBuffer());
          if (buf.length > 2000) {
            res.statusCode = 200;
            res.setHeader('Content-Type', ext === 'png' ? 'image/png' : 'image/jpeg');
            res.setHeader('Content-Length', buf.length);
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            res.setHeader('X-Robots-Tag', 'noindex');
            if (req.method === 'HEAD') return res.end();
            return res.end(buf);
          }
        }
      } catch (e) { /* try the next extension */ }
    }
  }
  return fallback(req, res);
};
