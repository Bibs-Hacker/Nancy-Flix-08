/* NANCYFLIX share card store.
 * Accepts a small JPEG/PNG poster from the app, stores it (Supabase Storage when
 * configured, otherwise short-lived memory) and returns a share id.
 * The image is never re-encoded or resized here; only the type and size are verified.
 */
const crypto = require('crypto');
const MAX_BYTES = 1_600_000;
const TTL = 7 * 24 * 3600 * 1000;
const cards = new Map();
const hits = new Map();

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function baseUrl(req) {
  const env = String(process.env.APP_URL || '').trim().replace(/\/+$/, '');
  if (/^https?:\/\//i.test(env)) return env;
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return host ? proto + '://' + host : '';
}

function sniff(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  return null;
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return null; } }
  return await new Promise((resolve) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > 3_000_000) { resolve(null); req.destroy(); return; } chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (e) { resolve(null); } });
    req.on('error', () => resolve(null));
  });
}

async function toStorage(id, buf, type) {
  const url = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return false;
  const bucket = 'share-cards';
  const headers = { Authorization: 'Bearer ' + key, apikey: key };
  try {
    await fetch(url + '/storage/v1/bucket', {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bucket, name: bucket, public: false, file_size_limit: MAX_BYTES })
    }).catch(() => {});
    const ext = type === 'image/png' ? 'png' : 'jpg';
    const up = await fetch(url + '/storage/v1/object/' + bucket + '/' + id + '.' + ext, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': type, 'x-upsert': 'true', 'Cache-Control': 'max-age=604800' },
      body: buf
    });
    return up.ok;
  } catch (e) { return false; }
}

module.exports = async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Use POST' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'local';
  const now = Date.now();
  const bucket = hits.get(ip) || { n: 0, reset: now + 3600e3 };
  if (now > bucket.reset) { bucket.n = 0; bucket.reset = now + 3600e3; }
  if (bucket.n >= 40) return json(res, 429, { ok: false, error: 'Too many preview cards from this device. Try again later.' });

  const body = await readBody(req);
  if (!body || typeof body.data !== 'string') return json(res, 400, { ok: false, error: 'Send an image as data' });
  const comma = body.data.indexOf(',');
  const b64 = comma >= 0 ? body.data.slice(comma + 1) : body.data;
  if (!/^[A-Za-z0-9+/=\s]+$/.test(b64.slice(0, 200))) return json(res, 400, { ok: false, error: 'Image data is not base64' });

  let buf;
  try { buf = Buffer.from(b64, 'base64'); } catch (e) { return json(res, 400, { ok: false, error: 'Image data could not be read' }); }
  if (buf.length < 2000) return json(res, 400, { ok: false, error: 'Image is too small' });
  if (buf.length > MAX_BYTES) return json(res, 413, { ok: false, error: 'Image is larger than 1.6 MB' });
  const type = sniff(buf);
  if (!type) return json(res, 415, { ok: false, error: 'Only JPEG or PNG images are accepted' });

  const id = crypto.randomBytes(9).toString('base64url');
  cards.set(id, { buf, type, at: now });
  bucket.n += 1; hits.set(ip, bucket);
  if (cards.size > 240) {
    const oldest = [...cards.entries()].filter(([, v]) => now - v.at > TTL || cards.size > 240).sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) cards.delete(oldest[0]);
  }

  const stored = await toStorage(id, buf, type);
  const base = baseUrl(req);
  return json(res, 200, {
    ok: true, id, stored,
    image: '/api/share?img=1&id=' + id,
    url: (base || '') + '/s/' + id
  });
};

module.exports._cards = cards;
