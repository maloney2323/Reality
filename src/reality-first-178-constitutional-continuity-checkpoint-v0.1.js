// Constitution-owned checkpoints for the FIRST original #178 customer job.
// One existing Continuity Ledger, one original work ID, and one append-only
// journal. No parallel job status table, no model authority, no installation.
// Trusted server creates this adapter after authenticated goal/owner readback.
// It is consumed as 'persistCheckpoint' by the ONE constitutional driver.
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {readFreshPersonalGoalState}
 from './reality-personal-goal-readback-v0.1.js';
import {createUniversePostgresPersistence}
 from './reality-universe-postgres-persistence-v0.1.js';
import {createContinuitySpine,appendContinuityNode,continuityUuidFromSource}
 from './reality-continuity-spine-v2.0.js';
import {verifySelfImprovementJournal}
 from './reality-governed-self-improvement-spine-v1.0.js';
import {orderContinuityHistory}
 from './reality-continuous-reliability-v0.1.js';
export const REALITY_FIRST_178_CONTINUITY_CHECKPOINT_VERSION=
 'reality-first-178-constitutional-continuity-checkpoint-v0.1';
const fail=(why)=>{throw Error('FIRST_178_CONTINUITY_'+why)};
const canon=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?
 x.map(canon):Object.fromEntries(Object.keys(x).sort().map(k=>[k,canon(x[k])]));
