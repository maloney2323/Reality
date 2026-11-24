// Normalize independently observed external infrastructure failures into
// recovery candidates. This module is pure: it never grants authority, mutates
// infrastructure, or claims that a repair/continuation has occurred.
export const EXTERNAL_INFRA_OBSERVER_SCHEMA =
 'reality-final-loop-external-infrastructure-observer-v1';
const REF=/^[a-z0-9]{20}$/;
const BRANCH=/^[a-zA-Z0-9][a-zA-Z0-9._-]{1,127}$/;
const FAILURES=new Set(['MIGRATIONS_FAILED','FUNCTIONS_DEPLOY_FAILED','PROJECT_FAILED']);
const HEALTHY=new Set(['ACTIVE_HEALTHY']);
const immutable=(status,more={})=>Object.freeze({
 schema:EXTERNAL_INFRA_OBSERVER_SCHEMA,status,read_only:true,
 authority_granted:false,repair_executed:false,branch_reset:false,
 original_job_completed:false,continuation_verified:false,
 production_changed:false,...more
});
export function observeExternalInfrastructureBlocker({
 provider,project_ref,parent_project_ref,branch_name,branch_status,
 preview_project_status,observed_at,source_receipt_sha256,
 original_shift_id=null,original_work_id=null
}={}){
 if(provider!=='supabase'||!REF.test(project_ref||'')||
  !REF.test(parent_project_ref||'')||project_ref===parent_project_ref||
  !BRANCH.test(branch_name||'')||
  !Number.isFinite(Date.parse(observed_at||''))||
  !/^sha256:[a-f0-9]{64}$/.test(source_receipt_sha256||''))
  return immutable('EXTERNAL_INFRA_SOURCE_PROOF_REQUIRED');
 if(!FAILURES.has(branch_status)){
  return immutable('EXTERNAL_INFRA_NO_SUPPORTED_FAILURE',{
   project_ref,branch_name,branch_status
  });
 }
 const identity=Object.freeze({provider,project_ref,parent_project_ref,
  branch_name,branch_status,observed_at,source_receipt_sha256,
  original_shift_id,original_work_id});
 return immutable('EXTERNAL_INFRA_RECOVERY_OBSERVATION_CANDIDATE',{
  ...identity,blocker_kind:'SUPABASE_BRANCH_PROVISIONING_FAILURE',
  continuity_obligation_open:true,
  recovery_scope:'ISOLATED_BRANCH_ONLY',
  next_actor:'REALITY',
  next_governed_action:'INDEPENDENTLY_DIAGNOSE_BRANCH_MIGRATION_FAILURE',
  next_required_proof:'EXACT_FAILED_MIGRATION_AND_PROVIDER_ERROR',
  independent_provider_readback_required:true,
  registered_recovery_handler_required:true,
  signed_warrant_required_for_mutation:true,
  atomic_continuity_append_required:true,
  frozen_causality_required:true,
  retry_budget_required:true,
  parent_shift_resume_requires_independent_verification:true,
  database_health_observed:HEALTHY.has(preview_project_status),
  // This is deliberately a candidate, not a durable observation receipt.
  event_dispatched:false,observation_committed:false
 });
}
