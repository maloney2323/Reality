import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectCapabilityGap, confirmCapabilityGap, reactivationPlan,
} from '../src/reality-autonomous-capability-loop-v0.1.js';

const original = Object.freeze({
  id:'work:customer-91',
  continuity_root_id:'continuity:customer-91',
  worldline_id:'worldline:customer-91',
  capability_contract:{output:'provider-verified-success'}
});
const detected=detectCapabilityGap({
  consequence:{gap:'MISSING_CAPABILITY',subject:'missing-provider-reader'},
  workItem:original,capabilities:[],
});
const confirmed=confirmCapabilityGap(detected,{
  historicalFailureRefs:['failed-run-receipt-91'],
  verificationSuiteRef:'frozen-suite-91',
});
const registration={
  state:'REGISTERED',
  capability_id:'missing-provider-reader',
  verification_hash:'verified-sandbox-91',
  capability_signature:'capability-signature-91',
};
const reactivation=()=>reactivationPlan(confirmed,{
  registration,originalWorkItem:original
});

test('exact capability and original obligation produce non-authorizing reactivation plan',()=>{
  const plan=reactivation();
  assert.equal(plan.state,'REACTIVATED');
  assert.equal(plan.capability_id,confirmed.capability_id);
  assert.equal(plan.original_work_item_id,original.id);
  assert.equal(plan.continuity_root_id,original.continuity_root_id);
  assert.equal(plan.worldline_id,original.worldline_id);
  assert.equal(plan.execution_authorized,false);
  assert.equal(plan.customer_task_completed,false);
  assert.equal(plan.requires_fresh_action_authorization,true);
  assert.equal(plan.requires_independent_outcome_readback,true);
  assert.match(plan.continuation_token,/^[a-f0-9]{64}$/);
});
test('different original task cannot piggyback on upgrade',()=>{
  assert.throws(()=>reactivationPlan(confirmed,{
    registration,originalWorkItem:{...original,id:'work:other-customer'}
  }),/ORIGINAL_WORK_ITEM_IDENTITY_MISMATCH/);
});
test('registration for another capability cannot reactivate original task',()=>{
  assert.throws(()=>reactivationPlan(confirmed,{
    registration:{...registration,capability_id:'unrelated-upgrade'},
    originalWorkItem:original
  }),/UPGRADE_CAPABILITY_MISMATCH/);
});
test('missing original task identity fails closed',()=>{
  assert.throws(()=>reactivationPlan({...confirmed,work_item_id:''},{
    registration,originalWorkItem:original
  }),/ORIGINAL_WORK_ITEM_IDENTITY_MISMATCH/);
});
test('different continuity or worldline fails closed',()=>{
  assert.throws(()=>reactivationPlan(confirmed,{
    registration,originalWorkItem:{...original,continuity_root_id:'continuity:other'}
  }),/CONTINUITY_ROOT_IDENTITY_MISMATCH/);
  assert.throws(()=>reactivationPlan(confirmed,{
    registration,originalWorkItem:{...original,worldline_id:'worldline:other'}
  }),/WORLDLINE_IDENTITY_MISMATCH/);
});
test('unverified or unsigned registration cannot reactivate work',()=>{
  for(const patch of [{verification_hash:''},{capability_signature:''}]){
    assert.throws(()=>reactivationPlan(confirmed,{
      registration:{...registration,...patch},originalWorkItem:original
    }),/REGISTERED_CAPABILITY_PROOF_REQUIRED/);
  }
  assert.throws(()=>reactivationPlan(confirmed,{
    registration:{...registration,state:'SANDBOX_VERIFIED'},originalWorkItem:original
  }),/CAPABILITY_REGISTRATION_REQUIRED/);
});
test('different exact registration proof changes continuation token',()=>{
  const first=reactivation();
  const second=reactivationPlan(confirmed,{
    originalWorkItem:original,
    registration:{...registration,verification_hash:'verified-sandbox-92'}
  });
  assert.notEqual(first.continuation_token,second.continuation_token);
});
