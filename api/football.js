/* NANCYFLIX score/fixture bridge: private key, cache and quota cooldown. */
const HOST='https://v3.football.api-sports.io';
const ENDPOINTS=new Set(['status','timezone','countries','leagues','teams','fixtures','fixtures/events','fixtures/statistics','fixtures/lineups','fixtures/players','standings']);
const PARAMS=['id','fixture','league','season','team','date','from','to','live','next','last','round','status','timezone','venue','country','name','search','type','current','page'];
const cache=new Map(),pending=new Map();let quotaUntil=0;
function quotaText(data){return /daily|request.*limit|limit.*request|quota|too many/i.test(JSON.stringify(data&&data.errors||{}));}
async function upstream(target, key, ttl){
 const hit=cache.get(target);if(hit&&hit.until>Date.now())return hit;
 if(pending.has(target))return pending.get(target);
 const job=(async()=>{const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),12000);
 try {
  const r=await fetch(target,{headers:{'x-apisports-key':key,Accept:'application/json'},signal:ctl.signal});
  let j;try{j=await r.json();}catch(e){throw Error('invalid_data');}
  if(!j||typeof j!=='object')throw Error('invalid_data');
  j._configured=true;j._status=r.status;
  const daily=r.headers.get('x-ratelimit-requests-remaining');
  const perMinute=r.headers.get('x-ratelimit-remaining');
  if(daily!==null&&Number.isFinite(Number(daily)))j._remaining=Number(daily);
  if(perMinute!==null&&Number.isFinite(Number(perMinute)))j._minuteRemaining=Number(perMinute);
  const quota=r.status===429||quotaText(j);
  if(quota){const seconds=Number(r.headers.get('retry-after'));const wait=Number.isFinite(seconds)&&seconds>0?Math.min(3600,seconds):3600;quotaUntil=Date.now()+wait*1000;j._quota=true;j._remaining=0;j._retryAfter=wait;}
  const result={data:j,status:quota?429:r.ok?200:502,until:Date.now()+(quota?60000:ttl)};
  if(result.status===200||quota){cache.set(target,result);if(cache.size>128)cache.delete(cache.keys().next().value);}
  return result;
 }finally{clearTimeout(timer);}})();
 pending.set(target,job);try{return await job;}finally{pending.delete(target);}
}
module.exports=async function(req,res){
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method==='OPTIONS')return res.status(204).end();
 if(req.method!=='GET'&&req.method!=='HEAD')return res.status(405).json({configured:true,error:'Use GET'});
 const key=process.env.API_FOOTBALL_KEY||process.env.APIFOOTBALL_KEY||'';
 if(!key)return res.status(503).json({configured:false,response:[],error:'Live scores are not configured on the server.'});
 let url;try{url=new URL(req.url,'https://nancyflix.invalid');}catch(e){return res.status(400).json({error:'Invalid request'});}
 const ep=String(url.searchParams.get('ep')||'status').replace(/^\/+|\/+$/g,'');
 if(!ENDPOINTS.has(ep))return res.status(400).json({error:'Endpoint not allowed'});
 if(quotaUntil>Date.now()){
  const wait=Math.ceil((quotaUntil-Date.now())/1000);res.setHeader('Cache-Control','public,s-maxage=60');res.setHeader('Retry-After',String(wait));
  return res.status(429).json({_configured:true,_quota:true,_remaining:0,_retryAfter:wait,response:[],error:'Live-score quota is exhausted. Alternative schedules may still be available.'});
 }
 const qs=new URLSearchParams();for(const k of PARAMS){const v=url.searchParams.get(k);if(v)qs.set(k,v.slice(0,80));}
 if(ep==='fixtures'&&qs.has('live'))qs.set('live','all');
 qs.sort();const query=qs.toString();const target=HOST+'/'+ep+(query?'?'+query:'');
 const seconds=ep==='fixtures'&&qs.has('live')?120:ep.startsWith('fixtures/')?300:600;
 try{const result=await upstream(target,key,seconds*1000);
  res.setHeader('Cache-Control',result.status===200?'public,s-maxage='+seconds+',stale-while-revalidate=30':result.status===429?'public,s-maxage=60':'no-store');
  if(result.data._quota)res.setHeader('Retry-After',String(result.data._retryAfter||3600));
  res.status(result.status);if(req.method==='HEAD')return res.end();return res.json(result.data);
 }catch(e){res.setHeader('Cache-Control','no-store');return res.status(504).json({configured:true,response:[],error:e.name==='AbortError'?'The live-score feed timed out.':'The live-score feed is unavailable.'});}
};
