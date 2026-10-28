// Explicit signed-in owner acknowledgment of a SOURCE CORRECTION only.
// Not authorization to modify code, close GitHub issue 143, or settle the
// unfinished original job. Reuses the existing original Continuity worldline.
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {readFreshPersonalGoalState} from './reality-personal-goal-readback-v0.1.js';
import {createUniversePostgresPersistence} from './reality-universe-postgres-persistence-v0.1.js';
import {resolveReliabilityBenchmarkDb} from './reality-reliability-db-boundary-v0.1.js';
import {createContinuitySpine,appendContinuityNode,continuityUuidFromSource}
 from './reality-continuity-spine-v2.0.js';
import {orderContinuityHistory} from './reality-continuous-reliability-v0.1.js';
export const OWNER_REPAIR_ACCEPTANCE_VERSION='reality-owner-repair-acceptance-v0.1';
export const SOURCE_CORRECTION_CONFIRMATION='ACCEPT_VERIFIED_CORRECTION_EVIDENCE_ONLY';
const WORK='work:24cda9611404e9bcb47909976067605c';
const EXPECTED_SOURCE_COMMIT='3448c6d694b440a0e0c4593ff30e2fc326824cd4';
const fail=code=>{throw Error(code)};
const clean=(obj)=>obj===null||typeof obj!=='object'?obj:
 Array.isArray(obj)?obj.map(clean):Object.fromEntries(Object.keys(obj).sort().map(k=>[k,clean(obj[k])]));
