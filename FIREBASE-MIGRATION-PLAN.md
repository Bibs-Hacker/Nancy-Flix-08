# NANCYFLIX → Firebase migration plan

Version: written against NANCYFLIX 8.7.2. Owner: Dev Brian + Dev Nancy.

This is the plan you asked for before any backend code is replaced. Read it once end to end, then we execute it phase by phase. Nothing in the current app is removed until a phase is tested.

---

## 0. What the current backend actually does

I inspected the live code, not the docs. The Supabase surface is smaller than it looks and every piece has a direct Firebase equivalent.

### Tables in use

| Supabase table | Columns used | What it stores | Row count today |
|---|---|---|---|
| `profiles` | id, email, name, gender, avatar, settings, is_admin, notifications, history, created_at | One row per user with all preferences and cached lists | one per account |
| `watchlists` | user_id, items (jsonb) | The whole watchlist as one JSON array | one per account |
| `announcements` | id, title, body, created_at | Admin broadcasts | small |
| `feedback` | id, user, type, rating, topic, message, read, ts | Feedback inbox and ratings | grows |
| `entitlements` | user_id, plan, status, source, expires_at | Paid access, written only by the server | one per paying user |

### Auth calls in use

`signup`, `token?grant_type=password`, `token?grant_type=refresh_token`, `user`, `logout`, `otp`, `verify` (the 6-digit code), plus an unused Google authorize helper.

### Storage

No Supabase Storage bucket is used by the app today. Avatars are stored as data URLs inside the profile row. The only storage use is server-side: match posters written to a `share-cards` bucket and read back by `api/share.js`.

### Server functions that touch Supabase

`api/entitlement.js`, `api/stripe-verify.js`, `api/welcome.js`, `lib/security.js`, `lib/share-card.js`, and the image branch of `api/share.js`. All of them use the service key to read or write on behalf of a signed-in user.

### What is not used

No realtime subscriptions, no row-level triggers, no Postgres functions, no full-text search. That is good news: there is nothing that Firebase cannot express.

---

## 1. Target architecture

```
Browser (index.html, unchanged UI)
   |
   |-- Firebase Auth  (email + password, email link, custom token for codes)
   |-- Cloud Firestore (users, watchlist, feedback, announcements, entitlements)
   |-- Firebase Storage (avatars, share posters)
   |
Vercel functions (Node, firebase-admin)
   |-- /api/entitlement   read entitlement for the caller
   |-- /api/stripe-verify write entitlement after a paid session
   |-- /api/welcome       welcome email (Resend), admin guard
   |-- /api/share         share page + poster bytes (Storage)
```

### Firestore data model

```
users/{uid}
  email, name, gender, photoURL, settings{}, createdAt, lastLogin,
  notifications[ ≤80 ], history[ ≤40 ], watchlist[ ≤500 ids ],
  entitlement{ plan, status, source, expiresAt }, isAdmin (mirror of the claim)

announcements/{autoId}   title, body, createdAt, createdBy
feedback/{autoId}        uid, name, type, rating, topic, message, read, createdAt
shareCards/{id}          storagePath, contentType, size, createdAt
```

Why one document per user instead of one collection per feature: the app already treats the watchlist, history and notifications as single JSON blobs. Keeping that shape means the UI code does not change, and one read returns the whole profile. Firestore's 1 MB document limit is far above these lists at their current caps (40 history items, 80 notifications, 500 ids).

### Auth model

| Today | Firebase |
|---|---|
| `signup` REST call | `createUserWithEmailAndPassword`, then write `users/{uid}` |
| Password login | `signInWithEmailAndPassword` |
| Refresh token | `onAuthStateChanged` + `getIdToken()` (SDK handles renewal) |
| `logout` | `signOut()` |
| 6-digit code | Custom: store a hashed code, email it with Resend, verify server-side, return a custom token |
| Google helper (unused) | `signInWithPopup(GoogleAuthProvider)` if you ever turn it on |
| `is_admin` column | Custom claim `admin: true` set from the Firebase console or an admin script |

