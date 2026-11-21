// Read-only projection of each existing original through Reality's canonical
// Continuity Spine. This file adds NO job ledger, authority, executor or
// settlement. Its inputs MUST come from the authenticated, independently
// checked owner preflight (not a model proposal or arbitrary browser data).
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const ROUTE=/^reality:qualification:[a-f0-9]{64}$/;
export const CANONICAL_ORIGINAL_STAGES=Object.freeze([
 'RAW_SIGNAL','TRANSFORMATION','OBSERVATION','SITUATION','WORK',
 'AUTHORITY','EXECUTION','VERIFICATION','OUTCOME','LEARNING','CAPABILITY'
]);
const itemStatus=(name,state,evidenceRef=null)=>Object.freeze({
 stage:name,state,evidence_ref:evidenceRef
});
const evidence=(condition,state,ref)=>condition?
 itemStatus(state[0],'EVIDENCE_VERIFIED',ref):
 itemStatus(state[0],state[1]);
const noEffects=Object.freeze({
 execution_authorized_by_projection:false,
 owner_approval_granted_by_projection:false,
 installation_authorized:false,production_changed:false,
 original_job_completed_by_projection:false,new_shift_started:false
});
const staleSource=new Set([
 'SIGNED_WORKER_SOURCE_FRESHNESS_REQUIRED',
 'INDEPENDENT_SOURCE_PROOF_REQUIRED',
 'SOURCE_EPOCH_REVALIDATION_REQUIRED'
]);

