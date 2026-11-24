const {authenticate,isAdmin}=require('./lib/security');
/**
 * NANCYFLIX — welcome email endpoint (Vercel / Netlify function).
 * POST { email, name } -> { sent: true } or { sent: false, error }
 *
 * Env (server only, never in index.html):
 *   RESEND_API_KEY   re_xxxxxxxx
 *   WELCOME_FROM     NANCYFLIX <hello@yourdomain.com>   (must be a verified sender)
 *   APP_URL          https://your-nancyflix-site
 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization'
};
module.exports = async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ sent: false, error: 'Method not allowed' });
  const actor=await authenticate(req);
  if(!actor)return res.status(401).json({sent:false,error:'Verified email sign-in required'});
  if(!isAdmin(actor))return res.status(403).json({sent:false,error:'Admin-only email tool'});
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  const email = String(body.email || '').trim().toLowerCase();
  const name = String(body.name || 'there').slice(0, 80);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ sent: false, error: 'A valid email is required' });
  const key = process.env.RESEND_API_KEY;
  const from = process.env.WELCOME_FROM;
  if (!key || !from) return res.status(503).json({ sent: false, error: 'RESEND_API_KEY / WELCOME_FROM are not set on the server' });
  const app = (process.env.APP_URL || '').replace(/\/$/, '');
  const html = '<div style="font-family:Inter,Arial,sans-serif;background:#06060a;color:#f5f5fa;padding:32px">' +
    '<h1 style="font-size:24px;margin:0 0 8px">Welcome to NANCYFLIX, ' + name.replace(/[<>&]/g, '') + '</h1>' +
    '<p style="color:#b9b9c8;line-height:1.6">Your account is ready. Build a watchlist, follow Kenyan live channels, open football fixtures and league tables, and save posters to your phone.</p>' +
    '<p style="color:#b9b9c8;line-height:1.6">Free plan: 10 poster downloads, 3-trailer queue and all themes and match posters. Upgrade any time from the Premium tab.</p>' +
    (app ? '<p><a href="' + app + '" style="display:inline-block;background:#e11d2e;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700">Open NANCYFLIX</a></p>' : '') +
    '<p style="color:#6f6f80;font-size:12px;margin-top:24px">You received this because an account was created with this address. Films and matches are never downloaded or re-streamed.</p></div>';
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [email], subject: 'Welcome to NANCYFLIX', html })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(502).json({ sent: false, error: (j && j.message) || 'Email provider refused the message' });
    return res.status(200).json({ sent: true, id: j.id || null });
  } catch (e) {
    return res.status(502).json({ sent: false, error: 'Could not reach the email provider' });
  }
};
