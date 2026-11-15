import {publishedRepairEffortReference} from './reality-published-repair-effort-v1.js';
/* Existing next-week employee planner -> shared, truthful workload-gap read model.
 * The SAME deterministic projection is used on authenticated Home and by
 * Reality Chat's existing Universe cognition window. No new queue or ledger.
 * A review timebox is NOT scheduled execution, measured human work, or ROI.
 */
export const WEEKLY_WORKLOAD_INSIGHT_VERSION='reality-weekly-workload-insight-v1';
const PLAN_VERSION='reality-next-week-employee-plan-v1';
const PLAN_STATUS='NEXT_WEEK_DRAFT_PREPARED_AWAITING_OWNER_SHIFT_AUTHORIZATION';
const CAPACITY='HYPOTHETICAL_EIGHT_HOUR_ROLE_SCENARIO_NOT_A_SCHEDULE_OR_HUMAN_SAVINGS';
const ID=/^catalog:[a-f0-9]{32}$/;
const LINK=/^https:\/\/github\.com\/maloney2323\/Reality\/(?:issues|pull|actions\/runs)\/[1-9][0-9]*$/;
const date=/^\d{4}-\d\d-\d\d$/;
const half=x=>Number.isFinite(x)&&x>=0&&x<=60&&x*2===Math.round(x*2);
const fail=why=>{throw Error('WEEKLY_WORKLOAD_INSIGHT_'+why)};
export function projectRealityWeeklyWorkloadInsight(plan){
 if(plan?.version!==PLAN_VERSION||plan.status!==PLAN_STATUS||
  plan.calendar_time_zone!=='America/New_York'||
  !date.test(plan.week_start||'')||!date.test(plan.week_end||'')||
  !Array.isArray(plan.employee_roles)||plan.employee_roles.length<1||
  plan.employee_roles.length>16||plan.employee_roles.length!==plan.employee_role_count||
  plan.capacity_unit!==CAPACITY||
  plan.daily_hours_follow_source_workload_not_a_fixed_eight_hour_quota!==true||
  plan.candidate_source_review_assignments_not_jobs!==true||
  plan.read_only!==true||plan.owner_shift_authorization_recorded!==false||
  plan.installation_authorized!==false||
  plan.external_business_actions_authorized!==false||
  plan.production_changed!==false||
  plan.next_week_prepared_without_executing_jobs!==true||
  plan.verified_human_hours_saved!==null||
  plan.verified_financial_roi_usd!==null||
  !(Number.isFinite(plan.proposed_review_timebox_hours_total)&&
   plan.proposed_review_timebox_hours_total>=0&&
   plan.proposed_review_timebox_hours_total<=plan.employee_role_count*60&&
   plan.proposed_review_timebox_hours_total*2===Math.round(plan.proposed_review_timebox_hours_total*2))||
  !Number.isSafeInteger(plan.proposed_work_findings)||
  plan.proposed_work_findings<0||
  !Number.isSafeInteger(plan.five_day_week_capacity_hours)||
  plan.five_day_week_capacity_hours<=0||
  plan.five_day_week_capacity_hours/plan.employee_role_count!==40)
  fail('TRUSTED_NEXT_WEEK_PROVISIONAL_PLAN_REQUIRED');
 const nasa=publishedRepairEffortReference();
 if(nasa.reference_scope!=='HUMAN_SOFTWARE_FAULT_REPAIR_NOT_GENERAL_UPGRADE_OR_PR_WORK'||
  nasa.study.median_investigation_hours!==2||nasa.study.median_implementation_hours!==3||
  nasa.combined_reference_hours!==5||
  nasa.public_median_developer_wage_usd_per_hour!==65.38||
  nasa.calibrated_to_reality_task_durations!==false||
  nasa.verified_actual_cash_savings_usd!==null)
  fail('PUBLISHED_HUMAN_REPAIR_REFERENCE_NOT_VERIFIED');
 const seenRoles=new Set(),seenSources=new Set();
 let total=0,unallocated=0,deferred=0,nasaCandidates=0;
 const roles=[];
 for(const role of plan.employee_roles){
  if(typeof role?.employee_name!=='string'||role.employee_name.length<2||
   role.employee_name.length>80||
   typeof role.role_title!=='string'||role.role_title.length<2||
   role.role_title.length>130||
   typeof role.function_id!=='string'||!/^[a-z][a-z_]{2,80}$/.test(role.function_id)||
   seenRoles.has(role.function_id)||
   role.active_worker_verified!==false||
   role.approved_execution_hours!==0||
   role.completed_productive_hours_verified!==null||
   role.independently_verified_jobs_completed!==0||
   !half(role.provisional_weekly_review_timebox_hours)||
   !Number.isSafeInteger(role.candidate_finding_count)||role.candidate_finding_count<0||
   !Array.isArray(role.week_days)||role.week_days.length!==5||
   !Array.isArray(role.deferred_source_findings)||
   role.deferred_source_count!==role.deferred_source_findings.length)
   fail('ROLE_PLAN_SOURCE_NOT_VERIFIED');
  seenRoles.add(role.function_id);
  let hours=0,count=0,roleNasaCandidates=0;
  const days=[];
  for(const [i,day] of role.week_days.entries()){
   if(!date.test(day?.date||'')||
    day.weekday!==['Monday','Tuesday','Wednesday','Thursday','Friday'][i]||
    day.daily_planning_upper_limit_hours!==12||
    day.shifts_authorized!==false||
    day.actual_work_hours_verified!==null||
    day.proposed_execution_shift_hours!==null||
    day.timebox_is_verified_task_duration!==false||
    !half(day.provisional_review_timebox_hours)||
    day.provisional_review_timebox_hours>12||
    !Array.isArray(day.assignments)||day.assignments.length>24)
    fail('DAILY_DRAFT_NOT_VERIFIED');
   const refs=[];
   let dayHours=0;
   for(const a of day.assignments){
    if(!ID.test(a?.finding_id||'')||
     seenSources.has(a.finding_id)||!LINK.test(a.source_url||'')||
     typeof a.title!=='string'||a.title.length<1||a.title.length>500||
     a.status!=='SOURCE_OBSERVATION_REQUIRES_INDEPENDENT_QUALIFICATION'||
     !['UNCALIBRATED_ONE_HOUR_SOURCE_TRIAGE_PLACEHOLDER',
      'OWNER_REVIEW_TIMEBOX_ASSUMPTION_UNVERIFIED'].includes(a.timebox_basis)||
     !half(a.proposed_review_timebox_hours)||a.proposed_review_timebox_hours<0.5||
     a.accepted_task_duration_hours!==null||
     a.owner_execution_authorized!==false||
     a.human_effort_hours_verified!==null||
     a.ai_execution_hours_verified!==null)
     fail('DUPLICATE_OR_EXECUTABLE_SOURCE_FINDING');
    seenSources.add(a.finding_id);count++;
    dayHours+=a.proposed_review_timebox_hours;
    // A catalog bug/reliability ISSUE is an unverified fault candidate,
    // not a demonstrated repair or a NASA-calibrated task duration.
    const nasaCandidate=role.function_id==='software_engineering'&&
     ['bugs','reliability'].includes(a.category)&&
     /\/issues\/[1-9][0-9]*$/.test(a.source_url);
    if(nasaCandidate){roleNasaCandidates++;nasaCandidates++;}
    refs.push(Object.freeze({
     finding_id:a.finding_id,title:a.title.slice(0,200),
     source_url:a.source_url,
     review_hours:a.proposed_review_timebox_hours,
     timebox_basis:a.timebox_basis,
     nasa_fault_candidate_needs_validation:nasaCandidate,
     qualified_executable_job:false
    }));
   }
   if(dayHours!==day.provisional_review_timebox_hours)
    fail('DAY_SUM_NOT_RECONCILED');
   hours+=dayHours;
   days.push(Object.freeze({
    date:day.date,weekday:day.weekday,
    provisional_review_timebox_hours:dayHours,
    source_finding_count:refs.length,
    source_findings:Object.freeze(refs),
    execution_authorized:false,actual_work_hours_verified:null
   }));
  }
  for(const deferredSource of role.deferred_source_findings){
   if(!ID.test(deferredSource?.finding_id||'')||
    seenSources.has(deferredSource.finding_id)||
    !LINK.test(deferredSource.source_url||'')||
    deferredSource.owner_execution_authorized!==false)
    fail('DEFERRED_SOURCE_NOT_VERIFIED');
   seenSources.add(deferredSource.finding_id);
  }
  if(hours!==role.provisional_weekly_review_timebox_hours||
   count+role.deferred_source_count!==role.candidate_finding_count)
   fail('ROLE_SOURCE_COVERAGE_MISMATCH');
  total+=hours;deferred+=role.deferred_source_count;
  const remainder=Math.max(0,40-hours);
  unallocated+=remainder;
  roles.push(Object.freeze({
   employee_name:role.employee_name,role_title:role.role_title,
   function_id:role.function_id,
   proposed_review_timebox_hours:hours,
   hypothetical_weekly_comparison_hours:40,
   unallocated_hypothetical_reference_hours:remainder,
   comparison_coverage_percent:Math.min(100,Math.round(hours/40*100)),
   above_hypothetical_reference_hours:Math.max(0,hours-40),
   source_finding_count:count,deferred_source_count:role.deferred_source_count,
   nasa_fault_candidates_needing_validation:roleNasaCandidates,
   week_days:Object.freeze(days),
   scheduled_execution_hours_verified:null,
   independently_completed_work_hours_verified:null,
   active_worker_verified:false
  }));
 }
 if(total!==plan.proposed_review_timebox_hours_total||
  seenSources.size!==plan.proposed_work_findings||
  deferred!==plan.source_items_deferred_beyond_timebox_capacity)
  fail('WHOLE_WEEK_SOURCE_RECONCILIATION_FAILED');
 // The screenshot-style 40h reference is most useful for roles that
 // actually have source-backed proposed work. Do not turn the other roles'
 // empty profiles into invented missing customer jobs.
 const scoped=roles.filter(r=>r.source_finding_count+r.deferred_source_count>0);
 const scopedHours=scoped.reduce((n,r)=>n+r.proposed_review_timebox_hours,0);
 const scopedReference=scoped.length*40;
 const scopedUnallocated=scoped.reduce((n,r)=>
  n+r.unallocated_hypothetical_reference_hours,0);
 const refs=[...new Set(roles.flatMap(role=>
  role.week_days.flatMap(day=>day.source_findings.map(f=>f.source_url))))].slice(0,24);
 return Object.freeze({
  version:WEEKLY_WORKLOAD_INSIGHT_VERSION,
  status:'PROVISIONAL_REVIEW_COVERAGE_GAP_NOT_VERIFIED_EMPLOYEE_SCHEDULE',
  week_start:plan.week_start,week_end:plan.week_end,
  calendar_time_zone:plan.calendar_time_zone,
  source_scope:'REALITY_GITHUB_REPOSITORY_ONLY',
  source_observed_at:plan.source_observed_at,
  planning_basis:plan.timebox_allocation_basis,
  preparation_source:plan.preparation_source,
  role_count:roles.length,
  roles:Object.freeze(roles),
  source_finding_count:seenSources.size,
  source_work_role_count:scoped.length,
  roles_without_source_work_count:roles.length-scoped.length,
  source_work_roles_provisional_hours:scopedHours,
  source_work_roles_hypothetical_reference_hours:scopedReference,
  source_work_roles_unallocated_reference_hours:scopedUnallocated,
  source_work_comparison_available:scoped.length>0,
  provisional_review_timebox_hours:total,
  hypothetical_weekly_reference_hours:plan.five_day_week_capacity_hours,
  unallocated_hypothetical_reference_hours:unallocated,
  source_items_deferred_beyond_timeboxes:deferred,
  // Shared public comparator is also consumed by the existing independently
  // settled original-job economic scorecard. Never count source observations
  // as completed repairs, scheduled effort, or verified savings.
  nasa_bls_repair_comparator:Object.freeze({
   evidence_status:'PUBLISHED_HUMAN_REPAIR_COMPARATOR_NOT_A_REALITY_JOB_ESTIMATE',
   source_scope:'SINGLE_NASA_MISSION_SOFTWARE_FAULT_REPAIR_ONLY',
   study_title:nasa.study.title,study_year:nasa.study.published_year,
   nasa_study_url:nasa.study.source_url,
   investigation_median_hours:nasa.study.median_investigation_hours,
   implementation_median_hours:nasa.study.median_implementation_hours,
   sum_of_separate_medians_hours:nasa.combined_reference_hours,
   sum_of_medians_not_median_total:true,
   bls_wage_source_url:nasa.public_wage_source,
   bls_observation_period:nasa.public_wage_observation_period,
   bls_national_median_hourly_wage_usd:nasa.public_median_developer_wage_usd_per_hour,
   illustrative_gross_wage_equivalent_usd_per_confirmed_comparable_repair:
    nasa.per_comparable_repair_gross_wage_equivalent_usd,
   source_review_candidates_needing_fault_validation:nasaCandidates,
   verified_comparable_repairs_from_this_plan:0,
   counted_as_weekly_proposed_review_hours:false,
   forecast_human_effort_hours:null,
   measured_human_hours_saved:null,verified_cash_savings_usd:null,
   source_benchmark_does_not_authorize_execution:true
  }),
  evidence_refs:Object.freeze(refs),
  gap_recognized:scoped.length>0&&scopedUnallocated>0,
  comparison_is_not_actual_schedule:true,
  remaining_reference_hours_are_not_verified_missing_customer_jobs:true,
  source_findings_not_qualified_original_jobs:true,
  actual_scheduled_execution_hours_verified:null,
  actual_productive_work_hours_verified:null,
  verified_human_hours_saved:null,verified_cash_savings_usd:null,
  shift_started:false,execution_authorized:false,
  installation_authorized:false,production_changed:false,read_only:true,
  recommended_next_step:'QUALIFY_SOURCE_FINDINGS_AND_OWNER_APPROVE_EXACT_WORK_BEFORE_ANY_EXECUTION'
 });
}
