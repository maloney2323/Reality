// Trusted signed-in owner readback of independently settled native/pr original
// receipts and their separately sourced economic observations. Never a mutation.
import {projectRealityShiftFinalValueReceipts}
 from './reality-shift-final-value-evidence-v1.js';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export async function readOwnerShiftFinalValueReceipts({
 session,db,env=process.env,fetchImpl=fetch}={}){
 if(env.VERCEL_ENV!=='preview'||!UUID.test(session?.user_id||'')||
  !db?.strictSecrets||!db.secretKey||
  db.url!==session.config?.url||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  throw Error('SHIFT_FINAL_VALUE_OWNER_PREVIEW_SCOPE_UNVERIFIED');
 const response=await fetchImpl(db.url+
  '/rest/v1/rpc/reality_read_owner_shift_final_value_receipts_v1',{
  method:'POST',cache:'no-store',redirect:'error',
  headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
   'content-type':'application/json',accept:'application/json'},
  body:JSON.stringify({p_owner_id:session.user_id}),
  signal:AbortSignal.timeout(13000)
 });
 if(!response?.ok)throw Error('SHIFT_FINAL_VALUE_PROVIDER_READ_UNAVAILABLE');
 const raw=await response.json();
 return projectRealityShiftFinalValueReceipts(raw);
}
