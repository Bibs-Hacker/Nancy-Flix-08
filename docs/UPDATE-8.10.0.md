> **Deployment repair:** follow root **START-HERE.txt** first. API implementations now live in `lib/handlers`; only `api/index.js` belongs under `api`. Delete old API files rather than merging them. Framework: Other; build: `npm run build`; output: `public`; Node: 24.x. App version remains 8.10.0.

# NANCYFLIX 8.10.0 — smarter discovery and correct football tabs

## What this update adds

- Upcoming requires a valid kick-off strictly in the future and an upcoming/scheduled status. Live, finished, postponed, cancelled, suspended, abandoned and stale not-started fixtures are excluded. A missing status can only imply a future schedule, never a guessed live score or final result.
- Live and Finished use provider status evidence. Primary score tabs, alternative schedule tabs and SportSRC fallback tabs share the same status vocabulary. Upcoming lists expire locally every 30 seconds without extra provider requests.
- Kick-offs and date selection use East Africa Time (Africa/Nairobi, UTC+3), independent of the visitor's phone timezone. SportSRC's UTC date requests cover both UTC days overlapping the selected EAT day, then trim and deduplicate the results.
- Movie suggestions appear as you type. Cached metadata is matched immediately; remote search follows after a short debounce. Suggestions include title, available year, poster and genres. Typos, partial words, original-language titles and learned TMDB alternative titles are supported. Keyboard arrows, Enter and Escape work. Mobile now has an accessible search button.
- Trending Movies and Trending Football use recorded NANCYFLIX entity searches, not invented counts. They clearly distinguish community activity from activity on this device. The existing TMDB Trending rail remains available separately.
- Movie recommendations combine viewed/opened movies, genre affinity, popularity and community searches. Football recommendations rank confirmed live/future fixtures by team affinity and search popularity.
- Verified administrators get separate movie, match, team and submitted-query tables with Daily (today EAT), Weekly (last 7 EAT dates), and Monthly (last 30 EAT dates) selectors, totals and a daily chart.

This is metadata-based matching and ranking, not a paid generative-AI service. It does not guarantee recognition of every typo or an obscure title before its metadata/aliases are learned. A first cold search may need the movie service to respond.

## Deploy this full update

1. Download and extract the ZIP. Back up your current project first.
2. Upload the **contents** of `nancyflix-v8.10.0` to your existing GitHub project root. Replace the old files, including `index.html`, `api`, `lib`, `assets`, `sw.js`, `version.json`, `package.json`, and the included rules. Do not create an extra nested project folder. Keep your existing Vercel environment variables.
3. In Vercel, use Node.js **24.x** and your existing deployment settings. Redeploy and wait for **Ready**, then ensure that deployment is **Production**.
4. In Firebase Console → Firestore Database → Rules, publish the included **firestore.rules**. Uploading the project does not publish Firebase rules. The new aggregate collection is server-only.
5. Open the app, refresh, and confirm **8.10.0**. If an installed PWA still shows the old release, close every app tab and reopen it after the deployment finishes.
6. Sign out and sign in with a verified administrator account to test Admin Studio → Analytics.

Keep `.env`, service-account JSON, passwords, API keys and Firebase private keys out of GitHub and chat. No new paid AI, Firebase Storage/Blaze upgrade, premium sports endpoint or domain purchase is required. Free hosting/provider quotas still apply.

## Optional cross-device community analytics

Without server Firestore credentials, suggestions and recommendations work locally and the admin panel explicitly reports **DEVICE-ONLY**. To aggregate verified signed-in users across devices, add these existing-project credentials **only** in Vercel → Settings → Environment Variables:

- `FIREBASE_PROJECT_ID`: your existing Firebase project ID.
- `FIREBASE_CLIENT_EMAIL`: the service-account client email for that project.
- `FIREBASE_PRIVATE_KEY`: its private key, preserving actual line breaks or escaped `\n` line breaks.

Use an existing service account authorized for Firestore, or obtain one in Firebase Project Settings → Service accounts. Do not put the downloaded JSON or its private key into the app folder. Redeploy after adding variables. The server library authenticates users with verified identity tokens; profile flags and typed email addresses do not grant access.

**Verify after deployment:** sign in as a normal verified user, submit a search and select its movie; then sign in as an administrator and check the Analytics scope changes from DEVICE-ONLY to community. Aggregates may take up to about 10 minutes to refresh. If Firebase or hosting requires payment, stop and keep the working device-only mode rather than upgrading billing.

## Counting and privacy

- Typing each character does not generate a community query event. Submitted queries, selected titles and matching football teams/matches are counted separately. Views/openings are separate from searches; they are not proof the video played.
- The same user's same entity/action is deduplicated for 10 minutes. A verified user can contribute at most 100 events per EAT day. Eight bounded daily shards limit data size; capacity/rate limits can omit additional contributions. This is a search-popularity indicator, not exhaustive visitor analytics.
- Guests and users who disable sharing remain device-only. Settings → Smart discovery privacy controls sharing and clearing local discovery preferences.
- Raw queries are administrator-only. Public trend responses expose aggregate entities, not emails, user IDs, daily actor hashes or raw queries. Labels containing obvious email addresses, URLs or long phone-like numbers are rejected; this filter is not a guarantee that every possible personal detail can be identified.
- Local movie and team preferences are account-scoped on that browser. They are not synchronized across devices. Clearing local discovery history does not erase already aggregated community counts or existing watch history.
- Daily/weekly/monthly selections are EAT calendar windows, not all-time totals. “Monthly” means the last 30 dates, not the named calendar month.

## Preserved behavior and known limits

The original providers, alternative resolver, SportSRC fallback, player source switching, Kids catalogue, Free/Plus/Premium/Super checks, design tokens and verified-admin boundary remain. The four administrator addresses remain:

- bridah888@gmail.com
- devbriannova@gmail.com
- merabnoels@gmail.com
- achiengnancy65@gmail.com

Provider status data can be absent or stale. An unknown/past scheduled match is deliberately not called Live or Finished. Fixture windows are limited by each free provider; this release does not fabricate absent scores or schedules. Trending football needs an available provider fixture matching the activity recorded. Provider pages loading is not proof of video playback or authorization to view a stream.

Local tests used controlled provider responses. Real Google sign-in, plan verification, live video, provider keys and cloud analytics must still be checked in your deployment. See **TESTING-8.10.0.md**.
