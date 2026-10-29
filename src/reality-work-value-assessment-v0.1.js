// Reality Value Assessment v0.1.
// Every priority score is a bounded TRIAGE heuristic. It does NOT measure
// realized business value, probability of saving jobs, or model capability.
// Labor, billing, and ROI stay UNKNOWN until grounded in customer measurements.
const supported=new Set([
 'RECURRING_FAILURE','OPEN_PULL_REQUEST','OPEN_ISSUE','RECENT_CHANGE_TO_VERIFY',
]);
const isEvidence=x=>/^https:\/\/github\.com\/maloney2323\/Reality\/(?:actions\/runs\/\d+|pull\/\d+|issues\/\d+|commit\/[0-9a-f]{40})$/.test(String(x||''));
const baseScores={
 RECURRING_FAILURE:64,OPEN_ISSUE:55,OPEN_PULL_REQUEST:49,
 RECENT_CHANGE_TO_VERIFY:20,
};
export const VALUE_ASSESSMENT_VERSION='reality-work-value-assessment-v0.1';

export function assessEvidenceBackedWork(finding){
 if(!finding||!supported.has(finding.finding_type))
  throw Error('VALUE_ASSESSMENT_UNRECOGNIZED_FINDING_TYPE');
 const refs=[...new Set((finding.evidence_refs||[]).filter(isEvidence))];
 if(!refs.length)throw Error('VALUE_ASSESSMENT_EVIDENCE_REQUIRED');
 const category=String(finding.category||'');
 const isRecurring=finding.finding_type==='RECURRING_FAILURE';
 const isIssue=finding.finding_type==='OPEN_ISSUE';
 const isPr=finding.finding_type==='OPEN_PULL_REQUEST';
 const isCommit=finding.finding_type==='RECENT_CHANGE_TO_VERIFY';
 const trackingSupported=isRecurring&&
  finding.execution_work_item?.connector==='github'&&
  finding.execution_work_item?.operation==='create_issue'&&
  finding.authorization_required===true;
 const risk=(category==='security'?'HIGH':
  (isRecurring||isPr||category==='integrations')?'ELEVATED':'REVIEW_REQUIRED');
 const score=Math.min(90,
  baseScores[finding.finding_type]+
  Math.min(10,(refs.length-1)*3)+
  (category==='security'?6:0)+
  (isPr&&finding.state==='OPEN_AWAITING_REVIEW'?4:0)
 );
 const priority=score>=67?'REVIEW_SOON':score>=45?'REVIEW_NEXT':'WATCH_OR_VALIDATE';
 const explanation=isCommit?
  'This change was committed; its ongoing defect, cost, and need for action have not been established.':
  isPr?'Review is pending; merge, testing, and deployment are separately governed.':
  isIssue?'The issue remains open; its impact and resolution requirements need validation.':
  'Repeated workflow-failure evidence exists; current status and prior execution attempts must be checked.';
 const next=isCommit?'Confirm CI/release status and whether any follow-up remains.':
  isPr?'Review the diff, test results, blockers and merge authority.':
  isIssue?'Validate ownership, reproduce the issue, and determine measurable scope.':
  'Confirm the failures remain current; reconcile prior attempts before any new execution.';
 return Object.freeze({
  version:VALUE_ASSESSMENT_VERSION,
  triage_score:score,
  triage_band:priority,
  score_definition:'HEURISTIC_TRIAGE_REVIEW_ORDER_ONLY_NOT_BUSINESS_IMPACT',
  score_basis:Object.freeze({
   source_type:finding.finding_type,
   distinct_valid_source_refs:refs.length,
   security_review_flag:category==='security',
  }),
  evidence_status:'SOURCE_LINKS_OBSERVED_EFFECT_NOT_VERIFIED',
  business_impact:{status:'UNMEASURED',estimated_dollars:null,
   severity:'UNDETERMINED',missing:'Business owner impact, frequency, affected users, and consequence evidence'},
  labor:{status:'NO_MEASURED_BASELINE',manual_minutes:null,
   full_job_automation_minutes:null,measured_time_return_minutes:null},
  automation:{
   level:trackingSupported?'TRACKING_ONLY_AFTER_NEW_EXACT_APPROVAL':'NOT_PROVEN_FOR_FULL_TASK',
   known_operation:trackingSupported?'github.create_issue':null,
   full_job_autonomy_verified:false,
   prior_attempt_clearance:'REQUIRED',
  },
  risk:{level:risk,basis:category==='security'?
   'Potential security or authority consequence; human review necessary.':
   isPr?'Review/merge or deployment can have external effects; none authorized.':
   isRecurring?'Repeated failure plus unknown execution history.':
   'Impact and consequences require owner confirmation.'},
  cost:{model_usage_verified:false,subscription_entitlement_verified:false,
   estimated_credits:null,actual_provider_cost_usd:null},
  savings:{forecast_usd:null,verified_usd:null,verified_hours_returned:null},
  next_validation_step:next,
  explanation,
  execution_authorized:false,
  return_on_investment_verified:false,
 });
}
export function prioritizeEvidenceBackedFindings(items){
 if(!Array.isArray(items))throw Error('VALUE_ASSESSMENT_ITEMS_INVALID');
 return items.map(f=>Object.freeze({
  ...f,value_assessment:assessEvidenceBackedWork(f),
 })).sort((a,b)=>b.value_assessment.triage_score-a.value_assessment.triage_score||
  String(a.finding_id).localeCompare(String(b.finding_id)));
}

