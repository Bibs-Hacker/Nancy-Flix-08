/* One deployable Vercel function; all original API URLs are rewritten here.
 * Private implementations live OUTSIDE api and OUTSIDE the public folder.
 * Explicit require paths ensure Vercel's dependency tracing includes each handler.
 */
const services = Object.freeze({
 'auth-code':()=>require('../lib/handlers/auth-code'),
 discovery:()=>require('../lib/handlers/discovery'),
 entitlement:()=>require('../lib/handlers/entitlement'),
 'football-alt':()=>require('../lib/handlers/football-alt'),
 football:()=>require('../lib/handlers/football'),
 kids:()=>require('../lib/handlers/kids'),
 live:()=>require('../lib/handlers/live'),
 livecheck:()=>require('../lib/handlers/livecheck'),
 share:()=>require('../lib/handlers/share'),
 sportsrc:()=>require('../lib/handlers/sportsrc'),
 'stripe-verify':()=>require('../lib/handlers/stripe-verify'),
 tmdb:()=>require('../lib/handlers/tmdb'),
 welcome:()=>require('../lib/handlers/welcome')
});
module.exports=async function(req,res){
 res.setHeader('X-Content-Type-Options','nosniff');
 let url;
 try{url=new URL(req.url||'/api/index','https://nancyflix.invalid');}
 catch(e){return res.status(400).json({error:'invalid_request'});}
 const q={};
 for(const [k,v] of url.searchParams){if(k!=='__proto__'&&k!=='constructor'&&k!=='prototype')q[k]=v;}
 // The rewritten query from Vercel is authoritative for the route selector.
 const selector=req.query?.service??q.service;
 if(typeof selector!=='string'||!Object.prototype.hasOwnProperty.call(services,selector)){
  res.setHeader('Cache-Control','no-store');return res.status(404).json({error:'unknown_service'});
 }
 const query={...q,...(req.query||{})};delete query.service;
 delete query.__proto__;delete query.constructor;delete query.prototype;
 const clean=new URLSearchParams();for(const [k,v] of Object.entries(query)){
  if(typeof v==='string')clean.set(k,v);else if(Array.isArray(v))v.filter(x=>typeof x==='string').forEach(x=>clean.append(k,x));
 }
 const queryString=clean.toString();req.query=query;req.url='/api/'+selector+(queryString?'?'+queryString:'');
 // Body and authorization header are untouched: existing identity checks remain.
 try{return await services[selector]()(req,res);}
 catch(e){
  if(res.headersSent)return;
  res.setHeader('Cache-Control','no-store');return res.status(503).json({error:'service_unavailable',service:selector});
 }
};
