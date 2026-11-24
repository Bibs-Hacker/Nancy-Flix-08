# NANCYFLIX v8.6.1 — verification report

Build date: 24 November 2026.

## Checks executed for this update

- Focused headless Chromium checks: quota errors override a mocked remaining count of 49; refresh does not issue another exhausted-score request.
- LIVE indicator and button containment at viewport widths 320, 390, 768 and 1366 pixels. Desktop header overflow corrected.
- Alternative player opens, switches channels and closes via Escape using mocked player pages. No uncaught page errors in this focused run.
- Countdown inset bounds, hover pause, resume, expiry and permanent-toast behavior passed.
- Exported zero-goal poster is 1080 × 1350 RGBA with transparent corner pixels and opaque center; canvas text contains no "No goals" or empty "GOAL SCORERS" section.
- Provider identifiers absent from frontend source and visible UI. Server source necessarily contains the configured source; redirects remain inspectable.
- Server tests: 60 football fixtures normalized from the supplied feed sample; category correction, deduplication, URL validation, no raw upstream iframe forwarding, player redirect, score caching/coalescing and quota cooldown passed.
- Visual inspection of five focused previews: quota view in dark/light themes, alternative player, notification and zero-goal poster.

- Final syntax checks passed for 30 inline JavaScript blocks and 10 bundled JavaScript files; relative server imports resolved and manifest icon files existed.
- Regression browser checks passed for guest/local/owner boundaries, retry failure/success, keyboard poster activation, mocked file sharing, download and all three poster branches.
- JSON parsed and final ZIP integrity checked.

## Important limits

The supplied schedule and two stream pages previously responded HTTP 200. That is not proof of video playback. Browser tests used mocked stream pages; real playback, deployed server behavior, provider licensing and phone acceptance are not verified. No Supabase SQL, real payments or real native sharing were executed for this update.

## Previous build verification record

The following is the retained v8.6.0 record, not a claim that every earlier check was rerun for this patch:

# NANCYFLIX v8.6.0 — verification report

Build date: 24 November 2026.

## Executed checks

- All **28 inline JavaScript blocks** passed `node --check`.
- Bundled API helpers/endpoints and service worker passed syntax validation; relative server imports resolved.
- Manifest/JSON parsed; referenced icon assets existed; archive integrity checked after packaging.
- Headless Chromium at **390 × 844** using mocked catalogue, fixtures/events and external assets: no uncaught JavaScript page errors, no horizontal overflow in tested views.
- Visible-text contrast audit found no sub-4.5 contrast ratios against resolved solid backgrounds in Home, Live, Genres, Feedback, Premium and Settings. This is not a complete WCAG audit: gradients and every possible state are not covered automatically.
- Visual review of Home/Live/Settings/Premium/offline/poster dialog, all three poster styles and transparent icon. A gradient Premium heading contrast defect was corrected and its affected screenshot rechecked.
- Matchday, live and full-time canvas branches produced **1080 × 1350 PNGs**. Test fixture dates/scores and sample scorers were used, not verified real match results.
- Keyboard activation of a match-card button did not open a conflicting match-detail dialog.
- PNG download worked; a mocked native sharing API received a nonempty PNG file; social-link URLs retained the fixture reference.
- Guest stale subscription remained inactive; guest/local-member settings lacked tester/email tools. A locally typed owner email did not grant admin access. A mocked confirmed owner session received owner tools/developer access.
- Simulated retry failure kept the panel open and re-enabled Retry; a reachable `version.json` check dismissed it and refreshed the active section. Service worker excludes this check and API data from its static cache.
- **11 mocked server security tests passed**: unauthenticated requests rejected on configured endpoints, member denied admin email, entitlement query bound to actor email, wrong checkout email rejected, unconfirmed email rejected, missing email-provider setup returned 503, trusted Stripe tier used instead of browser tier, missing metadata and expired subscriptions did not activate.
- Icon PNGs have real alpha transparency; the standalone icon is 512 × 512.

## Not verified live

- No deployment to your Vercel project or phone/device acceptance test.
- No live Supabase login/SQL migration execution, payment/provider calls, subscription cancellation/refund webhook reconciliation or real email delivery.
- No real native sharing to WhatsApp/Instagram/Status. Device/browser support must be tested on your phone.
- No live football provider plan/quotas, real scorer feed or broadcaster playback verified.
- SQL security migration was reviewed, not run against a live Postgres database.
- Actual installed-PWA offline navigation/service-worker lifecycle needs a deployed HTTPS browser test. The retry failure/success logic was browser-tested with mocks.

See DEPLOYMENT.md and SECURITY.md before making the update public. Paid UI state is not tamper-proof authorization for a future server resource.
