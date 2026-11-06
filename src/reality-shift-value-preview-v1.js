// Evidence-bounded financial *potential* for Reality's proposed virtual
// workforce. Reuse the existing BLS wage and published NASA repair reference.
// This is not a customer forecast, employee displacement or measured ROI.
import {publishedRepairEffortReference}
 from './reality-published-repair-effort-v1.js';
export const SHIFT_VALUE_PREVIEW_VERSION='reality-source-backed-shift-value-preview-v1';
const fail=x=>{throw Error('RILEY_SHIFT_VALUE_'+x)};
const money=n=>Number(n.toFixed(2));
export function buildRealityShiftValuePreview(roster,{humanDayHours=8}={}){
 if(!roster||roster.version!=='reality-proposed-ai-employee-roster-v1'||
  roster.status!=='READ_ONLY_PROPOSED_AI_EMPLOYEES'||
  roster.proposed_employee_count!==8||
  roster.active_ai_employee_count!==0||
  !Array.isArray(roster.proposed_employees)||
  roster.proposed_employees.length!==8||
  !Number.isSafeInteger(roster.existing_work_center_candidates)||
  roster.existing_work_center_candidates<0||
  roster.existing_work_center_candidates>1000||
  roster.verified_cash_savings_usd!==null||
  roster.verified_independently_completed_jobs!==0||
  roster.staffing_fte_measured!==false||
  roster.live_deployment_verified!==false||
  roster.production_changed!==false||
  roster.original_job_admitted!==false||
  roster.installation_authorized!==false||
  humanDayHours!==8||
  roster.proposed_employees.some(x=>
   x.activation_status!=='PROPOSED_NOT_DEPLOYED'||
   x.active_worker_id!==null||x.worker_shift_id!==null||
   x.independently_completed_jobs!==0||
   x.realized_savings_usd!==null||
   !Number.isSafeInteger(x.candidate_count)||
   !Array.isArray(x.candidate_jobs)||
   x.candidate_count!==x.candidate_jobs.length))
  fail('SOURCE_BACKED_PROPOSED_ROSTER_REQUIRED');
 const engineer=roster.proposed_employees.filter(e=>
  e.function_id==='software_engineering'&&e.pilot===true);
 if(engineer.length!==1)fail('EXACT_SOFTWARE_PILOT_REQUIRED');
 const study=publishedRepairEffortReference();
 if(study.status!=='PUBLISHED_EXTERNAL_HUMAN_EFFORT_REFERENCE_NOT_REALITY_CALIBRATED'||
  study.study.median_investigation_hours!==2||
  study.study.median_implementation_hours!==3||
  study.combined_reference_hours!==5||
  study.public_wage_observation_period!=='2025-05'||
  study.financial_roi_verified!==false||
  !Number.isFinite(study.public_median_developer_wage_usd_per_hour)||
  study.public_median_developer_wage_usd_per_hour<=0)
  fail('PUBLISHED_NASA_AND_BLS_REFERENCE_REQUIRED');
 const wage=study.public_median_developer_wage_usd_per_hour;
 const single=study.per_comparable_repair_gross_wage_equivalent_usd;
 if(money(study.combined_reference_hours*wage)!==money(single))
  fail('REPAIR_REFERENCE_ARITHMETIC_UNVERIFIED');
 const example=n=>Object.freeze({
  assumed_distinct_comparable_software_faults:n,
  sum_of_separate_median_effort_hours:n*study.combined_reference_hours,
  illustrative_gross_human_wage_equivalent_usd:money(n*single),
  human_eight_hour_shift_equivalents:money(n*study.combined_reference_hours/humanDayHours),
  independently_verified_current_faults:0,
  predicted_Riley_throughput:null,
  realized_time_savings_hours:null,
  realized_cash_savings_usd:null
 });
 const distinct=new Set();
 for(const e of roster.proposed_employees)for(const finding of e.candidate_jobs){
  if(!/^catalog:[a-f0-9]{32}$/.test(finding?.finding_id||'')||
   finding.authorized_execution!==false||
   finding.independently_verified_done!==false)
   fail('UNVERIFIED_SOURCE_FINDING');
  distinct.add(finding.finding_id);
 }
 // Do not sum overlapping category assignments; the catalog owns the unique
 // current count, which is distinct from a fully qualified repair backlog.
 if(distinct.size!==roster.existing_work_center_candidates)
  fail('CATEGORY_FINDING_COUNTS_NOT_UNIQUE');
 return Object.freeze({
  version:SHIFT_VALUE_PREVIEW_VERSION,
  status:'SOURCE_BACKED_WORKFORCE_POTENTIAL_NOT_MEASURED_ROI',
  team:{
   proposed_virtual_role_count:roster.proposed_employee_count,
   proposed_roles_are_employed_people:false,
   active_verified_employee_workers:roster.active_ai_employee_count,
   independently_measured_human_fte_replaced:null,
   workforce_cost_avoided_usd:null,
   source_backed_work_center_findings:distinct.size,
   software_engineering_findings:engineer[0].candidate_count,
   all_findings_are_confirmed_repairs:false,
   role_coverage_assessment:'EIGHT_POSSIBLE_FUNCTIONS_NOT_EIGHT_VERIFIED_REPLACED_EMPLOYEES'
  },
  comparable_software_repair:{
   source:'PUBLISHED_NASA_MISSION_SOFTWARE_FAULT_STUDY',
   study_source_url:study.study.source_url,
   doi_source_url:study.study.doi_url,
   study_year:study.study.published_year,
   investigation_median_hours:study.study.median_investigation_hours,
   implementation_median_hours:study.study.median_implementation_hours,
   illustrative_sum_of_medians_hours:study.combined_reference_hours,
   sum_of_medians_not_median_total:true,
   not_calibrated_to_this_company:true,
   wage_source_url:study.public_wage_source,
   wage_observation_period:study.public_wage_observation_period,
   developer_median_wage_usd_per_hour:wage,
   one_fault_example:example(1),
   four_fault_example:example(4),
   scenario_scope:'IF_COMPARABLE_INDEPENDENTLY_CONFIRMED_SOFTWARE_FAULTS_EXIST',
   scenario_not_shift_throughput_forecast:true,
   scenario_not_cash_savings:true
  },
  evidence:{
   signed_in_current_catalog_required:true,
   independent_source_qualification_still_required:true,
   original_job_execution_verified_by_this_preview:false,
   verified_staff_reduction:null,
   actual_human_baseline_hours:null,
   actual_automation_cost_usd:null,
   verified_net_hours_saved:null,
   verified_net_roi_usd:null,
   recurring_savings_verified:false,
   production_changed:false
  },
  read_only:true,job_started:false,installation_authorized:false
 });
}