The one real gap: **Firebase has no built-in 6-digit email code.** It offers email link sign-in, not codes. To keep the exact screen your viewers already know, the plan keeps the code box and adds a small server route that issues and checks the code, then signs the user in with a custom token. If `RESEND_API_KEY` is missing, the box falls back to Firebase's own email link and says so honestly.

### Server authentication

Every function replaces "call Supabase with the service key" with:

1. read the `Authorization: Bearer <idToken>` header,
2. `admin.auth().verifyIdToken(token)`,
3. use `admin.firestore()` / `admin.storage()` for the privileged write.

The service account JSON stays in Vercel environment variables only. It is never sent to the browser and never committed.

---

## 2. Manual work in the Firebase Console (you do this, once)

Do these in order. Each step ends with something you can see, so you know it worked.

### 2.1 Create the project

1. Open console.firebase.google.com and sign in with the Google account that should own the app.
2. **Add project** → name it `nancyflix` → continue.
3. Google Analytics: turn it off. It is not needed and it adds consent work.
4. Wait for "Your new project is ready" → **Continue**.

You should land on the project overview with a gear icon at the top left.

### 2.2 Register the web app and copy the config

1. On the overview, click the **</>** (web) icon.
2. App nickname: `NANCYFLIX web`. Do **not** tick Firebase Hosting (Vercel hosts the site).
3. **Register app**. A `firebaseConfig` block appears. Copy it; you will paste it in step 6. It looks like:

```js
{ apiKey: "AIza…", authDomain: "nancyflix.firebaseapp.com", projectId: "nancyflix",
  storageBucket: "nancyflix.firebasestorage.app", messagingSenderId: "123…", appId: "1:123…:web:abc…" }
```

These values are public by design. They identify the project; they do not grant access. Security rules and Auth settings do that.

### 2.3 Turn on Authentication

1. Left menu → **Build → Authentication** → **Get started**.
2. **Sign-in method** tab → **Email/Password** → enable the first switch → Save.
3. Optional but recommended: enable **Email link (passwordless sign-in)** too, so the code screen has a working fallback if email sending is not configured.
4. **Settings → Authorized domains**: `localhost` should already be listed. Add `nancy-flix-08.vercel.app` and your custom domain if you have one. Email links and popups refuse to run on unlisted domains.

### 2.4 Create the database

1. **Build → Firestore Database → Create database**.
2. Choose **Production mode** (rules start closed; we publish real rules in phase 5).
3. Location: pick the closest to your users, e.g. `europe-west1` or `us-central1`. **This cannot be changed later.**
4. Create.

### 2.5 Turn on Storage

1. **Build → Storage → Get started**.
2. Production mode, same region as Firestore.
3. Note the bucket name shown (usually `nancyflix.firebasestorage.app` or `nancyflix.appspot.com`). It goes into `FIREBASE_STORAGE_BUCKET`.

### 2.6 Create the service account for Vercel

1. Gear icon → **Project settings → Service accounts**.
2. **Generate new private key** → confirm. A JSON file downloads.
3. Open it in a text editor. You will copy three fields into Vercel in step 6. Never commit this file, never paste it in chat, never put it in the repo.

### 2.7 Allow the free quotas to be enough

Spark (free) gives 50k reads, 20k writes and 20k deletes per day, 1 GB stored, 10 GB/month download, and unlimited email/password accounts. For a discovery app with a few hundred users that is comfortable. No card is required.

---

## 3. Environment variables

### Browser (public, inline in `index.html`, as the Supabase anon key is today)

```js
FIREBASE: {
  apiKey: "…", authDomain: "…", projectId: "…",
  storageBucket: "…", messagingSenderId: "…", appId: "…"
}
```

### Vercel → Project → Settings → Environment Variables

Add each to **Production** and **Preview**:

| Name | Value |
|---|---|
| `FIREBASE_PROJECT_ID` | `nancyflix` |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-…@nancyflix.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | the whole `private_key` value, including `-----BEGIN PRIVATE KEY-----` and `\n` escapes |
| `FIREBASE_STORAGE_BUCKET` | `nancyflix.firebasestorage.app` |
| `RESEND_API_KEY` | optional, only for the 6-digit code email |
| `WELCOME_FROM` | optional, verified sender for the code and welcome email |

