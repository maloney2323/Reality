// Durable, non-authorizing recovery checkpoint over the EXISTING personal
// Continuity worldline. This does not create a parallel ledger or executor.
// A verified GitHub tracking issue proves ONLY the tracking action; it must
// never be treated as a repaired workflow or a registered new capability.
import {orderContinuityHistory} from './reality-continuous-reliability-v0.1.js';
import {createContinuitySpine,appendContinuityNode,continuityUuidFromSource}
 from './reality-continuity-spine-v2.0.js';
import {readFreshPersonalGoalState}
 from './reality-personal-goal-readback-v0.1.js';
import {createUniversePostgresPersistence}
 from './reality-universe-postgres-persistence-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from './reality-reliability-db-boundary-v0.1.js';
import {validUuid} from './reality-private-chat-store-v0.1.js';

export const PERSONAL_RECOVERY_CHECKPOINT_VERSION='reality-personal-recovery-checkpoint-v0.1';
const WORK_ID=/^work:[a-f0-9]{32}$/;
const ISSUE_URL=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/\d+$/;
const die=code=>{throw Error(code)};

export function projectPersonalRecoverySource({history=[],workId,activeGoalId}={}){
 if(!WORK_ID.test(String(workId||'')))die('RECOVERY_ORIGINAL_WORK_ID_INVALID');
 const ordered=orderContinuityHistory(history);
 const handoffs=ordered.filter(e=>
  e.entity_type==='personal_discovered_work_handoff'&&
  e.event_kind==='OBSERVATION'&&e.payload?.work_id===workId);
 const outcomes=ordered.filter(e=>
  e.entity_type==='personal_issue_execution_outcome'&&
  e.payload?.work_id===workId);
 if(handoffs.length!==1||outcomes.length!==1)
  die('RECOVERY_EXACT_ORIGINAL_SOURCE_AND_OUTCOME_REQUIRED');
 const source=handoffs[0],outcome=outcomes[0],p=outcome.payload;
 if(source.payload?.goal_id!==activeGoalId ||
    p?.goal_id!==activeGoalId)
  die('RECOVERY_ORIGINAL_GOAL_CHANGED_REAUTHORIZE');
 if(source.payload?.authority!=='NOT_GRANTED'||
    source.payload?.external_action_performed!==false||
    source.payload?.work_item?.work_item_id!==workId||
    source.payload?.work_item?.connector!=='github'||
    source.payload?.work_item?.operation!=='create_issue'||
    source.payload?.work_item?.inputs?.repository!=='maloney2323/Reality'||
    source.payload?.work_key?.startsWith('workflow-failure:')!==true||
    !Array.isArray(source.payload?.evidence_refs)||
    source.payload.evidence_refs.length<2)
  die('RECOVERY_UNTRUSTED_SOURCE');
 if(outcome.event_kind!=='OUTCOME'||outcome.epistemic_status!=='VERIFIED'||
    p.outcome_state!=='VERIFIED_OUTCOME'||
    p.independently_verified!==true||p.reservation_state!=='VERIFIED'||
    p.source_receipt_id!==source.event_id||!validUuid(p.reservation_id)||
    !ISSUE_URL.test(String(p.provider_issue_url||''))||
    p.provider_issue_url!=='https://github.com/maloney2323/Reality/issues/'+p.provider_issue_number)
  die('RECOVERY_EXTERNAL_TRACKING_RECEIPT_NOT_VERIFIED');
 const improvements=ordered.filter(e=>
  e.entity_type==='personal_verified_improvement_proposal'&&
  e.payload?.source_work_id===workId);
 if(improvements.length>1)die('RECOVERY_MULTIPLE_IMPROVEMENT_CANDIDATES_REVIEW');
 const proposal=improvements[0]||null;
 if(proposal&&(proposal.event_kind!=='LEARNING'||
    proposal.payload?.verified_outcome_receipt_id!==outcome.event_id||
    proposal.payload?.source_receipt_id!==source.event_id||
    proposal.payload?.authority!=='NOT_GRANTED'||
    proposal.payload?.improvement_applied!==false))
  die('RECOVERY_IMPROVEMENT_LINEAGE_UNVERIFIED');
 return Object.freeze({
  original_work_id:workId,
  original_goal_id:activeGoalId,
  source_receipt_id:source.event_id,
  verified_tracking_outcome_receipt_id:outcome.event_id,
  existing_issue_url:p.provider_issue_url,
  prior_reservation_id:p.reservation_id,
  improvement_proposal_receipt_id:proposal?.event_id||null,
  source_evidence_refs:Object.freeze([...source.payload.evidence_refs]),
  status:'ORIGINAL_REPAIR_UNFINISHED',
  blocker_classification:'CAPABILITY_GAP_NOT_YET_PROVEN',
  action_already_completed:'create_issue',
  new_external_action_authorized:false,
  job_completed:false,
  retry_original_issue_creation:false,
 });
}

