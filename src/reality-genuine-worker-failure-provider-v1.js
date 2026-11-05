// Reality foundation: independent, bounded provider failure evidence only.
// Never execute a job, invoke a model, or turn workflow failure into a gap.
// Actual source comes from signed worker's GitHub GET, not model/user text.
import {createHash} from 'node:crypto';
const SHA=/^[a-f0-9]{40}$/, WORK=/^work:[a-f0-9]{32}$/;
const REPO='maloney2323/Reality';
const PATH='.github/workflows/reality-genuine-capability-auto-trigger-v1.yml';
const BRANCH='feature/reality-general-capability-engine-20261101';
const fail=code=>{throw Error('GENUINE_FAILURE_PROVIDER_'+code)};
export function verifyGenuineOriginalWorkerFailure({
 scope,run,jobs,
}={}){
 if(scope?.status!=='ESCALATED_OWNER_ORIGINAL_WORK_VERIFIED'||
    !WORK.test(String(scope.original_work_id||''))||
    !/^[a-f0-9-]{36}$/.test(String(scope.trigger_id||''))||
    !Number.isSafeInteger(scope.failed_run_id)||scope.failed_run_id<1||
    scope.record_allowed!==true||
    scope.model_invocation_authorized!==false||
    scope.installation_authorized!==false||
    scope.production_changed!==false)
  fail('TRUSTED_EXISTING_ORIGINAL_SCOPE_REQUIRED');
 if(!run||run.id!==scope.failed_run_id||run.status!=='completed'||
    run.conclusion!=='failure'||!SHA.test(String(run.head_sha||''))||
    run.path!==PATH||run.head_branch!==BRANCH||
    run.head_repository?.full_name!==REPO)
  fail('SAME_SIGNED_WORKFLOW_PROVIDER_RUN_REQUIRED');
 if(!Array.isArray(jobs?.jobs)||jobs.jobs.length<1||jobs.jobs.length>100)
  fail('COMPLETE_BOUNDED_PROVIDER_JOB_READBACK_REQUIRED');
 const failed=jobs.jobs.filter(job=>
   job.name==='resume_original_job'&&
   job.status==='completed'&&job.conclusion==='failure'&&
   job.run_id===run.id&&
   job.steps?.some(step=>
     step.name==='Execute original frozen acceptance against installed source'&&
     step.conclusion==='failure'));
 if(failed.length!==1||!Number.isSafeInteger(failed[0].id)||
    failed[0].id<1)
  fail('EXACT_FAILED_ORIGINAL_RESUME_STAGE_REQUIRED');
 const pinned={
  source:'INDEPENDENT_GITHUB_ACTIONS_PROVIDER_READBACK',
  repository:REPO,workflow_path:PATH,
  original_work_id:scope.original_work_id,
  trigger_id:scope.trigger_id,
  failed_run_id:run.id,failed_job_id:failed[0].id,
  failed_run_sha:run.head_sha,
  stage:'resume_original_job',
  failed_step:'Execute original frozen acceptance against installed source',
  provider_run_conclusion:'failure',
  provider_job_conclusion:'failure',
  model_gap_verified:false,installation_authorized:false,
  original_job_completed:false,production_changed:false
 };
 const provider_evidence_sha256=createHash('sha256')
   .update(JSON.stringify(Object.fromEntries(Object.keys(pinned).sort().map(
      key=>[key,pinned[key]])))).digest('hex');
 return Object.freeze({...pinned,
  provider_evidence_sha256,read_only:true,independently_verified:true,
  retry_external_effects_authorized:false,
  outcome:'SIGNED_FAILED_ORIGINAL_WORKER_REQUIRES_GOVERNED_TRIAGE'});
}
