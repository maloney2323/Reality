// The controlled pilot was generated before its owner's signed-in Continuity
// checkpoint. This adoption records the HISTORICAL evidence in a CURRENT
// confirmed owner goal. It NEVER retroactively promotes the old CI run into
// an owner-scoped sandbox verification or a signed installation warrant.
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {readFreshPersonalGoalState} from './reality-personal-goal-readback-v0.1.js';
import {resolveReliabilityBenchmarkDb} from './reality-reliability-db-boundary-v0.1.js';
import {createUniversePostgresPersistence} from './reality-universe-postgres-persistence-v0.1.js';
import {createContinuitySpine,appendContinuityNode,continuityUuidFromSource,
 validateContinuityChain} from './reality-continuity-spine-v2.0.js';
import {orderContinuityHistory} from './reality-continuous-reliability-v0.1.js';
import {verifyControlledFinaleIndependentEvidence,CONTROLLED_FINALE_WORK,
 CONTROLLED_FINALE_SOURCE_SHA256} from './reality-controlled-finale-independent-admission-v0.1.js';

export const FINALE_OWNER_ADOPTION_VERSION='reality-finale-owner-adoption-v0.1';
export const FINALE_OWNER_ADOPTION_INTENT='ADOPT_THIS_CONTROLLED_FINALE_IN_MY_ACTIVE_GOAL';
const fail=c=>{throw Error(c)};
function normalized(v){return JSON.stringify(v,(key,value)=>value&&typeof value==='object'&&!Array.isArray(value)
 ?Object.fromEntries(Object.keys(value).sort().map(k=>[k,value[k]])):value)}
