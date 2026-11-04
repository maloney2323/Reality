// Automatic backlog LABOR-EXPOSURE WHAT-IF planning, not inferred human
// effort, actual savings, confirmed active defects or independently calibrated
// task duration. All planning durations are explicitly declared assumptions.
// Reuse Reality's existing source-linked wage and labor arithmetic.
import {summarizeSourceBackedIssueCandidates} from './reality-backlog-labor-scenario-v1.js';
import {evaluateHumanLaborBenchmark} from './reality-human-labor-benchmark-v1.js';
import {projectHypotheticalWorkValue} from './reality-work-value-assessment-v0.1.js';
export const AUTO_BACKLOG_VALUE_VERSION='reality-automatic-backlog-planning-v1';
const url=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/[1-9][0-9]*$/;
const parent=/\bparent(?:\s+business\s+objective|\s+issue)?\s*:\s*#([1-9][0-9]*)\b/i;
const fail=code=>{throw Error('REALITY_AUTO_BACKLOG_'+code)};
const scenarios=Object.freeze({
 conservative:Object.freeze({discovery_minutes:30,execution_minutes:120}),
 extended:Object.freeze({discovery_minutes:120,execution_minutes:480})
});
const round=n=>Number(n.toFixed(2));
const amount=(minutes,rate)=>minutes<=0?0:
 projectHypotheticalWorkValue({
  manual_minutes_per_occurrence:minutes,
  occurrences_per_month:1,automatable_fraction:1,
  hourly_labor_value_usd:rate
 }).labor_value_equivalent_usd_per_month;
