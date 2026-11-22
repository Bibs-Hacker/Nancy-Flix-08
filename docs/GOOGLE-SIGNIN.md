# Google sign-in (one tap) — setup

The **Continue with Google** button is already in the app. It only works after Google is
switched on in your Supabase project, because Google verifies the user, not NANCYFLIX.

## 1. Create the Google credentials

1. Open https://console.cloud.google.com/ and pick (or create) a project.
2. Go to **APIs and Services -> OAuth consent screen**. Choose *External*, enter the app
   name (NANCYFLIX) and your support email, then save. Add your own Gmail as a test user.
3. Go to **APIs and Services -> Credentials -> Create credentials -> OAuth client ID**.
4. Application type: **Web application**.
5. Under **Authorised JavaScript origins** add your live site, for example
   `https://your-site.example` (no trailing slash).
6. Under **Authorised redirect URIs** add exactly:
   `https://igtxbhljasdfzyuvtnvy.supabase.co/auth/v1/callback`
7. Create it, then copy the **Client ID** and **Client secret**.

## 2. Turn Google on in Supabase

1. Supabase -> **Authentication -> Providers -> Google**.
2. Switch it on, paste the Client ID and Client secret, save.
3. Open **Authentication -> URL Configuration** and set:
   - Site URL: your live site address
   - Redirect URLs: your live site address (plus `http://localhost:5173` if you test locally)

## 3. Test

1. Open the site in a private window and tap **Continue with Google**.
2. Pick an account. You come back signed in, and your watchlist syncs from then on.

If Google is not configured yet, the button returns to the sign-in screen with the real
reason from Supabase (for example `provider is not enabled`). It never fakes success.

## Admin accounts

`bridah888@gmail.com` and `agollanancy@gmail.com` are recognised as admins by the app and
by the database rules in `docs/SUPABASE-SYNC.sql`. Sign in with Google using one of those
addresses and Admin Studio appears in the menu.

---

## Even simpler: no Google setup at all

You do not need Google to let people in. The sign-in screen now offers two easier paths.

### A. Continue on this device (instant, works offline)

1. Open the sign-in screen and tap **Continue on this device — no password**.
2. The app opens immediately with a local profile on that phone.
3. Watchlist, settings and history are saved on that device and survive updates and restarts.
4. Add an email later from Profile if you want cloud sync.

This is the fastest route for testing with friends: nothing to configure.

### B. One-time email code (needs Supabase Email provider)

1. Supabase -> **Authentication -> Providers -> Email**: make sure it is enabled.
2. Supabase -> **Authentication -> Email Templates -> Magic Link**: the template must
   include the token, otherwise the email has a link and no 6-digit code. Use a body like:

   ```
   Your NANCYFLIX code is {{ .Token }}
   It expires in one hour.
   ```

3. In the app, type the email and tap **Email me a code**.
4. Type the 6 digits and tap **Sign in**.

If the mail does not arrive, the project is still using Supabase's rate-limited test mailer.
For real use, add your own SMTP under **Project Settings -> Auth -> SMTP**.

## Keeping people signed in

The app now restores the saved session even when the cloud check fails, so an update or a
brief network drop no longer sends anyone back to the login screen. A session is only
cleared when the user taps Log out, or when Supabase rejects the refresh token (a real
sign-out on another device).
