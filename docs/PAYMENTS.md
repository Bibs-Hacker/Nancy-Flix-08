# NANCYFLIX — Real Premium with Stripe

This folder ships everything needed to charge real money for Premium:

| File | Purpose |
|---|---|
| `index.html` → `CONFIG.STRIPE` | The two Payment Link URLs, price labels, portal link |
| `api/stripe-verify.js` | Server-side check that a checkout really was paid |

Prices used in the UI: **$4.99 / month** and **$39.99 / year**.

---

## 1. Create the two Payment Links (10 minutes, no code)

1. Go to <https://dashboard.stripe.com> → sign in (test mode first is fine).
2. **Product catalog → Add product**
   - Name: `NANCYFLIX Premium`
   - Price: `4.99 USD`, **Recurring**, every **month** → Save.
3. Add a second price on the same product: `39.99 USD`, **Recurring**, every **year**.
4. **Payment links → New**
   - Pick the monthly price → create link → copy it (`https://buy.stripe.com/...`).
   - Repeat for the yearly price.
5. In each Payment Link → **Settings / After payment**:
   - Choose *Redirect to your website*.
   - URL for **monthly**:
     ```
     https://YOUR-DOMAIN/?checkout=success&plan=monthly&session_id={CHECKOUT_SESSION_ID}
     ```
   - URL for **yearly**:
     ```
     https://YOUR-DOMAIN/?checkout=success&plan=yearly&session_id={CHECKOUT_SESSION_ID}
     ```
   > `{CHECKOUT_SESSION_ID}` must be typed exactly like that — Stripe replaces it with the real id.
6. Optional but recommended: **Settings → Collect customer email** = on.

## 2. Paste the links into the app

Open `index.html`, find `CONFIG.STRIPE` (around line 1030) and fill in:

```js
STRIPE: {
  LINK_MONTHLY: "https://buy.stripe.com/xxxxxxxx",
  LINK_YEARLY:  "https://buy.stripe.com/yyyyyyyy",
  PORTAL_URL:   "https://billing.stripe.com/p/login/zzzz",   // optional
  VERIFY_ENDPOINT: "/api/stripe-verify",
  PRICE_MONTHLY: "$4.99",
  PRICE_YEARLY:  "$39.99"
}
```

`PORTAL_URL`: Stripe Dashboard → **Settings → Billing → Customer portal** → activate → copy the login link. That is what the “Manage subscription” button opens.

## 3. Turn on server-side verification (recommended)

Without it the app still unlocks Premium after a successful redirect, but only on that device — a determined user could fake the URL.

**Vercel**
1. Push the project (the folder containing `index.html` and `api/`) to GitHub.
2. Vercel → **Add New → Project** → import the repo → Deploy.
3. **Settings → Environment Variables** → add:
   - Name `STRIPE_SECRET_KEY`, value `sk_live_...` (or `sk_test_...` while testing).
4. **Deployments → Redeploy.**
5. Test: open `https://YOUR-DOMAIN/api/stripe-verify?session_id=cs_test_...`
   - `{"active":false,"reason":"bad_session_id"}` = the function is live (id was fake).
   - `{"active":false,"reason":"not_configured"}` = env var missing.

**Netlify** — same file works: move it to `netlify/functions/stripe-verify.js`, set the env var, and call `/.netlify/functions/stripe-verify` (change `VERIFY_ENDPOINT`).

> The secret key must never appear inside `index.html`. If it ever did, roll it in the Stripe Dashboard immediately.

## 4. What the customer experiences

1. Premium page → choose Monthly or Yearly → **Go Premium**.
2. Stripe-hosted checkout (card, Apple Pay, Google Pay).
3. Redirect back → app calls the verify endpoint → Premium unlocks, the account badge turns gold, and `/premium` shows *Active until <date>*.
4. **Manage subscription** opens the Stripe portal (cancel / update card).
5. If the return page loads before the webhook-free check confirms, the page shows “Payment received — confirming…” with a **Check again** button; entitlement is stored per account.

## 5. Test cards / test mode

- Card `4242 4242 4242 4242`, any future expiry, any CVC.
- Use `sk_test_...` + test Payment Links while learning, then swap to live links and `sk_live_...`.
- Stripe payouts need an activated account (bank details, ID) — that part is on Stripe, not on this code.

## 6. Honest limits

- Entitlement is cached in the browser per account id. It survives refresh and re-login on that device, but it is not a cross-device subscription database.
- For airtight cross-device control, add Stripe **webhooks** writing to Supabase and check that table at login. The verify endpoint already returns `customer`, `plan`, `expires`, so the data is there when you are ready.
- Tax/VAT, refunds, invoices and receipts are handled by Stripe settings, not by this file.
- Prices shown in the UI are text labels — change `PRICE_MONTHLY` / `PRICE_YEARLY` if you change the Stripe prices.
