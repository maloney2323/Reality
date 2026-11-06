import test from 'node:test';
import assert from 'node:assert/strict';
import {acceptIsolatedInstallation} from '../src/reality-genuine-original-continuation-v1.mjs';
test('no acceptance without independent evidence',()=>{
 assert.throws(()=>acceptIsolatedInstallation({}),/REALITY_CONTINUATION_/);
});
test('an unverified source cannot gain acceptance',()=>{
 assert.throws(()=>acceptIsolatedInstallation({
  scope:{original_work_id:'work:'+'a'.repeat(32),artifact_sha256:'b'.repeat(64),installed_commit_sha:'c'.repeat(40)},
  approval:{approval_id:'x',consumed_at:null},installation:{},observations:[],provider:{}
 }),/REALITY_CONTINUATION_/);
});

import {verifyOriginalResumption} from '../src/reality-genuine-original-continuation-v1.mjs';
const originalWork='work:'+'1'.repeat(32), installedSha='a'.repeat(40), candidateHash='b'.repeat(64);
function verified(){
 return {
 scope:{original_work_id:originalWork,approval_id:'owner-approval',installed_commit_sha:installedSha,artifact_sha256:candidateHash,installed_branch:'isolated-install'},
 approval:{approval_id:'owner-approval',original_work_id:originalWork,target_environment:'ISOLATED_PREVIEW',consumed_at:'2026-11-02',approval_origin:'AUTHENTICATED_OWNER_EXPLICIT_ACTION'},
 installation:{original_work_id:originalWork,installed_commit_sha:installedSha,artifact_sha256:candidateHash,settlement_verified:false,original_job_completed:false,production_changed:false,monitored_executions:5,passed_assertions:220,probation_live_business_executions:0,probation_window_target:50},
 observations:Array.from({length:5},()=>({tests:44,passed:44,failed:0,exit_code:0,sandbox_network_disabled:true,executor_privileges_dropped:true,output_hash_sha256:'c'.repeat(64)})),
 provider:{repository:'maloney2323/Reality',branch:'isolated-install',head_sha:installedSha,installed_bytes_verified:true}
 };
}
test('independently accepted for one original job, not full probation',()=>{
 const proof=acceptIsolatedInstallation(verified());
 assert.equal(proof.status,'ACCEPTED_FOR_ISOLATED_RESUMPTION');
 assert.equal(proof.full_probation_complete,false);
 assert.equal(proof.original_job_completed,false);
});
test('one failed monitor round or unconsumed approval blocks continuation',()=>{
 for(const change of [x=>x.observations[2].failed=1,x=>x.approval.consumed_at=null]){
  const x=verified();change(x);
  assert.throws(()=>acceptIsolatedInstallation(x),/REALITY_CONTINUATION_/);
 }
});
function completed(){
 const accepted=acceptIsolatedInstallation(verified());
 return {acceptance:accepted,
 claim:{status:'RESUMPTION_CLAIMED',original_work_id:originalWork,installed_commit_sha:installedSha,single_use:true,github_run_id:123},
 original:{original_work_id:originalWork,original_provider_failure_verified:true,original_frozen_sha256:'d'.repeat(64)},
 providerRun:{repository:'maloney2323/Reality',id:123,head_sha:'e'.repeat(40),event:'push'},
 providerJob:{id:2,name:'resume_original_job',run_id:123,status:'completed',conclusion:'success'},
 execution:{original_work_id:originalWork,installed_commit_sha:installedSha,classification:'MISSING_CAPABILITY',provider_failure_verified:true,frozen_suite_completed:true,frozen_suite_passed:true,isolated_execution:true,production_changed:false,provider_outcome_sha256:'f'.repeat(64)}
 };
}
test('provider success is verifiable but cannot claim ledger settlement',()=>{
 const receipt=verifyOriginalResumption(completed());
 assert.equal(receipt.settlement_recorded,false);
});
test('failed provider job, missing claim, and fabricated acceptance refuse settlement',()=>{
 for(const change of [x=>x.providerJob.conclusion='failure',x=>x.claim.single_use=false,x=>x.execution.frozen_suite_passed=false]){
  const x=completed();change(x);
  assert.throws(()=>verifyOriginalResumption(x),/REALITY_CONTINUATION_/);
 }
});
