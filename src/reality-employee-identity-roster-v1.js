// Human-readable, owner-scoped labels for Reality's proposed AI work functions.
// They are virtual persona names, not people or independently operating agents.
// The actual work candidates come ONLY from the existing Work Center catalog.
import {assessRealityCompanyWorkforce,routeRealityWorkCategoriesToEmployees}
 from './reality-workday-team-assessment-v1.js';
export const REALITY_EMPLOYEE_ROSTER_VERSION='reality-proposed-ai-employee-roster-v1';
const PROFILES=Object.freeze({
 product_strategy:{name:'Avery',short_title:'Product Strategist',icon:'compass',categories:['Research','Features','Customer needs'],summary:'Finds valuable customer problems and decides what the product should prioritize.'},
 software_engineering:{name:'Riley',short_title:'Software Engineer',icon:'code',categories:['Bugs','Reliability','Upgrades','Features'],summary:'Investigates software issues and prepares independently testable fixes and upgrades.'},
 quality_security_reliability:{name:'Quinn',short_title:'Quality & Security',icon:'shield',categories:['Security','Independent verification'],summary:'Checks safety, regressions, evidence and whether completed work meets acceptance requirements.'},
 infrastructure_operations:{name:'Taylor',short_title:'Operations Engineer',icon:'settings',categories:['Integrations','Automation','Operations'],summary:'Monitors system reliability, worker connectivity and operational bottlenecks.'},
 experience_onboarding:{name:'Casey',short_title:'Product Experience',icon:'layout',categories:['Customer needs','Onboarding'],summary:'Makes Reality clear and usable for new customers and tests onboarding journeys.'},
 marketing_competitive:{name:'Morgan',short_title:'Marketing & Competitive Research',icon:'target',categories:['Competitive research','Positioning'],summary:'Researches competitors and prepares supportable differentiation and marketing proposals.'},
 sales_customer_success:{name:'Jordan',short_title:'Sales & Customer Success',icon:'handshake',categories:['Customer success','Sales'],summary:'Qualifies opportunities, prepares proposals, and organizes customer feedback and follow-up.'},
 financial_legal_admin:{name:'Sage',short_title:'Finance & Administration',icon:'calculator',categories:['Costs','Business administration'],summary:'Organizes costs, financial models and compliance review tasks, with required human oversight.'}
});
const EXPECTED_IDS=Object.keys(PROFILES);

// Static source-of-truth role descriptions for authenticated read-only Chat.
// This does not fetch a live backlog, create agents, suggest verified task
// durations, authorize a schedule, or mark any role as an active worker.
export function buildRealityProposedEmployeeRoleDiscussionContext({
 observedAt=new Date()
}={}){
 if(!(observedAt instanceof Date)||!Number.isFinite(observedAt.getTime()))
  throw Error('EMPLOYEE_ROLE_CONTEXT_VALID_TIME_REQUIRED');
 const roles=Object.entries(PROFILES).map(([functionId,p])=>Object.freeze({
  function_id:functionId,employee_name:p.name,role:p.short_title,
  responsibilities:p.summary,candidate_categories:Object.freeze([...p.categories]),
  status:'PROPOSED_ROLE_NOT_AN_ACTIVE_WORKER',
  actual_assigned_source_jobs:null,
  independently_completed_jobs_from_directory:null
 }));
 if(roles.length!==8)throw Error('EMPLOYEE_ROLE_DIRECTORY_UNVERIFIED');
 const summary='REALITY PROPOSED EMPLOYEE ROLE DIRECTORY (read-only): '+
   roles.map(r=>r.employee_name+' ('+r.role+'): '+r.responsibilities).join(' | ')+
   '. These are existing named business-function profiles, NOT eight independent '+
   'models or verified active workers. Discuss proposed jobs and next-week '+
   'assignments for each role freely. The existing read-only next-week roster '+
   'planner can later align source-backed Work Center candidates to roles and '+
   'the customer-selected business calendar. Only a separate, exact owner-scoped '+
   'authorization may start work. Do not fabricate active assignments, dates, '+
   'durations, cost savings, or employee replacement.';
 return Object.freeze({
  entry_id:'reality:employee-role-directory:'+REALITY_EMPLOYEE_ROSTER_VERSION,
  event_kind:'existing_employee_roles_for_readonly_weekly_discussion',
  source_kind:'TRUSTED_STATIC_ROLE_DEFINITIONS_NOT_LIVE_JOB_EVIDENCE',
  source_ref:'reality:src/reality-employee-identity-roster-v1.js',
  assertion_time:observedAt.toISOString(),
  epistemic_status:'ROLE_PROFILES_EXIST_SOURCE_ASSIGNMENTS_NOT_READ',
  roles:Object.freeze(roles),summary,
  business_days_customizable:true,shift_hours_customizable:true,
  weekly_plan_generated_by_this_read:false,job_started:false,
  calendar_change_authorized:false,external_execution_authorized:false,
  installation_authorized:false,production_changed:false,
 });
}

