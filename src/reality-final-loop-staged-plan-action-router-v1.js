// Existing signed Final Loop: durable source plans -> classified next handler.
// This is a read model, never a substitute for an original admission, owner
// approval, one-use service-role claim, executor, or independent final receipt.
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const HASH=/^sha256:[a-f0-9]{64}$/;
const SHA=/^[a-f0-9]{40}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const PR=/^https:\/\/github\.com\/[a-z0-9_.-]+\/[a-z0-9_.-]+\/pull\/[1-9]\d*$/i;
const base=Object.freeze({
 schema:'reality-final-loop-staged-plan-action-route-v1',
 read_only:true,classification_only:true,
 action_dispatched:false,owner_approval_granted:false,
 child_originals_admitted:0,model_execution_authorized:false,
 installation_authorized:false,original_job_completed:false,
 production_changed:false,new_shift_started:false
});
const result=(status,routes=[])=>Object.freeze({
 ...base,status,routes:Object.freeze(routes),
 prepared_owner_packet_candidate_count:routes.filter(x=>
  x.next_registered_handler==='PREPARE_FINAL_LOOP_CHILD_OWNER_PACKET').length,
 parent_admission_required_count:routes.filter(x=>
  x.next_governed_action==='QUALIFY_AND_ADMIT_EXACT_PARENT_ORIGINAL').length
});
export function classifySignedFinalLoopStagedPlanActions({
 graph,staged,preflight
}={}){
 if(graph?.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||
  !UUID.test(graph.owner_id||'')||!UUID.test(graph.shift_id||'')||
  !HASH.test(graph.plan_fingerprint||'')||
  graph.installation_authorized!==false||
  graph.production_changed!==false||
  !Array.isArray(graph.jobs)||
  staged?.schema!=='reality-final-loop-pr-source-plans-readback-v1'||
  staged.status!=='FINAL_LOOP_PROPOSED_SOURCE_PLANS_NOT_EXECUTABLE'||
  staged.owner_id!==graph.owner_id||staged.shift_id!==graph.shift_id||
  staged.plan_fingerprint!==graph.plan_fingerprint||
  staged.read_only!==true||staged.execution_authorized!==false||
  staged.original_job_completed!==false||
  staged.child_originals_admitted!==0||
  !Array.isArray(staged.plans)||staged.plans.length<1||
  staged.plans.length>10)
  return result('FINAL_LOOP_SIGNED_STAGED_SOURCE_PROOF_UNVERIFIED');
 if(preflight?.status!=='FINAL_LOOP_CHILD_GOAL_ACCEPTANCE_PREFLIGHT_READ_ONLY'||
  preflight.owner_id!==graph.owner_id||
  preflight.shift_id!==graph.shift_id||
  preflight.plan_fingerprint!==graph.plan_fingerprint||
  preflight.read_only!==true||preflight.execution_authorized!==false||
  preflight.original_job_completed!==false||
  !Array.isArray(preflight.plans)||preflight.plans.length>10)
  return result('FINAL_LOOP_STAGED_APPROVAL_PREFLIGHT_UNVERIFIED');
 const usedPlans=new Set(),usedSources=new Set(),matched=new Set();
 const routes=[];
 for(const plan of staged.plans){
  if(!UUID.test(plan?.plan_id||'')||
    usedPlans.has(plan.plan_id)||usedSources.has(plan.source_ref)||
    !PR.test(plan.source_ref||'')||
    !SHA.test(plan.source_head_sha||'')||
    !HASH.test(plan.source_manifest_sha256||'')||
    plan.state!=='PROPOSED_SOURCE_PLAN_AWAITING_INDEPENDENT_ADMISSION'||
    !Number.isSafeInteger(plan.file_count)||plan.file_count<9||
    plan.file_count>500||
    !Number.isSafeInteger(plan.proposed_scope_count)||
    plan.proposed_scope_count<2||plan.proposed_scope_count>63||
    plan.child_originals_admitted!==0||
    plan.owner_acceptance_verified!==false||
    plan.independent_source_review_verified!==false||
    !['BLOCKED','NOT_ADMITTED'].includes(plan.parent_source_phase)||
    (plan.parent_source_phase==='BLOCKED'?
     !WORK.test(plan.parent_original_work_id||''):
     plan.parent_original_work_id!==null))
   return result('FINAL_LOOP_STAGED_SOURCE_IDENTITY_OR_PHASE_DRIFT');
  const found=graph.jobs.filter(j=>j.source_ref===plan.source_ref&&
   j.phase===plan.parent_source_phase&&
   (j.original_work_id??null)===plan.parent_original_work_id&&
   j.original_kind==='REAL_PR_REVIEW_ORIGINAL'&&
   j.independent_source_proof_verified===true);
  if(found.length!==1)
   return result('FINAL_LOOP_STAGED_PARENT_ORIGINAL_GRAPH_MISMATCH');
  usedPlans.add(plan.plan_id);usedSources.add(plan.source_ref);
  const matching=preflight.plans.filter(p=>p.plan_id===plan.plan_id);
  if(matching.length>1)
   return result('FINAL_LOOP_STAGED_GOAL_PREFLIGHT_DUPLICATED');
  const p=matching[0];
  if(p){
   if(plan.parent_source_phase!=='BLOCKED'||
    p.source_ref!==plan.source_ref||
    p.parent_original_work_id!==plan.parent_original_work_id||
    p.source_manifest_sha256!==plan.source_manifest_sha256||
    !HASH.test(p.acceptance_contract_sha256||'')||
    p.verified_signed_source_goal_contract_prepared!==true||
    p.owner_goal_acceptance_pending!==true||
    p.independent_goal_acceptance_verified!==false||
    p.pending_exact_owner_approval!==true||
    p.child_review_automatically_authorized!==false)
    return result('FINAL_LOOP_STAGED_GOAL_CONTRACT_OR_SOURCE_DRIFT');
   matched.add(p.plan_id);
  }
  const next=plan.parent_source_phase==='NOT_ADMITTED'?
   'QUALIFY_AND_ADMIT_EXACT_PARENT_ORIGINAL':
   p?'PREPARE_EXACT_SOURCE_BOUND_OWNER_APPROVAL_PACKET':
    'PREPARE_VERIFIED_PARENT_GOAL_ACCEPTANCE_CONTRACT';
  routes.push(Object.freeze({
   plan_id:plan.plan_id,source_ref:plan.source_ref,
   parent_original_work_id:plan.parent_original_work_id,
   source_manifest_sha256:plan.source_manifest_sha256,
   source_head_sha:plan.source_head_sha,
   parent_source_phase:plan.parent_source_phase,
   proposed_scope_count:plan.proposed_scope_count,
   acceptance_contract_sha256:p?.acceptance_contract_sha256??null,
   next_governed_action:next,
   next_registered_handler:p?
    'PREPARE_FINAL_LOOP_CHILD_OWNER_PACKET':null,
   handler_requires_isolated_service_claim:Boolean(p),
   source_plan_only:true,owner_action_required:Boolean(p),
   handler_dispatched:false,owner_approval_granted:false,
   child_execution_authorized:false,original_job_completed:false
  }));
 }
 if(matched.size!==preflight.plans.length)
  return result('FINAL_LOOP_STAGED_PREFLIGHT_REFERENCES_UNMATCHED_SOURCE');
 return result('FINAL_LOOP_STAGED_PLANS_VERIFIED_AND_NEXT_HANDLERS_CLASSIFIED',routes);
}


