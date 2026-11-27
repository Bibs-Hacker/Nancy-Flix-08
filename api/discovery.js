/* Private write/admin analytics; public responses contain aggregate entities only. */
const crypto=require('crypto');
const {authenticate,isAdmin,firebaseApp}=require('../lib/security');
const football=require('../lib/football-state');
const cache=new Map();
const sha=v=>crypto.createHash('sha256').update(String(v)).digest('hex');
const clean=v=>String(v||'').replace(/[\u0000-\u001f]/g,'').trim().slice(0,140);
const norm=v=>clean(v).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
function payload(input){
 if(!input||!['query','movie','team','match'].includes(input.kind)||!['search','view'].includes(input.action||'search'))throw Error('bad_event');
 const label=clean(input.label);if(label.length<2||/@|https?:\/\/|\b\d{7,}\b/i.test(label))throw Error('private_or_invalid_label');
 const id=input.kind==='movie'?String(Number(input.id)):sha(norm(label)).slice(0,24);
 if(input.kind==='movie'&&(!/^\d{1,10}$/.test(id)||Number(id)<=0))throw Error('bad_movie_id');
 const e={kind:input.kind,id,label,action:input.action||'search'};
 if(input.kind==='movie'){
  if(typeof input.poster_path==='string'&&/^\/[A-Za-z0-9_.\/-]+$/.test(input.poster_path))e.poster_path=input.poster_path.slice(0,140);
  e.release_date=/^\d{4}-\d{2}-\d{2}$/.test(input.release_date||'')?input.release_date:'';
  e.genre_ids=(Array.isArray(input.genre_ids)?input.genre_ids:[]).filter(x=>Number.isInteger(x)&&x>0).slice(0,10);
 }
 return e;
}
function aggregate(docs,days){
 const map=new Map();let searches=0,views=0,queries=0,daily={};
 for(const d of docs){const day=d.day;if(!day)continue;daily[day]=daily[day]||{searches:0,views:0};
  for(const x of Object.values(d.items||{})){
   if(!x||!['query','movie','team','match'].includes(x.kind))continue;
   const s=Math.max(0,Number(x.searches)||0),v=Math.max(0,Number(x.views)||0);const key=x.kind+':'+x.id;
   const prev=map.get(key)||{kind:x.kind,id:x.id,label:x.label,poster_path:x.poster_path||'',release_date:x.release_date||'',genre_ids:x.genre_ids||[],searches:0,views:0};prev.searches+=s;prev.views+=v;map.set(key,prev);
   if(x.kind==='query')queries+=s;
   else{searches+=s;views+=v;daily[day].searches+=s;daily[day].views+=v;}
  }
 }
 const list=[...map.values()].sort((a,b)=>b.searches-a.searches||b.views-a.views);
 return {days,scope:'community',timezone:'Africa/Nairobi',updatedAt:new Date().toISOString(),totals:{searches,views,queries},daily:Object.entries(daily).sort().map(([day,v])=>({day,...v})),movies:list.filter(x=>x.kind==='movie').slice(0,30),matches:list.filter(x=>x.kind==='match').slice(0,30),teams:list.filter(x=>x.kind==='team').slice(0,30),queries:list.filter(x=>x.kind==='query').slice(0,30)};
}
module.exports=async function(req,res){
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');
 if(req.method==='OPTIONS')return res.status(204).end();
 if(!['GET','POST'].includes(req.method))return res.status(405).json({ok:false,error:'Use GET or POST.'});
 let q;try{q=new URL(req.url,'https://nancyflix.invalid').searchParams;}catch(e){return res.status(400).json({ok:false,error:'Invalid request.'});}
 if(req.method==='GET'){
  const days=Number(q.get('days')||7);if(![1,7,30].includes(days))return res.status(400).json({ok:false,error:'Days must be 1, 7 or 30.'});
  const adminView=q.get('mode')==='admin';
  if(adminView){const u=await authenticate(req);if(!u)return res.status(401).json({ok:false,error:'Verified sign-in required.'});if(!isAdmin(u))return res.status(403).json({ok:false,error:'Administrator access required.'});}
  const key=String(days);let result=cache.get(key);
  try{
   if(!result||result.until<Date.now()){
    const admin=require('firebase-admin'),db=admin.firestore(firebaseApp(true));
    const end=football.date(),start=football.date(Date.now()-(days-1)*86400000);
    const snap=await db.collection('discoveryDaily').where('day','>=',start).where('day','<=',end).get();
    result={until:Date.now()+600000,data:aggregate(snap.docs.map(x=>x.data()),days)};cache.set(key,result);
   }
   const data={...result.data};if(!adminView){delete data.queries;delete data.daily;delete data.totals;res.setHeader('Cache-Control','public,s-maxage=600,stale-while-revalidate=120');}
   return res.status(200).json({ok:true,...data});
  }catch(e){return res.status(503).json({ok:false,configured:false,error:'Community analytics is unavailable. Device-only analytics remains available.'});}
 }
 const u=await authenticate(req);if(!u)return res.status(401).json({ok:false,error:'Verified sign-in required.'});
 let input;try{input=typeof req.body==='string'?JSON.parse(req.body):req.body;if(Buffer.byteLength(JSON.stringify(input||{}))>2500)throw Error();}catch(e){return res.status(400).json({ok:false,error:'Invalid event.'});}
 let event;try{event=payload(input);}catch(e){return res.status(400).json({ok:false,error:'Invalid or private search event.'});}
 try{
  const admin=require('firebase-admin'),db=admin.firestore(firebaseApp(true));
  const day=football.date(),actor=sha(u.id+'|'+day),shard=parseInt(actor.slice(0,2),16)%8;
  const ref=db.collection('discoveryDaily').doc(day+'-'+shard);
  const itemKey=sha(event.kind+':'+event.id).slice(0,32),dedup=sha(actor+'|'+itemKey+'|'+event.action).slice(0,32),now=Date.now();
  const status=await db.runTransaction(async tx=>{
   const snap=await tx.get(ref),d=snap.exists?snap.data():{day,items:{},seen:{},actors:{}};
   const seen=d.seen||{},actors=d.actors||{},items=d.items||{};
   if(seen[dedup]&&now-seen[dedup]<600000)return 'duplicate';
   if((actors[actor]||0)>=100)return 'limited';
   if(!items[itemKey]&&Object.keys(items).length>=250)return 'capacity';
   const old=items[itemKey]||{kind:event.kind,id:event.id,label:event.label,searches:0,views:0};
   old.searches+=event.action==='search'?1:0;old.views+=event.action==='view'?1:0;
   if(event.poster_path)old.poster_path=event.poster_path;if(event.release_date)old.release_date=event.release_date;if(event.genre_ids)old.genre_ids=event.genre_ids;
   items[itemKey]=old;seen[dedup]=now;actors[actor]=(actors[actor]||0)+1;
   // Hard bounds keep each aggregate below Firestore's document size limit.
   const ordered=Object.entries(seen).sort((a,b)=>b[1]-a[1]).slice(0,500);
   if(Object.keys(actors).length>500){const first=Object.keys(actors)[0];delete actors[first];}
   tx.set(ref,{day,items,seen:Object.fromEntries(ordered),actors,updatedAt:now});return 'recorded';
  });
  return res.status(status==='limited'||status==='capacity'?429:200).json({ok:status==='recorded'||status==='duplicate',status});
 }catch(e){return res.status(503).json({ok:false,configured:false,error:'Community analytics is unavailable.'});}
};
module.exports._test={payload,aggregate};