Paste the private key exactly as it appears in the JSON, quotes removed. On Vercel the `\n` sequences are turned into real newlines by the code, so do not manually reformat it.

### Local development

`firebase` client SDK works from `http://localhost:PORT` but **not** from a `file://` path. For local testing run one of these in the project folder and open the printed address:

```
python -m http.server 8080
```

Then add `localhost` to Authorized domains (already there by default).

---

## 4. Code changes, file by file

No visual change is planned. The UI keeps calling the same `SBX` object and the same `Auth` methods; only the implementation behind them changes.

### 4.1 Adapter, not a rewrite

Add a Firebase implementation next to the Supabase one and choose at boot:

```js
const CONFIG = { BACKEND: 'firebase' /* or 'supabase' for rollback */, … }
```

`window.SBX` keeps its current surface: `register, login, logout, resume, sendCode, verifyCode, profile, oauth, signOut`. Every screen that already calls these keeps working, which is what protects the UI, the animations and the football/kids modules.

### 4.2 Concrete edits

| File | Change |
|---|---|
| `index.html` head | load Firebase SDK v10 modular from `https://www.gstatic.com/firebasejs/10.x/firebase-app.js` plus `firebase-auth.js`, `firebase-firestore.js`, `firebase-storage.js` (ES module block) |
| `index.html` CONFIG | add `FIREBASE` block and `BACKEND` switch |
| `index.html` SBX | replace REST calls with SDK calls, keep the same method names and return shapes |
| `index.html` profile sync | `profiles` row → `users/{uid}` document, same fields, same debounce |
| `index.html` watchlist | `watchlists.items` → `users/{uid}.watchlist` |
| `index.html` announcements/feedback | table calls → collection calls; admin reads guarded by claim |
| `index.html` avatar picker | keep the data URL preview, upload to Storage and store the download URL (5 MB cap) |
| `api/entitlement.js` | verify ID token with Admin SDK, read `users/{uid}.entitlement` |
| `api/stripe-verify.js` | verify ID token, write `entitlement` with Admin SDK |
| `api/welcome.js` | verify ID token + `admin` claim, read user email from the token |
| `api/share.js` | poster bytes from Storage bucket instead of Supabase bucket |
| `lib/security.js` | replace the "who is this token" Supabase lookup with `verifyIdToken` |
| `lib/share-card.js` | Storage path helper for the new bucket |
| new `api/auth-code.js` | issue and verify the 6-digit code, mint a custom token (only if you keep the code box) |
| new `firestore.rules`, `storage.rules` | security rules, phase 5 |
| new `package.json` | `{"dependencies":{"firebase-admin":"^12"}}`, no build script, so Vercel installs it for the functions only |

Serverless count after the change: 11 with `api/auth-code.js`. Still inside the free limit of 12.

### 4.3 What stays exactly as it is

Movie catalogue, trailers, football module, kids corner, focus sounds, share posters, service worker, install flow, themes and animations. None of them talk to the database except to read the signed-in user.

---

## 5. Security rules (draft, will be published in phase 5)

`firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }
    function isAdmin()  { return signedIn() && request.auth.token.admin == true; }

    match /users/{uid} {
      allow read:   if signedIn() && (request.auth.uid == uid || isAdmin());
      allow create: if signedIn() && request.auth.uid == uid
                    && request.resource.data.email == request.auth.token.email;
      allow update: if signedIn() && request.auth.uid == uid
                    && !request.resource.data.diff(resource.data).affectedKeys()
                         .hasAny(['isAdmin', 'entitlement']);
      allow delete: if isAdmin();
    }

    match /announcements/{id} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /feedback/{id} {
      allow create: if signedIn()
                    && request.resource.data.uid == request.auth.uid
                    && request.resource.data.message is string
                    && request.resource.data.message.size() <= 2000;
      allow read, update, delete: if isAdmin();
    }

    match /shareCards/{id} {
      allow read: if true;
      allow write: if false;   // server only
    }
  }
}
```

