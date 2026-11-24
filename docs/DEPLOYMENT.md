# Deploy/update NANCYFLIX v8.6.0

## GitHub + Vercel (eligible free tier)

1. Back up your current repository. Keep it private if it ever contained credentials.
2. Extract this archive. Copy its contents into your existing repository root. Do not place the app one extra folder deep.
3. Keep `index.html`, `api/` (including `api/lib/security.js`), `icons/`, `audio/`, `manifest.webmanifest`, `sw.js`, `version.json` and `docs/` together. All are included.
4. In Vercel, import the repository or use the existing project. Select **Other**, project-root directory, no build command, no output-directory override.
5. Preserve the existing public Supabase project URL and anon/public key in the frontend. Never put a service-role key, Stripe secret or provider secret in browser code.
6. Add the variables below in Vercel's Environment Variables settings. Redeploy after changing them.
7. Back up Supabase, then run `SUPABASE-SYNC.sql` followed by `SECURITY-UPDATE.sql`. Keep email confirmation enabled for secure cloud owners.
8. Deploy and open the site using HTTPS. Check the displayed version is 8.6.0; the updated service worker replaces the old app shell. Do not clear all site data unless you have exported unsynced watchlists.
9. Test guest access first, then a normal email account, then a confirmed owner email. Local-only owner-email registration does NOT grant administrator privileges.

## Server environment

| Variable | Purpose |
|---|---|
| `TMDB_V3_KEY` | Private movie catalogue proxy key |
| `API_FOOTBALL_KEY` | Live football/fixture/event data |
| `SUPABASE_URL` | Supabase project URL, also needed by authenticated APIs |
| `SUPABASE_ANON_KEY` | Public anon key used to validate user sessions |
| `SUPABASE_SERVICE_KEY` | Server-only entitlement database access; service-role key |
| `STRIPE_SECRET_KEY` | Optional Stripe verification, server only |
| `RESEND_API_KEY` | Optional admin email tool, server only |
| `WELCOME_FROM` | Verified email sender, if using the email tool |
| `APP_URL` | Public HTTPS address of your app |

`SUPABASE_SERVICE_ROLE_KEY` is also accepted as the service key. Do not publish `.env`, private keys or session tokens to GitHub. Existing private keys never belong in the downloadable app source.

## Offline and sharing checks

- Visit online once, then disconnect internet: the offline panel should appear. Retry should fail honestly while offline. Reconnect and retry; it checks `version.json` over the network and refreshes the active section.
- Open a fixture, create a poster, Save poster and attach it to a social app. Native Quick share works only in supporting HTTPS browsers.
- Blank/limited live data with a configured key can be a provider quota/season restriction. Missing `API_FOOTBALL_KEY` is a hosting configuration problem, not a poster bug.

Pure static hosting can show the frontend, but it cannot run the bundled authentication/payment/email/API proxies. No full movie or protected-match streaming rights are supplied by this archive.
