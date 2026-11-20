# NANCYFLIX — Deployment Guide (GitHub + Vercel)

The frontend is a single static file: `index.html`. It deploys as a static site.

## A. Push to GitHub

```bash
cd nancyflix
git init
git add index.html api/ backend/ docs/
git commit -m "NANCYFLIX initial build"
git branch -M main
git remote add origin https://github.com/<you>/nancyflix.git
git push -u origin main
```

> The repo may contain `api/tmdb.js` and `backend/` — these hold **no secrets**.
> Real secrets live in Vercel/Supabase environment variables, not in the repo.

## B. Deploy on Vercel

1. Go to vercel.com → **Add New Project** → import your GitHub repo.
2. Framework preset: **Other**. Root directory: project root. No build command.
3. If you use the TMDB proxy, add an env var: `TMDB_V3_KEY = <your key>`.
   Vercel auto-detects `api/tmdb.js` as a serverless function at `/api/tmdb`.
4. Deploy. Your site is live at `https://<app>.vercel.app` and the proxy at
   `https://<app>.vercel.app/api/tmdb`.
5. Put that proxy URL into `CONFIG.TMDB_PROXY` in `index.html`, commit, push.

### Alternative: pure static (no proxy)
Serve just `index.html` on GitHub Pages / Netlify / any static host. Movie data
then requires a browser-side `TMDB_KEY` (exposed) or stays in demo mode.

## C. PWA / installability (honest scope)

A single HTML file can be added to the home screen, but **full PWA features
(service worker offline caching, install prompt) require two extra files**:
`manifest.webmanifest` and `sw.js`, served over HTTPS. They are intentionally
not bundled because the spec mandates a single-file frontend. If you want them,
add both files alongside `index.html` and register the service worker. The app
never claims offline movie streaming — only app shell / permitted metadata would
be cached.
