# Corrections and current release notes (8.8.1)

Read `UPDATE-8.8.1.md` first. The guide below was written for 8.8.0 and describes some planned functionality too broadly:

- Firebase Auth and client Firestore routing are integrated, but a successful sign-in, profile write and cross-device library sync still need live user testing.
- The 6-digit code does NOT automatically turn into an email link. If its server settings are missing, use the separate email-link button. Firebase does not provide native 6-digit codes.
- Admin tools require a server-granted custom claim. The owner email list does not grant database permission.
- Avatar upload exists as a helper, but the current profile UI still saves inline images; Storage upload is not wired end-to-end.
- Firebase Storage requires the Blaze billing plan under current Firebase requirements. Do NOT enable billing or buy a domain just for this update. Trailers, official cartoon links, Firebase Auth and Firestore within free limits do not depend on Storage setup. Resend sending to arbitrary users requires a verified sender domain; without one, use Firebase email/password, Google or email links instead.
- Old users may create Firebase accounts again, but saved data is NOT automatically imported. A bridge or data-import script has not been shipped.
- If you paste Storage rules, use the included corrected `storage.rules` matching a whole filename, not a partial wildcard.

---

# NANCYFLIX on Firebase — setup walkthrough (v8.8.0)

This build signs people in with **Firebase**, keeps their library in **Firestore**, and puts pictures in **Firebase Storage**. Supabase stays switched on only for the paid-plan check (Stripe) and the match poster upload on the server, so nothing you already paid for breaks. If anything goes wrong you can go back with one line — see the last section.

Do these in order. Each step says exactly what to click.

---

## 1. Firestore (the database)

1. Open https://console.firebase.google.com and pick the project **nancy-flix-a9615**.
2. Left menu → **Build → Firestore Database** → **Create database**.
3. Choose **Production mode** (rules are pasted in step 2) and the location closest to your users, for example `europe-west1` or `nam5`. This cannot be changed later.
4. Wait for "Creating database" to finish.

Nothing else to do here — the first sign-in creates `users/{uid}` and `watchlists/{uid}` automatically.

## 2. Paste the security rules

The two files `firestore.rules` and `storage.rules` in this folder are the exact rules this build expects.

**Firestore**

1. Firestore Database → tab **Rules**.
2. Delete what is in the box, paste everything from `firestore.rules`, press **Publish**.

**Storage**

1. Left menu → **Build → Storage** → **Get started** → Production mode → same location → Done.
2. Tab **Rules** → paste everything from `storage.rules` → **Publish**.

What the rules give you, in plain words:

- A person can read and edit only their own profile and their own saved list.
- Nobody can make themselves an admin or unlock Premium from the browser.
- Announcements are readable by everybody and writable only by an admin.
- Feedback can be added by the person who wrote it; only an admin can read the inbox.
- Storage accepts an avatar only from its owner, only an image, only under 5 MB.

## 3. Turn on the sign-in methods

Left menu → **Build → Authentication** → **Get started**.

1. Tab **Sign-in method**.
2. **Email/Password** → Enable.
   - Inside the same panel, also enable **Email link (passwordless sign-in)**. That is what the "Email me a sign-in link instead" button uses.
   - Save.
3. **Google** → Enable → pick a support email (your own) → Save.
4. Tab **Templates** (optional): change the sender name to **NANCYFLIX** so the emails look like yours.

### Authorised domains (this is the one people forget)

Authentication → tab **Settings** → **Authorized domains**. These must be listed:

- `nancy-flix-08.vercel.app`
- `localhost` (already there, only for testing on your own machine)
- `nancy-flix-a9615.firebaseapp.com` (already there)

If your live address is not in the list, Google sign-in and email links stop with "This address is not authorised". Add it and save.

## 4. Make the site address known to Firebase

Firebase emails contain a link that returns people to your site. In the app that address is taken from the page itself, so it always matches wherever it is deployed — no setting needed. If you ever move to a custom domain, add the new domain to the authorised list above and the emails follow automatically.

## 5. Optional but recommended: the 6-digit email code

Firebase has no built-in 6-digit email code, so this build creates it: the page asks `/api/auth-code`, the function makes a random code, stores only a hash of it in Firestore for 10 minutes, emails it, and swaps it for a real Firebase sign-in when it matches. Without the settings below the route answers "not configured" and the app quietly uses the email-link button instead — sign-in still works.

### 5a. Service account key (server only)

1. Firebase console → gear icon → **Project settings** → tab **Service accounts**.
2. Press **Generate new private key** → **Generate key**. A `.json` file downloads.
3. Open it in Notepad. You need three values: `project_id`, `client_email`, `private_key`.

**Never** paste this file into the website, GitHub, or a chat. It is a master key.

### 5b. Email sending (Resend, free tier)

1. Sign up at https://resend.com (free: 100 emails a day, no card).
2. **API Keys → Create** → copy the key (starts `re_`).
3. Until you add and verify your own domain, Resend only delivers to the address you signed up with. That is enough to test. To send to everybody, add your domain in Resend → **Domains** and verify the DNS records it shows (free).

