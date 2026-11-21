import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isIsolatedOriginalProviderOutage} from '../src/reality-governed-employee-shift-worker-v1.js';

const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
function region(start,end){
 const i=worker.indexOf(start),j=worker.indexOf(end,i+start.length);
 assert.ok(i>=0, 'start marker exists: '+start);
 assert.ok(j>i, 'end marker exists: '+end);
 return worker.slice(i,j);
}

test('one unavailable GitHub source is isolated, while authority and receipt failures remain fatal',()=>{
 assert.equal(isIsolatedOriginalProviderOutage(
  new Error('SHIFT_GITHUB_PROVIDER_READBACK_UNAVAILABLE')),true);
 for(const error of [
  'SHIFT_WORKER_CLAIM_UNTRUSTED',
  'SHIFT_FINAL_RECEIPT_RECONCILIATION_UNTRUSTED',
  'SHIFT_STEP_INDEPENDENT_SETTLEMENT_UNVERIFIED',
  'SHIFT_DATABASE_RPC_reality_claim_employee_shift_step_v1_TIMEOUT',
  'SHIFT_GITHUB_IDENTITY_MISMATCH',
  'SHIFT_SOURCE_REF_NOT_ALLOWED',
  'SHIFT_CAPABILITY_WAKE_ADAPTER_REQUIRED',
 ]){
  assert.equal(isIsolatedOriginalProviderOutage(new Error(error)),false,error);
 }
});

test('failed or successful self-repair cannot short-circuit other shift lanes',()=>{
 const slice=region('let chatNewDevelopmentCheckpoint=null',
   '// Evidence-backed transition from verified corrective CI');
 assert.doesNotMatch(slice,/return\s+res\.status\s*\(/);
 assert.match(slice,/chatNewDevelopmentCheckpoint/);
 assert.match(slice,/boundedCorrectiveCheckpoint/);
 assert.match(slice,/sameOriginalRecoveryCheckpoint/);
 assert.match(slice,/sameOriginalRecoveryCiCheckpoint/);
 assert.match(slice,/RECOVERY_PROVIDER_OR_EVIDENCE_UNVERIFIED_NO_REPLAY/);
 assert.doesNotMatch(slice,/p_status:\s*'WAKE_FAILED'/);
 assert.match(slice,/!boundedCorrectiveCheckpoint/);
});

test('corrective CI is called once per wake even when a fast repair lane ran',()=>{
 const call=region('const correctiveCiPromise=',"// The signed shift step is already");
 assert.match(call,/boundedCorrectiveCheckpoint\?/);
 assert.match(call,/sameOriginalRecoveryCiCheckpoint\?/);
 assert.match(call,/Promise\.resolve\(boundedCorrectiveCheckpoint\.corrective_ci_result\)/);
 assert.match(call,/Promise\.resolve\(sameOriginalRecoveryCiCheckpoint\.corrective_ci_result\)/);
 assert.match(call,/continueRileyCorrectiveModelIntoIndependentCI/);
});

test('unrelated employee work continues only when a provider error is isolated',()=>{
 const tick=region('const result=await processGovernedEmployeeShiftTick',
  '// A source-checked commit-triage observation');
 assert.match(tick,/isIsolatedOriginalProviderOutage\(error\)/);
 assert.match(tick,/if\(!isIsolatedOriginalProviderOutage\(error\)\)throw error/);
 assert.match(tick,/EXACT_SHIFT_ORIGINAL_TICK_BLOCKED_OTHER_WORK_CONTINUES/);
 assert.match(tick,/original_job_retried:false/);
 assert.match(tick,/installation_authorized:false/);
 assert.match(tick,/production_changed:false/);
});

test('end-of-wake receipt retains the failed original and each recovery lane outcome',()=>{
 const finish=region("workerStage='WORKER_RESPONSE_PUBLICATION';",
  "}catch(error){");
 for(const required of [
  'same_original_recovery_attempt:sameOriginalRecovery',
  'same_original_recovery_checkpoint:sameOriginalRecoveryCheckpoint',
  'same_original_recovery_ci_checkpoint:sameOriginalRecoveryCiCheckpoint',
  'chat_new_development_checkpoint:chatNewDevelopmentCheckpoint',
  'corrective_ci_checkpoint:boundedCorrectiveCheckpoint',
  'actual_worker_completion_receipt:completedPulse',
 ])assert.ok(finish.includes(required),required);
 assert.match(worker,/isDurablyCompletedShiftWorkerPulse\(completedPulse,wakeReceipt\.shift_id\)/);
 assert.match(worker,/p_status:'WAKE_COMPLETED'/);
});
