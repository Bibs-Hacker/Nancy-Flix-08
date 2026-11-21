/**
 * Resolve a YouTube channel's current live video.
 * GET /api/live?channel=UCxxxx  -> { live, videoId, title }
 * Server side avoids browser CORS; no API key required.
 */
const CORS = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=60' };
module.exports = async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(204).end();
  const id = String((req.query && req.query.channel) || '').replace(/[^A-Za-z0-9_-]/g, '');
  if (!id) return res.status(400).json({ live: false, error: 'channel id required' });
  try {
    const r = await fetch('https://www.youtube.com/channel/' + id + '/live?hl=en', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.9' },
      redirect: 'follow'
    });
    const html = await r.text();
    const canon = (html.match(/"canonicalBaseUrl":"\/(@[^"]+)"/) || [])[1] || '';
    const vid = (html.match(/"videoId":"([A-Za-z0-9_-]{11})"/) || [])[1] || '';
    const live = /"isLive":true/.test(html) || /hlsManifestUrl/.test(html);
    const title = ((html.match(/<meta name="title" content="([^"]*)"/) || [])[1] || '').replace(/&amp;/g, '&');
    return res.status(200).json({ live: !!(live && vid), videoId: live ? vid : '', title, handle: canon });
  } catch (e) {
    return res.status(200).json({ live: false, error: 'resolver unreachable' });
  }
};