export function projectRecoveryCheckpoint({history=[],source}={}){
 if(!source?.original_work_id)die('RECOVERY_SOURCE_REQUIRED');
 const id=continuityUuidFromSource('personal-recovery-checkpoint:'+source.verified_tracking_outcome_receipt_id);
 const existing=orderContinuityHistory(history).filter(x=>x.event_id===id);
 if(existing.length>1)die('RECOVERY_DUPLICATE_CHECKPOINT_COLLISION');
 const checkpoint=existing[0]||null;
 if(checkpoint&&(checkpoint.entity_type!=='personal_recovery_checkpoint'||
    checkpoint.payload?.original_work_id!==source.original_work_id||
    checkpoint.payload?.source_receipt_id!==source.source_receipt_id||
    checkpoint.payload?.verified_tracking_outcome_receipt_id!==source.verified_tracking_outcome_receipt_id||
    checkpoint.payload?.new_external_action_authorized!==false||
    checkpoint.payload?.job_completed!==false))
  die('RECOVERY_CHECKPOINT_CONFLICT');
 return Object.freeze({
  ...source,
  checkpoint_receipt_id:checkpoint?.event_id||null,
  checkpoint_persisted:Boolean(checkpoint),
  state:checkpoint?'RECOVERY_BLOCKED_DURABLY_RECORDED':'RECOVERY_BLOCKED_NOT_YET_CHECKPOINTED',
  continuation_state:'WAITING_FOR_VERIFIED_REPAIR_CAPABILITY',
  // A successful tracking issue is NOT the completed repair.
  ready_for_governed_execution:false,
  external_action_performed:false,
 });
}

