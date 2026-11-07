import test from 'node:test';
import assert from 'node:assert/strict';
import {projectFirstShiftEconomicValue as evaluate}
 from '../src/reality-first-shift-economic-scorecard-v1.js';
const shiftId='12345678-9abc-4def-8765-123456789abc';
const start='2026-11-07T12:00:00.000Z';
const end='2026-11-07T16:00:00.000Z';
const shift={shift_id:shiftId,status:'ENDED_WITH_VERIFIED_JOB',
 owner_scope_verified:true,started_at:start,ended_at:end};
const source='https://github.com/maloney2323/Reality/issues/263';
const id=n=>'work:'+n.toString(16).padStart(32,'0');
const receipt=(n,work_kind='SOFTWARE_DEFECT_REPAIR')=>({
 shift_id:shiftId,original_work_id:id(n),work_kind,source_url:
  'https://github.com/maloney2323/Reality/issues/'+(263+n),
 receipt_sha256:n.toString(16).padStart(64,'a'),
 owner_scope_independently_verified:true,
 provider_source_independently_verified:true,
 original_job_completed:work_kind!=='DEFECT_DIAGNOSIS_ONLY',
 independent_acceptance:true,production_changed:false,
 installation_authorized_by_shift:false,
 status:work_kind==='DEFECT_DIAGNOSIS_ONLY'?
  'INDEPENDENT_DIAGNOSIS_ACCEPTED':
  'INDEPENDENT_ORIGINAL_JOB_SETTLEMENT_CONFIRMED',
});
const cost=n=>({
 original_work_id:id(n),
 source_class:'INDEPENDENT_PROVIDER_COST_AND_OWNER_REVIEW_READBACK',
 cost_evidence_sha256:n.toString(16).padStart(64,'b'),
 provider_cost_source_ref:'provider-receipt:'+n,
 review_source_ref:'owner-review-timesheet:'+n,
 model_provider_cost_usd:10,infrastructure_cost_usd:2,
 owner_review_minutes:15
});
test('4 accepted repairs: NASA and BLS gross, real cost deductions and net benchmark only',()=>{
 const r=evaluate({shift,workReceipts:[1,2,3,4].map(n=>receipt(n)),
  costReceipts:[1,2,3,4].map(cost)});
 assert.equal(r.recorded_accepted_work_count,4);
 assert.equal(r.defect_repairs_count,4);
 assert.equal(r.comparable_nasa_eligible_work_count,4);
 assert.equal(r.total_illustrative_gross_benchmark_usd,1307.6);
 assert.equal(r.total_benchmark_adjusted_net_usd,1194.22);
 assert.equal(r.incomplete_cost_or_human_comparator_count,0);
 assert.equal(r.actual_cash_savings_usd,null);
 assert.equal(r.measured_human_hours_saved,null);
 assert.equal(r.real_cash_savings_independently_verified,false);
 assert.equal(r.job_rows[0].benchmark_hours,5);
 assert.equal(r.job_rows[0].measured_provider_and_infrastructure_cost_usd,12);
 assert.equal(r.job_rows[0].review_labor_wage_equivalent_usd,16.34);
 assert.equal(r.job_rows[0].net_benchmark_adjusted_value_usd,298.56);
 assert.equal(r.sum_of_medians_not_median_total,true);
});
test('diagnosis-only credits investigation median once; upgrades get no borrowed NASA hours',()=>{
 const r=evaluate({shift,workReceipts:[
  receipt(1,'DEFECT_DIAGNOSIS_ONLY'),
  receipt(2,'CAPABILITY_UPGRADE')],costReceipts:[cost(1),cost(2)]});
 assert.equal(r.diagnosis_only_count,1);
 assert.equal(r.upgrades_count,1);
 assert.equal(r.total_illustrative_gross_benchmark_usd,130.76);
 assert.equal(r.job_rows[0].benchmark_hours,2);
 assert.equal(r.job_rows[1].gross_illustrative_labor_equivalent_usd,null);
 assert.equal(r.job_rows[1].net_value_status,
  'UPGRADE_REQUIRES_DISTINCT_COMPARABLE_HUMAN_BASELINE');
 assert.equal(r.total_benchmark_adjusted_net_usd,null);
});
test('missing provider costs must not silently be zero or claim net value',()=>{
 const r=evaluate({shift,workReceipts:[receipt(1),receipt(2)],
  costReceipts:[cost(1)]});
 assert.equal(r.total_illustrative_gross_benchmark_usd,653.8);
 assert.equal(r.total_benchmark_adjusted_net_usd,null);
 assert.equal(r.incomplete_cost_or_human_comparator_count,1);
 assert.equal(r.priced_subset_net_benchmark_usd,298.56);
});
test('zero accepted repairs has $0 illustrative gross but no cash-savings claim',()=>{
 const r=evaluate({shift});
 assert.equal(r.recorded_accepted_work_count,0);
 assert.equal(r.total_illustrative_gross_benchmark_usd,0);
 assert.equal(r.total_benchmark_adjusted_net_usd,0);
 assert.equal(r.actual_cash_savings_usd,null);
 assert.equal(r.jobs_reexecuted_by_projection,false);
});
test('no duplicate or unverified source job can become a wage-equivalent line',()=>{
 const good=receipt(1);
 for(const bad of [
  {...good,independent_acceptance:false},
  {...good,owner_scope_independently_verified:false},
  {...good,provider_source_independently_verified:false},
  {...good,original_job_completed:false},
  {...good,installation_authorized_by_shift:true},
  {...good,source_url:'https://example.com/claims'},
  {...good,shift_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'},
  {...good,receipt_sha256:'forged'}
 ])assert.throws(()=>evaluate({shift,workReceipts:[bad]}),/FIRST_SHIFT_VALUE_/);
 assert.throws(()=>evaluate({shift,workReceipts:[good,good]}),/FIRST_SHIFT_VALUE_/);
});
test('unknown provider cost and fake owner-review proof fail closed',()=>{
 const good=receipt(1);
 for(const bad of [
  {...cost(1),owner_review_minutes:-1},
  {...cost(1),model_provider_cost_usd:-1},
  {...cost(1),cost_evidence_sha256:'bad'},
  {...cost(1),source_class:'OWNER_ESTIMATED_COST_NOT_VERIFIED'},
  {...cost(1),review_source_ref:'short'},
  {...cost(1),original_work_id:id(999)}
 ])assert.throws(()=>evaluate({shift,workReceipts:[good],
  costReceipts:[bad]}),/FIRST_SHIFT_VALUE_/);
 assert.throws(()=>evaluate({shift,workReceipts:[good],
  costReceipts:[cost(1),cost(1)]}),/FIRST_SHIFT_VALUE_/);
});
test('expired/misidentified shift cannot be a fresh accepted work receipt',()=>{
 for(const bad of [
  {...shift,status:'RUNNING'},
  {...shift,owner_scope_verified:false},
  {...shift,started_at:end,ended_at:start},
  {...shift,ended_at:'2026-11-12T12:00:00Z'},
  {...shift,shift_id:'not-a-uuid'}
 ])assert.throws(()=>evaluate({shift:bad}),/FIRST_SHIFT_VALUE_/);
});
