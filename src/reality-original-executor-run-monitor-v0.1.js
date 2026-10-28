// Evidence-only live projection of Reality's autonomous original-job executor run.
// Never convert GitHub test status into owner authorization or a signed warrant.
import {githubGet} from './reality-connector-github-v1.0.js';
import {originalOwnerContext,ORIGINAL_OWNER_WORK_ID}
 from './reality-original-owner-console-v0.1.js';

export const ORIGINAL_EXECUTOR_RUN_MONITOR_VERSION='reality-original-executor-run-monitor-v0.1';
const ROOT='/repos/maloney2323/Reality';
const BRANCH='feature/governed-autonomous-self-upgrading-v01-20261027';
const NAME='Reality ORIGINAL Autonomous Executor Synthesis v0.1';
const WORKFLOW='reality-original-autonomous-executor-v0.1.yml';
const SHA=/^[0-9a-f]{40}$/;
const fail=x=>{throw Error(x)};

export function projectOriginalExecutorRun({run,jobs}={}){
 if(run?.name!==NAME||!Number.isSafeInteger(run.id)||run.id<=0||
    run.repository?.full_name!=='maloney2323/Reality'||
    run.head_repository?.full_name!=='maloney2323/Reality'||
    run.head_branch!==BRANCH||!SHA.test(String(run.head_sha||''))||
    !['push','workflow_dispatch'].includes(run.event)||
    !['queued','in_progress','completed'].includes(run.status)||
    !Array.isArray(jobs)||jobs.length<1||jobs.length>8)
  fail('ORIGINAL_EXECUTOR_PROOF_SOURCE_INVALID');
 const names=[
  'reality-model-generates-original-executor',
  'independent-secretless-executor-verifier',
  'reality-model-corrects-failed-original-executor',
  'independent-secretless-correction-retest'
 ];
 if(jobs.some(j=>!names.includes(j.name)||j.workflow_run?.id&&j.workflow_run.id!==run.id)||
    new Set(jobs.map(j=>j.name)).size!==jobs.length)
  fail('ORIGINAL_EXECUTOR_PROOF_UNEXPECTED_JOBS');
 const of=name=>jobs.find(j=>j.name===name)||null;
 const generation=of(names[0]),first=of(names[1]);
 const correction=of(names[2]),second=of(names[3]);
 if(!generation||!first)fail('ORIGINAL_EXECUTOR_PROOF_GENERATION_AND_TEST_REQUIRED');
 const state=first.conclusion==='success'?
  'REALITY_GENERATED_EXECUTOR_INDEPENDENTLY_TESTED':
  second?.conclusion==='success'?
  'REALITY_SELF_CORRECTED_EXECUTOR_INDEPENDENTLY_TESTED':
  second?.conclusion==='failure'?
  'REALITY_CORRECTED_EXECUTOR_REJECTED':
  correction?.conclusion==='failure'?
  'REALITY_SELF_CORRECTION_GENERATION_REJECTED':
  correction?.status==='in_progress'?'REALITY_SELF_CORRECTING':
  first?.conclusion==='failure'?'REALITY_EXECUTOR_REJECTED_CORRECTION_PENDING':
  generation?.conclusion==='failure'?'REALITY_MODEL_GENERATION_FAILED':
  'REALITY_EXECUTOR_TEST_IN_PROGRESS';
 return Object.freeze({
  version:ORIGINAL_EXECUTOR_RUN_MONITOR_VERSION,
  original_work_id:ORIGINAL_OWNER_WORK_ID,
  status:state,run_id:run.id,run_url:run.html_url,
  head_sha:run.head_sha,run_conclusion:run.conclusion??null,
  real_model_generation_verified_by_ci:generation.conclusion==='success',
  first_independent_sandbox_passed:first.conclusion==='success',
  model_self_correction_completed:correction?.conclusion==='success',
  corrected_independent_sandbox_passed:second?.conclusion==='success',
  evidence_type:'EXTERNAL_GITHUB_CI_NOT_YET_OWNER_WARRANTED',
  owner_warrant_issued:false,owner_install_authorized:false,
  installed_capability:false,original_job_completed:false,
 });
}

const ACCEPTED_RUN=40759263421;
const ACCEPTED_COMMIT='b9949f726d2d2cebee80bdf654767a7d0e0ba038';
const ACCEPTED_WORKFLOW='reality-original-model-executor-behavioral-recheck-v0.4.yml';
const ACCEPTED_NAME='Reality ORIGINAL Model Executor Independently Verified Behavioral Recheck v0.4';
const ACCEPTED_MODEL_SHA256='d06ed111a121a4e1a93fb8bcfd47623e2cb60ba6a22e940ec31e0ac5b568d31d';