// Pure projection from user-provided assumptions, never from title keywords.
// Values are gross labor equivalent, NOT proven savings or employee reduction.
// Monthly figures mean expected occurrences * assumed manual effort * coverage.
export function projectHypotheticalWorkValue({
 manual_minutes_per_occurrence,occurrences_per_month,
 automatable_fraction,hourly_labor_value_usd,
 estimated_automation_cost_usd_per_month=null,
}={}){
 const positive=(n,max)=>typeof n==='number'&&Number.isFinite(n)&&n>0&&n<=max;
 if(!positive(manual_minutes_per_occurrence,60000)||
  !positive(occurrences_per_month,100000)||
  !positive(hourly_labor_value_usd,100000)||
  typeof automatable_fraction!=='number'||
  !Number.isFinite(automatable_fraction)||
  automatable_fraction<0||automatable_fraction>1)
  throw Error('VALUE_PROJECTION_REQUIRES_VALID_CUSTOMER_ASSUMPTIONS');
 if(estimated_automation_cost_usd_per_month!==null&&
   (typeof estimated_automation_cost_usd_per_month!=='number'||
    !Number.isFinite(estimated_automation_cost_usd_per_month)||
    estimated_automation_cost_usd_per_month<0||
    estimated_automation_cost_usd_per_month>1e9))
  throw Error('VALUE_PROJECTION_AUTOMATION_COST_INVALID');
 const hours=manual_minutes_per_occurrence*occurrences_per_month*automatable_fraction/60;
 const gross=hours*hourly_labor_value_usd;
 return Object.freeze({
  label:'HYPOTHETICAL_CUSTOMER_ENTERED_SCENARIO',
  assumed_hours_recoverable_per_month:Number(hours.toFixed(2)),
  labor_value_equivalent_usd_per_month:Number(gross.toFixed(2)),
  hypothetical_net_value_usd_per_month:estimated_automation_cost_usd_per_month===null?
   null:Number((gross-estimated_automation_cost_usd_per_month).toFixed(2)),
  verified_hours_saved:null,verified_dollars_saved:null,
  actual_automation_cost_usd:null,
  proof_required:'Observe actual runs and independently verify baseline, completion, time returned, token costs and business effect.',
  cannot_infer_job_reduction:true,
 });
}


