// Read-only trigger bridging a stalled original Recovery checkpoint to
// bounded capability investigation. Never equates a passing historical CI
// workflow with proof that Reality can perform the UNDERLYING repair.
// Probe is tied to the original job, never a new assistant proposal.
export const RECOVERY_CONTINUATION_PROBE_VERSION='reality-recovery-continuation-probe-v0.1';
const WORK=/^work:[0-9a-f]{32}$/;
const REF=/^https:\/\/github\.com\/maloney2323\/Reality\/actions\/runs\/[1-9][0-9]*$/;
const fail=x=>{throw Error(x)};
export function probeStalledOriginalRepair({
 originalWorkId,evidence,completedStages,
 runtimeProof=null,
}={}){
 if(!WORK.test(String(originalWorkId||''))||
    evidence?.original_work_id!==originalWorkId||
    evidence?.original_job_completed!==false||
    evidence?.external_action_performed!==false||
    evidence?.execution_authorized!==false||
    typeof evidence.recovery_receipt_id!=='string'||
    !evidence.recovery_receipt_id||
    !Number.isInteger(completedStages)||completedStages<0||completedStages>7)
  fail('RECOVERY_PROBE_ORIGINAL_WORK_NOT_VERIFIED');
 const passing=evidence.status==='LATER_SUCCESSFUL_CI_RUN_INDEPENDENTLY_OBSERVED';
 const unresolved=evidence.status==='NO_LATER_VERIFIED_SUCCESS_IN_BOUNDED_PROVIDER_WINDOW';
 if(!passing&&!unresolved)fail('RECOVERY_PROBE_PROVIDER_STATE_NOT_GROUNDED');
 if(passing&&!REF.test(String(evidence.later_success?.run_url||'')))
  fail('RECOVERY_PROBE_HISTORICAL_PASS_REF_REQUIRED');
 // Real downstream executor proof must come from a separate authenticated
 // runtime readback; absence is not proof the executor is missing.
 if(runtimeProof!==null&&(
    runtimeProof.original_work_id!==originalWorkId||
    runtimeProof.independently_reobserved!==true||
    !['AVAILABLE','MISSING'].includes(runtimeProof.executor_status)||
    typeof runtimeProof.evidence_ref!=='string'||
    runtimeProof.evidence_ref.length<8))
  fail('RECOVERY_PROBE_RUNTIME_PROOF_INVALID');
 const knownMissing=runtimeProof?.executor_status==='MISSING';
 const knownReady=runtimeProof?.executor_status==='AVAILABLE';
 const state=knownReady?'ORIGINAL_REPAIR_EXECUTOR_AVAILABLE':
  knownMissing?'CAPABILITY_GAP_CANDIDATE_NEEDS_SANDBOX_VERIFICATION':
  'EXECUTION_CAPABILITY_REQUIRES_INDEPENDENT_INVESTIGATION';
 return Object.freeze({
  version:RECOVERY_CONTINUATION_PROBE_VERSION,
  original_work_id:originalWorkId,
  recovery_receipt_id:evidence.recovery_receipt_id,
  stalled_at:'ORIGINAL_JOB_RESUMPTION',
  previously_verified_stages:completedStages,
  state,
  historical_workflow_status:passing?'LATER_CI_PASSED':'LATER_CI_NOT_VERIFIED',
  historical_workflow_correction_is_job_completion:false,
  original_job_completed:false,
  original_job_resumed:false,
  independent_executor_verified:knownReady,
  missing_capability_independently_established:knownMissing,
  candidate_capability:knownMissing?
   'reality.original-repair-execution':null,
  capability_gap_proof_ref:knownMissing?runtimeProof.evidence_ref:null,
  next_action:knownReady?
   'Independently execute the original authorized repair and verify its business outcome.':
   knownMissing?
   'Reproduce missing original-repair execution capability in isolation against original job; generate and test a bounded candidate, then obtain exact authorization.':
   'Investigate the original-job execution path and registry; independently verify whether an executor exists before deciding to upgrade.',
  authorization_granted:false,
  upgrade_executed:false,
  settlement_recorded:false,
 });
}
