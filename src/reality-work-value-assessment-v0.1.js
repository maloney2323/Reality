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
  score_definition:'HEURISTIC_REVIEW_ORDER_ONLY_NOT_BUSINESS_IMPACT',
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
