// Strict source-derived contract for any original job that installs a supported
// capability interface. A filename cannot grant execution or settlement authority.
const WORK=/^work:[a-f0-9]{32}$/;
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^[a-f0-9]{64}$/;
const MODULE=/^src\/reality-extensions\/[a-z][a-z0-9._-]+\.mjs$/;
const FROZEN=/^test\/reality-frozen-regressions\/[a-z][a-z0-9._-]+\.test\.js$/;
const fail=x=>{throw Error('REALITY_GENERAL_ORIGINAL_RESUME_'+x)};
const interfaces=Object.freeze({
 'reality-ci-failure-evidence':Object.freeze({
  protocol:'VERIFIED_CI_FAILURE_CLASSIFICATION_V1',export_name:'classifyVerifiedCiFailure',
  required_decision:'MISSING_CAPABILITY',requires_reconciliation_evidence:false}),
 'reality-continuity-settlement-reconciler':Object.freeze({
  protocol:'TRUSTED_ORIGINAL_SETTLEMENT_RECONCILIATION_V1',
  export_name:'assessContinuityReconciliation',required_decision:'RECONCILIATION_REQUIRED',
  requires_reconciliation_evidence:true}),
});
export function deriveOriginalResumeContract(ready){
 if(!WORK.test(ready?.original_work_id)||!SHA.test(ready?.installed_commit_sha)||
  !SHA.test(ready?.original_source_sha)||!HASH.test(ready?.artifact_sha256)||
  !HASH.test(ready?.frozen_test_sha256)||!MODULE.test(ready?.source_path)||
  !FROZEN.test(ready?.frozen_test_path)||
  ready?.target_environment==='PRODUCTION'||ready?.production_changed===true||
  ready?.original_job_completed!==false)
  fail('VERIFIED_ORIGINAL_SCOPE_REQUIRED');
 const slug=ready.source_path.slice('src/reality-extensions/'.length,-4);
 const known=interfaces[slug];
 if(!known)fail('EXTENSION_PROTOCOL_NOT_VERIFIED');
 const companion='test/reality-extensions/'+slug+'.test.js';
 if(companion.includes('..')||!/^test\/reality-extensions\/[a-z][a-z0-9._-]+\.test\.js$/.test(companion))
  fail('COMPANION_SUITE_INVALID');
 if(known.requires_reconciliation_evidence){
  if(!WORK.test(ready?.reconciliation_target_work_id)||
    ready.reconciliation_target_work_id===ready.original_work_id||
    ready?.reconciliation_evidence?.original?.original_work_id!==ready.reconciliation_target_work_id||
    ready?.reconciliation_evidence?.settlement?.original_work_id!==ready.reconciliation_target_work_id||
    ready?.reconciliation_evidence?.provider?.independent_provider_readback!==true||
    ready?.reconciliation_evidence?.settlement?.independent_outcome_verified!==true||
    ready?.reconciliation_evidence?.original?.epistemic_status!=='VERIFIED'||
    ready?.reconciliation_evidence?.ledger?.append_only_verified!==true)
   fail('INDEPENDENT_TARGET_PROVIDER_AND_LEDGER_EVIDENCE_REQUIRED');
 }
 return Object.freeze({protocol:known.protocol,
  export_name:known.export_name,required_decision:known.required_decision,
  source_path:ready.source_path,original_work_id:ready.original_work_id,
  frozen_test_path:ready.frozen_test_path,companion_test_path:companion,
  reconciliation_target_work_id:known.requires_reconciliation_evidence?
   ready.reconciliation_target_work_id:null,
  requires_reconciliation_evidence:known.requires_reconciliation_evidence,
  production_changed:false,installation_authorized:false,
 });
}
