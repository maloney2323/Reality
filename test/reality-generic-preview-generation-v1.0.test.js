import test from 'node:test';
import assert from 'node:assert/strict';
import {createFoundationalBuildTicket} from '../src/reality-foundational-build-loop-v1.0.js';
import {createRealityPinnedPreviewGenerationAdapters} from '../src/reality-foundational-vercel-generation-adapters-v1.0.js';
const sha='a'.repeat(40),ref='feature/reality-live-general-repair-bridge-20261031';
const scope={
 owner_id:'11111111-1111-4111-8111-111111111111',
 goal_id:'verified:user:goal',goal_transition_receipt_ref:'goal:receipt',
 goal_evidence_ref:'goal:evidence',original_work_id:'work:'+'e'.repeat(32),
 continuity_root_id:'root:verified',worldline_id:'world:verified',
 confirmed_gap_receipt_ref:'provider:gap:receipt',
 confirmed_gap_evidence_hash:'b'.repeat(64),
 confirmed_gap_source:'INDEPENDENT_PROVIDER_READBACK',
 frozen_regression_manifest_ref:'original-frozen-test-v1',
 frozen_regression_sha256:'c'.repeat(64),
 repository_base_sha:sha,repository_branch:ref,
 source_entrypoint:'src/reality-extensions/actual-owner-job.mjs',
 environment:'ISOLATED_PREVIEW',max_attempts:3,
 allowed_source_roots:['src/reality-extensions/','test/reality-extensions/'],
};
test('generic model adapter is pinned to the exact preview source identity',async()=>{
 const ticket=createFoundationalBuildTicket(scope);
 const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:ref,
  VERCEL_GIT_COMMIT_SHA:sha,
  REALITY_STANDALONE_OPENAI_API_KEY:'test-only-provider-key',
  REALITY_SEMANTIC_REVIEW_MODEL:'test-model'};
 const adapters=await createRealityPinnedPreviewGenerationAdapters({
  ticket,env,SandboxClient:{create:async()=>{}},
 });
 assert.equal(typeof adapters.generateCandidate,'function');
 assert.equal(typeof adapters.runIsolatedSandbox,'function');
 for(const change of [{VERCEL_ENV:'production'},{VERCEL_GIT_COMMIT_SHA:'f'.repeat(40)}]){
  await assert.rejects(createRealityPinnedPreviewGenerationAdapters({
   ticket,env:{...env,...change},SandboxClient:{create:async()=>{}},
  }),/FOUNDATION_GENERIC_PINNED_PREVIEW_SCOPE_REQUIRED/);
 }
});
test('generic model entrypoint cannot mutate auth or governance paths',()=>{
 assert.throws(()=>createFoundationalBuildTicket({...scope,
  source_entrypoint:'src/reality-governance-core.js'}),
  /FOUNDATION_TRUSTED_EXTENSION_ENTRYPOINT_REQUIRED/);
});
