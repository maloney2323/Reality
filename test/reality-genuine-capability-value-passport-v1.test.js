import test from 'node:test';
import assert from 'node:assert/strict';
import {createCapabilityValuePassport as passport,BUSINESS_CATEGORIES,VALUE_DIMENSIONS}
 from '../src/reality-genuine-capability-value-passport-v1.js';
const originalWorkId='work:'+'a'.repeat(32);
const originalWorkEventId='44444444-4444-4444-8444-444444444444';
const capabilityId='inventory_reconciler';
const providerFailureRef='reality:provider-verified:inventory:external-observation-0001';
const base={originalWorkId,originalWorkEventId,capabilityId,providerFailureRef};
test('a real gap gets a source-bound passport even without business projections',()=>{
 const p=passport(base);
 assert.equal(p.original_work_id,originalWorkId);
 assert.equal(p.original_work_event_id,originalWorkEventId);
 assert.equal(p.technical_gap_source_ref,providerFailureRef);
 assert.equal(p.business_category,'UNCLASSIFIED');
 assert.equal(p.expected_business_outcome,null);
 assert.equal(p.estimated_annual_net_value_usd,null);
 assert.equal(p.competitive_advantage_status,'UNMEASURED');
 assert.equal(p.value_dimensions_status,'PENDING_BUSINESS_EVIDENCE');
 assert.equal(p.qualification_status,'BUSINESS_VALUE_ASSESSMENT_PENDING');
 assert.equal(p.tenant_scope,'ORIGINAL_JOB_ONLY');
 assert.equal(p.generation_authorized,false);
 assert.equal(p.installation_authorized,false);
 assert.equal(p.reuse_authorized,false);
});
test('only verified original-work metadata nominates categories, not verified ROI',()=>{
 const p=passport({...base,originalBusinessEvidence:{
  work_kind:'SYSTEM_MAINTENANCE',business_category:'DATA_INTEGRATIONS',
  expected_business_outcome:'Reduce time spent reconciling inventory',
  value_dimensions:['LABOR_RETURNED','RELIABILITY','LABOR_RETURNED','INVALID'],
  measured_net_value_usd:9000000,estimated_annual_net_value_usd:1000000,
  competitive_advantage_status:'GUARANTEED',tenant_scope:'EVERYONE',
  reuse_authorized:true,generation_authorized:true,installation_authorized:true,
 }});
 assert.equal(p.business_category,'DATA_INTEGRATIONS');
 assert.deepEqual(p.value_dimensions,['LABOR_RETURNED','RELIABILITY']);
 assert.equal(p.expected_business_outcome,'Reduce time spent reconciling inventory');
 assert.equal(p.expected_outcome_evidence_status,'OWNER_SOURCE_LINKED_CLAIM_NOT_OUTCOME_VERIFIED');
 assert.equal(p.measured_net_value_usd,null);
 assert.equal(p.estimated_annual_net_value_usd,null);
 assert.equal(p.reuse_authorized,false);
 assert.equal(p.generation_authorized,false);
 assert.equal(p.installation_authorized,false);
});
test('unknown or forged categories fail to default to optimistic value',()=>{
 const p=passport({...base,originalBusinessEvidence:{
  business_category:'MASSIVE_REVENUE',work_kind:'UNTRUSTED',
  expected_business_outcome:'   ',
  value_dimensions:['COMPETITIVE_ADVANTAGE','NON_EXISTENT'],
 }});
 assert.equal(p.business_category,'UNCLASSIFIED');
 assert.equal(p.expected_business_outcome,null);
 assert.equal(p.competitive_benchmark,null);
 assert.equal(p.competitive_advantage_status,'UNMEASURED');
 assert.deepEqual(p.value_dimensions,['COMPETITIVE_ADVANTAGE']);
});
test('existing discovery kind can categorize without inventing business outcome',()=>{
 const p=passport({...base,originalBusinessEvidence:{work_kind:'SYSTEM_MAINTENANCE'}});
 assert.equal(p.business_category,'UPGRADES_IMPROVEMENTS');
 assert.equal(p.expected_business_outcome,null);
 assert.equal(BUSINESS_CATEGORIES.includes(p.business_category),true);
 assert.equal(VALUE_DIMENSIONS.includes('RELIABILITY'),true);
});
test('cross-job or unsupported provider references are rejected',()=>{
 for(const patch of [
  {originalWorkId:'made-up-job'},
  {originalWorkEventId:'not-an-event'},
  {capabilityId:'not a code'},
  {providerFailureRef:'https://example.org/forged-proof'},
 ]){
  assert.throws(()=>passport({...base,...patch}),/GENUINE_CAPABILITY_VALUE_ORIGINAL_VERIFIED_GAP_REQUIRED/);
 }
});
