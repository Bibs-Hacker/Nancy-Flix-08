# Testing 8.10.0

## Automated checks run here

Commands (Node 16 local runner; Vercel target is Node 24):

```
node tests/discovery.test.js
node tests/football.test.js
node tests/sportsrc.test.js
```

Also checked:

- JavaScript syntax for every app script, server helper and inline script, plus JSON parse checks.
- No missing local assets referenced by `index.html`.
- Headless Chromium at desktop 1280×900 and mobile 390×844 using mocked TMDB/football/SportSRC responses (no real keys). Checks included: partial + typo + alternative-title suggestions, stale suggestion guard, suggestion metadata, native results page, rapid primary tab switching, primary Live/Upcoming/Finished, alternative schedule tabs, SportSRC tabs, EAT midnight boundary, admin daily/weekly/monthly tables, trending/recommendation sections, mobile search focus/containment and zero page errors.

What the automated checks prove: the shipped client logic filters and renders correctly for the controlled cases, the EAT boundary and date conversion behave as intended, duplicate/stale responses are ignored, and the analytics endpoint enforces sign-in, admin access, validation, deduplication and public-field stripping. All server tests are mocked.

## Manual checks still required in your deployment

1. Open `/version.json` and confirm `8.10.0`, then hard-refresh the app.
2. Sign in with Google as one of the four verified administrators. Confirm Admin Studio appears and Analytics shows Daily/Weekly/Monthly without an error.
3. Search a misspelled movie on a phone and use the suggestion dropdown; confirm the movie opens in your existing player.
4. Football → Upcoming: confirm only future matches with a kick-off time appear, and every time ends in **EAT**. Compare one kick-off with a trusted EAT listing. Repeat for Live and Finished. Switch tabs quickly.
5. Check the alternative schedule and SportSRC fallback tabs. Tap a match and confirm existing source switching/reload works.
6. With Firebase server credentials configured, submit one search and confirm community totals appear for an administrator after the cache window.

Report exactly which step fails, on which device and what the screen or console shows. A provider/Google/video failure is not proven by a mocked test.

## Not tested here

- Real TMDB, API-Football, SportSRC and alternative-schedule responses.
- Real Google sign-in, verified-email delivery, plan entitlements and Stripe status.
- Real video playback, broadcaster geo-blocks, DRM pages or provider rate limits.
- Firestore credential configuration, live rules publication and cross-device analytics.
