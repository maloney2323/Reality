import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreIndependentReliability,scorePaidBusinessSupervision} from '../src/reality-business-proof-scoring-v0.1.js';
const judgement=(id,truth,flags,more={})=>({
 id,reviewer_id:'independent-reviewer-01',detector_id:'reality-detector',
 source_evidence_ref:'independent-business-evidence:'+id,
 model_output_receipt_id:'model-receipt:'+id,
 verified_at:'2026-10-24T19:00:00Z',
 evidence_class:'FROZEN_BENCHMARK_ORACLE',
 customer_world:false,
 true_drift:truth.drift,false_factual_assertion:truth.hallucination,
 detector_drift_flag:flags.drift,detector_hallucination_flag:flags.hallucination,
 ...more,
});
test('cannot claim a zero error rate or healthy benchmark from unreviewed cases',()=>{
 const x=scoreIndependentReliability({observations:[
 {id:'t1',model_output_receipt_id:'m1',detector_drift_flag:false,detector_hallucination_flag:false},
 ],expectedTurns:100});
 assert.equal(x.separate_percentages.drift.error_rate_pct,null);
 assert.equal(x.separate_percentages.hallucinations.error_rate_pct,null);
 assert.equal(x.customer_hallucination_rate_pct,null);
 assert.equal(x.full_coverage,false);
 assert.equal(x.missing_or_unadjudicated_turns,100);
 assert.deepEqual(x.unreviewed_case_ids,['t1']);
});
test('separates drift from hallucinations, measures false positives, allows one incident both categories',()=>{
 const observations=[
 judgement('one',{drift:true,hallucination:false},{drift:true,hallucination:false},{
   recovery_outcome_receipt_id:'independent-work-state:one',independent_recovery_verified:true,
 }),
 judgement('two',{drift:false,hallucination:true},{drift:false,hallucination:false}),
 judgement('three',{drift:true,hallucination:true},{drift:true,hallucination:true}),
 judgement('four',{drift:false,hallucination:false},{drift:true,hallucination:false}),
 ];
 const x=scoreIndependentReliability({observations,expectedTurns:4});
 assert.equal(x.separate_percentages.drift.error_rate_pct,50);
 assert.equal(x.separate_percentages.hallucinations.error_rate_pct,50);
 assert.equal(x.separate_percentages.drift.detector_recall_pct,100);
 assert.equal(x.separate_percentages.hallucinations.detector_recall_pct,50);
 assert.equal(x.separate_percentages.drift.false_positive_rate_pct,50);
 assert.equal(x.independently_verified_recovery_rate_pct,33.33);
 assert.equal(x.customer_hallucination_rate_pct,null);
 assert.equal(x.full_coverage,true);
});
test('claim adjudication requires disjoint evaluator, source, and output receipt',()=>{
 const x=scoreIndependentReliability({observations:[
 judgement('self',{drift:false,hallucination:false},{drift:false,hallucination:false},
  {reviewer_id:'reality-detector'}),
 judgement('no-source',{drift:false,hallucination:false},{drift:false,hallucination:false},
  {source_evidence_ref:'model-receipt:no-source'}),
 ],expectedTurns:2});
 assert.equal(x.independently_adjudicated_cases,0);
 assert.equal(x.full_coverage,false);
 assert.equal(x.unreviewed_case_ids.length,2);
});
test('fixture data cannot pretend to be paid customer ground truth',()=>{
 assert.throws(()=>scoreIndependentReliability({observations:[
  judgement('fake',{drift:false,hallucination:false},{drift:false,hallucination:false},
   {customer_world:true}),
 ]}),/FIXTURE_CANNOT_PROVE_CUSTOMER_WORLD/);
});
const business={
 business_id:'business-authorized-01',
 verified_payment_receipt_id:'external-payment-verified:01',
 work_authorization_ref:'business-consent:01',
 verified_hourly_labor_rate_usd:30,
};
const paired=(task_id,baseline,governed)=>({
 task_id,external_reviewer_id:'business-supervisor',
 baseline_receipt_id:task_id+':manual',governed_receipt_id:task_id+':reality',
 baseline_work_description:'Matched estimate request',governed_work_description:'Matched estimate request',
 baseline_review_minutes:baseline,governed_review_minutes:governed,
 baseline_rework_minutes:0,governed_rework_minutes:0,
 baseline_outcome_verified:true,governed_outcome_verified:true,
 baseline_run_cost_usd:0,governed_run_cost_usd:0.20,
});
test('real observed paired work counts all human review and subtracts provider costs',()=>{
 const x=scorePaidBusinessSupervision({business,matchedTasks:[
 paired('A',15,5),paired('B',12,8),
 ],additionalCostsUsd:0.50});
 assert.equal(x.paid_business_verified,true);
 assert.equal(x.net_supervision_minutes_saved,14);
 assert.equal(x.net_supervision_reduction_pct,51.85);
 assert.equal(x.measured_operating_cost_difference_usd,0.90);
 assert.equal(x.verified_net_labor_value_usd,6.10);
 assert.equal(x.pilot_status,'MEASURED_PAIRED_WORK');
});
test('payment intent is not payment: return no claimed savings',()=>{
 const x=scorePaidBusinessSupervision({
 business:{business_id:'not-paid',verified_hourly_labor_rate_usd:35},
 matchedTasks:[paired('only',20,5)],
 });
 assert.equal(x.paid_business_verified,false);
 assert.equal(x.net_supervision_minutes_saved,null);
 assert.equal(x.verified_net_labor_value_usd,null);
 assert.equal(x.pilot_status,'NOT_YET_PROVEN');
});
test('measured Reality supervision may be negative savings, never clamped to a positive ROI',()=>{
 const x=scorePaidBusinessSupervision({
 business,matchedTasks:[paired('worse',3,12)],
 });
 assert.equal(x.net_supervision_minutes_saved,-9);
 assert.equal(x.net_supervision_reduction_pct,-300);
 assert.equal(x.verified_net_labor_value_usd,-4.7);
});