export function deriveAutomaticBacklogPlanning({brief,liveIssues}={}){
 const candidates=summarizeSourceBackedIssueCandidates(brief);
 if(!Array.isArray(liveIssues)||liveIssues.length>100||
   brief.source_coverage?.issues!=='checked')
  fail('FRESH_ISSUE_PROVIDER_COVERAGE_REQUIRED');
 const byUrl=new Map();
 for(const entry of liveIssues){
  if(entry?.pull_request||entry?.state!=='open')continue;
  const link=String(entry.html_url||'');
  if(!url.test(link)||!Number.isSafeInteger(entry.number)||entry.number<=0||
    link!=='https://github.com/maloney2323/Reality/issues/'+entry.number||
    byUrl.has(link))continue;
  const declaredParent=String(entry.body||'').slice(0,20000).match(parent)?.[1];
  byUrl.set(link,Object.freeze({
   link,issue_number:entry.number,
   provider_updated_at:typeof entry.updated_at==='string'?
    entry.updated_at.slice(0,40):null,
   parent_issue_number:declaredParent?Number(declaredParent):null
  }));
 }
 const available=candidates.map(c=>({
  ...c,details:byUrl.get(c.issue_url)
 })).filter(x=>x.details);
 const linkedParentNumbers=new Set(available
  .map(x=>x.details.parent_issue_number)
  .filter(n=>Number.isSafeInteger(n)&&n>0));
 // Where the provider *explicitly* marks one issue as the parent objective of
 // another, count only the leaf. This is not proof other issues cannot overlap.
 const considered=available.filter(x=>
  !linkedParentNumbers.has(x.details.issue_number));
 const excludedParent=available.length-considered.length;
 const totalOpenUnique=byUrl.size;
 const wage=evaluateHumanLaborBenchmark({
  job_type:'SOFTWARE_REPAIR',assumed_occupation_soc:'15-1252'});
 const rate=wage.occupational_wage_benchmark?.value;
 if(wage.occupational_wage_benchmark?.status!=='PUBLIC_NATIONAL_MEDIAN_WAGE'||
  wage.human_task_effort_hours?.value!==null||
  wage.verified_labor_savings_usd?.value!==null||
  !Number.isFinite(rate)||rate<=0)
  fail('OCCUPATIONAL_RATE_REFERENCE_UNTRUSTED');
 const n=considered.length;
 const modelScenario=(plan)=>({
  conditional_discovery_hours:round(n*plan.discovery_minutes/60),
  conditional_execution_hours:round(n*plan.execution_minutes/60),
  conditional_total_hours:round(n*(plan.discovery_minutes+plan.execution_minutes)/60),
  conditional_discovery_labor_equivalent_usd:
   amount(n*plan.discovery_minutes,rate),
  conditional_execution_labor_equivalent_usd:
   amount(n*plan.execution_minutes,rate),
  conditional_total_labor_equivalent_usd:
   amount(n*(plan.discovery_minutes+plan.execution_minutes),rate)
 });
 const coverageComplete=brief.status==='SOURCE_BACKED_DISCOVERY_OBSERVED'&&
  candidates.length===totalOpenUnique;
 return Object.freeze({
  version:AUTO_BACKLOG_VALUE_VERSION,
  status:n?'AUTOMATIC_UNCALIBRATED_CONDITIONAL_PLANNING':'NO_ELIGIBLE_DISTINCT_CURRENT_ISSUES',
  source_scope:'GITHUB_OPEN_ISSUES_WITHIN_WORKDAY_CATALOG_WINDOW',
  source_coverage:coverageComplete?'COMPLETE_FOR_OPEN_ISSUE_WINDOW':'PARTIAL_SOURCE_WINDOW',
  observed_at:brief.observed_at,
  planning_basis:'UNMEASURED_GENERIC_WHAT_IF_ASSUMPTIONS_NOT_A_TASK_FORECAST',
  wage_basis:'PUBLIC_NATIONAL_MEDIAN_EMPLOYEE_WAGE_NOT_LOADED_COST',
  applied_wage_usd_per_hour:rate,
  wage_source_url:wage.occupational_wage_benchmark.source,
  wage_observation_period:wage.occupational_wage_benchmark.observation_period,
  counts:Object.freeze({
   open_provider_issues_seen:totalOpenUnique,
   open_issues_with_catalog_evidence:available.length,
   explicit_parent_objectives_excluded:excludedParent,
   included_distinct_leaf_issues:n,
   unrepresented_provider_issues:Math.max(0,totalOpenUnique-available.length),
   independently_validated_current_defects:0,
   independently_calibrated_human_tasks:0,
   current_human_comparator_records:0
  }),
  transparency:Object.freeze({
   conservative_discovery_minutes_per_issue:scenarios.conservative.discovery_minutes,
   conservative_execution_minutes_per_issue:scenarios.conservative.execution_minutes,
   extended_discovery_minutes_per_issue:scenarios.extended.discovery_minutes,
   extended_execution_minutes_per_issue:scenarios.extended.execution_minutes,
   assumption_source:'TRANSPARENT_EDITORIAL_PLANNING_PRESET_NOT_OBSERVED_HUMAN_TIMES',
   confidence:'UNCALIBRATED_VERY_LOW',
   cannot_compare_against_customer_labor_baseline:true,
   parent_overlap_excluded_only_when_explicit:true,
   other_issue_overlap_not_ruled_out:true,
   financial_roi_verified:false
  }),
  conditional_conservative:modelScenario(scenarios.conservative),
  conditional_extended:modelScenario(scenarios.extended),
  included_issues:Object.freeze(considered.slice(0,20).map(x=>Object.freeze({
   finding_id:x.finding_id,issue_url:x.issue_url,
   issue_number:x.details.issue_number,
   title:x.title,
   provider_updated_at:x.details.provider_updated_at,
   evidence_status:'OPEN_PROVIDER_ISSUE_NOT_VALIDATED_AS_ACTIVE_UNFINISHED_JOB',
   human_baseline_verified:false,
   estimated_actual_effort_hours:null,
   realized_value_usd:null
  }))),
  measured_human_backlog_hours:null,
  independently_verified_discovery_savings_usd:null,
  independently_verified_execution_savings_usd:null,
  verified_financial_savings_usd:null,
  actual_provider_cost_usd:null,
  settled_jobs_from_this_analysis:0,
  owner_approval_granted:false,
  job_started:false,installation_authorized:false,
  production_changed:false,read_only:true,
  note:'This automatic example answers ONLY what a chosen set of assumed hours would cost at a public median wage if the distinct open issues really required that work. It is NOT an estimate of actual jobs, a daily recurring amount, verified labor saved, or attributable financial value. Future comparable human measurements are required to calibrate the range.'
 });
}
