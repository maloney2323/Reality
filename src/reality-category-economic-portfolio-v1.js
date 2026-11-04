// Reality category economic bridge v1: evaluate EXISTING Work Center categories
// from provider-backed read-only catalog. Owner upgrade ledger is joined
// separately in the authenticated UI to avoid falsely adding duplicate jobs.
// Strictly illustrative human triage/review cost, not value of repairs,
// avoided wages, revenue, independently measured time or saved cash.
import {evaluateHumanLaborBenchmark} from './reality-human-labor-benchmark-v1.js';
import {projectHypotheticalWorkValue} from './reality-work-value-assessment-v0.1.js';
export const CATEGORY_ECONOMICS_VERSION='reality-category-evidence-economics-v1';
const CATEGORIES=Object.freeze([
 ['customer','Customer issues & feedback'],
 ['bugs','Bug fixes'],
 ['upgrades','Upgrades & improvements'],
 ['features','New features'],
 ['reliability','Performance & reliability'],
 ['integrations','Integrations & deployment'],
 ['security','Security, governance & evidence'],
 ['operations','Operations & workflow'],
 ['research','Research & opportunities'],
 ['automation','Automation & time returned'],
]);
const byCat=new Map(CATEGORIES);
const types=Object.freeze({
 OPEN_ISSUE:Object.freeze({
  source:'github_issues',state:'TRACKED_NEEDS_REVIEW',
  url:/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/[1-9][0-9]*$/,
  label:'OPEN_ISSUE_NOT_REPRODUCED',
  plan:Object.freeze({low:15,high:60}),
  next:'Verify the issue is still an unfinished problem, assess impact, and check prior work.'
 }),
 OPEN_PULL_REQUEST:Object.freeze({
  source:'github_pull_requests',
  states:['OPEN_AWAITING_REVIEW','DRAFT_AWAITING_REVIEW'],
  url:/^https:\/\/github\.com\/maloney2323\/Reality\/pull\/[1-9][0-9]*$/,
  label:'PENDING_CODE_REVIEW_NOT_A_NEW_DEFECT',
  plan:Object.freeze({low:30,high:120}),
  next:'Independently inspect the change, tests, superseding merges, and release state.'
 }),
 RECURRING_FAILURE:Object.freeze({
  source:'github_actions',state:'DISCOVERED_REQUIRES_REVIEW',
  url:/^https:\/\/github\.com\/maloney2323\/Reality\/actions\/runs\/[1-9][0-9]*$/,
  label:'PAST_CI_FAILURE_NOT_FRESHLY_REPRODUCED',
  plan:Object.freeze({low:30,high:90}),
  next:'Check whether the failure still occurs, independently reproduce, and reconcile prior fixes.'
 })
});
const validCount=(x,max)=>Number.isSafeInteger(x)&&x>=0&&x<=max;
const fail=x=>{throw Error('REALITY_CATEGORY_ECONOMICS_'+x)};
const round=x=>Number(x.toFixed(2));
const money=(minutes,rate)=>{
 if(minutes<=0)return 0;
 // Existing value-arithmetic contract caps minutes per occurrence at 60k.
 // Split the *same one-off assumed workload* into mathematical chunks only;
 // chunking does NOT create monthly recurring savings or additional jobs.
 const chunks=Math.ceil(minutes/60000);
 return projectHypotheticalWorkValue({
  manual_minutes_per_occurrence:minutes/chunks,
  occurrences_per_month:chunks,automatable_fraction:1,
  hourly_labor_value_usd:rate
 }).labor_value_equivalent_usd_per_month;
};
export function buildCategoryEconomicPortfolio(catalog){
 if(catalog?.version!=='reality-work-catalog-v0.1'||
    !['OBSERVED','PARTIAL'].includes(catalog.status)||
    catalog.authority!=='NONE_GRANTED'||catalog.execution_enabled!==false||
    !Array.isArray(catalog.items)||catalog.items.length>1200||
    !validCount(catalog.total_findings,10000)||
    catalog.total_findings<catalog.items.length||
    !catalog.source_coverage||typeof catalog.source_coverage!=='object')
  fail('UNTRUSTED_CATALOG');
 const context=evaluateHumanLaborBenchmark({
  job_type:'SOFTWARE_REPAIR',assumed_occupation_soc:'15-1252'
 });
 const wage=context.occupational_wage_benchmark;
 if(wage?.status!=='PUBLIC_NATIONAL_MEDIAN_WAGE'||
    !Number.isFinite(wage.value)||wage.value<=0||
    context.human_task_effort_hours?.value!==null||
    context.verified_labor_savings_usd?.value!==null)
  fail('LABOR_REFERENCE_NOT_VERIFIED');
 const observations=[],seen=new Set();
 let commitsExcluded=0,invalid=0,duplicate=0;
 for(const item of catalog.items){
  if(item?.finding_type==='RECENT_CHANGE_TO_VERIFY'){
   commitsExcluded++;continue;
  }
  const t=types[item?.finding_type];
  if(!t||!byCat.has(item.category)||
    item.source!==t.source||item.state!==t.state&&
      !(t.states||[]).includes(item.state)||
    !/^catalog:[a-f0-9]{32}$/.test(String(item.finding_id||''))||
    typeof item.title!=='string'||!item.title.trim()||
    !Array.isArray(item.evidence_refs)||
    !item.evidence_refs.some(u=>typeof u==='string'&&t.url.test(u))||
    item.value_assessment?.score_definition!==
     'HEURISTIC_TRIAGE_REVIEW_ORDER_ONLY_NOT_BUSINESS_IMPACT'||
    !validCount(item.value_assessment?.triage_score,100)||
    item.value_assessment?.business_impact?.status!=='UNMEASURED'||
    item.value_assessment?.labor?.status!=='NO_MEASURED_BASELINE'||
    item.value_assessment?.execution_authorized!==false){
    invalid++;continue;
  }
  const link=item.evidence_refs.find(u=>typeof u==='string'&&t.url.test(u));
  const sourceKey=item.finding_type+':'+link;
  if(seen.has(sourceKey)){duplicate++;continue}
  seen.add(sourceKey);
  observations.push(Object.freeze({
   finding_id:item.finding_id,source_key:sourceKey,
   source_url:link,category:item.category,
   finding_type:item.finding_type,title:item.title.slice(0,240),
   priority_heuristic:item.value_assessment.triage_score,
   evidence_status:t.label,
   next_validation:t.next,
   assumed_human_review_low_minutes:t.plan.low,
   assumed_human_review_high_minutes:t.plan.high,
   independently_verified_current_defect:false,
   human_review_duration_measured:false,
   is_settled_original_job:false
  }));
 }
 const groups=CATEGORIES.map(([id,label])=>{
  const items=observations.filter(x=>x.category===id);
  const low=items.reduce((n,x)=>n+x.assumed_human_review_low_minutes,0);
  const high=items.reduce((n,x)=>n+x.assumed_human_review_high_minutes,0);
  const supportedSource=({customer:'customer_feedback',operations:'business_operations',
   research:'external_research'})[id];
  const external=supportedSource?catalog.source_coverage[supportedSource]:
   null;
  return Object.freeze({
   id,label,
   provider_observations:items.length,
   category_has_unconnected_business_source:external==='not_connected',
   extra_business_source_coverage:external||'NOT_APPLICABLE',
   issue_count:items.filter(x=>x.finding_type==='OPEN_ISSUE').length,
   pending_change_count:items.filter(x=>x.finding_type==='OPEN_PULL_REQUEST').length,
   prior_failure_signal_count:items.filter(x=>x.finding_type==='RECURRING_FAILURE').length,
   evidence_status:items.length?'PROVIDER_OBSERVATIONS_NEED_INDEPENDENT_VALIDATION':
    'NO_QUALIFIED_SOURCE_OBSERVATIONS_IN_FETCH_WINDOW',
   triage_rank_not_business_value:true,
   review_workload_what_if:{
    conditional_low_hours:round(low/60),
    conditional_high_hours:round(high/60),
    conditional_low_gross_wage_usd:money(low,wage.value),
    conditional_high_gross_wage_usd:money(high,wage.value),
    evidence_status:'UNMEASURED_REVIEW_PRESETS_NOT_HUMAN_WORK_MEASUREMENT'
   },
   top_evidence:items.sort((a,b)=>b.priority_heuristic-a.priority_heuristic||
    a.source_key.localeCompare(b.source_key)).slice(0,3),
   actual_job_value_usd:null,
   saved_discovery_cost_usd:null,verified_savings_usd:null
  });
 });
 const totalMinutes=()=>{
  const low=observations.reduce((n,x)=>n+x.assumed_human_review_low_minutes,0),
   high=observations.reduce((n,x)=>n+x.assumed_human_review_high_minutes,0);
  return {conditional_low_hours:round(low/60),
   conditional_high_hours:round(high/60),
   conditional_low_gross_wage_usd:money(low,wage.value),
   conditional_high_gross_wage_usd:money(high,wage.value)};
 };
 return Object.freeze({
  version:CATEGORY_ECONOMICS_VERSION,
  status:catalog.status==='PARTIAL'||catalog.total_findings>catalog.items.length?
    'PARTIAL_CATEGORY_SOURCE_COVERAGE':'SOURCE_BACKED_CATEGORIES_OBSERVED',
  source_scope:'REALITY_GITHUB_WORK_CENTER_TEN_CATEGORIES',
  source_coverage:catalog.source_coverage,
  source_pagination:catalog.source_scans||null,
  source_catalog_truncated:catalog.total_findings>catalog.items.length,
  source_evidence_stages:'GITHUB_SOURCE_OBSERVATIONS_NOT_ALL_VERIFIED_GAPS',
  original_work_independent_settlements_included:false,
  owner_upgrade_ledger_separately_required:true,
  categories:groups,
  counts:{
   provider_observations:observations.length,
   categories_with_observations:groups.filter(g=>g.provider_observations>0).length,
   open_issues:observations.filter(x=>x.finding_type==='OPEN_ISSUE').length,
   pending_pr_review:observations.filter(x=>x.finding_type==='OPEN_PULL_REQUEST').length,
   previous_failure_signals:observations.filter(x=>x.finding_type==='RECURRING_FAILURE').length,
   recent_commits_excluded:commitsExcluded,
   duplicate_source_observations_excluded:duplicate,
   invalid_untrusted_source_observations_excluded:invalid
  },
  human_review_what_if:totalMinutes(),
  assumptions:{
   open_issue_review_minutes:[15,60],
   pending_pr_review_minutes:[30,120],
   prior_failure_validation_minutes:[30,90],
   provenance:'TRANSPARENT_EDITORIAL_ASSUMPTIONS_UNCALIBRATED_VERY_LOW_CONFIDENCE',
   task_completion_effort_estimated:false,
   source_links_do_not_prove_business_impact:true,
   overlap_between_distinct_source_urls_not_ruled_out:true,
   public_wage_usd_per_hour:wage.value,
   public_wage_reference:wage.source,
   public_wage_observed_at:wage.observation_period
  },
  measured_human_hours:null,
  independently_verified_discovery_time_saved_usd:null,
  independently_verified_execution_time_saved_usd:null,
  verified_cash_savings_usd:null,
  read_only:true,owner_approval_granted:false,job_started:false,
  installation_authorized:false,production_changed:false
 });
}
