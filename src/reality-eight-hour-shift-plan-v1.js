// An evidence-first configurable WORKDAY DRAFT. All timings are provisional shift
// timeboxes, NOT measured human-equivalent labor or a worker dispatch schedule.
// The plan MUST NOT act as job, tool, installation or shift authorization.
export const EIGHT_HOUR_SHIFT_PLAN_VERSION='reality-eight-hour-employee-shift-draft-v1';
const URL=/^https:\/\/github\.com\/maloney2323\/Reality\/(?:issues|pull|actions\/runs)\/[1-9][0-9]*$/;
const KIND=['OPEN_ISSUE','OPEN_PULL_REQUEST','RECURRING_FAILURE'];
const freeze=x=>Object.freeze(x);
const fail=x=>{throw Error('REALITY_EIGHT_HOUR_SHIFT_'+x)};
const isNum=x=>Number.isSafeInteger(x)&&x>=0;
function acceptedSource(item){
 if(!item||!/^catalog:[a-f0-9]{32}$/.test(String(item.finding_id||''))||
    !KIND.includes(item.finding_type)||typeof item.title!=='string'||
    !item.title.trim()||item.title.length>300||
    !Array.isArray(item.evidence_refs)||item.evidence_refs.length<1||
    !item.evidence_refs.every(u=>typeof u==='string'&&URL.test(u))||
    item.verified_current_defect!==false||item.authorized_execution!==false||
    item.customer_job_approved!==false||
    item.verified_time_saved_minutes!==null||
    item.human_baseline_minutes!==null||
    (item.priority_heuristic!==null&&
      (!isNum(item.priority_heuristic)||item.priority_heuristic>100)))
  return false;
 return true;
}
export function buildRealityEightHourShiftDraft(brief,{durationHours=8,prioritySourceRefs=[]}={}){
 if(!Array.isArray(prioritySourceRefs)||prioritySourceRefs.length>25||
    prioritySourceRefs.some(x=>typeof x!=='string'||!URL.test(x))||
    new Set(prioritySourceRefs).size!==prioritySourceRefs.length)
  fail('OWNER_SOURCE_PRIORITY_INVALID');
 if(!Number.isSafeInteger(durationHours)||durationHours<1||durationHours>12)
  fail('DURATION_NOT_SUPPORTED');
 // Preserve already-fingerprinted 8/10/12-hour window definitions exactly.
 // Other owner-requested durations use a bounded proportional allocation of
 // eight existing control stages. No stage exceeds the DB's 120-minute cap.
 const legacy=[8,10,12].includes(durationHours);
 const addedMinutesPerWindow=legacy?(durationHours-8)/2*15:0;
 const baseWeights=[75,90,90,90,90,120,90,75];
 const totalMinutes=durationHours*60;
 const scaled=legacy?null:baseWeights.map(weight=>
  Math.floor(totalMinutes*weight/720));
 if(scaled){
  let remaining=totalMinutes-scaled.reduce((a,b)=>a+b,0);
  for(let i=0;remaining>0;i=(i+1)%scaled.length){
   scaled[i]++;remaining--;
  }
  if(scaled.reduce((a,b)=>a+b,0)!==totalMinutes||
   scaled.some((n,i)=>n<1||n>baseWeights[i]))
   fail('VARIABLE_SHIFT_WINDOW_ALLOCATION_INVALID');
 }
 const c=brief?.counts;
 if(!brief||!['SOURCE_BACKED_DISCOVERY_OBSERVED',
     'SOURCE_BACKED_DISCOVERY_PARTIAL'].includes(brief.status)||
   brief.phase!=='DISCOVERY_AND_PRIORITIZATION_ONLY_NOT_AN_EXECUTED_WORKDAY'||
   brief.source_scope!=='REALITY_GITHUB_REPOSITORY_ONLY'||
   brief.evidence_status!=='SOURCE_BACKED_OBSERVATIONS_NOT_INDEPENDENTLY_CONFIRMED_DEFECTS'||
   brief.read_only!==true||brief.installation_authorized!==false||
   brief.job_started!==false||brief.production_changed!==false||
   brief.shift_completed!==false||
   !Array.isArray(brief.items)||brief.items.length>25||
   !brief.items.every(acceptedSource)||
   !isNum(c?.source_backed_opportunities)||
   !isNum(c?.open_issues)||!isNum(c?.open_pull_requests)||
   !isNum(c?.historical_failure_signals)||
   c.open_issues+c.open_pull_requests+c.historical_failure_signals!==
     c.source_backed_opportunities||
   c.verified_current_defects!==0||c.approved_autonomous_repairs!==0||
   c.completed_customer_jobs_from_this_report!==0||
   !brief.value_measurement||
   brief.value_measurement.verified_cash_savings_usd!==null||
   brief.value_measurement.financial_roi_verified!==false)
  fail('UNVERIFIED_DISCOVERY_SOURCE');
 const seenIds=new Set(),seenLinks=new Set(),unique=[];
 let duplicates=0;
 for(const item of brief.items){
   const key=item.evidence_refs[0];
   if(seenIds.has(item.finding_id)||seenLinks.has(key)){duplicates++;continue}
   seenIds.add(item.finding_id);seenLinks.add(key);
   unique.push(item);
 }
 // Owner-reconciled, source-backed priorities only reorder validation
 // windows. A preferred open issue is NOT an executable job or new grant.
 const sourceOrder=new Map(prioritySourceRefs.map((url,i)=>[url,i]));
 const allowedUrls=new Set(unique.map(x=>x.evidence_refs[0]));
 if(prioritySourceRefs.some(url=>!allowedUrls.has(url)))
  fail('OWNER_PRIORITY_SOURCE_NOT_IN_REVIEWED_BRIEF');
 unique.sort((a,b)=>
  (sourceOrder.get(a.evidence_refs[0])??999)-
   (sourceOrder.get(b.evidence_refs[0])??999));
 const take=(kind)=>{
   const i=unique.findIndex(x=>x.finding_type===kind);
   return i<0?null:unique.splice(i,1)[0];
 };
 // Prioritize source validation, then code-review opportunities. Only
 // explicit source identity is de-duplicated: underlying issue/PR overlap
 // cannot be certified without independent cross-record review.
 const chosen=[take('OPEN_ISSUE'),
   take('RECURRING_FAILURE')||take('OPEN_ISSUE')||take('OPEN_PULL_REQUEST'),
   take('OPEN_PULL_REQUEST')||take('OPEN_ISSUE'),
   take('OPEN_ISSUE')||take('OPEN_PULL_REQUEST')||take('RECURRING_FAILURE')];
 let cursor=0;
 const slots=[];
 function add(id,mins,stage,action,candidate=null,requiredGate=null){
   if(!isNum(mins)||mins===0)fail('INVALID_TIMEBOX');
   const boundedMinutes=scaled?scaled[slots.length]:
    mins+addedMinutesPerWindow;
   if(boundedMinutes>120)fail('INVALID_TIMEBOX');
   const step=freeze({
    sequence:slots.length+1,id,offset_start_minutes:cursor,
    offset_end_minutes:cursor+boundedMinutes,planning_minutes:boundedMinutes,
    stage,action,candidate: candidate?freeze({
      finding_id:candidate.finding_id,
      title:candidate.title,
      source_url:candidate.evidence_refs[0],
      finding_type:candidate.finding_type,
      priority_heuristic:candidate.priority_heuristic,
      verified_current_defect:false,
      authorized_execution:false
    }):null,
    status: candidate?'SOURCE_OBSERVED_REQUIRES_VALIDATION':
      (requiredGate?'CONDITIONAL_NOT_EXECUTION_READY':'READ_ONLY_PLANNED'),
    required_gate:requiredGate,
    elapsed_minutes_not_human_labor:true
   });
   slots.push(step);cursor+=boundedMinutes;
 }
 add('preflight',45,'SOURCE_RECONCILIATION',
   'Recheck connected sources, previously settled work, duplicated issues and PRs, and unresolved original-job state.');
 add('issue_validation',60,'VERIFY_OPEN_ISSUE',
   'Verify the highest-ranked tracked issue remains unresolved and is not historical or a parent objective.',chosen[0]);
 add('failure_reproduction',60,'VERIFY_PROVIDER_EVIDENCE',
   'Reproduce a current failure or independently validate the next distinct source observation.',chosen[1]);
 add('change_review',60,'REVIEW_INDEPENDENT_EVIDENCE',
   'Inspect pending code changes, dependencies, test scope and possible overlap with the original issue.',chosen[2]);
 add('additional_triage',60,'QUALIFY_NEXT_WORK',
   'Qualify another distinct provider-backed observation for impact, ownership and missing capabilities.',chosen[3]);
 add('governed_execution',90,'CONDITIONAL_EXECUTION_WINDOW',
   'Reserve capacity for an exact approved original job only after independent gap verification. No automatic install, merge or replay.',
   null,'ORIGINAL_WORK_AUTHORIZATION_AND_ANY_SEPARATE_EXACT_UPGRADE_APPROVAL');
 add('independent_acceptance',60,'CONDITIONAL_VERIFICATION_WINDOW',
   'If execution was authorized and completed, independently test the exact outcome and reconcile its final original-job receipt.',
   null,'ACCEPTED_ORIGINAL_JOB_AND_INDEPENDENT_SETTLEMENT');
 add('shift_close',45,'EVIDENCE_AND_VALUE_REPORT',
   'Reconcile accepted outcomes and blocked work; record measured costs, human interventions and task-scoped comparable labor only when supported.');
 if(cursor!==durationHours*60||slots.length!==8)fail('SHIFT_ALLOCATION_INVALID');
 const allocated=chosen.filter(Boolean);
 return freeze({
  version:EIGHT_HOUR_SHIFT_PLAN_VERSION,
  status:'DRAFT_ONLY_NOT_SCHEDULED_OR_AUTHORIZED',
  source_status:brief.status,
  source_scope:brief.source_scope,
  observed_at:brief.observed_at,
  shift_duration_minutes:durationHours*60,shift_duration_hours:durationHours,
  timing:'RELATIVE_START_TIMEBOXES_NOT_MEASURED_TASK_DURATIONS',
  scheduling_state:'PROPOSED_AGENDA_NOT_PERSISTED_TO_WORKER_OR_CALENDAR',
  allocation:'EVIDENCE_FIRST_THEN_CONDITIONAL_GOVERNED_EXECUTION',
  counts:freeze({
    source_backed_opportunities:c.source_backed_opportunities,
    selected_distinct_source_records:allocated.length,
    dropped_duplicate_source_records:duplicates,
    unassigned_validation_slots:4-allocated.length,
    qualified_executable_jobs:0,
    validated_human_equivalent_hours:0
  }),
  source_coverage:brief.source_coverage,
  slots:freeze(slots),
  overlap_note:'Unique provider URLs do not prove distinct underlying work. Reconcile issues, PRs, previous settlements and parent objectives before execution or valuation.',
  benchmark_note:'NASA software repair medians can inform a later task-matched comparison; scheduling eight hours does not establish eight hours of human work saved.',
  benchmark_source_url:'https://ntrs.nasa.gov/api/citations/20160008693/downloads/20160008693.pdf',
  human_equivalent_hours_verified:null,
  measured_human_effort_minutes:null,
  verified_cash_savings_usd:null,
  financial_roi_verified:false,
  ready_to_execute_batch:false,
  read_only:true,job_started:false,shift_started:false,
  installation_authorized:false,owner_approval_created:false,
  production_changed:false
 });
}
