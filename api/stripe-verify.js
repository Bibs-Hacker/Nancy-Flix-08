const {authenticate,firebaseApp}=require('../lib/security');
/**
 * NANCYFLIX — Stripe Checkout verification endpoint (Vercel / Netlify function).
 *
 *   GET /api/stripe-verify?session_id=cs_test_...
 *   -> { active: true, plan: "monthly" | "yearly", expires: "2027-01-01T...", customer: "cus_...", status: "active" }
 *
 * Required environment variable:  STRIPE_SECRET_KEY   (sk_live_... or sk_test_...)
 * Never put that key in index.html — it only lives here, server-side.
 *
 * Deploy: Vercel -> put this file at /api/stripe-verify.js (already is), add the
 * env var in Project Settings -> Environment Variables, redeploy.
 */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Headers','Authorization,Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET') { res.status(405).json({ active: false, reason: 'method_not_allowed' }); return; }

  const actor=await authenticate(req);
  if(!actor){res.status(401).json({active:false,reason:'sign_in_required'});return;}
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) { res.status(200).json({ active: false, reason: 'not_configured' }); return; }

  const q = req.query || {};
  const sid = String(q.session_id || '').trim();
  if (!/^cs_[A-Za-z0-9_]+$/.test(sid)) { res.status(400).json({ active: false, reason: 'bad_session_id' }); return; }

  const stripe = async (path) => {
    const r = await fetch('https://api.stripe.com/v1/' + path, {
      headers: { Authorization: 'Bearer ' + key, 'Stripe-Version': '2023-10-16' }
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j && j.error && j.error.message) || ('stripe_' + r.status));
    return j;
  };

  try {
    const s = await stripe('checkout/sessions/' + encodeURIComponent(sid) + '?expand[]=subscription&expand[]=customer&expand[]=payment_link');

    const paid = s.payment_status === 'paid' || s.payment_status === 'no_payment_required';
    if (s.status !== 'complete' || !paid) {
      res.status(200).json({ active: false, reason: 'unpaid', status: s.status, payment_status: s.payment_status });
      return;
    }

    const sub = (s.subscription && typeof s.subscription === 'object') ? s.subscription : null;
    const cust = (s.customer && typeof s.customer === 'object') ? s.customer : null;

    const link = s.payment_link && typeof s.payment_link === 'object' ? s.payment_link : null;
    const itemPrice = sub && sub.items && sub.items.data && sub.items.data[0] && sub.items.data[0].price;
    let plan = String((s.metadata && s.metadata.plan) || (link && link.metadata && link.metadata.plan) ||
      (sub && sub.metadata && sub.metadata.plan) || (itemPrice && itemPrice.metadata && itemPrice.metadata.plan) || '').toLowerCase();
    if (!['plus','premium','super'].includes(plan)) {
      // Never trust URL/query parameters to choose the paid tier.
      res.status(200).json({ active:false, reason:'plan_metadata_missing' }); return;
    }
    let expires = null;
    let status = 'active';

    if (sub) {
      status = sub.status || 'active';
      const iv = sub.items && sub.items.data && sub.items.data[0] && sub.items.data[0].price
        && sub.items.data[0].price.recurring && sub.items.data[0].price.recurring.interval;
      if (!plan) plan = (iv === 'year') ? 'yearly' : 'monthly';
      if (sub.current_period_end) expires = new Date(sub.current_period_end * 1000).toISOString();
    } else {
      // one-off payment link (no subscription): grant a 31-day pass
      plan = plan || (Number(s.amount_total) >= 3000 ? 'yearly' : 'monthly');
      expires = new Date(Number(s.created) * 1000 + 31 * 864e5).toISOString();
    }

    const active = ['active', 'trialing'].includes(status) && (!expires || new Date(expires).getTime()>Date.now());
    const email = (cust && cust.email) || (s.customer_details && s.customer_details.email) || null;

    if((s.client_reference_id && s.client_reference_id!==actor.id)||!email||String(email).toLowerCase()!==String(actor.email).toLowerCase()){res.status(403).json({active:false,reason:'checkout_owner_mismatch'});return;}
    /* ---- remember the membership server-side so other devices can restore it ---- */
    if (active && email) {
      try { await saveEntitlement({ uid:actor.id, backend:actor.backend, email, plan: plan || 'premium', status, expires, customer: (cust && cust.id) || (typeof s.customer === 'string' ? s.customer : null), session: s.id }); } catch (e) {}
    }

    res.status(200).json({
      active: active,
      plan: plan || 'monthly',
      status: status,
      expires: expires,
      customer: (cust && cust.id) || (typeof s.customer === 'string' ? s.customer : null),
      email: email,
      session: s.id,
      livemode: !!s.livemode
    });
  } catch (err) {
    res.status(200).json({ active: false, reason: 'stripe_error', message: String(err && err.message || err) });
  }
};

/* ---------------------------------------------------------------------------
 * Store / update the entitlement row in Supabase (REST, no SDK needed).
 * Silently no-ops when the Supabase env vars are not configured, so the app
 * keeps working before you finish setup.
 * ------------------------------------------------------------------------- */
async function saveEntitlement(row) {
  if(row.backend==='firebase'){
    await firebaseApp().firestore().collection('entitlements').doc(row.uid).set({
      email:String(row.email).toLowerCase(),plan:row.plan,status:row.status,
      customer:row.customer||null,session:row.session||null,expires:row.expires||null,
      updated_at:new Date().toISOString()
    },{merge:true});return true;
  }
  const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return false;
  const body = {
    email: String(row.email).toLowerCase(),
    plan: row.plan || 'premium',
    status: row.status || 'active',
    customer: row.customer || null,
    session: row.session || null,
    expires: row.expires || null,
    updated_at: new Date().toISOString()
  };
  const r = await fetch(url + '/rest/v1/entitlements?on_conflict=email', {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify(body)
  });
  return r.ok;
}
