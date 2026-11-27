# Verification — NANCYFLIX 8.9.0

## Completed locally

- Every inline JavaScript block in the final app, including the Firebase module, passed JavaScript syntax checks. API and library JavaScript also passed.
- Package, manifest, Vercel settings, release metadata and both catalogue JSON files parse successfully. The root catalogue matches the library catalogue.
- Mocked SportSRC API behavior tests pass for: absent configuration, invalid action/id/date, wrong method, rejected key, exhausted quota, grouped fixture normalization, provider flags, source deduplication, HTTPS-only embeds, account summary, caching, unreadable JSON, provider errors and aborted requests.
- Tests verify the key is sent as X-API-KEY and is not put into the upstream URL or returned in the API response.
- The final app was opened in a headless browser with controlled provider responses. An empty primary resolver produced the fallback fixture list. Opening a fixture used the existing NFAltFootball overlay, displayed supplied venue/referee details, and used the supplied source URL. Source switching changed the iframe URL; Close removed the overlay/iframe.
- Provider diagnostic results rendered in Settings. The player and diagnostic layouts were visually inspected; no missing content or overlap was observed in these tested desktop states. Settings is scrollable.
- Controlled Firebase identity cases: unverified administrator denied; verified administrator accepted; token retrieval failure denied. All four configured verified administrator emails passed the role derivation cases. These are tests of local role logic, NOT sign-ins to those real accounts.
- The original player still accepts the original resolver path and offers an explicit fallback-failure button. Different opponents do not auto-match in the SportSRC fixture matcher.
- No browser page exceptions occurred in these controlled tests.

Run the included mocked API checks locally with `node tests/sportsrc.test.js`. They do not need an API key or provider account. Never interpret the mocked results as proof of a working external video.

## Earlier provider snapshot from this review

These results were saved during the review, not a guarantee of current provider availability:

| Provider | Observed result | Meaning |
|---|---|---|
| Existing API-Football status | HTTP 200; configured; 99 daily requests remaining | Score API responded at that time |
| Existing alternative schedule | HTTP 200; 49 fixtures and 106 listed channels | Schedule/sources were listed, not playback-verified |
| SportSRC account without a key | HTTP 401 | Provider requires X-API-KEY |
| SportSRC matches without a key | HTTP 401 | Authenticated schema and live sources could not be inspected |

SportSRC's public documentation currently marks account, matches, detail and stream as FREE & PREMIUM. It says sources vary by deployment; this implementation does not invent provider names or sample sources in the delivered application. The browser test players were controlled test responses only and are not included as real app content.

## Still requires your live deployment

1. Configure your own SportSRC key on Vercel, redeploy, and run account diagnostics.
2. Force the existing streams to fail, or use their failure button, then check a real live fixture through SportSRC. Confirm its returned embed URL actually plays video on your device. Try the second source, reload and Close.
3. Check Upcoming on a selected date. Upcoming sources may remain unavailable until kickoff.
4. Publish the included Firestore rules. Sign in through Google with each real administrator account and test Admin Studio, reading users/feedback, and writing an announcement.
5. Sign in with a normal user: ensure admin tools remain unavailable and paid tiers remain locked unless a valid server entitlement is present. Restore an existing paid account to test your actual entitlement storage.
6. Confirm Kids loads and that the installed app refreshes to 8.9.0. A stale app should be hard-refreshed after deployment.

## Explicit limitations

- No SPORTSRC_KEY was available in this review. Authenticated production account/matches/detail payloads and actual playback remain unverified.
- No actual Firebase administrator credentials, live Firestore access, service-account credentials or paid checkout were available. Published rules and server entitlement writes/reads were not live-tested.
- The starting archive is 8.8.1; the deployed 8.8.2 client and saved 8.8.2 rules were used to preserve newer client behavior. Private production server source was not available. The Firebase-compatible server helpers in this package must be reconciled with any additional custom production backend changes.
- An iframe load event cannot tell the parent whether a cross-origin video is playing. The app therefore shows page-load status honestly and leaves manual source switching/fallback available.
- No region, account, subscription, paywall or DRM restrictions are bypassed. Only use sources you are authorized to view.
