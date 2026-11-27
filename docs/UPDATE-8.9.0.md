# NANCYFLIX 8.9.0 — SportSRC fallback and verified admin roles

## What changed

- The deployed 8.8.2 client is the starting point. Kids catalogue fallbacks and Free / Plus / Premium / Super access checks are retained.
- Your existing football score API and alternative schedule stay primary.
- SportSRC is called for a specific fixture only when the original resolver fails or returns no valid channel, or when you click **Existing streams failed · try SportSRC** in the original player. Cross-origin video failures cannot reliably be detected automatically; a page loading is not proof of playback.
- When the entire original schedule fails or has no valid stream channels, a fallback list offers Live, Upcoming and a date selector.
- The bridge uses account, matches, detail and stream endpoints that the provider documents as available to free accounts. Premium-only score/statistics endpoints are not used.
- Real HTTPS embed URLs from the provider are fed into the existing NFAltFootball player. Source switching, reload, opening separately, venue/referee details when supplied, and a 12-second player-page timeout are included. No stream is downloaded, re-hosted, fabricated or proxied.
- Settings now includes provider diagnostics and, for eligible signed-in administrators, a verified-session refresh and verification-email action.

## Deploy — no billing upgrade required

1. Back up your current GitHub project. Keep all existing Vercel environment variables. Do not upload a `.env`, service-account JSON or API keys to GitHub.
2. Extract the ZIP. Upload the **contents** of the `nancyflix-v8.9.0` folder into your existing project root, including `api`, `lib`, `icons`, `audio`, `docs`, `sw.js`, and `kids-catalogue.json`. Do not upload the enclosing folder as an extra nested directory.
3. If you already have a SportSRC key, add **SPORTSRC_KEY** under Vercel → Project → Settings → Environment Variables. Enable it for Production, and for Preview only if you need preview tests. Paste the key value, not the header name. Do not share the key in chat. If you do not have one, the provider's docs direct you to `https://my.sportsrc.org`; use a free plan only if available to you. Do not pay to enable this update. Without a key, the app retains existing providers and shows a clear fallback-not-configured message.
4. Redeploy and wait for Vercel **Ready**. Ensure it is your Production deployment. A new environment variable does not affect an older deployment without redeploying.
5. Open Firebase Console → your project → Firestore Database → **Rules**. Replace the rules with the included `firestore.rules`, then **Publish**. Uploading to Vercel does NOT publish Firebase rules.
6. Open Firebase Authentication → Sign-in method and enable Google if not already enabled. Under Settings → Authorized domains, check your current Vercel/custom domain.
7. Sign out of NANCYFLIX, hard-refresh, and sign in with Google using one of the four exact administrator addresses below. Check the app shows **8.9.0**. If you use email/password instead, verify the email first, then Settings → **Refresh verified admin session**.
8. Run Settings → **Check providers**. SportSRC must show a verified account before expecting it to resolve sources.

Do not enable Firebase Storage/Blaze, buy a domain, or change your existing score-provider keys for this release. The existing server helpers retain their own optional email/payment settings; no new paid integration is required.

## Four administrators — verified ownership only

- bridah888@gmail.com
- devbriannova@gmail.com
- merabnoels@gmail.com
- achiengnancy65@gmail.com

Role checks now agree across the client, Firestore rules and server authentication. The app reloads the Firebase user and requests fresh ID-token claims before granting the client role. A profile flag such as `is_admin:false` is not the source of authority. An unverified email, failed token refresh, guessed address or edited local storage cannot authorize database/server admin operations.

The supplied older 8.8.1 rules required a custom admin claim and its server helper recognized only older Supabase owners. Those are incompatible with the newer four-email Firebase client. The included release resolves those mismatches while retaining verified ownership. This identifies code/configuration inconsistencies, not proof of what is currently published in your Firebase project.

The rules also prevent users changing their saved profile email to impersonate an administrator in the account list. Role labels there show configured administrator eligibility; actual access still depends on that user's authenticated verified identity.

## Paid-plan preservation

- Server identity checks accept signature-verified Firebase ID tokens and retain verified Supabase authentication for existing accounts.
- Firebase entitlements are looked up server-side in `entitlements/{Firebase uid}` when server credentials are configured. Verified-email lookup in an existing configured Supabase entitlement table remains a fallback.
- Stripe checkout ownership and server-derived tier checks remain enforced. New Firebase checkout grants are written to the UID-owned entitlement document.
- Existing Firebase server credentials (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) are needed for server-side entitlement database writes/reads. Do not expose these to the browser. A client-side Firebase API key is not a substitute for a service-account private key.
- No database migration or payment flow was exercised against your real account. If your existing production backend has custom entitlement storage not represented in the uploaded 8.8.1 package, reconcile it before deployment. Back up custom backend changes rather than overwriting them blindly.

## Verification and limits

Read TESTING-8.9.0.md. Local API and browser tests use controlled responses, not your provider credentials. Real SportSRC account/match/detail responses, live video, real administrator sign-in, published rule behavior and payment restoration still need your deployment checks.

Provider documentation checked: `https://api.sportsrc.org/v3/?type=docs`.
