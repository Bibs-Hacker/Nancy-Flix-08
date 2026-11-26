# v8.6 security update — read before making the site public

## Why guests appeared to have Premium

Earlier code exposed a public seven-day testing switch, stored a shared guest entitlement and could grant a local plan when a checkout had not been verified. Separately, free themes, posters and basic football browsing can look like Premium without being a paid membership. This release removes those accidental unlock paths; it does not lock intentionally Free features.

## Boundaries now

- Guests have no membership. Stale `sub:guest` is removed on guest entry. Ordinary users cannot use tester/developer grants or the old unverified-client source.
- Administrator settings, custom stream source controls, admin sync and the email tool are hidden/blocked for ordinary users. Personal appearance, language and notification preferences remain available.
- The only owner emails are `bridah888@gmail.com` and `achiengnancy65@gmail.com`. Production owner access needs Supabase-confirmed email login, not a matching email typed into a local-only account.
- The server validates bearer tokens with Supabase. Email-tool access additionally requires a confirmed owner account.
- Entitlement lookup uses the authenticated email, not an arbitrary query email. Checkout verification checks the session's paid status, owner email/account reference and server-side plan metadata.
- The SQL update protects profile email/admin fields and checks confirmed owner identity in RLS policies. Browser roles/local storage are never the protection for database rows.

## Required rollout

1. Back up database and browser-only data.
2. Run `SUPABASE-SYNC.sql`, then `SECURITY-UPDATE.sql`, in the Supabase SQL editor. The second script deliberately replaces existing policies on profiles, watchlists, announcements and feedback. Review custom policies before running it.
3. Keep email confirmation enabled; confirm the two owner accounts legitimately. Never disable confirmation just to get admin access.
4. Add server auth environment variables and redeploy the entire `api/` folder, including `lib/security.js`.
5. If you previously deployed a separate insecure welcome-email Edge Function, disable it or secure it separately. Updating this archive does not change an external function already deployed elsewhere.
6. Test a guest, normal member and owner with fresh browser sessions.

## Limits and payment warning

Paid UI limits are still largely client-side. Local storage is NOT tamper-proof DRM, and a user controlling their browser can alter their own display. Protect any future paid server resource with server entitlement checks.

The bundled verifier handles returned checkout sessions. It does not include a Stripe subscription webhook for immediate cancellations/refunds or a full billing reconciliation system. Do not market billing as production-ready without those safeguards and live integration testing. Server membership rows must not be writable by browser accounts. No keys are rotated automatically by this release.
