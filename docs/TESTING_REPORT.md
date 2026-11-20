# NANCYFLIX — Testing Report

**Honesty note:** I built and statically verified the code. I did **not** deploy
it, and I did not run it inside a live browser or against live TMDB/Supabase
credentials. Below I separate what was actually verified from what still needs a
browser / credentials to confirm.

## What I actually executed

- **JavaScript syntax validation:** extracted all 19 `<script>` blocks and ran
  `node --check` over the combined source — **passed, no syntax errors**.
- **File assembly / integrity:** confirmed the single `index.html` assembled
  correctly (~122 KB, 19 script blocks, balanced `<script>` tags).
- **Logic review** of each module against the acceptance list (reading the code,
  not running it).

## Implemented and code-reviewed (needs a browser click-through to fully sign off)

| Scenario | Status |
|---|---|
| Splash completes (with skip) and never hangs (hard timeout fallback) | Implemented |
| Splash → auth gate transition | Implemented |
| Registration validates name/email/password; strength meter | Implemented |
| Profile picture select + preview + 3 MB size limit | Implemented |
| Register with no email verification (demo) + welcome notification | Implemented |
| Login valid/invalid credential feedback; password toggle; remember-me | Implemented |
| Guest mode browsing, search, movie detail | Implemented |
| Guest gated before trailer playback; “Keep browsing” always closes gate | Implemented |
| **Trailers play IN-APP** on a dedicated screen with Close + Back-to-movies (no new tab) | Implemented |
| **Genres grouped with infinite scroll** (IntersectionObserver, incremental pages) | Implemented |
| **Feedback / rating / report** form routes to the **admin inbox** | Implemented |
| **Admin announcements** appear in users’ notifications | Implemented |
| Watchlist add/remove, empty state, persistence | Implemented |
| Profile edits persist; cannot self-promote to admin | Implemented |
| Themes (8) + fonts switch immediately and persist | Implemented |
| Notification + animation + reduced-motion preferences | Implemented |
| Logout confirmation (Escape / dismiss cancels) | Implemented |
| Admin Studio shown only when `is_admin` is true | Implemented (role must be server-verified) |
| KPI cards + charts from real local data, demo clearly labelled | Implemented |
| User directory: search / role filter / sort / pagination / detail modal | Implemented |
| CSV export (users) + JSON export | Implemented |
| Missing TMDB key → clear demo message; API failures fall back, no crash | Implemented |
| XSS-safe rendering via `esc()` on all user/content strings | Implemented |
| Responsive desktop/tablet/mobile layouts | Implemented |

## Requires external setup to be “live” (not a bug)

- **Real movies & official trailers:** need a TMDB key or the `api/tmdb.js` proxy.
  Until then the demo catalogue is used and labelled as such.
- **Cross-device sync, secure hashed auth, server-verified admin role, audit
  persistence across devices:** need Supabase (`backend/schema.sql`).
- **Welcome email delivery:** needs the `welcome-email` function + provider key.
  The UI reports the real send status and does not fake success.

## Known honest limitations

- Demo-mode “passwords” use a SHA-256 demo hash in local storage — **not** a
  substitute for real auth. Backend mode delegates to Supabase Auth.
- Demo mode cannot truly sync across devices (no server); it is labelled
  “local only” rather than pretending otherwise.
- Full PWA offline support needs separate `manifest.webmanifest` + `sw.js`
  (explained in DEPLOYMENT.md), intentionally omitted to honor single-file delivery.

## Recommended manual pass after deploy

1. Register as a normal email → confirm welcome notification + member (non-admin) UI.
2. Register/login as `bridah888@gmail.com` (after running schema.sql) → confirm Admin Studio.
3. Play a trailer → confirm it opens in-app and Back/Close return to movies.
4. Open Genres → scroll → confirm more cards load automatically.
5. Submit feedback/report → confirm it appears in Admin → Inbox.
6. Publish an announcement as admin → confirm it shows in a member’s notifications.
