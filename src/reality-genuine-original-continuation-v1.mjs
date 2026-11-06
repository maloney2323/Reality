// Reality governed continuation contract.
// This module validates evidence but cannot grant owner authority, mutate a registry,
// or write a settlement receipt. Durable transitions belong to the service-only ledger.
import { createHash } from 'node:crypto';
const hex40=/^[a-f0-9]{40}$/;
const hex64=/^[a-f0-9]{64}$/;
const work=/^work:[a-f0-9]{32}$/;
export const digest=value=>createHash('sha256').update(
  typeof value==='string'?value:JSON.stringify(value)).digest('hex');
function requireProof(ok,code){if(!ok)throw Error('REALITY_CONTINUATION_'+code);}
export function acceptIsolatedInstallation({scope,approval,installation,observations,provider}){
 requireProof(scope&&approval&&installation&&provider,'EVIDENCE_MISSING');
 requireProof(work.test(scope.original_work_id)&&hex64.test(scope.artifact_sha256)&&
   hex40.test(scope.installed_commit_sha),'ORIGINAL_SCOPE_INVALID');
 requireProof(approval.approval_id===scope.approval_id&&
   approval.original_work_id===scope.original_work_id&&
   approval.target_environment==='ISOLATED_PREVIEW'&&
   approval.consumed_at!=null&&
   approval.approval_origin==='AUTHENTICATED_OWNER_EXPLICIT_ACTION',
   'CONSUMED_OWNER_APPROVAL_REQUIRED');
 requireProof(installation.original_work_id===scope.original_work_id&&
   installation.installed_commit_sha===scope.installed_commit_sha&&
   installation.artifact_sha256===scope.artifact_sha256&&
   installation.settlement_verified===false&&
   installation.original_job_completed===false&&installation.production_changed===false,
   'EXACT_INSTALLED_RECEIPT_REQUIRED');
 requireProof(provider.repository==='maloney2323/Reality'&&
   provider.branch===scope.installed_branch&&
   provider.head_sha===scope.installed_commit_sha&&
   provider.installed_bytes_verified===true,
   'INDEPENDENT_GITHUB_SOURCE_READBACK_REQUIRED');
 requireProof(Array.isArray(observations)&&observations.length===5&&
   observations.every(o=>o.tests>=44&&o.passed===o.tests&&o.failed===0&&
     o.exit_code===0&&o.sandbox_network_disabled===true&&
     o.executor_privileges_dropped===true&&hex64.test(o.output_hash_sha256)),
   'FIVE_INDEPENDENT_MONITOR_ROUNDS_REQUIRED');
 requireProof(installation.monitored_executions===5&&installation.passed_assertions>=220,
   'MONITOR_RECEIPT_INSUFFICIENT');
 const fullProbation=installation.probation_live_business_executions>=installation.probation_window_target;
 requireProof(installation.probation_window_target>=50&&
   installation.probation_live_business_executions>=0,
   'PROBATION_COUNTS_UNTRUSTED');
 return Object.freeze({
   version:'reality-isolated-original-acceptance-contract-v1',
   status:'ACCEPTED_FOR_ISOLATED_RESUMPTION',
   original_work_id:scope.original_work_id,
   approval_id:scope.approval_id,
   artifact_sha256:scope.artifact_sha256,
   installed_commit_sha:scope.installed_commit_sha,
   isolation_scope:'ONE_APPROVED_ORIGINAL_JOB',
   monitored_executions:5,
   monitored_assertions:installation.passed_assertions,
   probation_target:installation.probation_window_target,
   live_business_executions:installation.probation_live_business_executions,
   full_probation_complete:fullProbation,
   production_changed:false,
   original_job_completed:false
 });
}
export function verifyOriginalResumption({acceptance,claim,original,providerRun,providerJob,execution}){
 requireProof(acceptance?.status==='ACCEPTED_FOR_ISOLATED_RESUMPTION'&&
   acceptance.production_changed===false&&
   acceptance.original_job_completed===false,'ACCEPTANCE_REQUIRED');
 requireProof(claim?.status==='RESUMPTION_CLAIMED'&&
   claim.original_work_id===acceptance.original_work_id&&
   claim.installed_commit_sha===acceptance.installed_commit_sha&&
   claim.single_use===true,'EXACT_SINGLE_USE_CLAIM_REQUIRED');
 requireProof(original?.original_work_id===acceptance.original_work_id&&
   original?.original_provider_failure_verified===true&&
   hex64.test(original.original_frozen_sha256),'PINNED_HISTORICAL_FAILURE_REQUIRED');
 requireProof(providerRun?.repository==='maloney2323/Reality'&&
   providerRun?.id===claim.github_run_id&&
   hex40.test(providerRun?.head_sha)&&
   providerRun?.event==='push','REAL_PROVIDER_RUN_REQUIRED');
 requireProof(providerJob?.name==='resume_original_job'&&
   providerJob?.run_id===providerRun.id&&
   providerJob?.status==='completed'&&providerJob?.conclusion==='success',
   'INDEPENDENT_PROVIDER_JOB_SUCCESS_REQUIRED');
 requireProof(execution?.original_work_id===acceptance.original_work_id&&
   execution?.installed_commit_sha===acceptance.installed_commit_sha&&
   execution?.classification==='MISSING_CAPABILITY'&&
   execution?.provider_failure_verified===true&&
   execution?.frozen_suite_completed===true&&
   execution?.frozen_suite_passed===true&&
   execution?.isolated_execution===true&&
   execution?.production_changed===false&&
   hex64.test(execution?.provider_outcome_sha256),
   'REAL_ORIGINAL_EXECUTION_EVIDENCE_REQUIRED');
 return Object.freeze({
   version:'reality-independent-original-settlement-contract-v1',
   status:'PROVIDER_OUTCOME_VERIFIED_AWAITING_DURABLE_SETTLEMENT',
   original_work_id:acceptance.original_work_id,
   installed_commit_sha:acceptance.installed_commit_sha,
   provider_run_id:providerRun.id,
   provider_job_id:providerJob.id,
   provider_outcome_sha256:execution.provider_outcome_sha256,
   full_probation_complete:acceptance.full_probation_complete,
   production_changed:false,
   // This is a validation result, NOT the final database settlement receipt.
   settlement_recorded:false
 });
}
