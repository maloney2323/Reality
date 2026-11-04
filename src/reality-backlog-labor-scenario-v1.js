// Reality backlog potential value: distinct, still-open, source-linked issue
// scenarios only. Reuses existing human wage benchmarks and value calculations.
// Human time is provided as an explicit, unverified assumption; neither a
// backlog issue nor its scenario is a completed job, labor saving, or cash gain.
import {evaluateHumanLaborBenchmark} from './reality-human-labor-benchmark-v1.js';
import {projectHypotheticalWorkValue} from './reality-work-value-assessment-v0.1.js';
export const BACKLOG_VALUE_SCENARIO_VERSION='reality-backlog-labor-scenario-v1';
const ISSUE=/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/[1-9][0-9]*$/;
const ID=/^catalog:[a-f0-9]{32}$/;
const fail=s=>{throw Error('REALITY_BACKLOG_VALUE_'+s)};
const whole=(v,max)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
const rounded=x=>Number(x.toFixed(2));
export function summarizeSourceBackedIssueCandidates(brief){
 if(!brief||
  !['SOURCE_BACKED_DISCOVERY_OBSERVED','SOURCE_BACKED_DISCOVERY_PARTIAL'].includes(brief.status)||
  brief.phase!=='DISCOVERY_AND_PRIORITIZATION_ONLY_NOT_AN_EXECUTED_WORKDAY'||
  brief.read_only!==true||brief.installation_authorized!==false||
  brief.job_started!==false||brief.production_changed!==false||
  brief.shift_completed!==false||
  brief.source_scope!=='REALITY_GITHUB_REPOSITORY_ONLY'||
  brief.evidence_status!=='SOURCE_BACKED_OBSERVATIONS_NOT_INDEPENDENTLY_CONFIRMED_DEFECTS'||
  !Array.isArray(brief.items)||brief.items.length>25)
  fail('TRUSTED_CURRENT_SOURCE_BRIEF_REQUIRED');
 const list=[],seenIssue=new Set(),seenFinding=new Set();
 for(const w of brief.items){
  if(w?.finding_type!=='OPEN_ISSUE')continue;
  const url=w.evidence_refs?.[0];
  if(!ID.test(String(w.finding_id||''))||w.state!=='TRACKED_NEEDS_REVIEW'||
   !ISSUE.test(String(url||''))||seenFinding.has(w.finding_id)||
   w.verified_current_defect!==false||w.authorized_execution!==false||
   w.verified_time_saved_minutes!==null||
   w.verified_financial_value_usd!==null||
   w.human_baseline_minutes!==null)fail('ISSUE_SOURCE_UNVERIFIED');
  seenFinding.add(w.finding_id);
  if(seenIssue.has(url))continue;
  seenIssue.add(url);
  list.push(Object.freeze({finding_id:w.finding_id,issue_url:url,
   title:String(w.title||'Open issue awaiting validation').slice(0,260),
   issue_status:'TRACKED_OPEN_ISSUE_NOT_INDEPENDENTLY_REPRODUCED',
   job_validated:false,independent_baseline_verified:false}));
 }
 return Object.freeze(list);
}
export function projectBacklogLaborScenario({brief,assumptions}={}){
 const known=summarizeSourceBackedIssueCandidates(brief);
 if(!Array.isArray(assumptions)||assumptions.length<1||
  assumptions.length>12||assumptions.length>known.length)
  fail('EXPLICIT_BOUNDED_OWNER_ASSUMPTIONS_REQUIRED');
 const byId=new Map(known.map(x=>[x.finding_id,x])),seen=new Set();
 const labor=evaluateHumanLaborBenchmark({
  job_type:'SOFTWARE_REPAIR',assumed_occupation_soc:'15-1252'});
 const rate=labor.occupational_wage_benchmark?.value;
 if(!Number.isFinite(rate)||rate<=0||
  labor.occupational_wage_benchmark?.status!=='PUBLIC_NATIONAL_MEDIAN_WAGE'||
  labor.human_task_effort_hours?.value!==null||
  labor.verified_labor_savings_usd?.value!==null)
  fail('LABOR_REFERENCE_UNVERIFIED');
 let discovery=0,execution=0;
 const details=[];
 for(const record of assumptions){
  const keys=Object.keys(record||{}).sort();
  if(keys.join(',')!=='assumed_discovery_minutes,assumed_execution_minutes,finding_id'||
   !ID.test(String(record.finding_id||''))||
   seen.has(record.finding_id)||!byId.has(record.finding_id)||
   !whole(record.assumed_discovery_minutes,4800)||
   !whole(record.assumed_execution_minutes,4800)||
   (record.assumed_discovery_minutes===0&&record.assumed_execution_minutes===0)||
   record.assumed_discovery_minutes+record.assumed_execution_minutes>4800)
   fail('LABOR_ASSUMPTION_INVALID_OR_NOT_SOURCE_BOUND');
  seen.add(record.finding_id);
  const item=byId.get(record.finding_id);
  discovery+=record.assumed_discovery_minutes;
  execution+=record.assumed_execution_minutes;
  details.push(Object.freeze({
   finding_id:item.finding_id,issue_url:item.issue_url,
   assumed_discovery_minutes:record.assumed_discovery_minutes,
   assumed_execution_minutes:record.assumed_execution_minutes,
   assumed_total_hours:rounded((record.assumed_discovery_minutes+
     record.assumed_execution_minutes)/60),
   validated_current_defect:false,
   source_evidence_status:'OPEN_PROVIDER_ISSUE_NOT_VALIDATED_AS_REMAINING_WORK',
   human_estimate_evidence_status:'OWNER_INPUT_UNVERIFIED',
   savings_verified:false
  }));
 }
 // Existing projection is employed as arithmetic only. One occurrence and
 // unit coverage here model the assumed gross labor *equivalent*, NOT
 // automation coverage, realized savings, a recurring benefit, or net ROI.
 const gross=minutes=>minutes===0?0:
  projectHypotheticalWorkValue({
   manual_minutes_per_occurrence:minutes,occurrences_per_month:1,
   automatable_fraction:1,hourly_labor_value_usd:rate
  }).labor_value_equivalent_usd_per_month;
 return Object.freeze({
  version:BACKLOG_VALUE_SCENARIO_VERSION,
  status:'HYPOTHETICAL_SOURCE_LINKED_OWNER_LABOR_SCENARIO',
  source_scope:'CURRENT_PREVIEW_GITHUB_OPEN_ISSUES',
  evidence_status:'HUMAN_ESTIMATE_UNVERIFIED_ISSUE_REQUIRES_VALIDATION',
  assumption_scope:'ONE_TIME_GROSS_LABOR_EQUIVALENT_NOT_RECURRING_SAVINGS',
  assumptions_origin:'EXPLICIT_OWNER_INPUT_NOT_INDEPENDENTLY_MEASURED',
  unique_open_issues_currently_visible:known.length,
  scenarios_included:details.length,
  scenario_issues:details,
  estimated_discovery_hours:rounded(discovery/60),
  estimated_execution_hours:rounded(execution/60),
  estimated_combined_human_hours:rounded((discovery+execution)/60),
  hypothetical_discovery_labor_equivalent_usd:gross(discovery),
  hypothetical_execution_labor_equivalent_usd:gross(execution),
  hypothetical_total_labor_equivalent_usd:gross(discovery+execution),
  illustrative_wage_context:Object.freeze({
   hourly_usd:rate,occupation_soc:'15-1252',
   source:labor.occupational_wage_benchmark.source,
   observation_period:labor.occupational_wage_benchmark.observation_period,
   basis:'PUBLIC_MEDIAN_EMPLOYEE_WAGE_NOT_LOADED_COST_OR_JOB_DURATION'
  }),
  baseline_confidence:'UNVERIFIED_OWNER_ASSUMPTIONS',
  independently_validated_backlog_hours:null,
  independently_verified_discovery_time_saved_minutes:null,
  independently_verified_execution_time_saved_minutes:null,
  realized_cash_savings_usd:null,net_operating_value_usd:null,
  dollar_savings_verified:false,
  scenario_not_persisted:true,
  read_only:true,job_started:false,installation_authorized:false,
  production_changed:false,
  note:'Gross wage equivalent for selected issue-specific human effort assumptions. An open issue can be obsolete, duplicate, overlapping, or already fixed. Independent human-time comparisons, actual job completion and verified costs are required before claiming savings.'
 });
}
