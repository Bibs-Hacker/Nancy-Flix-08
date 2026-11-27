const {authenticate,firebaseApp}=require('../lib/security');
/**
 * NANCYFLIX — cross-device entitlement lookup (Vercel / Netlify function).
 *
 *   GET /api/entitlement?email=user@example.com
 *   -> { active: true, plan: "premium", status: "active", expires: "2027-01-01T...", customer: "cus_..." }
 *   -> { active: false, reason: "none" | "expired" | "not_configured" }
 *
 * The app calls this after login and on "Restore purchase", so a membership
 * bought on a phone also unlocks the same account on a laptop.
 *
 * Server-side env vars (never in index.html):
 *   SUPABASE_URL              https://xxxx.supabase.co
 *   SUPABASE_SERVICE_KEY      service_role key (server only!)
 *
 * Table expected (SQL in docs/PAYMENTS.md):
 *   create table public.entitlements (
 *     email text primary key,
 *     plan text, status text, customer text, session text,
 *     expires timestamptz, updated_at timestamptz default now()
 *   );
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Cache-Control': 'no-store'
};

module.exports = async (req, res) => {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET') { res.status(405).json({ active: false, reason: 'method_not_allowed' }); return; }

  const actor=await authenticate(req);
  if(!actor){res.status(401).json({active:false,reason:'sign_in_required'});return;}
  if(actor.backend==='firebase'){
    try{
      const admin=require('firebase-admin');const db=admin.firestore(firebaseApp(true));
      const snap=await db.collection('entitlements').doc(actor.id).get();
      const row=snap.exists?snap.data():null;
      if(!row){throw new Error('none');}
      const plan=String(row.plan||'').toLowerCase(),status=String(row.status||'').toLowerCase();
      const expires=row.expires&&typeof row.expires.toDate==='function'?row.expires.toDate().toISOString():row.expires||null;
      const notExpired=!expires||new Date(expires).getTime()>Date.now();
      const active=['plus','premium','super'].includes(plan)&&['active','trialing'].includes(status)&&notExpired;
      res.status(200).json({active,plan,status,expires,reason:active?undefined:(!notExpired?'expired':'inactive')});return;
    }catch(e){if(!(process.env.SUPABASE_URL&&(process.env.SUPABASE_SERVICE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY))){res.status(200).json({active:false,reason:e.message==='none'?'none':e.message==='firebase_admin_not_configured'?'not_configured':'lookup_failed'});return;}}
  }
  const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if(!url||!key){res.status(200).json({active:false,reason:'not_configured'});return;}
  const email=String(actor.email).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    res.status(400).json({ active: false, reason: 'bad_email' });
    return;
  }

  try {
    const q = url + '/rest/v1/entitlements?select=email,plan,status,customer,session,expires&email=eq.' +
      encodeURIComponent(email) + '&order=updated_at.desc&limit=1';
    const r = await fetch(q, { headers: { apikey: key, Authorization: 'Bearer ' + key, Accept: 'application/json' } });
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      res.status(200).json({ active: false, reason: 'db_error', message: txt.slice(0, 200) });
      return;
    }
    const rows = await r.json().catch(() => []);
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) { res.status(200).json({ active: false, reason: 'none' }); return; }

    const status = String(row.status || 'active').toLowerCase();
    const expires = row.expires || null;
    const notExpired = !expires || new Date(expires).getTime() > Date.now();
    const active = ['plus','premium','super'].includes(String(row.plan||'').toLowerCase()) && ['active', 'trialing'].includes(status) && notExpired;

    res.status(200).json({
      active,
      reason: active ? undefined : (notExpired ? 'inactive' : 'expired'),
      plan: row.plan || 'premium',
      status,
      expires,
      customer: row.customer || null
    });
  } catch (err) {
    res.status(200).json({ active: false, reason: 'lookup_failed', message: String((err && err.message) || err) });
  }
};
