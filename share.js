/* NANCYFLIX match share page.
 * Serves a tiny HTML document with per-match Open Graph tags so WhatsApp,
 * Telegram, X and Facebook can render the match title and poster image,
 * then sends real visitors into the app.
 */
const store = require('../lib/share-card.js');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function clean(v, max) {
  return String(v == null ? '' : v).replace(/[<>\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max || 90);
}
function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function kickoff(raw) {
  const d = raw ? new Date(raw) : null;
  if (!d || isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi', weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(d).reduce((a, p) => (a[p.type] = p.value, a), {});
  return (parts.weekday || '') + ' ' + (parts.day || '') + ' ' + (parts.month || '') + ', ' + (parts.hour || '') + ':' + (parts.minute || '') + ' EAT';
}
function baseUrl(req) {
  const env = String(process.env.APP_URL || '').trim().replace(/\/+$/, '');
  if (/^https?:\/\//i.test(env)) return env;
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return host ? proto + '://' + host : '';
}

/* Poster bytes for a stored card, or a redirect to the bundled default card.
   Kept inside this file so the deployment stays within the free function limit. */
async function sendImage(req, res, rawId) {
  const id = /^[A-Za-z0-9_-]{6,32}$/.test(String(rawId || '')) ? String(rawId) : '';
  const fallback = () => {
    res.statusCode = 302;
    res.setHeader('Location', '/og-share.jpg');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.end();
  };
  if (!id) return fallback();

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
  return fallback();
}

module.exports = async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.end('Use GET');
  }

  let q;
  try { q = new URL(req.url, 'https://nancyflix.invalid').searchParams; } catch (e) { q = new URLSearchParams(); }
  if (q.get('img') === '1') return sendImage(req, res, q.get('id'));
  const id = /^[A-Za-z0-9_-]{6,32}$/.test(q.get('id') || '') ? q.get('id') : '';
  const home = clean(q.get('h'), 60) || 'Football match';
  const away = clean(q.get('a'), 60) || '';
  const league = clean(q.get('lg'), 60);
  const venue = clean(q.get('v'), 70);
  const when = kickoff(q.get('d'));
  const title = (away ? home + ' vs ' + away : home) + (league ? ' \u00b7 ' + league : '') + ' \u00b7 NANCYFLIX';
  const bits = [when, venue, 'Live scores, schedule and stream options on NANCYFLIX.'].filter(Boolean);
  const description = bits.join(' \u00b7 ');
  const base = baseUrl(req);
  const card = id && store._cards.get(id) ? store._cards.get(id) : null;
  const image = card ? base + '/api/share?img=1&id=' + encodeURIComponent(id) + '&v=1' : base + '/og-share.jpg';
  const pageUrl = base + (id ? '/s/' + id : '/s') + (req.url.includes('?') && !id ? '?' + String(req.url).split('?')[1] : '');

  const target = new URLSearchParams();
  target.set('invite', '1');
  ['match', 'league', 'h', 'a', 'd', 'v'].forEach((k) => { const v = q.get(k); if (v) target.set(k, clean(v, 120)); });
  const appLink = '/?' + target.toString();

  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + esc(title) + '</title>' +
    '<meta name="description" content="' + esc(description) + '">' +
    '<link rel="canonical" href="' + esc(pageUrl) + '">' +
    '<meta property="og:type" content="website">' +
    '<meta property="og:site_name" content="NANCYFLIX">' +
    '<meta property="og:title" content="' + esc(title) + '">' +
    '<meta property="og:description" content="' + esc(description) + '">' +
    '<meta property="og:url" content="' + esc(pageUrl) + '">' +
    '<meta property="og:image" content="' + esc(image) + '">' +
    '<meta property="og:image:secure_url" content="' + esc(image) + '">' +
    '<meta property="og:image:type" content="image/jpeg">' +
    '<meta property="og:image:width" content="1080"><meta property="og:image:height" content="1080">' +
    '<meta property="og:image:alt" content="' + esc(home + (away ? ' vs ' + away : '') + ' match poster') + '">' +
    '<meta name="twitter:card" content="summary_large_image">' +
    '<meta name="twitter:title" content="' + esc(title) + '">' +
    '<meta name="twitter:description" content="' + esc(description) + '">' +
    '<meta name="twitter:image" content="' + esc(image) + '">' +
    '<meta name="theme-color" content="#06060a">' +
    '<style>html,body{margin:0;height:100%;background:#06060a;color:#f2f2f7;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}' +
    'main{max-width:460px;margin:0 auto;padding:28px 20px;text-align:center}img{width:100%;max-width:420px;border-radius:18px;display:block;margin:0 auto 18px;background:#14141c}' +
    'h1{font-size:22px;line-height:1.25;margin:0 0 8px}p{color:#b9b9c8;font-size:14px;line-height:1.5;margin:0 0 18px}' +
    'a.btn{display:inline-block;background:#e11d2e;color:#fff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:12px}' +
    'small{display:block;color:#7d7d90;margin-top:14px;font-size:11.5px}</style></head><body><main>' +
    '<img src="' + esc(image) + '" alt="' + esc(home + (away ? ' vs ' + away : '')) + ' poster" width="1080" height="1080">' +
    '<h1>' + esc(home + (away ? ' vs ' + away : '')) + '</h1>' +
    '<p>' + esc(description) + '</p>' +
    '<a class="btn" href="' + esc(appLink) + '">Open in NANCYFLIX</a>' +
    '<small>Shared from NANCYFLIX by Dev Brian + Dev Nancy. NANCYFLIX links to official broadcasters and never re-streams rights-protected matches.</small>' +
    '</main><script>setTimeout(function(){location.replace(' + JSON.stringify(appLink) + ');},900);</script></body></html>';

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
  res.setHeader('Content-Length', Buffer.byteLength(html));
  if (req.method === 'HEAD') return res.end();
  return res.end(html);
};
