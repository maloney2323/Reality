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
import {validUuid}
 from './reality-private-chat-store-v0.1.js';

export const REAL_RECOVERY_COORDINATOR_VERSION='reality-real-recovery-coordinator-v0.1';
const requireScope=(ok,code)=>{if(!ok)throw Error(code)};
const SAME_WORK=/^work:[a-f0-9]{32}$/;
export function projectOriginalJobRecoveryLoop({
 originalWorkId,conversationId,evidence,cognitionState,goalId,
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
  {step:'CAPABILITY_GAP_DIAGNOSIS',state:later?'NOT_REQUIRED':'NOT_PROVEN',
   evidence_ref:null,
   description:later?'Do not invent a missing capability when later CI is passing.':
    'Historical failures alone do not prove a missing code capability.'},
  {step:'UPGRADE_EXECUTION',state:later?'SKIPPED_NOT_NEEDED':'BLOCKED_UNPROVEN_GAP',
   evidence_ref:null,
   description:later?'A new self-upgrade is not justified for this already-passing workflow.':
    'Isolated upgrade requires a verified gap and separate exact owner authorization.'},
  {step:'ORIGINAL_JOB_RESUMPTION',state:'WAITING_FOR_ACCEPTANCE',
   evidence_ref:null,
   description:'A passing workflow does not establish root cause or settle the original repair job.'},
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
  capability_engine_state:cognitionState.state,
  current_decision:later?'RECHECK_ACCEPTANCE_NO_UPGRADE_NEEDED':
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
 // Cognition examines observed evidence without asserting a missing
 // capability, inventing a new job, or installing an upgrade.
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
 return projectOriginalJobRecoveryLoop({
  originalWorkId:workId,conversationId,evidence,
  cognitionState:result,goalId:grounded.state.active_goal_id,
 });
}
