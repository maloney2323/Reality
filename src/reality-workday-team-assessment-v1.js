// Read-only staffing needs projection from Reality's EXISTING verified-source
// opportunity brief. This does not create employees/agents, schedule workers,
// assign execution warrants, calculate human-equivalent headcount or claim ROI.
export const REALITY_WORKDAY_TEAM_ASSESSMENT_VERSION='reality-workday-team-assessment-v1';

const role=(id,title,when,description,capabilityStatus='NEEDS_GOVERNED_WORKER_BINDING')=>Object.freeze({
 role_id:id,title,assignment_basis:when,responsibilities:description,
 activation_status:capabilityStatus,active_worker_id:null,
 work_execution_verified:false,staffing_is_human_labor_equivalent:false
});

export function assessRealityWorkdayTeam(brief,{requestedObjective='AUTONOMOUS_BUSINESS_VALUE_WORK'}={}){
 if(!brief||!['SOURCE_BACKED_DISCOVERY_OBSERVED','SOURCE_BACKED_DISCOVERY_PARTIAL'].includes(brief.status)||
    brief.read_only!==true||brief.job_started!==false||
    brief.source_scope!=='REALITY_GITHUB_REPOSITORY_ONLY'||
    !brief.counts||!Array.isArray(brief.items)||
    !['AUTONOMOUS_BUSINESS_VALUE_WORK','SOFTWARE_RELIABILITY','COMPETITIVE_ADVANTAGE'].includes(requestedObjective))
  throw Error('SHIFT_TEAM_EVIDENCE_SCOPE_UNVERIFIED');
 const issues=brief.items.filter(x=>x.finding_type==='OPEN_ISSUE').length;
 const pr=brief.items.filter(x=>x.finding_type==='OPEN_PULL_REQUEST').length;
 const failure=brief.items.filter(x=>x.finding_type==='RECURRING_FAILURE').length;
 const observed=issues+pr+failure;
 const roles=[role('operations_coordinator','Governed work coordinator',
  'An owner-scoped shift needs one accountable work router',
  'Inspect known jobs and authorization, prioritize qualified work, keep original-job continuity, and hand off only permitted work.',
  'EXISTING_CONTROLLER_PARTIALLY_CONNECTED')];
 if(issues+failure>0)roles.push(role(
  'failure_investigator','Reliability investigator',
  issues+' issue(s) and '+failure+' failure observation(s)',
  'Validate source reports, reproduce genuinely current defects, research causes, and prepare evidence for existing repair workers.'
 ));
 if(pr>0)roles.push(role('code_reviewer','Engineering reviewer',
  pr+' open pull request observation(s)',
  'Inspect patch provenance, frozen tests, duplicate work, security and whether a real original job requires the candidate.'
 ));
 if(observed>0)roles.push(role('independent_verifier','Independent verifier',
  observed+' source-backed observations require qualification before completion claims',
  'Verify defect proof, worker effects, accepted outcomes, final receipts, and cost evidence independently of proposals.'
 ));
 const external=brief.source_coverage?.external_research;
 const researchEligible=external==='checked'||external==='partial';
 const optional=[
   role('competitive_researcher','Competitive intelligence researcher',
    'Customer requests competitive advantage discovery; external research connection: '+String(external||'unavailable'),
    'Compare competitors with source citations, identify validated product gaps and strategic opportunities. Do not invent competitor weaknesses.',
    researchEligible?'RESEARCH_SOURCE_AVAILABLE_NEEDS_ORIGINAL_JOB_BINDING':'EXTERNAL_RESEARCH_NOT_CONNECTED'
   ),
   role('capability_developer','Capability developer',
    'Only if an independently reproduced missing capability blocks an authorized original job',
    'Inspect existing capabilities first, draft a minimal upgrade, run frozen acceptance tests and present exact approval before installation.',
    'CONDITIONAL_VERIFIED_GAP_REQUIRED')
 ];
 const selected=roles.length;
 return Object.freeze({
  version:REALITY_WORKDAY_TEAM_ASSESSMENT_VERSION,
  status:'EVIDENCE_SCOPED_ROLE_REQUIREMENTS_NOT_DEPLOYED_EMPLOYEES',
  source_scope:brief.source_scope,
  observed_source_opportunities:observed,
  proposed_role_slots:selected,
  proposed_roles:roles,
  conditional_roles:optional,
  confirmed_active_ai_workers:null,
  confirmed_human_employees_required:null,
  verified_worker_capacity:null,
  source_coverage:brief.source_coverage,
  staffing_count_not_employee_replacement:true,
  headcount_optimization_not_yet_measured:true,
  execution_authorized:false,installation_authorized:false,
  production_changed:false,
  next_proof:'Independently bind each required role to an existing governed worker and measured work order; demonstrate actual assignment and final receipts before reporting effective employee count.',
 });
}

