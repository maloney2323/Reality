// Reuse Reality's EXISTING signed maintenance CI adapter and canonical warrant.
// This is a SOURCE-BOUND READ MODEL for the one Final Loop, not a new CI runner,
// installed capability, owner grant, independent test verifier, or repair effect.
export const FINAL_LOOP_EXISTING_CASE_CI_BRIDGE_VERSION=
 'reality-final-loop-existing-case-ci-bridge-v1';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const HASH=/^sha256:[a-f0-9]{64}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const SOURCE=/^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/pull\/[1-9]\d*$/;
const CAP='RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED';
const safe=(status,extra={})=>Object.freeze({
 schema:FINAL_LOOP_EXISTING_CASE_CI_BRIDGE_VERSION,status,
 read_only:true,claim_created:false,handler_invoked:false,
 github_effect_performed:false,case_specific_frozen_red_verified:false,
 independent_repair_verified:false,original_job_completed:false,
 authority_extended:false,installation_authorized:false,
 production_changed:false,next_governed_action:null,...extra
});
export function routeExistingSignedCaseCiForRecovery({
 contractProposal,maintenanceLedger,resumeTrigger
}={}){
 // Reuse the existing independent maintenance ledger for a terminal
 // evidence-only action. Never invent a new recovery contract or budget.
 const terminal=contractProposal?.status==='RECOVERY_EXISTING_TERMINAL_BUILDER_REQUALIFICATION_REQUIRED';
 const c=terminal?contractProposal.terminal_requalification:contractProposal?.contract_candidate;
 const terminalQualified=terminal&&contractProposal.contract_candidate===null&&
  contractProposal.previous_attempt_budget_preserved===true&&
  contractProposal.repeat_prior_ci_dispatch_permitted===false&&
  HASH.test(c?.qualifier_receipt_sha256||'')&&c.next_qualified_action==='QUALIFY_DISTINCT_RECOVERY_EVIDENCE_AND_EXACT_BUDGET_NO_REPLAY'&&
  resumeTrigger?.status==='FINAL_LOOP_GOVERNED_TRIGGER_TERMINAL_EVIDENCE_REQUALIFICATION_DUE'&&
  resumeTrigger.evidence_readback_permitted===true&&resumeTrigger.dispatch_permitted===false&&
  resumeTrigger.execution_authorized_by_trigger===false&&resumeTrigger.new_attempt_authorized===false&&
  resumeTrigger.previous_attempt_budget_preserved===true&&resumeTrigger.repeat_prior_ci_dispatch_permitted===false&&
  resumeTrigger.owner_id===c.owner_id&&resumeTrigger.shift_id===c.shift_id&&
  resumeTrigger.original_work_id===c.obligation_id&&resumeTrigger.source_ref===c.source_ref&&
  resumeTrigger.continuity_root_id===c.continuity_root_id&&
  resumeTrigger.qualifier_receipt_sha256===c.qualifier_receipt_sha256;
 if((terminal?!terminalQualified:contractProposal?.status!==
  'RECOVERY_PROOF_CONTRACT_CANDIDATE_NEEDS_DURABLE_FREEZE')||
  contractProposal.read_only!==true||
  (!terminal&&!HASH.test(c?.contract_id||''))||
  !UUID.test(c?.owner_id||'')||
  !UUID.test(c?.shift_id||'')||
  !UUID.test(c?.continuity_root_id||'')||
  !WORK.test(c?.obligation_id||'')||
  !SOURCE.test(c?.source_ref||'')||
  (!terminal&&(!HASH.test(c?.blocker_evidence_sha256||'')||
  c?.freeze_state!=='CANDIDATE_NOT_DURABLE'||
  c?.ledger_freeze_verified!==false||
  !Array.isArray(c.required_proofs)||
  c.required_proofs[0]!=='RED')))
  return safe('RECOVERY_CANONICAL_CONTRACT_CANDIDATE_REQUIRED');
 if(maintenanceLedger?.status!=='OWNER_VERIFIED_INTERNAL_MAINTENANCE_READ_ONLY'||
  maintenanceLedger.owner_id!==c.owner_id||
  maintenanceLedger.read_only!==true||
  maintenanceLedger.production_changed!==false||
  !Array.isArray(maintenanceLedger.items)||
  maintenanceLedger.items.length>50||
  maintenanceLedger.count!==maintenanceLedger.items.length||
  maintenanceLedger.active_maintenance_warrant?.status!==
   'VERIFIED_ACTIVE_OWNER_MAINTENANCE_WARRANT_SCOPE'||
  maintenanceLedger.active_maintenance_warrant.shift_id!==c.shift_id||
  maintenanceLedger.active_maintenance_warrant.state!=='ACTIVE'||
  maintenanceLedger.active_maintenance_warrant.mode!==
   'UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'||
  !Array.isArray(maintenanceLedger.active_maintenance_warrant.source_scope)||
  maintenanceLedger.active_maintenance_warrant.source_scope.length>4)
  return safe('RECOVERY_EXISTING_MAINTENANCE_WARRANT_READBACK_REQUIRED',{
   contract_id:c.contract_id,obligation_id:c.obligation_id});
 const items=maintenanceLedger.items.filter(x=>x?.source_ref===c.source_ref);
 if(items.length!==1)
  return safe('RECOVERY_CASE_CI_SOURCE_AMBIGUOUS_OR_UNREGISTERED',{
   contract_id:c.contract_id,obligation_id:c.obligation_id});
 const item=items[0];
 const match=maintenanceLedger.active_maintenance_warrant.source_scope.filter(x=>
  x.source_ref===item.source_ref&&
  x.maintenance_id===item.origin_incident_id&&
  x.origin_shift_id===item.origin_shift_id&&
  x.independent_review_receipt_sha256===item.independent_review_receipt_sha256);
 if(match.length!==1||
  item.owner_id!==c.owner_id||
  !UUID.test(item.origin_incident_id||'')||
  !UUID.test(item.origin_shift_id||'')||
  !HASH.test(item.independent_review_receipt_sha256||'')||
  !HASH.test(item.independent_failure_baseline_receipt_sha256||'')||
  item.installation_authorized_by_read!==false||
  item.external_action_authorized_by_read!==false||
  item.original_customer_job_completed!==false||
  item.production_changed!==false)
  return safe('RECOVERY_EXISTING_CASE_CI_EXACT_WARRANT_OR_BASELINE_MISSING',{
   contract_id:c.contract_id,obligation_id:c.obligation_id});
 const evidence={contract_id:terminal?null:c.contract_id,obligation_id:c.obligation_id,
  source_ref:c.source_ref,owner_id:c.owner_id,shift_id:c.shift_id,
  maintenance_id:item.origin_incident_id,
  original_maintenance_origin_shift_id:item.origin_shift_id,
  registered_existing_capability:CAP,
  independent_baseline_receipt_sha256:
   item.independent_failure_baseline_receipt_sha256,
  existing_diagnostic_receipt_sha256:
   HASH.test(item.ci_independent_diagnostic_receipt_sha256||'')?
    item.ci_independent_diagnostic_receipt_sha256:null,
  frozen_test_receipt_sha256:
   HASH.test(item.independent_frozen_test_receipt_sha256||'')?
    item.independent_frozen_test_receipt_sha256:null};
 if(terminal){
  if(item.signed_executor_state!=='COMPLETED'||item.signed_executor_action!==CAP||
     !HASH.test(item.ci_dispatch_receipt_sha256||'')||
     !HASH.test(item.ci_independent_diagnostic_receipt_sha256||'')||
     item.frozen_reproduction_verified!==false||item.independent_frozen_test_receipt_sha256!=null)
   return safe('RECOVERY_TERMINAL_EXISTING_DIAGNOSTIC_RECONCILIATION_REQUIRED',{
    ...evidence,repeat_prior_ci_dispatch_permitted:false,new_attempt_authorized:false});
  return safe('RECOVERY_TERMINAL_EXISTING_CI_DIAGNOSTIC_READBACK_READY',{
   ...evidence,qualifier_receipt_sha256:c.qualifier_receipt_sha256,
   prior_diagnostic_verified:true,previous_attempt_budget_preserved:true,
   repeat_prior_ci_dispatch_permitted:false,new_attempt_authorized:false,
   next_governed_action:'READ_DISTINCT_TECHNICAL_CI_EVIDENCE_ONLY'});
 }
 if(item.frozen_reproduction_verified===true&&
  HASH.test(item.independent_frozen_test_receipt_sha256||''))
  return safe('RECOVERY_EXISTING_CASE_SPECIFIC_CI_SOURCE_PROOF_NEEDS_CONTRACT_RECONCILIATION',{
   ...evidence,next_governed_action:
    'INDEPENDENTLY_RECONCILE_FROZEN_RED_ARTIFACT_WITH_EXACT_RECOVERY_CONTRACT'});
 if(item.signed_executor_state==='COMPLETED'&&
  item.signed_executor_action===CAP&&
  HASH.test(item.ci_dispatch_receipt_sha256||'')&&
  HASH.test(item.ci_independent_diagnostic_receipt_sha256||'')&&
  item.frozen_reproduction_verified===false&&
  item.independent_frozen_test_receipt_sha256==null)
  return safe('RECOVERY_REUSE_VERIFIED_CI_DIAGNOSTIC_FROZEN_CASE_SPEC_MISSING',{
   ...evidence,prior_diagnostic_verified:true,
   repeat_prior_ci_dispatch_permitted:false,
   same_action_retry_rejected:true,
   next_governed_action:
    'QUALIFY_DISTINCT_FROZEN_CASE_SPEC_AND_RED_TEST_FROM_EXISTING_DIAGNOSTIC'});
 if(item.signed_executor_state==='COMPLETED'&&
  item.independent_frozen_test_receipt_sha256==null)
  return safe('RECOVERY_COMPLETED_CI_CLAIM_INDEPENDENT_OUTCOME_UNVERIFIED',{
   ...evidence,repeat_prior_ci_dispatch_permitted:false,
   next_governed_action:'RECONCILE_SIGNED_CASE_CI_PROVIDER_OUTCOME_NO_REPLAY'});
 if(item.independent_frozen_test_receipt_sha256!=null||
  item.frozen_reproduction_verified!==false)
  return safe('RECOVERY_EXISTING_CASE_CI_EVIDENCE_CONFLICT_NEEDS_REVIEW',{
   ...evidence,next_governed_action:'INDEPENDENTLY_CHECK_CONFLICTING_CASE_CI_PROOF'});
 return safe('RECOVERY_EXISTING_SIGNED_CI_RUNNER_REQUIRES_ATOMIC_CLAIM',{
  ...evidence,registered_capability_available_as_code:true,
  signed_claim_required:true,case_specific_spec_required:true,
  next_governed_action:
   'RECHECK_SIGNED_WARRANT_AND_CASE_SPEC_BEFORE_EXISTING_REGISTERED_CI_CLAIM'});
}