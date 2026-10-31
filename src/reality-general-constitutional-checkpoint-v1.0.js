// Generic owner-scoped, Continuity-backed checkpoint for Reality's EXISTING
// constitutional self-repair driver. No second job ledger and no model write
// authority. Every phase is append-only and independently reconstructed.
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {readFreshPersonalGoalState} from './reality-personal-goal-readback-v0.1.js';
import {createUniversePostgresPersistence} from './reality-universe-postgres-persistence-v0.1.js';
import {createContinuitySpine,appendContinuityNode,continuityUuidFromSource}
 from './reality-continuity-spine-v2.0.js';
import {verifySelfImprovementJournal}
 from './reality-governed-self-improvement-spine-v1.0.js';
import {orderContinuityHistory}
 from './reality-continuous-reliability-v0.1.js';
const fail=x=>{throw Error('GENERAL_CHECKPOINT_'+x)};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const WORK=/^work:[a-f0-9]{32}$/;
export function createGeneralConstitutionalCheckpointService({
 session,conversationId,originalWorkId,originalWorkEvidenceRef,
 db,env=process.env,readGoal=readFreshPersonalGoalState,
 createPersistence=createUniversePostgresPersistence,
}={}){
 if(env.VERCEL_ENV!=='preview'||
  env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true'||
  !validUuid(session?.user_id)||!validUuid(conversationId)||
  !WORK.test(String(originalWorkId||''))||
  !validUuid(originalWorkEvidenceRef)||
  !db?.strictSecrets||!db?.secretKey||
  db.url!==session?.config?.url)
  fail('AUTHENTICATED_PREVIEW_CONTINUITY_REQUIRED');
 const store=createPersistence({...db});
 const trustedGoal=async()=>{
  const goal=await readGoal({session,conversationId,env});
  if(goal?.principal_id!==session.user_id||
   goal?.conversation_id!==conversationId||
   goal?.persisted_source!=='ISOLATED_CONTINUITY_VERIFIED_READBACK'||
   goal?.state?.active_goal_id!==goal.state?.active_goal?.goal_id||
   goal?.state?.active_goal?.status!=='ACTIVE'||
   goal?.state?.active_goal?.user_confirmed!==true||
   !validUuid(goal?.state?.active_goal?.last_transition_receipt_id))
   fail('FRESH_OWNER_GOAL_NOT_VERIFIED');
  const spine=createContinuitySpine({
   continuityRootId:goal.scope.root,
   worldlineId:goal.scope.worldline,subjectId:session.user_id,
  });
  if(spine.continuity_root_id!==goal.state.continuity_root_id)
   fail('CANONICAL_ROOT_CHANGED');
  return {goal,spine};
 };
 const source=async spine=>{
  const history=orderContinuityHistory(await store.reconstruct({
   continuityRootId:spine.continuity_root_id,
   worldlineId:spine.worldline_id}));
  const original=history.filter(x=>x.event_id===originalWorkEvidenceRef&&
   (x.payload?.original_work_id===originalWorkId||
    x.payload?.work_id===originalWorkId));
  if(original.length!==1)
   fail('ORIGINAL_WORK_CONTINUITY_RECEIPT_NOT_UNIQUE');
  return {history,original:original[0]};
 };
 const receiptId=state=>continuityUuidFromSource(
  'reality:general:constitutional-checkpoint:'+session.user_id+':'+
  conversationId+':'+originalWorkId+':'+state.head_hash);
 const evidenceOf=state=>({
  version:'reality-general-constitutional-checkpoint-v1',
  owner_id:session.user_id,goal_id:state.scope.goal_id,
  original_work_id:originalWorkId,
  original_source_receipt_ref:originalWorkEvidenceRef,
  constitutional_phase:state.phase,
  constitutional_head_hash:state.head_hash,
  driver_state:state,
  installation_authorized:state.promotion_authorization?.consumed_once===true,
  original_job_completed:state.phase==='SETTLED'&&
   state.settlement?.durable_settlement_readback===true&&
   state.settlement?.independent_outcome_verified===true,
 });
 function checkState(state,goal,spine){
  verifySelfImprovementJournal(state);
  if(state.scope?.owner_id!==session.user_id||
   state.scope.goal_id!==goal.state.active_goal_id||
   state.scope.original_work_id!==originalWorkId||
   state.scope.continuity_root_id!==spine.continuity_root_id||
   state.scope.worldline_id!==spine.worldline_id||
   state.scope.goal_transition_receipt_ref!==
    goal.state.active_goal.last_transition_receipt_id||
   state.scope.goal_evidence_ref!==
    goal.state.active_goal.source_user_message_ref||
   state.scope.target_environment!=='ISOLATED_PREVIEW')
   fail('ORIGINAL_GOAL_OR_WORLDLINE_CHANGED');
 }
 async function readCheckpoint(state){
  const {goal,spine}=await trustedGoal();
  checkState(state,goal,spine);
  const {history}=await source(spine);
  const id=receiptId(state);
  const events=history.filter(x=>x.event_id===id);
  if(events.length!==1||
   events[0].entity_type!=='reality_general_constitutional_checkpoint'||
   events[0].payload?.constitutional_head_hash!==state.head_hash||
   events[0].payload?.constitutional_phase!==state.phase||
   events[0].payload?.original_source_receipt_ref!==originalWorkEvidenceRef||
   !same(events[0].payload.driver_state,state))
   fail('CHECKPOINT_POST_WRITE_INDEPENDENT_READBACK_FAILED');
  return Object.freeze({
   persisted:true,independent_readback_verified:true,
   checkpoint_hash:state.head_hash,checkpoint_receipt_id:id,
   original_work_id:originalWorkId,phase:state.phase,
  });
 }
 async function persistCheckpoint(state){
  const {goal,spine}=await trustedGoal();
  checkState(state,goal,spine);
  const {history}=await source(spine);
  const id=receiptId(state);
  const existing=history.filter(e=>e.event_id===id);
  if(existing.length>1)fail('DUPLICATE_CHECKPOINT_ID');
  const p=evidenceOf(state);
  if(existing.length){
   if(existing[0].entity_type!=='reality_general_constitutional_checkpoint'||
    !same(existing[0].payload,p))fail('CHECKPOINT_BYTES_CONFLICT');
  }else{
   const tail=history.at(-1);
   if(!tail?.event_id||!tail?.lineage_hash)
    fail('CONTINUITY_TAIL_UNAVAILABLE');
   const at=new Date().toISOString();
   const node=appendContinuityNode({
    spine,stage:'OBSERVATION',entityId:originalWorkId,eventId:id,
    parentEventId:tail.event_id,priorLineageHash:tail.lineage_hash,
    effectiveTime:at,assertionTime:at,epistemicStatus:'VERIFIED',
    evidenceRefs:[originalWorkEvidenceRef],
    payload:p,provenance:{source:'reality-general-constitutional-checkpoint-v1',
     principal_id:session.user_id,conversation_id:conversationId},
   });
   await store.appendEvent({...node,
    entity_type:'reality_general_constitutional_checkpoint'});
  }
  return readCheckpoint(state);
 }
 async function readLatestCheckpoint(){
  const {goal,spine}=await trustedGoal();
  const {history}=await source(spine);
  const matches=history.filter(e=>
   e.entity_type==='reality_general_constitutional_checkpoint'&&
   e.payload?.original_work_id===originalWorkId&&
   e.payload?.original_source_receipt_ref===originalWorkEvidenceRef);
  if(!matches.length)fail('NO_PERSISTED_GENERAL_CHECKPOINT');
  const state=matches.at(-1).payload.driver_state;
  checkState(state,goal,spine);
  const observed=await readCheckpoint(state);
  return Object.freeze({...observed,state});
 }
 return Object.freeze({persistCheckpoint,readLatestCheckpoint,readCheckpoint});
}
