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
