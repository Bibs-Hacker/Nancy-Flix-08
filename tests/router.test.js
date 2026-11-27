const assert=require('node:assert/strict');const Module=require('node:module');const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'..');const config=require('../vercel.json');
const original=Module._load;let calls=[];
Module._load=function(name,parent,isMain){if(name.startsWith('../lib/handlers/')&&parent.filename.endsWith('/api/index.js'))return async(req,res)=>{calls.push({name,url:req.url,query:req.query,body:req.body,headers:req.headers});return res.status(200).json({service:name});};return original.apply(this,arguments);};
const router=require('../api/index');
const response=()=>({headers:{},statusCode:200,setHeader(k,v){this.headers[k]=v;},status(c){this.statusCode=c;return this;},json(d){this.body=d;return this;},end(){return this;}});
(async()=>{
 const routes=config.rewrites.filter(r=>r.source.startsWith('/api/'));
 assert.equal(routes.length,13);assert.deepEqual(fs.readdirSync(path.join(root,'api')),['index.js']);
 for(const route of routes){const target=new URL(route.destination,'https://example.test');const service=target.searchParams.get('service');const res=response();
 const body={kind:'movie',id:1,label:'Movie'};const headers={authorization:'Bearer test'};
 await router({url:route.destination+'&days=7&mode=admin&channel=UCtest&path=%2Fsearch%2Fmovie',method:'POST',query:{service},body,headers},res);
 assert.equal(res.statusCode,200,service);const last=calls.at(-1);assert.equal(last.name,'../lib/handlers/'+service);assert.equal(last.body,body);assert.equal(last.headers,headers);assert.equal(last.query.service,undefined);assert.equal(last.query.days,'7');assert.ok(last.url.startsWith('/api/'+service+'?'));assert.ok(last.url.includes('days=7'));}
 let res=response();await router({url:'/api/index?service=__proto__',query:{},headers:{}},res);assert.equal(res.statusCode,404);
 res=response();await router({url:'/api/index?service=../security',query:{},headers:{}},res);assert.equal(res.statusCode,404);
 res=response();await router({url:'/api/discovery?days=30',query:{service:'discovery',days:'30'},method:'GET',headers:{}},res);assert.equal(res.statusCode,200);assert.ok(calls.at(-1).url.includes('days=30'));
 Module._load=original;
 res=response();await router({url:'/api/index?service=kids',query:{service:'kids'},method:'GET',headers:{}},res);assert.equal(res.statusCode,200);assert.ok(res.body);
 delete process.env.TMDB_V3_KEY;delete process.env.TMDB_API_KEY;
 res=response();await router({url:'/api/index?service=tmdb',query:{service:'tmdb'},method:'GET',headers:{}},res);assert.equal(res.statusCode,503);assert.equal(res.body.error,'tmdb_not_configured');
 res=response();await router({url:'/api/index?service=discovery',query:{service:'discovery'},method:'POST',headers:{},body:{}},res);assert.equal(res.statusCode,401);
 console.log('Single-function router passed: 13 route mappings, body/token/query preservation, invalid route rejection, real Kids handler, honest TMDB config error, discovery authorization.');
})().catch(e=>{Module._load=original;console.error(e);process.exit(1);});
