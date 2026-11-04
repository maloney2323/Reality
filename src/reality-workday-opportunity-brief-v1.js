import {humanLaborBenchmarkCatalog} from './reality-human-labor-benchmark-v1.js';
// Reality first-customer workday opportunity brief.
// Source-backed backlog discovery is valuable work, but a GitHub issue, PR
// or historical CI failure does NOT prove an outstanding defect, human hours,
// actionable repair, autonomous completion or revenue. Fail closed.
const URL=/^https:\/\/github\.com\/maloney2323\/Reality\/(?:issues|pull|actions\/runs)\/[1-9][0-9]*$/;
const HEX=/^[a-f0-9]{32}$/;
const kinds=Object.freeze({
 OPEN_ISSUE:{stage:'OPEN_TRACKED_WORK_REQUIRES_VALIDATION',
  proof:'Provider open issue; business impact, duplicate status and completion require verification',
  next:'Confirm this issue still represents a real, unresolved problem; reproduce or independently validate impact'},
 OPEN_PULL_REQUEST:{stage:'IMPLEMENTATION_AWAITING_INDEPENDENT_REVIEW',
  proof:'Provider open pull request; implementation is not a proven customer outcome',
  next:'Check changes, reviews and tests; do not count this PR as a new capability gap or completed value'},
 RECURRING_FAILURE:{stage:'RECURRING_FAILURE_NEEDS_FRESH_REPRODUCTION',
  proof:'Recorded prior repeated workflow failures; current failure still requires fresh provider verification',
  next:'Reproduce the same current failure on a frozen original job before proposing a repair'}
});
const bound=(s,n=280)=>typeof s==='string'?s.slice(0,n):'';
function safeItem(w){
 if(!w||typeof w!=='object'||Array.isArray(w)||!Object.hasOwn(kinds,w.finding_type)||
   !/^catalog:[a-f0-9]{32}$/.test(String(w.finding_id||''))||
   !['github_issues','github_pull_requests','github_actions'].includes(w.source)||
   !Array.isArray(w.evidence_refs)||w.evidence_refs.length===0||w.evidence_refs.length>12||
   !w.evidence_refs.every(x=>typeof x==='string'&&URL.test(x)))return null;
 if(w.finding_type==='OPEN_ISSUE'&&w.source!=='github_issues')return null;
 if(w.finding_type==='OPEN_PULL_REQUEST'&&w.source!=='github_pull_requests')return null;
 if(w.finding_type==='RECURRING_FAILURE'&&w.source!=='github_actions')return null;
 if(![
  'TRACKED_NEEDS_REVIEW','OPEN_AWAITING_REVIEW','DRAFT_AWAITING_REVIEW',
  'DISCOVERED_REQUIRES_REVIEW'
 ].includes(w.state))return null;
 const score=w.value_assessment?.triage_score;
 const triage=Number.isFinite(score)&&score>=0&&score<=100?
  Math.round(score):null;
 const task=kinds[w.finding_type];
 return Object.freeze({
  finding_id:w.finding_id,title:bound(w.title,260),
  category:bound(w.category,32),finding_type:w.finding_type,
  state:w.state,proof_stage:task.stage,
  evidence_refs:w.evidence_refs.slice(),
  proof_description:task.proof,
  next_validation_step:task.next,
  priority_heuristic:triage,
  priority_is_measured_business_impact:false,
  verified_current_defect:false,
  customer_job_approved:false,
  authorized_execution:false,
  human_baseline_minutes:null,
  independently_verified_discovery_labor_minutes:null,
  verified_time_saved_minutes:null,
  verified_financial_value_usd:null,
  // Tracking issue creation is not equivalent to repairing an issue.
  supported_action:w.execution_work_item?.connector==='github'&&
    w.execution_work_item?.operation==='create_issue'?
    'REVIEWABLE_ISSUE_TRACKING_ONLY':'REVIEW_REQUIRED_NO_EXECUTION',
 });
}
export function buildRealityWorkdayOpportunityBrief(catalog){
 if(!catalog||!['OBSERVED','PARTIAL'].includes(catalog.status)||
   !['reality-work-catalog-v0.1'].includes(catalog.version)||
   catalog.authority!=='NONE_GRANTED'||catalog.execution_enabled!==false||
   !Array.isArray(catalog.items)||catalog.items.length>90||
   !catalog.source_coverage||typeof catalog.source_coverage!=='object')
  throw Error('WORKDAY_CATALOG_CONTRACT_UNVERIFIED');
 const seen=new Set(),candidates=[];
 let excludedRecentChanges=0,invalid=0;
 for(const w of catalog.items){
  if(w?.finding_type==='RECENT_CHANGE_TO_VERIFY'){
   excludedRecentChanges++;continue;
  }
  const result=safeItem(w);
  if(!result){invalid++;continue}
  if(seen.has(result.finding_id))continue;
  seen.add(result.finding_id);
  candidates.push(result);
 }
 candidates.sort((a,b)=>
  (b.priority_heuristic??-1)-(a.priority_heuristic??-1)||
  a.finding_id.localeCompare(b.finding_id));
 const counts={
  source_backed_opportunities:candidates.length,
  open_issues:candidates.filter(x=>x.finding_type==='OPEN_ISSUE').length,
  open_pull_requests:candidates.filter(x=>x.finding_type==='OPEN_PULL_REQUEST').length,
  historical_failure_signals:candidates.filter(x=>x.finding_type==='RECURRING_FAILURE').length,
  verified_current_defects:0,
  approved_autonomous_repairs:0,
  completed_customer_jobs_from_this_report:0,
  excluded_recent_commits:excludedRecentChanges,
  rejected_untrusted_candidates:invalid
 };
 const coverage=Object.fromEntries(['issues','pull_requests','actions','commits',
  'customer_feedback','business_operations','external_research'].map(k=>[
    k,['checked','not_connected','unavailable'].includes(catalog.source_coverage[k])?
      catalog.source_coverage[k]:'unavailable'
   ]));
 const partial=catalog.status==='PARTIAL'||
  ['issues','pull_requests','actions'].some(k=>coverage[k]!=='checked');
 return Object.freeze({
  status:partial?'SOURCE_BACKED_DISCOVERY_PARTIAL':'SOURCE_BACKED_DISCOVERY_OBSERVED',
  phase:'DISCOVERY_AND_PRIORITIZATION_ONLY_NOT_AN_EXECUTED_WORKDAY',
  observed_at:catalog.observed_at||null,
  source_scope:'REALITY_GITHUB_REPOSITORY_ONLY',
  source_coverage:coverage,
  counts,items:candidates.slice(0,25),
  truncated:candidates.length>25,
  illustrative_labor_reference:(()=>{
   const wage=humanLaborBenchmarkCatalog().BLS_SOFTWARE_WAGE;
   const hourly=wage.wage_by_occupation['15-1252'];
   if(wage.provider!=='BLS'||
     wage.measure!=='MEDIAN_HOURLY_WAGE_NOT_EMPLOYER_TOTAL_COST'||
     !/^https:\/\/www\.bls\.gov\//.test(wage.url)||
     !Number.isFinite(hourly)||hourly<=0)
    throw Error('WORKDAY_LABOR_REFERENCE_INVALID');
   return Object.freeze({
    version:'HUMAN_LABOR_BENCHMARK_V1_STATIC_SOURCE',
    occupation:'Software Developers',occupation_soc:'15-1252',
    source_provider:'BLS',source_url:wage.url,
    observation_period:wage.observation_period,
    hourly_usd:hourly,
    status:'PUBLIC_MEDIAN_WAGE_NOT_A_TASK_DURATION_OR_LOADED_COST',
    calibrated_for_this_business:false,
    estimates_owner_entered_only:true,
    verified_hours_saved:null,verified_cash_savings_usd:null
   });
  })(),
  value_measurement:{
   human_discovery_baseline_minutes:null,
   measured_discovery_time_saved_minutes:null,
   completed_job_minutes_saved:null,
   verified_cash_savings_usd:null,
   financial_roi_verified:false,
   methodology:'Require measured manual discovery baseline, a separately timed Reality discovery, validated useful findings, independently accepted completed jobs, and recorded human review/cost before claiming savings.'
  },
  ranking:'EVIDENCE_TRIAGE_HEURISTIC_NOT_FINANCIAL_VALUE',
  evidence_status:'SOURCE_BACKED_OBSERVATIONS_NOT_INDEPENDENTLY_CONFIRMED_DEFECTS',
  next_step:'Validate top genuinely outstanding problem, measure human discovery effort, then use the separately authorized worker to execute and verify an original job.',
  read_only:true,installation_authorized:false,job_started:false,
  production_changed:false,shift_completed:false
 });
}
