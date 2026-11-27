import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyVerifiedCiFailure} from '../src/reality-extensions/reality-ci-failure-evidence.mjs';

const original=Object.freeze({
 owner_id:'owner:isolated-fixture',goal_id:'user-goal:existing',
 original_work_id:'work:'+'e'.repeat(32),
 repository:'maloney2323/Reality',
 source:'GITHUB_ACTIONS_INDEPENDENT_PROVIDER_READBACK',
 provider_readback_verified:true,original_goal_verified:true,
 repository_base_sha:'a'.repeat(40),run_head_sha:'a'.repeat(40),
 latest_head_sha:'a'.repeat(40),run_id:12345,job_id:9876,
 run_status:'completed',run_conclusion:'failure',
 run_url:'https://github.com/maloney2323/Reality/actions/runs/12345',
 failure_log_sha256:'b'.repeat(64),
 error_code:'ERR_MODULE_NOT_FOUND',
 missing_capability_id:'reality.ci-failure-evidence-v1',
 current_capability_registry_status:'ABSENT',
 frozen_regression_manifest_ref:'first-ci-evidence-gap-v1',
 frozen_regression_sha256:'c'.repeat(64),
 source_receipt_ref:'github:actions:run:12345:job:9876:verified',
 superseding_success:null
});
const run=patch=>classifyVerifiedCiFailure({...original,...patch});
function noEffect(out){
 assert.equal(out.installation_authorized,false);
 assert.equal(out.external_execution_authorized,false);
 assert.equal(out.original_job_completed,false);
 assert.equal(out.production_changed,false);
}
test('trusted frozen provider packet nominates candidate, never executes it',()=>{
 const p=run({});
 assert.equal(p.decision,'MISSING_CAPABILITY');
 assert.equal(p.can_generate_candidate,true);
 assert.equal(p.source_receipt_ref,original.source_receipt_ref);
 assert.equal(p.failure_log_sha256,original.failure_log_sha256);
 noEffect(p);
 assert.equal(Object.isFrozen(p),true);
});
test('owner, repo, branch and job-run source identity must match',()=>{
 for(const patch of [
  {repository:'maloney2323/Other'},
  {run_url:'https://github.com/maloney2323/Reality/actions/runs/123450'},
  {source_receipt_ref:'github:actions:run:12345:job:98760:verified'},
  {run_id:12346},{job_id:9877},
  {run_head_sha:'d'.repeat(40)},
  {repository_base_sha:'d'.repeat(40)},
  {latest_head_sha:'d'.repeat(40)},
  {provider_readback_verified:false},
  {original_goal_verified:false},
  {owner_id:'owner:'},{goal_id:' '},{original_work_id:'work:'+'Z'.repeat(32)},
  {frozen_regression_sha256:'c'.repeat(63)},
  {failure_log_sha256:'b'.repeat(63)},
  {frozen_regression_manifest_ref:null},
  {run_status:'queued'},{run_conclusion:'neutral'}
 ]){
  const p=run(patch);noEffect(p);
  assert.equal(p.decision,'INSUFFICIENT_EVIDENCE',JSON.stringify(patch));
  assert.equal(p.can_generate_candidate,false);
 }
});
test('invalid superseding readbacks fail closed, independently verified green means stale',()=>{
 const valid={
  repository:original.repository,run_head_sha:original.run_head_sha,
  run_id:12346,run_status:'completed',run_conclusion:'success',
  independently_verified:true
 };
 for(const patch of [{run_id:12344},{independently_verified:false},
  {run_head_sha:'e'.repeat(40)},{repository:'foreign/repo'},
  {run_conclusion:'failure'}]){
  const p=run({superseding_success:{...valid,...patch}});
  assert.equal(p.decision,'INSUFFICIENT_EVIDENCE');noEffect(p);
 }
 const green=run({superseding_success:valid});
 assert.equal(green.decision,'STALE_OR_ALREADY_REPAIRED');noEffect(green);
});
test('permission, quota, and credential failures are not missing capabilities',()=>{
 for(const error_code of ['AUTHORITY_REQUIRED','PERMISSION_DENIED',
  'CREDENTIAL_UNAVAILABLE','RATE_LIMITED','TOKEN_EXPIRED']){
  const p=run({error_code});noEffect(p);
  assert.equal(p.decision,'AUTHORITY_OR_CONFIGURATION_BLOCK');
  assert.equal(p.can_generate_candidate,false);
 }
});
test('registered extension repairs existing defect, even if module load fails',()=>{
 for(const error_code of ['ERR_ASSERTION','ERR_MODULE_NOT_FOUND']){
  const p=run({error_code,current_capability_registry_status:'ACTIVE'});
  assert.equal(p.decision,'REPAIR_EXISTING_DEFECT');noEffect(p);
 }
});
test('unknown cause or registry status never starts generation',()=>{
 for(const patch of [
  {error_code:'BAD_UNRECOGNIZED_ERROR'},
  {current_capability_registry_status:'UNKNOWN'},
  {missing_capability_id:'DROP TABLE;'},
 ]){
  const p=run(patch);
  assert.equal(p.can_generate_candidate,false);noEffect(p);
 }
});
test('untrusted text can never self-certify as provider provenance',()=>{
 for(const source of ['MODEL_CLAIMS_VERIFIED','GITHUB_ISSUE_TEXT',
   'UNTRUSTED_TOOL_RESPONSE']){
  const p=run({source});
  assert.equal(p.decision,'INSUFFICIENT_EVIDENCE');noEffect(p);
 }
});
