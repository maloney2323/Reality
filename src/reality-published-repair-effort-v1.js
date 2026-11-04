// Published HUMAN software-fault effort reference, independent of Reality
// task execution. Historic study medians inform an uncalibrated what-if;
// a sum of distinct medians is NOT a measured median total or a task forecast.
// The study is from one NASA mission and cannot be generalized without local
// calibration. It is not proof of customer savings, cash or replacement staff.
import {evaluateHumanLaborBenchmark} from './reality-human-labor-benchmark-v1.js';
import {projectHypotheticalWorkValue} from './reality-work-value-assessment-v0.1.js';
export const PUBLISHED_REPAIR_EFFORT_VERSION='reality-published-human-repair-effort-v1';
const source='https://ntrs.nasa.gov/api/citations/20160008693/downloads/20160008693.pdf';
const secondary='https://doi.org/10.1016/j.infsof.2017.01.002';
function laborValue(hours,wage){
 if(!Number.isSafeInteger(hours)||hours<1||hours>100000||
  !Number.isFinite(wage)||wage<=0)throw Error('REPAIR_REFERENCE_VALUE_INPUT_INVALID');
 return projectHypotheticalWorkValue({
  manual_minutes_per_occurrence:hours*60,
  occurrences_per_month:1,automatable_fraction:1,
  hourly_labor_value_usd:wage
 }).labor_value_equivalent_usd_per_month;
}
export function publishedRepairEffortReference(){
 const labor=evaluateHumanLaborBenchmark({
  job_type:'SOFTWARE_REPAIR',assumed_occupation_soc:'15-1252'});
 const hourly=labor.occupational_wage_benchmark?.value;
 if(labor.occupational_wage_benchmark?.status!=='PUBLIC_NATIONAL_MEDIAN_WAGE'||
  labor.human_task_effort_hours?.value!==null||
  labor.verified_labor_savings_usd?.value!==null||
  !Number.isFinite(hourly)||hourly<=0)
  throw Error('REPAIR_REFERENCE_WAGE_NOT_SUPPORTED');
 const study=Object.freeze({
  source_url:source,doi_url:secondary,
  title:'Analyzing and predicting effort associated with finding and fixing software faults',
  published_year:2017,
  setting:'SINGLE_NASA_MISSION_NOT_ALL_SOFTWARE_PROJECTS',
  failures_investigated:1257,failures_with_fix_effort_recorded:1153,
  median_investigation_hours:2,
  median_implementation_hours:3,
  fix_effort_over_eight_hours_percent:28,
  effort_heavily_skewed:true
 });
 const combined=study.median_investigation_hours+study.median_implementation_hours;
 return Object.freeze({
  version:PUBLISHED_REPAIR_EFFORT_VERSION,
  status:'PUBLISHED_EXTERNAL_HUMAN_EFFORT_REFERENCE_NOT_REALITY_CALIBRATED',
  study,
  source_validated_as_real_historic_research:true,
  reference_scope:'HUMAN_SOFTWARE_FAULT_REPAIR_NOT_GENERAL_UPGRADE_OR_PR_WORK',
  combined_reference_hours:combined,
  combined_reference_interpretation:'SUM_OF_TWO_SEPARATE_STUDY_MEDIANS_NOT_MEDIAN_OF_SUMS',
  public_median_developer_wage_usd_per_hour:hourly,
  public_wage_source:labor.occupational_wage_benchmark.source,
  public_wage_observation_period:labor.occupational_wage_benchmark.observation_period,
  per_comparable_repair_gross_wage_equivalent_usd:laborValue(combined,hourly),
  examples:Object.freeze([1,5,10].map(n=>Object.freeze({
   comparable_confirmed_repairs_assumed:n,
   illustrative_human_hours:n*combined,
   illustrative_gross_wage_equivalent_usd:laborValue(n*combined,hourly),
   not_confirmed_backlog_or_verified_savings:true
  }))),
  calibrated_to_reality_task_durations:false,
  verified_human_work_hours:null,
  verified_actual_cash_savings_usd:null,
  original_job_verified_completed_by_reference:false,
  covers_capability_feature_builds:false,
  financial_roi_verified:false,
  read_only:true
 });
}
