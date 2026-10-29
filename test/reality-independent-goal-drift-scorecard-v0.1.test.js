import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreIndependentlyLabeledGoalDrift as score}
 from '../src/reality-independent-goal-drift-scorecard-v0.1.js';
test('zero alerts and zero independent grades do not become zero drift',()=>{
 const got=score(Array.from({length:21},(_,i)=>({turn:i+1,
  detector_candidate:false,original_label:'NOT_GRADED',released_label:'NOT_GRADED',
 })));
 assert.equal(got.detected_candidate_turns,0);
 assert.equal(got.independent_original_graded_turns,0);
 assert.equal(got.detector_recall_pct,null);
 assert.equal(got.detector_precision_pct,null);
 assert.equal(got.baseline_true_drift_rate_pct,null);
 assert.equal(got.reality_released_true_drift_rate_pct,null);
 assert.equal(got.measured_reduction_percentage_points,null);
 assert.equal(got.zero_alerts_proves_zero_drift,false);
});
test('an independently graded MISS despite no alert is counted as a false negative',()=>{
 const got=score([{
  turn:1,original_label:'DRIFT',released_label:'DRIFT',
  detector_candidate:false,grader_evidence_ref:'review:turn:1:raw',
  release_grader_evidence_ref:'review:turn:1:released',
 }]);
 assert.equal(got.false_negatives,1);
 assert.equal(got.detector_recall_pct,0);
 assert.equal(got.baseline_true_drift_rate_pct,100);
 assert.equal(got.reality_released_true_drift_rate_pct,100);
 assert.equal(got.measured_reduction_percentage_points,0);
});
test('independent labels penalize false positives and show corrected release only when graded',()=>{
 const got=score([
  {turn:1,original_label:'DRIFT',released_label:'NO_DRIFT',
   detector_candidate:true,grader_evidence_ref:'review:1:raw',
   release_grader_evidence_ref:'review:1:final'},
  {turn:2,original_label:'NO_DRIFT',released_label:'NO_DRIFT',
   detector_candidate:true,grader_evidence_ref:'review:2:raw',
   release_grader_evidence_ref:'review:2:final'},
  {turn:3,original_label:'NO_DRIFT',released_label:'NO_DRIFT',
   detector_candidate:false,grader_evidence_ref:'review:3:raw',
   release_grader_evidence_ref:'review:3:final'},
 ]);
 assert.equal(got.true_positives,1);
 assert.equal(got.false_positives,1);
 assert.equal(got.true_negatives,1);
 assert.equal(got.detector_precision_pct,50);
 assert.equal(got.detector_recall_pct,100);
 assert.equal(got.false_positive_rate_pct,50);
 assert.equal(got.baseline_true_drift_rate_pct,33.33);
 assert.equal(got.reality_released_true_drift_rate_pct,0);
 assert.equal(got.measured_reduction_percentage_points,33.33);
});
test('partially graded runs disclose counts and cannot claim measured improvement',()=>{
 const got=score([
  {turn:1,original_label:'DRIFT',released_label:'NOT_GRADED',
   detector_candidate:false,grader_evidence_ref:'independent:raw:1'},
  {turn:2,original_label:'NOT_GRADED',released_label:'NOT_GRADED',
   detector_candidate:false},
 ]);
 assert.equal(got.false_negatives,1);
 assert.equal(got.fully_independently_graded,false);
 assert.equal(got.measured_reduction_percentage_points,null);
 assert.equal(got.baseline_true_drift_rate_pct,null);
 assert.equal(got.turns_not_fully_graded,2);
});
test('grading cannot be disguised as independent without supporting evidence reference',()=>{
 assert.throws(()=>score([{turn:1,original_label:'NO_DRIFT',
  released_label:'NOT_GRADED',detector_candidate:false}]),
 /GRADE_EVIDENCE_REQUIRED/);
 assert.throws(()=>score([{turn:1,original_label:'NO_DRIFT',
  released_label:'NO_DRIFT',detector_candidate:false,
  grader_evidence_ref:'review:1'}]),
 /RELEASE_EVIDENCE_REQUIRED/);
});
