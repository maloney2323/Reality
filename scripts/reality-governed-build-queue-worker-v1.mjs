// Reality's isolated, no-write worker admission and discovery. Work requests
// arrive through an authenticated server GitHub commit, NEVER as model prompts.
// Only publicly grounded GitHub evidence is fetched; owner details stay in
// the private Continuity queue. A historical fix cannot be claimed as new work.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {executeOriginalMaintenanceRepair}
 from '../src/reality-extensions/reality-original-maintenance-executor.mjs';
import {readPublicOriginal143GitHubEvidence}
 from '../src/reality-original-143-public-evidence-v0.1.js';

const ROOT='/repos/maloney2323/Reality/';
const WORK143='work:24cda9611404e9bcb47909976067605c';
const fail=code=>{throw Error(code)};
const changed=execFileSync('git',['diff','--name-only','HEAD^','HEAD'],{
 encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
if(changed.length!==1||
 !/^reality-requests\/[0-9a-f-]{36}\.json$/.test(changed[0]))
 fail('REALITY_WORKER_ONE_PINNED_REQUEST_REQUIRED');
const request=JSON.parse(readFileSync(changed[0],'utf8'));
if(Object.keys(request).sort().join(',')!==
 ['issue_number','original_work_id','queue_id','schema'].sort().join(',')||
 request.schema!=='reality-isolated-build-request-v1'||
 typeof request.queue_id!=='string'||
 !/^[0-9a-f]{8}-[0-9a-f-]{27,28}$/.test(request.queue_id)||
 !/^work:[a-f0-9]{32}$/.test(request.original_work_id)||
 !Number.isInteger(request.issue_number)||request.issue_number<=0||
 request.issue_number>100000)
 fail('REALITY_WORKER_UNTRUSTED_QUEUE_REQUEST');
const issueResponse=await fetch('https://api.github.com'+ROOT+'issues/'+request.issue_number,{
 method:'GET',redirect:'error',cache:'no-store',headers:{
  accept:'application/vnd.github+json','x-github-api-version':'2022-11-28',
  'user-agent':'Reality-isolated-build-worker-read-only'}});
if(!issueResponse.ok)fail('REALITY_WORKER_ISSUE_PROVIDER_UNAVAILABLE');
const issue=await issueResponse.json();
if(issue.number!==request.issue_number||issue.state!=='open'||
 issue.repository_url!=='https://api.github.com/repos/maloney2323/Reality')
 fail('REALITY_WORKER_PROVIDER_ISSUE_READBACK_INVALID');
const sha=createHash('sha256').update(JSON.stringify(request)).digest('hex');
let result;
if(issue.number===143&&request.original_work_id===WORK143){
 const evaluated=await executeOriginalMaintenanceRepair({
  workId:WORK143,
  get:async path=>readPublicOriginal143GitHubEvidence(path,{env:{VERCEL_ENV:'preview'}}),
 });
 if(evaluated.status!=='PREEXISTING_FIX_NOT_EXECUTED_BY_REALITY'||
   evaluated.external_write_performed!==false||
   evaluated.original_job_completed!==false)
  fail('REALITY_WORKER_HISTORICAL_RECONCILIATION_UNVERIFIED');
 result={phase:'BLOCKED_OWNER_AUTHORITY',
  gap_type:'PREEXISTING_REPAIR_REQUIRES_EXACT_OWNER_APPROVAL',
  model_code_generation_needed:false,
  model_code_generation_performed:false,
  verified_source_already_fixed:true,
  real_original_executor_ran:true,
  historical_repair_authored_by_reality:false};
}else{
 // A GitHub issue and a job ID alone do NOT prove a missing capability.
 // A real independent failing test or verified provider receipt must be
 // attached before the model generator/sandbox can be invoked.
 result={phase:'BLOCKED_MISSING_EVIDENCE',
  gap_type:'NO_INDEPENDENTLY_REPRODUCED_CAPABILITY_FAILURE',
  model_code_generation_needed:'NOT_YET_PROVEN',
  model_code_generation_performed:false,
  real_original_executor_ran:false};
}
mkdirSync('reality-worker-result',{recursive:true});
const receipt={
 version:'reality-isolated-worker-discovery-v1',
 queue_id:request.queue_id,original_work_id:request.original_work_id,
 issue_number:request.issue_number,
 request_sha256:sha,
 repository_sha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 run_id:process.env.GITHUB_RUN_ID||null,
 production_changed:false,
 github_writes_by_worker:false,
 capability_registered:false,
 original_job_settled:false,
 ...result};
writeFileSync('reality-worker-result/receipt.json',JSON.stringify(receipt,null,2)+'\n');
console.log('REALITY_GOVERNED_WORKER_DISCOVERY',JSON.stringify({
 phase:receipt.phase,run_id:receipt.run_id,
 model_code_generation_performed:receipt.model_code_generation_performed,
 original_job_settled:false,source_sha256:sha}));
