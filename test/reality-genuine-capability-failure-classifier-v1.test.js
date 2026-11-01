import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyGenuineExecutionFailure as classify}
 from '../src/reality-genuine-capability-failure-classifier-v1.js';
const WORK='work:'+'a'.repeat(32),CAP='reality_completion_receipt';
const failure={
 verified:false,independent:true,independently_verified:true,
 original_work_id:WORK,evidence_kind:'OBSERVED_FAILURE',
 blocker_class:'MISSING_INSTRUMENT',capability_id:CAP,
 source_ref:'https://github.com/maloney2323/Reality/actions/runs/41356221440',
 verification_suite_ref:'test/reality-frozen-regressions/reality-general-execution-receipt-v1.test.js',
 external_action_performed:false,provider_effect_may_have_occurred:false,
 no_automatic_retry:false,
};
const unresolved=(f=failure)=>({status:'UNRESOLVED',verification:f});
const args=(f=failure)=>({result:unresolved(f),originalWorkId:WORK});
const absent={original_work_id:WORK,capability_id:CAP,
 independently_verified:true,status:'ABSENT'};
const active={...absent,status:'ACTIVE'};
const frozen={independently_verified:true,reproduced_failure:true,
 original_work_id:WORK,capability_id:CAP,
 frozen_suite_sha256:'a'.repeat(64),
 external_action_performed:false,provider_effect_may_have_occurred:false};
test('verified successful work never enters the capability builder',()=>{
 const x=classify({originalWorkId:WORK,result:{status:'VERIFIED'}});
 assert.equal(x.classification,'NO_FAILURE');
 assert.equal(x.model_generation_authorized,false);
});
test('missing authority is not mistaken for missing capability',()=>{
 const a=classify({originalWorkId:WORK,result:{
  status:'BLOCKED',blocked_reason:'EXECUTION_FRESH_GOAL_ADMISSION_REQUIRED',
 }});
 assert.equal(a.classification,'AUTH_SCOPE_DEFICIT');
 assert.equal(a.recommended_action,'REQUEST_EXACT_AUTHORITY_OR_RECONCILE');
 assert.equal(classify({originalWorkId:WORK,result:{
  status:'BLOCKED',blocked_reason:'UNEXPLAINED_GATE',
 }}).classification,'UNRESOLVED_EVIDENCE');
});
test('independent missing instrument is only a candidate before registry and frozen proof',()=>{
 const x=classify(args());
 assert.equal(x.classification,'CAPABILITY_VOID_CANDIDATE');
 assert.equal(x.recommended_action,'VERIFY_REGISTRY_AND_FROZEN_FAILURE');
 assert.equal(x.model_generation_authorized,false);
 assert.equal(x.installation_authorized,false);
});
test('true capability void needs independent absence AND frozen failure reproduction',()=>{
 for(const options of [
  {registryReadback:absent},
  {frozenReproduction:frozen},
  {registryReadback:active,frozenReproduction:frozen},
  {registryReadback:{...absent,original_work_id:'work:'+'b'.repeat(32)},frozenReproduction:frozen},
  {registryReadback:absent,frozenReproduction:{...frozen,independently_verified:false}},
 ]){
  const v=classify({...args(),...options});
  assert.notEqual(v.classification,'TRUE_CAPABILITY_VOID');
 }
 const v=classify({...args(),registryReadback:absent,frozenReproduction:frozen});
 assert.equal(v.classification,'TRUE_CAPABILITY_VOID');
 assert.equal(v.recommended_action,'DISPATCH_TO_GOVERNED_BUILDER');
 assert.equal(v.model_generation_authorized,false,
  'classification alone never grants model execution');
});
test('registered broken capability routes to repair, not new capability creation',()=>{
 const f={...failure,blocker_class:'IMPLEMENTATION_DEFECT'};
 assert.equal(classify({...args(f),registryReadback:active}).classification,
  'IMPLEMENTATION_DEFECT');
 assert.equal(classify(args(f)).classification,'UNRESOLVED_EVIDENCE');
});
test('configured but disconnected integration routes to connector restoration',()=>{
 const f={...failure,blocker_class:'EXTERNAL_INTEGRATION_GAP',
  capability_id:'github'};
 const x=classify({...args(f),integrationReadback:{
  independently_verified:true,original_work_id:WORK,connector_id:'github',
  connector_defined:true,connection_available:false,
 }});
 assert.equal(x.classification,'EXTERNAL_INTEGRATION_GAP');
 assert.equal(x.recommended_action,'RESTORE_OR_CONNECT_INTEGRATION');
 assert.equal(classify(args(f)).classification,'UNRESOLVED_EVIDENCE');
});
test('independent authority failure routes to explicit approval, never capability generation',()=>{
 const x=classify(args({...failure,blocker_class:'AUTH_SCOPE_DEFICIT'}));
 assert.equal(x.classification,'AUTH_SCOPE_DEFICIT');
 assert.equal(x.authority_granted,false);
});
test('unverified provider claims and uncertain external effects never open builder',()=>{
 for(const f of [
  {...failure,independent:false},
  {...failure,independently_verified:false},
  {...failure,external_action_performed:true},
  {...failure,provider_effect_may_have_occurred:true},
  {...failure,no_automatic_retry:true},
  {...failure,original_work_id:'work:'+'b'.repeat(32)},
  {...failure,source_ref:'short'},
 ]){
  const x=classify(args(f));
  assert.equal(x.classification,'UNRESOLVED_EVIDENCE');
  assert.equal(x.model_generation_authorized,false);
 }
});
