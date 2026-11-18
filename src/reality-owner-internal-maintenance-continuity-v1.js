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
   repair_verified:item.repair_verified,
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
 return Object.freeze({
  status:unfinished.length?'OWNER_UNFINISHED_INTERNAL_MAINTENANCE_PRESERVED':
   'OWNER_NO_OPEN_INTERNAL_MAINTENANCE',
  open_count:unfinished.length,total_count:jobs.length,
  origin_shift_ids:[...new Set(unfinished.map(j=>j.origin_shift_id))],
  items:Object.freeze(unfinished),
  current_shift_id:active?.shift_id||null,
  next_action:!unfinished.length?'NO_MAINTENANCE_CONTINUATION_NEEDED':
   active?'CONTINUE_EXISTING_SIGNED_SHIFT_MAINTENANCE_RECHECK_THEN_FROZEN_TEST':
   'EXACT_AUTHENTICATED_COMPLETION_BOUND_SHIFT_REQUIRED',
  no_new_shift_started:true,original_shifts_reopened:false,
  owner_authority_granted:false,repair_completed_by_read:false,
  customer_job_completed:false,production_changed:false
 });
}
