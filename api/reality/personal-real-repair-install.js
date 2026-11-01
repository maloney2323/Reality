// The ONLY owner-facing install/continue entrypoint. A signed-in, same-origin,
// exact-source click creates atomic Supabase owner authority; continuation may
// consume that authority but can never create it. No model approval, no main.
import {privateChatConfig,authenticatedChatSession,assertSameOrigin}
 from '../../src/reality-private-chat-auth-v0.1.js';
import {createLiveGeneralRepairService}
 from '../../src/reality-live-approved-install-to-settlement-v1.0.js';
import {verifyApprovedBackgroundReadiness}
 from '../../src/reality-approved-repair-background-readiness-v1.0.js';
import {prepareVerifiedOwnerRepairCandidate}
 from '../../src/reality-owner-repair-candidate-admission-v1.0.js';
export const maxDuration=300;
const WORK=/^work:[a-f0-9]{32}$/,HASH=/^[a-f0-9]{64}$/;
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 let stage='REQUEST_VALIDATION';
 try{
  privateChatConfig();
  if(req.method!=='POST'){
   res.setHeader('Allow','POST');
   return res.status(405).json({ok:false,error:'REAL_INSTALL_POST_ONLY'});
  }
  if(!req.headers?.origin)
   return res.status(403).json({ok:false,error:'REAL_INSTALL_ORIGIN_REQUIRED'});
  assertSameOrigin(req);
  if(!String(req.headers['content-type']||'').toLowerCase().includes('application/json'))
   return res.status(415).json({ok:false,error:'REAL_INSTALL_JSON_REQUIRED'});
  if(Object.keys(req.query||{}).length)
   return res.status(403).json({ok:false,error:'REAL_INSTALL_CLIENT_SCOPE_REJECTED'});
  stage='AUTHENTICATE_OWNER';
  const session=await authenticatedChatSession(req,res);
  if(!session)return res.status(401).json({ok:false,error:'CHAT_SIGN_IN_REQUIRED'});
  const b=req.body;
  if(!b||Array.isArray(b)||typeof b!=='object'||
    !Number.isSafeInteger(b.issue_number)||b.issue_number<1||
    !WORK.test(String(b.expected_original_work_id||'')))
   return res.status(400).json({ok:false,error:'REAL_INSTALL_EXACT_ORIGINAL_WORK_REQUIRED'});
  stage='ISOLATED_SERVICE_CONSTRUCTION';
  const service=createLiveGeneralRepairService({session});
  // A single authenticated, same-origin owner command can prepare the exact
  // persisted constitutional checkpoint AND queue the worker. No browser
  // approval is inferred from GET, a chat model, source code or a scheduler.
  if(b.intent==='OWNER_AUTHORIZE_PREPARE_AND_QUEUE_EXACT_REPAIR'){
   if(Object.keys(b).sort().join(',')!==
     'candidate_artifact_hash,consent_statement,expected_original_work_id,intent,issue_number'||
     b.consent_statement!=='I_AUTHORIZE_THIS_EXACT_ISOLATED_REPAIR_AND_ORIGINAL_JOB_CONTINUATION'||
     !HASH.test(String(b.candidate_artifact_hash||'')))
    return res.status(403).json({ok:false,
     error:'REAL_INSTALL_EXPLICIT_EXACT_SOURCE_APPROVAL_REQUIRED'});
   // Verify real unattended-worker readiness before consuming owner authority.
   stage='SCHEDULER_READINESS';
   const preflight=await verifyApprovedBackgroundReadiness();
   if(preflight.ready!==true||preflight.code!=='GOVERNED_AUTO_WAKE_VERIFIED')
    return res.status(503).json({ok:false,
     error:'REAL_INSTALL_BACKGROUND_PREREQUISITES_UNAVAILABLE',
     prerequisite_status:preflight.code,owner_approval_consumed:false,
     original_job_completed:false,production_changed:false});
   stage='CONSTITUTIONAL_CHECKPOINT_PREPARATION';
   const ready=await prepareVerifiedOwnerRepairCandidate({
    session,expectedOriginalWorkId:b.expected_original_work_id,
    issueNumber:b.issue_number,
   });
   if(ready.status!=='EXACT_CANDIDATE_AWAITING_SIGNED_OWNER_INSTALL_APPROVAL'||
     ready.original_work_id!==b.expected_original_work_id||
     ready.candidate_artifact_hash!==b.candidate_artifact_hash||
     ready.independent_readback_verified!==true||
     ready.owner_installation_approved!==false||
     ready.original_job_completed!==false||
     !HASH.test(String(ready.constitutional_checkpoint_hash||'')))
    return res.status(409).json({ok:false,
     error:'REAL_INSTALL_SOURCE_OR_CHECKPOINT_CHANGED_BEFORE_APPROVAL',
     owner_approval_consumed:false,original_job_completed:false,production_changed:false});
   stage='OWNER_RESERVATION_AND_WORKER_QUEUING';
   const result=await service.ownerApproveAndQueue({
    originalWorkId:b.expected_original_work_id,issueNumber:b.issue_number,
    expectedArtifactHash:b.candidate_artifact_hash,
    expectedCheckpointHash:ready.constitutional_checkpoint_hash,
   });
   return res.status(202).json({ok:true,...result,
    review_checkpoint_receipt_id:ready.constitutional_checkpoint_receipt_id,
    original_job_completed:false,production_changed:false});
  }
  if(b.intent==='OWNER_APPROVE_EXACT_INSTALL'){
   if(Object.keys(b).sort().join(',')!==
     'candidate_artifact_hash,expected_checkpoint_hash,expected_original_work_id,intent,issue_number'||
     !HASH.test(String(b.candidate_artifact_hash||''))||
     !HASH.test(String(b.expected_checkpoint_hash||'')))
    return res.status(403).json({ok:false,error:'REAL_INSTALL_EXPLICIT_EXACT_SOURCE_APPROVAL_REQUIRED'});
   const preflight=await verifyApprovedBackgroundReadiness();
   if(preflight.ready!==true)
    return res.status(503).json({ok:false,
     error:'REAL_INSTALL_BACKGROUND_PREREQUISITES_UNAVAILABLE',
     prerequisite_status:preflight.code,owner_approval_consumed:false,
     original_job_completed:false,production_changed:false});
   const result=await service.ownerApproveAndQueue({
    originalWorkId:b.expected_original_work_id,issueNumber:b.issue_number,
    expectedArtifactHash:b.candidate_artifact_hash,
    expectedCheckpointHash:b.expected_checkpoint_hash});
   return res.status(202).json({ok:true,...result});
  }
  if(b.intent==='CONTINUE_PREVIOUSLY_APPROVED_INSTALL'){
   if(Object.keys(b).sort().join(',')!==
      'expected_original_work_id,intent,issue_number')
    return res.status(403).json({ok:false,error:'REAL_INSTALL_CONTINUATION_SCOPE_REJECTED'});
   const result=await service.continueAfterInstall({
    originalWorkId:b.expected_original_work_id,issueNumber:b.issue_number});
   return res.status(result.original_job_completed===true?200:202).json({
    ok:true,...result});
  }
  return res.status(403).json({ok:false,error:'REAL_INSTALL_UNKNOWN_AUTHORITY_INTENT'});
 }catch(error){
  const code=String(error?.message||'');
  // Only externally safe failure codes and a stage label are exposed.
  // Never put credentials, provider response bodies or owner data into logs.
  const safe=/^(?:REAL_LIVE_INSTALL_|REAL_INSTALLED_WORK_|REAL_REPAIR_READBACK_|REAL_OWNER_CANDIDATE_|GENERAL_CHECKPOINT_|GENERAL_PREVIEW_INSTALL_|GENERAL_PREVIEW_REGISTRY_|GENERAL_SETTLEMENT_|SELF_IMPROVEMENT_|GENERAL_REPAIR_CONTINUATION_|UNFINISHED_|PERSONAL_GOAL_|RELIABILITY_|REALITY_REAL_REPAIR_|GOAL_LEDGER_|GOVERNED_|UNIVERSE_)[A-Z0-9_]{3,140}$/;
  const diagnostic=safe.test(code)?code:'REAL_INSTALL_TRUSTED_PROVIDER_RECONCILIATION_REQUIRED';
  console.warn('REALITY_EXACT_OWNER_APPROVAL_BLOCKED',
    JSON.stringify({stage,error:diagnostic,owner_reservation_verified:false,
      original_job_completed:false,production_changed:false}));
  return res.status(error?.status||409).json({
   ok:false,error:diagnostic,failed_stage:stage,
   owner_approval_unverified:true,original_job_completed:false,
   production_changed:false,
  });
 }
}
