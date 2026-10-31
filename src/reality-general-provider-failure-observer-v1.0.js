// Generic read-only, actual-provider failure inspection for the existing
// Reality governed build worker. Issue text is UNTRUSTED: it can nominate a
// GitHub Actions URL but cannot assert a failure, approve anything, choose a
// different repo, or authorize code execution. Only GitHub run/job readback
// establishes an observed CI failure. It does not establish a missing
// capability without separately frozen/reproduced acceptance evidence.
import {createHash} from 'node:crypto';
export const GENERAL_PROVIDER_FAILURE_OBSERVER_VERSION='reality-general-provider-failure-v1.0';
const REPO='maloney2323/Reality';
const ROOT='https://api.github.com/repos/'+REPO+'/';
const fail=code=>{throw Error('GENERAL_WORKER_'+code)};
const runRef=/https:\/\/github\.com\/maloney2323\/Reality\/actions\/runs\/([1-9][0-9]{0,14})(?![0-9])/g;
const sha=x=>/^[a-f0-9]{40}$/.test(String(x||''));
const outcome=(state,data={})=>Object.freeze({
 version:GENERAL_PROVIDER_FAILURE_OBSERVER_VERSION,
 state,source:'GITHUB_INDEPENDENT_PROVIDER_READBACK',
 independently_verified_provider_failure:false,
 independently_verified_missing_capability:false,
 model_generated:false,sandbox_verified:false,
 installed:false,original_job_settled:false,production_changed:false,
 ...data,
});
async function jsonResource(relative,{token,fetchImpl}){
 if(!/^[A-Za-z0-9_/?.=&%-]+$/.test(relative))fail('INVALID_PROVIDER_RESOURCE');
 const headers={accept:'application/vnd.github+json',
  'x-github-api-version':'2022-11-28',
  'user-agent':'Reality-general-provider-failure-v1'};
 if(typeof token==='string'&&token.length>10)headers.authorization='Bearer '+token;
 const response=await fetchImpl(ROOT+relative,{
  method:'GET',redirect:'error',cache:'no-store',headers});
 if(!response?.ok)fail('PROVIDER_READBACK_UNAVAILABLE');
 const data=await response.json();
 if(!data||typeof data!=='object')fail('PROVIDER_RESPONSE_INVALID');
 return data;
}
export async function observeRealityIssueFailure({
 issueNumber,originalWorkId,token,fetchImpl=fetch,
}={}){
 if(!Number.isInteger(issueNumber)||issueNumber<1||issueNumber>100000||
  !/^work:[a-f0-9]{32}$/.test(String(originalWorkId||'')))
  fail('REQUEST_SCOPE_INVALID');
 const issue=await jsonResource('issues/'+issueNumber,{token,fetchImpl});
 if(issue.number!==issueNumber||issue.state!=='open'||
  issue.repository_url!=='https://api.github.com/repos/'+REPO||
  issue.pull_request)
  fail('ISSUE_PROVIDER_SCOPE_INVALID');
 // The URL is only a nomination, not proof. Do not trust prose instructions
 // inside an issue or treat a past successful build as a failure.
 const links=[...new Set([...String(issue.body||'').matchAll(runRef)]
  .map(x=>Number(x[1])))].slice(0,5);
 if(!links.length)return outcome('BLOCKED_NO_VERIFIABLE_CI_RUN_LINK',{
  issue_number:issueNumber,original_work_id:originalWorkId,
  blocker:'ATTACH_ACTUAL_FAILED_GITHUB_ACTIONS_RUN_TO_ISSUE',
 });
 const checked=[];
 for(const id of links){
  if(!Number.isSafeInteger(id))continue;
  let run;
  try{run=await jsonResource('actions/runs/'+id,{token,fetchImpl})}catch{
   checked.push({run_id:id,reason:'READBACK_UNAVAILABLE'});continue;
  }
  if(run.id!==id||run.head_repository?.full_name!==REPO||
     !sha(run.head_sha)||run.status!=='completed'||
     run.conclusion!=='failure'||!['push','pull_request','workflow_dispatch'].includes(run.event)){
   checked.push({run_id:id,reason:'NOT_VERIFIED_SAME_REPO_FAILED_RUN'});continue;
  }
  const jobs=await jsonResource('actions/runs/'+id+'/jobs?per_page=100',{token,fetchImpl});
  if(!Array.isArray(jobs.jobs)||jobs.jobs.length>100)
   fail('JOB_READBACK_AMBIGUOUS');
  const failed=jobs.jobs.filter(job=>job.run_id===id&&
   job.head_sha===run.head_sha&&job.conclusion==='failure'&&
   Number.isSafeInteger(job.id)&&job.id>0&&
   Array.isArray(job.steps)&&job.steps.some(step=>step.conclusion==='failure'));
  if(!failed.length){
   checked.push({run_id:id,reason:'NO_INDEPENDENT_FAILED_STEP'});continue;
  }
  const receipt={
   issue_number:issueNumber,original_work_id:originalWorkId,
   run_id:id,run_url:'https://github.com/'+REPO+'/actions/runs/'+id,
   source_sha:run.head_sha,workflow_name:String(run.name||'').slice(0,160),
   failed_jobs:failed.map(job=>({
    job_id:job.id,name:String(job.name||'').slice(0,120),
    failed_steps:job.steps.filter(step=>step.conclusion==='failure')
     .map(step=>String(step.name||'').slice(0,160)).slice(0,20),
   })).slice(0,12),
  };
  const witnessHash=createHash('sha256')
   .update(JSON.stringify(receipt)).digest('hex');
  return outcome('VERIFIED_FAILED_CI_AWAITING_FROZEN_REPRODUCTION',{
   ...receipt,source_evidence_sha256:witnessHash,
   independently_verified_provider_failure:true,
   independently_verified_missing_capability:false,
   next:'FREEZE_AND_REPRODUCE_FAILURE_BEFORE_MODEL_GENERATION',
  });
 }
 return outcome('BLOCKED_NO_FAILED_RUN_EVIDENCE',{
  issue_number:issueNumber,original_work_id:originalWorkId,
  checked_runs:checked,
  blocker:'NO_PROVIDER_VERIFIED_FAILURE_FOR_ORIGINAL_WORK',
 });
}
