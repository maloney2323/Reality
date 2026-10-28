// One-click signed-in recovery pass, saved to the SAME original worldline.
// This is internal evidence/state progression, NOT code promotion or repair.
import {inspectAuthenticatedOriginalJobRecoveryLoop}
 from './reality-real-recovery-coordinator-v0.1.js';
import {readFreshPersonalGoalState}
 from './reality-personal-goal-readback-v0.1.js';
import {createContinuitySpine,appendContinuityNode,continuityUuidFromSource}
 from './reality-continuity-spine-v2.0.js';
import {orderContinuityHistory}
 from './reality-continuous-reliability-v0.1.js';
import {createUniversePostgresPersistence}
 from './reality-universe-postgres-persistence-v0.1.js';
import {resolveReliabilityBenchmarkDb}
 from './reality-reliability-db-boundary-v0.1.js';
import {validUuid} from './reality-private-chat-store-v0.1.js';
export const RECOVERY_DIAGNOSIS_RECEIPT_VERSION='reality-saved-original-job-diagnosis-v0.1';
const fail=code=>{throw Error(code)};
export async function recordAuthenticatedRecoveryDiagnosis({
 session,conversationId,workId,env=process.env,
 inspect=inspectAuthenticatedOriginalJobRecoveryLoop,
 readGoal=readFreshPersonalGoalState,
 createPersistence=createUniversePostgresPersistence,
}={}){
 if(!validUuid(session?.user_id)||!validUuid(conversationId)||
    !/^work:[a-f0-9]{32}$/.test(String(workId||''))||
    env.VERCEL_ENV!=='preview'||env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true')
  fail('RECOVERY_DIAGNOSIS_AUTHENTICATED_SCOPE_REQUIRED');
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db.secretKey||
    db.url!==session?.config?.url||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('RECOVERY_DIAGNOSIS_DURABLE_PROJECT_REQUIRED');
 // Fresh independent provider and Continuity checks. Never trust report in JSON.
 const verified=await inspect({session,conversationId,workId,env});
 if(verified?.original_work_id!==workId||
    verified.real_original_job_restored!==true||
    verified.real_provider_observation!==true||
    verified.original_job_completed!==false||
    verified.action_authorized!==false||
    verified.external_action_performed!==false||
    !verified.recovery_receipt_id)
  fail('RECOVERY_DIAGNOSIS_LIVE_VERIFICATION_REQUIRED');
 const goal=await readGoal({session,conversationId,env});
 if(goal?.principal_id!==session.user_id||goal?.conversation_id!==conversationId||
    goal?.state?.active_goal_id!==verified.original_goal_id)
  fail('RECOVERY_DIAGNOSIS_GOAL_SCOPE_CHANGED');
 const spine=createContinuitySpine({
  continuityRootId:goal.scope.root,
  worldlineId:goal.scope.worldline,subjectId:session.user_id,
 });
 if(goal.state.continuity_root_id!==spine.continuity_root_id)
  fail('RECOVERY_DIAGNOSIS_CANONICAL_SCOPE_CHANGED');
 const store=createPersistence({...db});
 const read=()=>store.reconstruct({
  continuityRootId:spine.continuity_root_id,
  worldlineId:spine.worldline_id,
 });
 const history=orderContinuityHistory(await read());
 const source=history.find(e=>
  e.event_id===verified.recovery_receipt_id&&
  e.entity_type==='personal_recovery_checkpoint'&&
  e.payload?.original_work_id===workId&&
  e.payload?.job_completed===false);
 if(!source)fail('RECOVERY_DIAGNOSIS_SOURCE_RECEIPT_MISSING');
 const uid=continuityUuidFromSource('original-job-recovery-diagnosis:'+
  workId+':'+verified.provider_status+':'+
  (verified.provider_passing_run||'no-later-pass'));
 const saved=history.filter(e=>e.event_id===uid);
 if(saved.length>1)fail('RECOVERY_DIAGNOSIS_EVENT_DUPLICATE_COLLISION');
 if(saved.length){
  const e=saved[0];
  if(e.entity_type!=='personal_recovery_diagnosis'||
     e.payload?.original_work_id!==workId||
     e.payload?.original_job_completed!==false||
     e.payload?.provider_status!==verified.provider_status||
     e.payload?.recovery_receipt_id!==verified.recovery_receipt_id)
   fail('RECOVERY_DIAGNOSIS_EXISTING_CONFLICT');
  return Object.freeze({...verified,diagnosis_receipt_id:uid,
   diagnosis_saved:true,already_recorded:true});
 }
 const tail=history.at(-1);
 if(!tail?.event_id||!tail?.lineage_hash)
  fail('RECOVERY_DIAGNOSIS_CONTINUITY_TAIL_REQUIRED');
 const payload={
  version:RECOVERY_DIAGNOSIS_RECEIPT_VERSION,
  original_work_id:workId,
  original_goal_id:verified.original_goal_id,
  recovery_receipt_id:verified.recovery_receipt_id,
  provider_status:verified.provider_status,
  provider_passing_run:verified.provider_passing_run,
  current_decision:verified.current_decision,
  capability_engine_state:verified.capability_engine_state,
  completed_stages:verified.completed_stages,
  total_stages:verified.total_stages,
  original_job_completed:false,
  new_capability_promoted:false,
  external_action_authorized:false,
  original_work_resumed:false,
 };
 const at=new Date().toISOString();
 const node=appendContinuityNode({
  spine,stage:'WORK',entityId:workId,eventId:uid,
  parentEventId:tail.event_id,priorLineageHash:tail.lineage_hash,
  effectiveTime:at,assertionTime:at,epistemicStatus:'OBSERVED',
  evidenceRefs:[verified.recovery_receipt_id,...(verified.provider_passing_run?
   [verified.provider_passing_run]:[])],
  payload,
  provenance:{source:RECOVERY_DIAGNOSIS_RECEIPT_VERSION,
   principal_id:session.user_id,conversation_id:conversationId},
 });
 await store.appendEvent({...node,entity_type:'personal_recovery_diagnosis'});
 const after=orderContinuityHistory(await read());
 const confirmed=after.find(e=>e.event_id===uid);
 if(!confirmed||
    confirmed.payload?.original_work_id!==workId||
    confirmed.payload?.recovery_receipt_id!==verified.recovery_receipt_id||
    confirmed.payload?.original_job_completed!==false||
    confirmed.parent_event_id!==tail.event_id)
  fail('RECOVERY_DIAGNOSIS_DURABLE_READBACK_MISSING');
 return Object.freeze({...verified,diagnosis_receipt_id:uid,
  diagnosis_saved:true,already_recorded:false});
}
