// Actual authenticated original-job recovery coordinator (read-only phase).
// It connects: persisted owner Continuity checkpoint -> external GitHub
// re-observation -> existing autonomous capability loop -> bounded job decision.
// Do not mistake a successful CI rerun for autonomous repair/upgrade/closure.
import {inspectAuthenticatedOriginalWorkRepairEvidence}
 from './reality-recovery-evidence-gate-v0.1.js';
import {runAutonomousClosurePass}
 from './reality-autonomous-closure-orchestrator-v1.0.js';
import {readFreshPersonalGoalState}
 from './reality-personal-goal-readback-v0.1.js';
import {createContinuitySpine}
 from './reality-continuity-spine-v2.0.js';
import {projectRealityUpgradeDiscovery}
 from './reality-upgrade-discovery-v0.1.js';
import {probeStalledOriginalRepair}
 from './reality-recovery-continuation-probe-v0.1.js';
import {inspectAuthenticatedOriginalRepairRuntime}
 from './reality-original-repair-runtime-capability-readback-v0.1.js';
import {validUuid}
 from './reality-private-chat-store-v0.1.js';

export const REAL_RECOVERY_COORDINATOR_VERSION='reality-real-recovery-coordinator-v0.1';
const requireScope=(ok,code)=>{if(!ok)throw Error(code)};
const SAME_WORK=/^work:[a-f0-9]{32}$/;
export function projectOriginalJobRecoveryLoop({
 originalWorkId,conversationId,evidence,cognitionState,goalId,
 runtimeProof=null,continuationEngine=null,
}={}){
 requireScope(SAME_WORK.test(String(originalWorkId||''))&&
  validUuid(conversationId)&&
  evidence?.original_work_id===originalWorkId&&
  evidence?.original_job_completed===false&&
  evidence?.external_action_performed===false&&
  evidence?.execution_authorized===false&&
  typeof evidence?.recovery_receipt_id==='string'&&
  evidence.recovery_receipt_id.length>0,
  'LIVE_LOOP_ORIGINAL_WORK_EVIDENCE_REQUIRED');
 requireScope(cognitionState?.state==='NO_CAPABILITY_GAP'||
  cognitionState?.state==='CAPABILITY_ALREADY_REGISTERED',
  'LIVE_LOOP_UNPROVEN_CAPABILITY_CLASSIFICATION');
 const later=evidence.status==='LATER_SUCCESSFUL_CI_RUN_INDEPENDENTLY_OBSERVED';
 const noMatch=evidence.status==='NO_LATER_VERIFIED_SUCCESS_IN_BOUNDED_PROVIDER_WINDOW';
 requireScope(later||noMatch,'LIVE_LOOP_PROVIDER_OBSERVATION_STATUS_INVALID');
 if(later)requireScope(
  evidence.later_success?.run_url?.startsWith(
   'https://github.com/maloney2323/Reality/actions/runs/'),
  'LIVE_LOOP_PROVIDER_SUCCESS_REF_MISSING'
 );
 const upgradeDiscovery=projectRealityUpgradeDiscovery({
  originalWorkId,providerEvidence:evidence,cognitionState,
 });
 if(continuationEngine!==null){
  if(runtimeProof?.executor_status!=='MISSING'||
     runtimeProof?.missing_scope!=='EXISTING_OWNER_GITHUB_REPAIR_DISPATCH_PATH'||
     runtimeProof?.bridge_admission_failure!=='PERSONAL_GITHUB_DISPATCH_NOT_EXACT_SCOPED_ISSUE'||
     runtimeProof?.current_registered_capabilities!==0||
     continuationEngine?.state!=='AWAITING_AUTHORIZATION'||
     continuationEngine?.gap?.state!=='GAP_CONFIRMED'||
     continuationEngine.gap.work_item_id!==originalWorkId||
     continuationEngine.gap.capability_id!=='reality.original-repair-execution'||
     continuationEngine.experiment?.state!=='SANDBOX_PROPOSED'||
     continuationEngine.experiment.work_item_id!==originalWorkId||
     continuationEngine.original_work_executed!==false||
     continuationEngine.job_completed!==false)
   throw Error('LIVE_LOOP_CONTINUATION_CAPABILITY_INDEPENDENTLY_UNVERIFIED');
 }
 const repairGapVerified=continuationEngine!==null;
 const timeline=Object.freeze([
  {step:'ORIGINAL_JOB_RECOVERED',state:'VERIFIED',evidence_ref:evidence.recovery_receipt_id,
   description:'Restored original job and incomplete status from the owner-scoped Continuity checkpoint.'},
  {step:'HISTORICAL_FAILURES_REOBSERVED',state:'VERIFIED',
   evidence_ref:evidence.historical_run_urls?.[0]||null,
   description:'Re-read historical source failures from GitHub.'},
  {step:'CURRENT_PROVIDER_STATE_REOBSERVED',state:later?'VERIFIED':'UNRESOLVED',
   evidence_ref:later?evidence.later_success.run_url:null,
   description:later?'Independently verified a later passing run of the same workflow.':
    'A later passing run could not be established in the bounded GitHub provider window.'},
  {step:'CAPABILITY_GAP_DIAGNOSIS',
   state:repairGapVerified?'VERIFIED':later?'NOT_REQUIRED':'NOT_PROVEN',
   evidence_ref:repairGapVerified?runtimeProof.evidence_ref:null,
   description:repairGapVerified?
    'The current original-job repair execution bridge rejected the underlying repair operation; the existing capability inventory was independently rechecked. This identifies a scoped execution gap, not proof that new generated code will succeed.':
    later?'Historical workflow CI passed, but a separate original repair execution gap has not been independently established.':
    'Historical failures alone do not prove a missing code capability.'},
  {step:'UPGRADE_EXECUTION',
   state:repairGapVerified?'SANDBOX_PROPOSED':later?'SKIPPED_NOT_NEEDED':'BLOCKED_UNPROVEN_GAP',
   evidence_ref:null,
   description:repairGapVerified?
    'Reality proposed a bounded sandbox experiment for the original repair-execution gap; no code generated, tested, installed or promoted.':
    later?'Historical CI correction requires no repeat upgrade; any independent original-execution gap is assessed separately.':
    'Isolated upgrade requires a verified gap and separate exact owner authorization.'},
  {step:'ORIGINAL_JOB_RESUMPTION',
   state:repairGapVerified?'WAITING_FOR_VERIFIED_EXECUTOR':'WAITING_FOR_ACCEPTANCE',
   evidence_ref:null,
   description:repairGapVerified?
    'The same original repair cannot resume until a real capability passes sandbox verification, installation and independent execution readback.':
    'A passing workflow does not establish root cause or settle the original repair job.'},
  {step:'FINAL_SETTLEMENT',state:'NOT_COMPLETED',evidence_ref:null,
   description:'No final repair outcome has been independently accepted and recorded in Continuity.'},
 ]);
 return Object.freeze({
  version:REAL_RECOVERY_COORDINATOR_VERSION,
  original_work_id:originalWorkId,
  conversation_id:conversationId,
  original_goal_id:goalId,
  recovery_receipt_id:evidence.recovery_receipt_id,
  provider_status:evidence.status,
  provider_passing_run:evidence.later_success?.run_url||null,
  provider_passing_sha:evidence.later_success?.head_sha||null,
  capability_engine_state:cognitionState.state,
  upgrade_discovery:upgradeDiscovery,
  // The historical workflow fix and the ability to finish the owner's
  // original work are separate questions. Do not let "NO_CAPABILITY_GAP"
  // from a synthetic empty list silently close the latter.
  continuation_probe:probeStalledOriginalRepair({
   originalWorkId,evidence,completedStages:timeline.slice(0,3).filter(s=>s.state==='VERIFIED').length,
   runtimeProof,
  }),
  // The EXISTING v1 capability engine now receives independently reproduced
  // original-work execution failures instead of empty, invented gaps.
  continuation_experiment:continuationEngine?Object.freeze({
   state:'SANDBOX_PROPOSED_AWAITING_AUTHORIZATION',
   original_work_id:originalWorkId,
   gap_id:continuationEngine.gap.gap_id,
   capability_id:continuationEngine.gap.capability_id,
   experiment_hash:continuationEngine.experiment.experiment_hash,
   ephemeral_worldline_id:continuationEngine.experiment.ephemeral_worldline_id,
   historical_failure_refs:[...continuationEngine.gap.frozen_historical_failure_refs],
   verification_suite_ref:continuationEngine.gap.capability_contract.verification_suite_ref,
   external_action_performed:false,
   model_generation_performed:false,
   upgrade_installed:false,original_job_completed:false,
  }):null,
  current_decision:repairGapVerified?
   'ORIGINAL_REPAIR_EXECUTOR_GAP_VERIFIED_SANDBOX_PROPOSED':
   later?'RECHECK_ACCEPTANCE_NO_UPGRADE_NEEDED':
   'BLOCKED_REQUIRES_ROOT_CAUSE_DIAGNOSIS',
  timeline,
  completed_stages:timeline.filter(s=>s.state==='VERIFIED').length,
  total_stages:timeline.length,
  real_provider_observation:true,
  real_original_job_restored:true,
  real_new_upgrade_executed:false,
  original_job_resumed:false,
  original_job_completed:false,
  action_authorized:false,
  external_action_performed:false,
  requires_fresh_owner_authorization_for_code_changes:true,
 });
}

