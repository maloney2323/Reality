import test from 'node:test';
import assert from 'node:assert/strict';
import {projectDiscoveryEconomicContext} from '../src/reality-discovery-value-v1.js';
const receipt={
 status:'INDEPENDENTLY_VERIFIED_AND_DURABLY_RELEASED',
 durable_release_readback_verified:true,record_is_immutable:true,
 installation_authorized:false,installed:false,source_issue:188,
 verification_checks_passed:21,
 receipt_id:'candidate-receipt:'+'a'.repeat(32),
 source_sha256:'b'.repeat(64),
};
const economic={
 receipt_id:receipt.receipt_id,
 status:'RELEASED_VERIFIED_PROVIDER_EVIDENCE',
 durable_readback_verified:true,
 source_sha256:receipt.source_sha256,verified_checks_passed:21,
 source_of_usage:'IMMUTABLE_INDEPENDENT_VERIFIER_REPORT',
 observed_model_input_tokens:2651,observed_model_output_tokens:3592,
 observed_model_attempts:1,observed_independent_verification_ms:15793,
 observed_model_cost_usd:null,
 installation_authorized:false,installed:false,
};
test('source-backed discovery value is benchmarked only as hypothetical labor equivalent',()=>{
 const r=projectDiscoveryEconomicContext({candidateReceipt:receipt,ownerEconomicReadback:economic});
 assert.deepEqual(r.labor_equivalent_scenarios.map(x=>x.assumed_human_diagnostic_hours),[1,2,4]);
 assert.deepEqual(r.labor_equivalent_scenarios.map(x=>x.developer_median_wage_labor_equivalent_usd),[65.38,130.76,261.52]);
 assert.deepEqual(r.labor_equivalent_scenarios.map(x=>x.qa_median_wage_labor_equivalent_usd),[50.14,100.28,200.56]);
 assert.equal(r.public_wage_context.source,'https://www.bls.gov/news.release/ocwage.t01.htm');
 assert.equal(r.observed.model_input_tokens,2651);
 assert.equal(r.observed.model_output_tokens,3592);
 assert.equal(r.observed.independent_checks_passed,21);
 assert.equal(r.measured_comparable_human_diagnostic_hours,null);
 assert.equal(r.verified_discovery_cash_savings_usd,null);
 assert.equal(r.verified_provider_and_infrastructure_cost_usd,null);
 assert.equal(r.realized_net_roi_usd,null);
 assert.equal(r.realized_roi_percent,null);
 assert.equal(r.paid_customer_value_usd,null);
 assert.equal(r.avoided_incident_loss_usd,null);
 assert.equal(r.installation_authorized,false);
});
test('duplicate, forged, unverified cost or owner scope cannot be counted as value',()=>{
 const cases=[
  [{...receipt,installation_authorized:true},economic],
  [{...receipt,status:'VERIFIED_CANDIDATE_SOURCE_OBSERVED'},economic],
  [{...receipt,receipt_id:'candidate-receipt:'+'c'.repeat(32)},economic],
  [receipt,{...economic,observed_model_cost_usd:0}],
  [receipt,{...economic,observed_model_input_tokens:-1}],
  [receipt,{...economic,observed_model_attempts:0}],
  [receipt,{...economic,source_of_usage:'OWNER_REPORTED_UNVERIFIED'}],
  [receipt,{...economic,source_sha256:'f'.repeat(64)}],
  [receipt,{...economic,installation_authorized:true}],
  [receipt,{...economic,observed_model_output_tokens:Infinity}],
 ];
 for(const [candidateReceipt,ownerEconomicReadback] of cases)
  assert.throws(()=>projectDiscoveryEconomicContext({candidateReceipt,ownerEconomicReadback}),/REALITY_DISCOVERY_VALUE_/);
});