// Join the independently reviewed Continuity recovery with the SAME frozen
// shift's qualified source-plan routes. This is a read model in the existing
// Final Loop Engine, not another orchestrator, approval or owner-job warrant.
// Importantly, an incident without a source claim proves a same-shift candidate,
// NOT that the incident was caused by that particular PR.
export function reconcileReviewedRecoveryToFinalLoopSource({
 graph,stagedActions,continuityClassification,registeredRouting
}={}){
 const base={
  schema:'reality-final-loop-reviewed-recovery-continuation-v1',
  read_only:true,classification_only:true,action_dispatched:false,
  owner_approval_granted:false,execution_authorized:false,
  recovery_verified:false,original_job_completed:false,
  production_changed:false,continuity_ledger_mutated:false
 };
 const result=(status,fields={})=>Object.freeze({...base,status,...fields});
 if(graph?.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||
  !UUID.test(graph.owner_id||'')||!UUID.test(graph.shift_id||'')||
  !HASH.test(graph.plan_fingerprint||'')||
  graph.installation_authorized!==false||
  graph.production_changed!==false||!Array.isArray(graph.jobs)||
  stagedActions?.status!=='FINAL_LOOP_STAGED_PLANS_VERIFIED_AND_NEXT_HANDLERS_CLASSIFIED'||
  stagedActions.owner_id!==undefined&&stagedActions.owner_id!==graph.owner_id||
  stagedActions.read_only!==true||
  stagedActions.action_dispatched!==false||
  !Array.isArray(stagedActions.routes)||
  continuityClassification?.schema!=='reality-governed-continuity-recovery-handoff-v1'||
  continuityClassification.status!=='GOVERNED_RECOVERY_DURABLE_HANDOFFS_CLASSIFIED'||
  continuityClassification.owner_id!==graph.owner_id||
  continuityClassification.shift_id!==graph.shift_id||
  continuityClassification.classification_only!==true||
  continuityClassification.action_dispatched!==false||
  !Array.isArray(continuityClassification.items)||
  registeredRouting?.schema!=='reality-categorized-continuity-registered-action-route-v1'||
  registeredRouting.status!=='CONTINUITY_REGISTERED_ACTION_ROUTES_CLASSIFIED'||
  registeredRouting.owner_id!==graph.owner_id||
  registeredRouting.shift_id!==graph.shift_id||
  registeredRouting.action_dispatched!==false||
  !Array.isArray(registeredRouting.items))
  return result('FINAL_LOOP_RECOVERY_AND_SOURCE_LEDGER_READBACK_MISSING');
 const independentlyReviewed=registeredRouting.items.filter(x=>
  x.route==='EXACT_ORIGINAL_REENTRY_GATE_REQUIRED'&&
  HASH.test(x.investigation_receipt_sha256||'')&&
  x.execution_authorized===false&&x.action_executed===false&&
  x.original_job_completed===false&&
  continuityClassification.items.some(i=>
   i.incident_id===x.incident_id&&
   i.shift_id===graph.shift_id&&
   i.continuity_state==='GOVERNED_ACTION_INDEPENDENTLY_REVIEWED_ORIGINAL_UNSETTLED'&&
   HASH.test(i.independent_action_review_receipt_sha256||'')&&
   i.original_job_completed===false&&
   i.execution_permitted_by_classification===false));
 if(independentlyReviewed.length===0)
  return result('FINAL_LOOP_NO_INDEPENDENTLY_REVIEWED_RECOVERY_REENTRY');
 if(independentlyReviewed.length!==1)
  return result('FINAL_LOOP_MULTIPLE_REVIEWED_RECOVERIES_REQUIRE_EXACT_LINEAGE',{
   reviewed_incident_count:independentlyReviewed.length});
 const eligible=stagedActions.routes.filter(route=>
  route.next_registered_handler==='PREPARE_FINAL_LOOP_CHILD_OWNER_PACKET'&&
  route.parent_source_phase==='BLOCKED'&&
  WORK.test(route.parent_original_work_id||'')&&
  HASH.test(route.source_manifest_sha256||'')&&
  HASH.test(route.acceptance_contract_sha256||'')&&
  graph.jobs.some(j=>j.source_ref===route.source_ref&&
   j.original_work_id===route.parent_original_work_id&&
   j.original_kind==='REAL_PR_REVIEW_ORIGINAL'&&j.phase==='BLOCKED'&&
   j.independent_source_proof_verified===true));
 if(eligible.length===0)
  return result('FINAL_LOOP_RECOVERY_REENTRY_SOURCE_OR_GOAL_NOT_QUALIFIED',{
   incident_id:independentlyReviewed[0].incident_id,
   next_governed_action:'QUALIFY_CANONICAL_ORIGINAL_SOURCE_BEFORE_OWNER_PACKET'});
 if(eligible.length!==1)
  return result('FINAL_LOOP_RECOVERY_REENTRY_SOURCE_AMBIGUOUS',{
   incident_id:independentlyReviewed[0].incident_id,
   eligible_original_count:eligible.length,
   next_governed_action:'REQUEST_EXACT_ORIGINAL_SCOPE_SELECTION'});
 const p=eligible[0];
 return result('FINAL_LOOP_REVIEWED_RECOVERY_HAS_ONE_ELIGIBLE_OWNER_PACKET_SOURCE',{
  incident_id:independentlyReviewed[0].incident_id,
  owner_id:graph.owner_id,shift_id:graph.shift_id,
  original_work_id:p.parent_original_work_id,
  source_ref:p.source_ref,plan_id:p.plan_id,
  source_manifest_sha256:p.source_manifest_sha256,
  acceptance_contract_sha256:p.acceptance_contract_sha256,
  next_registered_handler:'PREPARE_FINAL_LOOP_CHILD_OWNER_PACKET',
  // A shift-wide diagnosis may lack a source_claim_id. The independent
  // source/goal contract can justify displaying a packet, but not settle the
  // incident's causal source attribution or authorize effects.
  incident_causal_lineage_independently_verified:false,
  original_source_and_goal_verified_for_owner_proposal:true,
  next_governed_action:'PREPARE_EXACT_SOURCE_BOUND_OWNER_APPROVAL_PACKET'
 });
}