function assertEnvironment({session,conversationId,env}){
 if(!validUuid(session?.user_id)||!validUuid(conversationId)||
    env.VERCEL_ENV!=='preview'||
    env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true')
  die('RECOVERY_AUTHENTICATED_DURABLE_PREVIEW_REQUIRED');
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db.secretKey||
    db.url!==session.config?.url||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  die('RECOVERY_ISOLATED_DATABASE_SCOPE_INVALID');
 return db;
}
function personalSpine(goal,session){
 const spine=createContinuitySpine({
  continuityRootId:goal.scope.root,worldlineId:goal.scope.worldline,
  subjectId:session.user_id,
 });
 if(goal.state?.continuity_root_id!==spine.continuity_root_id||
    goal.state?.world_id!==goal.scope.world)
  die('RECOVERY_CANONICAL_SCOPE_NOT_VERIFIED');
 return spine;
}
async function verifiedContext({
 session,conversationId,workId,env,readGoal,createPersistence,
}){
 const db=assertEnvironment({session,conversationId,env});
 const goal=await readGoal({session,conversationId,env});
 if(goal.principal_id!==session.user_id||
    goal.conversation_id!==conversationId||
    !goal.state?.active_goal_id||
    goal.state.active_goal?.goal_id!==goal.state.active_goal_id||
    goal.state.active_goal?.status!=='ACTIVE'||
    goal.state.active_goal?.user_confirmed!==true)
  die('RECOVERY_CONFIRMED_ACTIVE_GOAL_REQUIRED');
 const spine=personalSpine(goal,session);
 const store=createPersistence({...db});
 const read=()=>store.reconstruct({
  continuityRootId:spine.continuity_root_id,worldlineId:spine.worldline_id,
 });
 const history=orderContinuityHistory(await read());
 const source=projectPersonalRecoverySource({
  history,workId,activeGoalId:goal.state.active_goal_id,
 });
 return {goal,store,spine,read,history,source};
}

// CHECK is read-only. CHECKPOINT is an internal, non-authorizing
// Continuity write. It requires existing verified source lineage, not a
// claimed client/LLM gap, and never calls any provider write operation.
export async function inspectPersonalRecoveryCheckpoint({
 session,conversationId,workId,env=process.env,
 readGoal=readFreshPersonalGoalState,
 createPersistence=createUniversePostgresPersistence,
}={}){
 const ctx=await verifiedContext({session,conversationId,workId,env,
  readGoal,createPersistence});
 return projectRecoveryCheckpoint({history:ctx.history,source:ctx.source});
}

export async function persistPersonalRecoveryCheckpoint({
 session,conversationId,workId,env=process.env,
 readGoal=readFreshPersonalGoalState,
 createPersistence=createUniversePostgresPersistence,
}={}){
 const ctx=await verifiedContext({session,conversationId,workId,env,
  readGoal,createPersistence});
 const prior=projectRecoveryCheckpoint({history:ctx.history,source:ctx.source});
 if(prior.checkpoint_persisted)return Object.freeze({...prior,already_recorded:true});
 const tail=ctx.history.at(-1);
 if(!tail?.event_id||!tail?.lineage_hash||
    tail.continuity_root_id!==ctx.spine.continuity_root_id||
    tail.worldline_id!==ctx.spine.worldline_id)
  die('RECOVERY_CONTINUITY_TAIL_REQUIRED');
 const eventId=continuityUuidFromSource(
  'personal-recovery-checkpoint:'+ctx.source.verified_tracking_outcome_receipt_id);
 const payload={
  version:PERSONAL_RECOVERY_CHECKPOINT_VERSION,
  original_work_id:workId,
  original_goal_id:ctx.source.original_goal_id,
  source_receipt_id:ctx.source.source_receipt_id,
  verified_tracking_outcome_receipt_id:ctx.source.verified_tracking_outcome_receipt_id,
  improvement_proposal_receipt_id:ctx.source.improvement_proposal_receipt_id,
  prior_reservation_id:ctx.source.prior_reservation_id,
  existing_issue_url:ctx.source.existing_issue_url,
  blocked_step:'INVESTIGATE_AND_REPAIR_UNDERLYING_FAILURE',
  blocker_classification:'CAPABILITY_GAP_NOT_YET_PROVEN',
  original_work_status:'BLOCKED_UNFINISHED',
  remaining_work:[
   'Identify cause using source evidence',
   'Verify whether missing capability is genuine',
   'Prepare authorized isolated repair',
   'Independently verify repaired original job',
  ],
  new_external_action_authorized:false,
  retry_original_issue_creation:false,
  job_completed:false,
 };
 const at=new Date().toISOString();
 const node=appendContinuityNode({
  spine:ctx.spine,stage:'WORK',entityId:workId,eventId,
  parentEventId:tail.event_id,priorLineageHash:tail.lineage_hash,
  effectiveTime:at,assertionTime:at,epistemicStatus:'OBSERVED',
  evidenceRefs:[ctx.source.existing_issue_url,
   ...ctx.source.source_evidence_refs],
  payload,
  provenance:{source:PERSONAL_RECOVERY_CHECKPOINT_VERSION,
   principal_id:session.user_id,conversation_id:conversationId},
 });
 await ctx.store.appendEvent({...node,entity_type:'personal_recovery_checkpoint'});
 const confirmed=orderContinuityHistory(await ctx.read());
 const projected=projectRecoveryCheckpoint({
  history:confirmed,source:ctx.source,
 });
 const persisted=confirmed.find(e=>e.event_id===eventId);
 if(!projected.checkpoint_persisted||persisted?.parent_event_id!==tail.event_id||
    persisted?.payload?.blocked_step!==payload.blocked_step||
    persisted?.payload?.retry_original_issue_creation!==false)
  die('RECOVERY_CHECKPOINT_READBACK_NOT_VERIFIED');
 return Object.freeze({...projected,already_recorded:false});
}
