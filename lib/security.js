/* Roles come from a signature-verified identity, never a request email. */
const OWNERS = Object.freeze(['bridah888@gmail.com','devbriannova@gmail.com','merabnoels@gmail.com','achiengnancy65@gmail.com']);
function firebaseApp(requireCredential=false) {
  const admin=require('firebase-admin');
  const projectId=process.env.FIREBASE_PROJECT_ID||'nancy-flix-a9615';
  const clientEmail=process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey=String(process.env.FIREBASE_PRIVATE_KEY||'').replace(/\\n/g,'\n');
  if(requireCredential&&(!clientEmail||!privateKey))throw new Error('firebase_admin_not_configured');
  let app=admin.apps.find(a=>a.name==='nancyflix-server');
  if(!app)app=admin.initializeApp({projectId,...(clientEmail&&privateKey?{credential:admin.credential.cert({projectId,clientEmail,privateKey})}:{})},'nancyflix-server');
  return app;
}
async function authenticate(req) {
  const match=/^Bearer\s+(\S+)$/i.exec(String(req.headers?.authorization||''));
  if(!match||match[1].length>16000)return null;
  const token=match[1];
  // Firebase SDK verifies signature, issuer, audience, expiry and subject.
  try{
    const admin=require('firebase-admin');
    const claims=await admin.auth(firebaseApp()).verifyIdToken(token);
    if(!claims.uid||!claims.email||claims.email_verified!==true)return null;
    return {id:claims.uid,uid:claims.uid,email:String(claims.email).trim().toLowerCase(),email_verified:true,email_confirmed_at:true,backend:'firebase'};
  }catch(e){}
  // Keep legitimate existing Supabase accounts usable; same verified-email boundary.
  const url=(process.env.SUPABASE_URL||'').replace(/\/$/,'');
  const key=process.env.SUPABASE_ANON_KEY||process.env.SUPABASE_SERVICE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return null;
  try{
    const r=await fetch(url+'/auth/v1/user',{headers:{apikey:key,Authorization:'Bearer '+token},signal:AbortSignal.timeout(6000)});
    if(!r.ok)return null;const u=await r.json();if(!u.id||!u.email||!u.email_confirmed_at)return null;
    return {...u,email:String(u.email).trim().toLowerCase(),backend:'supabase'};
  }catch(e){return null;}
}
function isAdmin(u){return !!(u&&(u.email_verified===true||u.email_confirmed_at)&&OWNERS.includes(String(u.email).toLowerCase()));}
module.exports={authenticate,isAdmin,OWNERS,firebaseApp};