// Report a specific operational next state after the EXISTING signed worker
// attempts the registered handler. This report cannot execute or certify its
// own recovery. Only a separate original outcome verifier may settle work.
export function inspectFinalLoopRecoveryContinuation({
 candidate,operatingLane,approvalRequest,childReview,parentDelivery
}={}){
 const base={
  schema:'reality-final-loop-recovery-continuation-status-v1',
  read_only:true,owner_approval_granted:false,
  recovery_verified:false,original_job_completed:false,
  production_changed:false,continuation_settled:false
 };
 const result=(status,more={})=>Object.freeze({...base,status,...more});
 if(candidate?.status!==
    'FINAL_LOOP_REVIEWED_RECOVERY_HAS_ONE_ELIGIBLE_OWNER_PACKET_SOURCE')
  return result('FINAL_LOOP_REENTRY_REQUIRES_INDEPENDENT_SOURCE_QUALIFICATION',{
   candidate_status:candidate?.status||'NOT_READ',
   next_governed_action:candidate?.next_governed_action||
    'READ_CANONICAL_RECOVERY_AND_SOURCE_REENTRY_EVIDENCE'});
 if(operatingLane?.operating_lane!=='NORMAL_SIGNED_SHIFT'||
    operatingLane.status!==
      'FINAL_LOOP_WORKER_OWNER_PACKET_LANE_CONFIGURED_NOT_ACTIVATED')
  return result('FINAL_LOOP_REENTRY_BLOCKED_WORKER_RELEASE_OR_ISOLATION',{
   incident_id:candidate.incident_id,original_work_id:candidate.original_work_id,
   source_ref:candidate.source_ref,
   worker_lane_status:operatingLane?.status||'NOT_READ',
   next_governed_action:'VERIFY_ISOLATED_SIGNED_EXECUTION_RELEASE_AND_ENABLE_OWNER_PACKET_HANDLER'});
 const approvals=approvalRequest?.approvals;
 const matched=Array.isArray(approvals)?approvals.filter(p=>
  p.plan_id===candidate.plan_id&&p.source_ref===candidate.source_ref):[];
 if(approvalRequest?.status==='FINAL_LOOP_CHILD_APPROVAL_GATED_BY_EXACT_OWNER_ACTION'&&
    matched.length===1&&
    matched[0].status==='FINAL_LOOP_CHILD_EXACT_OWNER_APPROVAL_REQUIRED'&&
    UUID.test(matched[0].packet_id||'')&&
    HASH.test(matched[0].proposal_fingerprint||'')&&
    approvalRequest.owner_id===candidate.owner_id&&
    approvalRequest.shift_id===candidate.shift_id){
  return result('FINAL_LOOP_EXACT_OWNER_APPROVAL_PACKET_DURABLY_PREPARED',{
   incident_id:candidate.incident_id,
   original_work_id:candidate.original_work_id,
   source_ref:candidate.source_ref,packet_id:matched[0].packet_id,
   next_governed_action:'PRESENT_EXACT_OWNER_PACKET_IN_REALITY_CHAT',
   handler_dispatched:true,handler_result_verified:true,
   original_obligation_remains_open:true
  });
 }
 return result('FINAL_LOOP_REGISTERED_OWNER_PACKET_HANDLER_NOT_VERIFIED',{
  incident_id:candidate.incident_id,original_work_id:candidate.original_work_id,
  source_ref:candidate.source_ref,
  handler_status:approvalRequest?.status||'NOT_OBSERVED',
  child_status:childReview?.status||'NOT_OBSERVED',
  parent_status:parentDelivery?.status||'NOT_OBSERVED',
  next_governed_action:'VERIFY_REGISTERED_OWNER_PACKET_EFFECT_OR_EXACT_BLOCKER',
  handler_dispatched:false,handler_result_verified:false,
  original_obligation_remains_open:true
 });
}


