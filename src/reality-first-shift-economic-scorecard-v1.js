// FIRST-SHIFT economic scorecard for independently accepted Reality work.
// SOURCE LABELS ARE NOT CASH SAVINGS: NASA fault-repair medians and BLS wage
// provide an illustrative labor equivalent. Exact provider + human review
// costs may produce an illustrative net, but never verified cash savings.
// A trusted owner-scoped backend must independently validate each settlement
// and cost receipt BEFORE passing data to this projection. This code does
// not authorize execution, create an employee or verify provider signatures.
import {publishedRepairEffortReference}
 from './reality-published-repair-effort-v1.js';

export const FIRST_SHIFT_ECONOMIC_VALUE_VERSION='reality-first-shift-economics-v1';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const SHA=/^[a-f0-9]{64}$/;
const SOURCE=/^https:\/\/github\.com\/maloney2323\/Reality\/(?:issues|pull|actions\/runs)\/[1-9]\d{0,15}$/;
const KINDS=new Set(['SOFTWARE_DEFECT_REPAIR','DEFECT_DIAGNOSIS_ONLY','CAPABILITY_UPGRADE']);
const fail=x=>{throw Error('FIRST_SHIFT_VALUE_'+x)};
const usd=n=>Number(n.toFixed(2));
const freeze=Object.freeze;
function time(x){
 if(typeof x!=='string'||!/^\d{4}-\d\d-\d\dT/.test(x)||
  !Number.isFinite(Date.parse(x)))fail('TIMESTAMP_INVALID');
 return Date.parse(x);
}
function nonnegative(v,max){
 return typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max;
}
function verifyReceipt(r,shiftId,seen){
 if(!WORK.test(r?.original_work_id||'')||seen.has(r.original_work_id)||
  r.shift_id!==shiftId||!KINDS.has(r.work_kind)||
  !SOURCE.test(r.source_url||'')||!SHA.test(r.receipt_sha256||'')||
  r.owner_scope_independently_verified!==true||
  r.provider_source_independently_verified!==true||
  r.original_job_completed!==(r.work_kind!=='DEFECT_DIAGNOSIS_ONLY')||
  r.independent_acceptance!==true||
  r.production_changed!==false||r.installation_authorized_by_shift!==false||
  (r.work_kind==='DEFECT_DIAGNOSIS_ONLY'&&
   r.status!=='INDEPENDENT_DIAGNOSIS_ACCEPTED')||
  (r.work_kind!=='DEFECT_DIAGNOSIS_ONLY'&&
   r.status!=='INDEPENDENT_ORIGINAL_JOB_SETTLEMENT_CONFIRMED'))
  fail('EXACT_INDEPENDENT_SHIFT_WORK_RECEIPT_REQUIRED');
 seen.add(r.original_work_id);
}
// Individual job cost entries must originate in a separate recorded
// provider and owner-review ledger, not a runtime estimate or token count.
function verifyCost(c,receiptMap,seen){
 if(!WORK.test(c?.original_work_id||'')||
  !receiptMap.has(c.original_work_id)||seen.has(c.original_work_id)||
  c.source_class!=='INDEPENDENT_PROVIDER_COST_AND_OWNER_REVIEW_READBACK'||
  !SHA.test(c.cost_evidence_sha256||'')||
  typeof c.provider_cost_source_ref!=='string'||
  c.provider_cost_source_ref.length<12||
  typeof c.review_source_ref!=='string'||c.review_source_ref.length<12||
  !nonnegative(c.model_provider_cost_usd,100000)||
  !nonnegative(c.infrastructure_cost_usd,100000)||
  !nonnegative(c.owner_review_minutes,10000))
  fail('INDEPENDENT_PER_JOB_COST_RECEIPT_REQUIRED');
 seen.add(c.original_work_id);
}
export function projectFirstShiftEconomicValue({
 shift,workReceipts=[],costReceipts=[]
}={}){
 if(!UUID.test(shift?.shift_id||'')||
  shift.owner_scope_verified!==true||
  shift.status!=='ENDED_WITH_VERIFIED_JOB'&&
   shift.status!=='ENDED_WITH_BLOCKED_WORK'&&
   shift.status!=='ENDED_READ_ONLY'||
  !Number.isFinite(time(shift.started_at))||
  time(shift.ended_at)<time(shift.started_at)||
  time(shift.ended_at)-time(shift.started_at)>12*60*60*1000||
  !Array.isArray(workReceipts)||workReceipts.length>40||
  !Array.isArray(costReceipts)||costReceipts.length>40)
  fail('EXACT_SHIFT_AND_BOUNDED_EVIDENCE_REQUIRED');
 const seen=new Set(),receiptMap=new Map();
 for(const r of workReceipts){
  verifyReceipt(r,shift.shift_id,seen);
  receiptMap.set(r.original_work_id,r);
 }
 const costSeen=new Set(),costs=new Map();
 for(const c of costReceipts){
  verifyCost(c,receiptMap,costSeen);
  costs.set(c.original_work_id,c);
 }
 const nasa=publishedRepairEffortReference();
 if(nasa.reference_scope!=='HUMAN_SOFTWARE_FAULT_REPAIR_NOT_GENERAL_UPGRADE_OR_PR_WORK'||
  nasa.combined_reference_hours!==5||
  nasa.study.median_investigation_hours!==2||
  nasa.study.median_implementation_hours!==3||
  nasa.public_median_developer_wage_usd_per_hour!==65.38||
  nasa.verified_actual_cash_savings_usd!==null)
  fail('EXTERNAL_NASA_BLS_BENCHMARK_CHANGED_REVIEW_REQUIRED');
 const rate=nasa.public_median_developer_wage_usd_per_hour;
 const rows=workReceipts.map(r=>{
  const benchmarkHours=r.work_kind==='SOFTWARE_DEFECT_REPAIR'?5:
   r.work_kind==='DEFECT_DIAGNOSIS_ONLY'?2:null;
  const gross=benchmarkHours===null?null:usd(benchmarkHours*rate);
  const c=costs.get(r.original_work_id);
  const provider=c?usd(c.model_provider_cost_usd+c.infrastructure_cost_usd):null;
  const review=c?usd(c.owner_review_minutes/60*rate):null;
  const net=c&&gross!==null?usd(gross-provider-review):null;
  return freeze({
   original_work_id:r.original_work_id,source_url:r.source_url,
   work_kind:r.work_kind,receipt_sha256:r.receipt_sha256,
   recorded_independent_work_status:r.status,
   nasa_comparable:r.work_kind!=='CAPABILITY_UPGRADE',
   benchmark_hours:benchmarkHours,
   gross_illustrative_labor_equivalent_usd:gross,
   measured_provider_and_infrastructure_cost_usd:provider,
   recorded_owner_review_minutes:c?.owner_review_minutes??null,
   review_labor_wage_equivalent_usd:review,
   net_benchmark_adjusted_value_usd:net,
   net_value_status:net===null?
    r.work_kind==='CAPABILITY_UPGRADE'?
     'UPGRADE_REQUIRES_DISTINCT_COMPARABLE_HUMAN_BASELINE':
     'ACTUAL_COST_OR_REVIEW_RECEIPT_MISSING':
    'ILLUSTRATIVE_NET_USING_PUBLISHED_WAGE_NOT_REALIZED_CASH',
   actual_cash_savings_usd:null,verified_human_hours_saved:null,
   cost_source_sha256:c?.cost_evidence_sha256??null,
  });
 });
 const grossKnown=rows.filter(x=>x.gross_illustrative_labor_equivalent_usd!==null);
 const priced=rows.filter(x=>x.net_benchmark_adjusted_value_usd!==null);
 const unpriced=rows.filter(x=>x.net_benchmark_adjusted_value_usd===null);
 const gross=usd(grossKnown.reduce((n,x)=>n+x.gross_illustrative_labor_equivalent_usd,0));
 const net=usd(priced.reduce((n,x)=>n+x.net_benchmark_adjusted_value_usd,0));
 return freeze({
  version:FIRST_SHIFT_ECONOMIC_VALUE_VERSION,
  status:rows.length?'INDEPENDENT_WORK_RECEIPTS_WITH_ILLUSTRATIVE_ECONOMICS':
   'NO_INDEPENDENTLY_ACCEPTED_SHIFT_WORK',
  shift_id:shift.shift_id,
  shift_ended_at:shift.ended_at,
  recorded_accepted_work_count:rows.length,
  defect_repairs_count:rows.filter(x=>x.work_kind==='SOFTWARE_DEFECT_REPAIR').length,
  diagnosis_only_count:rows.filter(x=>x.work_kind==='DEFECT_DIAGNOSIS_ONLY').length,
  upgrades_count:rows.filter(x=>x.work_kind==='CAPABILITY_UPGRADE').length,
  comparable_nasa_eligible_work_count:grossKnown.length,
  total_illustrative_gross_benchmark_usd:gross,
  total_benchmark_adjusted_net_usd:unpriced.length===0?net:null,
  priced_subset_net_benchmark_usd:priced.length?net:null,
  incomplete_cost_or_human_comparator_count:unpriced.length,
  nasa_source_url:nasa.study.source_url,
  nasa_investigation_median_hours:nasa.study.median_investigation_hours,
  nasa_fix_median_hours:nasa.study.median_implementation_hours,
  sum_of_medians_not_median_total:true,
  wage_source_url:nasa.public_wage_source,
  wage_observation_period:nasa.public_wage_observation_period,
  median_developer_wage_usd_per_hour:rate,
  job_rows:freeze(rows),
  interpretation:'BENCHMARK_LABOR_EQUIVALENT_LESS_RECORDED_COSTS_NOT_CASH_SAVINGS',
  real_cash_savings_independently_verified:false,
  actual_cash_savings_usd:null,
  measured_human_hours_saved:null,
  jobs_reexecuted_by_projection:false,
  owner_execution_authorized_by_projection:false,
  capability_installed_by_projection:false,
  production_changed:false,
 });
}
