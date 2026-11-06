// Evidence-only classifier for a verified, current CI failure of an original job.
//
// Do not import this as a provider-readback verifier: a trusted adapter must
// independently obtain the run/job/registry/goal evidence before calling it.
// In particular a browser, issue body, or model cannot assert these fields
// and gain execution or installation authority.
const WORK=/^work:[a-f0-9]{32}$/;
const SHA40=/^[a-f0-9]{40}$/;
const SHA256=/^[a-f0-9]{64}$/;
const CAP=/^[a-z][a-z0-9._-]{2,90}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const OWNER=/^owner:[a-zA-Z0-9_-]{6,100}$/;
const GOAL=/^(?:user-goal|goal):[a-zA-Z0-9._-]{6,100}$/;
const REPOSITORY='maloney2323/Reality';
const SOURCE='GITHUB_ACTIONS_INDEPENDENT_PROVIDER_READBACK';
const AUTHORITY_ERRORS=new Set([
 'PERMISSION_DENIED','SERVICE_ROLE_REQUIRED','AUTHORITY_REQUIRED',
 'CREDENTIAL_UNAVAILABLE','MISSING_CREDENTIAL','TOKEN_EXPIRED',
 'ACCESS_DENIED','INVALID_GITHUB_TOKEN','RATE_LIMITED'
]);
const missingExtensionErrors=new Set(['ERR_MODULE_NOT_FOUND','MODULE_NOT_FOUND']);
const isInt=x=>Number.isSafeInteger(x)&&x>0;
const string=x=>typeof x==='string'&&x.length>0&&x.length<=256;
function result(p,decision,canGenerate=false){
 return Object.freeze({
  decision,can_generate_candidate:canGenerate,
  owner_id:p?.owner_id??null,
  goal_id:p?.goal_id??null,
  original_work_id:p?.original_work_id??null,
  missing_capability_id:decision==='MISSING_CAPABILITY'?p.missing_capability_id:null,
  frozen_regression_sha256:decision==='MISSING_CAPABILITY'?p.frozen_regression_sha256:null,
  source_receipt_ref:decision==='MISSING_CAPABILITY'?p.source_receipt_ref:null,
  failure_log_sha256:decision==='MISSING_CAPABILITY'?p.failure_log_sha256:null,
  installation_authorized:false,
  external_execution_authorized:false,
  original_job_completed:false,
  production_changed:false,
 });
}
function exactProviderEvidence(p){
 if(!p||typeof p!=='object'||Array.isArray(p))return false;
 if(!(OWNER.test(p.owner_id||'')||UUID.test(p.owner_id||''))||
  !(GOAL.test(p.goal_id||'')||UUID.test(p.goal_id||''))||
  !WORK.test(p.original_work_id||'')||
  p.repository!==REPOSITORY||p.source!==SOURCE||
  p.provider_readback_verified!==true||
  p.original_goal_verified!==true||
  !SHA40.test(p.repository_base_sha||'')||
  p.run_head_sha!==p.repository_base_sha||
  p.latest_head_sha!==p.repository_base_sha||
  !isInt(p.run_id)||!isInt(p.job_id)||
  p.run_status!=='completed'||p.run_conclusion!=='failure'||
  p.run_url!=='https://github.com/'+REPOSITORY+'/actions/runs/'+p.run_id||
  !SHA256.test(p.failure_log_sha256||'')||
  !SHA256.test(p.frozen_regression_sha256||'')||
  !string(p.frozen_regression_manifest_ref)||
  p.source_receipt_ref!=='github:actions:run:'+p.run_id+
    ':job:'+p.job_id+':verified'||
  !string(p.error_code)||!string(p.missing_capability_id)||
  !['ABSENT','ACTIVE','UNKNOWN'].includes(p.current_capability_registry_status))
  return false;
 return true;
}
function superseded(p){
 const green=p.superseding_success;
 if(green===null)return false;
 if(!green||typeof green!=='object'||Array.isArray(green))return null;
 if(green.repository!==REPOSITORY||
   green.run_head_sha!==p.run_head_sha||
   !isInt(green.run_id)||green.run_id<=p.run_id||
   green.run_status!=='completed'||green.run_conclusion!=='success'||
   green.independently_verified!==true)
  return null;
 return true;
}
/**
 * Classify a *trusted provider evidence packet* without authorizing work.
 * All decision branches retain the original work's identity but forbid
 * external effects, installation, promotion, and settlement.
 */
export function classifyVerifiedCiFailure(p){
 if(!exactProviderEvidence(p))
  return result(p,'INSUFFICIENT_EVIDENCE');
 const previous=superseded(p);
 if(previous===null)return result(p,'INSUFFICIENT_EVIDENCE');
 if(previous===true)return result(p,'STALE_OR_ALREADY_REPAIRED');
 if(AUTHORITY_ERRORS.has(p.error_code))
  return result(p,'AUTHORITY_OR_CONFIGURATION_BLOCK');
 if(p.current_capability_registry_status==='ACTIVE'&&
   (p.error_code==='ERR_ASSERTION'||missingExtensionErrors.has(p.error_code)))
  return result(p,'REPAIR_EXISTING_DEFECT');
 if(missingExtensionErrors.has(p.error_code)&&
   p.current_capability_registry_status==='ABSENT'&&
   CAP.test(p.missing_capability_id))
  return result(p,'MISSING_CAPABILITY',true);
 return result(p,'VERIFIED_FAILURE_NEEDS_ROOT_CAUSE');
}
