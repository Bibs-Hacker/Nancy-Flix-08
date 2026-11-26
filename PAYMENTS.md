# Payments — v8.6.0

Payment setup is OPTIONAL. Leave public payment links blank to browse/test without payment. Stripe real transactions have fees; use test mode only for testing.

## Setup

1. Set up confirmed-email Supabase login and both SQL scripts before payments.
2. Create recurring Plus, Premium and Super products with monthly/yearly prices in Stripe, and create the corresponding six Payment Links.
3. Add trusted **plan metadata** to EACH Payment Link in Stripe: exactly `plus`, `premium` or `super`. Metadata can also be set on the subscription/price or a programmatic Checkout Session. The verifier reads trusted Stripe metadata, never the browser's `plan=` query. A missing metadata plan does not unlock membership.
4. Set the after-payment redirect to your HTTPS app using `?checkout=success&session_id={CHECKOUT_SESSION_ID}`. Legacy returns with just `session_id` are also handled. Query tier names do not grant access.
5. Put public links in CONFIG.STRIPE keys LINK_PLUS_MONTHLY/YEARLY, LINK_PREMIUM_MONTHLY/YEARLY and LINK_SUPER_MONTHLY/YEARLY. Legacy LINK_MONTHLY/YEARLY work for Premium fallback.
6. Set STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_KEY in the host environment, then redeploy.
7. Sign in using the same confirmed email you enter at checkout. The server rejects a paid checkout belonging to a different email or account reference.
8. If redirected while signed out, sign in and tap Restore purchase/Check again. No unverified payment receives a local entitlement.

## Testing

Use Stripe TEST mode and test card 4242 4242 4242 4242, future expiry and any CVC. No real money is needed for test-mode transactions. Tester/developer access is for confirmed owners only; guest and member Settings do not contain a public trial unlock.

## Limits

Free includes public discovery, all themes, football fixtures and match posters. Paid tiers extend queues/history, download quotas, advanced alerts and calendar exports. Full paid movie rights, protected streams, family device enforcement, automatic email reminders and production billing reconciliation are not supplied simply by buying a plan.

Verification checks Stripe at checkout return and stores an entitlement row for restore. Cancellations/refunds are not webhook-reconciled in this bundle. Add and test subscription webhooks before selling a production subscription. A cached browser display is not a server authorization decision.