`storage.rules`:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /avatars/{uid}.{ext} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == uid
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
    match /share-cards/{file} {
      allow read: if true;
      allow write: if false;   // written by /api/share with the admin SDK
    }
  }
}
```

Two rules carry the security weight: a user can only touch their own `users/{uid}`, and nobody can grant themselves `isAdmin` or `entitlement` from the browser. Paid access is written only by the server, exactly as today.

---

## 6. Existing data

Firestore cannot import Supabase password hashes — Supabase does not export them. Two honest options:

**Option A, recommended: accounts re-activate with one password reset.**
1. Export `profiles` and `watchlists` to JSON with the script I will generate (runs locally with your service key).
2. Import them into Firestore keyed by email, holding the data in a `pending` document.
3. When a user signs up with the same email, the app claims their pending data automatically.
4. Each existing user sets a password once through "Forgot password". Everything else (watchlist, history, settings, avatar) is already there.

**Option B, temporary bridge: keep Supabase Auth alive only for password checks.** First successful Supabase login creates the Firebase account and copies the data. This hides the reset from users but keeps a second system running, which is more work and more risk. I would only do this if you have many active users and cannot ask them to reset.

Either way the Supabase project is kept read-only for at least 30 days so a mistake is reversible.

---

## 7. Execution phases and checkpoints

Each phase ends with something you can test on your own phone before we continue.

| Phase | Work | Done when |
|---|---|---|
| 0 | Freeze: back up the repo, tag the current deploy, keep Supabase project | you can restore 8.7.2 in one click |
| 1 | Firebase project, Auth, Firestore, Storage, config values | console shows all three products enabled |
| 2 | Client adapter for Auth only, plus guest path untouched | register, log in, log out, reload keeps you signed in |
| 3 | Profile, watchlist, settings, notifications, history on Firestore | adding a film on the phone shows on the laptop after reload |
| 4 | Avatars to Storage, feedback and announcements to collections | new avatar survives a reload; feedback reaches admin |
| 5 | Rules published and tested with a second account | account B cannot read or write account A |
| 6 | Server functions on Admin SDK, entitlement and welcome email | a test payment unlocks, a refund locks |
| 7 | 6-digit code route (or email link fallback) | code arrives and signs in |
| 8 | Data import and cutover, Supabase set read-only | old watchlists appear for existing users |
| 9 | Full regression: movies, trailers, football, kids, share, focus, install, offline | your phone passes the checklist below |

### Regression checklist (phase 9)

- New account: register, confirm, land in the app, reload, still signed in
- Password login, wrong password message, forgot password email
- Watchlist add/remove on two devices
- History and Continue Watching
- Settings change (theme, language, sounds) persists after reload
- Avatar upload and display
- Feedback submit, admin inbox receives it
- Announcement published by admin reaches a normal user
- Premium entitlement read, test unlock, expiry
- Share a fixture to WhatsApp: page opens, poster appears
- Kids channel and cartoon open
- Football live/upcoming and the free-schedule fallback
- Install app from Chrome, open from the app drawer
- Airplane mode: offline panel, retry after reconnect

---

## 8. Risks and how they are handled

| Risk | Handling |
|---|---|
| Password hashes cannot be exported | one-time password reset, option B if unavoidable |
| Rules too loose | test with two real accounts before cutover; rules are deny-by-default |
| Service account leaked | key lives only in Vercel env; rotate immediately if it ever appears in a commit |
| 1 MB document limit | lists are capped in code (40 history, 80 notifications) |
| Email deliverability | Resend or your own SMTP; Firebase's built-in sender is fine for testing only |
| Free quota | Spark limits are per day; reads are batched to one profile read per session |
| Vercel function limit | 11 functions after the change, under the 12 limit |
| Rollback | `BACKEND: 'supabase'` switch keeps the old path one line away until phase 9 passes |

---

## 9. What I need from you to start

1. Create the Firebase project (section 2.1–2.2) and send me the **public** `firebaseConfig` block. It is safe to paste.
2. Do **not** send the service account JSON. Paste those three values straight into Vercel when we reach phase 6.
3. Confirm which data option you want: A (password reset) or B (temporary Supabase password bridge).
4. Confirm whether to keep the 6-digit code box (needs Resend) or switch to Firebase email-link sign-in.

With those four answers I start phase 2 and deliver a tested build after each phase, not one big drop at the end.
