// Reality's ONE governed original-job lifecycle: a failure is a checkpoint,
// not cancellation or permission to retry. This is a pure policy readout,
// not another agent, worker, claim, model, or installation authority.
const WORK=/^work:[a-f0-9]{32}$/;
const SHA=/^[a-f0-9]{64}$/;
const STATES=new Set([
 'RECONCILE_ALREADY_SATISFIED_PRIOR_WORK',
 'INDEPENDENT_DIAGNOSIS_REQUIRED']);
const fail=code=>{throw Error('ORIGINAL_RECOVERY_POLICY_'+code)};

export function planOriginalJobRecovery({observation,continuation=null}={}){
 if(observation?.status!=='SIGNED_WORKER_FAILURE_RECORDED'||
    !WORK.test(observation.original_work_id)||
    !SHA.test(observation.provider_evidence_sha256)||
    !Number.isSafeInteger(observation.failed_run_id)||
    observation.failed_run_id<1||
    !Number.isSafeInteger(observation.failed_job_id)||
    observation.failed_job_id<1||
    observation.independent_github_readback!==true||
    observation.original_job_completed!==false||
    observation.installation_authorized!==false||
    observation.new_customer_job_created!==false||
    observation.retry_external_effects_authorized!==false||
    observation.production_changed!==false)
  fail('SIGNED_SAME_ORIGINAL_FAILURE_REQUIRED');
 const historic=observation.finding==='HISTORICAL_RECONCILIATION_ALREADY_VERIFIED';
 const unresolved=observation.finding==='SIGNED_FAILED_WORKER_NEEDS_INDEPENDENT_DIAGNOSIS';
 if(!historic&&!unresolved)fail('FAILURE_CLASSIFICATION_NOT_INDEPENDENTLY_VERIFIED');
 if(continuation!==null&&(
    continuation.original_work_id!==observation.original_work_id||
    continuation.original_job_completed!==false||
    continuation.production_changed!==false||
    !STATES.has(continuation.recovery_status)||
    continuation.recovery_status!==(historic?
      'RECONCILE_ALREADY_SATISFIED_PRIOR_WORK':'INDEPENDENT_DIAGNOSIS_REQUIRED')))
  fail('DURABLE_ORIGINAL_RECOVERY_SCOPE_CHANGED');
 return Object.freeze({
  policy_version:'reality-original-job-never-abandon-v1',
  original_work_id:observation.original_work_id,
  provider_evidence_sha256:observation.provider_evidence_sha256,
  recovery_status:historic?
   'RECONCILE_ALREADY_SATISFIED_PRIOR_WORK':'INDEPENDENT_DIAGNOSIS_REQUIRED',
  next_evidence_action:historic?
   'INDEPENDENT_ORIGINAL_OBJECTIVE_DISPOSITION':
   'VERIFY_EXTERNAL_EFFECTS_AND_CLASSIFY_FAILURE',
  current_job_ownership:'RETAINED_BY_EXISTING_GENUINE_CAPABILITY_ENGINE',
  current_job_terminal:false,
  follow_up_without_owner_intervention:'DIAGNOSIS_AND_READBACK_ONLY',
  fix_existing_bug_if_independently_proven:true,
  build_missing_capability_only_after_frozen_proof:true,
  owner_approval_required_for_new_installation:true,
  after_approved_installation:'RESUME_SAME_ORIGINAL_AND_INDEPENDENTLY_SETTLE',
  existing_approval_not_regranted:true,
  original_execution_replay_authorized:false,
  external_effect_reconciliation_required:!historic,
  same_original_job_preserved:true,
  fresh_customer_job_created:false,
  model_decision_grants_authority:false,
  installation_authorized:false,
  original_job_completed:false,
  production_changed:false
 });
}
