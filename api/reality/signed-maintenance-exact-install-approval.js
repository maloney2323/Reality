// One exact signed owner click in Reality Chat. This is approval transport,
// NOT an installer, new shift or final receipt. The already signed worker
// automatically invokes the existing privileged isolated installer afterward.
import {privateChatConfig,authenticatedChatSession,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from '../../src/reality-reliability-db-boundary-v0.1.js';
import {shiftRpc} from '../../src/reality-governed-shift-boundary-v1.js';
export const maxDuration=25;
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const INTENT='OWNER_APPROVE_EXACT_SIGNED_ISOLATED_MAINTENANCE_REPAIR';
function respond(res,code,status,other={}){
 return res.status(code).json({ok:code===200||code===202,status,
  installation_completed:false,original_job_completed:false,
  production_changed:false,new_shift_started:false,...other});
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private,no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 // Both paths require authenticated owner readback; only POST records an
 // approval. A failed POST must not be automatically retried.
 let stage='VALIDATE_REQUEST';
 try{
  if(!['GET','POST'].includes(req.method)||Object.keys(req.query||{}).length)
   return respond(res,405,'EXACT_SIGNED_MAINTENANCE_OWNER_METHOD_REQUIRED');
  if(req.headers?.['sec-fetch-site']==='cross-site'||
   (req.method==='POST'&&(!req.headers?.origin||
     !String(req.headers?.['content-type']||'').toLowerCase()
       .startsWith('application/json'))))
   return respond(res,403,'EXACT_SIGNED_MAINTENANCE_SAME_ORIGIN_CLICK_REQUIRED');
  assertSameOrigin(req);
  stage='AUTHENTICATE_OWNER';
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session?.user_id||!session?.access_token)
   return respond(res,401,'EXACT_SIGNED_OWNER_SESSION_REQUIRED');
  const db=resolveReliabilityBenchmarkDb();
  if(process.env.VERCEL_ENV!=='preview'||
   db?.strictSecrets!==true||
   db.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
   db.url!=='https://'+db.project+'.supabase.co'||
   db.url!==session.config.url||
   typeof db.secretKey!=='string'||db.secretKey.length<25)
   return respond(res,503,'EXACT_SIGNED_PREVIEW_SERVICE_SCOPE_INVALID');
  const b=req.body;
  if(req.method==='POST'&&(!b||typeof b!=='object'||Array.isArray(b)||
   Object.getPrototypeOf(b)!==Object.prototype||
   Object.keys(b).sort().join(',')!==
    'candidate_commit_sha,intent,maintenance_id,request_id,shift_id,target_review_receipt_sha256'||
   !UUID.test(b.maintenance_id||'')||!UUID.test(b.shift_id||'')||
   !UUID.test(b.request_id||'')||!SHA.test(b.candidate_commit_sha||'')||
   !HASH.test(b.target_review_receipt_sha256||'')||b.intent!==INTENT))
   return respond(res,403,'EXACT_SIGNED_MAINTENANCE_ARTIFACT_CLICK_REQUIRED');
  stage='READ_EXACT_OWNER_DECISION';
  const card=await shiftRpc(db,
   'reality_read_owner_signed_maintenance_install_decision_v1',{
    p_owner_id:session.user_id
   });
  if(req.method==='GET'){
   // Exact state after an uncertain POST, using the same signed owner RPC.
   // A status read grants no authority and does not invoke the installer.
   if(card?.status==='EXACT_OWNER_MAINTENANCE_INSTALL_DECISION_RECORDED'&&
      card.owner_id===session.user_id&&
      HASH.test(card.approval_receipt_sha256||'')&&
      card.installation_authorized===true)
    return respond(res,200,'EXACT_SIGNED_OWNER_APPROVAL_RECORDED_READBACK',{
     owner_approval_recorded:true,installation_authorized:true,
     approval_receipt_sha256:card.approval_receipt_sha256,
     decision_state:card.decision_state,
     repair_installed:card.repair_installed===true,
     postinstall_verified:HASH.test(card.independent_postinstall_receipt_sha256||''),
     retry_owner_approval:false});
   if(card?.status==='EXACT_OWNER_MAINTENANCE_INSTALL_APPROVAL_READY'&&
      card.owner_id===session.user_id&&card.owner_approval_ready===true&&
      card.installation_authorized===false)
    return respond(res,200,'EXACT_SIGNED_OWNER_APPROVAL_NOT_RECORDED_READBACK',{
     owner_approval_recorded:false,installation_authorized:false,
     retry_owner_approval:false});
   if(card?.status==='NO_EXACT_OWNER_MAINTENANCE_INSTALL_DECISION_READY'&&
      card.owner_approval_ready===false&&card.installation_authorized===false)
    return respond(res,200,'EXACT_SIGNED_OWNER_APPROVAL_SCOPE_UNAVAILABLE',{
     owner_approval_recorded:false,installation_authorized:false,
     retry_owner_approval:false});
   return respond(res,503,'EXACT_SIGNED_OWNER_APPROVAL_READBACK_UNVERIFIED',{
    retry_owner_approval:false});
  }
  if(card?.status!=='EXACT_OWNER_MAINTENANCE_INSTALL_APPROVAL_READY'||
   card.owner_id!==session.user_id||
   card.shift_id!==b.shift_id||card.maintenance_id!==b.maintenance_id||
   card.candidate_commit_sha!==b.candidate_commit_sha||
   card.target_review_receipt_sha256!==b.target_review_receipt_sha256||
   card.target_branch!=='reality/chat-direct-work-handoff-20261115'||
   !SHA.test(card.target_head_sha||'')||
   !SHA.test(card.candidate_source_blob_sha||'')||
   !HASH.test(card.artifact_receipt_sha256||'')||
   !HASH.test(card.case_ci_receipt_sha256||'')||
   card.owner_approval_ready!==true||
   card.installation_authorized!==false||
   card.repair_installed!==false||card.original_job_completed!==false||
   card.production_changed!==false||card.new_shift_started!==false)
   return respond(res,409,'EXACT_SIGNED_OWNER_INSTALL_REVIEW_CHANGED_REFRESH_REQUIRED');
  stage='RECORD_EXACT_OWNER_DECISION';
  const r=await shiftRpc(db,
   'reality_record_owner_signed_maintenance_install_decision_v1',{
    p_owner_id:session.user_id,p_shift_id:b.shift_id,
    p_maintenance_id:b.maintenance_id,p_request_id:b.request_id,
    p_candidate_commit_sha:b.candidate_commit_sha,
    p_target_review_receipt_sha256:b.target_review_receipt_sha256,
    p_intent:INTENT
   });
  if(r?.status!=='EXACT_OWNER_MAINTENANCE_INSTALL_APPROVED_FOR_AUTOMATIC_CONTINUATION'||
   r.owner_id!==session.user_id||r.maintenance_id!==b.maintenance_id||
   r.shift_id!==b.shift_id||r.candidate_commit_sha!==b.candidate_commit_sha||
   r.target_review_receipt_sha256!==b.target_review_receipt_sha256||
   !UUID.test(r.approval_id||'')||!HASH.test(r.approval_receipt_sha256||'')||
   r.owner_approval_recorded!==true||r.installation_authorized!==true||
   r.repair_installed!==false||r.original_job_completed!==false||
   r.production_changed!==false||r.new_shift_started!==false)
   return respond(res,409,'EXACT_SIGNED_OWNER_APPROVAL_READBACK_UNVERIFIED_NO_RETRY',{
    retry_owner_approval:false});
  return respond(res,202,'EXACT_SIGNED_OWNER_APPROVAL_RECORDED_AUTO_CONTINUATION',{
   maintenance_id:r.maintenance_id,shift_id:r.shift_id,approval_id:r.approval_id,
   approval_receipt_sha256:r.approval_receipt_sha256,
   owner_approval_recorded:true,installation_authorized:true,
   next_gate:'AUTOMATIC_SAME_SIGNED_SHIFT_INSTALL_AND_INDEPENDENT_RECHECK',
   retry_owner_approval:false,no_third_confirmation:true});
 }catch(error){
  // Never log customer identifiers, tokens, request payloads, or receipt bytes.
  const message=String(error?.message||'');
  const category=message.includes('CHAT_AUTH')?'AUTH_PROVIDER':
   message.includes('SHIFT_DATABASE_RPC_')?'DATABASE_RPC_TRANSPORT':
   message.includes('PROJECT_')||message.includes('CHAT_DATABASE')?
    'PREVIEW_CONFIGURATION':'UNCLASSIFIED_FAIL_CLOSED';
  console.warn('REALITY_EXACT_INSTALL_APPROVAL_OUTCOME_UNVERIFIED',stage,category);
  return respond(res,503,'EXACT_SIGNED_OWNER_APPROVAL_OUTCOME_UNCERTAIN_CHECK_READBACK',{
   failed_stage:stage,failure_category:category,retry_owner_approval:false});
 }
}
