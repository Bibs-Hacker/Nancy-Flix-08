# Deploy/update NANCYFLIX v8.7.1

## GitHub + Vercel (eligible free tier)

1. Back up your current repository. Keep it private if it ever contained credentials.
2. Extract this archive. Copy its contents into your existing repository root. Do not place the app one extra folder deep.
3. Keep `index.html`, `api/` (including `api/lib/security.js`), `icons/`, `audio/`, `manifest.webmanifest`, `sw.js`, `version.json`, `vercel.json`, `og-share.jpg` and `docs/` together. All are included. `vercel.json` must sit next to `index.html` at the repository root; it maps `/s/...` to the share page.
4. In Vercel, import the repository or use the existing project. Select **Other**, project-root directory, no build command, no output-directory override.
5. Preserve the existing public Supabase project URL and anon/public key in the frontend. Never put a service-role key, Stripe secret or provider secret in browser code.
6. Add the variables below in Vercel's Environment Variables settings. Redeploy after changing them.
7. Back up Supabase, then run `SUPABASE-SYNC.sql` followed by `SECURITY-UPDATE.sql`. Keep email confirmation enabled for secure cloud owners.
8. Deploy and open the site using HTTPS. Check the displayed version is 8.7.0 on the splash and in the footer, and open `/version.json` to confirm. The updated service worker replaces the old app shell. Do not clear all site data unless you have exported unsynced watchlists.
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

## v8.6.1 football update

- Upload the new `api/football-alt.js` alongside `api/football.js` and the updated frontend/service worker. Static-only hosting cannot run these server routes.
- The supplied alternative schedule is configured server-side; no additional provider key is required for that source. Keep `API_FOOTBALL_KEY` for primary live scores/events.
- Score refresh is opt-in and throttled. When the provider reports exhausted quota, the app shows "Score limit reached" rather than stale remaining credits. A cooldown prevents repeated score calls.
- Alternative schedules can remain usable during a primary-score quota outage. Stream-page opening and switching do not prove that video will play: provider availability, iframe restrictions, geography and browser/device rules may prevent playback. Use only streams you are authorized to access.
- Source addresses are hidden from visible UI, not from developer tools or redirect inspection. This build does not proxy/re-stream video or bypass access restrictions.
- If you already applied the v8.6.0 database changes, this update needs no new SQL migration. Keep existing credentials and user data; upload all app files and redeploy.

## v8.7.0 update

- Upload `api/share.js`, `api/kids.js`, `vercel.json`, `og-share.jpg` and the new `lib/` folder together with `index.html`, `sw.js`, `version.json`, `audio/` and `api/football-alt.js`. Delete `api/share-image.js`, `api/share-card.js` and `api/lib/` from the repository: they are gone in this build and would push the deployment over the free function limit.
- Set `APP_URL` to the public HTTPS address of the deployment. Share links use it to build an absolute poster URL. Without it the request host is used, which is correct for Vercel but not for every proxy.
- Poster uploads use Supabase Storage when `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` exist. Without them the share link still opens the `/s/` page and shows the default `og-share.jpg` card, so a preview image always appears.
- WhatsApp fetches a link preview once and caches it. Sharing a link you already sent before the update can keep the old preview until that cache expires; test with a new link.
- Kids channels are official public feeds. The cartoon library is the Internet Archive public collection and plays in the archive's own player.

### The live site still shows the old version

1. Open `/version.json`. It must read `8.7.1`. If not, the new files were not uploaded to the deployed branch/folder.
2. Confirm `api/` and `vercel.json` are at the repository root. In Vercel, the Functions tab must list ten functions (see `docs/AUTH-AND-INSTALL.md`); more than twelve is rejected by the free plan.
3. If a Custom Root Directory or Output Directory is set in the Vercel project, clear it; the app is served from the repository root.
4. Redeploy without build cache. Then hard refresh once (Ctrl+Shift+R) or close and reopen the tab on a phone; the service worker swaps the shell on the next load.
