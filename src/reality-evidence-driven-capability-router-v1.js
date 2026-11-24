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

// Single owner-scoped temporal read model: past receipts, present state, future
// obligations. This is not a new ledger and never grants execution authority.
export function projectSignedOperationalTimeHorizon({health,ownerId,shiftId}={}){
 if(!rightOwner(health,ownerId,shiftId)||
    health.operational_temporal_coverage!=='BOUNDED_CURRENT_SIGNED_MAINTENANCE_SOURCES'||
    !Array.isArray(health.operational_temporal_evidence)||
    health.operational_temporal_evidence.length>8)
  return bounded('OPERATIONAL_TIME_EVIDENCE_UNVERIFIED',{read_only:true,owner_id:ownerId,shift_id:shiftId});
 const allowed=new Set([health.repair_scope?.source_ref,...health.maintenance_handoffs.map(x=>x.source_ref)]);
 const seen=new Set(),items=[];
 const states=new Set([null,'CLAIMED','DRAFT','PROVIDER_UNVERIFIED','INSUFFICIENT_EVIDENCE']);
 const hash=v=>v===null||SHA.test(v||'');
 for(const e of health.operational_temporal_evidence){
  const p=e?.past,n=e?.present,f=e?.future;
  if(!safeRef(e?.source_ref)||!allowed.has(e.source_ref)||seen.has(e.source_ref)||
     !UUID.test(e.maintenance_id||'')||!p||!n||!f||
     ![p.independent_baseline_receipt_sha256,p.last_builder_receipt_sha256,p.independent_repair_receipt_sha256].every(hash)||
     !states.has(p.last_builder_outcome)||!states.has(n.builder_state)||
     p.last_builder_outcome!==n.builder_state||
     (n.recovery_state!==undefined&&(!['READY_FOR_BUILD','CLAIM_ACTIVE','FAILED_PENDING_TRIAGE','REENTRY_AUTHORIZED','CANDIDATE_READY','TERMINAL_BOUNDARY'].includes(n.recovery_state)||
       !Number.isSafeInteger(p.build_attempt_count)||p.build_attempt_count<0||p.build_attempt_count>3||
       !hash(p.last_recovery_decision_receipt_sha256)||
       (n.recovery_state==='REENTRY_AUTHORIZED'&&(!SHA.test(p.last_recovery_decision_receipt_sha256||'')||!Number.isFinite(Date.parse(n.reentry_not_before||''))))))||
     !(p.last_builder_recorded_at===null||Number.isFinite(Date.parse(p.last_builder_recorded_at)))||
     !KEY.test(n.phase||'')||!KEY.test(n.handling_state||'')||
     [n.original_job_completed,n.repair_independently_verified,n.independent_frozen_red_verified].some(v=>typeof v!=='boolean')||
     n.repair_independently_verified!==(p.independent_repair_receipt_sha256!==null)||
     (['DRAFT','PROVIDER_UNVERIFIED','INSUFFICIENT_EVIDENCE'].includes(n.builder_state)&&
       (!SHA.test(p.last_builder_receipt_sha256||'')||!Number.isFinite(Date.parse(p.last_builder_recorded_at))))||
     !KEY.test(f.next_required_action||'')||f.expected_outcome_verified!==false||
     f.execution_authorized!==false||f.installation_authorized!==false)
   return bounded('OPERATIONAL_TIME_EVIDENCE_UNVERIFIED',{read_only:true,owner_id:ownerId,shift_id:shiftId});
  // Derive from observed state, not an untrusted or stale recommendation.
  const next=n.original_job_completed?'RECONCILE_EXISTING_FINAL_RECEIPT_NO_REPLAY':
   n.repair_independently_verified?'RECONCILE_SEPARATE_ORIGINAL_JOB_ACCEPTANCE':
   n.recovery_state==='TERMINAL_BOUNDARY'?'REPORT_EXACT_EVIDENCE_OR_RESOURCE_BOUNDARY':
   n.recovery_state==='REENTRY_AUTHORIZED'?'CLAIM_EXISTING_BUILDER_WHEN_REENTRY_DUE':
   n.recovery_state==='FAILED_PENDING_TRIAGE'||['PROVIDER_UNVERIFIED','INSUFFICIENT_EVIDENCE'].includes(n.builder_state)?'INVESTIGATE_NEW_EVIDENCE_BEFORE_REENTRY':
   n.builder_state==='DRAFT'?'INDEPENDENTLY_QUALIFY_AND_RUN_INERT_FROZEN_TEST_CANDIDATE':
   n.builder_state==='CLAIMED'?'RECONCILE_ACTIVE_BUILDER_LEASE':'QUALIFY_REQUIRED_SOURCE_EVIDENCE';
  if(next!==f.next_required_action)
   return bounded('OPERATIONAL_TIME_EVIDENCE_UNVERIFIED',{read_only:true,owner_id:ownerId,shift_id:shiftId});
  seen.add(e.source_ref);
  items.push(Object.freeze({source_ref:e.source_ref,maintenance_id:e.maintenance_id,
   past:Object.freeze({independent_baseline_receipt_sha256:p.independent_baseline_receipt_sha256,
    last_builder_receipt_sha256:p.last_builder_receipt_sha256,last_builder_outcome:p.last_builder_outcome,
    last_builder_recorded_at:p.last_builder_recorded_at,independent_repair_receipt_sha256:p.independent_repair_receipt_sha256,
    ...(n.recovery_state!==undefined?{build_attempt_count:p.build_attempt_count,last_recovery_decision_receipt_sha256:p.last_recovery_decision_receipt_sha256}:{})}),
   present:Object.freeze({phase:n.phase,handling_state:n.handling_state,builder_state:n.builder_state,
    original_job_completed:n.original_job_completed,repair_independently_verified:n.repair_independently_verified,
    independent_frozen_red_verified:n.independent_frozen_red_verified,
    ...(n.recovery_state!==undefined?{recovery_state:n.recovery_state,reentry_not_before:n.reentry_not_before||null,
      recovery_error_class:['PROVIDER_READY','AUTH_OR_SECRET_MISSING','QUOTA_EXHAUSTED','RATE_LIMIT','TRANSIENT_INFRA','MODEL_CONFIG_OR_SCHEMA','UNKNOWN_PROVIDER_OUTCOME','SPEC_OR_TEST_FAILURE'].includes(n.recovery_error_class)?n.recovery_error_class:null}:{})}),
   future:Object.freeze({next_required_action:next,expected_outcome_verified:false,execution_authorized:false,installation_authorized:false})}));
 }
 return bounded('OPERATIONAL_TIME_EVIDENCE_PROJECTED',{owner_id:ownerId,shift_id:shiftId,read_only:true,
  checked_at:health.checked_at||null,coverage:health.operational_temporal_coverage,items:Object.freeze(items),
  expected_outcomes_are_not_verified_facts:true});
}

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
 const temporal=projectSignedOperationalTimeHorizon({health,ownerId,shiftId});
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
  const t=temporal.items?.find(x=>x.source_ref===sourceRef);
  const pendingRecovery=!ownerRequired&&t?.future.next_required_action==='INVESTIGATE_NEW_EVIDENCE_BEFORE_REENTRY';
  const boundary=!ownerRequired&&t?.future.next_required_action==='REPORT_EXACT_EVIDENCE_OR_RESOURCE_BOUNDARY';
  const reentry=!ownerRequired&&t?.future.next_required_action==='CLAIM_EXISTING_BUILDER_WHEN_REENTRY_DUE';
  const next=pendingRecovery||boundary||reentry?t.future.next_required_action:action;
  pending.push(Object.freeze({
   source_ref:sourceRef,capability_key:next,next_action:next,
   ...(pendingRecovery?{prior_required_capability:action,blocked_attempt_receipt_sha256:t.past.last_builder_receipt_sha256}:{}),
   authority_basis:authority,evidence_state:proof,origin,
   execution_route:ownerRequired?'OWNER_CLICK_REQUIRED':
    pendingRecovery?'RECOVERY_INVESTIGATION_REQUIRED':
    boundary?'EXPLICIT_RECOVERY_BOUNDARY':
    reentry?'GOVERNED_REENTRY_SCHEDULED':
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
  recovery_investigation_count:pending.filter(x=>x.execution_route==='RECOVERY_INVESTIGATION_REQUIRED').length,
  recovery_boundary_count:pending.filter(x=>x.execution_route==='EXPLICIT_RECOVERY_BOUNDARY').length,
  recovery_reentry_count:pending.filter(x=>x.execution_route==='GOVERNED_REENTRY_SCHEDULED').length,
  operational_time_horizon:temporal,
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