export async function adoptControlledFinaleIntoOwnerContinuity({
 session,conversationId,confirmation,env=process.env,
 readGoal=readFreshPersonalGoalState,
 createPersistence=createUniversePostgresPersistence,
 resolveDb=resolveReliabilityBenchmarkDb,
 verifyEvidence=verifyControlledFinaleIndependentEvidence,
}={}){
 if(confirmation!==FINALE_OWNER_ADOPTION_INTENT)fail('FINALE_OWNER_EXACT_ADOPTION_REQUIRED');
 if(env.VERCEL_ENV!=='preview'||env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true'||
    !validUuid(session?.user_id)||!validUuid(conversationId))
  fail('FINALE_OWNER_SIGNED_IN_PREVIEW_REQUIRED');
 const db=resolveDb(env);
 if(!db?.strictSecrets||!db.secretKey||db.url!==session?.config?.url||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('FINALE_OWNER_EXACT_DATABASE_REQUIRED');
 const goal=await readGoal({session,conversationId,env});
 const active=goal?.state?.active_goal;
 if(goal?.principal_id!==session.user_id||goal.conversation_id!==conversationId||
    active?.status!=='ACTIVE'||active?.user_confirmed!==true||
    active.goal_id!==goal.state?.active_goal_id||
    !validUuid(active.last_transition_receipt_id))
  fail('FINALE_OWNER_FRESH_CONFIRMED_GOAL_REQUIRED');
 const objective=String(active.title||'').toLowerCase();
 if(!objective.includes('reality')||
    !/(?:finale|full[ -]?loop|self[ -]?repair|self[ -]?upgrade)/.test(objective)||
    !/(?:controlled|construction|estimate)/.test(objective))
  fail('FINALE_OWNER_EXPLICIT_SCOPE_GOAL_REQUIRED');
 const spine=createContinuitySpine({continuityRootId:goal.scope.root,
  worldlineId:goal.scope.worldline,subjectId:session.user_id});
 if(spine.continuity_root_id!==goal.state.continuity_root_id||
    goal.scope.world!==goal.state.world_id)
  fail('FINALE_OWNER_SCOPE_MISMATCH');
 // Source, Actions, failure->correction and target PR must be independently
 // re-observed. A moved base is a safe blocker for INSTALL, not adoption.
 const proof=await verifyEvidence({env});
 if(!['EXACT_MODEL_CORRECTION_INDEPENDENTLY_VERIFIED_OWNER_ADMISSION_PENDING',
       'REVALIDATION_REQUIRED_BASE_MOVED'].includes(proof?.state)||
    proof.original_work_id!==CONTROLLED_FINALE_WORK||
    proof.source_sha256!==CONTROLLED_FINALE_SOURCE_SHA256||
    proof.test_kind!=='CONTROLLED_NONCUSTOMER'||
    proof.frozen_cases_passed!==6||proof.additional_holdout_cases_passed!==21||
    proof.owner_bound_warrant_issued!==false||
    proof.installation_authorized!==false||
    proof.controlled_job_completed!==false)
  fail('FINALE_OWNER_INDEPENDENT_HISTORICAL_EVIDENCE_MISSING');
 const state=Object.freeze({
  version:FINALE_OWNER_ADOPTION_VERSION,
  original_work_id:CONTROLLED_FINALE_WORK,
  original_goal_id:goal.state.active_goal_id,
  goal_revision:active.last_transition_receipt_id,
  owner_id:session.user_id,conversation_id:conversationId,
  evidence_role:'HISTORICAL_CONTROLLED_FINALE_ADOPTED_BY_OWNER',
  historical_model_source_sha256:CONTROLLED_FINALE_SOURCE_SHA256,
  source_path:proof.source_path,
  historical_source_pr:proof.github_pr_number,
  historical_generation_and_verification_runs:proof.independent_run_ids,
  frozen_cases_passed:6,additional_holdout_cases_passed:21,
  initial_gap_historically_observed:true,
  current_base_revalidation_required:proof.target_base_moved_since_review,
  next_required_step:'FRESH_OWNER_SCOPED_SANDBOX_REVERIFICATION',
  owner_sandbox_receipt_persisted:false,
  owner_bound_warrant_issued:false,
  installation_authorized:false,
  original_execution_authorized:false,
  original_job_completed:false,
 });
 const store=createPersistence({...db});
 const read=async()=>{
  const h=orderContinuityHistory(await store.reconstruct({
   continuityRootId:spine.continuity_root_id,worldlineId:spine.worldline_id}));
  const c=validateContinuityChain(h.map(e=>({
   ...e,prior_lineage_hash:e.prior_lineage_hash??e.provenance?.continuity_spine?.prior_lineage_hash??null,
  })));
  if(!c.valid)fail('FINALE_OWNER_CONTINUITY_LINEAGE_INVALID');
  return h;
 };
 const eventId=continuityUuidFromSource('controlled-finale-owner-adoption:'+
   session.user_id+':'+conversationId+':'+CONTROLLED_FINALE_WORK+':'+
   active.last_transition_receipt_id+':'+CONTROLLED_FINALE_SOURCE_SHA256);
 const history=await read();
 const previous=history.filter(e=>e.entity_type==='personal_controlled_finale_owner_adoption'&&
  e.payload?.original_work_id===CONTROLLED_FINALE_WORK);
 if(previous.length>1||previous.some(e=>e.event_id!==eventId))
  fail('FINALE_OWNER_DIFFERENT_ADOPTION_ALREADY_EXISTS');
 if(previous.length===1){
  const old=previous[0];
  if(old.event_kind!=='WORK'||old.epistemic_status!=='VERIFIED'||
     old.provenance?.principal_id!==session.user_id||
     old.provenance?.source!==FINALE_OWNER_ADOPTION_VERSION||
     // A moved base may change between reads. It is not part of owner
     // adoption identity, so compare the immutable facts instead.
     old.payload?.historical_model_source_sha256!==CONTROLLED_FINALE_SOURCE_SHA256||
     old.payload?.original_goal_id!==goal.state.active_goal_id||
     old.payload?.goal_revision!==active.last_transition_receipt_id||
     old.payload?.owner_bound_warrant_issued!==false)
   fail('FINALE_OWNER_EXISTING_ADOPTION_CONFLICT');
  return Object.freeze({status:'HISTORICAL_CONTROLLED_FINALE_OWNER_ADOPTED',
   original_work_id:CONTROLLED_FINALE_WORK,receipt_id:eventId,
   already_recorded:true,independently_reobserved:true,
   owner_sandbox_verified:false,warrant_issued:false,installation_authorized:false,
   original_job_completed:false});
 }
 const tail=history.at(-1);
 if(!tail?.event_id||!tail?.lineage_hash)
  fail('FINALE_OWNER_ACTIVE_CONTINUITY_TAIL_REQUIRED');
 const at=new Date().toISOString();
 const node=appendContinuityNode({
  spine,stage:'WORK',entityId:CONTROLLED_FINALE_WORK,eventId,
  parentEventId:tail.event_id,priorLineageHash:tail.lineage_hash,
  effectiveTime:at,assertionTime:at,epistemicStatus:'VERIFIED',
  evidenceRefs:proof.independent_run_ids.map(id=>
   'https://github.com/maloney2323/Reality/actions/runs/'+id),
  payload:state,
  provenance:{source:FINALE_OWNER_ADOPTION_VERSION,
   principal_id:session.user_id,conversation_id:conversationId},
 });
 await store.appendEvent({...node,entity_type:'personal_controlled_finale_owner_adoption'});
 const confirmed=await read();
 const saved=confirmed.filter(e=>e.event_id===eventId);
 if(saved.length!==1||saved[0].entity_type!=='personal_controlled_finale_owner_adoption'||
    saved[0].epistemic_status!=='VERIFIED'||
    normalized(saved[0].payload)!==normalized(state)||
    saved[0].parent_event_id!==tail.event_id)
  fail('FINALE_OWNER_DURABLE_READBACK_FAILED');
 return Object.freeze({status:'HISTORICAL_CONTROLLED_FINALE_OWNER_ADOPTED',
  original_work_id:CONTROLLED_FINALE_WORK,
  receipt_id:eventId,already_recorded:false,independently_reobserved:true,
  owner_sandbox_verified:false,warrant_issued:false,installation_authorized:false,
  original_job_completed:false});
}
