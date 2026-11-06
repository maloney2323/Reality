import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveOriginalResumeContract} from '../src/reality-genuine-original-resume-contract-v1.js';
const ready={original_work_id:'work:'+'a'.repeat(32),
 installed_commit_sha:'b'.repeat(40),original_source_sha:'c'.repeat(40),
 artifact_sha256:'d'.repeat(64),frozen_test_sha256:'e'.repeat(64),
 source_path:'src/reality-extensions/reality-ci-failure-evidence.mjs',
 frozen_test_path:'test/reality-frozen-regressions/first-reality-ci-evidence-gap.test.js',
 original_job_completed:false,production_changed:false};
test('previous original CI job uses source-derived companion suite, no job-number special case',()=>{
 const p=deriveOriginalResumeContract(ready);
 assert.equal(p.protocol,'VERIFIED_CI_FAILURE_CLASSIFICATION_V1');
 assert.equal(p.companion_test_path,'test/reality-extensions/reality-ci-failure-evidence.test.js');
 assert.equal(p.reconciliation_target_work_id,null);
});
test('new independent continuity reconciliation cannot run on missing or forged target readback',()=>{
 const source_path='src/reality-extensions/reality-continuity-settlement-reconciler.mjs';
 const second={...ready,source_path,frozen_test_path:'test/reality-frozen-regressions/reality-continuity-settlement-reconciler-v1.test.js'};
 assert.throws(()=>deriveOriginalResumeContract(second),/INDEPENDENT_TARGET/);
 const target='work:'+'f'.repeat(32);
 const reconciliation_evidence={original:{original_work_id:target,epistemic_status:'VERIFIED'},
  settlement:{original_work_id:target,independent_outcome_verified:true},
  provider:{independent_provider_readback:true},ledger:{append_only_verified:true}};
 const p=deriveOriginalResumeContract({...second,reconciliation_target_work_id:target,reconciliation_evidence});
 assert.equal(p.export_name,'assessContinuityReconciliation');
 assert.equal(p.reconciliation_target_work_id,target);
 assert.equal(p.protocol,'TRUSTED_ORIGINAL_SETTLEMENT_RECONCILIATION_V1');
 assert.throws(()=>deriveOriginalResumeContract({...second,reconciliation_target_work_id:target,
  reconciliation_evidence:{...reconciliation_evidence,provider:{independent_provider_readback:false}}}),/INDEPENDENT_TARGET/);
});
test('unknown extension and foreign production scope are never executed',()=>{
 for(const x of [
  {...ready,source_path:'src/reality-extensions/untrusted.mjs'},
  {...ready,source_path:'../danger.mjs'},
  {...ready,production_changed:true},
  {...ready,original_job_completed:true},
  {...ready,artifact_sha256:'not-a-hash'},
 ])assert.throws(()=>deriveOriginalResumeContract(x),/REALITY_GENERAL_ORIGINAL_RESUME_/);
});

test('general execution receipt resumes only under its pinned frozen suite and never authorizes false completion',()=>{
 const known={...ready,
  source_path:'src/reality-extensions/reality-general-execution-receipt.mjs',
  frozen_test_path:'test/reality-frozen-regressions/reality-general-execution-receipt-v1.test.js'};
 const exact=deriveOriginalResumeContract(known);
 assert.equal(exact.protocol,'TRUSTED_GENERAL_COMPLETION_RECEIPT_V1');
 assert.equal(exact.export_name,'verifyRealityCompletion');
 assert.equal(exact.requires_pre_settlement_denial,true);
 assert.equal(exact.required_decision,'PRE_SETTLEMENT_DENIED');
 assert.equal(exact.production_changed,false);
 assert.equal(exact.installation_authorized,false);
 assert.throws(()=>deriveOriginalResumeContract({
   ...known,frozen_test_path:ready.frozen_test_path
 }),/SOURCE_SPECIFIC_FROZEN_SUITE_REQUIRED/);
});
