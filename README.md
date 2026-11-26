# Current release: NANCYFLIX 8.8.2

Start with **docs/UPDATE-8.8.2.md** for deployment, the four verified administrators, Firebase rule publication and Kids endpoint checks. Older release documents below are historical and do not override the current guide.

# NANCYFLIX v8.8.1 — trailer and kids fix

Start with **docs/UPDATE-8.8.1.md** for the deployment checklist. The ZIP contains a folder called `nancyflix-v8.8.1`; upload its CONTENTS to your repository root, not the folder itself.

## Fixed in this release

- The server was dropping `append_to_response`, so every film detail request omitted its trailers, credits and similar films. The proxy now forwards only approved sections.
- The app also fetches `/videos` separately if a detail response lacks videos, including cached responses from an older deployment. English and original-language lookup are tried.
- The player includes retry, a selector for alternate trailers/clips, and a direct YouTube link. Embedding uses an explicit referrer policy and origin. Actual playback remains subject to YouTube and regional restrictions.
- Firebase Google sign-in is visible above the email form, with a version label. The sign-in screen appears while Firebase initialises rather than staying blank. Code verification now routes to Firebase instead of the old Supabase OTP method.
- The default kids library is now official Tom & Jerry Gokko, The Tom and Jerry Show, Bluey and Gumball videos/collections, plus links to current Bluey, Peppa Pig and Gumball channel uploads. Live kids channels remain below the library.
- No random Internet Archive uploads, no 1950s-only default, no paid video API. Full seasons are not supplied; publishers choose which official videos are free.

## Verified and not verified

The live site served v8.7.2 on 26 November 2026. Its movie detail omitted videos, while its videos endpoint returned 27 for Inception and one for Accidental Partners (the film in the screenshot). Local browser tests used those real responses and confirmed that this build resolves and displays the trailer player, with working selection/retry/fallback controls. Third-party iframe playback was blocked in the isolated test; successful YouTube playback on your phone is NOT yet verified.

Google button, guest access, code routing, kids search/filter/player controls and short-phone layout passed isolated browser checks. No real account was created, no email was sent and no Firebase data was modified. Your Firebase setup has not been independently verified.

Premium/Stripe, server share uploads and some server authentication helpers still depend on Supabase. This is not a completed end-to-end server migration. Avatar Storage integration is present as a helper; the profile UI still uses inline images. Do not remove existing server keys yet.

## Original Firebase setup guide

`docs/FIREBASE-SETUP.md` remains included, with corrections at the top. Never upload a service account JSON or private key. Public Firebase web config is safe to publish; database permissions are enforced by the rules.

Dev Brian + Dev Nancy
