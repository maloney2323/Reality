// Reconcile PRE-EXISTING owner source inventories with ONE exact active shift.
// A weekly source snapshot and Homepage capability proposal are evidence of
// possible work, not a license to create or install an original. The existing
// worker independently performs all current-original admission and execution.
export const REALITY_INTEGRATED_SHIFT_INTAKE_VERSION=
 'reality-existing-shift-integrated-intake-v1';
const SHA=/^sha256:[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const ISSUE=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/[1-9]\d*$/;
const fail=x=>{throw Error('REALITY_INTEGRATED_INTAKE_'+x)};
const allow=new Set(['RESEARCH_OPPORTUNITY','INDEPENDENTLY_TESTED_CANDIDATE',
 'FROZEN_UNBOUND_SOURCE','VERIFIED_SOURCE_CANDIDATE']);
export function projectRealityExistingShiftIntegratedIntake({
 graph,supervisor,weekly,capabilityFeed
}={}){
 if(graph?.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||
  !UUID.test(graph.shift_id||'')||
  !UUID.test(graph.owner_id||'')||
  !SHA.test(graph.plan_fingerprint||'')||
  supervisor?.status!=='AUTOMATIC_SOURCE_TRIAGE_RECONCILED_NO_NEW_AUTHORITY'||
  supervisor.shift_id!==graph.shift_id||
  supervisor.owner_id!==graph.owner_id||
  supervisor.read_only!==true||
  supervisor.current_shift_complete===true||
  supervisor.production_changed!==false||
  supervisor.install_approval_authorized_by_triage!==false||
  supervisor.original_job_admission_authorized_by_triage!==false||
  !Array.isArray(supervisor.jobs)||supervisor.jobs.length>4||
  !Array.isArray(graph.jobs)||graph.jobs.length!==supervisor.jobs.length||
  weekly?.status!=='EXISTING_WEEKLY_SOURCE_SNAPSHOT_RECONCILED_READ_ONLY'||
  weekly.owner_scope_verified!==true||
  weekly.shift_id!==graph.shift_id||
  weekly.plan_fingerprint!==graph.plan_fingerprint||
  !SHA.test('sha256:'+weekly.source_sha256)||
  weekly.snapshot_is_original_job_qualification!==false||
  weekly.snapshot_is_new_execution_authority!==false||
  weekly.execution_authorized_by_read!==false||
  weekly.installation_authorized!==false||
  weekly.production_changed!==false||
  !Number.isInteger(weekly.open_issue_count)||weekly.open_issue_count>30||
  weekly.open_issue_count<0||
  !Array.isArray(weekly.open_issues)||
  weekly.open_issues.length!==weekly.open_issue_count||
  capabilityFeed?.status!=='OWNER_GAP_INTAKE_RECONCILED'||
  capabilityFeed.ok!==true||
  capabilityFeed.owner_id!==graph.owner_id||
  capabilityFeed.read_only!==true||
  capabilityFeed.work_started!==false||
  capabilityFeed.production_changed!==false||
  !Array.isArray(capabilityFeed.items)||capabilityFeed.items.length>20||
  !capabilityFeed.counts||
  capabilityFeed.counts.current_candidates!==capabilityFeed.items.length||
  !Number.isSafeInteger(capabilityFeed.counts.verified_current_gaps)||
  capabilityFeed.counts.verified_current_gaps<0)
  fail('SOURCE_OWNER_AND_WARRANT_BINDING_UNVERIFIED');
 const selected=new Map(),done=new Set();
 for(const s of supervisor.jobs){
  if(selected.has(s?.source_ref)||typeof s?.source_ref!=='string'||
   s.claim_consumed!==false||s.creates_job!==false||
   s.approved_installation!==false||
   s.production_changed!==false)
   fail('CURRENT_ORIGINAL_SOURCE_SCOPE_UNVERIFIED');
  const exact=graph.jobs.find(g=>g.source_ref===s.source_ref);
  if(!exact||exact.source_step_index!==s.source_step_index||
     exact.original_work_id!==s.original_work_id)
   fail('CURRENT_WARRANT_SOURCE_CHANGED');
  selected.set(s.source_ref,s);
  if(s.status==='EXACT_ORIGINAL_INDEPENDENTLY_SETTLED_NO_REPLAY'){
   if(!s.independently_verified_final_receipt_ref)
    fail('SETTLEMENT_RECEIPT_MISSING');
   done.add(s.source_ref);
  }
 }
 const weeklySeen=new Set();
 const weekJobs=weekly.open_issues.map((item)=>{
  const url=item?.issue_url;
  if(!ISSUE.test(url||'')||
   Number(url.slice(url.lastIndexOf('/')+1))!==item.issue_number||
   weeklySeen.has(url)||typeof item.title!=='string'||
   item.title.length<5||item.title.length>220)
   fail('WEEKLY_PROVIDER_SOURCE_SCOPE_UNVERIFIED');
  weeklySeen.add(url);
  const q=item.qualification;
  const statuses=new Set([
   'PRIOR_ORIGINAL_SETTLED_NO_REPLAY',
   'EXACT_ORIGINAL_CONTINUATION_REQUIRES_EVIDENCE',
   'CURRENT_OWNER_OBJECTIVE_NEEDS_EXACT_TASK',
   'CURRENT_FAILURE_REPRODUCTION_REQUIRED',
   'SOURCE_REVIEW_NEEDS_CURRENT_PROOF'
  ]);
  if(q!=null&&
   (typeof q!=='object'||Array.isArray(q)||
    !statuses.has(q.status)||
    !['Riley','Taylor','Quinn','Avery','Casey','Morgan','Jordan','Sage']
     .includes(q.employee)||
    q.evidence!=='GITHUB_CURRENT_OPEN_ISSUE_READBACK'||
    typeof q.next_proof!=='string'||q.next_proof.length<20||
    q.executable_original!==false||
    q.execution_authorized!==false||
    q.installation_authorized!==false||
    q.verified_current_defect!==false))
   fail('WEEKLY_SOURCE_UPSTREAM_QUALIFICATION_UNVERIFIED');
  const matching=selected.get(url);
  const status=done.has(url)?
   'SETTLED_CURRENT_WARRANT_NO_REPLAY':
   matching?
    'INSIDE_CURRENT_WARRANT_QUALIFICATION_REQUIRED':
    'OUTSIDE_CURRENT_WARRANT_REVIEW_ONLY';
  return Object.freeze({
   source_url:url,title:item.title,source_kind:'GITHUB_OPEN_ISSUE_SNAPSHOT',
   scope_status:status,
   current_shift_step_index:matching?.source_step_index??null,
   exact_original_work_id:matching?.original_work_id??null,
   upstream_qualification_status:q?.status||
    'LEGACY_SOURCE_NEEDS_AUTOMATIC_INSPECTION',
   investigation_employee:q?.status==='PRIOR_ORIGINAL_SETTLED_NO_REPLAY'?null:
    q?.employee||null,
   independent_next_proof:q?.next_proof||null,
   source_provider_checked_upstream:q?.evidence===
    'GITHUB_CURRENT_OPEN_ISSUE_READBACK',
   is_executable_original:false,
   owner_authorization_created:false,
   installation_authorized:false,
   work_replayed:false,
  });
 });
 const upgradeSeen=new Set();
 const upgrades=capabilityFeed.items.map(item=>{
  if(!allow.has(item?.kind)||typeof item.key!=='string'||
   !item.key.trim()||upgradeSeen.has(item.key)||
   typeof item.title!=='string'||item.title.length<6||
   item.title.length>240||
   item.executable_job!==false||
   item.installation_authorized!==false||
   item.verified_missing_capability!==false)
   fail('HOMEPAGE_CAPABILITY_CANDIDATE_UNVERIFIED');
  upgradeSeen.add(item.key);
  return Object.freeze({
   key:item.key,kind:item.kind,title:item.title,
   potential_value:typeof item.potential_value==='string'?
     item.potential_value.slice(0,420):null,
   next_proof:typeof item.next_proof==='string'?
     item.next_proof.slice(0,560):null,
   stage:item.stage||'INSPECTED_REQUIRES_INDEPENDENT_VERIFICATION',
   intake_status:item.kind==='INDEPENDENTLY_TESTED_CANDIDATE'?
    'TESTED_HISTORICALLY_REQUIRES_FRESH_ORIGINAL_BINDING':
    'RESEARCH_REQUIRES_GENUINE_GAP_TEST',
   is_executable_original:false,
   installation_authorized:false,
   new_owner_work_authorized:false
  });
 });
 const settled=supervisor.independently_settled_originals;
 const unqualified=supervisor.sources_needing_distinct_qualification;
 if(!Number.isInteger(settled)||settled<0||
  !Number.isInteger(unqualified)||unqualified<0||
  unqualified+settled>supervisor.selected_source_count||
  !Number.isSafeInteger(capabilityFeed.counts.current_candidates)||
  upgrades.length>20)
  fail('INTEGRATED_WORK_COUNTS_UNVERIFIED');
 const status='AUTO_INTAKE_'+settled+'_SETTLED_'+unqualified+
  '_UNQUALIFIED_'+weekJobs.length+'_WEEKLY_'+upgrades.length+'_UPGRADES';
 if(!/^[A-Z0-9_]{3,100}$/.test(status))
  fail('DURABLE_WORKER_DIAGNOSTIC_INVALID');
 return Object.freeze({
  version:REALITY_INTEGRATED_SHIFT_INTAKE_VERSION,
  status:'CURRENT_WARRANT_AND_EXISTING_WORK_INVENTORY_RECONCILED_READ_ONLY',
  owner_id:graph.owner_id,shift_id:graph.shift_id,
  plan_fingerprint:graph.plan_fingerprint,
  week_start:weekly.week_start,
  week_source_sha256:weekly.source_sha256,
  independent_settlements_recognized:settled,
  current_shift_sources_needing_qualification:unqualified,
  weekly_source_observations:weekJobs.length,
  upstream_provider_inspected_source_count:weekJobs.filter(x=>
   x.source_provider_checked_upstream).length,
  employee_investigation_tasks_organized:weekJobs.filter(x=>
   x.source_provider_checked_upstream&&x.investigation_employee!==null).length,
  previously_settled_weekly_sources_excluded:weekJobs.filter(x=>
   x.upstream_qualification_status==='PRIOR_ORIGINAL_SETTLED_NO_REPLAY').length,
  homepage_upgrade_opportunities:upgrades.length,
  verified_current_capability_gaps:capabilityFeed.counts.verified_current_gaps,
  // Research, historic and source-checked observations are NOT executable
  // under the existing original-job warrant.
  qualified_new_original_jobs_from_this_projection:0,
  weekly_sources:Object.freeze(weekJobs),
  homepage_capability_candidates:Object.freeze(upgrades),
  next_worker_pulse_code:status,
  next_action:unqualified?
   'QUALIFY_EXACT_EXISTING_SHIFT_ORIGINALS_BEFORE_EXECUTION':
   'RECHECK_TRUSTED_ORIGINAL_WORK_DRIVER',
  current_shift_scope_extended:false,
  original_jobs_created:false,
  original_jobs_started:false,
  owner_approval_consumed:false,
  installation_authorized:false,
  production_changed:false,
  read_only:true
 });
}
