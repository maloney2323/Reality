// Riley's first real (but read-only) engineering investigation.
// One bounded provider-backed question: is a tracked CI failure still current?
// This module cannot create work, edit issues, call a model or install code.
import {createHash} from 'node:crypto';
export const RILEY_FIRST_EVIDENCE_AUDIT_VERSION='reality-riley-engineering-audit-v1';
const REPO='maloney2323/Reality';
const API='https://api.github.com/repos/'+REPO;
const RUN=/^https:\/\/github\.com\/maloney2323\/Reality\/actions\/runs\/([1-9]\d*)$/;
const ISSUE=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/([1-9]\d*)$/;
const SHA=/^[a-f0-9]{40}$/;
const fail=code=>{throw Error('RILEY_AUDIT_'+code)};
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
async function get(path,{fetchImpl,token}){
 if(!/^\/(?:issues\/[1-9]\d*|actions\/workflows\?per_page=100|actions\/workflows\/[1-9]\d*\/runs\?per_page=50|actions\/runs\/[1-9]\d*)$/.test(path))
  fail('PROVIDER_RESOURCE_DENIED');
 const response=await fetchImpl(API+path,{
  method:'GET',cache:'no-store',redirect:'error',
  headers:{
   accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-Riley-ReadOnly-Pilot-v1',
   ...(typeof token==='string'&&token.length>15?{authorization:'Bearer '+token}:{})
  }
 });
 if(!response?.ok)fail('PROVIDER_READBACK_FAILED');
 const body=await response.json().catch(()=>null);
 if(!body||typeof body!=='object'||Array.isArray(body))fail('PROVIDER_RESPONSE_UNTRUSTED');
 return body;
}
function instant(x){const value=Date.parse(x||'');return Number.isFinite(value)?value:null}
function proveRun(x,workflowId,name){
 if(!Number.isSafeInteger(x?.id)||x.id<=0||x.workflow_id!==workflowId||
  x.name!==name||x.head_repository?.full_name!==REPO||
  !SHA.test(x.head_sha)||x.status!=='completed'||
  !['success','failure','cancelled','timed_out','skipped','action_required'].includes(x.conclusion)||
  !RUN.test(String(x.html_url||''))||Number(RUN.exec(x.html_url)[1])!==x.id||
  !['push','pull_request','workflow_dispatch','schedule','workflow_run'].includes(x.event))
  fail('WORKFLOW_RUN_IDENTITY_UNVERIFIED');
 const at=instant(x.updated_at||x.created_at);
 if(at===null)fail('RUN_TIME_UNVERIFIED');
 return Object.freeze({id:x.id,url:x.html_url,
  sha:x.head_sha,status:x.conclusion,at:new Date(at).toISOString(),
  event:x.event});
}
export async function auditRealityEngineeringIssue({
 issueNumber,workflowName,sourceCommitSha,sourceRunId,
 fetchImpl=fetch,token
}={}){
 if(!Number.isInteger(issueNumber)||issueNumber<1||issueNumber>100000||
  typeof workflowName!=='string'||workflowName.length<8||workflowName.length>140||
  !/^[A-Za-z0-9 _().—:-]+$/.test(workflowName)||!SHA.test(sourceCommitSha)||
  !Number.isSafeInteger(sourceRunId)||sourceRunId<1)
  fail('SCOPED_INVESTIGATION_REQUIRED');
 const issue=await get('/issues/'+issueNumber,{fetchImpl,token});
 if(issue.number!==issueNumber||!['open','closed'].includes(issue.state)||
  issue.pull_request||
  issue.repository_url!=='https://api.github.com/repos/'+REPO||
  !ISSUE.test(String(issue.html_url||''))||Number(ISSUE.exec(issue.html_url)[1])!==issueNumber||
  typeof issue.title!=='string'||!issue.title.trim())
  fail('ISSUE_IDENTITY_UNVERIFIED');
 // A tracked issue may nominate historic workflow runs. Issue prose grants NO
 // authority, but a provider-verified run can identify the exact workflow even
 // when the repo has >100 workflows and the first listing page omits it.
 const nominated=[...new Set(
  [...String(issue.body||'').matchAll(
   /https:\/\/github\.com\/maloney2323\/Reality\/actions\/runs\/([1-9]\d{0,15})\b/g)]
   .map(x=>Number(x[1])).filter(Number.isSafeInteger)
 )].slice(0,8);
 let workflow=null,workflowResolution=null,providerNominatedRun=null;
 let workflowCatalogIncomplete=false;
 for(const runId of nominated){
  let raw;
  try{raw=await get('/actions/runs/'+runId,{fetchImpl,token})}
  catch{continue}
  if(raw?.name!==workflowName||
     !Number.isSafeInteger(raw.workflow_id)||raw.workflow_id<1)
   continue;
  try{
   const trusted=proveRun(raw,raw.workflow_id,workflowName);
   workflow={id:raw.workflow_id,name:workflowName};
   workflowResolution='ISSUE_LINK_RECONFIRMED_BY_GITHUB_ACTIONS_PROVIDER';
   providerNominatedRun=trusted.url;
   break;
  }catch{}
 }
 if(!workflow){
  const listing=await get('/actions/workflows?per_page=100',{fetchImpl,token});
  if(!Array.isArray(listing.workflows)||listing.workflows.length>100||
    !Number.isSafeInteger(listing.total_count)||
    listing.total_count<listing.workflows.length)
   fail('WORKFLOW_LIST_UNVERIFIED');
  const matches=listing.workflows.filter(x=>x.name===workflowName&&
   Number.isSafeInteger(x.id)&&x.id>0);
  if(matches.length!==1)
   fail(matches.length?'DUPLICATE_WORKFLOW_NAMES':'WORKFLOW_NOT_FOUND_IN_BOUNDED_SCAN');
  workflow=matches[0];
  workflowCatalogIncomplete=listing.total_count>listing.workflows.length;
  workflowResolution='GITHUB_ACTIONS_WORKFLOW_CATALOG_MATCH';
 }

 const runsResponse=await get('/actions/workflows/'+workflow.id+'/runs?per_page=50',
  {fetchImpl,token});
 if(!Array.isArray(runsResponse.workflow_runs)||runsResponse.workflow_runs.length>50||
  !Number.isSafeInteger(runsResponse.total_count)||
  runsResponse.total_count<runsResponse.workflow_runs.length)
  fail('WORKFLOW_RUNS_READBACK_INVALID');
 const observed=runsResponse.workflow_runs.filter(x=>x.status==='completed')
  .map(x=>proveRun(x,workflow.id,workflowName));
 if(new Set(observed.map(x=>x.id)).size!==observed.length)
  fail('DUPLICATE_RUNS_IN_READBACK');
 observed.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)||b.id-a.id);
 const latest=observed[0]||null;
 const success=observed.find(x=>x.status==='success')||null;
 const failedAfterSuccess=observed.filter(x=>
  ['failure','timed_out'].includes(x.status)&&
  (!success||Date.parse(x.at)>Date.parse(success.at)));
 let finding;
 if(issue.state==='closed')finding='ISSUE_CLOSED_REQUIRES_NO_NEW_EXECUTION';
 else if(failedAfterSuccess.length>=2)finding='REPEATED_FAILURES_NEED_FROZEN_REPRODUCTION';
 else if(failedAfterSuccess.length===1)finding='SINGLE_FAILURE_NEEDS_REPRODUCTION';
 else if(success&&observed.some(x=>['failure','timed_out'].includes(x.status)))
  finding='RECENT_SUCCESS_AFTER_HISTORICAL_FAILURES';
 else if(success)finding='NO_CURRENT_FAILURE_IN_BOUNDED_SAMPLE';
 else finding='CURRENT_FAILURE_NOT_VERIFIED_IN_BOUNDED_SAMPLE';
 const evidence={
  version:RILEY_FIRST_EVIDENCE_AUDIT_VERSION,
  status:'REAL_PROVIDER_INVESTIGATION_COMPLETED_READ_ONLY',
  employee:'Riley',employee_function_id:'software_engineering',
  category:'reliability',investigation_kind:'CI_FAILURE_CURRENCY',
  source_scope:'REALITY_GITHUB_REPOSITORY_ONLY',
  issue_number:issueNumber,issue_title:issue.title.slice(0,250),
  issue_url:issue.html_url,issue_provider_state:issue.state,
  workflow_name:workflowName,workflow_id:workflow.id,
  workflow_resolution_source:workflowResolution,
  provider_verified_issue_nominated_run:providerNominatedRun,
  workflow_runs_observed:observed.length,
  incomplete_workflow_runs_in_sample:runsResponse.workflow_runs.length-observed.length,
  workflow_runs_total_provider:runsResponse.total_count,
  workflow_runs_scan_limited:runsResponse.total_count>observed.length||
   workflowCatalogIncomplete,
  latest_run:latest,latest_success:success,
  fresh_failure_count:failedAfterSuccess.length,
  fresh_failure_refs:failedAfterSuccess.slice(0,10).map(x=>x.url),
  finding,read_only:true,
  owner_shift_authorized:false,
  original_job_admitted:false,
  original_work_id:null,
  independently_verified_defect:false,
  missing_capability_verified:false,
  model_generation_performed:false,
  capability_installed:false,original_job_settled:false,
  human_hours_saved:null,automation_cost_usd:null,
  no_production_change:true,
  next_action:issue.state==='closed'?'DO_NOT_REUSE_CLOSED_JOB':
   failedAfterSuccess.length?'FREEZE_AND_REPRODUCE_BEFORE_GOVERNED_REPAIR':
   'DO_NOT_REPLAY_HISTORICAL_FAILURE_WITHOUT_FRESH_EVIDENCE',
  work_provenance:{
   execution_environment:'GITHUB_ACTIONS_READ_ONLY_PREVIEW_PILOT',
   run_url:'https://github.com/'+REPO+'/actions/runs/'+sourceRunId,
   source_sha:sourceCommitSha,
  }
 };
 return Object.freeze({...evidence,evidence_sha256:hash(evidence)});
}
export function verifyRileyAuditReceipt(receipt){
 if(!receipt||typeof receipt!=='object'||Array.isArray(receipt))fail('RECEIPT_MISSING');
 const {evidence_sha256,...data}=receipt;
 if(!/^[a-f0-9]{64}$/.test(evidence_sha256||'')||
  hash(data)!==evidence_sha256||data.version!==RILEY_FIRST_EVIDENCE_AUDIT_VERSION||
  data.status!=='REAL_PROVIDER_INVESTIGATION_COMPLETED_READ_ONLY'||
  data.employee!=='Riley'||data.employee_function_id!=='software_engineering'||
  data.issue_provider_state!=='open'&&data.issue_provider_state!=='closed'||
  !Number.isInteger(data.issue_number)||!ISSUE.test(data.issue_url||'')||
  Number(ISSUE.exec(data.issue_url)[1])!==data.issue_number||
  !SHA.test(data.work_provenance?.source_sha)||
  !RUN.test(data.work_provenance?.run_url||'')||
  data.original_job_admitted!==false||data.model_generation_performed!==false||
  data.capability_installed!==false||data.original_job_settled!==false||
  data.no_production_change!==true||data.human_hours_saved!==null||
  data.owner_shift_authorized!==false||data.read_only!==true)
  fail('RECEIPT_EVIDENCE_UNVERIFIED');
 return Object.freeze({verified:true,receipt_sha256:evidence_sha256,
  source_run_url:data.work_provenance.run_url,original_job_completed:false,
  implementation_verified:false,installation_authorized:false,
  verified_human_hours_saved:null});
}

