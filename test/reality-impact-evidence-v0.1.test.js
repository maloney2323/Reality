import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeRealityImpact} from '../src/reality-impact-evidence-v0.1.js';
const tenant='construction:owner';
test('unmeasured drift/ROI remain unknown, not 0% or $0 savings',()=>{
 const x=summarizeRealityImpact({authenticatedTenantId:tenant});
 assert.equal(x.model_drift,null);
 assert.equal(x.verified_roi,null);
 assert.equal(x.verified_corrections,0);
 assert.equal(x.authorized_production_upgrades,0);
});
test('detector flags alone do not become confirmed drift or successful fixes',()=>{
 const x=summarizeRealityImpact({authenticatedTenantId:tenant,
  evaluations:[{tenant_id:tenant,turn_id:'turn:1',drift_confirmed:true}],
  corrections:[{tenant_id:tenant,status:'DETECTED',original_model_output_ref:'output:x'}],
  upgrades:[{tenant_id:tenant,status:'SANDBOX_VERIFIED'}],
  benefits:[{tenant_id:tenant,status:'ESTIMATED_AVOIDED_LOSS',verified_value_usd:100000}],
 });
 assert.equal(x.model_drift,null);
 assert.equal(x.verified_corrections,0);
 assert.equal(x.authorized_production_upgrades,0);
 assert.equal(x.verified_roi,null);
});
test('only independently graded turns, verified corrections and authorized promotions count',()=>{
 const x=summarizeRealityImpact({authenticatedTenantId:tenant,
  evaluations:[{tenant_id:tenant,turn_id:'1',drift_confirmed:true,independent_grade_receipt_id:'grade:1'},
   {tenant_id:tenant,turn_id:'2',drift_confirmed:false,independent_grade_receipt_id:'grade:2'},
   {tenant_id:tenant,turn_id:'3'}],
  corrections:[{tenant_id:tenant,status:'CORRECTION_VERIFIED',original_model_output_ref:'old',
   corrected_outcome_ref:'new',independent_verification_receipt_id:'verify:2'}],
  upgrades:[{tenant_id:tenant,status:'PROMOTED',promotion_authorization_receipt_id:'auth',
   independent_regression_receipt_id:'regress',release_receipt_id:'deploy'}],
  benefits:[{tenant_id:tenant,status:'VERIFIED_REALIZED_BENEFIT',baseline_receipt_id:'base',
   customer_confirmation_receipt_id:'customer',measured_outcome_receipt_id:'measured',
   verified_value_usd:100,attributable_cost_usd:25}],
 });
 assert.equal(x.model_drift.numerator,1);
 assert.equal(x.model_drift.denominator,2);
 assert.equal(x.model_drift.percentage,50);
 assert.equal(x.ungraded_turns,1);
 assert.equal(x.verified_corrections,1);
 assert.equal(x.authorized_production_upgrades,1);
 assert.equal(x.verified_roi.verified_net_benefit_usd,75);
});
test('cross-customer data cannot enter the read-only impact projection',()=>{
 assert.throws(()=>summarizeRealityImpact({
  authenticatedTenantId:tenant,
  evaluations:[{tenant_id:'different:customer',turn_id:'x',drift_confirmed:true}],
 }),/IMPACT_CROSS_TENANT_RECORD/);
});

