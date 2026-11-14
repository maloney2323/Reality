// Small, owner-shift-bound corrective proof lane. Shift receipt decides which
// periodic wake uses this bounded lane; no job ID, owner or issue is hardcoded.
// Caller must authenticate worker and obtain current signed shift pulse first.
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export const CORRECTIVE_PROOF_WAKE_DIVISOR=8;
export function isBoundedCorrectiveProofWake(wake){
 return wake?.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'&&
  UUID.test(wake.shift_id||'')&&
  Number.isSafeInteger(wake.wake_count)&&wake.wake_count>0&&
  wake.wake_count%CORRECTIVE_PROOF_WAKE_DIVISOR===0&&
  wake.installation_authorized===false&&wake.production_changed===false;
}
export function classifyCorrectiveProofTick(result){
 const status=String(result?.status||'');
 if(result?.original_job_completed!==false||
    result.installation_authorized!==false||
    result.production_changed!==false||
    result.new_shift_started!==false)
  return Object.freeze({worker_status:'WAKE_FAILED',
   worker_result:'CORRECTIVE_PROOF_BOUNDARY_UNVERIFIED',
   http_status:503,proof_verified:false});
 const outcomes={
  CORRECTIVE_CI_PASSED_EXACT_INSTALL_REVIEW_REQUIRED:
   'CORRECTIVE_CI_PASSED_EXACT_REVIEW_REQUIRED',
  CORRECTIVE_CI_REJECTED_ORIGINAL_REMAINS_OPEN:
   'CORRECTIVE_CI_FAILED_REPAIR_REVISION_REQUIRED',
  CORRECTIVE_CANDIDATE_STAGED_AWAITING_INDEPENDENT_CI:
   'CORRECTIVE_CANDIDATE_INDEPENDENT_CI_PENDING',
  NO_UNTESTED_SAME_ORIGINAL_CORRECTIVE_REVISION:
   'NO_CORRECTIVE_REVISION_READY_FOR_CI',
  NO_CURRENT_OWNER_WARRANTED_CORRECTIVE_CI:
   'NO_OWNER_WARRANTED_CORRECTIVE_CI',
 };
 const evidence=outcomes[status];
 if(!evidence)return Object.freeze({worker_status:'WAKE_FAILED',
  worker_result:/^(?:AUTO_CORRECTIVE_|CORRECTIVE_|ISOLATED_)[A-Z0-9_]{4,100}$/.test(status)?
   'CORRECTIVE_PROOF_BROKER_REPORTED_FAILURE':
   'CORRECTIVE_PROOF_PROVIDER_OR_DATABASE_UNVERIFIED',
  http_status:503,proof_verified:false});
 if(status.startsWith('CORRECTIVE_CI_')&&
    (result.independent_ci_verified!==true||
     !/^https:\/\/github\.com\/[^/]+\/[^/]+\/actions\/runs\/[1-9]\d*$/.test(
      result.independent_run_url||'')))
  return Object.freeze({worker_status:'WAKE_FAILED',
   worker_result:'CORRECTIVE_PROOF_CI_RECEIPT_UNVERIFIED',
   http_status:503,proof_verified:false});
 return Object.freeze({worker_status:'WAKE_COMPLETED',
  worker_result:evidence,http_status:200,
  proof_verified:status.startsWith('CORRECTIVE_CI_')});
}
