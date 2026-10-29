// Authenticated owner -> original Continuity goal -> original unfinished work ->
// Reality's constitutional self-improvement orientation. NO model calls or writes.
//
// This adapter is deliberately read-only. The actual governed driver requires
// independent provider confirmation, persisted checkpoints, isolated sandbox,
// owner approval and exact capability readback BEFORE it can build or install.
import {createHash} from 'node:crypto';
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {readFreshPersonalGoalState} from './reality-personal-goal-readback-v0.1.js';
import {listAuthenticatedUnfinishedWork}
 from './reality-personal-unfinished-work-v0.1.js';
import {createContinuitySpine} from './reality-continuity-spine-v2.0.js';
import {
 createGovernedSelfImprovement,readGovernedSelfImprovementOrientation
} from './reality-governed-self-improvement-spine-v1.0.js';

export const PERSONAL_GOVERNED_SELF_IMPROVEMENT_VERSION=
 'reality-personal-governed-self-improvement-v0.1';
const freeze=x=>Object.freeze(x);
function failed(code,status=409){const e=Error(code);e.status=status;throw e}
function scopedGoal({session,job,goal,env}){
 if(!validUuid(session?.user_id)||!validUuid(job?.conversation_id)||
   goal?.principal_id!==session.user_id||
   goal?.conversation_id!==job.conversation_id||
   goal?.state?.active_goal_id==null||
   goal?.state?.active_goal?.goal_id!==goal.state.active_goal_id||
   goal?.state?.active_goal?.status!=='ACTIVE'||
   goal?.state?.active_goal?.user_confirmed!==true||
   !job.goal_still_current)
   failed('SELF_IMPROVEMENT_OWNER_GOAL_UNVERIFIED');
 if(goal?.persisted_source!=='ISOLATED_CONTINUITY_VERIFIED_READBACK'||
  !goal.scope?.root||!goal.scope?.worldline||
  !goal.state.active_goal.source_user_message_ref||
  !validUuid(goal.state.active_goal.last_transition_receipt_id))
   failed('SELF_IMPROVEMENT_GOAL_PROVENANCE_UNVERIFIED');
 if(!/^work:[a-f0-9]{32}$/.test(String(job.work_id||''))||
   job.original_work_id!==job.work_id||
   job.job_completed!==false||
   job.action_completed!==true||
   !/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/\d+$/.test(String(job.issue_url||'')))
   failed('SELF_IMPROVEMENT_ORIGINAL_JOB_NOT_GROUNDED');
 const spine=createContinuitySpine({
  continuityRootId:goal.scope.root,
  worldlineId:goal.scope.worldline,
  subjectId:session.user_id,
 });
 if(goal.state.continuity_root_id!==spine.continuity_root_id||
    goal.state.world_id!==goal.scope.world)
  failed('SELF_IMPROVEMENT_CANONICAL_SCOPE_MISMATCH');
 // The release commit binds the orientation to a specific deployed trust
 // boundary. It is a RELEASE reference, NOT attestation that the underlying
 // governance source file bytes were independently verified on this request.
 const release=String(env.VERCEL_GIT_COMMIT_SHA||'');
 if(!/^[0-9a-f]{40}$/.test(release))
  failed('SELF_IMPROVEMENT_TRUSTED_RELEASE_REF_REQUIRED',503);
 const releaseBinding='sha256:'+createHash('sha256')
  .update('reality-self-improvement-governance-release:'+release)
  .digest('hex');
 return {owner_id:session.user_id,goal_id:goal.state.active_goal_id,
  goal_transition_receipt_ref:goal.state.active_goal.last_transition_receipt_id,
  goal_evidence_ref:goal.state.active_goal.source_user_message_ref,
  original_work_id:job.work_id,
  continuity_root_id:spine.continuity_root_id,
  worldline_id:spine.worldline_id,
  target_environment:'ISOLATED_PREVIEW',
  governance_kernel_hash:releaseBinding};
}
export function projectAuthenticatedSelfImprovement({
 session,job,goal,env=process.env,
}={}){
 const scope=scopedGoal({session,job,goal,env});
 const state=createGovernedSelfImprovement({scope});
 const orientation=readGovernedSelfImprovementOrientation(state,{
  capability_gap_count:0,original_unfinished_work_count:1,
  owner_goal_verified:true,original_job_evidence_ref:job.source_receipt_id,
 });
 // The initial state is NOT a durable checkpoint or verified gap. The model
 // must not be given execution authority merely because this projection exists.
 return freeze({
  version:PERSONAL_GOVERNED_SELF_IMPROVEMENT_VERSION,
  status:'ORIGINAL_JOB_IDENTIFIED_AWAITING_INDEPENDENT_GAP_OBSERVATION',
  original_work_id:scope.original_work_id,
  original_conversation_id:job.conversation_id,
  issue_url:job.issue_url,
  goal_id:scope.goal_id,
  goal_title:goal.state.active_goal.title,
  goal_transition_receipt_ref:scope.goal_transition_receipt_ref,
  original_job_tracking_receipt_ref:job.source_receipt_id,
  orientation:{
   self_improvement_state:orientation.self_improvement_state,
   next_required_step:orientation.next_required_step,
   original_work_id:orientation.original_work_id,
   checkpoint_hash:orientation.continuity.checkpoint_hash,
  },
  model_builder_connected:false,
  sandbox_connected:false,
  durable_self_improvement_checkpoint:false,
  model_can_install:false,
  owner_authorization_requested:false,
  external_action_performed:false,
  original_job_completed:false,
  no_new_user_prompt_required_for_readback:true,
 });
}
export async function inspectAuthenticatedSelfImprovement({
 session,env=process.env,
 listWork=listAuthenticatedUnfinishedWork,
 readGoal=readFreshPersonalGoalState,
}={}){
 if(!validUuid(session?.user_id)||env.VERCEL_ENV!=='preview'||
   env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true')
  failed('SELF_IMPROVEMENT_AUTHENTICATED_PREVIEW_REQUIRED',403);
 const queue=await listWork({session,env});
 if(!Array.isArray(queue?.jobs)||queue?.execution_authorized!==false)
  failed('SELF_IMPROVEMENT_UNFINISHED_READBACK_INVALID',503);
 // No sorting by fabricated LLM score; choose a verified work ID from
 // Reality's already authenticated Continuity Unfinished Work discovery.
 const matching=queue.jobs.filter(job=>job.action_completed===true&&
  job.job_completed===false&&job.goal_still_current===true&&
  /^work:[a-f0-9]{32}$/.test(String(job.work_id||'')));
 if(!matching.length)return freeze({
  version:PERSONAL_GOVERNED_SELF_IMPROVEMENT_VERSION,
  status:queue.coverage_limited||queue.unreadable_conversations?
    'NO_VERIFIED_ELIGIBLE_WORK_PARTIAL_COVERAGE':'NO_VERIFIED_ELIGIBLE_WORK',
  unfinished_count:queue.unfinished_count,scanned_conversations:queue.scanned_conversations,
  unreadable_conversations:queue.unreadable_conversations,
  discovery_coverage_limited:queue.coverage_limited,
  model_builder_connected:false,original_job_completed:false,
  no_automatic_authority:true,external_action_performed:false,
 });
 const job=matching[0];
 const goal=await readGoal({session,conversationId:job.conversation_id,env});
 const projection=projectAuthenticatedSelfImprovement({session,job,goal,env});
 return freeze({...projection,scanned_conversations:queue.scanned_conversations,
  discovery_coverage_limited:queue.coverage_limited,
  unreadable_conversations:queue.unreadable_conversations,
  candidate_work_count:matching.length,
  // The list itself can be incomplete; status is never a guarantee that no
  // other work exists, or that the original job has been settled.
 });
}