/** An independent worker, not the model, rechecks real source identities.
 * These are observations, never original-job completion or authorization. */
export async function independentlyVerifyRileyProviderAudit(receipt,{
 fetchImpl=fetch,token
}={}){
 const digest=verifyRileyAuditReceipt(receipt);
 const issue=await get('/issues/'+receipt.issue_number,{fetchImpl,token});
 if(issue.number!==receipt.issue_number||issue.html_url!==receipt.issue_url||
  issue.repository_url!=='https://api.github.com/repos/'+REPO||
  issue.pull_request||!['open','closed'].includes(issue.state))
  fail('INDEPENDENT_ISSUE_READBACK_MISMATCH');
 // The run can be re-read even when newer runs arrived between workers.
 if(receipt.latest_run!==null){
  const raw=await get('/actions/runs/'+receipt.latest_run.id,{fetchImpl,token});
  const checked=proveRun(raw,receipt.workflow_id,receipt.workflow_name);
  if(checked.sha!==receipt.latest_run.sha||
   checked.url!==receipt.latest_run.url||
   checked.status!==receipt.latest_run.status)
   fail('INDEPENDENT_RUN_READBACK_MISMATCH');
 }
 return Object.freeze({
  status:'INDEPENDENT_PROVIDER_READBACK_PASSED',
  work_kind:'READ_ONLY_ENGINEERING_INVESTIGATION',
  receipt_sha256:digest.receipt_sha256,
  source_run_url:digest.source_run_url,
  issue_url:receipt.issue_url,
  checked_run_url:receipt.latest_run?.url||null,
  all_external_writes_denied:true,
  original_job_completed:false,
  installation_authorized:false,
  measured_human_hours_saved:null,
  production_changed:false,
 });
}
