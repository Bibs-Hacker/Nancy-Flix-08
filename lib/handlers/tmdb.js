// =====================================================================
// NANCYFLIX - Vercel serverless TMDB proxy (keeps the API key PRIVATE)
// Path on deploy:  /api/tmdb?path=/trending/movie/week&page=1
// Set the private key in Vercel -> Project -> Settings -> Environment Variables:
//   TMDB_V3_KEY = <your tmdb v3 key>      (or TMDB_API_KEY as an alias)
// NEVER commit the key and never put it in index.html.
// =====================================================================
const ALLOWED = [
  /^\/trending\/(movie|tv|all)\/(day|week)$/,
  /^\/movie\/(now_playing|popular|top_rated|upcoming|latest)$/,
  /^\/tv\/(popular|top_rated|airing_today|on_the_air)$/,
  /^\/genre\/(movie|tv)\/list$/,
  /^\/(movie|tv|person|collection)\/[0-9]+(\/(credits|videos|similar|recommendations|reviews|images|release_dates|external_ids|alternative_titles))?$/,
  /^\/search\/(movie|tv|multi|person)$/,
  /^\/discover\/movie$/,
  /^\/configuration$/
];

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });

  const KEY = process.env.TMDB_V3_KEY || process.env.TMDB_API_KEY;
  if (!KEY) {
    // 503 is honest: the proxy exists but has no credential yet.
    return res.status(503).json({
      error: "tmdb_not_configured",
      hint: "Add TMDB_V3_KEY in your hosting dashboard, then redeploy."
    });
  }

  const { path = "/trending/movie/week", ...rest } = req.query || {};
  if (typeof path !== "string" || !ALLOWED.some((re) => re.test(path))) {
    return res.status(400).json({ error: "bad_path" });
  }

  // Never forward the caller's api_key, page-size overrides or unknown keys.
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(rest)) {
    if (k === "api_key" || k === "append_to_response") continue;
    if (typeof v === "string") qs.set(k, v.slice(0, 200));
  }
  // Only recognised append sections, never arbitrary paths or credentials.
  if (typeof rest.append_to_response === 'string') {
    const sections = rest.append_to_response.split(',').filter(x =>
      ['videos','credits','similar','recommendations','images','release_dates','external_ids'].includes(x));
    if (sections.length) qs.set('append_to_response', [...new Set(sections)].join(','));
  }
  qs.set("api_key", KEY);
  qs.set("language", typeof rest.language === "string" ? rest.language.slice(0, 20) : "en-US");

  const url = `https://api.themoviedb.org/3${path}?${qs.toString()}`;
  try {
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    const data = await r.json().catch(() => ({}));
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return res.status(r.status).json(data);
  } catch (e) {
    // Never echo the key or the upstream URL back to the browser.
    return res.status(502).json({ error: "tmdb_fetch_failed" });
  }
}
