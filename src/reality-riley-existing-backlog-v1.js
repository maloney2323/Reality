// Riley's EXISTING backlog is not an empty queue simply because no shift is
// active. Reconcile open provider work with owner-scoped durable original-job
// evidence. This is read-only prioritization, never authority to execute.
export const RILEY_EXISTING_BACKLOG_VERSION='reality-riley-existing-backlog-v1';
const ISSUE=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/([1-9]\d{0,6})$/;
const WORK=/^work:[a-f0-9]{32}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const PHASES=new Set(['PENDING_FROZEN_REPRODUCTION',
 'EVIDENCE_RECONCILIATION_REQUIRED','FROZEN_REPRODUCED_AWAITING_CANDIDATE',
 'AWAITING_OWNER_APPROVAL','ISOLATED_INSTALLED_PROBATION',
 'SETTLED_ISOLATED']);
const fail=code=>{throw Error('RILEY_BACKLOG_'+code)};
const priority=x=>/riley|employee.{0,36}(handoff|execution)|original.job.{0,20}(continuation|handoff)/i.test(x)?0:
 /full.{0,12}(loop|self.repair)|settle|continuity|repair/i.test(x)?1:
 /regression|failure|bug|execution|ci|reliab/i.test(x)?2:3;
export function projectRileyExistingBacklog({
 issues,ownerLoop,priorOriginals,activeShiftCount=0,coverageComplete=false
}={}){
 if(!Array.isArray(issues)||issues.length>100||
   !Array.isArray(priorOriginals)||priorOriginals.length>100||
   !Number.isInteger(activeShiftCount)||activeShiftCount<0||activeShiftCount>5||
   typeof coverageComplete!=='boolean'||
   !ownerLoop||ownerLoop.status!=='OWNER_GOVERNED_LOOP_READBACK'||
   ownerLoop.owner_installation_authorized_by_read!==false||
   ownerLoop.external_action_performed!==false||
   ownerLoop.production_changed!==false||
   !Array.isArray(ownerLoop.jobs)||ownerLoop.jobs.length>12)
  fail('OWNER_PROVIDER_READBACK_REQUIRED');
 const priorMap=new Map();
 for(const old of priorOriginals){
  if(!Number.isSafeInteger(old?.issue_number)||old.issue_number<1||
    old.issue_number>100000||priorMap.has(old.issue_number)||
    !old.record||!['NO_PRIOR_ORIGINAL','EXISTING_UNFINISHED_ORIGINAL'].includes(
      old.record.status)||old.record.installation_authorized!==false||
    old.record.job_completed!==false||old.record.production_changed!==false)
    fail('PRIOR_ORIGINAL_LEDGER_UNVERIFIED');
  if(old.record.status==='EXISTING_UNFINISHED_ORIGINAL'&&
   (!WORK.test(old.record.original_work_id||'')||
    typeof old.record.phase!=='string'||!old.record.phase||
    !UUID.test(old.record.queue_id||'')))
    fail('PRIOR_QUEUE_IDENTITY_MISMATCH');
  priorMap.set(old.issue_number,old.record);
 }
 const unique=new Set(),rows=[];
 for(const issue of issues){
  if(issue?.pull_request||issue?.state!=='open')continue;
  const m=ISSUE.exec(String(issue.html_url||''));
  if(!m||issue.number!==Number(m[1])||
    typeof issue.title!=='string'||!issue.title.trim()||
    unique.has(issue.number))continue;
  unique.add(issue.number);
  const observed=ownerLoop.jobs.filter(j=>j.source_issue_number===issue.number&&
   WORK.test(j.original_work_id||'')&&PHASES.has(j.phase)&&
   j.environment==='ISOLATED_PREVIEW');
  const prior=priorMap.get(issue.number);
  if(!prior)fail('MISSING_OWNER_PRIOR_QUEUE_READBACK');
  let status,next,existing=null;
  // A queue's "unfinished" field is NOT proof of an unsettled original job.
  // Real completion evidence takes precedence over GitHub OPEN.
  if(observed.length&&observed.every(j=>j.independently_settled===true)){
   status='PREVIOUS_ORIGINAL_JOBS_INDEPENDENTLY_SETTLED';
   next='Do not replay. Reconcile open tracking issue against verified receipts.';
  }else if(observed.some(j=>j.owner_install_approved===true||
   j.phase==='ISOLATED_INSTALLED_PROBATION')){
   status='HISTORICAL_INSTALL_OR_PROBATION_NEEDS_RECONCILIATION';
   next='Check original-work disposition and independent receipt before any new action.';
  }else if(observed.length===1&&
   ['PENDING_FROZEN_REPRODUCTION','EVIDENCE_RECONCILIATION_REQUIRED',
    'FROZEN_REPRODUCED_AWAITING_CANDIDATE','AWAITING_OWNER_APPROVAL']
    .includes(observed[0].phase)&&
   observed[0].independently_settled===false){
   status='EXISTING_CAPABILITY_JOB_REQUIRES_LIVE_AUTHORITY_GATE';
   next='Use the exact existing original ID through the Reality owner and worker preflight; do not start another job.';
   existing=observed[0].original_work_id;
  }else if(observed.length>1){
   status='AMBIGUOUS_HISTORICAL_ORIGINALS_REVIEW';
   next='Independently reconcile every matching job and receipt; do not auto-select.';
  }else if(prior.status==='EXISTING_UNFINISHED_ORIGINAL'){
   status='LEGACY_DISCOVERY_QUEUE_REQUIRES_RECONCILIATION';
   next='Verify the original outcome and single-use claim before attempting any continuation.';
   existing=prior.original_work_id;
  }else{
   status='OPEN_SOURCE_WORK_AWAITING_ORIGINAL_JOB_QUALIFICATION';
   next='Validate current defect and associate it with the authenticated Reality owner/goal. Open issue alone is not an execution warrant.';
  }
  rows.push(Object.freeze({
   issue_number:issue.number,
   source_url:issue.html_url,
   title:issue.title.slice(0,210),
   status,next_action:next,
   original_work_id:existing,
   historical_owner_queue_record:prior.status==='EXISTING_UNFINISHED_ORIGINAL',
   independently_settled_originals_observed:
    observed.filter(j=>j.independently_settled===true).length,
   exact_worker_wake_authorized_by_read:false,
   original_job_completed_by_read:false,
   installation_authorized:false,verified_human_hours_saved:null,
   priority_tier:priority(issue.title)
  }));
 }
 rows.sort((a,b)=>a.priority_tier-b.priority_tier||
  a.issue_number-b.issue_number);
 const actionable=rows.filter(x=>x.status===
  'EXISTING_CAPABILITY_JOB_REQUIRES_LIVE_AUTHORITY_GATE');
 const observed=rows.filter(x=>x.status===
  'OPEN_SOURCE_WORK_AWAITING_ORIGINAL_JOB_QUALIFICATION');
 return Object.freeze({
  version:RILEY_EXISTING_BACKLOG_VERSION,
  status:coverageComplete?'OWNER_RECONCILED_EXISTING_OPEN_BACKLOG':
   'PARTIAL_OWNER_RECONCILED_EXISTING_OPEN_BACKLOG',
  employee:'Riley',
  active_employee_shifts:activeShiftCount,
  total_open_provider_issues_reviewed:rows.length,
  existing_owner_originals_requiring_live_gate:actionable.length,
  open_provider_tasks_requiring_independent_qualification:observed.length,
  rows:Object.freeze(rows.slice(0,25)),
  source_coverage_complete:coverageComplete,
  no_work_claimed:false,
  starts_original_job:false,
  execution_authorized_by_read:false,
  installation_authorized:false,
  final_receipt_recorded_by_read:false,
  production_changed:false,
  human_hours_saved_verified:null
 });
}