// The signed worker re-reads the SAME canonical Continuity head after a
// registered action. A delivered packet is not an independently verified
// recovered original, and a changed head is not a final settlement receipt.
export function verifyFinalLoopRecoveryContinuityReadback({
 candidate,before,after
}={}){
 const base={
  schema:'reality-final-loop-recovery-continuity-readback-v1',
  read_only:true,original_job_completed:false,
  recovery_verified:false,independent_original_outcome_verified:false,
  owner_approval_granted:false,execution_authorized:false,
  production_changed:false
 };
 const result=(status,more={})=>Object.freeze({...base,status,...more});
 if(candidate?.status!==
  'FINAL_LOOP_REVIEWED_RECOVERY_HAS_ONE_ELIGIBLE_OWNER_PACKET_SOURCE')
  return result('FINAL_LOOP_RECOVERY_CONTINUITY_NO_QUALIFIED_ORIGINAL');
 if(before?.status!=='CANONICAL_HANDOFF_CARRIED_WITH_UNFINISHED_PROOFS'||
  before.canonical_handoff_verified!==true||
  !UUID.test(before.continuity_root_id||'')||
  !HASH.test(before.continuity_head_sha256||'')||
  !Number.isSafeInteger(before.revision)||before.revision<1)
  return result('FINAL_LOOP_RECOVERY_CONTINUITY_BASELINE_UNVERIFIED');
 if(after?.schema!=='reality-final-loop-canonical-proof-readback-v1'||
  after.status!=='FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING'||
  after.read_only!==true||after.independent_owner_scope_verified!==true||
  after.owner_id!==candidate.owner_id||
  after.shift_id!==candidate.shift_id||
  after.continuity_root_id!==before.continuity_root_id||
  after.original_job_completed!==false||
  !HASH.test(after.continuity_head_sha256||'')||
  !Number.isSafeInteger(after.revision)||after.revision<before.revision)
  return result('FINAL_LOOP_RECOVERY_CONTINUITY_INDEPENDENT_READBACK_UNVERIFIED');
 if(after.revision===before.revision&&
    after.continuity_head_sha256!==before.continuity_head_sha256)
  return result('FINAL_LOOP_RECOVERY_CONTINUITY_HEAD_CHANGED_WITHOUT_REVISION');
 if(after.revision>before.revision&&
    after.continuity_head_sha256===before.continuity_head_sha256)
  return result('FINAL_LOOP_RECOVERY_CONTINUITY_REVISION_CHANGED_WITHOUT_HEAD');
 return result(after.revision===before.revision?
  'FINAL_LOOP_RECOVERY_CONTINUITY_NO_STATE_CHANGE_ORIGINAL_OPEN':
  'FINAL_LOOP_RECOVERY_CONTINUITY_NEW_REVISION_ORIGINAL_STILL_OPEN',{
  owner_id:candidate.owner_id,shift_id:candidate.shift_id,
  original_work_id:candidate.original_work_id,
  continuity_root_id:before.continuity_root_id,
  previous_head_sha256:before.continuity_head_sha256,
  current_head_sha256:after.continuity_head_sha256,
  previous_revision:before.revision,current_revision:after.revision,
  continuity_state_changed:after.revision>before.revision,
  next_governed_action:'VERIFY_INDEPENDENT_ORIGINAL_OUTCOME_BEFORE_RECOVERY_SETTLEMENT'
 });
}
