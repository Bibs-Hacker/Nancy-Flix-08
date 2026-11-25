# Sign-in, deployment and install — what to change outside the code

This page covers the three things that live in dashboards, not in the files: why the last deployment never went live, why no sign-in code arrived, and why the phone made a shortcut instead of an app.

## 1. Why the deploy stopped at "Deploying outputs…"

Vercel's free (Hobby) plan allows **12 serverless functions per deployment**. The 8.7.0 upload had 13:

- 12 files in `api/` (one of them, `share-card.js`, was a helper, not an endpoint)
- `api/lib/security.js`, which Vercel also turns into a function

When that limit is crossed the build compiles fine, the log reaches "Deploying outputs…", and then the deployment is rejected. Nothing new is promoted, so the previous 8.6.1 deployment stays live — exactly what you saw. I checked your domain: it served `8.6.1` while your GitHub `main` already had `8.7.0`.

**Fixed in 8.7.1:** helpers moved to a root `lib/` folder (not counted as functions) and the poster image endpoint was merged into `api/share.js`. The project now has 10 functions:

`entitlement, football, football-alt, kids, live, livecheck, share, stripe-verify, tmdb, welcome`

When you upload this build, **delete the three files that no longer exist**, otherwise they come back as functions:

- `api/share-image.js`
- `api/share-card.js`
- `api/lib/security.js` (and the now-empty `api/lib` folder)

Then redeploy. In the Vercel project open the **Functions** tab and count: ten entries means you are inside the free limit. If a deploy still stalls, the reason is the first red line in the log, not the last grey one.

## 2. No code in the email, and the link went to localhost

Two separate settings cause this.

### 2a. The email template only contains a link

Supabase's default Magic Link template sends `{{ .ConfirmationURL }}` and nothing else, so there is no 6-digit code to type. Add the token line.

Dashboard → **Authentication → Email Templates → Magic Link** → paste this as the message body:

```html
<h2>Your NANCYFLIX sign-in code</h2>
<p>Type this code in the app:</p>
<p style="font-size:28px;letter-spacing:6px;font-weight:700">{{ .Token }}</p>
<p>Or tap this link to sign in on this device: <a href="{{ .ConfirmationURL }}">Open NANCYFLIX</a></p>
<p>The code expires in about an hour. If you did not ask for it, ignore this email.</p>
```

After saving, request a fresh code. Old emails keep the old template.

### 2b. Site URL still points at localhost

Dashboard → **Authentication → URL Configuration**:

- **Site URL**: `https://nancy-flix-08.vercel.app`
- **Redirect URLs**: add `https://nancy-flix-08.vercel.app/**` and, only if you test locally, `http://localhost:3000/**`

That single setting is why tapping the link opened an "invalid localhost" page. The app now also sends its own return address with each request, and it accepts the tokens when the link lands back on the site, so a link sign-in completes without a second tap.

### 2c. Limits worth knowing

Supabase's built-in email sender is meant for testing: a few messages per hour, and it can land in spam. For real traffic, connect your own SMTP under **Authentication → SMTP Settings** (Resend, Brevo and Gmail app passwords all have free tiers). No payment is required for the app itself.

## 3. Shortcut on the home screen instead of a real app

A phone builds a real installed app only when the page passes the install test **at the moment you install it**: HTTPS, a valid manifest, a 192 and a 512 icon, a service worker, and standalone display. Your manifest already met that; the deployment did not, because the live site was the old build.

What v8.7.1 adds:

- maskable 512 icon, app shortcuts for Football, Kids and TV, and a stable app id
- an **Install** button in the header that appears only when the browser offers a real install
- **Settings → App on your phone** with the correct steps and an honest explanation when only a shortcut is possible

The rule that matters:

- **Android, Chrome:** open the address directly in Chrome → three-dot menu → **Install app**. Chrome then builds an app that appears in the app drawer, with its own window.
- **iPhone / iPad, Safari:** Share → **Add to Home Screen**. Apple always places web apps on the home screen; iOS has no app drawer, so this is the correct result on iPhone.
- **Opened from WhatsApp, Instagram or Messenger:** those in-app browsers cannot install anything; they can only make a bookmark. Copy the address into Chrome or Safari first. This is the most common reason people get a shortcut.

If Chrome shows "Add to Home screen" and produces a shortcut even after that, the page is not being served from the final HTTPS address (for example a preview URL with a login wall) or the service worker failed to register. Loading the site once online fixes the second case.
