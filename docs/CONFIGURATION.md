# NANCYFLIX — Configuration Guide

All configuration lives in **one clearly-labelled block** near the top of the
`<script>` section in `index.html`:

```js
const CONFIG = {
  TMDB_KEY: "",        // dev-only browser key (EXPOSED to visitors if set)
  TMDB_PROXY: "",      // preferred: your server proxy that holds the key privately
  SUPABASE_URL: "",    // public project URL (safe to expose)
  SUPABASE_ANON_KEY: "", // public anon key (safe to expose — RLS protects data)
  ADMIN_EMAILS: ["bridah888@gmail.com", "agollanancy@gmail.com"]
};
```

Leave everything blank to run in **Demo Mode** (clearly labelled in the UI). The
app is fully usable in demo mode: a bundled demo catalogue loads, and accounts /
watchlists / feedback / announcements persist in **this browser only**.

## 1. TMDB (movie data + official trailers)

**A browser key is visible to anyone** who views source or network traffic. Two options:

- **Recommended (production):** deploy `api/tmdb.js` (Vercel) or an equivalent
  Edge Function, store the key in a server env var `TMDB_V3_KEY`, and set
  `TMDB_PROXY = "https://<your-app>.vercel.app/api/tmdb"`. Leave `TMDB_KEY` blank.
- **Development only:** paste a v3 key into `TMDB_KEY`. Understand it is exposed.

Genre IDs are fetched live from TMDB (`/genre/movie/list`) rather than hardcoded.

## 2. Supabase (auth, roles, sync, inbox, email)

1. Create a project at supabase.com.
2. Run `backend/schema.sql` in the SQL editor (tables + Row Level Security + the
   admin-provisioning trigger).
3. Copy **Project URL** and **anon public key** into `CONFIG` (these are public).
4. **Never** copy the `service_role` key or DB password into `index.html`.

## 3. Welcome email

Deploy `backend/welcome-email.ts` as a Supabase Edge Function and set the
provider secret server-side (Resend shown):

```
supabase functions deploy welcome-email
supabase secrets set RESEND_API_KEY=... FROM_EMAIL="NANCYFLIX <hello@yourdomain>"
```

If the email provider is not configured, the app honestly reports
“account created, but the welcome email could not be sent” — it never fakes delivery.

## 4. Administrators

`bridah888@gmail.com` and `agollanancy@gmail.com` are provisioned as admins by
the `handle_new_user` trigger in `schema.sql` (server-side). The frontend
`ADMIN_EMAILS` list is only a display hint — **the real role is the `is_admin`
column**, which users cannot change (enforced by the `lock_admin_flag` trigger).
