# Backend requirements — v8.6.0

- Guest/device discovery: frontend only, on-device data.
- Real catalogue/trailers: TMDB proxy with TMDB_V3_KEY.
- Live football/scorers/crests: API-Football proxy with API_FOOTBALL_KEY; provider availability/quota applies.
- Secure accounts, owner roles and cross-device data: Supabase Auth plus SUPABASE-SYNC.sql and SECURITY-UPDATE.sql.
- Paid-plan verification/restore: authenticated Stripe verifier and entitlement endpoint, server keys and entitlements table. Cancellation/refund webhook reconciliation is not included.
- Optional owner email tool: api/welcome.js plus email-provider credentials and confirmed owner identity.

No backend/schema.sql, audit_log table or Supabase Edge Function source is bundled. Database SQL has not been executed on your project. Demo/local storage is not a secure replacement for cloud auth or multi-device sync.