const same=(a,b)=>JSON.stringify(clean(a))===JSON.stringify(clean(b));
function acceptedEvidence(e,{session,conversationId,workId,goalId}){
 return Boolean(e?.entity_type==='personal_recovery_acceptance_evidence'&&
  e.event_kind==='WORK'&&e.epistemic_status==='CORROBORATED'&&
  e.provenance?.source==='reality-personal-repair-acceptance-v0.1'&&
  e.provenance?.principal_id===session.user_id&&
  e.provenance?.conversation_id===conversationId&&
  e.payload?.original_work_id===workId&&
  e.payload?.original_goal_id===goalId&&
  e.payload?.source_correction_verified===true&&
  e.payload?.provider_current_success_verified===true&&
  e.payload?.owner_accepted===false&&
  e.payload?.original_issue_closed===false&&
  e.payload?.full_original_job_completed===false&&
  e.payload?.external_action_performed===false&&
  e.payload?.assessment==='EVIDENCE_SUPPORTS_CORRECTION_AWAITING_OWNER_ACCEPTANCE'&&
  e.payload?.independently_checked_fix_commit===EXPECTED_SOURCE_COMMIT);
}
export async function recordAuthenticatedOwnerRepairAcceptance({
 session,conversationId,workId,sourceEvidenceReceiptId,confirmation,
 env=process.env,readGoal=readFreshPersonalGoalState,
 createPersistence=createUniversePostgresPersistence,
}={}){
 if(env?.VERCEL_ENV!=='preview'||
    env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true'||
    !validUuid(session?.user_id)||!validUuid(conversationId)||
    !validUuid(sourceEvidenceReceiptId)||workId!==WORK||
    confirmation!==SOURCE_CORRECTION_CONFIRMATION)
  fail('OWNER_CORRECTION_EXPLICIT_AUTHENTICATED_CONFIRMATION_REQUIRED');
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db.secretKey||db.url!==session.config?.url||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('OWNER_CORRECTION_ISOLATED_CONTINUITY_REQUIRED');
 const goal=await readGoal({session,conversationId,env});
 const active=goal?.state?.active_goal;
 if(goal?.principal_id!==session.user_id||
    goal?.conversation_id!==conversationId||
    goal?.state?.active_goal_id!==active?.goal_id||
    active?.status!=='ACTIVE'||active?.user_confirmed!==true||
    !active?.last_transition_receipt_id)
  fail('OWNER_CORRECTION_CURRENT_SIGNED_IN_GOAL_REQUIRED');
 const spine=createContinuitySpine({continuityRootId:goal.scope.root,
  worldlineId:goal.scope.worldline,subjectId:session.user_id});
 if(spine.continuity_root_id!==goal.state.continuity_root_id||
    goal.state.world_id!==goal.scope.world)
  fail('OWNER_CORRECTION_ORIGINAL_CONTINUITY_CHANGED');
 const store=createPersistence({...db});
 const read=()=>store.reconstruct({continuityRootId:spine.continuity_root_id,
  worldlineId:spine.worldline_id});
 const history=orderContinuityHistory(await read());
 const evidence=history.filter(e=>e.event_id===sourceEvidenceReceiptId);
 if(evidence.length!==1||!acceptedEvidence(evidence[0],{
  session,conversationId,workId,goalId:active.goal_id,
 }))
  fail('OWNER_CORRECTION_EXACT_VERIFIED_SOURCE_RECEIPT_REQUIRED');
 const checkpoint=history.filter(e=>e.event_id===evidence[0].payload?.recovery_receipt_id&&
  e.entity_type==='personal_recovery_checkpoint'&&
  e.payload?.original_work_id===workId&&e.payload?.job_completed===false);
 if(checkpoint.length!==1)fail('OWNER_CORRECTION_ORIGINAL_RECOVERY_CHECKPOINT_REQUIRED');
 if(history.some(e=>e.entity_type==='personal_original_job_settlement'&&
   e.payload?.original_work_id===workId))
  fail('OWNER_CORRECTION_JOB_ALREADY_SETTLED');
 const eventId=continuityUuidFromSource('owner-source-correction-acceptance:'+
  workId+':'+sourceEvidenceReceiptId+':'+session.user_id);
 const payload=Object.freeze({
  version:OWNER_REPAIR_ACCEPTANCE_VERSION,
  original_work_id:workId,original_goal_id:active.goal_id,
  original_goal_revision:active.last_transition_receipt_id,
  source_evidence_receipt_id:sourceEvidenceReceiptId,
  original_recovery_receipt_id:checkpoint[0].event_id,
  verified_correction_commit_sha:EXPECTED_SOURCE_COMMIT,
  owner_id:session.user_id,conversation_id:conversationId,
  owner_confirmation:SOURCE_CORRECTION_CONFIRMATION,
  owner_accepted_source_correction:true,
  root_cause_evidence_acknowledged:true,
  original_repair_job_completed:false,
  original_issue_closed:false,github_write_authorized:false,
  external_action_performed:false,
 });
 const prior=history.filter(e=>e.entity_type==='personal_original_repair_owner_acceptance'&&
  e.payload?.original_work_id===workId);
 if(prior.length){
  if(prior.length!==1||prior[0].event_id!==eventId||
     prior[0].epistemic_status!=='VERIFIED'||
     prior[0].provenance?.source!==OWNER_REPAIR_ACCEPTANCE_VERSION||
     !same(prior[0].payload,payload))
   fail('OWNER_CORRECTION_CONFLICTING_PRIOR_ACCEPTANCE');
  return Object.freeze({status:'SOURCE_CORRECTION_ACCEPTED_JOB_STILL_OPEN',
   acceptance_receipt_id:eventId,already_recorded:true,
   owner_acceptance_saved:true,original_job_completed:false,
   original_issue_closed:false,external_action_performed:false});
 }
 const tail=history.at(-1);
 if(!tail?.event_id||!tail.lineage_hash)
  fail('OWNER_CORRECTION_CONTINUITY_TAIL_UNVERIFIED');
 const at=new Date().toISOString();
 const node=appendContinuityNode({spine,stage:'AUTHORITY',entityId:workId,
  eventId,parentEventId:tail.event_id,priorLineageHash:tail.lineage_hash,
  assertionTime:at,effectiveTime:at,epistemicStatus:'VERIFIED',payload,
  evidenceRefs:[sourceEvidenceReceiptId],
  provenance:{source:OWNER_REPAIR_ACCEPTANCE_VERSION,
   principal_id:session.user_id,conversation_id:conversationId},
 });
 await store.appendEvent({...node,entity_type:'personal_original_repair_owner_acceptance'});
 const after=orderContinuityHistory(await read());
 const saved=after.filter(e=>e.event_id===eventId);
 if(saved.length!==1||saved[0].parent_event_id!==tail.event_id||
    saved[0].epistemic_status!=='VERIFIED'||
    !same(saved[0].payload,payload)||
    saved[0].provenance?.source!==OWNER_REPAIR_ACCEPTANCE_VERSION)
  fail('OWNER_CORRECTION_DURABLE_READBACK_MISSING');
 return Object.freeze({status:'SOURCE_CORRECTION_ACCEPTED_JOB_STILL_OPEN',
  acceptance_receipt_id:eventId,already_recorded:false,
  owner_acceptance_saved:true,original_job_completed:false,
  original_issue_closed:false,external_action_performed:false});
}
