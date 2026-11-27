/* Offline, deterministic static build. No secrets, admin helpers or tests are published. */
const fs=require('fs');const path=require('path');
const ROOT=path.resolve(__dirname,'..');const OUTPUT=path.join(ROOT,'public');
const APP_VERSION='8.10.0';
const config=JSON.parse(fs.readFileSync(path.join(ROOT,'vercel.json'),'utf8'));
const version=JSON.parse(fs.readFileSync(path.join(ROOT,'version.json'),'utf8'));
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
if(version.version!==APP_VERSION||!html.includes("const APP_VERSION = '8.10.0';"))throw Error('App version must remain 8.10.0');
const functions=[];
function collect(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,entry.name);if(entry.isDirectory())collect(f);else if(/\.(js|ts|mjs|cjs|py|go|rb)$/.test(entry.name))functions.push(path.relative(ROOT,f));}}
collect(path.join(ROOT,'api'));
// GitHub uploads merge folders; clean obsolete entrypoints from this BUILD copy.
// Implementations are preserved under lib/handlers, never deleted there.
const apiDir=path.join(ROOT,'api');
if(!fs.existsSync(path.join(apiDir,'index.js')))throw Error('Upload api/index.js from the repair ZIP.');
const required=['auth-code','discovery','entitlement','football','football-alt','kids','live','livecheck','share','sportsrc','stripe-verify','tmdb','welcome'];
for(const name of required)if(!fs.existsSync(path.join(ROOT,'lib','handlers',name+'.js')))throw Error('Upload missing lib/handlers/'+name+'.js');
let removed=0;
for(const entry of fs.readdirSync(apiDir,{withFileTypes:true})){
 if(entry.name==='index.js')continue;
 fs.rmSync(path.join(apiDir,entry.name),{recursive:true,force:true});removed++;
}
if(removed)console.log('Removed '+removed+' obsolete API entries from build copy; GitHub files were not changed.');
functions.length=0;collect(apiDir);
if(functions.length!==1||functions[0]!=='api/index.js')throw Error('Expected only the unified api/index.js entrypoint after cleanup.');
if(config.outputDirectory!=='public')throw Error('Output Directory must be public.');
fs.rmSync(OUTPUT,{recursive:true,force:true});fs.mkdirSync(OUTPUT,{recursive:true});
const files=['index.html','version.json','sw.js','manifest.webmanifest','kids-catalogue.json','og-share.jpg'];
for(const name of files)fs.copyFileSync(path.join(ROOT,name),path.join(OUTPUT,name));
for(const name of ['assets','icons','audio'])fs.cpSync(path.join(ROOT,name),path.join(OUTPUT,name),{recursive:true});
fs.mkdirSync(path.join(OUTPUT,'lib'));fs.copyFileSync(path.join(ROOT,'lib','football-state.js'),path.join(OUTPUT,'lib','football-state.js'));
if(fs.existsSync(path.join(OUTPUT,'lib','security.js'))||fs.existsSync(path.join(OUTPUT,'lib','handlers')))throw Error('Private server code must never be published.');
console.log('NANCYFLIX '+APP_VERSION+' / '+version.deploymentRevision);
console.log('Public app copied to public. Server functions: 1. Original API routes retained: 13.');
console.log('Credentials remain host environment variables, not static assets.');
