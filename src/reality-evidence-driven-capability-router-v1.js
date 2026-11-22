// Reality's job-agnostic transition router.
// The ledger chooses the next required capability. Code registers *types* of
// safe executors, never PR numbers, customers, issue IDs or guessed outcomes.
// A registry slot does not grant authority: the selected executor must still
// independently claim and verify its exact signed service-role warrant.
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const KEY=/^[A-Z][A-Z0-9_]{3,110}$/;
const SHA=/^sha256:[a-f0-9]{64}$/;
const URL=/^https:\/\/[a-z0-9.-]+(?:\/[a-zA-Z0-9._~!$&'()*+,;=:@%/?#-]*)?$/i;
const stop=code=>{throw Error('GOVERNED_CAPABILITY_ROUTER_'+code)};
const bounded=(status,other={})=>Object.freeze({
 status,...other,executor_invoked:false,receipt_verified:false,
 external_effect_performed:false,repair_executed:false,
 installation_authorized:false,original_job_completed:false,
 production_changed:false,new_shift_started:false
});
const safeRef=v=>typeof v==='string'&&v.length<=500&&URL.test(v)&&
 !v.includes('@')&&!v.includes('..')&&!v.includes('#')&&
 !v.includes('?');
const rightOwner=(h,ownerId,shiftId)=>h&&
 h.status==='SIGNED_OWNER_SHIFT_HANDOFF_HEALTH_READ_ONLY'&&
 h.owner_id===ownerId&&h.shift_id===shiftId&&
 h.read_only===true&&h.installation_authorized===false&&
 h.original_job_completed===false&&h.production_changed===false&&
 h.new_shift_started===false&&
 Array.isArray(h.maintenance_handoffs)&&h.maintenance_handoffs.length<=8&&
 Number.isSafeInteger(h.original_claim_count)&&
 Number.isSafeInteger(h.original_independent_final_receipt_count);

// This is a single common obligation evaluator for an arbitrary collection of
// verified work. It reads the DB's next-action receipt rather than assigning a
// procedural chain based on an issue number, source domain or work title.
export function planGovernedCapabilitiesFromOwnerReceipts({
 health,ownerId,shiftId,registeredActionKeys=[]
}={}){
 if(!UUID.test(ownerId||'')||!UUID.test(shiftId||'')||
    !rightOwner(health,ownerId,shiftId)||
    !Array.isArray(registeredActionKeys)||registeredActionKeys.length>32||
    registeredActionKeys.some(x=>!KEY.test(x)))
  stop('SIGNED_OWNER_WORK_LEDGER_REQUIRED');
 const registered=new Set(registeredActionKeys);
 const pending=[];
 function add({sourceRef,action,authority,proof,origin}){
  if(!safeRef(sourceRef)||!KEY.test(action||'')||
     !['APPROVED_EXACT_SOURCE_SCOPE','SIGNED_EXISTING_WARRANT',
       'NO_ADDITIONAL_AUTHORITY'].includes(authority)||
     !['SOURCE_RECHECKED','MISSING_INDEPENDENT_FROZEN_PROOF',
       'INDEPENDENT_REPAIR_VERIFIED','OWNER_AUTHORITY_PENDING',
       'MISSING_ORIGINAL_JOB'].includes(proof))return;
  // No duplicate action for the same exact source; only truthful pending
  // obligation. Do not auto-run approved-scope work through a maintenance
  // warrant adapter.
  if(pending.some(p=>p.source_ref===sourceRef&&p.next_action===action))return;
  const ownerRequired=proof==='OWNER_AUTHORITY_PENDING';
  pending.push(Object.freeze({
   source_ref:sourceRef,capability_key:action,next_action:action,
   authority_basis:authority,evidence_state:proof,origin,
   execution_route:ownerRequired?'OWNER_CLICK_REQUIRED':
    registered.has(action)?'REGISTERED_CAPABILITY_AVAILABLE':
     'REGISTERED_CAPABILITY_MISSING',
   next_actor:ownerRequired?'OWNER':'REALITY',
   installation_authorized:false,original_job_completed:false,
   production_changed:false,new_shift_started:false
  }));
 }
 const scope=health.repair_scope;
 if(scope&&safeRef(scope.source_ref)&&
   ['PREPARED','APPROVED','SOURCE_RECHECKED'].includes(scope.state)&&
   KEY.test(scope.next_action||'')){
  const approved=scope.state!=='PREPARED'&&
   scope.work_scope_approved===true&&
   SHA.test(scope.owner_approval_receipt||'');
  const safePhase=scope.state==='PREPARED'?true:approved;
  if(safePhase&&scope.independent_frozen_ci_after_approval_verified===false){
   add({sourceRef:scope.source_ref,action:scope.next_action,
    authority:approved?'APPROVED_EXACT_SOURCE_SCOPE':'NO_ADDITIONAL_AUTHORITY',
    proof:scope.state==='PREPARED'?'OWNER_AUTHORITY_PENDING':
     scope.state==='APPROVED'?'SOURCE_RECHECKED':
     'MISSING_INDEPENDENT_FROZEN_PROOF',
    origin:'EXACT_OWNER_SCOPE_LEDGER'});
  }
 }
 for(const m of health.maintenance_handoffs){
  if(!safeRef(m?.source_ref)||!KEY.test(m?.next_action||''))continue;
  if(m.status==='REPAIR_INDEPENDENTLY_VERIFIED_PREVIEW_ONLY'&&
     typeof m.independent_install_verified_at==='string'){
   // Post-install original settlement is *not* executable without a
   // separately admitted original work identity and its own final warrant.
   if(health.original_claim_count===0)continue;
   add({sourceRef:m.source_ref,action:m.next_action,
    authority:'NO_ADDITIONAL_AUTHORITY',
    proof:'INDEPENDENT_REPAIR_VERIFIED',origin:'SIGNED_MAINTENANCE_LEDGER'});
  }else if(m.status===
    'REPAIR_NEEDS_CASE_SPECIFIC_FROZEN_CI_OR_SOURCE_REQUALIFICATION'){
   add({sourceRef:m.source_ref,action:m.next_action,
    authority:'SIGNED_EXISTING_WARRANT',
    proof:'MISSING_INDEPENDENT_FROZEN_PROOF',
    origin:'SIGNED_MAINTENANCE_LEDGER'});
  }
 }
 return bounded('GOVERNED_SOURCE_RECEIPT_CAPABILITY_PLAN',{
  owner_id:ownerId,shift_id:shiftId,
  registered_capability_count:registered.size,
  candidate_count:pending.length,
  executable_registered_count:pending.filter(x=>
   x.execution_route==='REGISTERED_CAPABILITY_AVAILABLE').length,
  missing_capability_count:pending.filter(x=>
   x.execution_route==='REGISTERED_CAPABILITY_MISSING').length,
  owner_decision_count:pending.filter(x=>
   x.execution_route==='OWNER_CLICK_REQUIRED').length,
  source_actions:Object.freeze(pending),read_only:true
 });
}

// The *only* dispatch point. The caller supplies a trusted registered
// capability handler. No dynamic imports, eval, arbitrary endpoint or
// model-generated handler. A receipt with missing authority cannot execute.
// The handler must independently verify its own DB warrant on this wake.
export async function invokeOneRegisteredSignedCapability({
 wake,graph,action,authorityBasis,handler,env=process.env
}={}){
 if(env.VERCEL_ENV!=='preview'||!UUID.test(graph?.owner_id||'')||
    !UUID.test(graph?.shift_id||'')||
    graph.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||
    graph.installation_authorized!==false||
    graph.production_changed!==false||
    wake?.status!=='SHIFT_WORKER_PULSE_DURABLY_RECORDED'||
    wake.shift_id!==graph.shift_id||
    !KEY.test(action||'')||
    authorityBasis!=='SIGNED_EXISTING_WARRANT')
  return bounded('REGISTERED_CAPABILITY_SIGNED_AUTHORITY_NOT_VERIFIED',{
   requested_capability:KEY.test(action||'')?action:null
  });
 if(typeof handler!=='function')
  return bounded('REGISTERED_CAPABILITY_EXECUTOR_NOT_CONNECTED',{
   requested_capability:action,
   next_actor:'REALITY',
   next_action:'REGISTER_AND_INDEPENDENTLY_TEST_CAPABILITY_ADAPTER'
  });
 let result;
 try{result=await handler();}catch{
  return bounded('REGISTERED_CAPABILITY_HANDLER_FAILED_SOURCE_RECHECK_REQUIRED',{
   requested_capability:action,next_actor:'REALITY',
   next_action:'INVESTIGATE_REGISTERED_CAPABILITY_PROVIDER_FAILURE'
  });
 }
 if(!result||typeof result!=='object'||typeof result.status!=='string'||
    result.installation_authorized!==false||
    result.original_job_completed!==false||
    result.production_changed!==false||
    result.repair_executed!==false||
    result.new_shift_started===true)
  return bounded('REGISTERED_CAPABILITY_EXECUTION_RECEIPT_UNVERIFIED',{
   requested_capability:action,next_actor:'REALITY',
   next_action:'INDEPENDENTLY_RECONCILE_REGISTERED_EXECUTOR_OUTCOME'
  });
 // Preserve the native registered executor's real result and verification
 // flags; a dispatch receipt is never a frozen-CI verdict or final job.
 return Object.freeze({...result,
  router_status:'REGISTERED_CAPABILITY_HANDLER_INVOKED',
  registered_capability:action,governed_shift_id:graph.shift_id,
  original_job_completed:false,installation_authorized:false,
  production_changed:false,new_shift_started:false
 });
}


// Bridge the EXISTING Continuity categorizer into the EXISTING registered
// capability router. This only selects an evidence-bound next route; it
// cannot grant authority, claim an executor effect, or settle an original.
// Registered action types are supplied by the installed signed worker.
export function planCategorizedContinuityRecovery({
 classification,ownerId,shiftId,registeredActionKeys=[]
}={}){
 const base=Object.freeze({
  schema:'reality-categorized-continuity-registered-action-route-v1',
  owner_id:UUID.test(ownerId||'')?ownerId:null,
  shift_id:UUID.test(shiftId||'')?shiftId:null,
  read_only:true,registered_action_selection_only:true,
  action_dispatched:false,executor_invoked:false,
  repair_executed:false,independent_repair_verified:false,
  owner_approval_granted:false,installation_authorized:false,
  original_job_completed:false,production_changed:false,
  new_shift_started:false
 });
 const result=(status,items=[])=>Object.freeze({
  ...base,status,items:Object.freeze(items),count:items.length,
  ready_for_registered_handler_count:items.filter(x=>
   x.route==='REGISTERED_HANDLER_REQUIRES_SIGNED_CLAIM').length,
  missing_registered_handler_count:items.filter(x=>
   x.route==='REGISTERED_HANDLER_MISSING').length,
  provider_authority_proof_count:items.filter(x=>
   x.route==='INDEPENDENT_PROVIDER_AUTHORITY_PROOF_REQUIRED').length
 });
 if(!UUID.test(ownerId||'')||!UUID.test(shiftId||'')||
  !Array.isArray(registeredActionKeys)||registeredActionKeys.length>32||
  registeredActionKeys.some(x=>!KEY.test(x))||
  classification?.schema!=='reality-governed-continuity-recovery-handoff-v1'||
  classification.status!=='GOVERNED_RECOVERY_DURABLE_HANDOFFS_CLASSIFIED'||
  classification.owner_id!==ownerId||classification.shift_id!==shiftId||
  classification.read_only!==true||
  classification.classification_only!==true||
  classification.action_dispatched!==false||
  classification.original_job_completed!==false||
  classification.installation_authorized!==false||
  classification.production_changed!==false||
  !Array.isArray(classification.items)||
  classification.count!==classification.items.length||
  classification.items.length>8)
  return result('CONTINUITY_REGISTERED_ROUTE_INDEPENDENT_READBACK_REQUIRED');
 const registered=new Set(registeredActionKeys);
 const items=[],seen=new Set();
 for(const i of classification.items){
  if(!UUID.test(i?.incident_id||'')||i.shift_id!==shiftId||
   seen.has(i.incident_id)||
   !KEY.test(i.kind||'')||
   !KEY.test(i.incident_phase||'')||
   i.original_job_completed!==false||
   i.execution_permitted_by_classification!==false||
   i.owner_approval_granted_by_classification!==false||
   i.repair_verified_by_classification!==false)
   return result('CONTINUITY_REGISTERED_ROUTE_INCIDENT_UNVERIFIED');
  seen.add(i.incident_id);
  let route='WAIT_FOR_NEW_INDEPENDENT_EVIDENCE';
  let next='REQUIRE_INDEPENDENT_DIAGNOSIS_AND_ACTION_PROOF';
  if(i.continuity_state==='DIAGNOSIS_RECORDED_CORRECTIVE_ACTION_UNVERIFIED'&&
   SHA.test(i.investigation_receipt_sha256||'')&&
   i.governed_action_receipt_sha256==null&&
   KEY.test(i.proposed_action||'')&&KEY.test(i.blocker_class||'')){
   if(i.blocker_class==='MISSING_OWNER_AUTHORITY'||
      i.proposed_action==='REQUEST_EXACT_OWNER_APPROVAL'){
    route='INDEPENDENT_PROVIDER_AUTHORITY_PROOF_REQUIRED';
    next='VERIFY_EXACT_PROVIDER_SCOPE_THEN_REQUEST_OWNER_AUTHORITY';
   }else if(registered.has(i.proposed_action)){
    route='REGISTERED_HANDLER_REQUIRES_SIGNED_CLAIM';
    next='RECHECK_OWNER_SHIFT_WARRANT_AND_CLAIM_EXACT_INCIDENT';
   }else{
    route='REGISTERED_HANDLER_MISSING';
    next='INDEPENDENTLY_QUALIFY_AND_REGISTER_RECOVERY_ADAPTER';
   }
  }else if(i.continuity_state===
    'GOVERNED_ACTION_RECORDED_INDEPENDENT_REVIEW_PENDING'&&
    SHA.test(i.governed_action_receipt_sha256||'')){
   route='DISTINCT_INDEPENDENT_REVIEW_REQUIRED';
   next='VERIFY_REGISTERED_ACTION_EFFECT_WITH_DIFFERENT_SIGNED_WORKER';
  }else if(i.continuity_state===
    'GOVERNED_ACTION_INDEPENDENTLY_REVIEWED_ORIGINAL_UNSETTLED'&&
    SHA.test(i.independent_action_review_receipt_sha256||'')){
   route='EXACT_ORIGINAL_REENTRY_GATE_REQUIRED';
   next='RECHECK_ORIGINAL_JOB_WARRANT_AND_INDEPENDENT_ACCEPTANCE';
  }else if(i.continuity_state===
   'INCIDENT_RECOVERY_RECEIPTED_ORIGINAL_SETTLEMENT_UNVERIFIED'&&
   SHA.test(i.incident_recovery_receipt_sha256||'')){
   route='ORIGINAL_SETTLEMENT_PROOF_REQUIRED';
   next='VERIFY_ORIGINAL_INDEPENDENT_FINAL_RECEIPT_AND_UNIVERSE_RETURN';
  }
  items.push(Object.freeze({
   incident_id:i.incident_id,shift_id:shiftId,
   incident_kind:i.kind,blocker_class:i.blocker_class,
   proposed_action:KEY.test(i.proposed_action||'')?i.proposed_action:null,
   investigation_receipt_sha256:SHA.test(
    i.investigation_receipt_sha256||'')?i.investigation_receipt_sha256:null,
   route,next_governed_action:next,
   handler_registered:route==='REGISTERED_HANDLER_REQUIRES_SIGNED_CLAIM',
   execution_authorized:false,action_executed:false,
   independent_repair_verified:false,original_job_completed:false
  }));
 }
 return result('CONTINUITY_REGISTERED_ACTION_ROUTES_CLASSIFIED',items);
}
