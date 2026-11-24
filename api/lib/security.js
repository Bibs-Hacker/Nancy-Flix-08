const OWNERS = ['bridah888@gmail.com','agollanancy@gmail.com'];
async function authenticate(req) {
  const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
  const url=(process.env.SUPABASE_URL||'').replace(/\/$/,'');
  const key=process.env.SUPABASE_ANON_KEY||process.env.SUPABASE_SERVICE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!token||!url||!key)return null;
  try{const r=await fetch(url+'/auth/v1/user',{headers:{apikey:key,Authorization:'Bearer '+token}});if(!r.ok)return null;const u=await r.json();if(!u.id||!u.email_confirmed_at)return null;return u;}catch(e){return null;}
}
function isAdmin(u){return !!(u&&u.email_confirmed_at&&OWNERS.includes(String(u.email).toLowerCase()));}
module.exports={authenticate,isAdmin};