/**
 * The owner is asking "what work, responsibilities and approximate employee
 * capacity would it take to BUILD, LAUNCH, MARKET and OPERATE Reality?"
 *
 * Functional coverage is not headcount. The same person or governed AI worker
 * may perform several functions. This read-only analysis is grounded only in
 * Reality's existing repository opportunity catalog and explicitly marks
 * unknown business/market/customer evidence.
 */
export function assessRealityCompanyWorkforce(brief){
 if(!brief||!['SOURCE_BACKED_DISCOVERY_OBSERVED','SOURCE_BACKED_DISCOVERY_PARTIAL'].includes(brief.status)||
    brief.source_scope!=='REALITY_GITHUB_REPOSITORY_ONLY'||brief.read_only!==true||
    brief.job_started!==false||!Array.isArray(brief.items)||!brief.counts||
    !brief.source_coverage||typeof brief.source_coverage!=='object')
  throw Error('REALITY_COMPANY_STAFFING_SOURCE_NOT_VERIFIED');
 const count=kind=>brief.items.filter(x=>x.finding_type===kind).length;
 const issues=count('OPEN_ISSUE'),pulls=count('OPEN_PULL_REQUEST'),failures=count('RECURRING_FAILURE');
 const sourceEvidence=issues+pulls+failures;
 const engineeringCoverage=sourceEvidence>0?'PARTIAL_REPOSITORY_OBSERVATIONS_NEED_JOB_VERIFICATION':
  'NO_CURRENT_REPOSITORY_OPPORTUNITIES_IN_THIS_SNAPSHOT';
 const external=brief.source_coverage.external_research;
 const companyCoverage={
   source_code:'GITHUB_REPOSITORY_SOURCE_OBSERVED_NOT_LAUNCH_CERTIFIED',
   customer_discovery:brief.source_coverage.customer_feedback||'unavailable',
   business_operations:brief.source_coverage.business_operations||'unavailable',
   external_research:external||'unavailable',
   measured_workload_hours_per_week:'NOT_MEASURED',
   actual_business_sales:'NOT_MEASURED',
 };
 const job=(id,title,goal,automationCandidates,humanOwner,evidenceStatus,launchGate)=>{
  return Object.freeze({
   function_id:id,title,business_outcome:goal,
   job_responsibilities:Object.freeze(automationCandidates),
   candidate_ai_automation:Object.freeze(automationCandidates),
   human_accountability:humanOwner,
   evidence_status:evidenceStatus,
   launch_gate:launchGate,
   measured_weekly_human_hours:null,
   verified_automated_weekly_hours:null,
   estimated_human_fte:null,
   active_ai_employee_count:null,
   automation_verified:false,
   external_business_actions_authorized:false,
  });
 };
 const jobs=[
  job('product_strategy','Product management and customer discovery',
    'Define which customers Reality serves, the product promise and accepted use cases',
    ['Research customer needs','Synthesize interviews with permission','Prioritize product gaps with traceable evidence'],
    'Owner selects target customers, approves roadmap and validates product-market fit',
    'CUSTOMER_INTERVIEWS_AND_ACCEPTANCE_NOT_CONNECTED',
    'VALIDATED_TARGET_CUSTOMER_AND_JOB_TO_BE_DONE'),
  job('software_engineering','Software engineering and capability development',
    'Build and maintain the product and its governed self-upgrade loop',
    ['Triage existing source-backed issues','Draft isolated bug fixes and upgrades','Run frozen acceptance tests'],
    'Owner approves exact installations and production releases',
    engineeringCoverage,'REAL_ORIGINAL_JOB_INDEPENDENTLY_SETTLED'),
  job('quality_security_reliability','Quality, security and independent verification',
    'Demonstrate reliable, secure delivery and independently checked business outcomes',
    ['Review tests and regressions','Inspect failure signals','Verify source-backed original-job receipts'],
    'A qualified accountable person approves security/privacy posture and release risk',
    engineeringCoverage,'INDEPENDENT_ACCEPTANCE_AND_SECURITY_REVIEW'),
  job('infrastructure_operations','Infrastructure and operational reliability',
    'Keep login, workers, continuity, monitoring, billing telemetry and supportable infrastructure running',
    ['Check deployment status','Audit existing background workers','Identify incidents and capacity constraints'],
    'Owner retains authority over credentials, expenditures, production operations and incidents',
    'RUNTIME_SOURCE_AND_SERVICE_READBACK_REQUIRED',
    'RECOVERY_AND_WORKER_CONTINUATION_DEMONSTRATED'),
  job('experience_onboarding','Product experience, documentation and onboarding',
    'Help a first customer understand, set up and successfully use Reality',
    ['Audit interface friction','Draft help and onboarding content','Test documented user journeys'],
    'Owner approves promised features and acceptance criteria',
    'CUSTOMER_ONBOARDING_EVIDENCE_NOT_CONNECTED',
    'FIRST_CUSTOMER_ONBOARDING_ACCEPTED'),
  job('marketing_competitive','Positioning, marketing and competitive intelligence',
    'Explain and differentiate Reality with defensible claims and source-backed opportunities',
    ['Research competitors','Discover underserved jobs and gaps','Draft positioning and campaigns with sources'],
    'Owner approves marketing claims, publishing and external communications',
    external==='checked'?'RESEARCH_SCOPE_OBSERVED_NOT_CAMPAIGN_PROVEN':
    'EXTERNAL_RESEARCH_NOT_CONNECTED_TO_WORK_CATALOG',
    'CLAIMS_SUPPORTED_AND_CAMPAIGN_MEASUREMENT'),
  job('sales_customer_success','Sales, partnerships and customer success',
    'Find paying customers, close deals, help customers achieve outcomes and retain them',
    ['Research qualified prospects','Prepare proposals','Summarize support feedback and renewal risks'],
    'Owner approves outreach, pricing, contractual terms and customer commitments',
    'CUSTOMER_PIPELINE_AND_SUPPORT_RECORDS_NOT_CONNECTED',
    'REAL_CUSTOMER_FUNNEL_AND_ACCEPTED_OUTCOMES'),
  job('financial_legal_admin','Financial planning, legal and business administration',
    'Track real operating costs, customer revenue, privacy responsibilities and financial viability',
    ['Organize verified operating cost evidence','Model transparent budgets','Prepare compliance checklists for professional review'],
    'Owner and qualified specialists handle legal, tax, regulatory and financial commitments',
    'FINANCIAL_LEGAL_AND_REVENUE_EVIDENCE_NOT_CONNECTED',
    'OPERATING_COSTS_AND_REQUIRED_COMPLIANCE_REVIEWED')
 ];
 return Object.freeze({
  version:'reality-company-launch-workforce-assessment-v1',
  status:'FUNCTIONAL_LAUNCH_WORKFORCE_PROPOSAL_NOT_A_VERIFIED_STAFFING_ESTIMATE',
  objective:'BUILD_LAUNCH_MARKET_AND_OPERATE_REALITY',
  functional_areas_count:jobs.length,
  required_business_functions:jobs,
  evidence_supported_repository_observations:sourceEvidence,
  source_coverage:companyCoverage,
  exact_human_employee_count_required:null,
  exact_ai_employee_count_required:null,
  verified_automated_roles:0,
  measured_human_staffing_fte:null,
  staffing_method:'For each function, measure recurring weekly workload, safe automated throughput, human review and authority time, then compute remaining human FTE = verified residual weekly human hours / supported hours per FTE. Avoid equating a function with an employee.',
  human_fte_weekly_hour_assumption:40,
  comparable_human_costs_unmeasured:true,
  available_market_evidence_does_not_prove_launch_readiness:true,
  priority_work:['Complete real original-job autonomous cycle with accepted final receipt',
    'Validate a customer problem, onboarding and product positioning',
    'Measure real operating costs, human review and automation capacity',
    'Obtain defensible marketing comparisons before external claims'],
  next_executable_research:'Read-only audit of existing GitHub work and connected business evidence; request exact approval only for consequential installation or external business action.',
  actual_company_launch_verified:false,
  work_started:false,
  installation_authorized:false,
  external_business_actions_authorized:false,
  production_changed:false,
 });
}
