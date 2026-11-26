# Configuration — v8.6.0

Read DEPLOYMENT.md for current setup. There is no backend/schema.sql or Edge Function source in this release; use the two supplied SQL files instead.

Edit the CONFIG block in index.html only for PUBLIC frontend configuration: Supabase project URL, anon/public key and public Stripe payment links. Relative /api/tmdb, /api/football, /api/stripe-verify and /api/entitlement routes use the host's server environment. Never embed privileged/private keys in HTML.

Google sign-in has been removed. Email/password and email-code flows use Supabase when configured; guest/device mode is local-only and cannot securely provision administrators. Owners must verify their email through Supabase.

Optional admin welcome-email requests use api/welcome.js and require a confirmed owner token plus RESEND_API_KEY/WELCOME_FROM. There is no automatic email delivery guarantee. See SECURITY.md before enabling an older external email function.
