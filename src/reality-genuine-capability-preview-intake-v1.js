// Preview-only runtime binding for the Genuine Capability Engine.
// The caller is an ALREADY AUTHENTICATED internal job executor. A model and
// a browser cannot supply providerReadback or write an owner authority receipt.
import {createGenuineCapabilityLiveIntake} from './reality-genuine-capability-live-intake-v1.js';
import {dispatchGenuineCapabilityWake} from './reality-genuine-capability-github-wakeup-v1.js';
import {validUuid} from './reality-private-chat-store-v0.1.js';
import {resolveReliabilityBenchmarkDb} from './reality-reliability-db-boundary-v0.1.js';
import {readFreshPersonalGoalState} from './reality-personal-goal-readback-v0.1.js';
import {createUniversePostgresPersistence} from './reality-universe-postgres-persistence-v0.1.js';
import {createContinuitySpine,appendContinuityNode,continuityUuidFromSource}
 from './reality-continuity-spine-v2.0.js';
import {orderContinuityHistory} from './reality-continuous-reliability-v0.1.js';

const WORK=/^work:[a-f0-9]{32}$/;
const fail=x=>{throw Error('GENUINE_PREVIEW_'+x)};
const canonical=x=>x===null||typeof x!=='object'?x:
 Array.isArray(x)?x.map(canonical):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])]));
