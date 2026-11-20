// =====================================================================
// NANCYFLIX — Vercel serverless TMDB proxy (keeps the API key PRIVATE)
// Path on deploy:  /api/tmdb?path=/trending/movie/week&page=1
// Set the private key in Vercel → Project → Settings → Environment Variables:
//   TMDB_V3_KEY = <your tmdb v3 key>   (NEVER committed, never in index.html)
// Then in index.html CONFIG set:  TMDB_PROXY = "https://<app>.vercel.app/api/tmdb"
// =====================================================================
export default async function handler(req, res) {
  const KEY = process.env.TMDB_V3_KEY;
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (!KEY) return res.status(200).json({ error: "tmdb_not_configured" });

  const { path = "/trending/movie/week", ...rest } = req.query;
  // allow-list: only real TMDB read paths, no arbitrary proxying
  if (!/^\/[a-z0-9_\/\.]+$/i.test(path)) return res.status(400).json({ error: "bad path" });

  const qs = new URLSearchParams(rest);
  qs.set("api_key", KEY);
  const url = `https://api.themoviedb.org/3${path}?${qs.toString()}`;
  try {
    const r = await fetch(url);
    const data = await r.json();
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(502).json({ error: "tmdb_fetch_failed" });
  }
}
