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
 contractProposal,existingCiRoute,signedRecovery,budgetState,technicalCiObservation,
 originalLineageEvidence,technicalCiAttachment
}={}){
 const c=contractProposal?.contract_candidate;
 const t=contractProposal?.terminal_requalification;
 if(contractProposal?.status==='RECOVERY_EXISTING_TERMINAL_BUILDER_REQUALIFICATION_REQUIRED'&&
  contractProposal.read_only===true&&contractProposal.contract_candidate===null&&
  contractProposal.previous_attempt_budget_preserved===true&&
  contractProposal.repeat_prior_ci_dispatch_permitted===false&&
  WORK.test(t?.obligation_id||'')&&URL.test(t?.source_ref||'')&&
  HASH.test(t?.qualifier_receipt_sha256||'')&&
  t.next_qualified_action==='QUALIFY_DISTINCT_RECOVERY_EVIDENCE_AND_EXACT_BUDGET_NO_REPLAY'&&
  signedRecovery?.status===contractProposal.status&&
  signedRecovery.obligation_id===t.obligation_id&&signedRecovery.source_ref===t.source_ref&&
  signedRecovery.owner_id===t.owner_id&&signedRecovery.shift_id===t.shift_id&&
  signedRecovery.qualifier_receipt_sha256===t.qualifier_receipt_sha256&&
  signedRecovery.strategy_executed===false&&signedRecovery.contract_frozen===false&&
  signedRecovery.original_job_completed===false&&signedRecovery.installation_authorized===false&&
  signedRecovery.production_changed===false)
  return out('RECOVERY_DISTINCT_EVIDENCE_REQUALIFICATION_DUE',{
   ...t,liveness:'RECOVERABLE_UNFINISHED',next_actor:'REALITY',
   original_obligation_open:true,resume_same_obligation:true,
   previous_attempt_budget_preserved:true,repeat_prior_ci_dispatch_permitted:false,
   capability_execution_ready:false,new_attempt_authorized:false,
   next_governed_action:t.next_qualified_action});
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
 // The current durable contract takes precedence over a stale RED
 // acquisition recommendation. It never grants an execution effect.
 if(signedRecovery?.contract_id===c.contract_id&&
  signedRecovery.contract_frozen===true&&signedRecovery.strategy_executed===false&&
  signedRecovery.original_job_completed===false&&
  signedRecovery.production_changed===false&&
  signedRecovery.installation_authorized===false){
  if(['RECOVERY_DURABLE_STRATEGY_OUTCOME_UNCERTAIN_NO_REPLAY',
      'RECOVERY_DURABLE_ATTEMPT_LEDGER_UNVERIFIED',
      'RECOVERY_INDEPENDENT_PROOF_DELTA_UNVERIFIED',
      'RECOVERY_PROOF_SEQUENCE_UNVERIFIED','RECOVERY_FAILED_STRATEGY_LEDGER_UNVERIFIED',
      'RECOVERY_BUDGET_LEDGER_UNVERIFIED'].includes(signedRecovery.status))
   return out('RECOVERY_DURABLE_LEDGER_RECONCILIATION_DUE',{
    ...base,liveness:'RECONCILIATION_DUE',next_actor:'REALITY',
    repeat_prior_ci_dispatch_permitted:false,
    next_governed_action:signedRecovery.status==='RECOVERY_DURABLE_STRATEGY_OUTCOME_UNCERTAIN_NO_REPLAY'?
     'RECONCILE_EXISTING_SIGNED_STRATEGY_OUTCOME':'RECONCILE_SIGNED_RECOVERY_LEDGER'
   });
  if(signedRecovery.status==='RECOVERY_DURABLE_NEXT_PROOF_REQUIRES_EXACT_SIGNED_HANDLER'&&
   ['REPAIR_ISOLATED','GREEN','REGRESSION','CONTINUATION'].includes(signedRecovery.next_required_proof))
   return out('RECOVERY_DURABLE_NEXT_PROOF_HANDLER_DUE',{
    ...base,liveness:'RECOVERABLE_UNFINISHED',next_actor:'REALITY',
    next_required_proof:signedRecovery.next_required_proof,
    repeat_prior_ci_dispatch_permitted:false,capability_execution_ready:false,
    next_governed_action:'QUALIFY_EXACT_REGISTERED_HANDLER_AND_WARRANT_FOR_NEXT_PROOF'
   });
  if(signedRecovery.status==='RECOVERY_PROOF_CHAIN_INDEPENDENTLY_RECEIPTED'&&
   signedRecovery.verified_proof_count===5)
   return out('RECOVERY_DURABLE_PROOF_CHAIN_RETURN_DUE',{
    ...base,liveness:'RECOVERABLE_UNFINISHED',next_actor:'REALITY',
    repeat_prior_ci_dispatch_permitted:false,
    next_governed_action:'RECONCILE_CANONICAL_ORIGINAL_SETTLEMENT_AND_UNIVERSE'
   });
 }
 if(!exact(c,existingCiRoute))
  return out('RECOVERY_EXISTING_CI_IDENTITY_UNVERIFIED',{
   ...base,liveness:'RECHECK_DUE',
   next_actor:'REALITY',next_governed_action:
    'RECONCILE_EXISTING_SIGNED_MAINTENANCE_SOURCE_AND_WARRANT'});
 const s=existingCiRoute.status;
 // Independently re-read GitHub's exact branch/commit, frozen test job and
 // immutable artifact against this SAME original. Technical RED/GREEN is
 // progress on recovery engineering, never admission of customer work.
 const technicalProofCurrent=technicalCiObservation?.status===
    'RECOVERY_TECHNICAL_CI_PROVIDER_ATTESTED_BUSINESS_PROOF_PENDING'&&
    technicalCiObservation.contract_id===c.contract_id&&
    technicalCiObservation.source_revision===c.source_revision&&
    technicalCiObservation.obligation_id===c.obligation_id&&
    technicalCiObservation.source_ref===c.source_ref&&
    technicalCiObservation.shift_id===c.shift_id&&
    technicalCiObservation.owner_id===c.owner_id&&
    technicalCiObservation.independent_technical_ci_verified===true&&
    technicalCiObservation.frozen_technical_red_verified===true&&
    technicalCiObservation.original_business_case_red_verified===false&&
    technicalCiObservation.business_original_warrant_verified===false&&
    technicalCiObservation.original_job_completed===false&&
    technicalCiObservation.execution_authorized===false&&
    technicalCiObservation.production_changed===false&&
    Number.isSafeInteger(technicalCiObservation.github_run_id)&&technicalCiObservation.github_run_id>0&&
    HASH.test(technicalCiObservation.github_artifact_digest||'');
 if(technicalProofCurrent){
  const attached=technicalCiAttachment;
  const durable=['RECOVERY_TECH_CI_OBSERVATION_DURABLY_RECONCILED',
    'RECOVERY_TECH_CI_DURABLE_OBSERVATION_ALREADY_RECONCILED'].includes(attached?.status)&&
    attached.technical_observation_recorded===true&&
    attached.contract_id===c.contract_id&&attached.obligation_id===c.obligation_id&&
    attached.source_ref===c.source_ref&&attached.owner_id===c.owner_id&&
    attached.shift_id===c.shift_id&&
    attached.github_run_id===technicalCiObservation.github_run_id&&
    attached.github_artifact_digest===technicalCiObservation.github_artifact_digest&&
    HASH.test(attached.observation_receipt_sha256||'')&&
    attached.original_business_red_verified===false&&attached.original_job_completed===false&&
    attached.execution_authorized===false&&attached.production_changed===false;
  return out('RECOVERY_TECHNICAL_PROOF_OBSERVED_BUSINESS_LINEAGE_STILL_DUE',{
   ...base,liveness:'RECOVERABLE_UNFINISHED',next_actor:'REALITY',
   technical_provider_run_id:technicalCiObservation.github_run_id,
   technical_ci_digest:technicalCiObservation.github_artifact_digest,
   technical_ci_verified:true,
   technical_ci_durable_attachment_verified:durable,
   technical_ci_observation_receipt_sha256:durable?attached.observation_receipt_sha256:null,
   repeat_prior_ci_dispatch_permitted:false,
   business_original_red_verified:false,
   next_governed_action:
    durable?'INDEPENDENTLY_QUALIFY_BUSINESS_ORIGINAL_AND_CASE_SPECIFIC_RED':
     'RECONCILE_EXISTING_TECHNICAL_CI_WITH_SIGNED_CONTINUITY',
   next_recovery_action:'INDEPENDENTLY_QUALIFY_BUSINESS_ORIGINAL_AND_CASE_SPECIFIC_RED'
  });
 }
 // The signed lineage reader has already resolved the original identity.
 // Do not treat that verified observation as a business warrant, or request
 // another case-construction cycle while this exact admission gap is open.
 if(['SIGNED_ORIGINAL_LINEAGE_EXISTING_EVIDENCE_INDEPENDENTLY_READ',
     'SIGNED_ORIGINAL_LINEAGE_EVIDENCE_STAGED_INDEPENDENTLY_READ'].includes(
      originalLineageEvidence?.status)&&
    originalLineageEvidence.source_reconciled===true&&
    originalLineageEvidence.owner_id===c.owner_id&&
    originalLineageEvidence.shift_id===c.shift_id&&
    originalLineageEvidence.original_work_id===c.obligation_id&&
    originalLineageEvidence.source_ref===c.source_ref&&
    originalLineageEvidence.continuity_root_id===c.continuity_root_id&&
    originalLineageEvidence.maintenance_id===existingCiRoute.maintenance_id&&
    HASH.test(originalLineageEvidence.evidence_sha256||'')&&
    originalLineageEvidence.continuity_fact==='CURRENT_ORIGINAL_REMAINS_UNFINISHED'&&
    originalLineageEvidence.customer_original_verified===false&&
    originalLineageEvidence.original_claim_admitted===false&&
    originalLineageEvidence.original_job_completed===false&&
    originalLineageEvidence.installation_authorized===false&&
    originalLineageEvidence.production_changed===false&&
    originalLineageEvidence.independent_review_required===true&&
    originalLineageEvidence.next_action==='VERIFY_CANONICAL_OWNER_BUSINESS_WORK_LINEAGE_BEFORE_CI')
  return out('RECOVERY_VERIFIED_LINEAGE_ORIGINAL_AUTHORITY_RECONCILIATION_DUE',{
   ...base,liveness:'RECOVERABLE_UNFINISHED',next_actor:'REALITY',
   original_lineage_evidence_sha256:originalLineageEvidence.evidence_sha256,
   original_lineage_packet_id:originalLineageEvidence.packet_id,
   original_lineage_verified:true,business_original_warrant_verified:false,
   repeat_prior_ci_dispatch_permitted:false,
   next_governed_action:'VERIFY_EXISTING_ORIGINAL_WARRANT_NO_SILENT_SCOPE_EXPANSION',
   next_recovery_action:'QUALIFY_DISTINCT_FROZEN_CASE_SPEC_AND_RED_TEST_FROM_EXISTING_DIAGNOSTIC'
  });
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