const jsonEqual=(a,b)=>JSON.stringify(canon(a))===JSON.stringify(canon(b));
const work=/^work:[a-f0-9]{32}$/;
export function createFirst178ConstitutionalCheckpointService({
 session,conversationId,originalWorkId,db,env=process.env,
 readGoal=readFreshPersonalGoalState,
 createPersistence=createUniversePostgresPersistence,
}={}){
 if(env.VERCEL_ENV!=='preview'||
   env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true'||
   !validUuid(session?.user_id)||!validUuid(conversationId)||
   !work.test(originalWorkId||'')||!db?.strictSecrets||
   !db?.secretKey||db.url!==session?.config?.url)
  fail('OWNER_DURABLE_PREVIEW_REQUIRED');
 const store=createPersistence({...db});
 const verifyGoal=async()=>{
  const g=await readGoal({session,conversationId,env});
  if(g?.principal_id!==session.user_id||
    g?.conversation_id!==conversationId||
    g?.persisted_source!=='ISOLATED_CONTINUITY_VERIFIED_READBACK'||
    g?.state?.active_goal?.status!=='ACTIVE'||
    g?.state?.active_goal?.user_confirmed!==true||
    g?.state?.active_goal_id!==g.state.active_goal.goal_id||
    !validUuid(g?.state?.active_goal?.last_transition_receipt_id))
   fail('OWNER_GOAL_READBACK_UNVERIFIED');
  const spine=createContinuitySpine({
   continuityRootId:g.scope.root,worldlineId:g.scope.worldline,
   subjectId:session.user_id,
  });
  if(spine.continuity_root_id!==g.state.continuity_root_id||
     g.state.world_id!==g.scope.world)
   fail('CANONICAL_GOAL_WORLDLINE_CHANGED');
  return {g,spine};
 };
 const read=spine=>store.reconstruct({
  continuityRootId:spine.continuity_root_id,
  worldlineId:spine.worldline_id,
 });
 const gapReceiptId=continuityUuidFromSource(
  'first178:provider-gap:'+session.user_id+':'+conversationId+':'+originalWorkId);
 const exactOriginal=history=>history.filter(e=>
  e.entity_type==='personal_first_self_upgrade_customer_work'&&
  e.payload?.original_work_id===originalWorkId&&
  e.payload?.issue_number===178&&
  e.payload?.installation_authorized===false);
 const persistGap=async input=>{
  const {g,spine}=await verifyGoal();
  if(input?.owner_id!==session.user_id||
     input?.goal_id!==g.state.active_goal_id||
     input?.original_work_id!==originalWorkId||
     input?.worldline_id!==spine.worldline_id||
     !/^[a-f0-9]{64}$/.test(String(input.evidence_hash||''))||
     input.provider_receipt_ref!==
      'github:actions:run:40962921090:job:123760052647')
   fail('PINNED_OWNER_GAP_INVALID');
  const history=orderContinuityHistory(await read(spine));
  const workSources=exactOriginal(history).filter(e=>
    e.payload?.original_goal_id===g.state.active_goal_id&&
    e.payload?.goal_transition_receipt_ref===
     g.state.active_goal.last_transition_receipt_id);
  if(workSources.length!==1)
   fail('FIRST_178_SOURCE_WORK_RECEIPT_REQUIRED');
  const payload={
   version:REALITY_FIRST_178_CONTINUITY_CHECKPOINT_VERSION,
   owner_id:session.user_id,goal_id:g.state.active_goal_id,
   original_work_id:originalWorkId,worldline_id:spine.worldline_id,
   original_source_receipt_ref:workSources[0].event_id,
   evidence_hash:input.evidence_hash,
   provider_receipt_ref:input.provider_receipt_ref,
   installed:false,authorization_granted:false,
   original_job_completed:false,
  };
  const existing=history.find(e=>e.event_id===gapReceiptId);
  if(existing){
   if(existing.entity_type!=='personal_first_178_confirmed_gap'||
      !jsonEqual(existing.payload,payload))
    fail('GAP_RECEIPT_CONFLICT');
  }else{
   const tail=history.at(-1);
   if(!tail?.event_id||!tail?.lineage_hash)
    fail('GAP_CONTINUITY_TAIL_REQUIRED');
   const at=new Date().toISOString();
   const node=appendContinuityNode({
    spine,stage:'OBSERVATION',entityId:originalWorkId,
    eventId:gapReceiptId,parentEventId:tail.event_id,
    priorLineageHash:tail.lineage_hash,effectiveTime:at,assertionTime:at,
    epistemicStatus:'VERIFIED',payload,
    evidenceRefs:[workSources[0].payload.pinned_red_run],
    provenance:{source:REALITY_FIRST_178_CONTINUITY_CHECKPOINT_VERSION,
     principal_id:session.user_id,conversation_id:conversationId},
   });
   await store.appendEvent({...node,
    entity_type:'personal_first_178_confirmed_gap'});
  }
  const result=await readBackGap({
   owner_id:session.user_id,goal_id:g.state.active_goal_id,
   original_work_id:originalWorkId,receipt_id:gapReceiptId,
  });
  if(result?.verified!==true||result.evidence_hash!==input.evidence_hash)
   fail('GAP_POST_WRITE_READBACK_UNVERIFIED');
  return Object.freeze({committed:true,receipt_id:gapReceiptId});
 };
 const readBackGap=async input=>{
  const {g,spine}=await verifyGoal();
  if(input?.receipt_id!==gapReceiptId||
     input.owner_id!==session.user_id||
     input.goal_id!==g.state.active_goal_id||
     input.original_work_id!==originalWorkId)
   fail('GAP_READBACK_OWNER_SCOPE_INVALID');
  const events=orderContinuityHistory(await read(spine));
  const gap=events.find(e=>e.event_id===gapReceiptId);
  const sources=exactOriginal(events);
  if(!gap||gap.event_kind!=='OBSERVATION'||
     gap.epistemic_status!=='VERIFIED'||
     gap.entity_type!=='personal_first_178_confirmed_gap'||
     sources.length!==1||
     gap.payload?.original_source_receipt_ref!==sources[0].event_id||
     gap.payload?.goal_id!==g.state.active_goal_id||
     gap.payload?.original_work_id!==originalWorkId||
     gap.payload?.owner_id!==session.user_id||
     gap.payload?.worldline_id!==spine.worldline_id||
     !/^[a-f0-9]{64}$/.test(gap.payload?.evidence_hash||'')||
     gap.payload?.provider_receipt_ref!==
      'github:actions:run:40962921090:job:123760052647'||
     gap.payload?.installed!==false||
     gap.payload?.authorization_granted!==false)
   fail('GAP_NOT_INDEPENDENTLY_RECONSTRUCTED');
  return Object.freeze({receipt_id:gapReceiptId,verified:true,
   source:'INDEPENDENT_PROVIDER_READBACK',
   owner_id:session.user_id,goal_id:g.state.active_goal_id,
   original_work_id:originalWorkId,worldline_id:spine.worldline_id,
   evidence_hash:gap.payload.evidence_hash,
   provider_receipt_ref:gap.payload.provider_receipt_ref});
 };
 const readLatestCheckpoint=async()=>{
  const {g,spine}=await verifyGoal();
  const history=orderContinuityHistory(await read(spine));
  const originals=exactOriginal(history).filter(x=>
   x.payload?.original_goal_id===g.state.active_goal_id&&
   x.payload?.goal_transition_receipt_ref===
    g.state.active_goal.last_transition_receipt_id);
  if(originals.length!==1)
   fail('RESTORE_ORIGINAL_SOURCE_NOT_UNIQUE');
  const checkpoints=history.filter(e=>
   e.entity_type==='personal_first_178_constitutional_checkpoint'&&
   e.payload?.original_work_id===originalWorkId);
  if(checkpoints.length<1)fail('RESTORE_CHECKPOINT_NOT_FOUND');
  const last=checkpoints.at(-1);
  const state=last?.payload?.driver_state;
  verifySelfImprovementJournal(state);
  if(state?.phase!=='GAP_CONFIRMED'||
     state?.attempt_count!==0||state?.candidate!==null||
     state?.journal?.length!==1||
     state?.journal?.[0]?.kind!=='GAP_CONFIRMED'||
     state.scope?.owner_id!==session.user_id||
     state.scope?.goal_id!==g.state.active_goal_id||
     state.scope?.original_work_id!==originalWorkId||
     state.scope?.worldline_id!==spine.worldline_id||
     state.scope?.continuity_root_id!==spine.continuity_root_id||
     state.scope?.goal_transition_receipt_ref!==
      g.state.active_goal.last_transition_receipt_id||
     state.scope?.goal_evidence_ref!==
      g.state.active_goal.source_user_message_ref||
     state.scope?.target_environment!=='ISOLATED_PREVIEW'||
     last.payload?.constitutional_phase!=='GAP_CONFIRMED'||
     last.payload?.constitutional_head_hash!==state.head_hash||
     last.payload?.original_source_receipt_ref!==originals[0].event_id||
     last.payload?.installation_authorized!==false||
     last.payload?.original_job_completed!==false)
   fail('RESTORE_EXACT_UNCONSUMED_GAP_REQUIRED');
  // The independent gap evidence must still match this original owner's
  // worldline. This also verifies there was no model-authored approval.
  const gap=history.filter(e=>
   e.entity_type==='personal_first_178_confirmed_gap'&&
   e.payload?.original_work_id===originalWorkId);
  if(gap.length!==1||gap[0].payload?.original_source_receipt_ref!==
     originals[0].event_id||gap[0].payload?.authorization_granted!==false||
     state.journal[0].evidence_ref!==gapReceiptId||
     state.journal[0].evidence_hash!==gap[0].payload?.evidence_hash||
     state.journal[0].body?.original_work_id!==originalWorkId)
   fail('RESTORE_GAP_PROVENANCE_MISSING');
  const verified=await readBackGap({
   owner_id:session.user_id,goal_id:g.state.active_goal_id,
   original_work_id:originalWorkId,receipt_id:gapReceiptId,
  });
  if(!verified.verified||verified.evidence_hash!==
      gap[0].payload.evidence_hash)
   fail('RESTORE_PROVIDER_GAP_READBACK_FAILED');
  return Object.freeze({state,
   continuity_receipt_id:last.event_id,
   checkpoint_hash:state.head_hash,
   original_work_id:originalWorkId,verified:true});
 };
 const persistCheckpoint=async state=>{
  verifySelfImprovementJournal(state);
  if(state.scope.owner_id!==session.user_id||
    state.scope.original_work_id!==originalWorkId||
    state.scope.target_environment!=='ISOLATED_PREVIEW')
   fail('OWNER_WORK_OR_AUTHORITY_SCOPE_CHANGED');
  const {g,spine}=await verifyGoal();
  if(state.scope.goal_id!==g.state.active_goal_id||
     state.scope.goal_transition_receipt_ref!==
       g.state.active_goal.last_transition_receipt_id||
     state.scope.goal_evidence_ref!==
       g.state.active_goal.source_user_message_ref||
     state.scope.continuity_root_id!==spine.continuity_root_id||
     state.scope.worldline_id!==spine.worldline_id)
   fail('GOAL_CHANGED_DURING_SELF_UPGRADE');
  const past=orderContinuityHistory(await read(spine));
  const original=past.filter(e=>
   e.entity_type==='personal_first_self_upgrade_customer_work'&&
   e.payload?.original_work_id===originalWorkId&&
   e.payload?.original_goal_id===state.scope.goal_id&&
   e.payload?.goal_transition_receipt_ref===
     state.scope.goal_transition_receipt_ref&&
   e.payload?.issue_number===178&&
   e.payload?.installation_authorized===false);
  if(original.length!==1)
   fail('FIRST_178_SOURCE_WORK_RECEIPT_REQUIRED');
  const checkpoints=past.filter(e=>
   e.entity_type==='personal_first_178_constitutional_checkpoint'&&
   e.payload?.original_work_id===originalWorkId);
  const latest=checkpoints.at(-1)||null;
  const id=continuityUuidFromSource('first178:constitutional:'+
   session.user_id+':'+conversationId+':'+state.head_hash);
  const existing=checkpoints.find(e=>e.event_id===id);
  if(existing&&!jsonEqual(existing.payload?.driver_state,state))
   fail('CHECKPOINT_ID_CONFLICT');
  if(!existing){
   // A full hash-chained journal can only extend the prior persisted state,
   // never replace a failure or jump directly to an invented successful phase.
   if(latest){
    const prior=latest.payload?.driver_state;
    verifySelfImprovementJournal(prior);
    if(prior.scope_hash!==state.scope_hash||
      state.journal.length!==prior.journal.length+1||
      !state.journal.slice(0,prior.journal.length).every((e,i)=>
       jsonEqual(e,prior.journal[i])))
     fail('CHECKPOINT_MUST_EXTEND_SAME_JOURNAL');
   }else if(state.journal.length!==1||
     state.journal[0].kind!=='GAP_CONFIRMED')
    fail('INITIAL_VERIFIED_GAP_REQUIRED');
   const tail=past.at(-1);
   if(!tail?.event_id||!tail?.lineage_hash||
      tail.continuity_root_id!==spine.continuity_root_id||
      tail.worldline_id!==spine.worldline_id)
    fail('CONTINUITY_TAIL_UNVERIFIED');
   const at=new Date().toISOString();
   const payload={
    version:REALITY_FIRST_178_CONTINUITY_CHECKPOINT_VERSION,
    original_work_id:originalWorkId,original_goal_id:state.scope.goal_id,
    original_source_receipt_ref:original[0].event_id,
    constitutional_head_hash:state.head_hash,
    constitutional_phase:state.phase,
    driver_state:state,
    // The same journal records the entire lifecycle, including *later*
    // owner-approved registration and settlement. Its phase/receipt invariants
    // are verified in the constitutional core, not reimplemented here.
    installation_authorized:Boolean(state.promotion_authorization?.consumed_once),
    original_job_completed:state.phase==='SETTLED'&&
     state.settlement?.durable_settlement_readback===true&&
     state.settlement?.independent_outcome_verified===true,
    production_changed:false,
   };
   const node=appendContinuityNode({
    spine,stage:'WORK',entityId:originalWorkId,eventId:id,
    parentEventId:tail.event_id,priorLineageHash:tail.lineage_hash,
    effectiveTime:at,assertionTime:at,epistemicStatus:'OBSERVED',
    evidenceRefs:[original[0].payload.pinned_red_run],
    payload,provenance:{
     source:REALITY_FIRST_178_CONTINUITY_CHECKPOINT_VERSION,
     principal_id:session.user_id,conversation_id:conversationId,
    },
   });
   await store.appendEvent({...node,
    entity_type:'personal_first_178_constitutional_checkpoint'});
  }
  // Always independently reconstruct and revalidate post-write bytes and
  // goal freshness. Never equate a successful INSERT with a durable result.
  const freshGoal=await verifyGoal();
  if(freshGoal.g.state.active_goal.last_transition_receipt_id!==
     state.scope.goal_transition_receipt_ref)
   fail('GOAL_CHANGED_AFTER_COMMIT');
  const recorded=orderContinuityHistory(await read(spine))
    .find(e=>e.event_id===id);
  if(recorded?.entity_type!=='personal_first_178_constitutional_checkpoint'||
     recorded?.payload?.constitutional_head_hash!==state.head_hash||
     recorded.payload?.original_source_receipt_ref!==original[0].event_id||
     !jsonEqual(recorded.payload?.driver_state,state)||
     recorded.payload?.installation_authorized!==
      Boolean(state.promotion_authorization?.consumed_once)||
     recorded.payload?.original_job_completed!==Boolean(
      state.phase==='SETTLED'&&
      state.settlement?.durable_settlement_readback===true&&
      state.settlement?.independent_outcome_verified===true))
   fail('CHECKPOINT_INDEPENDENT_RECONSTRUCTION_FAILED');
  return Object.freeze({
   persisted:true,independent_readback_verified:true,
   checkpoint_hash:state.head_hash,
   original_work_id:originalWorkId,
   continuity_receipt_id:id,
  });
 };
 return Object.freeze({persistCheckpoint,persistGap,readBackGap,
  readLatestCheckpoint});
}
