// Read the existing owner-scoped, independently signed internal maintenance queue.
// A closed original shift stays immutable. This is visibility, not an install,
// shift extension, authority grant, or a second execution engine.
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const HASH=/^sha256:[0-9a-f]{64}$/;
const SOURCE=/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/(?:issues|pull)\/[1-9][0-9]*$/;
const PHASES=new Set([
 'OPEN_NEEDS_BUSINESS_WORK_ROOT_CAUSE','OPEN_NEEDS_FROZEN_SOURCE_REPRODUCTION',
 'FROZEN_FAILURE_VERIFIED','CANDIDATE_INDEPENDENTLY_TESTED',
 'AWAITING_EXACT_APPROVAL','AUTHORIZED_REPAIR_IN_PROGRESS',
 'REPAIR_VERIFIED_ORIGINAL_NOT_SETTLED','INTERNAL_REPAIR_VERIFIED_CLOSED',
 'BLOCKED_NEEDS_OWNER_AUTHORITY'
]);
const KINDS=new Set(['EMPLOYEE_QUALIFICATION_HANDOFF_STALLED',
 'QUALIFIED_EVIDENCE_JOB_BLOCKED']);
const HANDLING=new Set([
 'QUEUED','CLAIMED','SOURCE_REOBSERVED_NEEDS_FROZEN_TEST',
 'FAILURE_BASELINE_CLAIMED','FAILURE_BASELINE_REPRODUCED_NEEDS_CI_RED',
 'BLOCKED_INDEPENDENT_PROVIDER_UNVERIFIED'
]);
const fail=x=>{throw Error('OWNER_MAINTENANCE_CONTINUITY_'+x)};
export function projectOwnerInternalMaintenanceContinuity(readback,{ownerId,shifts=[]}={}){
 if(!UUID.test(ownerId||'')||!Array.isArray(shifts)||shifts.length>5||
    !readback||readback.status!=='OWNER_VERIFIED_INTERNAL_MAINTENANCE_READ_ONLY'||
    readback.owner_id!==ownerId||readback.read_only!==true||
    readback.shift_started_by_read!==false||
    readback.owner_authority_granted_by_read!==false||
    readback.customer_jobs_completed_by_read!==0||
    readback.production_changed!==false||
    !Array.isArray(readback.items)||readback.items.length>50||
    !Number.isSafeInteger(readback.count)||readback.count!==readback.items.length)
  fail('OWNER_SERVICE_READBACK_REQUIRED');
 const known=new Set(),jobs=[];
 for(const item of readback.items){
  if(!UUID.test(item.origin_shift_id||'')||
     !UUID.test(item.origin_incident_id||'')||
     item.owner_id!==ownerId||
     item.internal_work_id!=='maintenance:'+item.origin_incident_id||
     !KINDS.has(item.kind)||!PHASES.has(item.phase)||
     !SOURCE.test(item.source_ref||'')||
     !HASH.test(item.independent_review_receipt_sha256||'')||
     !['Riley','Taylor','Quinn','Avery','Casey','Morgan','Jordan','Sage']
       .includes(item.assignee)||
     !['Riley','Taylor','Quinn','Avery','Casey','Morgan','Jordan','Sage']
       .includes(item.independent_reviewer)||
     item.assignee===item.independent_reviewer||
     item.original_customer_job_completed!==false||
     (item.signed_executor_action!=null&&
      !['REQUALIFY_CHANGED_MAINTENANCE_SOURCE_BEFORE_CI',
       'RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED'].includes(
        item.signed_executor_action))||
     (item.signed_executor_state!=null&&
      !['CLAIMED','FAILED_RETRYABLE','COMPLETED'].includes(item.signed_executor_state))||
     (item.signed_executor_attempt_count!=null&&
      (!Number.isSafeInteger(item.signed_executor_attempt_count)||
       item.signed_executor_attempt_count<1||item.signed_executor_attempt_count>3))||
     ['source_requalification_receipt_sha256','ci_dispatch_receipt_sha256',
      'ci_independent_diagnostic_receipt_sha256','ci_independent_artifact_digest']
      .some(field=>item[field]!=null&&!HASH.test(item[field]))||
     (item.ci_github_trigger_commit_sha!=null&&
      !/^[a-f0-9]{40}$/.test(item.ci_github_trigger_commit_sha))||
     (item.ci_independent_github_run_id!=null&&
      (!Number.isSafeInteger(item.ci_independent_github_run_id)||
       item.ci_independent_github_run_id<1))||
     (item.source_requalification_receipt_sha256!=null&&
      (item.signed_executor_action!=='REQUALIFY_CHANGED_MAINTENANCE_SOURCE_BEFORE_CI'||
       item.signed_executor_state!=='COMPLETED'))||
     (item.ci_dispatch_receipt_sha256!=null&&
      (item.signed_executor_action!=='RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED'||
       item.signed_executor_state!=='COMPLETED'))||
     (item.ci_independent_diagnostic_receipt_sha256!=null&&
      (!HASH.test(item.ci_dispatch_receipt_sha256||'')||
       !Number.isSafeInteger(item.ci_independent_github_run_id)))||
     (item.worker_handling_state!==undefined&&
      !HANDLING.has(item.worker_handling_state))||
     (item.worker_baseline_attempts!==undefined&&
      (!Number.isSafeInteger(item.worker_baseline_attempts)||
       item.worker_baseline_attempts<0||item.worker_baseline_attempts>2))||
     (item.worker_claim_attempts!==undefined&&
      (!Number.isSafeInteger(item.worker_claim_attempts)||
       item.worker_claim_attempts<0||item.worker_claim_attempts>2))||
     (item.independent_failure_baseline_receipt_sha256!==undefined&&
      item.independent_failure_baseline_receipt_sha256!==null&&
      !HASH.test(item.independent_failure_baseline_receipt_sha256))||
     (item.independent_frozen_test_receipt_sha256!==undefined&&
      item.independent_frozen_test_receipt_sha256!==null&&
      !HASH.test(item.independent_frozen_test_receipt_sha256))||
     (item.independent_review_status!==undefined&&
      !['NO_ORIGINAL_ADMISSION_CONFIRMED',
       'SOURCE_CHANGED_NEEDS_FROZEN_TEST'].includes(
        item.independent_review_status))||
     (item.independent_source_observation_receipt_sha256!==undefined&&
      item.independent_source_observation_receipt_sha256!==null&&
      !HASH.test(item.independent_source_observation_receipt_sha256))||
     (item.independent_frozen_test_receipt_sha256!==undefined&&
      item.independent_frozen_test_receipt_sha256!==null&&
      !HASH.test(item.independent_frozen_test_receipt_sha256))||
     (item.worker_handling_state==='FAILURE_BASELINE_REPRODUCED_NEEDS_CI_RED'&&
      (!HASH.test(item.independent_failure_baseline_receipt_sha256||'')||
       item.worker_baseline_attempts<1))||
     item.installation_authorized_by_read!==false||
     item.external_action_authorized_by_read!==false||
     item.production_changed!==false||
     typeof item.frozen_reproduction_verified!=='boolean'||
     typeof item.repair_verified!=='boolean'||
     (item.original_customer_work_id!==null&&
      !/^work:[a-f0-9]{32}$/.test(item.original_customer_work_id||''))||
     known.has(item.internal_work_id))
   fail('SOURCE_RECEIPTED_INTERNAL_JOB_REQUIRED');
  known.add(item.internal_work_id);
  jobs.push(Object.freeze({
   internal_work_id:item.internal_work_id,
   origin_incident_id:item.origin_incident_id,
   origin_shift_id:item.origin_shift_id,
   kind:item.kind,assignee:item.assignee,
   independent_reviewer:item.independent_reviewer,
   source_ref:item.source_ref,phase:item.phase,
   independent_review_receipt_sha256:item.independent_review_receipt_sha256,
   frozen_reproduction_verified:item.frozen_reproduction_verified,
   worker_handling_state:HANDLING.has(item.worker_handling_state)?
    item.worker_handling_state:'SOURCE_PROGRESS_NOT_INDEPENDENTLY_VERIFIED',
   independent_failure_baseline_receipt_sha256:
    HASH.test(item.independent_failure_baseline_receipt_sha256||'')?
     item.independent_failure_baseline_receipt_sha256:null,
   independent_frozen_test_receipt_sha256:
    HASH.test(item.independent_frozen_test_receipt_sha256||'')?
     item.independent_frozen_test_receipt_sha256:null,
   independent_review_status:item.independent_review_status||null,
   worker_baseline_attempts:Number.isSafeInteger(item.worker_baseline_attempts)?
    item.worker_baseline_attempts:0,
   repair_verified:item.repair_verified,
   signed_executor_action:item.signed_executor_action||null,
   signed_executor_state:item.signed_executor_state||null,
   signed_executor_attempt_count:item.signed_executor_attempt_count||null,
   source_requalification_receipt_sha256:
    item.source_requalification_receipt_sha256||null,
   ci_dispatch_receipt_sha256:item.ci_dispatch_receipt_sha256||null,
   ci_github_trigger_commit_sha:item.ci_github_trigger_commit_sha||null,
   ci_independent_diagnostic_receipt_sha256:
    item.ci_independent_diagnostic_receipt_sha256||null,
   ci_independent_github_run_id:item.ci_independent_github_run_id||null,
   ci_independent_artifact_digest:item.ci_independent_artifact_digest||null,
   original_customer_job_completed:false
  }));
 }
 const unfinished=jobs.filter(j=>j.phase!=='INTERNAL_REPAIR_VERIFIED_CLOSED');
 const active=shifts.find(s=>
  ['QUEUED','RUNNING','AWAITING_EXACT_ORIGINAL_WORK'].includes(s?.status)&&
  (s.planned_end_at==='infinity'||
    Number.isFinite(Date.parse(s.planned_end_at||''))&&
    Date.parse(s.planned_end_at)>Date.now())&&
  s.closed_at==null);
 // An independent worker can discover maintenance AFTER the owner signs.
 // Never let the new incident inherit the prior exact two-job warrant.
 const warrant=readback.active_maintenance_warrant??null;
 let authorizedIds=[],outsideWarrantIds=[];
 if(warrant!==null){
  if(warrant.status!=='VERIFIED_ACTIVE_OWNER_MAINTENANCE_WARRANT_SCOPE'||
     warrant.mode!=='UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS'||
     warrant.state!=='ACTIVE'||
     !UUID.test(warrant.shift_id||'')||
     !HASH.test(warrant.plan_fingerprint||'')||
     !active||warrant.shift_id!==active.shift_id||
     !Array.isArray(warrant.source_scope)||
     warrant.source_scope.length<1||warrant.source_scope.length>4)
   fail('EXACT_OWNER_MAINTENANCE_WARRANT_SOURCE_UNVERIFIED');
  const ids=new Set(),indices=new Set();
  for(const claim of warrant.source_scope){
   const original=jobs.find(j=>j.origin_incident_id===claim.maintenance_id);
   if(!UUID.test(claim.maintenance_id||'')||
      !Number.isSafeInteger(claim.step_index)||
      claim.step_index<2||claim.step_index>5||
      ids.has(claim.maintenance_id)||indices.has(claim.step_index)||
      !original||original.source_ref!==claim.source_ref||
      original.origin_shift_id!==claim.origin_shift_id||
      original.independent_review_receipt_sha256!==
       claim.independent_review_receipt_sha256)
    fail('SIGNED_MAINTENANCE_WARRANT_MISMATCH_OR_REPLAY');
   ids.add(claim.maintenance_id);indices.add(claim.step_index);
  }
  authorizedIds=unfinished.filter(j=>ids.has(j.origin_incident_id))
   .map(j=>j.origin_incident_id);
  outsideWarrantIds=unfinished.filter(j=>!ids.has(j.origin_incident_id))
   .map(j=>j.origin_incident_id);
 }else outsideWarrantIds=unfinished.map(j=>j.origin_incident_id);
 return Object.freeze({
  status:unfinished.length?'OWNER_UNFINISHED_INTERNAL_MAINTENANCE_PRESERVED':
   'OWNER_NO_OPEN_INTERNAL_MAINTENANCE',
  open_count:unfinished.length,total_count:jobs.length,
  signed_warrant_scope_verified:warrant!==null,
  signed_warrant_shift_id:warrant?.shift_id||null,
  signed_unfinished_count:authorizedIds.length,
  signed_maintenance_incident_ids:Object.freeze(authorizedIds),
  newly_discovered_outside_warrant_count:outsideWarrantIds.length,
  outside_warrant_incident_ids:Object.freeze(outsideWarrantIds),
  origin_shift_ids:[...new Set(unfinished.map(j=>j.origin_shift_id))],
  items:Object.freeze(unfinished),
  current_shift_id:active?.shift_id||null,
  next_action:!unfinished.length?'NO_MAINTENANCE_CONTINUATION_NEEDED':
   warrant?'CONTINUE_EXACT_SIGNED_MAINTENANCE_AND_ISOLATE_NEW_INCIDENTS':
   active?'VERIFY_ACTIVE_SHIFT_EXACT_MAINTENANCE_SCOPE':
   'EXACT_AUTHENTICATED_COMPLETION_BOUND_SHIFT_REQUIRED',
  no_new_shift_started:true,original_shifts_reopened:false,
  owner_authority_granted:false,repair_completed_by_read:false,
  customer_job_completed:false,production_changed:false
 });
}
