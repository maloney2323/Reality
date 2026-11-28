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


// Select a registered capability from the independently categorized, claimed
// event, not a worker's procedural order. Selection is not execution authority;
// the existing canonical claim/transport and verifier still own every effect.
// The first migrated lane is the exact accepted read-only review. Other
// event kinds remain on their existing paths until independently qualified.
export function selectRegisteredSignedEventCapability({
 trigger,delivery,wake,graph,release,workerRunId,registeredActionKeys=[],env=process.env
}={}){
 const key=trigger?.next_action, h=trigger?.canonical_claim_handoff;
 if(env.VERCEL_ENV!=='preview'||
    env.REALITY_RELEASE_CONTROL_RUNTIME_TOPOLOGY!=='CANONICAL_BENCHMARK_PREVIEW'||
    env.REALITY_FINAL_LOOP_REVIEW_TRANSPORT_ENABLED!=='true'||
    trigger?.status!=='FINAL_LOOP_GOVERNED_TRIGGER_EXACT_REVIEW_CLAIM_ROUTE_READY'||
    trigger.review_claim_route_ready!==true||trigger.dispatch_permitted!==false||
    trigger.execution_authorized_by_trigger!==false||trigger.canonical_claim_required!==true||
    trigger.new_attempt_authorized!==false||trigger.previous_attempt_budget_preserved!==true||
    trigger.original_job_completed!==false||trigger.production_changed!==false||
    !KEY.test(key||'')||key!==env.REALITY_SIGNED_WORKER_TARGET_CAPABILITY_KEY||
    !Array.isArray(registeredActionKeys)||!registeredActionKeys.includes(key)||
    delivery?.kind!=='RESUME'||!UUID.test(delivery.event_id||'')||
    trigger.event_id!==delivery.event_id||trigger.owner_id!==delivery.owner_id||
    trigger.shift_id!==delivery.shift_id||
    graph?.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||graph.owner_id!==delivery.owner_id||
    graph.shift_id!==delivery.shift_id||graph.installation_authorized!==false||
    graph.production_changed!==false||graph.plan_fingerprint!==delivery.plan_fingerprint||
    wake?.status!=='SHIFT_WORKER_PULSE_DURABLY_RECORDED'||wake.shift_id!==graph.shift_id||
    !UUID.test(workerRunId||'')||release?.status!=='SIGNED_WORKER_RELEASE_WAKE_DURABLY_RECORDED'||
    release.worker_run_id!==workerRunId||release.shift_id!==graph.shift_id||
    release.release_sha!==delivery.release_sha||
    h?.schema!=='reality-canonical-approved-review-scope-v1'||
    h.owner_id!==graph.owner_id||h.shift_id!==graph.shift_id||
    h.parent_original_work_id!==trigger.original_work_id||h.source_ref!==trigger.source_ref||
    h.continuity_root_id!==trigger.continuity_root_id||
    h.continuity_head_sha256!==trigger.continuity_head_sha256||h.revision!==trigger.continuity_revision||
    h.effect_type!=='READ_ONLY_INTERNAL_PR_REVIEW'||h.canonical_claim_required!==true||
    h.read_only!==true||h.execution_authorized!==false||h.original_job_completed!==false||
    h.production_changed!==false)
  return null;
 return key;
}

// Keep bounded, source-independent diagnostics when a later worker projection
// fails. Never publish prompts, model content, provider error text or secrets.
export function boundedRegisteredCapabilityCheckpoint(action,result){
 const code=v=>typeof v==='string'&&/^[A-Z0-9_]{3,100}$/.test(v)?v:null;
 if(!KEY.test(action||'')||!code(result?.status)||
    result.original_job_completed!==false||result.production_changed!==false)return null;
 return Object.freeze({capability_key:action,status:code(result.status),
  provider_failure_reason:code(result.provider_failure_reason),
  continuity_blocker_code:code(result.continuity_blocker_code),
  isolated_authority_read_attempts:[0,1,2].includes(result.isolated_authority_read_attempts)?
   result.isolated_authority_read_attempts:null,
  original_job_completed:false,production_changed:false});
}


