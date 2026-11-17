// Reality Chat -> existing Universe cognitive read model.
// This adapter is NOT a memory store, independent truth ledger or new engine.
// Durable Continuity is reconstructed from the existing owner-bound Spine;
// current authenticated provider observations are only a present-time window.
// The pluggable LLM receives the SAME Universe projection as Reality does.
import {
 createUniverseSnapshot,materializeCognitiveState,
 deriveCognitiveConsequences,buildReasonerContext
} from './reality-universe-cognition-v0.1.js';
import {projectCanonicalContinuityIntoUniverse}
 from './reality-continuity-universe-projection-v1.js';
import {mergeCurrentAndDurableUniverseForCognition}
 from './reality-native-universe-v1.0.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const fail=x=>{throw Error('REALITY_CHAT_UNIVERSE_'+x)};
function providerEvidence(e){
 return e&&typeof e==='object'&&!Array.isArray(e)&&
  typeof e.source_kind==='string'&&e.source_kind.length>5&&
  typeof e.source_ref==='string'&&e.source_ref.length>8&&
  typeof e.summary==='string'&&e.summary.length>0&&
  e.execution_authorized!==true&&e.installation_authorized!==true&&
  e.production_changed!==true;
}
export function projectOwnerRealityUniverseForChat({
 rootId,worldlineId,worldId,
 currentObservations=[],continuityHistory=null,
 reconciledOriginals=null
}={}){
 if(!UUID.test(rootId||'')||!UUID.test(worldlineId||'')||
    typeof worldId!=='string'||!worldId.startsWith('personal:chat:')||
    !Array.isArray(currentObservations)||currentObservations.length>100||
    !(continuityHistory===null||
      (Array.isArray(continuityHistory)&&continuityHistory.length<=1000)))
  fail('OWNER_ROOT_OR_EVIDENCE_INVALID');
 // The existing Spine verifier hashes the full chain; it excludes any
 // prior assistant text from external-fact assertions.
 const durable=continuityHistory===null?{
  status:'DURABLE_CONTINUITY_FETCHED_BY_EXISTING_FULL_RUNTIME',
  verified_history_event_count:null,entries:[]
 }:projectCanonicalContinuityIntoUniverse({
  history:continuityHistory,rootId,worldlineId,limit:24
 });
 const current=currentObservations.filter(providerEvidence).slice(0,76);
 const window=mergeCurrentAndDurableUniverseForCognition({
  current,durable:durable.entries,limit:90
 });
 const caps=[];
 const seen=new Set();
 for(const entry of current){
  if(entry.event_kind==='reality_owner_scoped_existing_capability_audit'&&
     Array.isArray(entry.capabilities)){
   for(const c of entry.capabilities.slice(0,30)){
    const id=String(c?.id||'');
    if(!/^[a-z][a-z0-9_]{2,90}$/.test(id)||seen.has(id))continue;
    seen.add(id);
    caps.push({id,status:String(c.proof_level||'UNVERIFIED'),
     source_ref:c.evidence_ref,
     can_claim_live:c.can_claim_live===true&&
      /VERIFIED|CURRENT_OWNER_SHIFT_OBSERVED/.test(c.proof_level||'')});
   }
  }
  if(entry.event_kind==='reality_pinned_provider_source_capability_inventory'&&
     entry.source_kind==='GITHUB_PINNED_DEPLOYMENT_SOURCE_TREE_READBACK'&&
     Array.isArray(entry.relevant_existing_source_paths)&&
     SHA.test((entry.source_ref||'').split('/').at(-1))){
   for(const path of entry.relevant_existing_source_paths.slice(0,24)){
    if(typeof path!=='string'||!/^src\/[a-z0-9_./-]+\.js$/.test(path)||
       seen.has(path))continue;
    seen.add(path);
    caps.push({id:path,status:'SOURCE_PRESENT_RUNTIME_UNVERIFIED',
     source_ref:entry.source_ref,can_claim_live:false});
   }
  }
 }
 const evidence=current.map((e,i)=>({
  id:e.entry_id||e.source_ref,
  kind:'OBSERVED',
  claim:e.summary.slice(0,1400),
  source_refs:[e.source_ref],
  worldline_id:worldlineId,continuity_root_id:rootId,
  status:e.epistemic_status||'CURRENT_SOURCE_OBSERVATION'
 }));
 const jobs=Array.isArray(reconciledOriginals?.jobs)?
  reconciledOriginals.jobs.filter(j=>WORK.test(j?.original_work_id||''))
   .slice(0,12).map(j=>({
    id:j.original_work_id,
    status:j.independently_settled===true?'SETTLED':
     j.phase==='SOURCE_ADMITTED'?'UNRESOLVED':String(j.phase||'UNRESOLVED'),
    source_ref:j.source_ref||null,original_work_id:j.original_work_id,
    source_phase:j.source_admission_phase||j.phase||null
   })):[];
 const outcomes=current.filter(e=>
  e.original_job_completed===true&&
  (e.independent_original_settlement_verified===true||
   e.event_kind==='owner_independent_original_job_final_receipt')&&
  e.production_changed===false).map(e=>({
   id:e.entry_id,kind:'VERIFIED_OUTCOME',
   claim:'Independently settled original job '+e.original_work_id,
   source_refs:[e.source_ref],worldline_id:worldlineId,
   continuity_root_id:rootId,status:'EXACT_ORIGINAL_TERMINAL_RECEIPT'
  }));
 const snapshot=createUniverseSnapshot({
  worldId,continuityRootId:rootId,worldlineId,
  evidence,capabilities:caps,work:jobs,outcomes,
  authority:[] // A read model never creates execution authority.
 });
 const state=materializeCognitiveState(snapshot);
 const consequences=deriveCognitiveConsequences(state);
 const reasoner=buildReasonerContext(state,consequences);
 const projection=Object.freeze({
  entry_id:'reality:universe:owner-cognitive-state:'+state.state_id,
  event_kind:'reality_owner_universe_cognitive_projection',
  source_kind:'EXISTING_UNIVERSE_COGNITION_PLUS_HASH_VERIFIED_CONTINUITY',
  source_ref:'continuity-spine:'+rootId,
  epistemic_status:'DERIVED_READ_MODEL_NOT_AN_INDEPENDENT_EXECUTION_RECEIPT',
  assertion_time:new Date().toISOString(),
  summary:'Reality existing Universe cognitive state '+state.state_id+
   '. Current authenticated source observations '+current.length+
   ', validated durable Continuity events '+
   (durable.verified_history_event_count===null?
    'OWNED_BY_FULL_UNIVERSE_RUNTIME':durable.verified_history_event_count)+
   ', source or runtime capability entries '+caps.length+
   ', contradictions '+state.contradictions.length+
   ', unsettled original jobs '+jobs.filter(j=>j.status!=='SETTLED').length+
   '. Source code presence is NOT verified operation. Missing source is UNKNOWN. '+
   'Reuse an existing capability before suggesting another engine. '+
   'No new shift, installation or owner approval was created.',
  universe_snapshot_id:snapshot.snapshot_id,
  universe_state_id:state.state_id,
  universe_evidence_refs:current.map(x=>x.source_ref).slice(0,30),
  existing_capabilities:caps,
  derived_consequences:reasoner.derived_consequences,
  source_projection_disagreements:
   reconciledOriginals?.source_projection_disagreements||[],
  past_continuity_events:durable.verified_history_event_count,
  evidence_not_promoted_to_verified_outcome:true,
  execution_authorized:false,installation_authorized:false,
  production_changed:false
 });
 return Object.freeze({
  status:'EXISTING_UNIVERSE_PROJECTION_FOR_OWNER_CHAT',
  cognition_context:reasoner,
  durable_continuity:durable,
  observations:mergeCurrentAndDurableUniverseForCognition({
   current:[projection,...current],
   durable:durable.entries,limit:90
  }),
  snapshot_id:snapshot.snapshot_id,
  state_id:state.state_id,
  new_ledger_created:false,
  authority_granted:false,installation_authorized:false
 });
}