const equal=(x,y)=>JSON.stringify(canonical(x))===JSON.stringify(canonical(y));
export function createGenuinePreviewLiveIntake({
 session,conversationId,env=process.env,
 providerReadback,workerWake=null,
 readGoal=readFreshPersonalGoalState,
 createPersistence=createUniversePostgresPersistence,
 rpcFetch=fetch,
}={}){
 if(env.VERCEL_ENV!=='preview'||
  env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true'||
  !validUuid(session?.user_id)||!validUuid(conversationId)||
  !session?.config?.url||
  typeof providerReadback!=='function'||
  (workerWake!==null&&typeof workerWake!=='function'))
  fail('AUTHENTICATED_OR_TRUSTED_PROVIDER_ADAPTER_REQUIRED');
 const db=resolveReliabilityBenchmarkDb(env);
 if(!db?.strictSecrets||!db.secretKey||db.url!==session.config.url||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('EXACT_ISOLATED_DATABASE_REQUIRED');
 const store=createPersistence({...db});
 const getContext=async originalWorkId=>{
  if(!WORK.test(originalWorkId))fail('ORIGINAL_WORK_INVALID');
  const goal=await readGoal({session,conversationId,env});
  if(goal?.principal_id!==session.user_id||
   goal?.conversation_id!==conversationId||
   goal?.persisted_source!=='ISOLATED_CONTINUITY_VERIFIED_READBACK'||
   goal.state?.active_goal_id!==goal.state?.active_goal?.goal_id||
   goal.state.active_goal.user_confirmed!==true||
   goal.state.active_goal.status!=='ACTIVE'||
   !validUuid(goal.state.active_goal.last_transition_receipt_id))
   fail('CURRENT_CONFIRMED_OWNER_GOAL_REQUIRED');
  const spine=createContinuitySpine({
   continuityRootId:goal.scope.root,worldlineId:goal.scope.worldline,
   subjectId:session.user_id,
  });
  const events=orderContinuityHistory(await store.reconstruct({
   continuityRootId:spine.continuity_root_id,
   worldlineId:spine.worldline_id,
  }));
  const originals=events.filter(e=>e?.payload?.original_work_id===originalWorkId&&
   e?.payload?.owner_id===session.user_id&&
   e?.epistemic_status==='VERIFIED'&&
   e?.payload?.original_job_completed===false&&
   e?.payload?.goal_transition_receipt_ref===
     goal.state.active_goal.last_transition_receipt_id&&
   e?.provenance?.conversation_id===conversationId&&
   validUuid(e.event_id)&&
   e.entity_type!=='reality_genuine_capability_gap_v1'&&
   e.entity_type!=='reality_general_constitutional_checkpoint');
  // Different original-work events are not interchangeable or a new job.
  if(originals.length!==1)fail('UNIQUE_VERIFIED_ORIGINAL_JOB_REQUIRED');
  if(events.some(e=>e.payload?.original_work_id===originalWorkId&&
    e.epistemic_status==='VERIFIED'&&
    (e.payload?.original_job_completed===true||
     e.payload?.constitutional_phase==='SETTLED')))
   fail('ALREADY_SETTLED_ORIGINAL_WORK');
  return {goal,spine,events,original:originals[0]};
 };
 async function call(name,body){
  const response=await rpcFetch(db.url+'/rest/v1/rpc/'+name,{
   method:'POST',redirect:'error',cache:'no-store',
   headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
    'content-type':'application/json',accept:'application/json'},
   body:JSON.stringify(body)});
  const data=await response.json().catch(()=>null);
  if(!response.ok||!data||typeof data!=='object')
   fail('ATOMIC_DATABASE_PROVIDER_UNAVAILABLE');
  return data;
 }
 return createGenuineCapabilityLiveIntake({
  async readOriginalOwnerGoal({original_work_id}){
   const {goal,spine,original}=await getContext(original_work_id);
   return Object.freeze({
    original_work_id,owner_id:session.user_id,conversation_id:conversationId,
    goal_active:true,owner_confirmed:true,original_job_settled:false,
    goal_id:goal.state.active_goal_id,
    goal_transition_event_id:goal.state.active_goal.last_transition_receipt_id,
    original_work_event_id:original.event_id,
    // Only metadata from the separately verified original-work event;
    // its business projections remain source-linked claims, never proof
    // of ROI, competitive advantage, or transfer authorization.
    original_business_evidence:{
     work_kind:original.payload?.kind,
     business_category:original.payload?.business_category,
     expected_business_outcome:original.payload?.expected_business_outcome,
     value_dimensions:original.payload?.value_dimensions,
    },
    continuity_root_id:spine.continuity_root_id,
    worldline_id:spine.worldline_id,
   });
  },
  async readOriginalProviderFailure(request){
   // Provided solely by the trusted installed business connector. A second
   // model call, same in-memory object, or client claims are not a readback.
   return providerReadback(Object.freeze({...request,session_user_id:session.user_id,
    conversation_id:conversationId,read_only:true}));
  },
  async persistGapAndReadback(input){
   const id=continuityUuidFromSource(
    'genuine-capability-gap:'+session.user_id+':'+conversationId+':'+
    input.original_work_id+':'+input.original_execution_receipt+':'+
    input.provider_failure_hash);
   const payload={
    version:'reality_genuine_capability_gap_v1',
    owner_id:session.user_id,conversation_id:conversationId,
    goal_id:input.goal_id,
    original_work_id:input.original_work_id,
    original_work_event_id:input.original_work_event_id,
    goal_transition_event_id:input.goal_transition_event_id,
    source_ref:input.observed_failure.source_ref,
    verification_suite_ref:input.observed_failure.verification_suite_ref,
    capability_id:input.observed_failure.capability_id,
    provider_failure_hash:input.provider_failure_hash,
    original_execution_receipt:input.original_execution_receipt,
    value_passport:input.value_passport,
    evidence_kind:'OBSERVED_FAILURE',blocker_class:'MISSING_INSTRUMENT',
    independently_verified:true,external_action_performed:false,
    provider_effect_may_have_occurred:false,installation_authorized:false,
    original_job_completed:false,production_changed:false,
   };
   for(let attempt=0;attempt<3;attempt++){
    const {spine,events,original}=await getContext(input.original_work_id);
    if(original.event_id!==input.original_work_event_id)
     fail('ORIGINAL_SOURCE_EVENT_CHANGED');
    const existing=events.filter(e=>e.event_id===id);
    if(existing.length>1)fail('DUPLICATE_GAP_EVENT_ID');
    if(existing.length===1){
     const event=existing[0];
     if(event.entity_type!=='reality_genuine_capability_gap_v1'||
      !equal(event.payload,payload)||
      event.epistemic_status!=='VERIFIED')
      fail('EXISTING_GAP_BYTES_CHANGED');
     return Object.freeze({independently_verified:true,event_id:id,
      original_work_id:input.original_work_id,owner_id:session.user_id,
      goal_transition_event_id:input.goal_transition_event_id,
      provider_failure_hash:input.provider_failure_hash,
      installation_authorized:false,original_job_completed:false});
    }
    const tail=events.at(-1);
    if(!tail?.event_id||!tail?.lineage_hash)fail('VERIFIED_TAIL_MISSING');
    const at=new Date().toISOString();
    const node=appendContinuityNode({
     spine,stage:'OBSERVATION',entityId:input.original_work_id,eventId:id,
     parentEventId:tail.event_id,priorLineageHash:tail.lineage_hash,
     effectiveTime:at,assertionTime:at,epistemicStatus:'VERIFIED',
     evidenceRefs:[original.event_id],
     payload,provenance:{source:'reality-genuine-capability-live-intake-v1',
      principal_id:session.user_id,conversation_id:conversationId},
    });
    try{
     await store.appendEvent({...node,
      entity_type:'reality_genuine_capability_gap_v1'});
    }catch(e){
     if(!['CONTINUITY_APPEND_NOT_TAIL',
      'CONTINUITY_PRIOR_LINEAGE_HASH_MISMATCH',
      'CONTINUITY_EVENT_ID_COLLISION'].includes(String(e?.message||'')))
      throw e;
     if(attempt===2)fail('CONCURRENT_GAP_APPEND_RETRY_EXHAUSTED');
     continue;
    }
   }
   // Strict independent post-write reconstruction, including lineage hash.
   const {events}=await getContext(input.original_work_id);
   const matched=events.filter(e=>e.event_id===id);
   if(matched.length!==1||matched[0].entity_type!=='reality_genuine_capability_gap_v1'||
    !equal(matched[0].payload,payload)||
    matched[0].epistemic_status!=='VERIFIED')
    fail('POST_WRITE_GAP_READBACK_FAILED');
   return Object.freeze({independently_verified:true,event_id:id,
    original_work_id:input.original_work_id,owner_id:session.user_id,
    goal_transition_event_id:input.goal_transition_event_id,
    provider_failure_hash:input.provider_failure_hash,
    installation_authorized:false,original_job_completed:false});
  },
  async enqueueExactGap({gap_event_id}){
   return call('reality_enqueue_genuine_capability_gap_v1',{
    p_gap_event_id:gap_event_id});
  },
  async signalUnattendedWorker(request){
   return (workerWake||((input)=>dispatchGenuineCapabilityWake({...input,env})))(request);
  },
 });
}