// Staffing-capacity projection is a hypothetical role-level economics model.
// Crucial distinction: 2.4 FTE-equivalent hours released does NOT establish
// that any 2 or 3 actual positions can be eliminated. It may be fragmented
// over many employees, and the remaining work/coverage may require them.
export function projectHypotheticalWorkforceImpact({
 manual_minutes_per_occurrence,
 occurrences_per_month,
 automatable_fraction,
 loaded_hourly_labor_cost_usd,
 productive_hours_per_fte_month,
 human_review_minutes_per_automated_occurrence,
 exception_fraction_of_automated_occurrences,
 human_minutes_per_exception,
 team_headcount=null,
 estimated_automation_cost_usd_per_month=null,
 estimated_monthly_implementation_amortization_usd=null,
}={}){
 const positive=(n,max)=>typeof n==='number'&&Number.isFinite(n)&&n>0&&n<=max;
 const nonnegative=(n,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max;
 if(!positive(manual_minutes_per_occurrence,60000)||
  !positive(occurrences_per_month,100000)||
  !positive(loaded_hourly_labor_cost_usd,100000)||
  !positive(productive_hours_per_fte_month,744)||
  !nonnegative(human_review_minutes_per_automated_occurrence,60000)||
  !nonnegative(human_minutes_per_exception,60000)||
  !nonnegative(automatable_fraction,1)||
  !nonnegative(exception_fraction_of_automated_occurrences,1))
  throw Error('WORKFORCE_IMPACT_MISSING_OR_INVALID_CUSTOMER_ASSUMPTIONS');
 if(team_headcount!==null&&(!Number.isSafeInteger(team_headcount)||
  team_headcount<1||team_headcount>1_000_000))
  throw Error('WORKFORCE_IMPACT_HEADCOUNT_INVALID');
 for(const n of [estimated_automation_cost_usd_per_month,
  estimated_monthly_implementation_amortization_usd]){
  if(n!==null&&!nonnegative(n,1e9))
   throw Error('WORKFORCE_IMPACT_OPERATING_COST_INVALID');
 }
 const covered=occurrences_per_month*automatable_fraction;
 const baseline=manual_minutes_per_occurrence*occurrences_per_month/60;
 const grossReleased=covered*manual_minutes_per_occurrence/60;
 const review=covered*human_review_minutes_per_automated_occurrence/60;
 const exception=covered*exception_fraction_of_automated_occurrences*
  human_minutes_per_exception/60;
 const netHours=Math.max(0,grossReleased-review-exception);
 const fte=netHours/productive_hours_per_fte_month;
 const laborCapacityValue=netHours*loaded_hourly_labor_cost_usd;
 const costsKnown=estimated_automation_cost_usd_per_month!==null&&
  estimated_monthly_implementation_amortization_usd!==null;
 const netValue=costsKnown?laborCapacityValue-
  estimated_automation_cost_usd_per_month-
  estimated_monthly_implementation_amortization_usd:null;
 const round=n=>Number(n.toFixed(2));
 const theoreticalWholePositions=Math.floor(fte+1e-9);
 return Object.freeze({
  version:'reality-hypothetical-workforce-impact-v0.1',
  label:'HYPOTHETICAL_CUSTOMER_ENTERED_STAFFING_CAPACITY_SCENARIO',
  unit:'MONTH',
  assumptions_provided_by:'CUSTOMER_NOT_VERIFIED',
  monthly_manual_baseline_hours:round(baseline),
  monthly_covered_occurrences:round(covered),
  monthly_gross_task_hours_released:round(grossReleased),
  monthly_human_review_hours:round(review),
  monthly_exception_handling_hours:round(exception),
  monthly_net_capacity_hours:round(netHours),
  workforce_capacity_fte_equivalent:round(fte),
  theoretical_whole_position_capacity_upper_bound:team_headcount===null?
   null:Math.min(theoreticalWholePositions,team_headcount),
  total_current_team_headcount:team_headcount,
  actual_eliminable_positions:null,
  actual_layoffs_recommended:false,
  verified_positions_removed:null,
  gross_monthly_labor_capacity_value_usd:round(laborCapacityValue),
  hypothetical_net_economic_value_usd_month:netValue===null?null:round(netValue),
  verified_monthly_payroll_reduction_usd:null,
  verified_company_cash_savings_usd:null,
  realized_value_verified:false,
  full_job_automation_verified:false,
  schedule_coverage_verified:false,
  remaining_role_duties_verified:false,
  role_consolidation_verified:false,
  staffing_action_authorized:false,
  proof_required:'Validate full job cycle, distinct job/role distribution, remaining duties, minimum coverage, supervision and exceptions, actual loaded cost, measured execution and cash conversion before estimating eliminable positions or payroll reduction.',
 });
}