export function projectAcceptedOriginalExecutorRun({run,jobs}={}){
 if(run?.id!==ACCEPTED_RUN||run?.name!==ACCEPTED_NAME||
    run.head_sha!==ACCEPTED_COMMIT||run.head_branch!==BRANCH||
    run.status!=='completed'||run.conclusion!=='success'||run.event!=='push'||
    run.repository?.full_name!=='maloney2323/Reality'||
    run.head_repository?.full_name!=='maloney2323/Reality'||
    !String(run.path||'').endsWith('.github/workflows/'+ACCEPTED_WORKFLOW)||
    run.html_url!=='https://github.com/maloney2323/Reality/actions/runs/'+ACCEPTED_RUN||
    !Array.isArray(jobs)||jobs.length!==1||
    jobs[0]?.name!=='verify-model-corrected-original-executor'||
    jobs[0]?.status!=='completed'||jobs[0]?.conclusion!=='success'||
    (jobs[0]?.workflow_run?.id&&jobs[0].workflow_run.id!==ACCEPTED_RUN))
  fail('ORIGINAL_EXECUTOR_10_CASE_INDEPENDENT_CI_NOT_VERIFIED');
 return Object.freeze({
  version:ORIGINAL_EXECUTOR_RUN_MONITOR_VERSION,
  original_work_id:ORIGINAL_OWNER_WORK_ID,
  status:'REALITY_MODEL_EXECUTOR_10_OF_10_INDEPENDENTLY_VERIFIED',
  run_id:ACCEPTED_RUN,run_url:run.html_url,head_sha:ACCEPTED_COMMIT,
  candidate_sha256:ACCEPTED_MODEL_SHA256,
  independent_behavioral_cases_passed:10,independent_behavioral_cases_total:10,
  real_model_generation_verified_by_ci:true,
  first_independent_sandbox_passed:false,
  model_self_correction_completed:true,
  corrected_independent_sandbox_passed:true,
  evidence_type:'EXTERNAL_PINNED_GITHUB_CI_NOT_YET_OWNER_WARRANTED',
  owner_warrant_issued:false,owner_install_authorized:false,
  installed_capability:false,original_job_completed:false,
 });
}

const LIVE_RUN=40760732281;
const LIVE_SHA='3f49896c8d31925a8294e320a3b821923db3e758';
const LIVE_NAME='Reality ORIGINAL Live GitHub Read-Only Execution Proof v0.1';
const LIVE_WORKFLOW='reality-original-live-github-readonly-v0.1.yml';
export function projectLiveOriginalExecutorRun({run,jobs}={}){
 if(run?.id!==LIVE_RUN||run.name!==LIVE_NAME||
    run.head_branch!==BRANCH||run.head_sha!==LIVE_SHA||
    run.status!=='completed'||run.conclusion!=='success'||run.event!=='push'||
    run.repository?.full_name!=='maloney2323/Reality'||
    run.head_repository?.full_name!=='maloney2323/Reality'||
    !String(run.path||'').endsWith('.github/workflows/'+LIVE_WORKFLOW)||
    run.html_url!=='https://github.com/maloney2323/Reality/actions/runs/'+LIVE_RUN||
    !Array.isArray(jobs)||jobs.length!==1||
    jobs[0]?.name!=='actual-original-github-readonly'||
    jobs[0].status!=='completed'||jobs[0].conclusion!=='success')
   fail('ORIGINAL_EXECUTOR_LIVE_GITHUB_EXECUTION_NOT_INDEPENDENTLY_VERIFIED');
 return Object.freeze({
  version:ORIGINAL_EXECUTOR_RUN_MONITOR_VERSION,
  original_work_id:ORIGINAL_OWNER_WORK_ID,
  status:'REALITY_MODEL_EXECUTOR_LIVE_GITHUB_READ_ONLY_VERIFIED',
  run_id:LIVE_RUN,run_url:run.html_url,
  model_generated_executor_sha256:ACCEPTED_MODEL_SHA256,
  model_generated:true,independent_behavioral_cases_passed:10,
  independent_behavioral_cases_total:10,
  live_github_read_only_execution_verified:true,
  original_source_already_fixed_before_model_install:true,
  original_repair_performed_by_reality:false,
  external_github_write_performed:false,
  evidence_type:'EXTERNAL_PINNED_GITHUB_ACTIONS_EVIDENCE_NOT_YET_OWNER_WARRANTED',
  owner_warrant_issued:false,owner_install_authorized:false,
  installed_capability:false,original_job_completed:false,
 });
}

