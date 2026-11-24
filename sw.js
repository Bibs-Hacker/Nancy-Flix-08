/* NANCYFLIX service worker — app shell + offline + poster cache */
const VERSION = 'nancyflix-v8.6.1';
const CORE = [
  './', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png',
  './icons/maskable-512.png', './icons/apple-touch-icon.png', './audio/splash.mp3'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await Promise.all(CORE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

const isImage = u => /image\.tmdb\.org|image\.tmdb\.org/.test(u.host) || /\.(png|jpe?g|webp|gif|svg)$/i.test(u.pathname);

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Live data must never be served from the shell cache.
  if (url.pathname.indexOf('/api/') >= 0 || url.pathname.endsWith('/version.json')) return;

  // App navigation: network first, fall back to cached shell so the app opens offline.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const c = await caches.open(VERSION);
        c.put('./index.html', fresh.clone()).catch(() => {});
        return fresh;
      } catch (err) {
        const c = await caches.open(VERSION);
        return (await c.match('./index.html')) || (await c.match('./')) || Response.error();
      }
    })());
    return;
  }

  // Posters / art: stale-while-revalidate (instant paint, refreshed in background).
  if (isImage(url)) {
    e.respondWith((async () => {
      const c = await caches.open(VERSION + '-img');
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r && r.ok) c.put(req, r.clone()).catch(() => {}); return r; }).catch(() => null);
      return hit || (await net) || Response.error();
    })());
    return;
  }

  // Same-origin static assets: cache first, then network.
  if (url.origin === self.location.origin) {
    e.respondWith((async () => {
      const c = await caches.open(VERSION);
      const hit = await c.match(req);
      if (hit) return hit;
      try {
        const r = await fetch(req);
        if (r && r.ok && (r.type === 'basic' || r.type === 'default')) c.put(req, r.clone()).catch(() => {});
        return r;
      } catch (err) { return hit || Response.error(); }
    })());
  }
});
