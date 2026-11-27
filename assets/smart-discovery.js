/* Adaptive, zero-paid-AI discovery. Existing details/player/auth remain authoritative. */
(function(){
 'use strict';if(window.NFSmart)return;
 const FS=window.NFFootballState;
 const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
 const node=(t,c,text)=>{const e=document.createElement(t);if(c)e.className=c;if(text!=null)e.textContent=text;return e;};
 const owner=()=>State.user?State.user.id:'guest';
 const store=(k,v)=>LS.set('sd:'+k,v),read=(k,d)=>LS.get('sd:'+k,d);
 const movies=new Map(),football=new Map();let community=null,communityAt=0,refreshing=null;
 function levenshtein(a,b){if(a.length>90||b.length>90)return 100;const d=Array.from({length:a.length+1},(_,i)=>Array(b.length+1).fill(0));for(let i=0;i<=a.length;i++)d[i][0]=i;for(let j=0;j<=b.length;j++)d[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1);}return d[a.length][b.length];}
 function similarity(q,title){const a=norm(q),b=norm(title);if(!a||!b)return 0;if(a===b)return 1;if(b.startsWith(a))return .94;if(b.includes(a))return .86;
  const bt=b.split(' '),at=a.split(' ');const token=at.reduce((sum,w)=>sum+Math.max(...bt.map(t=>1-levenshtein(w,t)/Math.max(w.length,t.length))),0)/at.length;
  const total=1-levenshtein(a,b)/Math.max(a.length,b.length);return Math.max(total,token*.9);
 }
 function aliases(m){return [m.title,m.original_title,...(m.aliases||[])].filter(Boolean);}
 function score(q,m){return Math.max(...aliases(m).map(t=>similarity(q,t)),0);}
 function remember(m){if(!m||!m.id||!m.title||m.adult===true)return;const old=movies.get(String(m.id))||{};movies.set(String(m.id),{...old,...m,genre_ids:m.genre_ids||(m.genres||[]).map(g=>g.id),aliases:[...new Set([...(old.aliases||[]),...(m.aliases||[])])]});if(movies.size>600)movies.delete(movies.keys().next().value);}
 function ingest(data){if(!data)return;(data.results||[]).forEach(remember);if(data.title)remember(data);if(data.recommendations)(data.recommendations.results||[]).forEach(remember);}
 function persist(){store('catalogue',[...movies.values()].slice(-400).map(m=>({id:m.id,title:m.title,original_title:m.original_title,aliases:m.aliases,poster_path:m.poster_path,release_date:m.release_date,genre_ids:m.genre_ids,vote_average:m.vote_average,popularity:m.popularity})));}
 (read('catalogue',[])||[]).forEach(remember);
 try{DataCache._idx().slice(-90).forEach(k=>ingest(DataCache.get(k)));Watched.list().forEach(remember);}catch(e){}
 function rank(q,list){const seen=new Set();return list.filter(m=>{if(!m||!m.id||seen.has(m.id)||m.adult===true)return false;seen.add(m.id);return true;}).map(m=>({m,s:score(q,m)})).filter(x=>x.s>=.58).sort((a,b)=>b.s-a.s||Number(b.m.popularity||0)-Number(a.m.popularity||0)).map(x=>x.m);}
 const nativeCall=TMDB.call.bind(TMDB),nativeSearch=TMDB.search.bind(TMDB);
 TMDB.call=async function(){const d=await nativeCall(...arguments);ingest(d);return d;};
 let warming;
 function warm(){if(warming)return warming;warming=Promise.allSettled([TMDB.list('trending'),TMDB.list('popular')]).then(()=>{persist();return [...movies.values()];});return warming;}
 async function alternateTitles(list){const loaded=new Set(read('aliasesDone',[]));const todo=(list||[]).slice(0,6).filter(m=>!loaded.has(String(m.id)));
  await Promise.allSettled(todo.map(async m=>{const d=await nativeCall('/movie/'+m.id+'/alternative_titles');const titles=(d.titles||[]).map(t=>t.title).filter(Boolean);remember({...m,aliases:titles});loaded.add(String(m.id));}));store('aliasesDone',[...loaded].slice(-150));persist();
 }
 async function find(q,page=1){
  let remote,error;try{remote=await nativeSearch(q,page);}catch(e){error=e;remote={results:[],total:0,pages:1};}
  (remote.results||[]).forEach(remember);
  if(page!==1)return remote;
  const candidates=rank(q,[...remote.results,...movies.values()]);
  if(!remote.results.length&&!candidates.length){await warm();const list=[...movies.values()];await alternateTitles(list.slice(-12));}
  const local=rank(q,[...movies.values()]);let correction='';
  const best=local[0];if(best&&score(q,best)>=.68&&!remote.results.some(m=>score(q,m)>=.86)&&norm(best.title)!==norm(q)){
   correction=best.title;try{const fixed=await nativeSearch(best.title,1);fixed.results.forEach(remember);remote={...fixed,results:rank(q,[...fixed.results,...remote.results])};}catch(e){}
  }
  const combined=rank(q,[...remote.results,...local]);const results=combined.length?combined:remote.results;
  if(error&&!results.length)throw error;
  return {results,total:Math.max(remote.total||0,results.length),pages:remote.pages||1,correction,localFallback:!!error};
 }
 // Search result page uses the same matching engine; all native movie opening stays unchanged.
 const corrections=new Map();TMDB.search=async function(q,page){const r=await find(q,page);corrections.set(q,r.correction||'');if(corrections.size>50)corrections.delete(corrections.keys().next().value);return r;};
 const run=Search.run.bind(Search);Search.run=async function(q,page=1){hide();Search.closeMobile();if(page===1){log({kind:'query',label:q,action:'search'});}await run(q,page);if(page!==1||Search.query!==q)return;
  const grid=document.getElementById('searchGrid');if(grid){const list=[...grid.querySelectorAll('.card[data-id]')];list.forEach(c=>{const m=movies.get(c.dataset.id);if(m)c.addEventListener('click',()=>movieSearch(m,q),{once:true});});}
  const correctionInfo=corrections.get(q);if(correctionInfo){const meta=document.getElementById('searchMeta');if(meta){const hint=node('div','sd-fix','Closest title / alternative name: '+correctionInfo+'. Results still include your original query.');meta.appendChild(hint);}}
 };
 function events(){return read('events',[]).filter(e=>e.t>Date.now()-90*86400000);}
 function preferences(){return read('prefs:'+owner(),{genres:{},teams:{},seen:{},matches:{}});}
 function savePrefs(p){store('prefs:'+owner(),p);}
 function updatePrefs(kind,id,genres){const p=preferences();if(kind==='movie'){(genres||[]).forEach(g=>p.genres[g]=(p.genres[g]||0)+1);p.seen[id]=Date.now();p.seen=Object.fromEntries(Object.entries(p.seen).sort((a,b)=>b[1]-a[1]).slice(0,100));}else if(kind==='team'){p.teams[norm(id)]=(p.teams[norm(id)]||0)+1;}else if(kind==='match'){p.matches[norm(id)]=(p.matches[norm(id)]||0)+1;}savePrefs(p);}
 function log(e){
  const label=String(e.label||'').trim().slice(0,140);if(label.length<2||/@|https?:\/\/|\b\d{7,}\b/i.test(label))return;
  const now=Date.now(),o=owner(),id=e.kind==='movie'?String(e.id):norm(label),key=o+'|'+e.kind+'|'+id+'|'+(e.action||'search');const last=read('dedup',{});
  if(last[key]&&now-last[key]<600000)return;
  last[key]=now;store('dedup',Object.fromEntries(Object.entries(last).sort((a,b)=>b[1]-a[1]).slice(0,300)));
  const item={...e,label,id,t:now,owner:o,action:e.action||'search'};const rows=events();rows.push(item);store('events',rows.slice(-1500));
  if(read('share:'+o,true)&&State.user?.cloudVerified&&State.accessToken)cloudWrite(item);
 }
 let cloudBlockedUntil=0;
 async function cloudWrite(e){if(cloudBlockedUntil>Date.now())return;try{
  let token=State.accessToken;const body={kind:e.kind,id:e.id,label:e.label,action:e.action,poster_path:e.poster_path,release_date:e.release_date,genre_ids:e.genre_ids};
  const r=await fetch('/api/discovery',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
  if(!r.ok)cloudBlockedUntil=Date.now()+600000;
 }catch(e){cloudBlockedUntil=Date.now()+600000;}}
 function movieSearch(m,q){remember(m);log({kind:'movie',id:m.id,label:m.title,poster_path:m.poster_path,release_date:m.release_date,genre_ids:m.genre_ids,action:'search'});updatePrefs('movie',m.id,m.genre_ids);}
 function title(f){return f.match||f.title||[(f.home?.name||f.home),(f.away?.name||f.away)].filter(Boolean).join(' vs ');}
 function teamNames(f){return f.home&&f.away?[f.home.name||f.home,f.away.name||f.away]:title(f).split(/\s+(?:vs\.?|v\.?)\s+/i);}
 function rememberFootball(rows){rows.forEach(f=>{const text=title(f);if(text&&text.includes(' vs ')){const id=norm(text)+'|'+(FS.epoch(f)||'unknown');football.set(id,{...f,match:text});}});if(football.size>300)football.delete(football.keys().next().value);}
 function selectFootball(f){rememberFootball([f]);log({kind:'match',label:title(f),action:'search'});teamNames(f).forEach(t=>updatePrefs('team',t));}
 function viewFootball(f){rememberFootball([f]);log({kind:'match',label:title(f),action:'view'});updatePrefs('match',title(f));teamNames(f).forEach(t=>updatePrefs('team',t));}
 function searchFootball(q,rows){if(q.trim().length<2)return;const matches=(rows||[]).filter(f=>similarity(q,title(f))>.58||teamNames(f).some(t=>similarity(q,t)>.6));
  matches.slice(0,3).forEach(f=>log({kind:'match',label:title(f),action:'search'}));
  const teams=[...new Set(matches.flatMap(teamNames))].filter(t=>similarity(q,t)>=.65);teams.slice(0,3).forEach(t=>{log({kind:'team',label:t,action:'search'});updatePrefs('team',t);});
 }
 const watched=Watched.log.bind(Watched);Watched.log=function(m,played){watched(m,played);if(m&&m.id){remember(m);updatePrefs('movie',m.id,m.genre_ids||(m.genres||[]).map(g=>g.id));log({kind:'movie',id:m.id,label:m.title,genre_ids:m.genre_ids||(m.genres||[]).map(g=>g.id),poster_path:m.poster_path,release_date:m.release_date,action:'view'});}};
 function localSummary(days){const map=new Map(),today=FS.date(),start=FS.date(Date.now()-(days-1)*86400000),daily={};let searches=0,views=0,queries=0;
  events().filter(e=>FS.date(e.t)>=start&&FS.date(e.t)<=today).forEach(e=>{const id=e.kind+':'+e.id;const x=map.get(id)||{kind:e.kind,id:e.id,label:e.label,genre_ids:e.genre_ids||[],poster_path:e.poster_path||'',release_date:e.release_date||'',searches:0,views:0};x.searches+=e.action==='search'?1:0;x.views+=e.action==='view'?1:0;map.set(id,x);const day=FS.date(e.t);daily[day]=daily[day]||{searches:0,views:0};if(e.kind==='query'){queries++;}else if(e.action==='search'){searches++;daily[day].searches++;}else{views++;daily[day].views++;}});
  const list=[...map.values()].sort((a,b)=>b.searches-a.searches||b.views-a.views);return {scope:'device',days,timezone:'Africa/Nairobi',updatedAt:new Date().toISOString(),totals:{searches,views,queries},daily:Object.entries(daily).sort().map(([day,v])=>({day,...v})),movies:list.filter(x=>x.kind==='movie'),matches:list.filter(x=>x.kind==='match'),teams:list.filter(x=>x.kind==='team'),queries:list.filter(x=>x.kind==='query')};
 }
 async function summary(days,adminMode=false){try{const r=await fetch('/api/discovery?days='+days+(adminMode?'&mode=admin':''),{headers:adminMode?{Authorization:'Bearer '+(State.accessToken||'')}:{},signal:AbortSignal.timeout(10000)});const j=await r.json();if(r.ok&&j.ok)return j;}catch(e){}return localSummary(days);}
 // Instant suggestions: immediate local matching, debounced remote lookup, stale-response guard.
 const old=document.getElementById('searchInput');const input=old.cloneNode(true);old.replaceWith(input);clearTimeout(Search.timer);
 const panel=node('div','sd-panel');panel.id='sdSuggestions';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Movie search suggestions');document.body.appendChild(panel);
 input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','false');input.setAttribute('aria-controls','sdSuggestions');input.autocomplete='off';
 let timer,seq=0,active=-1,suggested=[];
 function position(){const box=input.closest('.search-box'),r=box.getBoundingClientRect(),mobile=innerWidth<=560;if(mobile&&(r.bottom<10||r.top>innerHeight-40)){const w=innerWidth-20;panel.style.width=w+'px';panel.style.left='10px';panel.style.top='12px';return;}const width=Math.min(Math.max(r.width,350),innerWidth-24);panel.style.width=width+'px';panel.style.left=Math.max(12,Math.min(r.left,innerWidth-width-12))+'px';panel.style.top=Math.max(8,Math.min(r.bottom+8,innerHeight-140))+'px';}
 function hide(){seq++;panel.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');active=-1;}
 function show(list,q,busy=false,error=false){if(input.value.trim()!==q||document.activeElement!==input)return;suggested=list.slice(0,7);active=-1;panel.replaceChildren();
  const head=node('div','sd-head');head.append(node('span','','Smart movie search'),node('span','',busy?'Searching…':'Titles + alternate names'));panel.appendChild(head);
  const items=node('div','sd-list');items.setAttribute('role','listbox');items.id='sdOptions';
  suggested.forEach((m,i)=>{const b=node('button','sd-row');b.type='button';b.id='sdOpt'+i;b.setAttribute('role','option');b.setAttribute('aria-selected','false');if(m.poster_path&&/^\/[\w./-]+$/.test(m.poster_path)){const img=node('img');img.src='https://image.tmdb.org/t/p/w92'+m.poster_path;img.alt='';img.onerror=()=>{img.replaceWith(node('span','ph','•'));};b.appendChild(img);}else b.appendChild(node('span','ph','•'));
   const copy=node('div','sd-copy');copy.append(node('b','',m.title),node('small','',(m.release_date?m.release_date.slice(0,4):'Year TBC')+' · '+(m.genre_ids||[]).map(id=>State.genreMap[id]||(GENRE_FALLBACK.find(g=>g.id===id)||{}).name||'').filter(Boolean).slice(0,3).join(' / ')));b.append(copy,node('span','sd-go','Open'));b.onclick=()=>choose(i);items.appendChild(b);});
  if(!suggested.length)items.appendChild(node('div','sd-note',busy?'Looking for titles and nearby spellings…':error?'Search is unavailable. Try again shortly.':'No nearby title found. Try another spelling or press Enter for all results.'));
  panel.appendChild(items);const all=node('button','sd-all','View all results for “'+q+'”');all.type='button';all.onclick=()=>Search.run(q);panel.appendChild(all);position();panel.hidden=false;input.setAttribute('aria-expanded','true');
 }
 function choose(i){const m=suggested[i];if(!m)return;movieSearch(m,input.value);hide();Search.closeMobile();MovieDetail.open(m.id);}
 input.addEventListener('input',()=>{clearTimeout(timer);const q=input.value.trim(),n=++seq;document.getElementById('searchClear').style.display=q?'flex':'none';if(q.length<2){hide();return;}show(rank(q,[...movies.values()]),q,true);timer=setTimeout(async()=>{try{const r=await find(q);if(n!==seq)return;show(r.results,q);}catch(e){if(n===seq)show([],q,false,true);}},240);});
 input.addEventListener('keydown',e=>{if(e.key==='Escape'){hide();Search.closeMobile();return;}if(e.key==='ArrowDown'||e.key==='ArrowUp'){if(panel.hidden||!suggested.length)return;e.preventDefault();active=(active+(e.key==='ArrowDown'?1:-1)+suggested.length)%suggested.length;panel.querySelectorAll('.sd-row').forEach((b,i)=>{b.classList.toggle('on',i===active);b.setAttribute('aria-selected',i===active?'true':'false');});const opt=document.getElementById('sdOpt'+active);if(opt){input.setAttribute('aria-activedescendant',opt.id);opt.scrollIntoView({block:'nearest'});}return;}if(e.key==='Enter'){e.preventDefault();clearTimeout(timer);if(!panel.hidden&&active>=0)choose(active);else Search.run(input.value.trim());}});
 document.getElementById('searchClear').onclick=()=>{clearTimeout(timer);input.value='';hide();document.getElementById('searchClear').style.display='none';input.focus();};document.getElementById('searchGo').onclick=()=>{clearTimeout(timer);if(input.value.trim())Search.run(input.value.trim());else input.focus();};
 document.addEventListener('click',e=>{if(!panel.contains(e.target)&&e.target!==input)hide();});window.addEventListener('resize',()=>{if(!panel.hidden)position();});window.addEventListener('scroll',()=>{if(!panel.hidden)position();},{passive:true});
 input.addEventListener('focus',()=>{if(input.value.trim().length>=2)show(rank(input.value.trim(),[...movies.values()]),input.value.trim());});
 // Adaptive sections supplement existing TMDB/provider rails instead of replacing them.
 function section(title,sub,id){const sec=node('section','section sd-sec');sec.id=id;const head=node('div','sd-sec-head'),h=node('h3');h.append(node('span','bar'),node('span','',title));head.append(h,node('span','',sub));sec.appendChild(head);return sec;}
 function cards(list){const row=node('div','row');row.innerHTML=list.map(cardHTML).join('');return row;}
 function movieFor(x){const m=movies.get(String(x.id));return m||{id:Number(x.id),title:x.label,poster_path:x.poster_path,release_date:x.release_date,genre_ids:x.genre_ids,vote_average:0};}
 async function refresh(){if(refreshing)return refreshing;if(State.view!=='home')return;refreshing=(async()=>{
  const home=document.getElementById('view-home');if(!home)return;
  if(!community||Date.now()-communityAt>600000){community=await summary(7);communityAt=Date.now();}
  if(State.view!=='home')return;
  ['sdTrendingMovies','sdRecommendedMovies','sdTrendingFootball','sdRecommendedFootball'].forEach(id=>document.getElementById(id)?.remove());
  const aggregate=community,local=localSummary(7),hasCommunity=aggregate.scope==='community',scopeText=hasCommunity?'Community searches · 7 days':'This device · 7 days';
  const hot=(aggregate.movies||[]).filter(x=>x.searches>0).map(movieFor);const top=section('Trending Movies',scopeText,'sdTrendingMovies');
  if(hot.length)top.appendChild(cards(hot.slice(0,12)));else top.appendChild(node('p','sd-note','No NANCYFLIX movie searches recorded yet. The original TMDB Trending rail below is unchanged.'));
  home.appendChild(top);
  const p=preferences(),viewed=new Set(Watched.list().map(m=>String(m.id)));const counts=new Map((aggregate.movies||[]).map(x=>[String(x.id),x.searches]));
  let candidates=[...movies.values()].filter(m=>!viewed.has(String(m.id))&&!p.seen[m.id]);
  candidates=candidates.map(m=>({m,s:(m.genre_ids||[]).reduce((n,g)=>n+(p.genres[g]||0),0)*3+Math.log1p(counts.get(String(m.id))||0)*2+Math.log1p(m.popularity||0)*.25})).sort((a,b)=>b.s-a.s).slice(0,12).map(x=>x.m);
  const rec=section('Recommended for you','Viewing + genre affinity + search popularity','sdRecommendedMovies');if(candidates.length)rec.appendChild(cards(candidates));else rec.appendChild(node('p','sd-note','Open a few movies to build recommendations. Preferences stay on this device for your account.'));home.appendChild(rec);
  const available=[...football.values()].filter(f=>FS.accept(f,'live')||FS.upcoming(f));
  function footballSection(id,heading,list,explain){const sec=section(heading,explain,id),grid=node('div','sd-foot');list.slice(0,8).forEach(f=>{const b=node('button','sd-match');b.type='button';b.append(node('em','',FS.state(f)==='live'?'Live now':'Upcoming'),node('b','',title(f)),node('small','',FS.format(f)));b.onclick=async()=>{selectFootball(f);hide();b.disabled=true;try{const names=teamNames(f),primary=await NFAltFootball.find({home:{name:names[0]},away:{name:names[1]},when:new Date(FS.epoch(f))});if(primary&&primary.channels?.length)NFAltFootball.open(primary);else if(f.sportsrc&&window.NFSRC){const result=await NFSRC.resolve(f);NFAltFootball.open(result);}else{Live.tab='footy';switchView('live');Toast.show('Match discovery','Open this fixture in Football for its provider options.','info');}}catch(e){Live.tab='footy';switchView('live');Toast.show('Provider unavailable','Your original football providers and fallback remain available in Football.','warn');}finally{b.disabled=false;}};grid.appendChild(b);});sec.appendChild(grid);if(!list.length)sec.appendChild(node('p','sd-note','No confirmed live or future fixtures are available yet. Open Football to update the provider schedule.'));home.appendChild(sec);}
  const footballCounts=new Map((aggregate.matches||[]).map(x=>[norm(x.label),x.searches]));const teamCounts=new Map((aggregate.teams||[]).map(x=>[norm(x.label),x.searches]));
  const pop=f=>(footballCounts.get(norm(title(f)))||0)+teamNames(f).reduce((n,t)=>n+(teamCounts.get(norm(t))||0),0);
  footballSection('sdTrendingFootball','Trending Football',available.filter(f=>pop(f)>0).sort((a,b)=>pop(b)-pop(a)),scopeText);
  footballSection('sdRecommendedFootball','Matches you may like',available.sort((a,b)=>{const affinity=f=>teamNames(f).reduce((n,t)=>n+(p.teams[norm(t)]||0)*3,0)+pop(f);return affinity(b)-affinity(a)||FS.epoch(a)-FS.epoch(b);}),'Favourite teams + search popularity');
 })().finally(()=>{refreshing=null;});return refreshing;}
 const homeRender=Home.render.bind(Home);Home.render=async function(){const r=await homeRender(...arguments);warm().then(refresh);refresh();return r;};
 // Reuse the cached existing schedule endpoint, never contact SportSRC ahead of it.
 async function footballWarm(){try{const r=await fetch('/api/football-alt',{signal:AbortSignal.timeout(18000)});const j=await r.json();if(j.success){rememberFootball(j.fixtures||[]);refresh();}}catch(e){}}
 let adminSeq=0;
 async function adminPanel(el){const sequence=++adminSeq;const host=node('div','sd-card');host.id='sdAdminAnalytics';const head=node('div','sd-sec-head');head.appendChild(node('h4','','Smart Search Analytics'));
  const select=node('select');[['1','Daily · today EAT'],['7','Weekly · last 7 days'],['30','Monthly · last 30 days']].forEach(([v,label])=>{const opt=node('option','',label);opt.value=v;select.appendChild(opt);});select.value='7';head.appendChild(select);host.appendChild(head);const content=node('div');host.appendChild(content);el.appendChild(host);
  async function paint(){const n=++adminSeq,days=Number(select.value);content.replaceChildren(node('p','sd-note','Loading search analytics…'));const d=await summary(days,true);if(n!==adminSeq||!document.body.contains(host))return;
   content.replaceChildren(node('p','sd-note',(d.scope==='community'?'Community totals from verified signed-in users. Guests and opt-out users are device-only.':'DEVICE-ONLY totals. Configure existing Firebase server credentials to aggregate verified signed-in users across devices.')+' Repeated searches for the same entity are counted once per 10 minutes. Selected movies, matching teams and matches are entity searches; text queries are counted separately.'));
   const kpis=node('div','sd-kpis');[['Entity searches',d.totals.searches],['Movie / match views',d.totals.views],['Submitted queries',d.totals.queries]].forEach(([label,num])=>{const box=node('div','sd-kpi');box.append(node('span','',label),node('b','',String(num||0)));kpis.appendChild(box);});content.appendChild(kpis);
   const split=node('div','sd-two');[['Most searched movies',d.movies],['Most searched matches',d.matches],['Most searched teams',d.teams],['Submitted search terms',d.queries]].forEach(([label,list])=>{const card=node('div','sd-card');card.appendChild(node('h4','',label));const table=node('table','sd-tbl'),thead=node('thead'),h=node('tr');['Title / team / term','Searches','Views'].forEach(text=>h.appendChild(node('th','',text)));thead.appendChild(h);table.appendChild(thead);const tbody=node('tbody');(list||[]).slice(0,12).forEach(x=>{const row=node('tr');row.append(node('td','',x.label),node('td','n',String(x.searches)),node('td','n',String(x.views)));tbody.appendChild(row);});table.appendChild(tbody);card.appendChild(table);if(!(list||[]).length)card.appendChild(node('p','sd-empty','No data in this period.'));split.appendChild(card);});content.appendChild(split);
   const chart=node('div','sd-card');chart.appendChild(node('h4','','Daily entity searches · EAT'));const canvas=node('canvas');canvas.height=180;chart.appendChild(canvas);content.appendChild(chart);const daily=d.daily||[];if(daily.length&&typeof Chart!=='undefined')Chart.bar(canvas,daily.map(x=>x.day.slice(5)),daily.map(x=>x.searches),'#e11d2e');else chart.appendChild(node('p','sd-note','No search activity recorded.'));
  }
  select.onchange=paint;await paint();
 }
 const analytics=Admin.analytics.bind(Admin);Admin.analytics=function(el){analytics(el);if(State.user?.isAdmin&&State.user.cloudVerified&&State.accessToken)adminPanel(el);};
 const settings=Settings.openModal.bind(Settings);Settings.openModal=function(){settings();const root=document.getElementById('settingsModal');if(!root)return;const group=node('div','set-group');group.appendChild(node('h4','','Smart discovery privacy'));group.appendChild(node('p','sd-note','Search suggestions use movie metadata and on-device typo matching — no paid AI service. Your viewing preferences stay on this device. Signed-in users can contribute submitted searches and selected titles/teams to community trends; no email or user name is shown in analytics. Guests are device-only.'));
  const row=node('label','set-row');row.appendChild(node('span','','Share aggregated search activity'));const share=node('input');share.type='checkbox';share.checked=read('share:'+owner(),true);share.disabled=!State.user;share.onchange=()=>store('share:'+owner(),share.checked);row.appendChild(share);group.appendChild(row);
  const clear=node('button','btn sm','Clear this account’s discovery history');clear.type='button';clear.onclick=()=>{store('prefs:'+owner(),{genres:{},teams:{},seen:{},matches:{}});store('events',events().filter(e=>e.owner!==owner()));store('dedup',{});Toast.show('Discovery history cleared','Local preferences and search history were cleared. Existing watch history is unchanged. Aggregate community totals are not erased.','ok');};group.appendChild(clear);root.appendChild(group);
 };
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh();});setInterval(()=>{if(document.visibilityState==='visible'&&State.view==='home')refresh();},600000);
 setInterval(()=>{document.querySelectorAll('[data-nf-expires]').forEach(e=>{if(Number(e.dataset.nfExpires)<=Date.now())e.remove();});},30000);
 window.NFSmart={find,rank,similarity,remember,rememberFootball,selectFootball,viewFootball,searchFootball,summary,localSummary,refresh,warm,log};
 warm().then(()=>{if(State.view==='home')refresh();});footballWarm();
})();
