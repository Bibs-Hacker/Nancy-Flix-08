# Payments & memberships — NANCYFLIX v5

Three plans, two billing cycles, six Stripe Payment Links. Everything expensive
happens on the server, so the app file stays public and safe to share.

| Plan | Monthly | Annual | Who it is for |
|---|---|---|---|
| **Plus** | $2.99 | $24.99 | casual viewers: bigger queue, history, themes |
| **Premium** *(most popular)* | $4.99 | $39.99 | Live TV + Live Football + gold profile + cross-device |
| **Super** | $9.99 | $79.99 | families: 10 devices, 4 profiles, match reminders |

---

## 1. Create the six Payment Links (Stripe dashboard)

1. Go to **Product catalogue → Add product**. Create three recurring products:
   `NANCYFLIX Plus`, `NANCYFLIX Premium`, `NANCYFLIX Super`.
   For each one add **two prices**: monthly and yearly (the amounts above).
2. For every price, click **Create payment link**.
3. In the link editor, open **After payment → Confirmation page** and set
   *“Don’t show confirmation page — redirect”* to your deployed app:

   ```
   https://YOUR-DOMAIN/?plan=plus&billing=monthly&session_id={CHECKOUT_SESSION_ID}
   https://YOUR-DOMAIN/?plan=plus&billing=yearly&session_id={CHECKOUT_SESSION_ID}
   https://YOUR-DOMAIN/?plan=premium&billing=monthly&session_id={CHECKOUT_SESSION_ID}
   https://YOUR-DOMAIN/?plan=premium&billing=yearly&session_id={CHECKOUT_SESSION_ID}
   https://YOUR-DOMAIN/?plan=super&billing=monthly&session_id={CHECKOUT_SESSION_ID}
   https://YOUR-DOMAIN/?plan=super&billing=yearly&session_id={CHECKOUT_SESSION_ID}
   ```

   The `plan=` value must be exactly `plus`, `premium` or `super`.
4. Optional but recommended: in the link settings add **Metadata → plan** with the
   same value, and turn on **Collect customer email** (required for cross-device
   restore — the membership is looked up by email).
5. Copy the six `https://buy.stripe.com/...` URLs into `CONFIG.STRIPE` near the top
   of `index.html`:

   ```js
   LINK_PLUS_MONTHLY:    "https://buy.stripe.com/...",
   LINK_PLUS_YEARLY:     "https://buy.stripe.com/...",
   LINK_PREMIUM_MONTHLY: "https://buy.stripe.com/...",
   LINK_PREMIUM_YEARLY:  "https://buy.stripe.com/...",
   LINK_SUPER_MONTHLY:   "https://buy.stripe.com/...",
   LINK_SUPER_YEARLY:    "https://buy.stripe.com/...",
   ```

   The old `LINK_MONTHLY` / `LINK_YEARLY` keys are still accepted as a fallback for
   the Premium tier only.

Leave every link empty and the app simply says *“not configured yet”* instead of
charging anyone — nothing breaks.

---

## 2. Host environment variables

Add these in **Vercel → Project → Settings → Environment Variables** (or Netlify →
Site settings → Build & deploy → Environment), then redeploy.

| Variable | Used by | Notes |
|---|---|---|
| `STRIPE_SECRET_KEY` | `api/stripe-verify.js` | `sk_live_...` or `sk_test_...` |
| `SUPABASE_URL` | both API files | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | both API files | the **service_role** key — server only |

Never place any of these in `index.html`. The browser only ever sees the public
`buy.stripe.com` link.

---

## 3. Create the entitlements table (cross-device)

Supabase → **SQL Editor → New query**, paste and run:

```sql
create table if not exists public.entitlements (
  email      text primary key,
  plan       text,
  status     text,
  customer   text,
  session    text,
  expires    timestamptz,
  updated_at timestamptz default now()
);

alter table public.entitlements enable row level security;
-- no policies: only the server (service_role key) may read or write.
```

That is all. `api/stripe-verify.js` writes a row the moment a checkout completes,
and `api/entitlement.js` reads it back. Sign in on any device with the same email
and the app calls `Entitlement.sync()` → the plan unlocks automatically.

It also works with a **manual grant** while testing:

```sql
insert into public.entitlements (email, plan, status, expires)
values ('you@example.com', 'super', 'active', now() + interval '1 year')
on conflict (email) do update set plan = excluded.plan, status = 'active', expires = excluded.expires;
```

---

## 4. What happens on a purchase

1. Tap **Get Premium** → browser goes to the matching Stripe Payment Link with
   `client_reference_id` and `prefilled_email` filled in.
2. Stripe charges, then redirects to `/?plan=premium&session_id=cs_...`.
3. The app sends that session id to `/api/stripe-verify`, which asks Stripe directly
   (server-side key) and returns `{active, plan, expires, customer}`.
4. On success the app stores the plan on the device **and** the API writes it to
   `entitlements`, so the next login anywhere restores it.
5. `Manage subscription` opens your Stripe customer portal (`PORTAL_URL`), where a
   customer can switch tier or cancel.

---

## 5. Test without spending money

* Stripe **test mode** → use the six test links (they look identical, prefix `cs_test_`).
  Card `4242 4242 4242 4242`, any future date, any CVC.
* Or skip Stripe entirely: **Settings → Testing & updates → Unlock 7 days**.
  That unlocks every Premium feature on that device for 7 days, no card, so you can
  try Live TV, Live Football, themes, queue and history. **End test** puts it back.
* Admin accounts can grant a plan from the admin panel.

---

## 6. Honest limits

* Live TV lists **free-to-air HLS streams** published by the broadcasters. They can
  rotate or go offline without notice; the player shows a clear fallback message.
  No subscription channels are included.
* Live Football shows **fixtures only** (dates, venues, competition) and links to the
  official broadcaster. Rights-protected matches are never re-streamed.
* The 7-day unlock is device-local by design (it is a testing switch, not a licence).
* Cross-device restore needs steps 2 and 3 done; until then the app keeps working
  with device-local entitlements and says so quietly.
