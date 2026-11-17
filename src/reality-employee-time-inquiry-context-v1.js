// Evidence-to-inquiry handoff for Reality's EXISTING employee discovery.
// No hardcoded questions, jobs, role names or industry assumptions.
// This is source context for the governed intelligence/qualification pipeline,
// NOT a second discovery engine, authorization or execution scheduler.
const HASH=/^sha256:[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const unresolved=new Set([
 'NEEDS_CURRENT_VALIDATION','HISTORICAL_REVALIDATION_REQUIRED'
]);
const fail=code=>{throw Error('REALITY_TEMPORAL_INQUIRY_'+code)};
export function projectRealityEmployeeTimeInquiryContext({
 ownerId,roster,time,discovery
}={}){
 if(!UUID.test(ownerId||'')||
  roster?.status!=='READ_ONLY_PROPOSED_AI_EMPLOYEES'||
  !Array.isArray(roster.proposed_employees)||
  !roster.proposed_employees.length||
  new Set(roster.proposed_employees.map(x=>x.display_name)).size!==
   roster.proposed_employees.length||
  roster.original_job_admitted!==false||
  roster.installation_authorized!==false||
  roster.production_changed!==false)
  fail('OWNER_ROSTER_NOT_VERIFIED');
 if(time?.ok!==true||
  time.status!=='REALITY_OWNER_TIME_HORIZON_READ_ONLY'||
  time.owner_scope_verified!==true||time.read_only!==true||
  time.approved_new_work_by_read!==false||
  time.shift_started_by_read!==false||
  time.deployment_changed_by_read!==false||
  time.billing_changed_by_read!==false||
  time.new_jobs_created_by_read!==0||
  time.verified_cash_savings_usd!==null)
  fail('TIME_READBACK_UNVERIFIED');
 if(discovery?.status!=='OWNER_EMPLOYEE_DISCOVERY_SOURCE_INVENTORY'||
  discovery.owner_id!==ownerId||discovery.shift_authorized!==false||
  discovery.installation_authorized!==false||
  discovery.production_changed!==false||
  discovery.qualified_jobs!==0||
  !Array.isArray(discovery.items)||discovery.items.length>150||
  discovery.source_count!==discovery.items.length||
  !Number.isFinite(Date.parse(discovery.checked_at||'')))
  fail('DISCOVERY_OWNER_OR_SCOPE_UNVERIFIED');
 const roles=new Map(roster.proposed_employees.map(x=>[
  x.display_name,x
 ]));
 if(discovery.items.some(x=>!roles.has(x.employee)||
  !['NEEDS_CURRENT_VALIDATION','HISTORICAL_REVALIDATION_REQUIRED',
   'SETTLED_NO_REPLAY'].includes(x.disposition)||
  typeof x.title!=='string'||!x.title.trim()||x.title.length>240||
  typeof x.source_ref!=='string'||x.source_ref.length>1024||
  !HASH.test(x.evidence_sha256||'')||
  x.qualified_job!==false||x.execution_authorized!==false))
  fail('UNTRUSTED_SOURCE_ITEM');
 const past=time.past?.status==='INDEPENDENT_HISTORY_VERIFIED'&&
  Number.isSafeInteger(time.past.verified_final_loop_receipts)&&
  time.past.verified_final_loop_receipts>=0?
  time.past.verified_final_loop_receipts:null;
 const present=time.present?.status==='OWNER_SHIFT_HISTORY_READBACK_VERIFIED'&&
  Number.isSafeInteger(time.present.active_shift_count)&&
  time.present.active_shift_count>=0?
  time.present.active_shift_count:null;
 const fresh=time.future?.status==='OWNER_DISCOVERY_OBSERVATIONS_VERIFIED'&&
  time.future.snapshot_stale===false&&
  time.future.observations_are_not_authorized_work===true&&
  time.future.qualified_executable_jobs===0&&
  time.future.source_checked_at===discovery.checked_at;
 const rows=roster.proposed_employees.map(employee=>{
  const seen=new Set(),signals=[];
  if(fresh)for(const item of discovery.items){
   if(item.employee!==employee.display_name||
    !unresolved.has(item.disposition))continue;
   const identity=item.source_ref+'|'+item.evidence_sha256;
   if(seen.has(identity))continue;
   seen.add(identity);
   signals.push(Object.freeze({
    employee_name:employee.display_name,
    source_title:item.title,
    source_ref:item.source_ref,
    source_family:item.source_family,
    evidence_sha256:item.evidence_sha256,
    evidence_disposition:item.disposition,
    source_time_perspective:item.disposition==='HISTORICAL_REVALIDATION_REQUIRED'?
     'PAST_REQUIRES_CURRENT_PROOF':'PRESENT_REQUIRES_CURRENT_PROOF',
    question_text:null,
    question_generated:false,
    source_revalidation_required:true,
    candidate_only:true,
    qualified_job:false,
    execution_authorized:false
   }));
  }
  return Object.freeze({
   employee_name:employee.display_name,
   employee_function_id:employee.function_id,
   business_outcome:employee.business_outcome,
   responsibility_context:employee.responsibilities,
   past_verified_receipt_count:past,
   present_active_shift_count:present,
   future_source_snapshot_verified:fresh,
   inquiry_sources:Object.freeze(signals),
   source_inquiries_available:signals.length,
   questions_generated:0,
   question_synthesis_status:'NEEDS_GOVERNED_MODEL_INQUIRY_FROM_EVIDENCE',
   auto_dispatched_jobs:0,
   execution_authorized:false
  });
 });
 return Object.freeze({
  status:fresh?'VERIFIED_TIME_SOURCES_AVAILABLE_FOR_EMPLOYEE_INQUIRY':
   'TIME_DISCOVERY_STALE_OR_UNVERIFIED_NO_INQUIRY_ADMITTED',
  owner_scope_verified:true,read_only:true,
  source_checked_at:fresh?discovery.checked_at:null,
  past_verified_receipt_count:past,
  present_active_shift_count:present,
  future_source_snapshot_verified:fresh,
  roles:Object.freeze(rows),
  total_inquiry_sources:rows.reduce((sum,row)=>
   sum+row.source_inquiries_available,0),
  // The existing model must synthesize its own grounded questions from these
  // sources before qualification. Do not pretend a question or job was made.
  generated_question_count:0,
  qualified_executable_jobs:0,
  shifts_started:0,
  new_original_jobs_created:0,
  execution_authorized:false,
  installation_authorized:false,
  production_changed:false
 });
}
