/* Mocked unit/integration tests. No real accounts, credentials or streams. */
const assert=require('node:assert/strict');
const Module=require('node:module');
const FS=require('../lib/football-state');
let passed=0;function check(label,fn){fn();passed++;console.log('PASS '+label);}
const now=Date.now(),future=Math.floor(now/1000)+3600,past=Math.floor(now/1000)-3600;
check('EAT date crosses UTC midnight',()=>assert.equal(FS.date(Date.parse('2026-11-27T22:00:00Z')),'2026-11-28'));
check('Explicit timezone offsets resolve identically',()=>assert.equal(FS.epoch({kickoff:'2026-11-28T01:00:00+03:00'}),FS.epoch({kickoff:'2026-11-27T22:00:00Z'})));
check('Date-only and timezone-free kickoff use EAT',()=>{assert.equal(FS.epoch({date:'2026-11-28'}),Date.parse('2026-11-27T21:00:00Z'));assert.equal(FS.epoch({kickoff:'2026-11-28T01:30:00'}),Date.parse('2026-11-27T22:30:00Z'));});
for(const s of ['NS','TBD','not_started','scheduled'])check('Future Upcoming '+s,()=>assert.equal(FS.upcoming({status:s,timestamp:future},now),true));
for(const s of ['LIVE','HT','2H','FT','AET','PEN','PST','CANC','SUSP','ABD','unknown'])check('Excluded from Upcoming '+s,()=>assert.equal(FS.upcoming({status:s,timestamp:future},now),false));
check('Past NS never stays Upcoming',()=>assert.equal(FS.upcoming({status:'NS',timestamp:past},now),false));
check('Missing kickoff never appears Upcoming',()=>assert.equal(FS.upcoming({status:'NS'},now),false));
check('No guessed live or finished for a stale schedule',()=>assert.equal(FS.state({timestamp:past}),'unknown'));
check('Explicit cancelled status outranks isLive',()=>assert.equal(FS.state({status:'cancelled',isLive:true}),'cancelled'));
check('Today uses EAT rather than host timezone',()=>assert.equal(FS.accept({kickoff:'2026-11-27T22:30:00Z'},'today',Date.parse('2026-11-28T04:00:00Z')),true));
check('Independent provider tabs are mutually correct',()=>{const rows=[{status:'NS',timestamp:future},{status:'LIVE',timestamp:past},{status:'FT',timestamp:past},{status:'PST',timestamp:future}];assert.equal(FS.filter(rows,'next',now).length,1);assert.equal(FS.filter(rows,'live',now)[0].status,'LIVE');assert.equal(FS.filter(rows,'finished',now)[0].status,'FT');});
const realLoad=Module._load;
const records=new Map();let user=null;
const db={collection(){return {doc(id){return {id};},where(){return this;},async get(){return {docs:[...records.values()].map(data=>({data:()=>data}))};}}},async runTransaction(fn){return fn({async get(ref){return {exists:records.has(ref.id),data:()=>JSON.parse(JSON.stringify(records.get(ref.id)||{}))};},set(ref,data){records.set(ref.id,JSON.parse(JSON.stringify(data)));}});}};
Module._load=function(name,parent,isMain){if(name==='../security'&&parent.filename.endsWith('/lib/handlers/discovery.js'))return {authenticate:async()=>user,isAdmin:u=>u.isAdmin===true,firebaseApp:()=>({})};if(name==='firebase-admin')return {firestore:()=>db};return realLoad.apply(this,arguments);};
const handler=require('../lib/handlers/discovery');const {payload,aggregate}=handler._test;
check('Movie metadata stays bounded and valid',()=>{const e=payload({kind:'movie',id:27205,label:'Inception',action:'search',genre_ids:[28,-1,'878'],poster_path:'/abc.jpg',release_date:'2010-07-16'});assert.deepEqual(e.genre_ids,[28]);assert.equal(e.id,'27205');});
for(const label of ['x@example.com','https://example.com','0712345678'])check('Private labels rejected '+label,()=>assert.throws(()=>payload({kind:'query',label})));
check('Invalid IDs and kinds are rejected',()=>{assert.throws(()=>payload({kind:'movie',id:-1,label:'Wrong'}));assert.throws(()=>payload({kind:'password',label:'Wrong'}));});
check('Dangerous poster URI omitted',()=>assert.equal(payload({kind:'movie',id:1,label:'Movie',poster_path:'javascript:bad'}).poster_path,undefined));
check('Queries stay separate from entity searches; shards merge',()=>{const d=aggregate([{day:'2026-11-27',items:{a:{kind:'movie',id:'1',label:'Movie',searches:2,views:1},q:{kind:'query',id:'q',label:'term',searches:4,views:0}}},{day:'2026-11-27',items:{a:{kind:'movie',id:'1',label:'Movie',searches:3,views:2}}}],7);assert.deepEqual(d.totals,{searches:5,views:3,queries:4});assert.equal(d.movies[0].searches,5);assert.equal(d.daily[0].searches,5);});
function response(){return {statusCode:200,headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;},status(n){this.statusCode=n;return this;},json(j){this.body=j;return this;},end(){return this;}};}
async function call(method,url,body){const r=response();await handler({method,url,body,headers:{}},r);return r;}
(async()=>{
 let r=await call('PUT','/api/discovery');check('Unsupported method returns 405',()=>assert.equal(r.statusCode,405));
 r=await call('GET','/api/discovery?days=90');check('Invalid analytics period returns 400',()=>assert.equal(r.statusCode,400));
 r=await call('POST','/api/discovery',{kind:'movie',id:1,label:'Movie'});check('Anonymous community writes denied',()=>assert.equal(r.statusCode,401));
 r=await call('GET','/api/discovery?mode=admin');check('Anonymous admin analytics denied',()=>assert.equal(r.statusCode,401));
 user={id:'user',isAdmin:false};r=await call('GET','/api/discovery?mode=admin');check('Ordinary users cannot read admin queries',()=>assert.equal(r.statusCode,403));
 const e={kind:'movie',id:27205,label:'Inception',action:'search'};
 r=await call('POST','/api/discovery',e);check('Verified search records in EAT daily aggregate',()=>{assert.equal(r.body.status,'recorded');assert.equal([...records.values()][0].day,FS.date());});
 r=await call('POST','/api/discovery',e);check('10-minute duplicate guard prevents inflation',()=>assert.equal(r.body.status,'duplicate'));
 r=await call('POST','/api/discovery',{...e,action:'view'});check('Views counted separately',()=>assert.equal(r.body.status,'recorded'));
 user={id:'admin',isAdmin:true};r=await call('GET','/api/discovery?days=1&mode=admin');check('Admin receives correct totals',()=>assert.deepEqual(r.body.totals,{searches:1,views:1,queries:0}));
 user=null;r=await call('GET','/api/discovery?days=1');check('Public trends omit queries, daily counts and totals',()=>{assert.equal(r.body.queries,undefined);assert.equal(r.body.daily,undefined);assert.equal(r.body.totals,undefined);assert.equal(r.body.movies[0].label,'Inception');assert.ok(!JSON.stringify(r.body).includes('actors'));});
 Module._load=realLoad;console.log(passed+' discovery/status mocked checks passed. External services NOT tested.');
})().catch(e=>{Module._load=realLoad;console.error(e);process.exitCode=1;});
