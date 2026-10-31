// Real missing capability acceptance contract. This file is frozen before
// generating the extension: initial independent CI run MUST fail because the
// source is absent. Model candidates may supply source, not change this file.
import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyRealityCompletion}
 from '../../src/reality-extensions/reality-general-execution-receipt.mjs';
const OWNER='11111111-1111-4111-8111-111111111111',
 WORK='work:'+'c'.repeat(32),GOAL='verified:user:goal',
 HASH='a'.repeat(64),COMMIT='b'.repeat(40);
const valid=()=>({
 owner_id:OWNER,goal_id:GOAL,original_work_id:WORK,artifact_hash:HASH,
 signed_owner_approval:{verified:true,consumed_once:true,
  owner_id:OWNER,original_work_id:WORK,artifact_hash:HASH,
  origin:'AUTHENTICATED_OWNER_EXPLICIT_ACTION',
  reservation_ref:'supabase:owner:single-use:receipt'},
 sandbox:{independently_verified:true,artifact_hash:HASH,
  frozen_regression_passed:true,governance_preserved:true},
 installation:{independent_provider_readback:true,
  original_work_id:WORK,artifact_hash:HASH,installed_commit_sha:COMMIT,
  production_changed:false,installed_branch:'feature/reality-customer-repair'},
 resumption:{independent_provider_readback:true,real_execution_observed:true,
  original_work_id:WORK,installed_commit_sha:COMMIT,
  executor_run_ref:'github:actions:run:111:job:222',outcome:'SUCCEEDED'},
 settlement:{durable_settlement_readback:true,independent_outcome_verified:true,
  original_work_id:WORK,artifact_hash:HASH,
  installed_commit_sha:COMMIT,
  receipt_ref:'supabase:universe_events:33333333-3333-4333-8333-333333333333'},
});
test('same real owner job with distinct provider/approval receipts may settle',()=>{
 const result=verifyRealityCompletion(valid());
 assert.equal(result.verified,true);
 assert.equal(result.status,'VERIFIED_SETTLED');
 assert.equal(result.original_work_id,WORK);
 assert.equal(result.production_changed,false);
});
test('model claim or successful sandbox never becomes completed work',()=>{
 const a=valid();delete a.settlement;
 const result=verifyRealityCompletion({...a,model_claim:'FULLY_COMPLETE',completed:true});
 assert.equal(result.verified,false);
 assert.notEqual(result.status,'VERIFIED_SETTLED');
});
test('foreign owner or a switched original job fails closed',()=>{
 for(const patch of [
  {signed_owner_approval:{...valid().signed_owner_approval,owner_id:'foreign'}},
  {resumption:{...valid().resumption,original_work_id:'work:'+'d'.repeat(32)}},
  {settlement:{...valid().settlement,original_work_id:'work:'+'d'.repeat(32)}},
 ]){
  assert.equal(verifyRealityCompletion({...valid(),...patch}).verified,false);
 }
});
test('unverified owner approval, stale installation, mismatched artifact or production change fail',()=>{
 for(const patch of [
  {signed_owner_approval:{...valid().signed_owner_approval,consumed_once:false}},
  {installation:{...valid().installation,installed_commit_sha:'c'.repeat(40)}},
  {installation:{...valid().installation,production_changed:true}},
  {settlement:{...valid().settlement,artifact_hash:'e'.repeat(64)}},
  {resumption:{...valid().resumption,real_execution_observed:false}},
 ]){
  assert.equal(verifyRealityCompletion({...valid(),...patch}).verified,false);
 }
});
test('fabricated approval text and unverified receipts are not evidence',()=>{
 const a=valid();a.signed_owner_approval.origin='AI_SELF_APPROVED';
 assert.equal(verifyRealityCompletion(a).verified,false);
 const b=valid();b.settlement.independent_outcome_verified=false;
 assert.equal(verifyRealityCompletion(b).verified,false);
});
