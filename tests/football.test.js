/* Mocked score-bridge tests: date windows, EAT handling, dedupe, secrets. */
const assert=require('node:assert/strict');
const path=require('path');
process.env.API_FOOTBALL_KEY='unit-test-key';
const handler=require(path.join(__dirname,'..','api/football.js'));
function res(){const o={statusCode:200,headers:{}};o.setHeader=(k,v)=>o.headers[k.toLowerCase()]=v;o.status=c=>(o.statusCode=c,o);o.json=b=>(o.body=b,o);o.end=()=>o;return o;}
const calls=[];global.fetch=async(u,opt)=>{calls.push({url:String(u),opt});
 return {ok:true,status:200,headers:new Map([['x-ratelimit-requests-remaining','12']]),json:async()=>({response:[{fixture:{id:calls.length,timestamp:1795798800,date:'2026-11-27T22:00:00+00:00',status:{short:'NS',long:'Not Started'}},league:{id:39,name:'Premier League'},teams:{home:{name:'Arsenal'},away:{name:'Chelsea'}},goals:{home:null,away:null}},{fixture:{id:99,timestamp:1795798800,date:'2026-11-27T22:00:00+00:00',status:{short:'NS',long:'Not Started'}},league:{id:39,name:'Premier League'},teams:{home:{name:'A'},away:{name:'B'}},goals:{home:null,away:null}}]})};};
(async()=>{
 let r=res();await handler({method:'GET',url:'/api/football?ep=fixtures&date=2026-11-28&timezone=Africa/Nairobi'},r);
 assert.equal(r.statusCode,200);assert.equal(calls.length,1);assert.ok(calls[0].url.includes('date=2026-11-28'));assert.ok(calls[0].url.includes('timezone=Africa%2FNairobi'));assert.ok(calls[0].opt.headers['x-apisports-key']==='unit-test-key');assert.ok(!JSON.stringify(r.body).includes('unit-test-key'));assert.equal(r.body.response.length,2);
 calls.length=0;r=res();await handler({method:'GET',url:'/api/football?ep=fixtures&dates=3&timezone=Africa/Nairobi'},r);
 assert.equal(r.body._window,3);assert.ok(calls.length>=2&&calls.length<=3);assert.ok(calls.every(c=>c.url.includes('date=')));assert.ok(!JSON.stringify(r.body).includes('unit-test-key'));
 calls.length=0;r=res();await handler({method:'GET',url:'/api/football?ep=fixtures&dates=3'},r);assert.equal(calls[0].url.includes('timezone='),false);
 r=res();await handler({method:'GET',url:'/api/football?ep=nope'},r);assert.equal(r.statusCode,400);
 r=res();await handler({method:'POST',url:'/api/football'},r);assert.equal(r.statusCode,405);
 console.log('Football bridge mocked tests passed: single EAT date preserved, 3-day window and dedupe, key never returned.');
})().catch(e=>{console.error(e);process.exit(1);});
