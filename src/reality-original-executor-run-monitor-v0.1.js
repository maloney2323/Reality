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
    !String(run.path||'').includes('/.github/workflows/'+ACCEPTED_WORKFLOW)||
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

export async function inspectOriginalExecutorRun({
 session,conversationId,env=process.env,
 context=originalOwnerContext,get=githubGet
}={}){
 if(env?.VERCEL_ENV!=='preview')
  fail('ORIGINAL_EXECUTOR_PREVIEW_ONLY');
 const owner=await context({session,conversationId,env});
 if(owner?.original_work_id!==ORIGINAL_OWNER_WORK_ID||
    owner?.owner_id!==session?.user_id||owner?.owner_goal_confirmed!==true)
  fail('ORIGINAL_EXECUTOR_ORIGINAL_SIGNED_IN_OWNER_REQUIRED');
 const list=await get(ROOT+'/actions/runs?branch='+encodeURIComponent(BRANCH)+'&per_page=30');
 if(!Array.isArray(list?.workflow_runs)||list.workflow_runs.length>30)
  fail('ORIGINAL_EXECUTOR_PROVIDER_RUN_LIST_UNVERIFIED');
 const accepted=list.workflow_runs.filter(x=>
  x.id===ACCEPTED_RUN&&x.name===ACCEPTED_NAME&&
  x.head_sha===ACCEPTED_COMMIT&&
  x.repository?.full_name==='maloney2323/Reality'&&
  x.head_repository?.full_name==='maloney2323/Reality');
 if(accepted.length===1){
  const exact=accepted[0];
  const checked=await get(ROOT+'/actions/runs/'+ACCEPTED_RUN+'/jobs?per_page=50');
  if(!Array.isArray(checked?.jobs)||checked.jobs.length!==1||checked.total_count!==1)
   fail('ORIGINAL_EXECUTOR_ACCEPTED_RUN_JOB_READBACK_REQUIRED');
  return projectAcceptedOriginalExecutorRun({run:exact,jobs:checked.jobs});
 }
 const candidates=list.workflow_runs.filter(x=>x.name===NAME&&
  typeof x.path==='string'&&x.path.includes('/.github/workflows/'+WORKFLOW)&&
  x.repository?.full_name==='maloney2323/Reality'&&
  x.head_repository?.full_name==='maloney2323/Reality');
 if(!candidates.length)
  return Object.freeze({status:'REALITY_AUTONOMOUS_EXECUTOR_NOT_STARTED',
   original_work_id:ORIGINAL_OWNER_WORK_ID,owner_warrant_issued:false,
   original_job_completed:false,installed_capability:false});
 candidates.sort((a,b)=>b.id-a.id);
 const run=candidates[0];
 const listed=await get(ROOT+'/actions/runs/'+run.id+'/jobs?per_page=50');
 if(!Array.isArray(listed?.jobs)||listed.jobs.length>8||listed.total_count>50)
  fail('ORIGINAL_EXECUTOR_PROVIDER_JOBS_UNVERIFIED');
 return projectOriginalExecutorRun({run,jobs:listed.jobs});
}
