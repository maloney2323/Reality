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
