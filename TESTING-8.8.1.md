# Verification — NANCYFLIX 8.8.1

Date: 26 November 2026

## Confirmed live findings

- The production domain returned v8.7.2 and no Google sign-in button.
- `/api/tmdb?path=/movie/27205&append_to_response=videos,credits,similar` returned details without `videos`.
- `/movie/27205/videos` returned 27 video records for Inception.
- Accidental Partners resolved to TMDB movie 1632181; its videos endpoint returned one record.

## Server checks passed

- Recognised appended sections are forwarded; unknown sections are removed.
- Caller-supplied API keys do not override the server credential.
- Original-language video queries are permitted; invalid paths are rejected.
- Official kids catalogue returns three Tom and Jerry cards, two Bluey cards when searched, and no repeated second page.

## Isolated Chromium checks passed

- Google, email-link and guest controls visible; version label 8.8.1.
- Boot works while Firebase CDN is blocked; no blank waiting screen.
- Email-code dispatch uses Firebase proxy, not old Supabase OTP.
- Guest enters app.
- Using the real captured live responses, Accidental Partners resolves a linked video and creates the YouTube iframe instead of the empty state.
- Inception offers 27 alternate video choices; changing selection updates iframe; retry reloads lookup.
- Explicit iframe referrer policy and direct YouTube links are present.
- Kids renders eight official videos/collections/channel cards and preserves 12 live-channel cards.
- Tom and Jerry filter, Bluey search, playlist modal and Escape close work.
- Missing-trailer state offers a search link without inventing a video.
- Auth card top is not clipped at 390×844 or 320×568; short phones scroll to guest access.
- No JavaScript page errors in the isolated run.

## Reviewed render limitations

The authentication and kids layouts were inspected. Trailer and cartoon iframe content was intentionally blocked in isolated testing; the iframe displays a blocked-page placeholder, not a successful-playback image. It is not evidence that the publisher player works or fails on the user's phone.

## Not verified

- No deployment was performed or production domain changed.
- No successful real Google/email sign-in, email delivery, Firestore write or cross-device sync was attempted.
- YouTube playback, regional availability, live channel streams and paid entitlements were not validated.
- Firebase rules were supplied and inspected but not compiled by a Firebase emulator or published by the assistant.
- Existing v8.7 test reports describe older checks and must not be interpreted as repeated end-to-end tests for this release.