const PACKAGE_RUN=40762950798;
const PACKAGE_CI_NAME='Reality Corrected Original Executor Frozen and Holdout Verification v0.3';
const PACKAGE_CI_SHA='52de4566fd1317e53c62615b69fc847803512e92';
const PACKAGE_CI_FILE='reality-original-executor-corrected-holdout-recheck-v0.3.yml';
const PACKAGE_CANDIDATE='88d4bba7f2ddf0c7331ddfcc0621b4a13739326451cb53d41ad807c97bceb9b2';
const PACKAGE_SOURCE='61df9fc02b2cc342b19fb61a82b961d773499628caf47b9b1647ea3675299d17';
export function projectVerifiedOriginalExecutorPackage({run,jobs}={}){
 if(run?.id!==PACKAGE_RUN||run.name!==PACKAGE_CI_NAME||
    run.head_sha!==PACKAGE_CI_SHA||run.head_branch!==BRANCH||
    run.status!=='completed'||run.conclusion!=='success'||run.event!=='push'||
    run.repository?.full_name!=='maloney2323/Reality'||
    run.head_repository?.full_name!=='maloney2323/Reality'||
    !String(run.path||'').endsWith('.github/workflows/'+PACKAGE_CI_FILE)||
    run.html_url!=='https://github.com/maloney2323/Reality/actions/runs/'+PACKAGE_RUN||
    !Array.isArray(jobs)||jobs.length!==1||
    jobs[0]?.name!=='verify-original-model-executor'||
    jobs[0]?.status!=='completed'||jobs[0]?.conclusion!=='success')
   fail('ORIGINAL_EXECUTOR_PACKAGE_CI_NOT_INDEPENDENTLY_VERIFIED');
 return Object.freeze({
  version:ORIGINAL_EXECUTOR_RUN_MONITOR_VERSION,
  original_work_id:ORIGINAL_OWNER_WORK_ID,
  status:'REALITY_MODEL_EXECUTOR_INSTALLABLE_PACKAGE_14_OF_14_VERIFIED',
  run_id:PACKAGE_RUN,run_url:run.html_url,head_sha:PACKAGE_CI_SHA,
  model_generated_executor_sha256:PACKAGE_SOURCE,
  installable_candidate_sha256:PACKAGE_CANDIDATE,
  package_file_count:2,
  independent_behavioral_cases_passed:10,independent_behavioral_cases_total:10,
  independent_security_holdout_passed:4,independent_security_holdout_total:4,
  actual_github_read_only_execution_run:40760732281,
  live_github_read_only_execution_verified:true,
  model_self_correction_completed:true,corrected_independent_sandbox_passed:true,
  installation_package_verified:true,original_source_already_fixed_before_model_install:true,
  evidence_type:'EXTERNAL_PINNED_GITHUB_PACKAGE_PROOF_REQUIRES_SIGNED_OWNER_WARRANT',
  owner_warrant_issued:false,owner_install_authorized:false,
  installed_capability:false,original_job_completed:false,
 });
}

export async function originalExecutorReadOnlyGet(path){
 const prefix='/repos/maloney2323/Reality/actions/';
 if(!path.startsWith(prefix))throw Error('ORIGINAL_EXECUTOR_MONITOR_PATH_DENIED');
 const r=await fetch('https://api.github.com'+path,{
  headers:{accept:'application/vnd.github+json','User-Agent':'Reality-Original-Monitor'},
  redirect:'error',signal:AbortSignal.timeout(12000),
 });
 if(!r.ok)throw Error('ORIGINAL_EXECUTOR_MONITOR_READ_UNAVAILABLE');
 return r.json();
}
export async function inspectOriginalExecutorRun({
 session,conversationId,env=process.env,
 context=originalOwnerContext,get=originalExecutorReadOnlyGet
}={}){
 if(env?.VERCEL_ENV!=='preview')
  fail('ORIGINAL_EXECUTOR_PREVIEW_ONLY');
 const owner=await context({session,conversationId,env});
 if(owner?.original_work_id!==ORIGINAL_OWNER_WORK_ID||
    owner?.owner_id!==session?.user_id||owner?.owner_goal_confirmed!==true)
  fail('ORIGINAL_EXECUTOR_ORIGINAL_SIGNED_IN_OWNER_REQUIRED');
 const run=await get(ROOT+'/actions/runs/'+PACKAGE_RUN);
 const listing=await get(ROOT+'/actions/runs/'+PACKAGE_RUN+'/jobs?per_page=50');
 if(!Array.isArray(listing?.jobs)||listing.jobs.length!==1||listing.total_count!==1)
  fail('ORIGINAL_EXECUTOR_MONITOR_EXACT_RUN_JOBS_UNAVAILABLE');
 return projectVerifiedOriginalExecutorPackage({run,jobs:listing.jobs});
}
