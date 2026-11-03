// Two owner-consent stages: job scope; exact installation after verification.
// Read-only preflight: does NOT pretend a static path guarantees live settlement.
// Unknown or not-yet-supported continuation protocols cannot be approved.
const EXACT={
 'reality-ci-failure-evidence':{
  source:'src/reality-extensions/reality-ci-failure-evidence.mjs',
  protocol:'VERIFIED_CI_FAILURE_CLASSIFICATION_V1',
 },
 'reality-continuity-settlement-reconciler':{
  source:'src/reality-extensions/reality-continuity-settlement-reconciler.mjs',
  protocol:'TRUSTED_ORIGINAL_SETTLEMENT_RECONCILIATION_V1',
 },
 'reality-general-execution-receipt':{
  source:'src/reality-extensions/reality-general-execution-receipt.mjs',
  protocol:'TRUSTED_GENERAL_COMPLETION_RECEIPT_V1',
 },
};
const HASH=/^[0-9a-f]{64}$/;
const WORK=/^work:[0-9a-f]{32}$/;
export function assessTwoAuthorizationExecutionPreflight(entry){
 const id=entry?.capability_id;
 const supported=EXACT[id];
 const q=entry?.qualification;
 const basic=WORK.test(entry?.original_work_id||'')&&
  entry?.phase==='AWAITING_OWNER_APPROVAL'&&
  !entry?.approval&&q?.status==='AWAITING_OWNER_APPROVAL'&&
  q?.installation_authorized===false&&q?.original_job_completed===false&&
  HASH.test(q?.artifact_sha256||'')&&
  Array.isArray(entry?.source_paths)&&entry.source_paths.length>=2&&
  entry.source_paths.length<=12&&
  entry.source_paths.every(p=>typeof p==='string'&&
   !p.includes('..')&&
   /^(src\/reality-extensions\/|test\/reality-extensions\/)/.test(p));
 if(!basic)return Object.freeze({
  approval_gate_open:false,
  status:'NOT_VERIFIED_OR_NOT_PENDING',
  two_authorizations_only:true,
  original_job_completed:false,
 });
 const path=supported?.source||null;
 if(!supported||!entry.source_paths.includes(path)||
     !entry.source_paths.includes(path?.replace('src/','test/').replace(/\.mjs$/,'.test.js'))){
  return Object.freeze({
   approval_gate_open:false,
   status:'EXACT_INSTALL_TO_SETTLEMENT_PROTOCOL_MISSING',
   reason:'The installed candidate has no verified end-to-end continuation protocol for this original job; approval would risk stopping before settlement.',
   original_work_id:entry.original_work_id,
   two_authorizations_only:true,
   original_job_completed:false,
  });
 }
 // Postgres JSON readbacks may carry the signed Actions run as decimal text.
 // Accept only canonical positive safe integers: never coerce scientific notation,
 // fractions, leading zeros, booleans, whitespace or unsafe/out-of-range IDs.
 const runId=q?.provider_run_id;
 const validProviderRunId=
  (typeof runId==='number'&&Number.isSafeInteger(runId)&&runId>0)||
  (typeof runId==='string'&&/^[1-9][0-9]{0,15}$/.test(runId)&&
   Number.isSafeInteger(Number(runId))&&Number(runId)>0);
 if(id==='reality-general-execution-receipt'&&(
   q.attestation_source!=='SIGNED_GITHUB_WORKFLOW_WITH_INDEPENDENT_SANDBOX'||
   !validProviderRunId||
   !Number.isSafeInteger(q.frozen_pass)||q.frozen_pass<35||
   !Number.isSafeInteger(q.candidate_pass)||q.candidate_pass<5||
   q.original_work_id!==entry.original_work_id||
   q.artifact_sha256!==entry.qualification.artifact_sha256||
   q.production_changed!==false))
  return Object.freeze({
    approval_gate_open:false,
    status:'SIGNED_SOURCE_AND_COMPLETE_EXECUTION_PRECHECK_NOT_VERIFIED',
    two_authorizations_only:true,original_job_completed:false,
  });
 const holdoutNeeded=id==='reality-continuity-settlement-reconciler';
 if(holdoutNeeded&&(q.real_provider_holdout_verified!==true||
  q.real_provider_holdout_artifact_sha256!==q.artifact_sha256))
  return Object.freeze({
   approval_gate_open:false,status:'MANDATORY_HOLDOUT_NOT_VERIFIED',
   two_authorizations_only:true,original_job_completed:false,
  });
 return Object.freeze({
  approval_gate_open:true,
  status:'STATIC_EXECUTOR_PROTOCOL_PRESENT_OWNER_FINAL_APPROVAL_ELIGIBLE',
  protocol:supported.protocol,
  scope:'EXACT_ISOLATED_INSTALL_ONLY',
  live_completion_guaranteed:false,
  two_authorizations_only:true,
  original_job_completed:false,
 });
}
