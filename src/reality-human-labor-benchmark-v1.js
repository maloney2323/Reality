// Human labor context for Reality's ORIGINAL work ROI reports.
// Public benchmark figures are fixed, dated editorial observations with sources;
// no arbitrary LLM text, occupation frequency, or wages may become job duration.
// This is not an unattended data fetcher; refresh source snapshots with review.
export const HUMAN_LABOR_BENCHMARK_VERSION='reality-human-labor-benchmark-v1';
const frozen=x=>Object.freeze(x);
const fail=x=>{throw Error('REALITY_HUMAN_LABOR_'+x)};
const round=n=>Number(n.toFixed(4));
const unknown=(unit,reason)=>frozen({value:null,unit,status:reason});
const SOURCES=frozen({
 BLS_SOFTWARE_WAGE:frozen({
  provider:'BLS',dataset:'OEWS May 2025 national occupational wages',
  published:'2026-05-15',observation_period:'2025-05',
  url:'https://www.bls.gov/news.release/ocwage.t01.htm',
  unit:'USD_PER_HOUR',measure:'MEDIAN_HOURLY_WAGE_NOT_EMPLOYER_TOTAL_COST',
  wage_by_occupation:frozen({
   '15-1252':65.38,'15-1253':50.14,
  }),
 }),
 ONET_SOFTWARE_TASKS:frozen({
  provider:'ONET',dataset:'O*NET OnLine Software Developers',
  observation_period:null,
  url:'https://www.onetonline.org/link/summary/15-1252.00',
  unit:'TASK_CATEGORY_NOT_DURATION',
  role:'Software Developers',occupation_soc:'15-1252',
 }),
 APQC_INVOICE_PRODUCTIVITY:frozen({
  provider:'APQC',dataset:'Open Standards Benchmarking',
  metric_id:'101287',measure:'NUMBER_OF_INVOICES_PER_FTE',
  industry:'ALL_COMPANIES',sample_size:3284,
  value:25714,period:'PER_YEAR',statistic:'MEDIAN',
  observation_period:'UNDATED_CURRENT_SOURCE_SNAPSHOT',
  source_review_date:'2026-11-02',
  url:'https://www.apqc.org/resources/benchmarking/open-standards-benchmarking/measures/number-invoices-processed-fte-0',
 }),
});
export function humanLaborBenchmarkCatalog(){
 return SOURCES;
}
const types=frozen(['SOFTWARE_REPAIR','CUSTOMER_INVOICING']);
export function evaluateHumanLaborBenchmark({
 job_type,original_work_id=null,
 number_of_comparable_items=null,
 annual_paid_hours_per_fte=null,
 assumed_occupation_soc=null,
 }={}){
 if(!types.includes(job_type))fail('EXPLICIT_SUPPORTED_WORK_TYPE_REQUIRED');
 if(original_work_id!==null&&!/^work:[a-f0-9]{32}$/.test(original_work_id))
  fail('ORIGINAL_WORK_ID_INVALID');
 if(number_of_comparable_items!==null&&(!Number.isSafeInteger(number_of_comparable_items)||
    number_of_comparable_items<1||number_of_comparable_items>1000000))
  fail('COMPARABLE_VOLUME_INVALID');
 if(annual_paid_hours_per_fte!==null&&
   (!Number.isFinite(annual_paid_hours_per_fte)||
    annual_paid_hours_per_fte<100||annual_paid_hours_per_fte>3000))
  fail('WORKFORCE_HOURS_ASSUMPTION_INVALID');
 if(job_type==='SOFTWARE_REPAIR'){
  if(number_of_comparable_items!==null||annual_paid_hours_per_fte!==null)
   fail('WAGES_AND_TASK_DESCRIPTORS_CANNOT_ESTIMATE_REPAIR_DURATION');
  if(assumed_occupation_soc!==null&&!['15-1252','15-1253'].includes(assumed_occupation_soc))
   fail('ROLE_NOT_VERIFIED');
  const soc=assumed_occupation_soc;
  return frozen({
   version:HUMAN_LABOR_BENCHMARK_VERSION,job_type,original_work_id,
   human_role_mapping:'ILLUSTRATIVE_OCCUPATIONAL_ANALOGY_NOT_EXACT_JOB_MATCH',
   occupation_soc:soc,
   occupational_wage_benchmark:soc===null?
     unknown('USD_PER_HOUR','SPECIFIC_ROLE_NOT_IDENTIFIED'):
     frozen({value:SOURCES.BLS_SOFTWARE_WAGE.wage_by_occupation[soc],
       unit:'USD_PER_HOUR',status:'PUBLIC_NATIONAL_MEDIAN_WAGE',
       source:SOURCES.BLS_SOFTWARE_WAGE.url,
       observation_period:SOURCES.BLS_SOFTWARE_WAGE.observation_period}),
   occupational_task_reference:frozen({
    source:SOURCES.ONET_SOFTWARE_TASKS.url,
    status:'OCCUPATIONAL_TASKS_NOT_HOURS_PER_BUG'}),
   human_task_effort_hours:unknown('PERSON_HOURS','NO_EMPIRICAL_COMPARABLE_REPAIR_DURATIONS'),
   human_crew_size:unknown('WORKERS','NO_ROLE_COVERAGE_BASELINE'),
   projected_labor_cost_usd:unknown('USD','MISSING_JOB_DURATION_AND_LOADED_COST'),
   verified_labor_savings_usd:unknown('USD','NO_MEASURED_HUMAN_COMPARATOR'),
   verified_staff_reduction:unknown('PEOPLE','NO_STAFFING_EVIDENCE'),
   input_authorizes_execution:false,
  });
 }
 if(assumed_occupation_soc!==null)fail('UNRELATED_OCCUPATIONAL_WAGES_REJECTED');
 const assumptionsComplete=number_of_comparable_items!==null&&annual_paid_hours_per_fte!==null;
 const annualFteEquivalent=assumptionsComplete?
  number_of_comparable_items/SOURCES.APQC_INVOICE_PRODUCTIVITY.value:null;
 const laborCapacityHours=assumptionsComplete?
  annualFteEquivalent*annual_paid_hours_per_fte:null;
 return frozen({
  version:HUMAN_LABOR_BENCHMARK_VERSION,job_type,original_work_id,
  benchmark:frozen({
   source:SOURCES.APQC_INVOICE_PRODUCTIVITY.url,
   metric_id:SOURCES.APQC_INVOICE_PRODUCTIVITY.metric_id,
   cohort:'ALL_COMPANIES',sample_size:SOURCES.APQC_INVOICE_PRODUCTIVITY.sample_size,
   statistic:'MEDIAN',invoices_per_fte_year:SOURCES.APQC_INVOICE_PRODUCTIVITY.value,
   status:'PUBLIC_COMPARATIVE_PRODUCTIVITY_NOT_COMPANY_MEASUREMENT',
   note:'FTE throughput is NOT task stopwatch duration or process cycle time.',
  }),
  assumptions:frozen({
   comparable_invoices:number_of_comparable_items,
   paid_hours_per_fte_year:annual_paid_hours_per_fte,
   benchmark_applicability:'UNVERIFIED_CUSTOMER_WORKLOAD_EQUIVALENCE',
  }),
  human_capacity_equivalent:frozen({
   fte_years:annualFteEquivalent===null?null:round(annualFteEquivalent),
   hours:laborCapacityHours===null?null:round(laborCapacityHours),
   hours_per_invoice:annual_paid_hours_per_fte===null?null:
     round(annual_paid_hours_per_fte/SOURCES.APQC_INVOICE_PRODUCTIVITY.value),
   status:assumptionsComplete?'HYPOTHETICAL_CAPACITY_FROM_APQC_MEDIAN_AND_USER_ASSUMPTION':
     'AWAITING_VOLUME_AND_PAID_HOURS_ASSUMPTIONS',
  }),
  hands_on_minutes_per_invoice:unknown('MINUTES','FTE_THROUGHPUT_DOES_NOT_MEASURE_TASK_EFFORT'),
  process_cycle_time:unknown('HOURS','FTE_THROUGHPUT_DOES_NOT_MEASURE_CYCLE_TIME'),
  fully_loaded_labor_cost:unknown('USD','NO_OCCUPATION_MATCHED_COST_BENCHMARK'),
  verified_labor_savings_usd:unknown('USD','CUSTOMER_OUTCOME_NOT_VERIFIED'),
  verified_staff_reduction:unknown('PEOPLE','STAFFING_COVERAGE_NOT_MEASURED'),
  input_authorizes_execution:false,
 });
}
export function enrichOwnerJobRoiWithHumanLabor(roi){
 if(roi?.version!=='reality-owner-original-job-roi-projection-v1'||
    roi.production_changed!==false||
    !Array.isArray(roi.jobs)||roi.jobs.length>20||
    roi.jobs.some(j=>j.technical_settlement_status!=='INDEPENDENTLY_SETTLED_ISOLATED_PREVIEW'||
      !/^work:[a-f0-9]{32}$/.test(j.original_work_id)||
      j.production_changed!==false||
      j.economic_value?.verified_cash_savings_usd?.value!==null))
  fail('TRUSTED_ORIGINAL_ROI_READBACK_REQUIRED');
 // Current qualifying code repair jobs are software-engineering activities.
 // Linking an occupational description does not invent elapsed human labor.
 const jobs=roi.jobs.map(j=>frozen({...j,human_labor_context:
  evaluateHumanLaborBenchmark({
   job_type:'SOFTWARE_REPAIR',original_work_id:j.original_work_id}),
 }));
 return frozen({
  ...roi,version:'reality-owner-original-job-roi-human-labor-v1',
  jobs:frozen(jobs),
  human_labor_intelligence_status:'OCCUPATION_REFERENCE_AVAILABLE_COMPARABLE_HUMAN_DURATION_UNKNOWN',
  verified_customer_financial_roi:false,
  job_execution_authorized_by_analysis:false,
 });
}
