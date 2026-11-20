# NANCYFLIX — Dev Brian Studios

A single-file movie discovery PWA (HTML + CSS + JS), plus real PWA assets and a Stripe verification endpoint.

## Files

| Path | What it is |
|---|---|
| `index.html` | The whole app (UI, 7 languages, splash, player, watchlist, ratings, Premium) |
| `manifest.webmanifest` | PWA manifest (standalone, icons, shortcuts) |
| `sw.js` | Service worker: app shell offline cache + poster cache |
| `icons/` | 192 / 512 / maskable / apple-touch icons |
| `api/stripe-verify.js` | Serverless endpoint that confirms a Stripe Checkout was really paid |
| `docs/PAYMENTS.md` | Step-by-step Stripe setup (Payment Links, keys, portal) |

## Run locally

Open `index.html` in a browser and it works. The install prompt and the service worker only activate on HTTPS or on `localhost`, so to test those, serve the folder with any static server (VS Code **Live Server**, `npx serve`, Vercel preview) and open the localhost URL it prints.

## Deploy (free)

**Vercel** (recommended — hosts `index.html` *and* `api/stripe-verify.js`):

1. Push this folder to a GitHub repo (keep it private if it ever holds keys).
2. vercel.com → Add New → Project → import → Deploy (no build step needed).
3. Settings → Environment Variables → `STRIPE_SECRET_KEY = sk_live_...` → Redeploy.

**Netlify / Cloudflare Pages** — static upload works too; move `api/stripe-verify.js` to `netlify/functions/` and point `CONFIG.STRIPE.VERIFY_ENDPOINT` at the function URL.

## Languages

English (default), Kiswahili, Français, Español, Deutsch, Português, العربية (RTL). The app never guesses from the browser — first launch opens the chooser, then the choice is saved per account.

## Premium

$4.99 / month or $39.99 / year. Paste your two Stripe Payment Links into `CONFIG.STRIPE` (search for `LINK_MONTHLY`). Full steps: `docs/PAYMENTS.md`.

## Honest limits

- The install prompt only appears on HTTPS (or localhost); on iPhone use Share → *Add to Home Screen*.
- Entitlement is cached per account in the browser. Add the verify endpoint plus Stripe webhooks + Supabase for cross-device, tamper-proof subscriptions.
- Accounts, ratings and watchlists live in `localStorage` until Supabase credentials are added.
