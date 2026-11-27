/* Shared provider vocabulary and East Africa Time. No guessed live/finished states. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NFFootballState=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const ZONE='Africa/Nairobi';
 const sets={live:new Set(['1H','2H','HT','ET','BT','P','LIVE','INPROGRESS','INPLAY','FIRSTHALF','SECONDHALF','HALFTIME']),finished:new Set(['FT','AET','PEN','FINISHED','ENDED','FULLTIME','MATCHFINISHED']),upcoming:new Set(['NS','TBD','NOTSTARTED','SCHEDULED','UPCOMING']),postponed:new Set(['PST','POSTPONED']),cancelled:new Set(['CANC','CANCELLED','CANCELED']),suspended:new Set(['SUSP','SUSPENDED','INT','INTERRUPTED']),other:new Set(['ABD','ABANDONED','AWD','WO','WALKOVER'])};
 const key=s=>String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
 function date(ms=Date.now()){return new Date(ms+10800000).toISOString().slice(0,10);}
 function epoch(f){
  if(!f)return NaN;
  const fx=f.fixture||{};let t=fx.timestamp??f.timestamp;
  if(t!=null&&t!==''){t=Number(t);if(Number.isFinite(t)&&t>0)return t>1e12?t:t*1000;}
  let v=f.when||f.kickoff||fx.date||f.dateEvent||f.date;
  if(v instanceof Date)return v.getTime();
  if(!v)return NaN;v=String(v);
  if(/^\d{4}-\d{2}-\d{2}$/.test(v))v+='T00:00:00+03:00';
  else if(/^\d{4}-\d{2}-\d{2}T\d\d:\d\d/.test(v)&&!/(Z|[+-]\d\d:\d\d)$/i.test(v))v+='+03:00';
  return Date.parse(v);
 }
 function state(f){
  if(!f)return 'unknown';
  const raw=f.fixture?.status||f.status;
  const s=typeof raw==='object'?(raw.short||raw.type||raw.long):raw;
  const k=key(s||f.status_short||f.status_display);
  for(const [name,set] of Object.entries(sets))if(set.has(k))return name;
  // Explicit flags/scores are evidence only if no stronger status was supplied.
  if(k)return 'unknown';
  if(f.is_live===true||f.isLive===true)return 'live';
  if(f.played===true||Array.isArray(f.score?.ft)&&f.score.ft.length===2||Array.isArray(f.score)&&f.score.length===2)return 'finished';
  if(Number.isFinite(epoch(f))&&epoch(f)>Date.now())return 'upcoming';
  return 'unknown';
 }
 function upcoming(f,now=Date.now()){return state(f)==='upcoming'&&Number.isFinite(epoch(f))&&epoch(f)>now;}
 function accept(f,tab,now=Date.now()){if(tab==='next'||tab==='upcoming'||tab==='notstarted')return upcoming(f,now);if(tab==='live'||tab==='inprogress')return state(f)==='live';if(tab==='finished'||tab==='ended')return state(f)==='finished';if(tab==='today')return Number.isFinite(epoch(f))&&date(epoch(f))===date(now);return true;}
 function filter(rows,tab,now=Date.now()){return (rows||[]).filter(f=>accept(f,tab,now)).sort((a,b)=>epoch(a)-epoch(b));}
 function format(f,opts){const n=epoch(f);if(!Number.isFinite(n))return 'Kick-off to be confirmed';return new Intl.DateTimeFormat('en-GB',{timeZone:ZONE,day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',...opts}).format(new Date(n))+' EAT';}
 return {ZONE,date,epoch,state,upcoming,accept,filter,format};
});
