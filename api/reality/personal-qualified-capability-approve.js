// Explicit owner approval for exactly one previously verified model artifact.
// The user authenticates with the existing Reality session. This route does
// not install, invoke GitHub, run an LLM, or settle the original customer job.
import {authenticatedChatSession,privateChatConfig,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from '../../src/reality-reliability-db-boundary-v0.1.js';
import {assessTwoAuthorizationExecutionPreflight}
 from '../../src/reality-two-authorization-execution-preflight-v1.js';
export const maxDuration=45;
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
  // No installation consent may be consumed while the exact original
  // candidate lacks a supported path through post-install resumption.
  const qualification=await fetch(db.url+
   '/rest/v1/rpc/reality_read_owner_qualified_capabilities_v1',{
   method:'POST',redirect:'error',cache:'no-store',
   headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
    'content-type':'application/json','accept':'application/json'},
   body:JSON.stringify({p_owner_id:session.user_id})});
  if(!qualification.ok)throw Error('OWNER_SCOPE_PREFLIGHT_UNAVAILABLE');
  const ownerEntries=await qualification.json();
  if(!Array.isArray(ownerEntries)||ownerEntries.length>20)
   throw Error('OWNER_SCOPE_PREFLIGHT_NOT_TRUSTED');
  const matching=ownerEntries.filter(e=>e.original_work_id===body.original_work_id&&
   e.qualification?.artifact_sha256===body.artifact_sha256);
  if(matching.length!==1)return res.status(409).json({
   ok:false,error:'EXACT_OWNER_QUALIFIED_ARTIFACT_NOT_AVAILABLE',
   installation_completed:false,original_job_completed:false});
  const preflight=assessTwoAuthorizationExecutionPreflight(matching[0]);
  if(preflight.approval_gate_open!==true)return res.status(409).json({
   ok:false,error:'EXACT_FULL_LOOP_EXECUTION_PATH_NOT_READY',
   preflight_status:preflight.status,
   approval_not_recorded:true,installation_completed:false,
   original_job_completed:false,production_changed:false});
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
  // Approval and wake intent are committed in the SAME database transaction.
  // pg_net notifies the trusted edge broker asynchronously, and Postgres cron
  // checks the durable outbox every minute even with the browser closed.
  // This route NEVER writes a GitHub file, mints new authority, or retries
  // installation. Post-commit readback identifies this exact approval only.
  let wake;
  try{
   const readback=await fetch(db.url+
    '/rest/v1/rpc/reality_read_owner_governed_wakes_v1',{
    method:'POST',redirect:'error',cache:'no-store',
    headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
      accept:'application/json','content-type':'application/json'},
    body:JSON.stringify({p_owner_id:session.user_id})});
   const data=await readback.json().catch(()=>null);
   if(!readback.ok||data?.status!=='OWNER_GOVERNED_WAKE_READBACK'||
      data?.read_only!==true||data?.production_changed!==false||
      !Array.isArray(data?.wakes)||data.wakes.length>12)
     throw Error('DURABLE_WAKE_READBACK_UNAVAILABLE');
   const exact=data.wakes.filter(entry=>
     entry.approval_id===receipt.approval_id &&
     entry.original_work_id===receipt.original_work_id &&
     entry.artifact_sha256===receipt.artifact_sha256 &&
     entry.preview_only===true);
   if(exact.length!==1||
     !['WAKE_PENDING','DISPATCH_CLAIMED','DISPATCH_ACCEPTED',
       'WORKER_ALIVE','GOVERNANCE_READY','EXECUTING','RETRY_PENDING',
       'STALE_APPROVAL_BLOCKED','ESCALATED','SETTLED',
       'RECEIPT_VERIFIED'].includes(exact[0].wake_state))
     throw Error('DURABLE_EXACT_WAKE_MISSING');
   wake=exact[0];
  }catch{
   // The approval may already have committed. No second owner action is safe.
   console.warn('REALITY_APPROVED_WAKE_READBACK_UNAVAILABLE');
   return res.status(202).json({ok:true,...receipt,
    worker_wake_status:'WORKER_WAKE_NOT_VERIFIED',
    auto_trigger:'SIGNED_DB_OUTBOX_EDGE_WATCHDOG_V1',
    auto_trigger_status:'DURABLE_OUTBOX_READBACK_UNAVAILABLE',
    worker_execution_started:false,installation_completed:false,
    next_step:'READ_ONLY_LEDGER_RECOVERY_DO_NOT_REAPPROVE',
    retry_owner_approval:false,production_changed:false});
  }
  return res.status(202).json({ok:true,...receipt,
   auto_trigger:'SIGNED_DB_OUTBOX_EDGE_WATCHDOG_V1',
   auto_trigger_status:wake.wake_state,
   worker_wake_status:wake.wake_state,
   delivery_attempts:wake.dispatch_attempts,
   worker_execution_started:!!wake.worker_alive_at,
   installation_completed:false,
   next_step:'EDGE_DISPATCH_AND_WATCHDOG_OWN_RECOVERY',
   retry_owner_approval:false,production_changed:false});
 }catch{
  return res.status(503).json({ok:false,
   error:'OWNER_EXACT_APPROVAL_UNAVAILABLE',
   installation_completed:false,original_job_completed:false});
 }
}