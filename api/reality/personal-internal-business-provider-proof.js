// Existing Reality Chat Work internal SOURCE provider readback. This does
// NOT prove customer data access, itemized job admission or execution.
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {shiftDatabase,shiftRpc}
 from '../../src/reality-governed-shift-boundary-v1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const REF=/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/(issues|pull)\/[1-9][0-9]*$/;
const SHA=/^sha256:[a-f0-9]{64}$/;
const ROUTE=/^reality:qualification:[a-f0-9]{64}$/;
export const maxDuration=20;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private,no-store');
 if(req.method!=='GET'||Object.keys(req.query||{}).length)
  return res.status(405).json({ok:false,error:'INTERNAL_BUSINESS_SOURCE_READ_ONLY'});
 try{
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!UUID.test(session?.user_id||''))
   return res.status(401).json({ok:false,error:'INTERNAL_BUSINESS_SOURCE_SIGN_IN_REQUIRED'});
  if(process.env.VERCEL_ENV!=='preview')
   return res.status(403).json({ok:false,error:'INTERNAL_BUSINESS_SOURCE_PREVIEW_ONLY'});
  const db=shiftDatabase();
  if(!db?.strictSecrets||db.url!==session.config?.url||
     db.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
   throw Error('INTERNAL_BUSINESS_SOURCE_OWNER_CONFIG_INVALID');
  const r=await shiftRpc(db,'reality_read_owner_internal_repo_provider_proofs_v1',{
   p_owner_id:session.user_id
  },{timeoutMs:13000});
  if(r?.status!=='OWNER_INTERNAL_BUSINESS_SOURCE_PROVIDER_PROOFS'||
   r.owner_id!==session.user_id||r.read_only!==true||
   r.internal_company_provider_only!==true||
   r.customer_source_connection_verified!==false||
   r.original_customer_job_completed!==false||
   r.owner_approval_granted!==false||r.model_execution_authorized!==false||
   r.new_shift_started!==false||r.installation_authorized!==false||
   r.production_changed!==false||
   !Number.isSafeInteger(r.provider_source_proof_count)||
   !Array.isArray(r.sources)||r.sources.length>8||
   r.sources.some(x=>!REF.test(x.source_ref||'')||
    !SHA.test(x.provider_proof_sha256||'')||
    !ROUTE.test(x.continuity_ref||'')||
    typeof x.source_title!=='string'||x.source_title.length>500||
    x.provider_double_readback_proven!==true||
    x.customer_job_completed!==false||
    x.execution_authorized!==false||
    !Number.isFinite(Date.parse(x.checked_at||''))))
   throw Error('INTERNAL_BUSINESS_SOURCE_INDEPENDENT_READBACK_INVALID');
  return res.status(200).json({ok:true,...r});
 }catch{
  return res.status(503).json({
   ok:false,error:'INTERNAL_BUSINESS_SOURCE_RECEIPT_NOT_VERIFIED',
   customer_source_connection_verified:false,original_customer_job_completed:false,
   owner_approval_granted:false,model_execution_authorized:false,
   installation_authorized:false,production_changed:false});
 }
}
