// Explicit owner approval for exactly one previously verified model artifact.
// The user authenticates with the existing Reality session. This route does
// not install, invoke GitHub, run an LLM, or settle the original customer job.
import {authenticatedChatSession,privateChatConfig,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from '../../src/reality-reliability-db-boundary-v0.1.js';
export const maxDuration=30;
const WORK=/^work:[a-f0-9]{32}$/;
const HASH=/^[a-f0-9]{64}$/;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 try{
  privateChatConfig();
  if(req.method!=='POST')return res.status(405).json({
   ok:false,error:'EXACT_OWNER_APPROVAL_POST_REQUIRED'});
  if(!req.headers?.origin||!String(req.headers?.['content-type']||'').toLowerCase().includes('application/json'))
   return res.status(403).json({ok:false,error:'SIGNED_ORIGIN_JSON_REQUIRED'});
  assertSameOrigin(req);
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  if(Object.keys(req.query||{}).length)
   return res.status(400).json({ok:false,error:'CLIENT_SCOPE_NOT_ACCEPTED'});
  const body=req.body;
  if(!body||Array.isArray(body)||typeof body!=='object'||
   Object.keys(body).sort().join(',')!==
    'artifact_sha256,confirmation,intent,original_work_id'||
   body.intent!=='OWNER_APPROVE_EXACT_VERIFIED_ISOLATED_CAPABILITY'||
   body.confirmation!=='APPROVE EXACT VERIFIED UPGRADE IN ISOLATED PREVIEW'||
   !WORK.test(body.original_work_id)||!HASH.test(body.artifact_sha256))
   return res.status(403).json({
    ok:false,error:'EXPLICIT_EXACT_HASH_OWNER_CONFIRMATION_REQUIRED'});
  const db=resolveReliabilityBenchmarkDb();
  if(db?.strictSecrets!==true||db.url!==session.config.url||
   db.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
   !db.secretKey)
   throw Error('OWNER_BOUND_PREVIEW_SERVICE_DATABASE_UNAVAILABLE');
  const response=await fetch(db.url+
   '/rest/v1/rpc/reality_owner_approve_qualified_preview_v1',{
   method:'POST',redirect:'error',cache:'no-store',
   headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
    'content-type':'application/json','accept':'application/json'},
   body:JSON.stringify({p_owner_id:session.user_id,
    p_original_work_id:body.original_work_id,
    p_artifact_hash:body.artifact_sha256})});
  if(!response.ok){
   const err=await response.json().catch(()=>null);
   const s=String(err?.message||'');
   const safe=/^GENUINE_APPROVAL_[A-Z0-9_]{4,160}$/.test(s)?
    s:'OWNER_APPROVAL_PROVIDER_READBACK_UNAVAILABLE';
   return res.status(409).json({ok:false,error:safe,
    installation_completed:false,original_job_completed:false});
  }
  const receipt=await response.json();
  if(receipt?.owner_id!==session.user_id||
   receipt?.original_work_id!==body.original_work_id||
   receipt?.artifact_sha256!==body.artifact_sha256||
   receipt?.approval_origin!=='AUTHENTICATED_OWNER_EXPLICIT_ACTION'||
   receipt?.status!=='OWNER_APPROVED_ISOLATED_INSTALL_PENDING'||
   receipt?.target_environment!=='ISOLATED_PREVIEW'||
   receipt?.source_installation_completed!==false||
   receipt?.original_job_completed!==false||
   receipt?.production_changed!==false)
   throw Error('OWNER_APPROVAL_RECEIPT_MISMATCH');
  return res.status(202).json({ok:true,...receipt,
   next_step:'AUTHORIZED_PENDING_GOVERNED_ISOLATED_EXECUTOR',
   worker_execution_started:false,installation_completed:false});
 }catch{
  return res.status(503).json({ok:false,
   error:'OWNER_EXACT_APPROVAL_UNAVAILABLE',
   installation_completed:false,original_job_completed:false});
 }
}