// The durable canonical event claim selects one evidence-only capability.
// These are installed capability types, not a hard-coded sequence of jobs.
// An ordinary claim selects none; conflicting evidence modes fail closed.
const evidenceModes=Object.freeze({
 ledger_return_only:Object.freeze({
  key:'RETURN_VERIFIED_INVOCATION_OBSERVATIONS_NO_REPLAY',
  releaseStage:'LEDGER_RETURN_RELEASE_ATTESTATION',
  publicationStage:'LEDGER_RETURN_RESPONSE_PUBLICATION',
  errorPrefix:'LEDGER_RETURN',
  fenceError:'LEDGER_RETURN_RUNTIME_FENCE_REJECTED',
  witnessError:'LEDGER_RETURN_RELEASE_WITNESS_UNVERIFIED',
  attestationError:'LEDGER_RETURN_ATTESTATION_UNVERIFIED'
 }),
 terminal_technical_evidence_only:Object.freeze({
  key:'READ_DISTINCT_TERMINAL_TECHNICAL_EVIDENCE_NO_REPLAY',
  releaseStage:'TERMINAL_TECHNICAL_EVIDENCE_RELEASE_ATTESTATION',
  publicationStage:'TERMINAL_TECHNICAL_EVIDENCE_RESPONSE_PUBLICATION',
  errorPrefix:'TERMINAL_TECHNICAL',
  fenceError:'TERMINAL_TECHNICAL_EVIDENCE_RUNTIME_FENCE_REJECTED',
  witnessError:'TERMINAL_TECHNICAL_EVIDENCE_WITNESS_UNVERIFIED',
  attestationError:'TERMINAL_TECHNICAL_COMPLETION_ATTESTATION_UNVERIFIED'
 }),
 independent_review_only:Object.freeze({
  key:'INDEPENDENTLY_REVIEW_VERIFIED_INVESTIGATION_NO_REPLAY',
  releaseStage:'INDEPENDENT_INVESTIGATION_REVIEW_RELEASE_ATTESTATION',
  publicationStage:'INDEPENDENT_INVESTIGATION_REVIEW_RESPONSE_PUBLICATION',
  errorPrefix:'INDEPENDENT_INVESTIGATION_REVIEW',
  fenceError:'INDEPENDENT_INVESTIGATION_REVIEW_RUNTIME_FENCE_REJECTED',
  witnessError:'INDEPENDENT_INVESTIGATION_REVIEW_RELEASE_WITNESS_UNVERIFIED',
  attestationError:'INDEPENDENT_INVESTIGATION_REVIEW_ATTESTATION_UNVERIFIED'
 }),
 investigation_only:Object.freeze({
  key:'INVESTIGATE_VERIFIED_SUSPENSION_NO_REPLAY',
  releaseStage:'VERIFIED_SUSPENSION_INVESTIGATION_RELEASE_ATTESTATION',
  publicationStage:'SUSPENSION_INVESTIGATION_RESPONSE_PUBLICATION',
  errorPrefix:'SUSPENSION_INVESTIGATION',
  fenceError:'SUSPENSION_INVESTIGATION_RUNTIME_FENCE_REJECTED',
  witnessError:'SUSPENSION_INVESTIGATION_RELEASE_WITNESS_UNVERIFIED',
  attestationError:'SUSPENSION_INVESTIGATION_ATTESTATION_UNVERIFIED'
 })
});
export function selectClaimedEvidenceCapability({receipt,delivery,workerRunId}={}){
 if(receipt?.status!=='CANONICAL_GOVERNED_WAKE_DURABLY_CLAIMED'||
    !UUID.test(workerRunId||'')||!UUID.test(delivery?.event_id||'')||
    !UUID.test(delivery?.shift_id||'')||
    receipt.event_id!==delivery.event_id||receipt.shift_id!==delivery.shift_id||
    receipt.worker_run_id!==workerRunId||receipt.execution_authorized!==false||
    receipt.original_job_completed!==false||receipt.production_changed!==false)
  throw Error('CANONICAL_GOVERNED_WAKE_NOT_DURABLY_CLAIMED');
 const modes=Object.keys(evidenceModes).filter(k=>receipt[k]===true);
 if(modes.length>1)throw Error('GOVERNED_WAKE_CONFLICTING_EVIDENCE_LANES');
 if(modes.length===0)return null;
 const mode=evidenceModes[modes[0]];
 if(delivery.kind!=='RESUME')throw Error(mode.fenceError);
 return mode;
}


// Scope the legacy engineering fan-out to its own work. An independently
// identified exact review event needs review qualification/dispatch, not
// unrelated corrective drafts, CI canaries, installation or settlement.
// This is a scheduling decision ONLY: it grants no action, retry or approval.
// All other event kinds retain the installed engineering path until their
// own durable capability selection is independently established.
export function selectEngineeringDispatchScope({
 trigger,continuity,delivery,wake,canonicalEventRuntime,strictContinuityCycle
}={}){
 const legacy='EXISTING_SIGNED_SHIFT_ENGINEERING';
 const guard=continuity?.shared_continuity_guard;
 const events=continuity?.event_resume_shadow?.ready_event_refs;
 if(canonicalEventRuntime!==true||strictContinuityCycle!==true||
    delivery?.kind!=='RESUME'||!UUID.test(delivery.event_id||'')||
    wake?.status!=='SHIFT_WORKER_PULSE_DURABLY_RECORDED'||
    wake.shift_id!==delivery.shift_id||
    trigger?.status!=='FINAL_LOOP_GOVERNED_TRIGGER_BLOCKED'||
    trigger.reason!=='CURRENT_CATEGORIZED_REVIEW_SCOPE_REQUIRED'||
    trigger.dispatch_permitted!==false||
    trigger.execution_authorized_by_trigger!==false||
    trigger.original_job_completed!==false||
    continuity?.owner_id!==delivery.owner_id||continuity.shift_id!==delivery.shift_id||
    guard?.status!=='FINAL_LOOP_SHARED_CONTINUITY_GUARD_VERIFIED_READ_ONLY'||
    guard.execution_authorized!==false||guard.original_job_completed!==false||
    !Array.isArray(events))return legacy;
 const matches=events.filter(e=>e?.event_id===delivery.event_id);
 if(matches.length!==1)return legacy;
 const event=matches[0];
 if(event.event_kind!=='QUALIFIER_PROOF_CHANGED'||
    event.next_qualified_action!=='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM'||
    event.continuity_revision!==guard.revision||
    event.continuity_head_sha256!==guard.continuity_head_sha256||
    event.executor_invoked!==false||event.execution_authorized!==false)
  return legacy;
 return 'EXACT_CLAIMED_REVIEW_CAPABILITY_ONLY';
}


