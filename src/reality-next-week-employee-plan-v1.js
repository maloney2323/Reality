// Deterministic NEXT-WEEK role coverage plan. Existing Work Center findings
// become draft review assignments, NEVER duration, authority, execution or ROI.
// Week boundaries follow the owner's business calendar (America/New_York).
export const NEXT_WEEK_EMPLOYEE_PLAN_VERSION='reality-next-week-employee-plan-v1';
const ID=/^catalog:[a-f0-9]{32}$/;
const fail=x=>{throw Error('REALITY_NEXT_WEEK_PLAN_'+x)};
function upcomingMonday(now){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{
  timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'
 }).formatToParts(now).filter(x=>['year','month','day'].includes(x.type))
 .map(x=>[x.type,Number(x.value)]));
 const date=new Date(Date.UTC(p.year,p.month-1,p.day));
 const dow=date.getUTCDay(),iso=dow===0?7:dow;
 date.setUTCDate(date.getUTCDate()+(8-iso));
 return date;
}
const ymd=d=>d.toISOString().slice(0,10);
export function nextWeekStartDate(now=new Date()){
 if(!(now instanceof Date)||!Number.isFinite(now.getTime()))
  fail('VALID_CURRENT_TIME_REQUIRED');
 return ymd(upcomingMonday(now));
}
export function prepareNextWeekEmployeePlan(roster,{
 now=new Date(),preparedSource=null
}={}){
 if(roster?.version!=='reality-proposed-ai-employee-roster-v1'||
  roster.status!=='READ_ONLY_PROPOSED_AI_EMPLOYEES'||
  roster.source_scope!=='REALITY_GITHUB_REPOSITORY_ONLY'||
  roster.proposed_employee_count!==8||
  !Array.isArray(roster.proposed_employees)||
  roster.proposed_employees.length!==8||
  roster.active_ai_employee_count!==0||
  roster.verified_cash_savings_usd!==null||
  roster.verified_independently_completed_jobs!==0||
  roster.installation_authorized!==false||
  roster.daily_schedule_authorized!==false||
  roster.production_changed!==false||
  !Number.isSafeInteger(roster.existing_work_center_candidates)||
  roster.existing_work_center_candidates<0||roster.existing_work_center_candidates>1000||
  !(now instanceof Date)||!Number.isFinite(now.getTime()))
  fail('CURRENT_READ_ONLY_OWNER_WORKFORCE_REQUIRED');
 const first=upcomingMonday(now);
 const days=Array.from({length:5},(_,i)=>{
  const date=new Date(first.getTime());date.setUTCDate(date.getUTCDate()+i);
  return Object.freeze({date:ymd(date),
   weekday:['Monday','Tuesday','Wednesday','Thursday','Friday'][i],
   assumed_ai_role_hours_available:8,
   shifts_authorized:false,actual_work_hours_verified:null});
 });
 const seenIds=new Set(),seenRoles=new Set(),rolePlans=[];
 for(const role of roster.proposed_employees){
  if(typeof role.function_id!=='string'||!role.function_id||
   seenRoles.has(role.function_id)||
   role.activation_status!=='PROPOSED_NOT_DEPLOYED'||
   role.active_worker_id!==null||role.worker_shift_id!==null||
   role.independently_completed_jobs!==0||
   !Number.isSafeInteger(role.candidate_count)||
   !Array.isArray(role.candidate_jobs)||role.candidate_jobs.length!==role.candidate_count||
   role.candidate_jobs.length>25)
   fail('SOURCE_ROLE_CANDIDATE_IDENTITY_UNVERIFIED');
  seenRoles.add(role.function_id);
  const assigned=days.map((day,i)=>({
   ...day,assignments:[],work_status:'WORK_GAP_DISCOVERY_OR_REVIEW_NEEDED'
  }));
  role.candidate_jobs.forEach((work,i)=>{
   if(!ID.test(work?.finding_id||'')||seenIds.has(work.finding_id)||
    typeof work.title!=='string'||!work.title||
    typeof work.source_url!=='string'||
    !/^https:\/\/github\.com\/maloney2323\/Reality\/(?:issues|pull|actions\/runs)\/[1-9]\d*$/.test(work.source_url)||
    work.authorized_execution!==false||
    work.independently_verified_done!==false)
    fail('DUPLICATE_OR_UNVERIFIED_SOURCE_FINDING');
   seenIds.add(work.finding_id);
   assigned[i%5].assignments.push(Object.freeze({
    finding_id:work.finding_id,source_url:work.source_url,
    title:work.title,category:work.source_category,
    status:'SOURCE_OBSERVATION_REQUIRES_INDEPENDENT_QUALIFICATION',
    owner_execution_authorized:false,
    human_effort_hours_verified:null,ai_execution_hours_verified:null
   }));
  });
  const plan=Object.freeze({
   employee_id:role.employee_id,
   employee_name:role.display_name,
   function_id:role.function_id,
   role_title:role.role,
   candidate_finding_count:role.candidate_count,
   covered_source_candidates:role.candidate_count,
   active_worker_verified:false,
   week_days:Object.freeze(assigned.map(x=>Object.freeze({
    ...x,assignments:Object.freeze(x.assignments),
    work_status:x.assignments.length?
     'PROPOSED_SOURCE_REVIEW_NOT_EXECUTION_AUTHORIZATION':
     'WORK_GAP_DISCOVERY_OR_REVIEW_NEEDED'
   }))),
   approved_execution_hours:0,
   completed_productive_hours_verified:null,
   independently_verified_jobs_completed:0
  });
  rolePlans.push(plan);
 }
 if(seenIds.size!==roster.existing_work_center_candidates)
  fail('CATALOG_COVERAGE_NOT_RECONCILED');
 let snapshot='BACKGROUND_SOURCE_SNAPSHOT_NOT_YET_VERIFIED';
 let lastPrepared=null;
 if(preparedSource!==null){
  if(preparedSource?.status!=='NEXT_WEEK_SOURCE_SNAPSHOT_PREPARED'||
   preparedSource.week_start!==ymd(first)||
   preparedSource.source_scope!=='maloney2323/Reality'||
   !/^[a-f0-9]{64}$/.test(preparedSource.source_sha256||'')||
   !Number.isInteger(preparedSource.open_issue_count)||
   preparedSource.open_issue_count<0||preparedSource.open_issue_count>150||
   typeof preparedSource.prepared_at!=='string'||
   !Number.isFinite(Date.parse(preparedSource.prepared_at))||
   Date.parse(preparedSource.prepared_at)>now.getTime()+120000)
   fail('BACKGROUND_WEEK_SOURCE_STALE_OR_FORGED');
  snapshot='BACKGROUND_NEXT_WEEK_SOURCE_REFRESH_VERIFIED';
  lastPrepared=preparedSource.prepared_at;
 }
 return Object.freeze({
  version:NEXT_WEEK_EMPLOYEE_PLAN_VERSION,
  status:'NEXT_WEEK_DRAFT_PREPARED_AWAITING_OWNER_SHIFT_AUTHORIZATION',
  week_start:ymd(first),
  week_end:days[4].date,
  calendar_time_zone:'America/New_York',
  prepared_at:now.toISOString(),
  source_observed_at:roster.source_observed_at,
  preparation_source:snapshot,background_source_prepared_at:lastPrepared,
  employee_role_count:rolePlans.length,
  employee_roles:Object.freeze(rolePlans),
  proposed_work_findings:seenIds.size,
  proposed_daily_ai_role_hours:8,
  four_day_week_capacity_hours:rolePlans.length*8*4,
  five_day_week_capacity_hours:rolePlans.length*8*5,
  capacity_unit:'HYPOTHETICAL_AI_ROLE_SCHEDULE_HOURS_NOT_HUMAN_SAVINGS',
  candidate_source_review_assignments_not_jobs:true,
  next_week_prepared_without_executing_jobs:true,
  recurring_weekly_workload_proven:false,
  existing_authorized_originals_preserved:true,
  verified_human_hours_saved:null,
  verified_headcount_reduction:null,
  actual_automation_cost_usd:null,verified_financial_roi_usd:null,
  owner_shift_authorization_recorded:false,
  installation_authorized:false,external_business_actions_authorized:false,
  production_changed:false,read_only:true
 });
}
