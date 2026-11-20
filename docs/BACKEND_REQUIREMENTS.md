# NANCYFLIX — Backend Requirements (honest minimum)

The UI loads and works **without** a backend (clearly-labelled Demo Mode). A
backend is required only for the features below. Recommended: **Supabase**.

| Feature | Needs backend? | Provided by |
|---|---|---|
| Browse / search / details / demo catalogue | No | `index.html` + demo data |
| Real movies, posters, official trailers | TMDB only | `api/tmdb.js` proxy (key private) |
| Secure login & hashed credentials | Yes | Supabase Auth |
| Admin role that users can’t forge | Yes | `profiles.is_admin` + RLS + trigger |
| Cross-device sync (watchlist/profile/settings) | Yes | `watchlists`, `profiles` tables |
| Feedback / ratings / reports inbox | Yes* | `feedback` table (*local in demo) |
| Admin announcements → user notifications | Yes* | `announcements` table (*local in demo) |
| Audit log | Yes* | `audit_log` table |
| Welcome email | Yes | `welcome-email` Edge Function + provider |

\* In demo mode these are stored in the browser so you can see the full flow;
they only sync across devices once Supabase is connected.

## Minimum setup

1. **Supabase project** (free tier is enough).
2. Run **`backend/schema.sql`** — creates tables, Row Level Security policies,
   the auto-profile trigger, and provisions the two admin emails.
3. Put **Project URL** + **anon key** in `CONFIG` (public values).
4. For email: deploy **`backend/welcome-email.ts`** and set `RESEND_API_KEY`
   (or your provider) as a function secret.
5. For private TMDB: deploy **`api/tmdb.js`** with `TMDB_V3_KEY` env var.

## Security boundaries honored

- Admin role is a protected DB column; the trigger `lock_admin_flag` ignores any
  client attempt to set `is_admin`. A frontend email match alone never grants admin.
- RLS ensures a user can only read/write **their own** profile and watchlist;
  feedback is insert-only for users and read-only for admins.
- No service-role key, DB password, or email key is ever placed in `index.html`.
- The welcome-email function returns the **real** provider status; the UI reports
  it truthfully and never fakes a “sent” toast.
- Trailers embed only authorized references (official YouTube trailers from TMDB);
  no full-length film sources are scraped or distributed.
