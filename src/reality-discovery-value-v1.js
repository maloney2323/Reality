// Source-backed diagnostic/discovery opportunity-value analysis.
// Wage * hypothetical human effort is NOT verified cash savings, billing,
// consulting fee, net ROI, full repair duration, or realized customer value.
import {humanLaborBenchmarkCatalog} from './reality-human-labor-benchmark-v1.js';
const fail=x=>{throw Error('REALITY_DISCOVERY_VALUE_'+x)};
const sha=/^[a-f0-9]{64}$/;
const round=x=>Math.round(x*100)/100;
export const DISCOVERY_VALUE_VERSION='reality-discovery-economic-context-v1';
export function projectDiscoveryEconomicContext({candidateReceipt,ownerEconomicReadback}={}){
 if(candidateReceipt?.status!=='INDEPENDENTLY_VERIFIED_AND_DURABLY_RELEASED'||
    candidateReceipt.durable_release_readback_verified!==true||
    candidateReceipt.record_is_immutable!==true||
    candidateReceipt.installation_authorized!==false||
    candidateReceipt.installed!==false||
    candidateReceipt.source_issue!==188||
    candidateReceipt.verification_checks_passed!==21||
    !/^candidate-receipt:[a-f0-9]{32}$/.test(candidateReceipt.receipt_id||'')||
    !sha.test(candidateReceipt.source_sha256||'')||
    ownerEconomicReadback?.receipt_id!==candidateReceipt.receipt_id||
    ownerEconomicReadback.status!=='RELEASED_VERIFIED_PROVIDER_EVIDENCE'||
    ownerEconomicReadback.durable_readback_verified!==true||
    ownerEconomicReadback.source_sha256!==candidateReceipt.source_sha256||
    ownerEconomicReadback.verified_checks_passed!==candidateReceipt.verification_checks_passed||
    ownerEconomicReadback.source_of_usage!=='IMMUTABLE_INDEPENDENT_VERIFIER_REPORT'||
    ownerEconomicReadback.installation_authorized!==false||
    ownerEconomicReadback.installed!==false)
  fail('TRUSTED_RECEIPT_IDENTITY_REQUIRED');
 const bounded=(n,max)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
 if(!bounded(ownerEconomicReadback.observed_model_input_tokens,1000000)||
    !bounded(ownerEconomicReadback.observed_model_output_tokens,1000000)||
    !bounded(ownerEconomicReadback.observed_model_attempts,10)||
    ownerEconomicReadback.observed_model_attempts<1||
    !bounded(ownerEconomicReadback.observed_independent_verification_ms,1200000)||
    ownerEconomicReadback.observed_independent_verification_ms<1||
    ownerEconomicReadback.observed_model_cost_usd!==null)
  fail('OBSERVED_USAGE_OR_FINANCIAL_EVIDENCE_INVALID');
 const catalog=humanLaborBenchmarkCatalog();
 const source=catalog.BLS_SOFTWARE_WAGE;
 if(source?.measure!=='MEDIAN_HOURLY_WAGE_NOT_EMPLOYER_TOTAL_COST'||
    source.observation_period!=='2025-05'||!source.url?.startsWith('https://www.bls.gov/')||
    ![source.wage_by_occupation['15-1252'],source.wage_by_occupation['15-1253']].every(
      x=>typeof x==='number'&&x>0&&x<1000))
  fail('PUBLIC_BENCHMARK_NOT_VERIFIED');
 const hours=[1,2,4];
 const examples=hours.map(h=>Object.freeze({
  assumed_human_diagnostic_hours:h,
  developer_median_wage_labor_equivalent_usd:round(h*source.wage_by_occupation['15-1252']),
  qa_median_wage_labor_equivalent_usd:round(h*source.wage_by_occupation['15-1253']),
  evidence_status:'ILLUSTRATIVE_HOURS_NOT_MEASURED_OR_VERIFIED',
 }));
 return Object.freeze({
  version:DISCOVERY_VALUE_VERSION,
  receipt_id:candidateReceipt.receipt_id,
  value_category:'EARLY_PROBLEM_DISCOVERY_AND_DIAGNOSTIC_WORK',
  contribution_evidenced:'MISSING_CAPABILITY_SOURCE_BACKED_AND_VERIFIED_CANDIDATE_PRODUCED',
  observed:Object.freeze({
   independent_checks_passed:candidateReceipt.verification_checks_passed,
   model_attempts:ownerEconomicReadback.observed_model_attempts,
   model_input_tokens:ownerEconomicReadback.observed_model_input_tokens,
   model_output_tokens:ownerEconomicReadback.observed_model_output_tokens,
   independent_verification_ms:ownerEconomicReadback.observed_independent_verification_ms,
   usage_provenance:'IMMUTABLE_INDEPENDENT_VERIFIER_REPORT',
   historical_problem:'Missing source module for same-job completion receipt verification (#188)',
  }),
  public_wage_context:Object.freeze({
   source:source.url,
   dataset:source.dataset,
   published:source.published,
   observation_period:source.observation_period,
   unit:'USD_PER_HOUR',
   developer_median_usd_per_hour:source.wage_by_occupation['15-1252'],
   qa_median_usd_per_hour:source.wage_by_occupation['15-1253'],
   hourly_rate_type:'NATIONAL_MEDIAN_EMPLOYEE_WAGE_NOT_CONSULTING_RATE_OR_LOADED_COST',
  }),
  labor_equivalent_scenarios:Object.freeze(examples),
  measured_comparable_human_diagnostic_hours:null,
  measured_human_review_hours:null,
  verified_provider_and_infrastructure_cost_usd:null,
  verified_discovery_cash_savings_usd:null,
  realized_net_roi_usd:null,
  realized_roi_percent:null,
  paid_customer_value_usd:null,
  avoided_incident_loss_usd:null,
  status:'POTENTIAL_DIAGNOSTIC_LABOR_VALUE_NOT_REALIZED_FINANCIAL_ROI',
  interpretation:'Scenarios show labor value at hypothetical 1, 2, or 4 human diagnostic hours. No task duration, consulting invoice, employer overhead, payment or realized savings is established.',
  installation_authorized:false,
  original_job_settled:false,
 });
}
