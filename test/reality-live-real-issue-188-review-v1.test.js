import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyRealMissingRepairIssue}
 from '../src/reality-real-repair-opportunity-intake-v1.0.js';
import {readExactModelRepairEvidence}
 from '../src/reality-real-verified-repair-readback-v1.0.js';
import {verifyApprovedBackgroundReadiness}
 from '../src/reality-approved-repair-background-readiness-v1.0.js';
const ISSUE=188;
const env={
 VERCEL_ENV:'preview',
 VERCEL_GIT_COMMIT_REF:'feature/reality-home-repair-chat-20261031',
 REALITY_BUILDER_DISPATCH_GITHUB_TOKEN:process.env.GITHUB_TOKEN||'',
};
test('actual current GitHub #188 failure is an independently source-verified missing capability',async()=>{
 const gap=await verifyRealMissingRepairIssue({issueNumber:ISSUE,env});
 assert.equal(gap.independently_verified,true);
 assert.equal(gap.issue_number,ISSUE);
 assert.equal(gap.original_provider_failed_run_id,41177409146);
 assert.equal(gap.source_sha,'8c6cd6c3891e98aaf30520bba2f47ee604d10d69');
 assert.equal(gap.source_path,'src/reality-extensions/reality-general-execution-receipt.mjs');
 assert.equal(gap.frozen_test_path,'test/reality-frozen-regressions/reality-general-execution-receipt-v1.test.js');
 assert.equal(gap.installation_authorized,false);
 assert.equal(gap.job_completed,false);
});
test('actual model-generated #188 exact bytes and independent secret-free sandbox remain verified',async()=>{
 const proof=await readExactModelRepairEvidence({issueNumber:ISSUE,env});
 assert.equal(proof.independently_verified,true);
 assert.equal(proof.issue_number,ISSUE);
 assert.equal(proof.original_failed_run_id,41177409146);
 assert.equal(proof.verified_sandbox_run_id,41177825313);
 assert.equal(proof.candidate_artifact_sha256,
  '4c95744d2935766e81c1b337bf4504ce1e614a4ae54a0ed159e77e7cc7fafd96');
 assert.equal(proof.independent_sandbox.network_disabled,true);
 assert.equal(proof.independent_sandbox.credential_count,0);
 assert.equal(proof.installation_authorized,false);
 assert.equal(proof.original_job_completed,false);
 assert.equal(proof.production_changed,false);
});

test('live exact-owner preview preflight sees a successful signed scheduler, not a model claim',async()=>{
 const preflight=await verifyApprovedBackgroundReadiness({
  env:{...env,REALITY_GOVERNED_SCHEDULER_ENABLED:'true'},
 });
 assert.equal(preflight.ready,true,
  'real signed scheduler must be healthy before permitting exact owner approval');
 assert.equal(preflight.code,'GOVERNED_AUTO_WAKE_VERIFIED');
 assert.equal(preflight.installation_authorized,false);
 assert.equal(preflight.original_job_completed,false);
 assert.equal(preflight.production_changed,false);
});
