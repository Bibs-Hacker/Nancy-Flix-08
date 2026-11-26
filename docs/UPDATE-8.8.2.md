# NANCYFLIX 8.8.2 — Kids catalogue and permissions

## Confirmed cause on the public site
Checked 26 November 2026: the public domain served version 8.8.1. `/lib/kids-catalogue.json` returned HTTP 404, but the browser depended on it. `/api/kids?cat=cartoons` returned HTTP 200 with 24 older entries that do not match the official collection schema. This is a deployment/data-path problem, not evidence that your phone is offline.

## Deploy in this order
1. Extract the ZIP. Put the contents of its `nancyflix-v8.8.2` folder into your existing GitHub repository root. Replace the full application, not just index.html. Keep `api/`, `lib/`, `icons/`, `audio/`, `docs/`, `package.json`, `vercel.json`, `sw.js`, `version.json` and the NEW root `kids-catalogue.json` together.
2. Remove old `api/share-image.js`, `api/share-card.js` and `api/lib/` if left from older releases. This package has 11 direct API function files; it does not add another function for fallback loading.
3. Vercel: wait for the new deployment to say Ready. Open it, then promote it to Production if your normal domain still serves the old release.
4. Confirm the sign-in card says `v8.8.2 · Firebase sign-in`. Close and reopen the installed app or test a private browser tab if it still shows an older version. Do not erase your saved data just to refresh.
5. Firebase Console → Firestore Database → Rules. Replace the rules with the included `firestore.rules`, then Publish. This is REQUIRED for the four admins to read users, manage announcements and read feedback. Updating GitHub does not publish Firebase rules automatically.
6. Sign out and sign back in with Google using one of the four administrator emails below. Email/password users must verify their email first. Google sign-in verifies ownership without asking you to run a claim-provisioning script.
7. If server-side admin helpers, membership restore or Stripe verification are needed, configure the existing Firebase server variables in Vercel: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`. Project ID is `nancy-flix-a9615`; the other values come from your Firebase service-account credentials. Keep these in private host settings ONLY, never GitHub or the browser. They are not needed for the Kids endpoint. Re-deploy after changing host variables.

No billing or Storage upgrade is required for this cartoon/permissions update. Do not enable Blaze merely for this fix. Payment checkout still requires your existing payment-provider setup; this release does not create a merchant account or take payment.

## Configured administrators
- merabnoels@gmail.com
- bridah888@gmail.com
- achiengnancy65@gmail.com
- devbriannova@gmail.com

These exact emails are mirrored in the application, server verifier and Firestore rules. Admin recognition requires authenticated, verified email ownership. A profile field, display name or a typed email is not proof. The previous `agollanancy` entry is no longer an administrator. Admins get complimentary Super features; normal accounts do not.

## Kids endpoint and fallbacks
Primary: `GET /api/kids?cat=cartoons&page=1`. Expected: HTTP 200 JSON, `ok: true`, `version: "8.8.2"`, `source: "official"`, eight `items` with `kind`, `cats`, `page` and the existing official publisher links.

Other checks: `/api/kids?cat=tom` returns three Tom & Jerry cards; `/api/kids?q=Bluey` returns two cards; page 2 returns an empty list without duplicated content. Non-GET methods return 405. No Kids API key, paid video API, Firebase login or new host variable is required.

Fallback: `/kids-catalogue.json` at the repository root. If the API is down or returns the old schema, the app uses this file. If that also fails, the same eight official cards are built into the app. Search and filters work in each path. Playback still requires internet and the publisher's permission; offline cards do not mean downloaded episodes. All eleven live kids station cards remain.

## Restored plans
| Feature | Free / Guest | Plus | Premium | Super / Verified admins |
|---|---|---|---|---|
| Theme choices | Dark, Light, Dim | 8 themes, excluding Amazing | All 9 | All 9 |
| Trailer queue* | 3 | 60 | Unlimited | Unlimited |
| Watch history* | 15 | 60 | 200 | 300 |
| Poster download library* | 10 | 50 | Unlimited | Unlimited |
| Alert sounds | Soft, Silent | + Chime | + Pop | All |
| Rich alerts / calendar export | No | No | Yes | Yes |
| TV aggregation | Free-labelled channels; all Kids | All listed channels | All listed channels | All listed channels |
| Admin Studio / users / feedback management | No | No | No | Verified admins only |

*Existing account-required actions still require sign-in. Poster downloads are artwork, not movie files. Movie discovery, official trailers, TV channels marked Free, all Kids channels, fixtures and match posters remain free. The existing PLUS-labelled TV aggregation entries require Plus or above; this is an app access tier, not a claim that the publisher stream is exclusive licensed content. A UI subscription cache is not proof of purchase: a normal account must restore a valid server entitlement after sign-in.

Firebase memberships are read/written server-side in `entitlements/{Firebase UID}`. Browser writes are denied by the rules. Valid plans are plus/premium/super, with active/trialing status and a valid future expiry (or an explicitly non-expiring grant). Stripe ownership and metadata are checked before a grant is saved. Legacy Supabase sessions remain supported for rollback; existing old Supabase entitlements are NOT automatically copied to Firebase. Existing paid users from that backend need a trusted server migration or verified checkout restore, not a local browser unlock. Subscription cancellation/renewal still needs your existing webhook/lifecycle setup; this patch does not add a Stripe webhook.

## Phone checklist
- Kids shows Tom & Jerry, Bluey and Gumball; filters/search work, live kids cards remain below.
- Free user: Rose and Amazing show a lock and cannot be selected; Dark/Light/Dim work.
- Plus: Rose works, Amazing remains locked. Premium/Super: all themes work.
- A normal user cannot enter Admin Studio or use admin tools.
- Each configured administrator: Google sign-in → admin badge / Studio / Super extras, after publishing the rules.
- Accidental Partners and Inception trailers still appear; use Open on YouTube if a publisher blocks embedding.

## Verification limits
Local endpoint tests, isolated browser tests and mocked Firebase/Stripe tests passed. Real Google login, Firebase rule publication, actual production entitlement writes, payment lifecycle and video/TV playback must be checked after you deploy. No production accounts, rules, credentials or subscriptions were modified here.
