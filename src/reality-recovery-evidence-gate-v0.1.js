// Read-only, owner-scoped original-work recovery evidence gate.
// The repair/upgrade decision MUST follow fresh source observation.
// Passing a later GitHub Action run is a real observation, but does not
// prove root cause, code authorship, capability evolution, or job completion.
import {inspectPersonalRecoveryCheckpoint}
 from './reality-personal-recovery-checkpoint-v0.1.js';
export const RECOVERY_EVIDENCE_GATE_VERSION='reality-recovery-evidence-gate-v0.1';
const REPO='maloney2323/Reality',ROOT='/repos/'+REPO;
const RUN_LINK=/^https:\/\/github\.com\/maloney2323\/Reality\/actions\/runs\/([1-9][0-9]*)$/;
const ISSUE_LINK=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/[1-9][0-9]*$/;
const WORK_ID=/^work:[a-f0-9]{32}$/;
const ACCEPTED_NAME='Reality Governed Execution Engine v0.1';
const fail=code=>{throw Error(code)};
function getRunIdentity(data,id){
 if(!data||data.id!==id||data.repository?.full_name!==REPO||
    !Number.isSafeInteger(data.workflow_id)||data.workflow_id<=0||
    data.name!==ACCEPTED_NAME||
    !Number.isFinite(Date.parse(data.created_at))||
    !/^[-_a-zA-Z0-9/.]{1,200}$/.test(String(data.head_branch||''))||
    data.html_url!=='https://github.com/'+REPO+'/actions/runs/'+id)
  fail('RECOVERY_PROVIDER_RUN_IDENTITY_UNVERIFIED');
 return data;
}
export async function inspectOriginalWorkRepairEvidence({
 recovery,fetchImpl=fetch,
}={}){
 if(!WORK_ID.test(String(recovery?.original_work_id||''))||
    recovery.checkpoint_persisted!==true||
    recovery.state!=='RECOVERY_BLOCKED_DURABLY_RECORDED'||
    recovery.job_completed!==false||
    recovery.new_external_action_authorized!==false||
    !recovery.checkpoint_receipt_id||
    !ISSUE_LINK.test(String(recovery.existing_issue_url||'')))
  fail('RECOVERY_VERIFIED_CHECKPOINT_REQUIRED');
 const sources=recovery.source_evidence_refs;
 if(!Array.isArray(sources)||sources.length<2||sources.length>12)
  fail('RECOVERY_BOUNDED_FAILED_RUN_EVIDENCE_REQUIRED');
 const ids=sources.map(s=>{
  const m=RUN_LINK.exec(String(s||''));
  if(!m||!Number.isSafeInteger(Number(m[1])))fail('RECOVERY_FAILED_RUN_SOURCE_SCOPE_INVALID');
  return Number(m[1]);
 });
 if(new Set(ids).size!==ids.length)
  fail('RECOVERY_DUPLICATE_SOURCE_RUN_REF');
 // Public Actions GETs only, solely the exact repo + source-receipted IDs.
 // Do not use an Issues-write credential and never POST any provider action.
 const get=async path=>{
  if(!/^\/repos\/maloney2323\/Reality\/actions\/(?:runs\/[1-9][0-9]*|workflows\/[1-9][0-9]*\/runs\?status=success&per_page=30&branch=[-_a-zA-Z0-9/.]+)$/.test(path))
   fail('RECOVERY_PROVIDER_READ_SCOPE_INVALID');
  const r=await fetchImpl('https://api.github.com'+path,{
   method:'GET',
   headers:{Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28',
    'User-Agent':'Reality-Original-Work-Recovery-ReadOnly'},
  });
  if(!r?.ok)fail('RECOVERY_GITHUB_READBACK_UNAVAILABLE');
  return r.json();
 };
 const observed=await Promise.all(ids.map(id=>get(ROOT+'/actions/runs/'+id)));
 const failed=observed.map((d,i)=>getRunIdentity(d,ids[i]));
 const anchor=failed[0];
 if(failed.some(x=>x.workflow_id!==anchor.workflow_id||
    x.head_branch!==anchor.head_branch||x.conclusion!=='failure'||
    x.status!=='completed'))
  fail('RECOVERY_SOURCE_FAILURES_NOT_EQUIVALENT');
 const mostRecentFailure=Math.max(...failed.map(x=>Date.parse(x.created_at)));
 const passList=await get(ROOT+'/actions/workflows/'+anchor.workflow_id+
    '/runs?status=success&per_page=30&branch='+anchor.head_branch);
 if(!Array.isArray(passList?.workflow_runs))
  fail('RECOVERY_SUCCESS_DISCOVERY_INVALID');
 const candidates=passList.workflow_runs.filter(x=>
  x?.workflow_id===anchor.workflow_id&&
  x?.repository?.full_name===REPO&&
  x?.name===anchor.name&&x?.head_branch===anchor.head_branch&&
  x?.status==='completed'&&x?.conclusion==='success'&&
  Number.isSafeInteger(x?.id)&&x.id>0&&
  Date.parse(x?.created_at)>mostRecentFailure&&
  x?.head_sha!==anchor.head_sha&&
  x?.html_url==='https://github.com/'+REPO+'/actions/runs/'+x.id);
 candidates.sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at));
 let latestSuccess=null;
 if(candidates.length){
  const candidate=candidates[0];
  const readback=getRunIdentity(await get(ROOT+'/actions/runs/'+candidate.id),
   candidate.id);
  if(readback.workflow_id!==anchor.workflow_id||
     readback.head_branch!==anchor.head_branch||
     readback.status!=='completed'||readback.conclusion!=='success'||
     readback.head_sha===anchor.head_sha||
     Date.parse(readback.created_at)<=mostRecentFailure)
   fail('RECOVERY_LATER_SUCCESS_PROVIDER_RECHECK_FAILED');
  latestSuccess=Object.freeze({
   run_id:readback.id,run_url:readback.html_url,
   run_created_at:readback.created_at,head_sha:readback.head_sha,
  });
 }
 return Object.freeze({
  version:RECOVERY_EVIDENCE_GATE_VERSION,
  original_work_id:recovery.original_work_id,
  recovery_receipt_id:recovery.checkpoint_receipt_id,
  issue_url:recovery.existing_issue_url,
  status:latestSuccess?
   'LATER_SUCCESSFUL_CI_RUN_INDEPENDENTLY_OBSERVED':
   'NO_LATER_VERIFIED_SUCCESS_IN_BOUNDED_PROVIDER_WINDOW',
  failure_workflow_name:anchor.name,
  verified_historical_failure_count:failed.length,
  historical_run_urls:Object.freeze(failed.map(x=>x.html_url)),
  later_success:latestSuccess,
  root_cause_verified:false,
  original_repair_proven:false,
  capability_gap_proven:false,
  new_upgrade_required:'NOT_ESTABLISHED',
  original_job_completed:false,
  execution_authorized:false,
  external_action_performed:false,
  no_retry_original_issue:true,
  next_step:latestSuccess?
   'The same workflow has passed a later run. Review the code-change cause and acceptance criteria before closing the original repair. Do not propose a new upgrade without a proven gap.':
   'No matching later success was verified. Inspect the failure and evaluate a bounded repair under fresh authorization.',
 });
}
export async function inspectAuthenticatedOriginalWorkRepairEvidence({
 session,conversationId,workId,env=process.env,
 inspectCheckpoint=inspectPersonalRecoveryCheckpoint,fetchImpl=fetch,
}={}){
 const recovery=await inspectCheckpoint({
  session,conversationId,workId,env,
 });
 if(recovery?.original_work_id!==workId)fail('RECOVERY_ORIGINAL_WORK_SCOPE_MISMATCH');
 return inspectOriginalWorkRepairEvidence({recovery,fetchImpl});
}
