// Execute the EXISTING employee weekly investigation assignments on the
// already authenticated one-shift worker. Provider readbacks + durable receipts,
// not more work-list projections. No new original, owner authority, or install.
import {createHash} from 'node:crypto';
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
const REPO='maloney2323/Reality',API='https://api.github.com/repos/'+REPO;
const WORK=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/([1-9]\d*)$/;
const DIGEST=/^[a-f0-9]{64}$/;
const RECEIPT=/^supabase:weekly_employee_investigation_receipts_v1:[a-f0-9-]{36}$/;
const ROLES=new Set(['Avery','Riley','Quinn','Taylor','Casey','Morgan','Jordan','Sage']);
const STATES=new Set(['CURRENT_OWNER_OBJECTIVE_NEEDS_EXACT_TASK',
 'CURRENT_FAILURE_REPRODUCTION_REQUIRED','SOURCE_REVIEW_NEEDS_CURRENT_PROOF',
 'EXACT_ORIGINAL_CONTINUATION_REQUIRES_EVIDENCE']);
const sha=x=>'sha256:'+createHash('sha256').update(x).digest('hex');
const fail=x=>{throw Error('ACTIVE_WEEKLY_SOURCE_INVESTIGATION_'+x)};
const apiResult=(status,extra={})=>Object.freeze({
 status,source_investigation_only:true,executable_original_admitted:false,
 installation_authorized:false,production_changed:false,...extra
});
async function readGitHub(path,{fetchImpl,token}){
 const response=await fetchImpl(API+path,{
  method:'GET',cache:'no-store',redirect:'error',
  headers:{accept:'application/vnd.github+json',
   'x-github-api-version':'2022-11-28',
   'user-agent':'Reality-Weekly-Employee-Source-Inspector/1.0',
   ...(token?{authorization:'Bearer '+token}:{})},
  signal:AbortSignal.timeout(9500)
 });
 if(!response?.ok)fail('GITHUB_PROVIDER_READBACK_UNAVAILABLE');
 const data=await response.json().catch(()=>null);
 if(!data||Array.isArray(data)||typeof data!=='object')
  fail('GITHUB_PROVIDER_PAYLOAD_INVALID');
 return data;
}
async function inspectOne(x,{fetchImpl,token,callRpc,db,snapshot}){
 const match=WORK.exec(x.source_url||'');
 if(!match||!ROLES.has(x.investigation_employee)||
  !STATES.has(x.upstream_qualification_status)||!x.source_provider_checked_upstream||
  x.is_executable_original!==false||x.installation_authorized!==false)
  fail('EXACT_UNSETTLED_SOURCE_ROLE_NOT_VERIFIED');
 const n=Number(match[1]);
 const issue=await readGitHub('/issues/'+n,{fetchImpl,token});
 if(issue.number!==n||issue.state!=='open'||issue.pull_request||
  issue.html_url!==x.source_url||issue.repository_url!==API||
  typeof issue.body!=='string'||issue.body.length>95000||
  typeof issue.title!=='string'||issue.title.length>400||
  !Number.isFinite(Date.parse(issue.updated_at||''))||
  Date.parse(issue.updated_at)>Date.now()+120000)
  fail('FRESH_GITHUB_ISSUE_SOURCE_NOT_VERIFIED');
 const bodySha=sha(issue.body);
 const link=/https:\/\/github\.com\/maloney2323\/Reality\/actions\/runs\/([1-9][0-9]{4,15})/g;
 const ids=[...new Set([...issue.body.matchAll(link)].map(m=>Number(m[1])))];
 if(ids.length>30)fail('GITHUB_PINNED_FAILURE_REFERENCES_UNBOUNDED');
 let runId=null,conclusion='NO_RUN_LINK',runEvidence=null;
 if(ids.length){
  runId=ids[0];
  const run=await readGitHub('/actions/runs/'+runId,{fetchImpl,token});
  if(run.id!==runId||run.html_url!==
   'https://github.com/'+REPO+'/actions/runs/'+runId||
   run.head_repository?.full_name!==REPO||
   !['completed','in_progress','queued','requested','waiting','pending'].includes(run.status))
   fail('INDEPENDENT_GITHUB_WORKFLOW_RUN_UNVERIFIED');
  conclusion=run.status!=='completed'?'HISTORICAL_NONFINAL':
   run.conclusion==='failure'?'HISTORICAL_FAILURE':
   run.conclusion==='success'?'HISTORICAL_SUCCESS':'HISTORICAL_NONFINAL';
  runEvidence={run_id:runId,status:run.status,conclusion:run.conclusion,
   head_sha:run.head_sha,
   created_at:run.created_at};
 }
 const status=x.upstream_qualification_status===
  'CURRENT_OWNER_OBJECTIVE_NEEDS_EXACT_TASK'?
   'CURRENT_SOURCE_INSPECTED_EXACT_TASK_REQUIRES_TEST':
  conclusion==='HISTORICAL_FAILURE'?
   'HISTORICAL_PROVIDER_FAILURE_VERIFIED_FRESH_REPRODUCTION_REQUIRED':
   'CURRENT_SOURCE_INSPECTED_NO_INDEPENDENT_DEFECT_PROOF';
 const evidenceSha=sha(JSON.stringify({
  source_ref:x.source_url,issue_number:n,issue_updated_at:issue.updated_at,
  issue_body_sha256:bodySha,provider_run:runEvidence,status
 }));
 const result=await callRpc(db,'reality_record_current_shift_weekly_investigation_v1',{
  p_source_ref:x.source_url,p_snapshot_sha256:snapshot,
  p_issue_number:n,p_employee:x.investigation_employee,
  p_issue_updated_at:issue.updated_at,p_issue_body_sha256:bodySha,
  p_provider_evidence_sha256:evidenceSha,p_evidence_run_id:runId,
  p_evidence_run_conclusion:conclusion,p_investigation_status:status
 },{fetchImpl});
 if(result?.status!=='WEEKLY_EMPLOYEE_PROVIDER_INVESTIGATION_DURABLY_RECORDED'||
  result.source_ref!==x.source_url||result.employee!==x.investigation_employee||
  result.issue_number!==n||result.investigation_status!==status||
  result.executable_original_admitted!==false||
  result.installation_authorized!==false||
  result.production_changed!==false||
  !RECEIPT.test(result.investigation_receipt_ref||''))
  fail('INDEPENDENT_WORKER_INVESTIGATION_RECORD_UNVERIFIED');
 return Object.freeze({...result,provider_evidence_sha256:evidenceSha});
}
export async function runCurrentShiftWeeklyInvestigations({
 db,graph,intake,fetchImpl=fetch,callRpc=shiftRpc,token=null
}={}){
 if(graph?.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||
  intake?.status!=='CURRENT_WARRANT_AND_EXISTING_WORK_INVENTORY_RECONCILED_READ_ONLY'||
  intake.shift_id!==graph.shift_id||intake.owner_id!==graph.owner_id||
  intake.plan_fingerprint!==graph.plan_fingerprint||
  intake.current_shift_scope_extended!==false||
  intake.original_jobs_created!==false||intake.installation_authorized!==false||
  intake.production_changed!==false||
  !DIGEST.test(intake.week_source_sha256||'')||
  !Array.isArray(intake.weekly_sources)||intake.weekly_sources.length>30||
  typeof callRpc!=='function'||typeof fetchImpl!=='function'||!db)
  fail('EXISTING_SIGNED_SHIFT_AND_SOURCE_INTAKE_REQUIRED');
 const read=await callRpc(db,'reality_read_current_shift_weekly_investigations_v1',
  {},{fetchImpl});
 if(read?.status!=='CURRENT_SIGNED_WEEKLY_INVESTIGATION_READBACK'||
  read.shift_id!==graph.shift_id||read.owner_id!==graph.owner_id||
  read.plan_fingerprint!==graph.plan_fingerprint||
  read.snapshot_sha256!==intake.week_source_sha256||
  !Array.isArray(read.items)||read.items.length>30||
  read.execution_authorized!==false||read.installation_authorized!==false||
  read.production_changed!==false)
  fail('SAME_SHIFT_PREVIOUS_INVESTIGATION_READBACK_UNVERIFIED');
 if(new Set(read.items.map(i=>i.source_ref)).size!==read.items.length)
  fail('DUPLICATE_SOURCE_INVESTIGATION_RECEIPTS');
 const existing=new Set(read.items.map(i=>i.source_ref));
 const candidates=intake.weekly_sources.filter(x=>
  x.source_provider_checked_upstream===true&&
  x.scope_status!=='SETTLED_CURRENT_WARRANT_NO_REPLAY'&&
  x.upstream_qualification_status!=='PRIOR_ORIGINAL_SETTLED_NO_REPLAY'&&
  STATES.has(x.upstream_qualification_status)&&
  !existing.has(x.source_url));
 if(candidates.length>10)fail('UNBOUNDED_PENDING_INVESTIGATIONS');
 if(!candidates.length)return apiResult('WEEKLY_ASSIGNED_SOURCE_INVESTIGATIONS_ALREADY_INSPECTED',{
  already_investigated:read.items.length,just_investigated:0,
  source_receipts:read.items,investigations_pending:0});
 const attempts=await Promise.allSettled(candidates.slice(0,5).map(x=>
  inspectOne(x,{db,fetchImpl,token,callRpc,
   snapshot:intake.week_source_sha256})));
 const completed=attempts.filter(x=>x.status==='fulfilled').map(x=>x.value);
 const failed=attempts.filter(x=>x.status==='rejected').map(x=>{
  const message=String(x.reason?.message||'');
  return /^ACTIVE_WEEKLY_SOURCE_INVESTIGATION_[A-Z0-9_]{4,100}$/.test(message)?
   message:'ACTIVE_WEEKLY_SOURCE_INVESTIGATION_PROVIDER_OR_RECEIPT_UNVERIFIED';
 });
 const after=await callRpc(db,
  'reality_read_current_shift_weekly_investigations_v1',{}, {fetchImpl});
 if(after?.status!=='CURRENT_SIGNED_WEEKLY_INVESTIGATION_READBACK'||
  after.shift_id!==graph.shift_id||after.owner_id!==graph.owner_id||
  after.plan_fingerprint!==graph.plan_fingerprint||
  after.snapshot_sha256!==intake.week_source_sha256||
  !Array.isArray(after.items)||
  completed.some(c=>!after.items.some(r=>
   r.source_ref===c.source_ref&&
   r.provider_evidence_sha256===c.provider_evidence_sha256&&
   r.investigation_receipt_ref===c.investigation_receipt_ref)))
  fail('INDEPENDENT_DURABLE_INVESTIGATION_RECEIPT_READBACK_FAILED');
 return apiResult(completed.length?
  'WEEKLY_EMPLOYEE_SOURCE_INVESTIGATIONS_INDEPENDENTLY_RECORDED':
  'WEEKLY_EMPLOYEE_SOURCE_INVESTIGATIONS_UNVERIFIED',{
  already_investigated:read.items.length,
  just_investigated:completed.length,
  source_receipts:after.items,
  investigations_pending:Math.max(0,candidates.length-completed.length),
  failure_codes:failed.slice(0,5)
 });
}
