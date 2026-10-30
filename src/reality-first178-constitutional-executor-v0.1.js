// Live #178 — ONE constitutional owner of model-generation, sandbox, and
// durable execution transitions. Runs ONLY under authenticated original goal,
// in isolated Vercel preview. No GitHub write token or model install authority.
// The initial queue is claimed atomically once and is never silently retried.
import {dbFor,verifiedOwnerScope,rpc}
 from './reality-personal-first-upgrade-178-v0.1.js';
import {observeFirstGapFromGithub,admitFirstGapBuildTicket,
 generateAfterTrustedGap,FIRST_GAP_PROOF}
 from './reality-first-gap-handoff-v0.1.js';
import {createFirst178ConstitutionalCheckpointService}
 from './reality-first-178-constitutional-continuity-checkpoint-v0.1.js';
import {createRealityLiveVercelUpgradeAdapters}
 from './reality-foundational-vercel-generation-adapters-v1.0.js';
import {recoverGovernedEscalation} from './reality-governed-self-improvement-spine-v1.0.js';

const die=(s,status=409)=>{throw Object.assign(
 Error('FIRST178_EXECUTION_'+s),{status})};
const uuid=x=>typeof x==='string'&&
 /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(x);
const sha40=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x);
const sha64=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const FIRST_ORIGINAL_178_QUEUED_RELEASE='f57dc3b253824ad1edf5675cf5e6223097d50ff9';
// The first customer's exact queue was durably admitted by this preview
// release before the server was redeployed. Preserve the original write's
// release fingerprint across code upgrades, while always requiring an
// authenticated current owner goal + the exact independently verified #178
// work receipt + a single-use transaction. No arbitrary/stale branch release.
function verifiedOriginal178QueuePin(queue,env){
 const pin=queue?.preview_release_sha;
 return sha40(pin)&&(
  pin===env.VERCEL_GIT_COMMIT_SHA||
  pin===FIRST_ORIGINAL_178_QUEUED_RELEASE
 );
}
export async function executeFirst178Constitutional({
 session,conversationId,env=process.env,call=rpc,
 scopeReader=verifiedOwnerScope,dbReader=dbFor,
 observer=observeFirstGapFromGithub,
 checkpointFactory=createFirst178ConstitutionalCheckpointService,
 liveGeneration=createRealityLiveVercelUpgradeAdapters,
 claimConfirmedGap=admitFirstGapBuildTicket,
 drive=generateAfterTrustedGap,
}={}){
 if(env.VERCEL_ENV!=='preview'||
    env.VERCEL_GIT_COMMIT_REF!==
     'feature/first178-live-single-claim-execution-20261029'||
    !sha40(env.VERCEL_GIT_COMMIT_SHA)||
    !String(env.REALITY_STANDALONE_OPENAI_API_KEY||'').trim()||
    !String(env.REALITY_SEMANTIC_REVIEW_MODEL||'').trim()||
    String(env.REALITY_FIRST178_GITHUB_READ_TOKEN||'').length<20)
   die('ISOLATED_RUNNER_NOT_CONFIGURED',503);
 const db=dbReader(session,env);
 const scope=await scopeReader({session,conversationId,env});
 if(scope?.original_issue_number!==178||!sha40(env.VERCEL_GIT_COMMIT_SHA))
  die('ORIGINAL_CUSTOMER_SCOPE_UNVERIFIED');
 const queue=await call(db,'reality_read_governed_build_v1',{
  p_owner_id:session.user_id,p_conversation_id:conversationId,
 });
 const exhausted=queue?.phase==='ESCALATED';
 const recovering=queue?.phase==='RUNNING_CONSTITUTIONAL'||exhausted;
 if(!uuid(queue?.queue_id)||
    !['QUEUED_DISCOVERY','RUNNING_CONSTITUTIONAL','ESCALATED'].includes(queue?.phase)||
    queue.original_work_id!==scope.original_work_id||
    queue.goal_id!==scope.goal_id||
    !verifiedOriginal178QueuePin(queue,env)||
    queue.dispatch_commit_sha!=null||queue.dispatched_at!=null)
  die('OWNER_QUEUED_JOB_NOT_EXACTLY_CLAIMABLE');
 // Read the REAL pinned job again, independent of browser and model text.
 const initialEvidence=await observer({scope,apiToken:env.REALITY_FIRST178_GITHUB_READ_TOKEN});
 if(initialEvidence?.status!=='INDEPENDENT_CI_MISSING_CAPABILITY_OBSERVED'||
    initialEvidence.original_work_id!==scope.original_work_id||
    initialEvidence.goal_id!==scope.goal_id||
    initialEvidence.owner_id!==scope.owner_id||
    initialEvidence.run_id!==FIRST_GAP_PROOF.run_id||
    !sha64(initialEvidence.evidence_hash))
  die('PINNED_PROVIDER_GAP_INVALID',503);
 // The exact original #178 claim is never repeated. A prior generation
 // was rejected before any candidate could enter the constitutional journal.
 // Recovery requires an independent source readback and an atomic ONE-TIME
 // reservation against the SAME claimed database row.
 const checkpoint=checkpointFactory({
  session,conversationId,originalWorkId:scope.original_work_id,db,env,
 });
 let claim,resumeState=null;
 if(recovering){
  if(typeof checkpoint.readLatestCheckpoint!=='function')
   die('DURABLE_RECOVERY_READBACK_UNAVAILABLE',503);
  const restored=await checkpoint.readLatestCheckpoint();
  if(restored?.verified!==true||
     restored.original_work_id!==scope.original_work_id||
     !['GAP_CONFIRMED','CANDIDATE_READY','REPAIR_REQUIRED','ESCALATED'].includes(
       restored.state?.phase)||
     restored.checkpoint_hash!==restored.state.head_hash||
     !uuid(restored.continuity_receipt_id))
   die('EXACT_UNSETTLED_JOURNAL_RESTORE_FAILED',503);
  const firstRecovery=restored.state.phase==='ESCALATED'&&
   restored.state.attempt_count===3&&restored.state.attempt_limit===3;
  const secondRecovery=restored.state.phase==='ESCALATED'&&
   restored.state.attempt_count===5&&restored.state.attempt_limit===5&&
   restored.state.recovery_authorization?.verified===true;
  const finalRecovery=restored.state.phase==='ESCALATED'&&
   restored.state.attempt_count===7&&restored.state.attempt_limit===7&&
   restored.state.recovery_continuation_authorization?.verified===true;
  const exhaustionRecovery=firstRecovery||secondRecovery||finalRecovery;
  if(exhausted&&!exhaustionRecovery)die('NOT_REPAIRABLE_ORIGINAL_EXHAUSTION');
  const sandboxRecovery=restored.state.phase==='CANDIDATE_READY'&&
   restored.state.attempt_count===1;
  const laterCorrection=restored.state.phase==='REPAIR_REQUIRED'||
   (restored.state.phase==='CANDIDATE_READY'&&restored.state.attempt_count>1);
  const rpcName=finalRecovery?'reality_reserve_first178_final_bounded_draft_recovery_v1':
   secondRecovery?'reality_reserve_first178_second_exhaustion_recovery_v1':
   firstRecovery?'reality_reserve_first178_exhaustion_recovery_v1':
   laterCorrection?'reality_reserve_first178_continuation_step_v1':
   sandboxRecovery?'reality_reserve_first178_candidate_sandbox_v1':
   'reality_reserve_first178_gap_recovery_v1';
  const reserved=await call(db,rpcName,{
   p_owner_id:session.user_id,p_conversation_id:conversationId,
   p_queue_id:queue.queue_id,p_original_work_id:scope.original_work_id,
   p_checkpoint_hash:restored.checkpoint_hash,
   ...(exhaustionRecovery?{
    p_checkpoint_receipt_id:restored.continuity_receipt_id,
    p_failure_evidence_ref:restored.state.independent_failure?.evidence_ref,
   }:{}),
   ...(sandboxRecovery?{p_candidate_hash:restored.state.candidate.artifact_hash}:{}),
   ...(laterCorrection?{
    p_phase:restored.state.phase,p_attempt_count:restored.state.attempt_count,
    p_checkpoint_receipt_id:restored.continuity_receipt_id,
   }:{}),
   ...(!laterCorrection&&!exhaustionRecovery?{
    p_continuity_receipt_id:restored.continuity_receipt_id,
   }:{}),
  });
  const singleUse=exhaustionRecovery||laterCorrection;
  if((singleUse?reserved?.reserved_once!==true:reserved?.recovery_reserved!==true)||
     !uuid(singleUse?reserved.reservation_id:
       sandboxRecovery?reserved.sandbox_reservation_id:reserved.recovery_reservation_id)||
     !uuid(singleUse?reserved.existing_claim_id:reserved.claim_id)||
     reserved.original_work_id!==scope.original_work_id||
     reserved.queue_id!==queue.queue_id||
     (singleUse?reserved.checkpoint_receipt_id:
       reserved.continuity_receipt_id)!==restored.continuity_receipt_id||
     reserved.checkpoint_hash!==restored.checkpoint_hash||
     (sandboxRecovery&&reserved.candidate_hash!==restored.state.candidate.artifact_hash)||
     (exhaustionRecovery&&(reserved.failure_evidence_ref!==
       restored.state.independent_failure.evidence_ref||
       reserved.recovery_attempt_limit!==(finalRecovery?8:secondRecovery?7:5)))||
     (laterCorrection&&(reserved.phase!==restored.state.phase||
       reserved.attempt_count!==restored.state.attempt_count))||
     reserved.installation_authorized!==false)
   die('SINGLE_USE_RECOVERY_RESERVATION_UNVERIFIED',503);
  claim={claimed:true,claim_id:singleUse?
   reserved.existing_claim_id:reserved.claim_id,
   queue_id:queue.queue_id,original_work_id:scope.original_work_id,
   installation_authorized:false};
  if(exhaustionRecovery){
   resumeState=recoverGovernedEscalation(restored.state,{
    verified:true,independent_provider_readback:true,
    owner_id:scope.owner_id,goal_id:scope.goal_id,
    original_work_id:scope.original_work_id,
    checkpoint_hash:restored.checkpoint_hash,
    checkpoint_receipt_id:restored.continuity_receipt_id,
    failure_evidence_ref:restored.state.independent_failure.evidence_ref,
    reservation_id:reserved.reservation_id,installation_authorized:false,
   });
   const recoveryReceipt=await checkpoint.persistCheckpoint(resumeState);
   if(recoveryReceipt?.independent_readback_verified!==true||
      recoveryReceipt.checkpoint_hash!==resumeState.head_hash)
    die('EXHAUSTION_RECOVERY_CHECKPOINT_NOT_DURABLE',503);
  }else resumeState=restored.state;
 }else{
  // The initial database claim is an irreversible single-use reservation.
  // It cannot be retried merely because a model generates malformed output.
  claim=await call(db,'reality_claim_governed_build_178_v1',{
   p_owner_id:session.user_id,p_conversation_id:conversationId,
   p_queue_id:queue.queue_id,p_goal_id:scope.goal_id,
   p_original_work_id:scope.original_work_id,
   p_goal_transition_event_id:scope.goal_transition_receipt_ref,
   p_preview_release_sha:queue.preview_release_sha,
  });
  if(claim?.claimed!==true||!uuid(claim.claim_id)||
     claim.queue_id!==queue.queue_id||
     claim.original_work_id!==scope.original_work_id||
     claim.installation_authorized!==false)
   die('ATOMIC_SINGLE_CLAIM_READBACK_INVALID',503);
 }
 // An ambiguous network or provider failure leaves this exact claim
 // RUNNING_CONSTITUTIONAL. Do NOT auto-retry; the owner can inspect history.
 let lastReceipt=null;
 const receiptCache=new Map();
 const persistCheckpoint=async state=>{
  const result=await checkpoint.persistCheckpoint(state);
  if(result?.persisted!==true||
     result?.independent_readback_verified!==true||
     result?.checkpoint_hash!==state.head_hash||
     !uuid(result.continuity_receipt_id))
   die('POST_WRITE_CONSTITUTIONAL_READBACK_MISSING',503);
  lastReceipt=result;
  return result;
 };
 const admitted=await claimConfirmedGap({
  scope,providerEvidence:initialEvidence,
  maxAttempts:resumeState?.attempt_limit||3,
  persistGap:checkpoint.persistGap,readBackGap:checkpoint.readBackGap,
  reobserveProviderEvidence:()=>observer({scope,apiToken:env.REALITY_FIRST178_GITHUB_READ_TOKEN}),
 });
 if(admitted?.ticket?.original_work_id!==scope.original_work_id||
    admitted?.ticket?.goal_id!==scope.goal_id||
    admitted?.proof!=='OWNER_SCOPED_PROVIDER_GAP_DURABLY_READ_BACK')
  die('DURABLE_GAP_ADMISSION_MISMATCH',503);
 const generation=await liveGeneration({ticket:admitted.ticket,env});
 if(typeof generation?.generateCandidate!=='function'||
    typeof generation?.runIsolatedSandbox!=='function')
  die('TRUSTED_GENERATION_SERVICES_UNAVAILABLE',503);
 const validatedGeneration=Object.freeze({
  generateCandidate:generation.generateCandidate,
  runIsolatedSandbox:async input=>{
   const verified=await generation.runIsolatedSandbox(input);
   if(!['SANDBOX_FAILED','SANDBOX_VERIFIED'].includes(verified?.kind)||
      verified.original_work_id!==scope.original_work_id||
      !verified.evidence_ref||!verified.evidence_hash||
      verified.installation_authorized!==false)
     die('ISOLATED_PROVIDER_SANDBOX_RECEIPT_INVALID',503);
   // Provider reobservation already occurs inside the existing trusted
   // sandbox adapter; this cache holds ONLY that verified exact result.
   const key=verified.evidence_ref;
   if(receiptCache.has(key))die('DUPLICATE_PROVIDER_ATTESTATION');
   receiptCache.set(key,Object.freeze({
    evidence_hash:verified.evidence_hash,
    artifact_hash:verified.artifact_hash,
    kind:verified.kind,scope_work_id:scope.original_work_id,
   }));
   return verified;
  },
 });
 const observeMissingCapability=async()=>({
  kind:'GAP_CONFIRMED',
  owner_id:scope.owner_id,goal_id:scope.goal_id,
  original_work_id:scope.original_work_id,
  continuity_root_id:scope.continuity_root_id,
  worldline_id:scope.worldline_id,
  capability_id:'reality.ci-failure-evidence-v1',
  failure_refs:[initialEvidence.run_url],
  verification_suite_ref:FIRST_GAP_PROOF.manifest_ref,
  evidence_ref:admitted.gap_continuity_receipt_id,
  evidence_hash:initialEvidence.evidence_hash,
 });
 const verifyIndependentReceipt=async({receipt,scope_hash,candidate_hash})=>{
  if(receipt?.original_work_id!==scope.original_work_id||
     receipt.goal_id!==scope.goal_id||
     receipt.owner_id!==scope.owner_id||
     !sha64(receipt.evidence_hash)||!scope_hash)
   return {verified:false};
  if(receipt.kind==='GAP_CONFIRMED'){
   const check=await checkpoint.readBackGap({
    owner_id:scope.owner_id,goal_id:scope.goal_id,
    original_work_id:scope.original_work_id,
    receipt_id:receipt.evidence_ref,
   });
   if(!check.verified||check.evidence_hash!==receipt.evidence_hash||
      check.provider_receipt_ref!==initialEvidence.provider_receipt_ref)
    return {verified:false};
  }else if(['SANDBOX_FAILED','SANDBOX_VERIFIED'].includes(receipt.kind)){
   const previous=receiptCache.get(receipt.evidence_ref);
   if(!previous||previous.evidence_hash!==receipt.evidence_hash||
      previous.artifact_hash!==candidate_hash||
      previous.kind!==receipt.kind||
      previous.scope_work_id!==scope.original_work_id)
    return {verified:false};
  }else return {verified:false};
  return {verified:true,independent_provider_readback:true,
   evidence_ref:receipt.evidence_ref,evidence_hash:receipt.evidence_hash,
   original_work_id:scope.original_work_id,scope_hash,
   attestation_ref:'reality:provider-confirmed:'+receipt.evidence_ref};
 };
 const driven=await drive({
  admitted,resumeState,
  verifiedGovernanceReleaseSha:env.VERCEL_GIT_COMMIT_SHA,
  adapters:{generation:validatedGeneration,observeMissingCapability,
   verifyIndependentReceipt,persistCheckpoint},
 });
 if(!lastReceipt||driven?.state?.head_hash!==lastReceipt.checkpoint_hash||
    driven.state.scope.original_work_id!==scope.original_work_id||
    driven.installation_authorized!==false||
    driven.capability_installed!==false||
    driven.original_job_completed!==false)
  die('CONSTITUTIONAL_TERMINAL_STATE_UNVERIFIED',503);
 const phase=driven.status==='OWNER_APPROVAL_REQUIRED'?
  'AWAITING_OWNER_APPROVAL':
   driven.status==='ESCALATED_WITH_FROZEN_EVIDENCE'?'ESCALATED':
   'EXECUTION_UNRESOLVED';
 const recorded=await call(db,'reality_record_governed_build_178_v1',{
  p_owner_id:session.user_id,p_conversation_id:conversationId,
  p_queue_id:queue.queue_id,p_claim_id:claim.claim_id,
  p_original_work_id:scope.original_work_id,p_phase:phase,
  p_checkpoint_hash:driven.state.head_hash,
  p_continuity_receipt_id:lastReceipt.continuity_receipt_id,
 });
 if(recorded?.recorded!==true||recorded?.phase!==phase||
    recorded?.checkpoint_hash!==driven.state.head_hash||
    recorded?.checkpoint_receipt_id!==lastReceipt.continuity_receipt_id)
  die('DATABASE_VERIFIED_COMPLETION_RECORD_MISMATCH',503);
 return Object.freeze({
  status:phase,owner_approval_required:phase==='AWAITING_OWNER_APPROVAL',
  original_work_id:scope.original_work_id,queue_id:queue.queue_id,
  checkpoint_hash:driven.state.head_hash,
  checkpoint_receipt_id:lastReceipt.continuity_receipt_id,
  verified_candidate_artifact_hash:phase==='AWAITING_OWNER_APPROVAL'?
   driven.state.candidate?.artifact_hash:null,
  attempt_count:driven.state.attempt_count,
  installation_authorized:false,capability_installed:false,
  original_job_completed:false,production_changed:false,
 });
}
