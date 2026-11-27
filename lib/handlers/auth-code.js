/* NANCYFLIX 6-digit sign-in code.
 *
 *   POST /api/auth-code  { action: 'send',   email }
 *   POST /api/auth-code  { action: 'verify', email, code }
 *
 * A code is generated here, stored hashed in Firestore with a 10 minute
 * expiry and a hard attempt limit, emailed through Resend, and exchanged for
 * a Firebase custom token once it matches. Without the environment variables
 * below the route answers 501 and the app falls back to Firebase email links.
 *
 * Required on the host: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL,
 * FIREBASE_PRIVATE_KEY, RESEND_API_KEY, WELCOME_FROM (optional sender).
 */
const crypto = require('crypto');
const admin = require('firebase-admin');

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 45 * 1000;
const MAX_ATTEMPTS = 6;

function adminApp() {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || '';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || '';
    const privateKey = String(process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    if (!projectId || !clientEmail || !privateKey) {
      const err = new Error('Firebase admin is not configured on this deployment.');
      err.code = 'not_configured';
      throw err;
    }
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || undefined
    });
  }
  return admin.app();
}

function cleanEmail(v) {
  const e = String(v || '').trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) ? e : '';
}
function codeId(email) {
  return crypto.createHash('sha256').update('nancyflix-code|' + email).digest('hex').slice(0, 40);
}
function hashCode(email, code) {
  const pepper = String(process.env.FIREBASE_PRIVATE_KEY || '').slice(-24);
  return crypto.createHmac('sha256', pepper).update(email + '|' + code).digest('hex');
}
function randomCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}
function html(code) {
  return '<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;padding:26px 22px;background:#0b0b12;color:#f2f2f7;border-radius:16px">' +
    '<h2 style="margin:0 0 6px;font-size:20px">Your NANCYFLIX sign-in code</h2>' +
    '<p style="color:#b9b9c8;font-size:13px;line-height:1.5;margin:0 0 16px">Type this in the app. It expires in 10 minutes and can only be used once.</p>' +
    '<p style="font-size:34px;letter-spacing:9px;font-weight:800;margin:0 0 16px">' + code + '</p>' +
    '<p style="color:#7d7d90;font-size:11.5px;line-height:1.5;margin:0">If you did not ask for this, you can ignore the email. NANCYFLIX by Dev Brian + Dev Nancy.</p>' +
    '</div>';
}

async function sendMail(to, code) {
  const key = process.env.RESEND_API_KEY || '';
  if (!key) {
    const err = new Error('Email sending is not configured (missing RESEND_API_KEY).');
    err.code = 'no_mail';
    throw err;
  }
  const from = process.env.WELCOME_FROM || 'NANCYFLIX <onboarding@resend.dev>';
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject: 'Your NANCYFLIX sign-in code', html: html(code) })
  });
  if (!r.ok) {
    let detail = '';
    try { detail = (await r.json()).message || ''; } catch (e) {}
    const err = new Error('The email provider refused the message' + (detail ? ': ' + detail : '.'));
    err.code = 'mail_failed';
    throw err;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const fail = (status, code, error) => {
    res.statusCode = status;
    res.end(JSON.stringify({ ok: false, code, error }));
  };
  if (req.method !== 'POST') return fail(405, 'method', 'Use POST.');

  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
  catch (e) { return fail(400, 'bad_body', 'Could not read the request.'); }

  const email = cleanEmail(body.email);
  if (!email) return fail(400, 'bad_email', 'Enter a valid email address.');
  const action = String(body.action || '').toLowerCase();

  let app;
  try { app = adminApp(); }
  catch (e) { return fail(501, e.code || 'not_configured', e.message); }

  const db = admin.firestore(app);
  const ref = db.collection('loginCodes').doc(codeId(email));

  if (action === 'send') {
    const code = randomCode();
    const now = Date.now();
    const prev = await ref.get();
    if (prev.exists) {
      const last = Number(prev.data().sentAt || 0) || 0;
      if (now - last < RESEND_COOLDOWN_MS) {
        return fail(429, 'too_soon', 'A code was just sent. Wait a minute before asking for another.');
      }
    }
    await ref.set({ email, hash: hashCode(email, code), exp: now + CODE_TTL_MS, sentAt: now, attempts: 0 });
    try {
      await sendMail(email, code);
    } catch (e) {
      await ref.delete().catch(() => {});
      return fail(e.code === 'no_mail' ? 501 : 502, e.code || 'mail_failed', e.message);
    }
    return res.end(JSON.stringify({ ok: true, sent: true, ttlMinutes: 10 }));
  }

  if (action === 'verify') {
    const code = String(body.code || '').replace(/\D/g, '').slice(0, 6);
    if (code.length !== 6) return fail(400, 'bad_code', 'Enter the 6-digit code.');
    const snap = await ref.get();
    if (!snap.exists) return fail(400, 'expired', 'That code has expired. Ask for a new one.');
    const d = snap.data();
    if (Date.now() > Number(d.exp || 0)) { await ref.delete().catch(() => {}); return fail(400, 'expired', 'That code has expired. Ask for a new one.'); }
    if (Number(d.attempts || 0) >= MAX_ATTEMPTS) { await ref.delete().catch(() => {}); return fail(429, 'locked', 'Too many tries. Ask for a new code.'); }
    const a = Buffer.from(String(d.hash || ''), 'hex');
    const b = Buffer.from(hashCode(email, code), 'hex');
    const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!ok) {
      await ref.update({ attempts: admin.firestore.FieldValue.increment(1) }).catch(() => {});
      return fail(400, 'bad_code', 'That code is not right. Check the email and try again.');
    }
    await ref.delete().catch(() => {});

    let uid = '';
    try {
      uid = (await admin.auth(app).getUserByEmail(email)).uid;
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        const created = await admin.auth(app).createUser({ email, emailVerified: true });
        uid = created.uid;
      } else {
        return fail(500, 'auth_failed', 'Could not prepare the account. Try again in a minute.');
      }
    }
    const customToken = await admin.auth(app).createCustomToken(uid, { signInProvider: 'email-code' });
    return res.end(JSON.stringify({ ok: true, customToken }));
  }

  return fail(400, 'bad_action', 'Unknown action.');
};
