/*
 * NANCYFLIX · live check for a YouTube channel
 * GET /api/livecheck?channel=UCxxxxxxxxxxxxxxxxxxxxxx
 *
 * Returns { checked: true, live: boolean, videoId: string, reason?: string }
 *
 * - live true  -> the channel is streaming now; embed /embed/<videoId>
 * - live false -> nothing is streaming; the app shows the fallback card
 * - 502        -> YouTube did not answer; the app embeds the live_stream URL
 *
 * No API key, no cost: reads the public channel /live page and follows the
 * redirect YouTube performs while the channel is live.
 */

function youtubeIdFrom(html) {
  const patterns = [
    /"videoId":"([\w-]{11})"/,
    /"hlsManifestUrl":"[^"]*\/([\w-]{11})\.m3u8/,
    /watch\?v=([\w-]{11})/
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1];
  }
  return '';
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Cache-Control', 'public, s-maxage=45, stale-while-revalidate=30');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  let channel = '';
  try {
    if (req.query && typeof req.query.channel === 'string') channel = req.query.channel;
    else channel = new URL(req.url || '/', 'http://localhost').searchParams.get('channel') || '';
  } catch (e) { channel = ''; }
  channel = channel.trim();

  if (!/^UC[\w-]{20,32}$/.test(channel)) {
    res.status(400).json({ checked: true, live: false, videoId: '', reason: 'bad-channel' });
    return;
  }

  const target = 'https://www.youtube.com/channel/' + encodeURIComponent(channel) + '/live';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);

  try {
    const r = await fetch(target, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36',
        'accept-language': 'en-US,en;q=0.9',
        accept: 'text/html,application/xhtml+xml'
      }
    });

    if (r.status === 404) {
      res.status(200).json({ checked: true, live: false, videoId: '', reason: 'not-found' });
      return;
    }
    if (!r.ok) {
      res.status(502).json({ checked: false, live: false, videoId: '', reason: 'http-' + r.status });
      return;
    }

    const finalUrl = r.url || target;
    const html = await r.text();
    const redirectId = (finalUrl.match(/[?&]v=([\w-]{11})/) || [])[1] || '';
    const videoId = redirectId || youtubeIdFrom(html);

    const liveFlags =
      html.includes('"isLiveNow":true') ||
      html.includes('"isLiveContent":true') ||
      html.includes('hlsManifestUrl') ||
      /\/watch\?v=/.test(finalUrl);

    res.status(200).json({ checked: true, live: !!(liveFlags && videoId), videoId: liveFlags ? videoId : '' });
  } catch (e) {
    res.status(502).json({ checked: false, live: false, videoId: '', reason: e && e.name === 'AbortError' ? 'timeout' : 'network' });
  } finally {
    clearTimeout(timer);
  }
};
