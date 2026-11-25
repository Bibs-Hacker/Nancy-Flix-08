# NANCYFLIX v8.7.0

Dev Brian + Dev Nancy · Contact: devbriannova@gmail.com

Current version is written in three places and all three say 8.7.0: the splash screen, the footer/settings line (APP_VERSION) and `version.json`. If your live site still shows 8.6.1, the old file set is still deployed — see "The site still shows the old build" below.

## What is new in v8.7.0

- **Kids corner is easy to find.** It has its own entry in the menu and a yellow Kids button in the header (desktop), and it stays as a third tab inside Live (football / TV channels / kids). The page has live children's channels plus a free cartoon, story-time and learning library from the Internet Archive.
- **Share links carry the match poster.** Sharing a fixture now gives a link to a small poster page (`/s/...`). WhatsApp, Telegram, X and Facebook read that page and show the match title plus a 1080 x 1080 poster, with no manual image attach. If the poster upload is unavailable the link still resolves to the same page with a default NANCYFLIX card, so a picture always appears.
- **Upcoming fixtures work on the free plan.** The free API-Football plan rejects next/last requests, so the schedule now asks for dated windows and falls back to an alternative public feed. If scores are unavailable the page shows a clear notice plus the free schedule rows instead of an empty screen.
- **Separate focus and sleep sounds.** Eight focus recordings and seven sleep recordings replace the single reused track, each with its own label, length and volume.
- **More free channels.** 39 free-to-air channels in total, with the new ones spread across news, movies, music, documentaries and regional feeds.
- **Phone layout.** Cards, tabs and player controls were tightened for 320-430 px screens; nothing scrolls sideways.

## Included from earlier versions

- 1080 x 1350 match posters (matchday, live score, full time) with crests, venue, local kickoff and scorer details when the feed provides them. No invented players or results.
- Poster upload, PNG download and per-match sharing; the phone decides whether WhatsApp/Instagram can receive an image directly.
- Offline panel, manual retry and connectivity checks. Saved content stays; streams and scores need internet.
- Email login plus guest browsing. No Google sign-in.
- Light-mode fixes, owner-only admin tools, no public tester unlock.

## Start here (fresh deploy)

1. Back up the current deployment and database.
2. Read `docs/DEPLOYMENT.md` and `docs/SECURITY.md`.
3. Upload **every** file and folder from this archive to the repository root — `index.html`, `sw.js`, `manifest.webmanifest`, `version.json`, `vercel.json`, `og-share.jpg`, and the whole `api/`, `audio/`, `icons/` and `docs/` folders. Uploading only `index.html` leaves the site on the old build.
4. In the host dashboard add the environment variables listed in `docs/CONFIGURATION.md`. For share links set `APP_URL` to your public domain (for example `https://your-app.vercel.app`) so the poster URL is absolute.
5. In Supabase run `docs/SUPABASE-SYNC.sql`, then `docs/SECURITY-UPDATE.sql` once.
6. Redeploy, open the site once online, accept the update, then test as guest, member and owner.

## The site still shows the old build

A clean build log with no error only means the files you uploaded compiled. Check these in order:

1. Open `https://your-domain/version.json` in a browser. It must say `8.7.0`. If it says 8.6.x, the new `version.json` was never uploaded, so the rest of the old files are live too.
2. The splash screen prints the version it is running. v8.7 prints `V8.7.0`; 8.6.1 printed `V8.6.1`.
3. `vercel.json` must sit at the repository root next to `index.html`, and the `api` folder must be at the root too (not inside `public` or `dist`). In the Vercel project, the Functions tab should list `api/share`, `api/share-image`, `api/kids` and the other routes after a successful deploy.
4. If the files are correct but the browser still shows the old page, hard refresh once (Ctrl+Shift+R, or close the tab on a phone). The service worker keeps the last working copy by design; it swaps after one reload.

WhatsApp also caches link previews. A link shared before the fix keeps its old preview until the cache expires; send the link to yourself with a small change at the end of the address to force a fresh fetch.

## Free hosting

Everything here runs on free tiers: Vercel for the site and `api/` routes, Supabase for accounts and storage, API-Football and TheSportsDB free plans for football data, Internet Archive for the cartoon library. Provider limits change; do not pick a paid plan to test this update. Streams are official public feeds — a channel can go offline or be limited to its own country, and NANCYFLIX cannot guarantee playback.

## Verification and limits

See `docs/TESTING_REPORT.md`. Browser tests used mocked feeds, auth and sharing on a local copy; there was no real deployment, phone share, payment, live-stream or Supabase SQL run. Screenshots used test fixtures, not real results. The cartoon library plays in the archive's own player and shows whatever that collection offers — it is not a licensed streaming catalogue.
