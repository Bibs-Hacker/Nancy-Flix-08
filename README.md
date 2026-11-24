# NANCYFLIX v8.6.1

Dev Brian + Dev Nancy · Contact: devbriannova@gmail.com

## What changed in v8.6.1

- Notification countdown sits below the message without overlapping it; hovering pauses both the bar and dismissal timer.
- Exported match posters have genuinely transparent rounded corners. Empty goal-scorer sections and repeated "No goals" labels are omitted.
- Smaller LIVE indicator keeps its Watch button inside the banner. Desktop navigation wraps instead of overflowing.
- Exhausted live-score quota overrides misleading remaining-credit headers. Background score requests are reduced, with cached responses and cooldowns.
- Alternative football schedules and selectable stream-page links are integrated through a server endpoint. Provider addresses are not displayed in the app; this is not a guarantee of playable video or an anonymity feature.
- Closing temporary overlays with Escape no longer triggers a null-element error.

## Included from v8.6.0

- New 1080 × 1350 match posters: matchday, live-score snapshot and full-time result designs, club/competition crests, venue, local kickoff time and scorer details when provided by the football feed. No invented player photos or results.
- Quick image sharing, PNG download and WhatsApp/X/Facebook match-link sharing. Sharing an image depends on the phone/browser; Instagram and Status need you to save and attach it.
- Transparent PNG/SVG app icons, including a standalone 512px PNG.
- Offline panel, manual retry and automatic connectivity checks after reconnection. A retry checks the server, not a cached page. Saved content remains; internet is required for streams/live data.
- No Google registration/sign-in button. Email login and guest/device browsing remain.
- Light-mode fixes across movie cards, hero, football controls, Premium, settings and dialogs.
- Removed public tester unlock, blocked stale guest membership and unverified checkout fallback. Admin tools require a verified owner cloud account; ordinary users retain personal settings.

## Start here

1. Back up your current deployed files and database.
2. Read **docs/DEPLOYMENT.md** and **docs/SECURITY.md** before deployment.
3. Upload ALL files/folders from this archive to the root of the existing GitHub app repository, not just index.html.
4. Keep the existing public Supabase configuration; configure private keys in the host dashboard only.
5. In Supabase, run **docs/SUPABASE-SYNC.sql**, then **docs/SECURITY-UPDATE.sql**. The security update replaces policies on four app tables; review it if you have custom policies.
6. Redeploy. Open the site online once, accept the update, then test as guest/member/verified owner separately.

## Free hosting

The app can run on an eligible free Vercel/Supabase plan within their quotas. Provider limits change; do not select a paid plan just to test this update. API-Football data availability depends on the provider plan and quotas. Stripe payment processing is optional and has fees for real transactions.

## Verification and limits

See **docs/TESTING_REPORT.md**. Browser tests used mocked feeds/auth/sharing. There has been no deployment, real phone sharing, live payment, live stream or Supabase SQL execution verification. Screenshots used test fixtures and sample scorers, not real match results.

Offline support caches the app shell and permitted metadata/posters, NOT full movies or protected football streams. All themes and football posters are intentionally Free; their availability alone is not proof that Premium is active.