test('Reality earns credit for independently proven model errors correctly caught even without correction',()=>{
 const r=summarizeRealityImpact({authenticatedTenantId:tenant,
  detections:[{tenant_id:tenant,status:'ERROR_INDEPENDENTLY_CONFIRMED',
   detection_id:'detect:invoice:17',
   original_model_output_ref:'model:original:incorrect-estimate',
   model_id:'model:version-A',turn_id:'construction:turn:14',
   detection_receipt_id:'reality:detector:14',
   independent_error_grade_receipt_id:'grade:14',
  }],
 });
 assert.equal(r.verified_underlying_model_errors_caught,1);
 assert.equal(r.verified_errors_contained_before_action,0);
 assert.equal(r.verified_corrections,0);
 assert.equal(r.verified_roi,null);
});
test('separate a confirmed catch from an independently verified pre-action containment',()=>{
 const r=summarizeRealityImpact({authenticatedTenantId:tenant,
  detections:[{tenant_id:tenant,status:'ERROR_INDEPENDENTLY_CONFIRMED',
   detection_id:'detect:estimate:18',
   original_model_output_ref:'model:err',model_id:'underlying:gpt',
   turn_id:'turn:18',detection_receipt_id:'reality:18',
   independent_error_grade_receipt_id:'grader:18',
   containment_status:'VERIFIED_BEFORE_EXTERNAL_ACTION',
   independent_containment_receipt_id:'verifier:blocked-send',
   action_scope_ref:'estimate:send-to-customer',
  }],
 });
 assert.equal(r.verified_underlying_model_errors_caught,1);
 assert.equal(r.verified_errors_contained_before_action,1);
 assert.equal(r.verified_corrections,0);
 assert.equal(r.verified_roi,null);
});
test('raw alerts, incomplete verdicts and duplicate detections do not inflate ROI',()=>{
 const base={tenant_id:tenant,status:'ERROR_INDEPENDENTLY_CONFIRMED',
  detection_id:'same',original_model_output_ref:'model:err',model_id:'provider:A',
  turn_id:'turn:1',detection_receipt_id:'det:1',
  independent_error_grade_receipt_id:'grade:1'};
 const r=summarizeRealityImpact({authenticatedTenantId:tenant,
  detections:[base,{...base},{...base,detection_id:'incomplete',independent_error_grade_receipt_id:null},
   {tenant_id:tenant,detection_id:'suspicious',status:'DETECTED'}],
 });
 assert.equal(r.verified_underlying_model_errors_caught,1);
 assert.equal(r.unverified_detection_candidates_excluded,3);
 assert.equal(r.verified_roi,null);
});


test('ambiguous duplicate turn grades are excluded, not used to dilute drift',()=>{
 const evaluated=[{tenant_id:tenant,turn_id:'t1',drift_confirmed:true,independent_grade_receipt_id:'g1'},
  {tenant_id:tenant,turn_id:'t1',drift_confirmed:false,independent_grade_receipt_id:'g2'},
  {tenant_id:tenant,turn_id:'t2',drift_confirmed:true,independent_grade_receipt_id:'g3'}];
 const r=summarizeRealityImpact({authenticatedTenantId:tenant,evaluations:evaluated});
 assert.equal(r.model_drift.numerator,1);
 assert.equal(r.model_drift.denominator,1);
 assert.equal(r.duplicate_or_ambiguous_grade_records_excluded,2);
});
test('double billed realized benefit receipt, correction and released upgrade cannot inflate the projection',()=>{
 const benefit={tenant_id:tenant,status:'VERIFIED_REALIZED_BENEFIT',
   baseline_receipt_id:'baseline',customer_confirmation_receipt_id:'customer',
   measured_outcome_receipt_id:'outcome:one',verified_value_usd:100,attributable_cost_usd:25};
 const correction={tenant_id:tenant,status:'CORRECTION_VERIFIED',
   original_model_output_ref:'bad',corrected_outcome_ref:'correct',
   independent_verification_receipt_id:'correction:once'};
 const upgrade={tenant_id:tenant,status:'PROMOTED',
   promotion_authorization_receipt_id:'approval',
   independent_regression_receipt_id:'regression',release_receipt_id:'release:one'};
 const r=summarizeRealityImpact({authenticatedTenantId:tenant,
   benefits:[benefit,{...benefit,verified_value_usd:9000}],
   corrections:[correction,{...correction,corrected_outcome_ref:'other'}],
   upgrades:[upgrade,{...upgrade}]});
 assert.equal(r.verified_roi.measured_cases,1);
 assert.equal(r.verified_roi.verified_net_benefit_usd,75);
 assert.equal(r.verified_roi.verified_total_cost_usd,25);
 assert.equal(r.verified_roi.verified_roi_percentage,300);
 assert.equal(r.verified_corrections,1);
 assert.equal(r.authorized_production_upgrades,1);
 assert.equal(r.benefits_excluded,1);
});
test('zero cost does not yield an infinite ROI percentage',()=>{
 const b={tenant_id:tenant,status:'VERIFIED_REALIZED_BENEFIT',
  baseline_receipt_id:'baseline',customer_confirmation_receipt_id:'customer',
  measured_outcome_receipt_id:'outcome',verified_value_usd:100,attributable_cost_usd:0};
 const r=summarizeRealityImpact({authenticatedTenantId:tenant,benefits:[b]});
 assert.equal(r.verified_roi.verified_roi_percentage,null);
});
