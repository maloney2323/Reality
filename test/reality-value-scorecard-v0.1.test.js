import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizePairedRealityValue} from '../src/reality-value-scorecard-v0.1.js';
const tenant='owner:construction';
const base=(case_id,lane,options={})=>({tenant_id:tenant,
 case_id,lane,status:'INDEPENDENTLY_GRADED',independently_verified:true,
 model_id:'model:fixed-v',case_digest:'case:fixed:'+case_id,
 grading_contract_hash:'contract:fixed',independent_grade_receipt_id:'grade:'+case_id+':'+lane,
 completed:true,drift_escaped:false,total_cost_usd:2,human_review_minutes:3,...options});
test('no data is unmeasured, not 0% drift or fictional ROI',()=>{
 const r=summarizePairedRealityValue({authenticatedTenantId:tenant});
 assert.equal(r.measurement_status,'NOT_MEASURED');
 assert.equal(r.reality_increment,null);
 assert.equal(r.lanes.model_only.completion_pct,null);
 assert.equal(r.lanes.model_plus_reality.drift_escape_pct,null);
 assert.equal(r.customer_roi_usd,null);
});
test('paired outcomes and detector metrics use independently graded identical cases',()=>{
 const rows=[
 base('a','MODEL_ONLY',{completed:false,drift_escaped:true,total_cost_usd:4,human_review_minutes:7}),
 base('a','MODEL_PLUS_REALITY',{completed:true,drift_escaped:false,total_cost_usd:3,human_review_minutes:2,
  independent_error_present:true,detector_flagged:true}),
 base('b','MODEL_ONLY',{completed:true,drift_escaped:false,total_cost_usd:5,human_review_minutes:5}),
 base('b','MODEL_PLUS_REALITY',{completed:true,drift_escaped:false,total_cost_usd:4,human_review_minutes:1,
  independent_error_present:false,detector_flagged:false}),
 base('b','MODEL_PLUS_CLEANER',{completed:false,drift_escaped:true}),
 ];
 const r=summarizePairedRealityValue({authenticatedTenantId:tenant,records:rows});
 assert.equal(r.matched_cases,2);
 assert.equal(r.lanes.model_only.completion_pct,50);
 assert.equal(r.lanes.model_plus_reality.completion_pct,100);
 assert.equal(r.reality_increment.completion_percentage_points,50);
 assert.equal(r.reality_increment.drift_escape_percentage_points,-50);
 assert.equal(r.reality_increment.human_review_minutes_difference,9);
 assert.equal(r.lanes.model_plus_reality.detection.recall_pct,100);
 assert.equal(r.lanes.model_plus_reality.detection.precision_pct,100);
 assert.equal(r.lanes.model_plus_cleaner.graded_cases,1);
 assert.equal(r.customer_roi_usd,null);
 assert.equal(r.source_admission_required,true);
});
test('cross-tenant records fail closed',()=>{
 assert.throws(()=>summarizePairedRealityValue({authenticatedTenantId:tenant,
  records:[{...base('a','MODEL_ONLY'),tenant_id:'other'}]}),/CROSS_TENANT_RECORD/);
});
test('self-graded, incomplete, malformed and unpaired records cannot produce claimed lift',()=>{
 const records=[{...base('a','MODEL_ONLY'),independently_verified:false},
  base('a','MODEL_PLUS_REALITY'),{...base('b','MODEL_ONLY'),status:'MODEL_ASSERTED'},
  base('b','MODEL_PLUS_REALITY')];
 const r=summarizePairedRealityValue({authenticatedTenantId:tenant,records});
 assert.equal(r.measurement_status,'NOT_MEASURED');
 assert.equal(r.ungraded_or_ineligible_records,2);
 assert.equal(r.excluded_cases.length,2);
});
test('duplicates and mismatched model/prompt test contracts do not inflate comparisons',()=>{
 const records=[
  base('a','MODEL_ONLY'),base('a','MODEL_PLUS_REALITY'),
  base('a','MODEL_PLUS_REALITY',{independent_grade_receipt_id:'grade:alternate'}),
  base('b','MODEL_ONLY'),
  base('b','MODEL_PLUS_REALITY',{model_id:'different-model'}),
  base('c','MODEL_ONLY'),
  base('c','MODEL_PLUS_REALITY',{case_digest:'another-case'}),
  base('d','MODEL_ONLY'),
  base('d','MODEL_PLUS_REALITY',{grading_contract_hash:'another-contract'}),
 ];
 const r=summarizePairedRealityValue({authenticatedTenantId:tenant,records});
 assert.equal(r.matched_cases,0);
 assert.equal(r.excluded_cases.length,4);
 assert.equal(r.lanes.model_plus_reality.cost_per_verified_completion_usd,null);
});
test('graded detector failures expose both false positives and false negatives',()=>{
 const rows=[
 base('a','MODEL_ONLY'),base('a','MODEL_PLUS_REALITY',
  {independent_error_present:true,detector_flagged:false}),
 base('b','MODEL_ONLY'),base('b','MODEL_PLUS_REALITY',
  {independent_error_present:false,detector_flagged:true}),
 ];
 const r=summarizePairedRealityValue({authenticatedTenantId:tenant,records:rows});
 assert.equal(r.lanes.model_plus_reality.detection.false_negatives,1);
 assert.equal(r.lanes.model_plus_reality.detection.false_positives,1);
 assert.equal(r.lanes.model_plus_reality.detection.precision_pct,0);
 assert.equal(r.lanes.model_plus_reality.detection.recall_pct,0);
});