### 5c. Environment variables on Vercel

Vercel → your project → **Settings → Environment Variables**. Add each one for Production (and Preview if you use it):

| Name | Value |
|---|---|
| `FIREBASE_PROJECT_ID` | `nancy-flix-a9615` |
| `FIREBASE_CLIENT_EMAIL` | the `client_email` from the key file |
| `FIREBASE_PRIVATE_KEY` | the `private_key` from the key file, including the `-----BEGIN…` and `-----END…` lines |
| `FIREBASE_STORAGE_BUCKET` | `nancy-flix-a9615.firebasestorage.app` |
| `RESEND_API_KEY` | the `re_…` key |
| `WELCOME_FROM` | `NANCYFLIX <onboarding@resend.dev>` until your domain is verified, then `NANCYFLIX <hello@yourdomain>` |

Pasting the private key: copy it exactly as it appears in the JSON, with `\n` in it — the function turns those back into real line breaks. If your host strips the newlines, paste the key with real line breaks instead. A wrong key shows up as "Firebase admin is not configured" or a 500 on the code request.

After adding variables, **Redeploy** (Deployments → ⋯ → Redeploy). Environment changes do not apply to a running deployment.

## 6. Give yourself admin tools

Admin Studio reads a Firebase **custom claim** called `admin`. It cannot be set from the website (that is the point). One time, on any computer with Node installed:

1. Put the service account file next to `scripts/set-admin.js` and name it `serviceAccount.json`.
2. In that folder run:

```
npm install firebase-admin
node scripts/set-admin.js bridah888@gmail.com
node scripts/set-admin.js agollanancy@gmail.com
```

3. Sign out and back in on the site. The Admin item appears.

Skip this and everything else still works — only announcement publishing and the feedback Inbox stay locked.

## 7. Test checklist (do this on the live site, on a phone)

1. Sign **up** with a fresh email → you land in the app, and a `users` document appears in Firestore within a second.
2. **Sign out**, sign **in** with the same email → your saved list is still there.
3. Add a title to **My List**, reload the page → still there. Open Firestore → `watchlists` → your document has `items`.
4. **Settings** → change theme → reload → kept.
5. **Feedback** → send → Firestore → `feedback` has one entry with `user_id`.
6. **Browse as guest** → the app opens without an account (this must keep working).
7. **Google** button → pick an account → you land signed in. If it says the address is not authorised, go back to step 3.
8. **Email me a sign-in link** → check the inbox → the link opens the site signed in. It only works on the address you clicked from, in the same browser.
9. **6-digit code** (after step 5) → type the code → signed in. Codes expire after 10 minutes and die after 6 wrong tries.
10. **Profile → change avatar** → the picture appears in Storage under `avatars/`.

## 8. What is on Firebase now, and what is not

On Firebase already:

- Accounts: email + password, Google, email link, and the 6-digit code.
- Profiles, settings, notifications, history: `users/{uid}`.
- Saved list: `watchlists/{uid}`.
- Announcements and feedback: own collections, readable by admins.
- Avatars: Storage.

Still on Supabase (server side only, nothing visible to visitors):

- The Premium/entitlement check used by Stripe (`api/entitlement.js`, `api/stripe-verify.js`).
- The match-poster image upload (`api/share.js`) and the rate-limit helper in `lib/security.js`.

Those need a Supabase project URL and service key in the environment, exactly as before. Keep them until Premium and posters are moved too; the visitor never sees Supabase.

## 9. Moving the old accounts (you must choose)

Passwords cannot be exported from Supabase — they are stored as one-way hashes. Two honest options:

**A. Everyone signs up again (recommended, free, clean).** Keep the Supabase project read-only for a few weeks, tell users to create the account again with the same email, and re-add their saved list by hand. Zero security risk.

**B. Temporary password bridge.** On first sign-in after the switch, the app asks the server to check the old password against Supabase, then creates the Firebase account with that same password. This needs a small server route that holds the Supabase service key, and it must be deleted once everybody has moved. More work, and it keeps the old database alive longer.

Say which one you want and it gets built.

## 10. If something looks broken

| What you see | What it means |
|---|---|
| "This address is not authorised in Firebase" | Add the domain in step 3. |
| Sign-in works but the list is empty on a second device | Rules not published (step 2), or you are signed in as a guest. |
| "Missing or insufficient permissions" in the browser console | Rules are published but the request touches a field a member may not write (`is_admin`, `entitlement`). |
| Code request says "not configured" | The three `FIREBASE_*` variables are missing, or you did not redeploy after adding them. |
| Code request says the email provider refused | `RESEND_API_KEY` is wrong, or the sender is not verified yet (Resend only sends to your own address until a domain is verified). |
| Google window opens then closes | Pop-ups are blocked for the site. Allow them. |
| Admin Studio says "Administrator access only" | Step 6 was not done. |

## 11. Rolling back

`index.html` has one switch near the top: `BACKEND: "firebase"`. Change it to `"supabase"` and the old Supabase sign-in and data start working again with the values already in the file. Nothing is deleted by switching.
