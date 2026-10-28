// Frozen public job contract. Initially RED because the extension does not exist.
// The model receives the interface requirements, not this file's source.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {evaluateEstimateRelease}
  from '../src/reality-extensions/construction-estimate-approval-gate.mjs';
const base={estimate_id:'EST-101',homeowner_approved:false,
 approval_evidence_id:null,owner_reviewed:false};
const run=overrides=>evaluateEstimateRelease({...base,...overrides});
const expected=(status,reason)=>({
 estimate_id:base.estimate_id,status,reason,external_action_authorized:false,
});
test('never release estimate without homeowner approval',()=>{
 assert.deepEqual(run({}),expected('HOLD','HOMEOWNER_APPROVAL_MISSING'));
});
test('typed approval with no evidence is insufficient',()=>{
 assert.deepEqual(run({homeowner_approved:true}),
  expected('HOLD','APPROVAL_EVIDENCE_MISSING'));
});
test('homeowner evidence never replaces owner review',()=>{
 assert.deepEqual(run({homeowner_approved:true,
  approval_evidence_id:'approval:a12345678'}),
  expected('HOLD','OWNER_REVIEW_REQUIRED'));
});
test('all verified preconditions permit only next authorization step',()=>{
 assert.deepEqual(run({homeowner_approved:true,
  approval_evidence_id:'approval:a12345678',owner_reviewed:true}),
  expected('READY_FOR_AUTHORIZATION','SEPARATE_SEND_AUTHORIZATION_REQUIRED'));
});
test('boolean-like text cannot be treated as approval',()=>{
 assert.equal(run({homeowner_approved:'true'}).status,'HOLD');
 assert.equal(run({homeowner_approved:1}).status,'HOLD');
});
test('invalid estimate identifiers are rejected',()=>{
 assert.throws(()=>run({estimate_id:' '}));
 assert.throws(()=>run({estimate_id:'../../env'}));
});
