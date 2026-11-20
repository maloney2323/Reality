// Owner-only read-only exact repair approval readback.
// A dedicated diagnostic/approval screen must not depend on loading 7
// historical shifts, model response, or the entire Chat transcript.
// This GET cannot approve, install, retry an ambiguous write or create work.
import {privateChatConfig,authenticatedChatSession}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from '../../src/reality-reliability-db-boundary-v0.1.js';
import {shiftRpc}
 from '../../src/reality-governed-shift-boundary-v1.js';

export const maxDuration=25;
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const PATH='src/reality-qualified-source-requalification-v1.js';
const BRANCH='reality/chat-direct-work-handoff-20261115';
function result(res,http,status,fields={}){
 return res.status(http).json({
  ok:http===200,status,owner_approval_recorded:false,
  read_only:true,approval_submitted:false,
  installation_requested:false,original_job_completed:false,
  production_changed:false,new_shift_started:false,...fields
 });
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private,no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 try{
  if(req.method!=='GET'||Object.keys(req.query||{}).length)
   return result(res,405,'EXACT_OWNER_INSTALL_STATUS_GET_ONLY');
  privateChatConfig();
  const session=await authenticatedChatSession(req,res);
  if(!session?.user_id||!session?.access_token)
   return result(res,401,'EXACT_OWNER_SIGN_IN_REQUIRED');
  const db=resolveReliabilityBenchmarkDb();
  if(process.env.VERCEL_ENV!=='preview'||db?.strictSecrets!==true||
   db.project!==process.env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
   db.url!=='https://'+db.project+'.supabase.co'||
   db.url!==session.config.url||
   typeof db.secretKey!=='string'||db.secretKey.length<25)
   return result(res,503,'EXACT_OWNER_ISOLATED_SERVICE_READBACK_UNAVAILABLE');
  const card=await shiftRpc(db,'reality_read_owner_signed_maintenance_install_decision_v1',{
   p_owner_id:session.user_id
  });
  if(card?.status==='NO_EXACT_OWNER_MAINTENANCE_INSTALL_DECISION_READY'&&
    card.owner_approval_ready===false&&card.installation_authorized===false)
   return result(res,200,'NO_EXACT_REPAIR_DECISION_AVAILABLE', {
    owner_approval_ready:false,installation_authorized:false
   });
  const ready=card?.status==='EXACT_OWNER_MAINTENANCE_INSTALL_APPROVAL_READY';
  const decided=card?.status==='EXACT_OWNER_MAINTENANCE_INSTALL_DECISION_RECORDED';
  if(!(ready||decided)||card?.owner_id!==session.user_id||
   !UUID.test(card.shift_id||'')||!UUID.test(card.maintenance_id||'')||
   card.source_ref!=='https://github.com/maloney2323/Reality/pull/308'||
   card.target_path!==PATH||card.target_branch!==BRANCH||
   !SHA.test(card.target_head_sha||'')||
   !SHA.test(card.expected_old_blob_sha||'')||
   !SHA.test(card.candidate_commit_sha||'')||
   !SHA.test(card.candidate_source_blob_sha||'')||
   !HASH.test(card.artifact_receipt_sha256||'')||
   !HASH.test(card.case_ci_receipt_sha256||'')||
   !HASH.test(card.target_review_receipt_sha256||'')||
   card.original_job_completed!==false||card.production_changed!==false||
   card.new_shift_started!==false||
   card.owner_approval_ready!==ready||
   card.installation_authorized!==decided||
   (ready&&(card.repair_installed!==false||
    card.approval_id!==null||card.approval_receipt_sha256!==null||
    card.decision_state!==null))||
   (decided&&(
    !['APPROVED','FENCED','INSTALLED','VERIFIED'].includes(card.decision_state)||
    !UUID.test(card.approval_id||'')||
    !HASH.test(card.approval_receipt_sha256||''))))
   return result(res,503,'EXACT_OWNER_LEDGER_READBACK_UNVERIFIED_NO_ACTION');
  // This response intentionally shows EXACT source/receipt identity and
  // stage-specific proof without treating approval as installed or settled.
  const stage=ready?'AWAITING_EXACT_OWNER_APPROVAL':
   card.decision_state==='APPROVED'?'EXACT_OWNER_APPROVED_AWAITING_SIGNED_INSTALL':
   card.decision_state==='FENCED'?'EXACT_INSTALL_FENCED_RECONCILIATION_ONLY':
   card.decision_state==='INSTALLED'?'EXACT_SOURCE_INSTALLED_AWAITING_INDEPENDENT_VERIFICATION':
   'INDEPENDENT_REPAIR_VERIFIED_ORIGINAL_SHIFT_STILL_OPEN';
  return result(res,200,stage,{
   shift_id:card.shift_id,maintenance_id:card.maintenance_id,
   source_ref:card.source_ref,
   target_branch:card.target_branch,target_path:card.target_path,
   target_head_sha:card.target_head_sha,
   expected_old_blob_sha:card.expected_old_blob_sha,
   candidate_commit_sha:card.candidate_commit_sha,
   candidate_source_blob_sha:card.candidate_source_blob_sha,
   target_review_receipt_sha256:card.target_review_receipt_sha256,
   artifact_receipt_sha256:card.artifact_receipt_sha256,
   case_ci_receipt_sha256:card.case_ci_receipt_sha256,
   owner_approval_ready:ready,
   owner_approval_recorded:decided,
   approval_id:decided?card.approval_id:null,
   approval_receipt_sha256:decided?card.approval_receipt_sha256:null,
   installation_authorized:decided,
   repair_installed:card.repair_installed===true,
   installed_commit_sha:SHA.test(card.installed_commit_sha||'')?
    card.installed_commit_sha:null,
   independent_postinstall_receipt_sha256:
    HASH.test(card.independent_postinstall_receipt_sha256||'')?
     card.independent_postinstall_receipt_sha256:null,
   // This view NEVER grants customer-original completion.
   next_action:ready?'OWNER_CLICK_EXACT_REPAIR_ONCE':
    card.decision_state==='VERIFIED'?
     'RESUME_AND_INDEPENDENTLY_VERIFY_SAME_ORIGINAL_WORK':
     'EXISTING_SIGNED_WORKER_CONTINUATION'
  });
 }catch{
  return result(res,503,'EXACT_OWNER_LEDGER_OR_SESSION_READBACK_UNAVAILABLE');
 }
}
