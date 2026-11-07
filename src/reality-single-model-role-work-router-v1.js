// A single OpenAI provider across eight Reality BUSINESS FUNCTIONS.
// "Employees" are role-specific workload labels, NOT eight models/agents.
// This module ONLY creates owner-view routing metadata for source candidates;
// it neither calls the model nor starts work. The authenticated executor must
// load the exact owner/goal/ledger authorization and take the one-use job claim.
export const SINGLE_MODEL_ROLE_ROUTING_VERSION='reality-single-openai-multi-role-routing-v1';
const PLAN='reality-next-week-employee-plan-v1';
const FINDING=/^catalog:[a-f0-9]{32}$/;
const URL=/^https:\/\/github\.com\/maloney2323\/Reality\/(?:issues|pull|actions\/runs)\/[1-9]\d*$/;
const ROLE=new Set([
 'product_strategy','software_engineering','quality_security_reliability',
 'infrastructure_operations','experience_onboarding','marketing_competitive',
 'sales_customer_success','financial_legal_admin'
]);
const fail=x=>{throw Error('REALITY_SINGLE_MODEL_ROUTING_'+x)};
const freeze=Object.freeze;
export function projectSingleModelRoleQueue(plan){
 if(plan?.version!==PLAN||
  plan.status!=='NEXT_WEEK_DRAFT_PREPARED_AWAITING_OWNER_SHIFT_AUTHORIZATION'||
  plan.calendar_time_zone!=='America/New_York'||
  plan.employee_role_count!==8||
  !Array.isArray(plan.employee_roles)||plan.employee_roles.length!==8||
  plan.owner_shift_authorization_recorded!==false||
  plan.installation_authorized!==false||
  plan.external_business_actions_authorized!==false||
  plan.candidate_source_review_assignments_not_jobs!==true||
  plan.production_changed!==false||
  !Number.isSafeInteger(plan.proposed_work_findings)||
  plan.proposed_work_findings<0||plan.proposed_work_findings>1000)
  fail('TRUSTED_READ_ONLY_WEEK_PLAN_REQUIRED');
 const roles=new Set(),items=[],seen=new Set();
 for(let roleIndex=0;roleIndex<plan.employee_roles.length;roleIndex++){
  const role=plan.employee_roles[roleIndex];
  if(!ROLE.has(role?.function_id)||roles.has(role.function_id)||
   role.employee_id!=='reality-proposed:'+role.function_id||
   typeof role.employee_name!=='string'||!role.employee_name||
   role.active_worker_verified!==false||
   role.approved_execution_hours!==0||
   !Array.isArray(role.week_days)||role.week_days.length!==5)
   fail('EIGHT_FUNCTION_ROSTER_CONTRACT_REQUIRED');
  roles.add(role.function_id);
  for(let dayIndex=0;dayIndex<5;dayIndex++){
   const day=role.week_days[dayIndex];
   if(!/^\d{4}-\d{2}-\d{2}$/.test(day?.date||'')||
    !Array.isArray(day.assignments)||day.assignments.length>25||
    day.shifts_authorized!==false||
    day.proposed_execution_shift_hours!==null||
    day.timebox_is_verified_task_duration!==false)
    fail('DRAFT_DAY_NOT_EXECUTION_AUTHORITY');
   for(const job of day.assignments){
    if(!FINDING.test(job?.finding_id||'')||
     seen.has(job.finding_id)||!URL.test(job.source_url||'')||
     job.owner_execution_authorized!==false||
     job.status!=='SOURCE_OBSERVATION_REQUIRES_INDEPENDENT_QUALIFICATION'||
     typeof job.title!=='string'||!job.title.trim()||
     !Number.isFinite(job.proposed_review_timebox_hours)||
     job.proposed_review_timebox_hours<=0||
     job.accepted_task_duration_hours!==null||
     job.human_effort_hours_verified!==null||
     job.ai_execution_hours_verified!==null)
     fail('SOURCE_ONLY_NO_AUTHORITY_AND_NO_DOUBLE_ASSIGNMENT');
    seen.add(job.finding_id);
    items.push(freeze({
     finding_id:job.finding_id,
     source_url:job.source_url,
     title:job.title,
     review_date:day.date,
     category:job.category,
     business_function_id:role.function_id,
     display_owner_role:role.employee_name,
     proposed_review_timebox_hours:job.proposed_review_timebox_hours,
     model_routing_lane:'SHARED_OPENAI_ONLY',
     qualification_required:true,
     status:'PLANNED_SOURCE_REVIEW_NOT_EXECUTABLE_JOB',
     owner_execution_authorized:false,
     original_work_id:null,
     verified_customer_job_completed:false,
     financial_savings_usd:null,
     _day_index:dayIndex,
     _role_index:roleIndex
    }));
   }
  }
 }
 if(roles.size!==8||seen.size!==plan.proposed_work_findings)
  fail('SOURCE_COVERAGE_OR_ROLE_COUNT_DISAGREES');
 items.sort((a,b)=>a._day_index-b._day_index||
  a._role_index-b._role_index||
  a.finding_id.localeCompare(b.finding_id));
 const assignments=items.map((x,i)=>{
  const {_day_index,_role_index,...safe}=x;
  return freeze({...safe,sequence:i+1});
 });
 return freeze({
  version:SINGLE_MODEL_ROLE_ROUTING_VERSION,
  status:'ONE_OPENAI_SHARED_LANE_PROPOSED_NO_JOB_EXECUTED',
  underlying_intelligence_provider:'OpenAI',
  model_instances_or_employees_claimed:0,
  configured_model_provider_lanes:1,
  concurrent_proposed_model_jobs_limit:1,
  role_label_count:8,
  independent_agents_created:0,
  separate_role_model_credentials_required:false,
  workload_items:freeze(assignments),
  planned_review_assignments:assignments.length,
  execution_ready_count:0,
  work_context_policy:'LOAD_PER_ORIGINAL_JOB_FROM_OWNER_LEDGER_NEVER_REUSE_OTHER_ROLE_CONTEXT',
  permission_policy:'EXACT_SIGNED_IN_OWNER_AUTHORIZATION_PLUS_GLOBAL_SINGLE_USE_CLAIM',
  verification_policy:'INDEPENDENT_EVIDENCE_NOT_MODEL_SELF_REPORT',
  cost_policy:'ATTRIBUTE_PROVIDER_AND_REVIEW_COST_TO_EACH_REAL_ORIGINAL_WORK_ID',
  provider_capacity_or_human_headcount_equivalence_inferred:false,
  jobs_executed_by_projection:false,
  installation_authorized:false,
  owner_shift_authorization_recorded:false,
  verified_cash_savings_usd:null,
  production_changed:false,
  read_only:true,
 });
}