// Common selection rule for independently qualified proof-change events.
// Capability names are data from Continuity, not a predetermined workflow.
// Callers still validate the current signed event, revision, and runtime;
// the selected adapter must enforce its own consequence-specific proof/claim.
export function resolveQualifiedCapabilityKey({
 event,handoff,qualifications,registeredActionKeys=[]
}={}){
 const key=event?.next_qualified_action;
 if(event?.event_kind!=='QUALIFIER_PROOF_CHANGED'||
    !KEY.test(key||'')||!UUID.test(event.event_id||'')||
    !/^work:[a-f0-9]{32}$/.test(event.original_work_id||'')||
    !safeRef(event.source_ref)||!SHA.test(event.source_receipt_sha256||'')||
    event.executor_invoked!==false||event.execution_authorized!==false||
    handoff?.continuity_identity_verified!==true||handoff.qualifier_digest_verified!==true||
    handoff.source_ref!==event.source_ref||handoff.original_work_id!==event.original_work_id||
    handoff.qualifier_receipt_sha256!==event.source_receipt_sha256||
    (handoff.next_qualified_action!==undefined&&handoff.next_qualified_action!==key)||
    handoff.execution_authorized!==false||handoff.original_job_completed!==false||
    !Array.isArray(qualifications)||qualifications.length!==1||
    qualifications[0]?.source_ref!==event.source_ref||
    qualifications[0].original_work_id!==event.original_work_id||
    qualifications[0].qualifier_receipt_sha256!==event.source_receipt_sha256||
    qualifications[0].next_qualified_action!==key)
  return null;
 return selectRegisteredCapabilityKey({key,registeredActionKeys});
}


// Common registry lookup for all verified selector inputs. The registry
// contains installed capability TYPES; this function never grants authority.
export function selectRegisteredCapabilityKey({key,registeredActionKeys=[]}={}){
 if(!KEY.test(key||'')||!Array.isArray(registeredActionKeys)||
    registeredActionKeys.length>32||registeredActionKeys.some(k=>!KEY.test(k||''))||
    new Set(registeredActionKeys).size!==registeredActionKeys.length)return null;
 return registeredActionKeys.includes(key)?key:null;
}


// Existing service-only CI candidate selectors provide the current work,
// not an instruction to run a procedural engineering chain. Both protocol
// versions are one installed capability; the exact attempt is data.
export function selectCorrectiveCiCapability({wake,candidate,registeredActionKeys=[]}={}){
 const key=selectRegisteredCapabilityKey({key:'RUN_INDEPENDENT_CORRECTIVE_CI',registeredActionKeys});
 const version=candidate?.status==='EXACT_SAME_SHIFT_CORRECTIVE_DRAFT_READY_FOR_CI'?1:
  candidate?.status==='SAME_ORIGINAL_RECOVERY_CANDIDATE_READY_FOR_CI'?2:null;
 if(!key||!version||wake?.status!=='SHIFT_WORKER_PULSE_DURABLY_RECORDED'||
    !UUID.test(wake.shift_id||'')||wake.shift_id!==candidate.shift_id||
    wake.installation_authorized!==false||wake.production_changed!==false||
    !UUID.test(candidate.owner_id||'')||
    !/^work:[a-f0-9]{32}$/.test(candidate.original_work_id||'')||
    !/^[a-f0-9]{40}$/.test(candidate.source_commit_sha||'')||
    !SHA.test(candidate.proposed_sha256||'')||
    !/^resp_[A-Za-z0-9_-]{4,160}$/.test(candidate.model_response_id||'')||
    candidate.installation_authorized!==false||candidate.original_job_completed!==false||
    candidate.production_changed!==false||
    (version===2&&(!UUID.test(candidate.attempt_id||'')||
      !Number.isSafeInteger(candidate.attempt_number)||candidate.attempt_number<2||
      candidate.attempt_number>8)))return null;
 return Object.freeze({key,version,expectedScope:Object.freeze({
  owner_id:candidate.owner_id,shift_id:candidate.shift_id,
  original_work_id:candidate.original_work_id,source_commit_sha:candidate.source_commit_sha,
  proposed_sha256:candidate.proposed_sha256,model_response_id:candidate.model_response_id,
  ...(version===2?{attempt_id:candidate.attempt_id,attempt_number:candidate.attempt_number}:{})
 })});
}
