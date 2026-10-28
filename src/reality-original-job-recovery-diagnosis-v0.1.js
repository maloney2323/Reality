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
async function preserveOriginalRepairCapabilityCandidate({
 verified,workId,session,conversationId,goal,spine,store,read,
}){
 const probe=verified.continuation_probe;
 const experiment=verified.continuation_experiment;
 if(probe?.state!=='CAPABILITY_GAP_CANDIDATE_NEEDS_SANDBOX_VERIFICATION'||
    experiment?.state!=='SANDBOX_PROPOSED_AWAITING_AUTHORIZATION')
  return Object.freeze({capability_candidate_saved:false,
   capability_candidate_receipt_id:null});
 if(probe.original_work_id!==workId||
    probe.stalled_at!=='ORIGINAL_JOB_RESUMPTION'||
    probe.missing_capability_independently_established!==true||
    probe.candidate_capability!=='reality.original-repair-execution'||
    probe.authorization_granted!==false||
    probe.original_job_completed!==false||
    experiment.original_work_id!==workId||
    experiment.capability_id!==probe.candidate_capability||
    experiment.upgrade_installed!==false||
    experiment.model_generation_performed!==false||
    experiment.original_job_completed!==false||
    !/^capability_gap:[a-f0-9]{32}$/.test(String(experiment.gap_id||''))||
    !/^worldline:ephemeral:[a-f0-9]{32}$/.test(String(experiment.ephemeral_worldline_id||''))||
    !/^[a-f0-9]{64}$/.test(String(experiment.experiment_hash||''))||
    typeof probe.capability_gap_proof_ref!=='string'||
    !probe.capability_gap_proof_ref.startsWith('owner-continuity:'))
  fail('RECOVERY_DIAGNOSIS_CAPABILITY_CANDIDATE_NOT_INDEPENDENTLY_VERIFIED');
 const id=continuityUuidFromSource('original-repair-capability-candidate:'+
  workId+':'+verified.recovery_receipt_id+':'+experiment.experiment_hash);
 const payload={
  version:'reality-original-repair-capability-candidate-v0.1',
  original_work_id:workId,original_goal_id:verified.original_goal_id,
  recovery_receipt_id:verified.recovery_receipt_id,
  candidate_capability_id:probe.candidate_capability,
  missing_scope:'EXISTING_OWNER_GITHUB_REPAIR_DISPATCH_PATH',
  proof_ref:probe.capability_gap_proof_ref,
  original_blocker:'ORIGINAL_JOB_RESUMPTION',
  experiment_gap_id:experiment.gap_id,
  experiment_hash:experiment.experiment_hash,
  ephemeral_worldline_id:experiment.ephemeral_worldline_id,
  verification_suite_ref:experiment.verification_suite_ref,
  frozen_failure_refs:experiment.historical_failure_refs,
  candidate_state:experiment.state,
  code_generated:false,verified_upgrade_installed:false,
  installation_authorized:false,
  external_action_performed:false,
  original_job_resumed:false,original_job_completed:false,
 };
 const history=orderContinuityHistory(await read());
 const prior=history.filter(x=>x.event_id===id);
 if(prior.length>1)fail('RECOVERY_DIAGNOSIS_CAPABILITY_DUPLICATE');
 if(prior.length){
  if(prior[0].entity_type!=='personal_original_repair_capability_candidate'||
     prior[0].payload?.original_work_id!==workId||
     prior[0].payload?.experiment_hash!==payload.experiment_hash||
     prior[0].payload?.code_generated!==false||
     prior[0].payload?.original_job_completed!==false||
     prior[0].provenance?.principal_id!==session.user_id||
     prior[0].provenance?.conversation_id!==conversationId)
   fail('RECOVERY_DIAGNOSIS_CAPABILITY_PRIOR_CONFLICT');
  return Object.freeze({capability_candidate_saved:true,
   capability_candidate_receipt_id:id,capability_candidate_already_recorded:true});
 }
 const handoff=history.filter(x=>
  x.entity_type==='personal_discovered_work_handoff'&&
  x.payload?.work_id===workId&&
  x.payload?.goal_id===goal.state.active_goal_id&&
  x.provenance?.principal_id===session.user_id&&
  x.provenance?.conversation_id===conversationId);
 if(handoff.length!==1||
    probe.capability_gap_proof_ref!=='owner-continuity:'+handoff[0].event_id)
  fail('RECOVERY_DIAGNOSIS_ORIGINAL_HANDOFF_PROOF_REQUIRED');
 const tail=history.at(-1);
 if(!tail?.event_id||!tail.lineage_hash)
  fail('RECOVERY_DIAGNOSIS_CAPABILITY_HISTORY_TAIL_REQUIRED');
 const at=new Date().toISOString();
 const node=appendContinuityNode({
  spine,stage:'WORK',entityId:workId,eventId:id,
  parentEventId:tail.event_id,priorLineageHash:tail.lineage_hash,
  effectiveTime:at,assertionTime:at,epistemicStatus:'CORROBORATED',
  evidenceRefs:[
   handoff[0].event_id,verified.recovery_receipt_id,
   ...experiment.historical_failure_refs.filter(x=>x.startsWith('https://github.com/')),
  ],
  payload,provenance:{
   source:'reality-original-repair-capability-candidate-v0.1',
   principal_id:session.user_id,conversation_id:conversationId,
  },
 });
 await store.appendEvent({...node,entity_type:'personal_original_repair_capability_candidate'});
 const after=orderContinuityHistory(await read());
 const saved=after.filter(x=>x.event_id===id);
 if(saved.length!==1||
    saved[0].entity_type!=='personal_original_repair_capability_candidate'||
    saved[0].parent_event_id!==tail.event_id||
    saved[0].payload?.experiment_hash!==experiment.experiment_hash||
    saved[0].payload?.original_work_id!==workId||
    saved[0].payload?.original_job_completed!==false)
  fail('RECOVERY_DIAGNOSIS_CAPABILITY_CANDIDATE_READBACK_MISSING');
 return Object.freeze({
  capability_candidate_saved:true,
  capability_candidate_receipt_id:id,
  capability_candidate_already_recorded:false,
 });
}

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
  const candidate=await preserveOriginalRepairCapabilityCandidate({
   verified,workId,session,conversationId,goal,spine,store,read,
  });
  return Object.freeze({...verified,...candidate,diagnosis_receipt_id:uid,
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
 const candidate=await preserveOriginalRepairCapabilityCandidate({
  verified,workId,session,conversationId,goal,spine,store,read,
 });
 return Object.freeze({...verified,...candidate,diagnosis_receipt_id:uid,
  diagnosis_saved:true,already_recorded:false});
}
