// 12 independent real CI operating investigations, not test fixtures.
// Cross-check current provider run, failed job, and evidence. No writes to GitHub.
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
const e=process.env;
const REPO='maloney2323/Reality', BRANCH='feature/reality-general-capability-engine-20261101';
const fatal=s=>{throw Error('REALITY_MEGATEST_CI_'+s)};
if(e.GITHUB_ACTIONS!=='true'||e.GITHUB_REPOSITORY!==REPO||
 e.GITHUB_EVENT_NAME!=='push'||e.GITHUB_REF!=='refs/heads/'+BRANCH||
 !/^[a-f0-9]{40}$/.test(e.GITHUB_SHA||'')||!e.GH_TOKEN||
 !/^[1-9][0-9]{7,17}$/.test(e.GITHUB_RUN_ID||''))fatal('SIGNED_ISOLATED_SOURCE_REQUIRED');
const workflows=[
 'reality-real-gap-acceptance-before-model-v1.yml',
 'reality-install-to-settlement-v1.yml',
 'reality-work-center-owner-approval-ui-v1.yml',
 'reality-genuine-capability-engine-v1.yml',
 'reality-governed-execution-engine-v0.1.yml',
 'reality-governed-work-runtime-v0.1.yml',
 'reality-continuity-spine-v2.yml',
 'reality-continuous-reliability-v0.1.yml',
 'reality-general-repair-provider-execution-v1.yml',
 'reality-general-repair-no-hardcoded-job-v1.yml',
 'reality-real-job-self-repair-handoff-v1.yml',
 'reality-recovery-live-preview-contract.yml',
];
const hash=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const url=path=>'https://api.github.com/repos/'+REPO+path;
async function api(path){
 const res=await fetch(url(path),{redirect:'error',cache:'no-store',
  headers:{authorization:'Bearer '+e.GH_TOKEN,accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28','user-agent':'Reality-mega-CI-operations-v1'}});
 if(!res.ok)fatal('PROVIDER_SOURCE_'+res.status+'_'+path.slice(0,30));
 return res.json();
}
const started=Date.now();let previous_hash='0'.repeat(64);
const pages=await Promise.all([1,2,3,4,5].map(page=>
 api('/actions/runs?per_page=100&page='+page)));
if(pages.some(x=>!Array.isArray(x.workflow_runs)))fatal('GITHUB_HISTORY_WINDOW_UNAVAILABLE');
const providerRuns=pages.flatMap(x=>x.workflow_runs).filter(x=>x.head_branch===BRANCH);
const investigations=[];
for(let i=0;i<workflows.length;i++){
 const file=workflows[i];
 const headPath=await api('/contents/.github/workflows/'+file+'?ref='+e.GITHUB_SHA);
 if(headPath.path!=='.github/workflows/'+file)
   fatal('WORKFLOW_PROVIDER_SOURCE_UNVERIFIED');
 const runs=providerRuns.filter(x=>x.path==='.github/workflows/'+file);
 const latest=runs[0]||null;
 const completed=runs.find(x=>x.status==='completed')||null;
 const failing=runs.find(x=>x.status==='completed'&&x.conclusion==='failure')||null;
 if(latest&&(latest.path!=='.github/workflows/'+file||
   latest.head_branch!==BRANCH||!/^https:\/\/github\.com\/maloney2323\/Reality\/actions\/runs\/\d+$/.test(latest.html_url)))
  fatal('PROVIDER_RUN_SCOPE_INVALID');
 let failedJobNames=[], failurePattern='NOT_OBSERVED',jobReadback=false;
 if(completed?.conclusion==='failure'){
  const jobs=await api('/actions/runs/'+completed.id+'/jobs?per_page=100');
  if(!Array.isArray(jobs.jobs))fatal('FAILED_JOB_READBACK_MISSING');
  failedJobNames=jobs.jobs.filter(x=>x.conclusion==='failure').map(x=>x.name).slice(0,8);
  jobReadback=true;
  failurePattern=failedJobNames.length?'CURRENT_COMPLETED_RUN_FAILED':'FAILURE_IN_UNINSPECTED_JOB_OR_WORKFLOW';
 }
 const needsReview=(!latest||completed?.conclusion==='failure'||
  completed===null||latest.status!=='completed');
 const conclusion=completed?.conclusion??'NO_COMPLETED_RUN';
 const task={
  job_id:'ci-audit:'+file,
  source_workflow_path:'.github/workflows/'+file,
  current_workflow_exists:true,
  latest_run_id:latest?.id??null,latest_run_url:latest?.html_url??null,
  latest_run_status:latest?.status??'NOT_PRESENT_IN_LAST_500_RUNS',
  observation_window:'LATEST_500_REPOSITORY_WORKFLOW_RUNS',
  latest_completed_run_id:completed?.id??null,
  latest_completed_conclusion:conclusion,
  last_failed_run_id:failing?.id??null,
  latest_failure_jobs:failedJobNames,
  failure_type:failurePattern,
  latest_completed_failed_jobs_readback:jobReadback,
  current_failure_not_assumed_from_old_run:true,
  disposition:needsReview?'NEEDS_CURRENT_PROVIDER_TRIAGE':'LATEST_COMPLETED_NO_FAILURE',
  provider_readback_verified:true,
  human_review_required_for_fix:true,
  owner_approval_implied:false,
  external_change_executed:false,
  customer_job_completed:false,
  parent_receipt_hash:previous_hash
 };
 const receipt_hash=hash(task);
 investigations.push({...task,receipt_hash});
 previous_hash=receipt_hash;
}
if(investigations.length!==12||new Set(investigations.map(x=>x.job_id)).size!==12||
 investigations.some(x=>x.external_change_executed!==false||x.owner_approval_implied!==false))
 fatal('NOT_TWELVE_DISTINCT_SAFE_OPERATIONS');
const report={
 schema:'reality-megatest-12-live-provider-operational-audits-v1',
 git_run_id:Number(e.GITHUB_RUN_ID),
 repository_sha:e.GITHUB_SHA,
 investigations:investigations.length,
 completed_with_source_readback:12,
 current_provider_failures:investigations.filter(x=>x.latest_completed_conclusion==='failure').length,
 source_current_review_needed:investigations.filter(x=>x.disposition==='NEEDS_CURRENT_PROVIDER_TRIAGE').length,
 historical_failure_refs_observed:investigations.filter(x=>x.last_failed_run_id!==null).length,
 investigation_elapsed_ms:Date.now()-started,
 first_parent_hash:'0'.repeat(64),last_receipt_hash:previous_hash,
 cases:investigations,
 owner_approvals_issued:0,external_changes:0,production_changed:false,
 actual_human_time_saved_minutes:null,verified_dollars_saved:null,
 proof_scope:'12_REAL_READ_ONLY_CI_OPERATIONS',
 };
mkdirSync('artifact/out',{recursive:true});
writeFileSync('artifact/out/reality-mega-current-ci-operations.json',JSON.stringify(report,null,2)+'\n');
console.log('REALITY_MEGA_12_REAL_PROVIDER_OPERATIONAL_AUDITS',
 JSON.stringify({cases:12,current_provider_failures:report.current_provider_failures,
  review_needed:report.source_current_review_needed,
  elapsed_ms:report.investigation_elapsed_ms,
  receipts_hash:previous_hash,production_changed:false}));
