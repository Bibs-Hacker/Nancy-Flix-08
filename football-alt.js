/* NANCYFLIX alternative schedule and same-origin player resolver.
 * The schedule source is server-only; no upstream response/iframe HTML is forwarded.
 * No video re-streaming, proxying, paywall or DRM bypass is performed.
 */
const crypto = require('crypto');
const net = require('net');
const SOURCE = 'https://api.omegatech.app/api/Sport/All-Sport?action=schedule&probe=true';
const OTHER_FOOTBALL = new Set(['uefa nations league','serie a','club friendly','fifa world cup']);
const TTL = 5 * 60 * 1000;
let cached = null, pending = null;

function safeURL(raw) {
  try {
    const u = new URL(String(raw || ''));
    const host = u.hostname.toLowerCase();
    if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443')) return null;
    if (!host.includes('.') || host === 'localhost' || /\.(localhost|local|internal)$/.test(host) || net.isIP(host.replace(/[\[\]]/g,''))) return null;
    return u.toString();
  } catch (e) { return null; }
}
function normalize(j) {
  if (!j || !j.success || !j.data || !j.data.matches_by_date || typeof j.data.matches_by_date !== 'object') throw Error('invalid_schedule');
  const matches = new Map();
  for (const day of Object.values(j.data.matches_by_date)) {
    if (!Array.isArray(day)) continue;
    for (const e of day) {
      if (!e || typeof e !== 'object') continue;
      const cat = String(e.category || '').toLowerCase();
      const tournament = String(e.tournament || '').trim().slice(0,160);
      if (cat !== 'soccer' && !(cat === 'other' && OTHER_FOOTBALL.has(tournament.toLowerCase()))) continue;
      const match = String(e.match || '').trim().slice(0,240), timestamp = Number(e.timestamp);
      if (!match || !Number.isFinite(timestamp) || timestamp <= 0 || !Number.isFinite(new Date(timestamp * 1000).getTime())) continue;
      const key = match.toLowerCase() + '_' + timestamp;
      const id = crypto.createHash('sha256').update(key).digest('hex').slice(0,24);
      const row = matches.get(key) || { id, match, tournament, timestamp, kickoff:new Date(timestamp*1000).toISOString(), channels:[] };
      for (const stream of Array.isArray(e.streams) ? e.streams : []) {
        if (!stream || stream.reachable === false) continue;
        const url = safeURL(stream.streamUrl);
        if (!url || row.channels.some(c => c.url === url)) continue;
        row.channels.push({ url, external:safeURL(stream.matchUrl) || url, reachable:stream.reachable === true });
      }
      matches.set(key,row);
    }
  }
  return [...matches.values()].sort((a,b)=>a.timestamp-b.timestamp);
}
async function schedule() {
  if (cached && Date.now() - cached.at < TTL) return cached;
  if (pending) return pending;
  pending = (async()=>{
    const ctl = new AbortController();const timer=setTimeout(()=>ctl.abort(),15000);
    try {
      const r = await fetch(SOURCE, {headers:{Accept:'application/json'},signal:ctl.signal});
      if (!r.ok) throw Error('schedule_unreachable');
      const fixtures=normalize(await r.json());
      cached={fixtures,at:Date.now()};return cached;
    } finally {clearTimeout(timer);}
  })();
  try{return await pending;}finally{pending=null;}
}
module.exports = async function(req,res) {
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  if (req.method==='OPTIONS') return res.status(204).end();
  if (req.method!=='GET') return res.status(405).json({success:false,error:'Use GET'});
  let q;
  try {q=new URL(req.url || '/', 'https://nancyflix.invalid').searchParams;} catch(e){return res.status(400).json({success:false,error:'Invalid request'});}
  try {
    const data=await schedule();
    if(q.has('play')) {
      res.setHeader('Cache-Control','private,no-store');
      const row=data.fixtures.find(f=>f.id===q.get('play'));
      const n=Number(q.get('channel') || 0);
      if (!row || !Number.isInteger(n) || n < 0 || !row.channels[n]) return res.status(404).json({success:false,error:'This stream is no longer available. Try another channel.'});
      const target=q.get('open')==='1'?row.channels[n].external:row.channels[n].url;
      // Resolve a feed-listed stream only: never accept a user-supplied redirect URL.
      res.setHeader('Location',target);return res.status(302).end();
    }
    res.setHeader('Cache-Control','public,s-maxage=300,stale-while-revalidate=60');
    return res.status(200).json({success:true,updatedAt:new Date(data.at).toISOString(),fixtures:data.fixtures.map(f=>({
      id:f.id,match:f.match,tournament:f.tournament,timestamp:f.timestamp,kickoff:f.kickoff,
      channels:f.channels.map((c,i)=>({label:'Stream '+(i+1),playerPath:'/api/football-alt?play='+f.id+'&channel='+i,openPath:'/api/football-alt?play='+f.id+'&channel='+i+'&open=1',availability:c.reachable?'reported-online':'unconfirmed'}))
    }))});
  } catch(e) {
    res.setHeader('Cache-Control','no-store');
    return res.status(503).json({success:false,error:'The alternative schedule is unavailable right now. Please try again later.'});
  }
};
