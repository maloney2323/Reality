// One Final Loop: a blocker is a durable UNFINISHED obligation, not an
// excuse to silently stop the original shift or replay a completed diagnostic.
// This classifier never executes, installs, authorizes or settles anything.
// Signed wake + an independently registered handler + frozen CAS are required
// before the recommended machine-owned next action can be dispatched.
export const BLOCKER_LIVENESS_SCHEMA='reality-final-loop-blocker-liveness-v1';
const HASH=/^sha256:[a-f0-9]{64}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const URL=/^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/pull\/[1-9]\d*$/;
const SAFE=Object.freeze({
 schema:BLOCKER_LIVENESS_SCHEMA,read_only:true,
 original_job_completed:false,production_changed:false,
 repair_executed:false,owner_approval_granted:false,
 execution_authorized:false,capability_acquired:false,
 event_dispatched:false,continuation_verified:false,
 strategy_mutation_performed:false,manual_restart_required:false
});
const out=(status,rest={})=>Object.freeze({...SAFE,status,...rest});
const SAME='RECOVERY_REUSE_VERIFIED_CI_DIAGNOSTIC_FROZEN_CASE_SPEC_MISSING';
const NO_CAP='RECOVERY_CAPABILITY_ACQUISITION_REQUIRED';
const NEED_SPEC='RECOVERY_EXISTING_REGISTERED_CI_CASE_SPEC_PROOF_REQUIRED';
const VERIFIED='RECOVERY_EXISTING_CASE_SPECIFIC_CI_SOURCE_PROOF_NEEDS_CONTRACT_RECONCILIATION';
const BOUNDARIES=new Set([
 'RECOVERY_EXACT_MUTATION_WARRANT_REQUIRED',
 'RECOVERY_DIAGNOSTIC_WARRANT_REQUIRED',
 'RECOVERY_EXISTING_MAINTENANCE_WARRANT_READBACK_REQUIRED'
]);
const STOP=new Set([
 'RECOVERY_BUDGET_EXHAUSTED',
 'RECOVERY_PROPOSED_STRATEGY_EXCEEDS_BUDGET'
]);
const NEVER_REPEAT=new Set([SAME,NEED_SPEC,VERIFIED]);
function exact(c,r){
 return HASH.test(c?.contract_id||'')&&
  WORK.test(c?.obligation_id||'')&&URL.test(c?.source_ref||'')&&
  r?.contract_id===c.contract_id&&
  r?.obligation_id===c.obligation_id&&
  r?.source_ref===c.source_ref&&
  r?.shift_id===c.shift_id&&
  r?.owner_id===c.owner_id&&
  r.original_job_completed===false&&
  r.installation_authorized===false&&
  r.production_changed===false;
}
// All actionable statuses are based only on independently observed receipts;
// this does NOT claim an adapter exists or the work actually resumed.
export function classifyFinalLoopBlockerLiveness({
 contractProposal,existingCiRoute,signedRecovery,budgetState
}={}){
 const c=contractProposal?.contract_candidate;
 if(contractProposal?.status!==
  'RECOVERY_PROOF_CONTRACT_CANDIDATE_NEEDS_DURABLE_FREEZE'||
  contractProposal?.read_only!==true||
  c?.ledger_freeze_verified!==false||
  !HASH.test(c?.contract_id||'')||
  !WORK.test(c?.obligation_id||'')||
  !URL.test(c?.source_ref||''))
  return out('RECOVERY_SOURCE_IDENTITY_RECHECK_REQUIRED',{
   liveness:'SOURCE_PROOF_RECHECK_PENDING',
   next_actor:'REALITY',next_governed_action:
    'REQUALIFY_EXISTING_CONTINUITY_SOURCE'});
 const base={contract_id:c.contract_id,
  obligation_id:c.obligation_id,source_ref:c.source_ref,
  shift_id:c.shift_id,owner_id:c.owner_id,
  original_obligation_open:true,
  resume_same_obligation:true,
  recovery_worker_next_wake_required:true};
 // A hard budget violation cannot be circumvented by a new fingerprint,
 // changed prompt, or refreshing the scheduler. Leave the original open.
 if(STOP.has(budgetState?.status))
  return out('RECOVERY_EXPLICIT_HARD_BUDGET_BOUNDARY',{
   ...base,liveness:'PAUSED_WITH_EVIDENCE',
   next_actor:'OWNER',manual_restart_required:false,
   next_governed_action:'PREPARE_EXACT_BUDGET_REASSESSMENT_REQUEST'});
 // Never turn an unsupported owner decision into a mutation grant.
 if(BOUNDARIES.has(signedRecovery?.status))
  return out('RECOVERY_EXACT_OWNER_AUTHORITY_BOUNDARY',{
   ...base,liveness:'PAUSED_FOR_EXACT_AUTHORITY',
   next_actor:'OWNER',next_governed_action:
    'PREPARE_EXACT_WARRANT_REQUEST_WITH_CURRENT_INDEPENDENT_PROOF'});
 if(!exact(c,existingCiRoute))
  return out('RECOVERY_EXISTING_CI_IDENTITY_UNVERIFIED',{
   ...base,liveness:'RECHECK_DUE',
   next_actor:'REALITY',next_governed_action:
    'RECONCILE_EXISTING_SIGNED_MAINTENANCE_SOURCE_AND_WARRANT'});
 const s=existingCiRoute.status;
 if(s===SAME){
  if(existingCiRoute.prior_diagnostic_verified!==true||
     existingCiRoute.repeat_prior_ci_dispatch_permitted!==false||
     !HASH.test(existingCiRoute.existing_diagnostic_receipt_sha256||'')||
     existingCiRoute.case_specific_frozen_red_verified!==false)
   return out('RECOVERY_EXISTING_CI_PROOF_CONTRADICTION',{
    ...base,liveness:'RECHECK_DUE',next_actor:'REALITY',
    next_governed_action:'RECHECK_CI_DIAGNOSTIC_SOURCE_PROOF'});
  return out('RECOVERY_AUTONOMOUS_CASE_SPEC_ACQUISITION_DUE',{
   ...base,liveness:'RECOVERABLE_UNFINISHED',
   next_actor:'REALITY',
   already_verified_diagnostic_sha256:
    existingCiRoute.existing_diagnostic_receipt_sha256,
   repeat_prior_ci_dispatch_permitted:false,
   next_required_proof:'RED',
   next_required_capability:'CONSTRUCT_SIGNED_FROZEN_CASE_SPEC',
   capability_execution_ready:false,
   next_governed_action:
    'QUALIFY_AND_REGISTER_FROZEN_CASE_SPEC_CONSTRUCTION_CAPABILITY',
   next_step_bounded_by_existing_warrant:true
  });
 }
 if(s===VERIFIED){
  if(!HASH.test(existingCiRoute.frozen_test_receipt_sha256||''))
   return out('RECOVERY_FROZEN_RED_RECEIPT_UNVERIFIED',{
    ...base,liveness:'RECHECK_DUE',
    next_actor:'REALITY',next_governed_action:
     'REVERIFY_FROZEN_RED_WITH_DISTINCT_SIGNED_VERIFIER'});
  return out('RECOVERY_AUTONOMOUS_INDEPENDENT_RED_RECONCILIATION_DUE',{
   ...base,liveness:'RECOVERABLE_UNFINISHED',
   next_actor:'REALITY',next_required_proof:'RED',
   frozen_test_source_receipt_sha256:existingCiRoute.frozen_test_receipt_sha256,
   next_governed_action:
    'RECONCILE_SIGNED_RED_RECEIPT_WITH_DURABLE_RECOVERY_CONTRACT'
  });
 }
 // An ambiguous provider outcome is never evidence that the action failed
 // or that acquisition should start. Read back the signed effect first.
 if(s==='RECOVERY_COMPLETED_CI_CLAIM_INDEPENDENT_OUTCOME_UNVERIFIED')
  return out('RECOVERY_INDEPENDENT_PROVIDER_RECONCILIATION_DUE',{
   ...base,liveness:'RECONCILIATION_DUE',next_actor:'REALITY',
   repeat_prior_ci_dispatch_permitted:false,
   next_governed_action:'RECONCILE_SIGNED_CASE_CI_PROVIDER_OUTCOME_NO_REPLAY'});
 if([NO_CAP,NEED_SPEC].includes(signedRecovery?.status)){
  return out('RECOVERY_AUTONOMOUS_ACQUISITION_DUE',{
   ...base,liveness:'RECOVERABLE_UNFINISHED',next_actor:'REALITY',
   next_governed_action:
    'QUALIFY_AND_REGISTER_FROZEN_CASE_SPEC_CONSTRUCTION_CAPABILITY',
   capability_execution_ready:false,execution_authorized:false
  });
 }
 if(s==='RECOVERY_EXISTING_SIGNED_CI_RUNNER_REQUIRES_ATOMIC_CLAIM')
  return out('RECOVERY_SIGNED_EXISTING_EXECUTOR_CLAIM_DUE',{
   ...base,liveness:'RECOVERABLE_UNFINISHED',next_actor:'REALITY',
   next_governed_action:'CLAIM_EXISTING_REGISTERED_CI_UNDER_SIGNED_WARRANT',
   capability_execution_ready:false
  });
 return out('RECOVERY_UNRESOLVED_READBACK_RECONCILIATION_DUE',{
  ...base,liveness:'RECHECK_DUE',next_actor:'REALITY',
  next_governed_action:'RECHECK_CANONICAL_RECOVERY_PROOFS_ON_SAME_SHIFT'});
}
export const REPLAY_BLOCKED_COMPLETED_CI_STATUSES=Object.freeze([...NEVER_REPEAT]);
