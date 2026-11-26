# NANCYFLIX v8.7.0 — verification report

Build date: 25 November 2026.

## What was tested for this update

- Kids corner: the tab opens, the live children's channel list renders, a channel opens in the player, a cartoon card opens the archive player, and the search box filters the library.
- Kids reachability: the header Kids button and the menu entry both land on Kids with the Kids tab selected. A regression found during testing — the football view finishing its load after the tab switch and overwriting the Kids page — was fixed by making every football renderer return early when the active tab is not football; the guard is retested by opening Kids while the scores view is still loading.
- Share links: the share action uploads a 1080 x 1080 poster, receives a link to the `/s/` page, and that page returns Open Graph title, description and image tags. When the upload is unavailable the share action now returns the same `/s/` page with the match details in the query string, so WhatsApp still shows the default NANCYFLIX card instead of bare text.
- Upcoming fixtures: dated-window requests build the schedule when the free plan rejects next/last, and the alternative feed fills the list when the primary feed returns nothing. An empty result with all past kickoffs falls back to the unfiltered list instead of showing a blank card.
- Focus and sleep: eight and seven distinct audio files, each loaded only when its own option is chosen; no shared track.
- Channels: 39 channels listed, all free tier, grouped by category, with no paid-only entries.
- Layout: card widths and page scroll width at 320, 390, 768 and 1366 pixels. No horizontal scrolling after adding the header Kids button.
- Version display: splash, footer and `version.json` all report 8.7.0.

## Checks executed

- `node --check` on every JavaScript file in `api/` and on each inline script block in `index.html` (33 blocks, 0 syntax errors).
- Server test harness: football fixtures normalised, quota and plan errors mapped to the free-schedule fallback, share page tags generated for id and query links, image route rejects unknown ids.
- JSON validation for `version.json` and `manifest.webmanifest`; service worker cache name matches 8.7.0; every referenced icon, audio file and `og-share.jpg` present.
- Headless Chromium runs on a local copy with mocked network: guests, the shared `/s/` page, mock share upload, mock archive items, and screenshots reviewed for overlap, clipping and blank areas.

## Important limits

The tests ran against a local copy with mocked feeds and a mocked share upload. There was no deployment, no real WhatsApp preview fetch, no real stream playback and no real payment. WhatsApp and other messengers cache previews, so an already-shared link can keep an old card until that cache expires. Streams are official public feeds and may be offline or country-limited; the cartoon library is the Internet Archive public collection, not a licensed catalogue.

## Previous record

The v8.6.1 report is retained below as history; it is not a claim that every check was repeated for 8.7.0.

# NANCYFLIX v8.6.1 — verification report

Build date: 24 November 2026.

- Focused headless Chromium checks: quota errors override a mocked remaining count of 49; refresh does not issue another exhausted-score request.
- LIVE indicator and button containment at viewport widths 320, 390, 768 and 1366 pixels.
- Alternative player opens, switches channels and closes via Escape using mocked player pages.
- Countdown inset bounds, hover pause, resume, expiry and permanent-toast behaviour passed.
- Zero-goal poster is 1080 x 1350 RGBA with transparent corners; canvas text contains no "No goals" section.
- Server tests: 60 football fixtures normalised; player redirect, score caching and quota cooldown passed.
- Syntax checks passed for 30 inline script blocks and 10 bundled JavaScript files; ZIP integrity checked.