export async function inspectAuthenticatedOriginalJobRecoveryLoop({
 session,conversationId,workId,env=process.env,
 inspectEvidence=inspectAuthenticatedOriginalWorkRepairEvidence,
 readGoal=readFreshPersonalGoalState,
 cognition=runAutonomousClosurePass,
 runtimeProof=null,
 inspectRuntime=inspectAuthenticatedOriginalRepairRuntime,
}={}){
 requireScope(validUuid(session?.user_id)&&validUuid(conversationId)&&
  SAME_WORK.test(String(workId||''))&&env.VERCEL_ENV==='preview',
  'LIVE_LOOP_AUTHENTICATED_SCOPE_REQUIRED');
 const evidence=await inspectEvidence({session,conversationId,workId,env});
 const grounded=await readGoal({session,conversationId,env});
 requireScope(grounded?.principal_id===session.user_id&&
  grounded?.conversation_id===conversationId&&
  grounded?.state?.active_goal?.status==='ACTIVE'&&
  grounded?.state?.active_goal?.user_confirmed===true&&
  grounded?.state?.active_goal?.goal_id===grounded?.state?.active_goal_id&&
  grounded?.state?.continuity_root_id&&
  grounded?.scope?.worldline&&grounded?.scope?.world,
  'LIVE_LOOP_ORIGINAL_USER_GOAL_UNVERIFIED');
 const canonical=createContinuitySpine({
  continuityRootId:grounded.scope.root,
  worldlineId:grounded.scope.worldline,
  subjectId:session.user_id,
 });
 requireScope(canonical.continuity_root_id===
  grounded.state.continuity_root_id,
  'LIVE_LOOP_CANONICAL_CONTINUITY_SCOPE_CHANGED');
 const worldline=canonical.worldline_id;
 // Historical workflow cognition currently has no verified missing
 // capability observations. This must NOT be read as proof the original
 // REPAIR EXECUTOR is available. The separate continuation probe makes
 // that unresolved original-work capability explicit and discoverable.
 // No gap is upgraded without independent runtime/contract evidence.
 const original={
  id:workId,continuity_root_id:grounded.state.continuity_root_id,
  worldline_id:worldline,
  status:'BLOCKED',missing_capabilities:[],
 };
 const universe={
  worldId:grounded.scope.world,
  continuityRootId:original.continuity_root_id,
  worldlineId:worldline,
  work:[{id:workId,status:'BLOCKED',missing_capabilities:[]}],
  capabilities:[],particles:[],evidence:[],
 };
 requireScope(typeof original.worldline_id==='string'&&
  original.worldline_id.length>0,'LIVE_LOOP_ORIGINAL_WORLDLINE_REQUIRED');
 const result=await cognition({universe,workItem:original});
 // A scoped recovery checkpoint now probes the actual currently installed
 // execution bridge and the existing Universe registry, not a synthetic
 // empty missing_capabilities[] assumption. Never trust the browser.
 // Legacy/no-persistence test readers remain read-only and unclassified.
 let verifiedRuntime=runtimeProof;
 if(env.REALITY_UNIVERSE_PERSISTENCE_ENABLED==='true'){
  verifiedRuntime=await inspectRuntime({session,conversationId,workId,env});
  if(verifiedRuntime?.original_work_id!==workId||
     verifiedRuntime?.independently_reobserved!==true||
     verifiedRuntime?.original_job_completed!==false||
     verifiedRuntime?.external_action_performed!==false)
   throw Error('LIVE_LOOP_ORIGINAL_RUNTIME_INDEPENDENT_READBACK_REQUIRED');
 }
 if(verifiedRuntime?.executor_status==='INVESTIGATION_REQUIRED')
  verifiedRuntime=null;
 let continuationEngine=null;
 if(verifiedRuntime?.executor_status==='MISSING'&&
    verifiedRuntime.missing_scope==='EXISTING_OWNER_GITHUB_REPAIR_DISPATCH_PATH'&&
    verifiedRuntime.bridge_admission_failure==='PERSONAL_GITHUB_DISPATCH_NOT_EXACT_SCOPED_ISSUE'&&
    verifiedRuntime.current_registered_capabilities===0){
  continuationEngine=await cognition({
   universe,workItem:original,
   capabilityGap:{
    gap:'MISSING_CAPABILITY',
    subject:'reality.original-repair-execution',
   },
   capabilities:[],
   historicalFailureRefs:[
    verifiedRuntime.evidence_ref,
    ...(Array.isArray(evidence.historical_run_urls)?
      evidence.historical_run_urls:[]),
   ],
   verificationSuiteRef:
    'test/reality-original-repair-runtime-capability-readback-v0.1.test.js',
   inputSchema:{
    original_work_id:'work-id',
    authorized_repair_intent:'owner-signed-goal',
    provider_failure_refs:'frozen-independent-provider-failures',
   },
   outputSchema:{
    original_work_id:'same-work-id',
    actual_repair_execution_receipt:'independent-provider-result',
    original_outcome_verified:'boolean',
   },
   // IMPORTANT: sandbox synthesis requires a separate authorization,
   // which can never be fabricated from recovery or this diagnosis.
   authorization:null,promotionAuthorization:null,
  });
 }
 return projectOriginalJobRecoveryLoop({
  originalWorkId:workId,conversationId,evidence,
  cognitionState:result,goalId:grounded.state.active_goal_id,
  runtimeProof:verifiedRuntime,
  continuationEngine,
 });
}
