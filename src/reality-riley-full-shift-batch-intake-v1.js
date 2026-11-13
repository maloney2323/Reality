// Reuse ONE signed-in, owner-authorized employee shift to admit several
// CURRENT, independently proved originals. Each candidate must be within
// the exact source fingerprint the owner approved. No bulk model authority,
// installation, replay or third confirmation is ever minted by this selector.
export const RILEY_SHIFT_BATCH_VERSION='reality-riley-authorized-full-shift-batch-v1';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const HASH=/^sha256:[a-f0-9]{64}$/;
const SHA=/^[a-f0-9]{40}$/;
const ISSUE=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/([1-9]\d*)$/;
const allowed=new Set(['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK']);
const fail=x=>{throw Error('RILEY_FULL_SHIFT_'+x)};
const safe=x=>({
 version:RILEY_SHIFT_BATCH_VERSION,...x,installation_authorized:false,
 production_changed:false,original_job_completed:false,
 final_receipt_verified:false,worker_execution_proven:false
});
export function selectRileyFullShiftOriginals({
 ownerId,shiftId,expectedFingerprint,shiftReadback,
 ownerLoopReadback,opportunities,priorOriginals,now=new Date(),maxJobs=4
}={}){
 if(!UUID.test(ownerId||'')||!UUID.test(shiftId||'')||
  !HASH.test(expectedFingerprint||'')||
  !Number.isInteger(maxJobs)||maxJobs<1||maxJobs>4||
  !Number.isFinite(now?.getTime?.())||
  shiftReadback?.status!=='OWNER_SCOPED_EMPLOYEE_SHIFT_READBACK'||
  shiftReadback.work_installation_authorized_by_read!==false||
  shiftReadback.production_changed!==false||
  !Array.isArray(shiftReadback.shifts)||shiftReadback.shifts.length>5||
  ownerLoopReadback?.status!=='OWNER_GOVERNED_LOOP_READBACK'||
  ownerLoopReadback.owner_installation_authorized_by_read!==false||
  ownerLoopReadback.external_action_performed!==false||
  ownerLoopReadback.production_changed!==false||
  !Array.isArray(ownerLoopReadback.jobs)||ownerLoopReadback.jobs.length>12||
  !Array.isArray(opportunities)||opportunities.length>30||
  !Array.isArray(priorOriginals)||priorOriginals.length>30)
  fail('OWNER_SHIFT_AND_LEDGER_READBACK_REQUIRED');
 const matches=shiftReadback.shifts.filter(s=>s.shift_id===shiftId);
 if(matches.length!==1)fail('EXACT_OWNER_SHIFT_NOT_FOUND');
 const shift=matches[0];
 if(shift.plan_fingerprint!==expectedFingerprint||
  !allowed.has(shift.status)||!Array.isArray(shift.steps)||
  shift.steps.length!==8||shift.steps.some((s,i)=>s.step_index!==i+1))
  fail('EXACT_APPROVED_SHIFT_SOURCES_CHANGED');
 // Completion-bound warrants use PostgreSQL timestamptz 'infinity':
 // the frozen owner scope remains active until independent final settlement.
 // Ordinary time-boxed shifts must still expire at their authorized end.
 const completionBound=shift.planned_end_at==='infinity';
 const start=Date.parse(shift.planned_start_at);
 const end=completionBound?Infinity:Date.parse(shift.planned_end_at);
 if(!Number.isFinite(start)||
    (!completionBound&&!Number.isFinite(end))||
    now.getTime()<start-120000||now.getTime()>=end)
  fail('OWNER_SHIFT_NOT_IN_CURRENT_EXECUTION_WINDOW');
 const sources=new Set(shift.steps.map(s=>s.source_ref)
  .filter(x=>ISSUE.test(String(x||''))));
 const prior=new Map();
 for(const row of priorOriginals){
  if(!Number.isSafeInteger(row?.issue_number)||row.issue_number<1||
   prior.has(row.issue_number)||!row.record||
   !['NO_PRIOR_ORIGINAL','EXISTING_UNFINISHED_ORIGINAL'].includes(row.record.status)||
   row.record.installation_authorized!==false||
   row.record.job_completed!==false||
   row.record.production_changed!==false)
   fail('PRIOR_OWNER_ORIGINAL_READBACK_CHANGED');
  prior.set(row.issue_number,row.record.status);
 }
 const seen=new Set(),out=[],skipped=[];
 for(const candidate of opportunities){
  const issue=Number(candidate?.issue_number);
  const url=candidate?.issue_url;
  if(!ISSUE.test(String(url||''))||
   Number(ISSUE.exec(url)[1])!==issue||seen.has(issue)||
   candidate.independently_verified!==true||
   !Number.isSafeInteger(candidate.original_provider_failed_run_id)||
   candidate.original_provider_failed_run_id<1||
   !SHA.test(candidate.source_sha||'')||
   candidate.owner_installation_authorized===true||
   candidate.production_changed===true)
   fail('INDEPENDENT_SOURCE_CANDIDATE_UNTRUSTED');
  seen.add(issue);
  if(!sources.has(url))continue;
  const before=prior.get(issue);
  if(!before)fail('MISSING_PRIOR_ISSUE_LEDGER_READBACK');
  const older=ownerLoopReadback.jobs.filter(j=>j.source_issue_number===issue);
  if(before!=='NO_PRIOR_ORIGINAL'||older.length){
   skipped.push({issue_number:issue,
    status:'EXISTING_OR_HISTORICAL_JOB_RECONCILE_NO_REPLAY'});
   continue;
  }
  if(out.length===maxJobs){skipped.push({issue_number:issue,
   status:'SHIFT_BATCH_CAPACITY_DEFERRED_NO_AUTOMATIC_APPROVAL'});continue;}
  out.push(Object.freeze({
   issue_number:issue,issue_url:url,
   source_sha:candidate.source_sha,
   original_provider_failed_run_id:candidate.original_provider_failed_run_id,
   source_path:candidate.source_path,
   owner_scope_preflight:true,installation_authorized:false
  }));
 }
 return Object.freeze(safe({
  status:out.length?'OWNER_APPROVED_SHIFT_SOURCE_JOBS_INDEPENDENTLY_SELECTED':
   'NO_NEW_INDEPENDENTLY_VERIFIED_REPAIRS_IN_THIS_SHIFT',
  owner_id:ownerId,shift_id:shiftId,
  expected_fingerprint:expectedFingerprint,
  selected:Object.freeze(out),skipped:Object.freeze(skipped),
  selected_count:out.length,
  one_owner_shift_authorization:true,
  no_per_job_button_required:true,
  no_unapproved_source_admitted:true
 }));
}
