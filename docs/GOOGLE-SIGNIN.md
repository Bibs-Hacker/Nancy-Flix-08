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
