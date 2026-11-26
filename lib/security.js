const OWNERS = ['merabnoels@gmail.com','bridah888@gmail.com','achiengnancy65@gmail.com','devbriannova@gmail.com'];
function firebaseApp(){
  const admin=require('firebase-admin');
  if(!admin.apps.length){
    const projectId=process.env.FIREBASE_PROJECT_ID||'';
    const clientEmail=process.env.FIREBASE_CLIENT_EMAIL||'';
    const privateKey=String(process.env.FIREBASE_PRIVATE_KEY||'').replace(/\\n/g,'\n');
    if(!projectId||!clientEmail||!privateKey)throw new Error('Firebase server credentials are not configured');
    admin.initializeApp({credential:admin.credential.cert({projectId,clientEmail,privateKey})});
  }
  return admin.app();
}
async function authenticate(req){
  const headers=req.headers||{};
  const token=String(headers.authorization||headers.Authorization||'').replace(/^Bearer\s+/i,'');
  if(!token)return null;
  // Firebase is the deployed client backend. Verify signature, issuer, expiry,
  // revocation and email ownership; never decode an unverified JWT for roles.
  try{
    const decoded=await firebaseApp().auth().verifyIdToken(token,true);
    if(decoded.uid&&decoded.email&&decoded.email_verified===true)
      return {id:decoded.uid,email:String(decoded.email).toLowerCase(),email_confirmed_at:true,backend:'firebase'};
  }catch(e){}
  // Retain genuinely verified Supabase sessions for the legacy backend only.
  const url=(process.env.SUPABASE_URL||'').replace(/\/$/,'');
  const key=process.env.SUPABASE_ANON_KEY||process.env.SUPABASE_SERVICE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return null;
  try{const r=await fetch(url+'/auth/v1/user',{headers:{apikey:key,Authorization:'Bearer '+token}});if(!r.ok)return null;const u=await r.json();if(!u.id||!u.email_confirmed_at)return null;return Object.assign({},u,{backend:'supabase'});}catch(e){return null;}
}
function isAdmin(u){return !!(u&&u.email_confirmed_at&&OWNERS.includes(String(u.email||'').toLowerCase()));}
module.exports={authenticate,isAdmin,firebaseApp,OWNERS};
