const assert=require('assert');
const path=require('path');
const ROOT=path.join(__dirname,'..');
const handler=require(path.join(ROOT,'api/sportsrc.js'));
function res(){const o={statusCode:200,headers:{},body:null};o.setHeader=(k,v)=>{o.headers[k.toLowerCase()]=v;};o.status=c=>{o.statusCode=c;return o;};o.json=b=>{o.body=b;return o;};o.end=()=>o;return o;}
function req(q,method='GET'){return {method,url:'/api/sportsrc?'+q,headers:{}};}
const realFetch=global.fetch;let calls=[];
function mock(fn){calls=[];global.fetch=async(url,opt)=>{calls.push({url:String(url),headers:opt&&opt.headers});return fn(String(url),opt);};}
const ok=(body,extra={})=>({status:200,headers:new Map(Object.entries(extra)),json:async()=>body});
(async()=>{
  delete process.env.SPORTSRC_KEY;
  let r=res();await handler(req('action=account'),r);assert.equal(r.statusCode,503);assert.equal(r.body.configured,false);assert.ok(/SPORTSRC_KEY/.test(r.body.error));
  process.env.SPORTSRC_KEY='test-key';
  r=res();await handler(req('action=nope'),r);assert.equal(r.statusCode,400);
  r=res();await handler(req('action=detail&id=../etc'),r);assert.equal(r.statusCode,400);
  r=res();await handler(req('action=matches&date=2026-13-99'),r);assert.equal(r.statusCode,400);
  r=res();await handler(req('action=account','POST'),r);assert.equal(r.statusCode,405);
  mock(async()=>({status:401,headers:new Map(),json:async()=>({success:false,message:'Missing API Key'})}));
  r=res();await handler(req('action=account'),r);assert.equal(r.statusCode,502);assert.equal(r.body.upstream,'unauthorised');
  assert.equal(calls[0].headers['X-API-KEY'],'test-key');assert.ok(!calls[0].url.includes('test-key'));assert.ok(!JSON.stringify(r.body).includes('test-key'));
  mock(async()=>({status:429,headers:new Map([['x-ratelimit-remaining','0']]),json:async()=>({success:false})}));
  r=res();await handler(req('action=matches'),r);assert.equal(r.statusCode,429);assert.equal(r.body.upstream,'rate_limited');
  mock(async()=>({status:200,headers:new Map([['x-plan','free'],['x-ratelimit-remaining','7']]),json:async()=>({success:true,data:[{league:{name:'Premier League',country:'England'},matches:[{id:'m1',title:'Arsenal vs Chelsea',timestamp:1790000000,status:'inprogress',is_live:true,has_stream:true,teams:{home:{name:'Arsenal'},away:{name:'Chelsea'}},score:{home:1,away:0}},{id:'m2',teams:{home:{name:'A'},away:{name:'B'}},has_stream:false}]}]})}));
  r=res();await handler(req('action=matches&status=inprogress'),r);assert.equal(r.statusCode,200);assert.equal(r.body.matches.length,1);assert.equal(r.body.matches[0].home,'Arsenal');assert.equal(r.body.live,1);assert.equal(r.body.withStream,1);assert.equal(r.body.quota.plan,'free');
  assert.ok(calls[0].url.includes('type=matches'));assert.ok(calls[0].url.includes('sport=football'));
  calls=[];r=res();await handler(req('action=matches&status=inprogress'),r);assert.equal(calls.length,0);assert.equal(r.body.cached,true);
  mock(async()=>({status:200,headers:new Map(),json:async()=>({success:true,data:{id:'m1',venue:{name:'Emirates'},referee:{name:'A Ref'},sources:[{source:'Alpha',embedUrl:'https://embed.example/1',hd:true},{source:'Alpha',embedUrl:'https://embed.example/1'},{source:'Bad',embedUrl:'javascript:alert(1)'},{source:'Insecure',embedUrl:'http://x.example/2'},{source:'Creds',embedUrl:'https://u:p@x.example/3'}]}})}));
  r=res();await handler(req('action=detail&id=m1'),r);assert.equal(r.statusCode,200);assert.equal(r.body.sources.length,1);assert.equal(r.body.sources[0].embedUrl,'https://embed.example/1');assert.equal(r.body.sources[0].hd,true);assert.equal(r.body.playable,true);assert.equal(r.body.match.venue,'Emirates');
  mock(async()=>({status:200,headers:new Map(),json:async()=>({success:true,data:{sources:[{source:'Beta',embedUrl:'https://embed.example/9'}]}})}));
  r=res();await handler(req('action=stream&id=m9'),r);assert.equal(r.body.sources.length,1);assert.equal(r.body.playable,true);
  mock(async()=>({status:200,headers:new Map(),json:async()=>({success:true,data:{plan:'free',used:3,limit:100,remaining:97}})}));
  r=res();await handler(req('action=account&x=1'),r);assert.equal(r.body.remaining,97);assert.equal(r.body.plan,'free');
  mock(async()=>({status:500,headers:new Map(),json:async()=>({})}));
  r=res();await handler(req('action=detail&id=m2'),r);assert.equal(r.statusCode,503);assert.equal(r.body.upstream,'server_error');
  mock(async()=>({status:200,headers:new Map(),json:async()=>{throw new Error('bad')}}));
  r=res();await handler(req('action=detail&id=m3'),r);assert.equal(r.body.upstream,'invalid_json');
  mock(async()=>{const e=new Error('aborted');e.name='AbortError';throw e;});
  r=res();await handler(req('action=detail&id=m4'),r);assert.equal(r.statusCode,503);assert.equal(r.body.upstream,'timeout');
  const FS=require('../lib/football-state');const d=FS.date(Date.now()+86400000),start=Date.parse(d+'T00:00:00+03:00')/1000;
  mock(async()=>ok({success:true,data:[{league:{name:'League'},matches:[{id:'future-day',title:'A vs B',timestamp:start+12*3600,status:'notstarted'},{id:'cancelled-day',title:'C vs D',timestamp:start+12*3600,status:'cancelled'},{id:'outside-day',title:'E vs F',timestamp:start-3600,status:'notstarted'}]}]}));
  r=res();await handler(req('action=matches&status=notstarted&date='+d+'&timezone=Africa%2FNairobi'),r);assert.equal(r.statusCode,200);assert.equal(r.body.matches.length,1);assert.equal(r.body.matches[0].id,'future-day');assert.equal(calls.length,2);assert.ok(calls.every(c=>!c.url.includes('timezone=')));assert.equal(new Set(calls.map(c=>new URL(c.url).searchParams.get('date'))).size,2);
  console.log('SportSRC API mocked behavior tests passed');
  global.fetch=realFetch;
})().catch(e=>{console.error(e);process.exit(1);});