export function projectOriginalAgainstCanonicalSpine(preflight,item){
 if(preflight?.status!=='OWNER_MULTI_ORIGINAL_SHIFT_INDEPENDENT_PREFLIGHT'||
   !UUID.test(preflight.owner_id||'')||preflight.read_only!==true||
   preflight.source_qualification_is_not_authority!==true||
   preflight.current_shift_scope_is_not_general_business_permission!==true||
   preflight.owner_approval_granted!==false||
   preflight.model_execution_authorized!==false||
   preflight.ready_to_start_multi_original_execution!==false||
   preflight.production_changed!==false||
   !Array.isArray(preflight.prioritized_source_preflight)||
   !preflight.prioritized_source_preflight.includes(item)||
   !item||typeof item!=='object'||
   !ROUTE.test(item.continuity_ref||'')||
   !String(item.source_ref||'').trim()||
   item.original_work_id!==null&&!WORK.test(item.original_work_id||'')||
   typeof item.acceptance_gate!=='string'||
   item.execution_authorized_by_read!==false||
   item.owner_approval_granted_by_read!==false||
   item.new_shift_started!==false||
   typeof item.qualified_evidence_for_governed_executor_preflight!=='boolean'||
   typeof item.independent_final_receipt_verified!=='boolean'||
   typeof item.exact_business_warrant_verified!=='boolean'||
   typeof item.owner_goal_acceptance_worldline_verified!=='boolean')
  throw Error('CANONICAL_ORIGINAL_SPINE_SOURCE_SCOPE_INVALID');
 const bound=WORK.test(item.original_work_id||'');
 const eligible=item.qualified_evidence_for_governed_executor_preflight===true;
 const warrant=item.exact_business_warrant_verified===true;
 const situation=item.owner_goal_acceptance_worldline_verified===true;
 const final=item.independent_final_receipt_verified===true;
 if((final||warrant||situation||eligible)&&!bound)
  throw Error('CANONICAL_ORIGINAL_SPINE_ORPHAN_PROOF_REJECTED');
 if(eligible&&(!warrant||!situation))
  throw Error('CANONICAL_ORIGINAL_SPINE_QUALIFICATION_CONTRADICTS_AUTHORITY');
 const current=!staleSource.has(item.acceptance_gate);
 const identity=item.continuity_ref;
 const original=bound?item.original_work_id:null;
 const stages=[
  itemStatus('RAW_SIGNAL','SOURCE_OBSERVED',item.source_ref),
  itemStatus('TRANSFORMATION','CONTINUITY_ROUTE_RECORDED',identity),
  itemStatus('OBSERVATION',current?'SOURCE_EPOCH_RECHECK_REQUIRED_FOR_EXECUTION':
   'SOURCE_REOBSERVATION_REQUIRED',identity),
  itemStatus('SITUATION',situation?'EVIDENCE_VERIFIED':'GOAL_ACCEPTANCE_WORLDLINE_REQUIRED',
   situation?original:null),
  itemStatus('WORK',eligible?'CANONICAL_SHIFT_ORIGINAL_QUALIFIED':
   bound?'ORIGINAL_RECORDED_NOT_EXECUTION_QUALIFIED':'ORIGINAL_ADMISSION_REQUIRED',
   eligible?original:null),
  // A shift warrant is not the exact, one-use owner approval for a business
  // effect. The preflight never grants publication, sending or purchasing.
  itemStatus('AUTHORITY',warrant?
   'BUSINESS_WARRANT_PRESENT_ITEMIZED_EFFECT_APPROVAL_REQUIRED':
   'EXACT_BUSINESS_WARRANT_AND_ITEMIZED_APPROVAL_REQUIRED',warrant?original:null),
  itemStatus('EXECUTION',final?
   'INDEPENDENT_FINAL_RECEIPT_READBACK_ONLY':
   'EXECUTOR_CLAIM_AND_EFFECT_EVIDENCE_NOT_PROVEN',final?original:null),
  itemStatus('VERIFICATION',final?'INDEPENDENT_FINAL_RECEIPT_VERIFIED':
   'INDEPENDENT_ORIGINAL_ACCEPTANCE_REQUIRED',final?original:null),
  itemStatus('OUTCOME',final&&situation&&warrant?
   'INDEPENDENT_ORIGINAL_OUTCOME_RECORDED':
   'CANONICAL_ORIGINAL_OUTCOME_NOT_PROVEN',
   final&&situation&&warrant?original:null),
  itemStatus('LEARNING','VERIFIED_LEARNING_RECEIPT_NOT_PROVEN'),
  itemStatus('CAPABILITY','VERIFIED_CAPABILITY_ADOPTION_NOT_PROVEN')
 ];
 if(stages.length!==CANONICAL_ORIGINAL_STAGES.length||
   stages.some((x,i)=>x.stage!==CANONICAL_ORIGINAL_STAGES[i]))
  throw Error('CANONICAL_ORIGINAL_SPINE_ORDER_DRIFT');
 let next;
 if(final)next='INDEPENDENT_UNIVERSE_OUTCOME_AND_LEARNING_RECONCILIATION';
 else if(!current)next='REFRESH_SIGNED_SOURCE_AND_REQUALIFY';
 else if(!bound)next='EXACT_OWNER_ORIGINAL_ADMISSION_REQUIRED';
 else if(!eligible)next=item.acceptance_gate;
 else next='VERIFY_INSTALLED_EXECUTOR_AND_EXACT_ITEMIZED_EFFECT_APPROVAL';
 return Object.freeze({
  continuity_ref:identity,source_ref:item.source_ref,
  original_work_id:original,acceptance_gate:item.acceptance_gate,
  canonical_spine:stages,original_final_receipt_observed:final,
  next_governed_action:next,
  ...noEffects
 });
}
export function projectMultiOriginalCanonicalSpine(preflight){
 if(!Array.isArray(preflight?.prioritized_source_preflight)||
   preflight.prioritized_source_preflight.length>20)
  throw Error('CANONICAL_ORIGINAL_SPINE_PREFLIGHT_ITEMS_INVALID');
 return Object.freeze(preflight.prioritized_source_preflight.map(
  item=>projectOriginalAgainstCanonicalSpine(preflight,item)
 ));
}
