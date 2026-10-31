// Frozen acceptance for owner-requested first real Reality self-upgrade.
// This is a contract test, NOT a claim that static fixtures are live evidence.
// The trusted worker must independently observe its red CI result before any
// source generation. Only Reality's generated extension may make it pass.
import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyVerifiedCiFailure}
 from '../../src/reality-extensions/reality-ci-failure-evidence.mjs';

const work='work:'+'e'.repeat(32); // isolated test fixture, NOT a real Continuity job
const goal='user-goal:verified-customer-work-fixture';
const original=Object.freeze({
 owner_id:'owner:isolated-fixture',goal_id:goal,original_work_id:work,
 repository:'maloney2323/Reality',
 source:'GITHUB_ACTIONS_INDEPENDENT_PROVIDER_READBACK',
 provider_readback_verified:true,
 original_goal_verified:true,
 repository_base_sha:'a'.repeat(40),
 run_head_sha:'a'.repeat(40),
 latest_head_sha:'a'.repeat(40),
 run_id:12345,job_id:9876,
 run_status:'completed',run_conclusion:'failure',
 run_url:'https://github.com/maloney2323/Reality/actions/runs/12345',
 failure_log_sha256:'b'.repeat(64),
 error_code:'ERR_MODULE_NOT_FOUND',
 missing_capability_id:'reality.ci-failure-evidence-v1',
 current_capability_registry_status:'ABSENT',
 frozen_regression_manifest_ref:'first-ci-evidence-gap-v1',
 frozen_regression_sha256:'c'.repeat(64),
 source_receipt_ref:'github:actions:run:12345:job:9876:verified',
 superseding_success:null,
});
const check=p=>classifyVerifiedCiFailure(structuredClone(p));
function safe(result){
 assert.equal(result.owner_id,original.owner_id);
 assert.equal(result.goal_id,goal);
 assert.equal(result.original_work_id,work);
 assert.equal(result.installation_authorized,false);
 assert.equal(result.external_execution_authorized,false);
 assert.equal(result.original_job_completed,false);
 assert.equal(result.production_changed,false);
}
test('independently verified current missing extension becomes generation candidate, never approval',()=>{
 const result=check(original);safe(result);
 assert.equal(result.decision,'MISSING_CAPABILITY');
 assert.equal(result.can_generate_candidate,true);
 assert.equal(result.missing_capability_id,original.missing_capability_id);
 assert.equal(result.frozen_regression_sha256,original.frozen_regression_sha256);
 assert.equal(result.source_receipt_ref,original.source_receipt_ref);
 assert.equal(result.failure_log_sha256,original.failure_log_sha256);
});
test('absent provider provenance or incomplete exact hash cannot start generation',()=>{
 for(const patch of [
  {provider_readback_verified:false},
  {source:'MODEL_CLAIMS_VERIFIED'},
  {failure_log_sha256:null},
  {frozen_regression_sha256:null},
  {source_receipt_ref:null},
  {original_goal_verified:false},
  {run_status:'in_progress'},
  {run_conclusion:'success'},
 ]){
  const out=check({...original,...patch});safe(out);
  assert.equal(out.decision,'INSUFFICIENT_EVIDENCE');
  assert.equal(out.can_generate_candidate,false);
 }
});
test('missing credentials and denied authority are NOT missing capabilities',()=>{
 for(const error_code of ['PERMISSION_DENIED','SERVICE_ROLE_REQUIRED',
   'AUTHORITY_REQUIRED','CREDENTIAL_UNAVAILABLE']){
  const out=check({...original,error_code});safe(out);
  assert.equal(out.decision,'AUTHORITY_OR_CONFIGURATION_BLOCK');
  assert.equal(out.can_generate_candidate,false);
 }
});
test('existing regression is a repair, not a fictitious new capability',()=>{
 const out=check({...original,error_code:'ERR_ASSERTION',
  current_capability_registry_status:'ACTIVE'});
 safe(out);assert.equal(out.decision,'REPAIR_EXISTING_DEFECT');
 assert.equal(out.can_generate_candidate,false);
});
test('superseding green run prevents upgrading a historical already repaired failure',()=>{
 const out=check({...original,superseding_success:{
  repository:original.repository,
  run_head_sha:original.run_head_sha,
  run_id:12346,run_status:'completed',run_conclusion:'success',
  independently_verified:true,
 }});safe(out);
 assert.equal(out.decision,'STALE_OR_ALREADY_REPAIRED');
 assert.equal(out.can_generate_candidate,false);
});
test('foreign repository, stale SHA, owner/goal contamination never authorize generation',()=>{
 for(const patch of [
  {repository:'someone-else/Reality'},
  {latest_head_sha:'f'.repeat(40)},
  {run_head_sha:'f'.repeat(40)},
  {original_work_id:'not-a-work-id'},
  {goal_id:null},
  {owner_id:null},
 ]){
  const out=check({...original,...patch});
  assert.equal(out.can_generate_candidate,false);
  assert.equal(out.installation_authorized,false);
  assert.equal(out.production_changed,false);
 }
});
test('issue title and LLM text without independent provider failure never trigger upgrade',()=>{
 const out=check({...original,source:'GITHUB_ISSUE_TEXT',
  provider_readback_verified:false,error_code:'MODEL_SAYS_MISSING_CAPABILITY'});
 safe(out);assert.equal(out.decision,'INSUFFICIENT_EVIDENCE');
 assert.equal(out.can_generate_candidate,false);
});