export function buildRealityNamedEmployeeRoster(brief){
 const workforce=assessRealityCompanyWorkforce(brief);
 const routing=routeRealityWorkCategoriesToEmployees(brief);
 const ids=workforce.required_business_functions.map(x=>x.function_id);
 if(ids.length!==EXPECTED_IDS.length||new Set(ids).size!==ids.length||
    ids.some(id=>!Object.hasOwn(PROFILES,id))||
    routing.employee_assignments.length!==ids.length)
  throw Error('EMPLOYEE_ROSTER_FUNCTIONAL_SOURCE_UNVERIFIED');
 const sourceMap=new Map(routing.employee_assignments.map(x=>[x.employee_function_id,x]));
 const employees=workforce.required_business_functions.map((job,index)=>{
  const profile=PROFILES[job.function_id];
  const assigned=sourceMap.get(job.function_id);
  if(!assigned||assigned.active_employee_instantiated!==false||
     assigned.real_original_jobs_admitted!==0||
     assigned.independently_settled_jobs!==0)
   throw Error('EMPLOYEE_ROSTER_EXECUTION_CLAIM_UNVERIFIED');
  return Object.freeze({
   employee_id:'reality-proposed:'+job.function_id,
   display_name:profile.name,
   role:profile.short_title,
   function_id:job.function_id,
   profile_icon:profile.icon,
   role_summary:profile.summary,
   categories:profile.categories,
   business_outcome:job.business_outcome,
   responsibilities:job.job_responsibilities,
   human_accountability:job.human_accountability,
   evidence_status:job.evidence_status,
   launch_gate:job.launch_gate,
   proposed_priority:index+1,
   pilot:job.function_id==='software_engineering',
   candidate_count:assigned.candidate_count,
   candidate_jobs:assigned.candidate_jobs.map(x=>Object.freeze({
    finding_id:x.finding_id,title:x.title,source_url:x.source_url,
    source_category:x.source_category,proof:x.current_source_proof,
    authorized_execution:false,independently_verified_done:false
   })),
   activation_status:'PROPOSED_NOT_DEPLOYED',
   active_worker_id:null,
   worker_shift_id:null,
   independently_completed_jobs:0,
   realized_savings_usd:null,
  });
 });
 return Object.freeze({
  version:REALITY_EMPLOYEE_ROSTER_VERSION,
  status:'READ_ONLY_PROPOSED_AI_EMPLOYEES',
  company_objective:workforce.objective,
  source_scope:brief.source_scope,
  source_observed_at:brief.observed_at||null,
  profiles_can_be_renamed_later:true,
  proposed_employees:employees,
  proposed_employee_count:employees.length,
  existing_work_center_candidates:routing.assigned_category_candidates,
  unknown_category_count:routing.unassigned_category_candidates.length,
  active_ai_employee_count:0,
  verified_independently_completed_jobs:0,
  verified_cash_savings_usd:null,
  staffing_fte_measured:false,
  live_deployment_verified:false,
  production_changed:false,
  original_job_admitted:false,
  installation_authorized:false,
  daily_schedule_authorized:false,
  nasa_reference:{
   source_url:'https://ntrs.nasa.gov/api/citations/20160008693/downloads/20160008693.pdf',
   investigation_median_hours:2,implementation_median_hours:3,
   usage:'COMPARABLE_FAULT_REPAIR_PLANNING_REFERENCE_ONLY_NO_VERIFIED_SAVINGS'
  },
  next_proof:'Bind one independently qualified category task to Riley using the existing original-job execution worker and verify the receipt before activating this persona.'
 });
}
