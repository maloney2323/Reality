import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 isSignedRealityCapabilityPreviewRef,isSignedRealityCapabilityPush,
 requireSignedRealityCapabilityPush
} from '../src/reality-genuine-capability-signed-preview-ref-v1.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const active='refs/heads/reality/chat-direct-work-handoff-20261115';
const legit={GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'push',
 GITHUB_REPOSITORY:'maloney2323/Reality',GITHUB_REF:active,
 GITHUB_SHA:'a'.repeat(40)};
test('signed capability builder follows the ACTUAL preview ref without permitting main or production',()=>{
 assert.equal(isSignedRealityCapabilityPush(legit),true);
 assert.equal(requireSignedRealityCapabilityPush(legit).branch,
  'reality/chat-direct-work-handoff-20261115');
 for(const ref of ['refs/heads/main','refs/heads/reality/production',
  'refs/heads/feature/reality-general-capability-engine-20261101',
  'refs/heads/reality/foo..bar','refs/heads/reality//not-allowed',
  'refs/heads/reality/attacker-custom-feature-20261117']){
  assert.equal(isSignedRealityCapabilityPreviewRef(ref),false,ref);
 }
 for(const e of [
  {...legit,GITHUB_ACTIONS:'false'},
  {...legit,GITHUB_SHA:'NOT_A_SHA'},
  {...legit,GITHUB_EVENT_NAME:'pull_request'},
  {...legit,GITHUB_REPOSITORY:'attacker/not-reality'}]){
  assert.equal(isSignedRealityCapabilityPush(e),false);
 }
});
test('model proposal, frozen test, qualification and resume stages reject old preview pin',()=>{
 for(const p of [
  'scripts/reality-genuine-auto-admit-v1.mjs',
  'scripts/reality-genuine-frozen-worker-claim-v1.mjs',
  'scripts/reality-genuine-frozen-reconcile-v1.mjs',
  'scripts/reality-genuine-openai-propose-v1.mjs',
  'scripts/reality-genuine-sandbox-verify-v1.mjs',
  'scripts/reality-genuine-openai-correct-v1.mjs',
  'scripts/reality-genuine-qualify-v1.mjs',
  'scripts/reality-riley-stage-verified-code-v1.mjs',
  'scripts/reality-genuine-install-approved-preview-v1.mjs',
  'scripts/reality-genuine-monitor-installed-preview-v1.mjs',
  'scripts/reality-genuine-record-activation-v1.mjs',
  'scripts/reality-genuine-original-resume-v1.mjs',
  'scripts/reality-genuine-original-settle-v1.mjs']){
  const c=read(p);
  assert.match(c,/isSignedRealityCapabilityPreviewRef/,p);
  assert.doesNotMatch(c,/feature\/reality-general-capability-engine-20261101/,p);
 }
});
test('broker independently verifies signed PREVIEW ref, SHA and source-bound owner scope',()=>{
 const broker=read('supabase/functions/reality-employee-capability-wake-broker-v1/index.ts');
 assert.match(broker,/base_branch,base_sha,original_work_id,shift_id/);
 assert.match(broker,/branch\.object\.sha!==request\.base_sha/);
 assert.match(broker,/SAFE_BRANCH\.test\(BRANCH/);
 assert.match(broker,/signedScheduler=fields/);
 assert.match(broker,/CURRENT_PREVIEW_BRANCH/);
 assert.match(broker,/BRANCH!==\(Deno\.env\.get\('REALITY_CAPABILITY_PREVIEW_BRANCH'\)/);
 assert.match(broker,/reality_read_shift_capability_wake_v1/);
 assert.match(broker,/source_proof_sha256!==request\.source_proof_sha256/);
 assert.doesNotMatch(broker,/const BRANCH='feature\/reality-general-capability-engine-20261101'/);
});
test('auto-admission validates signed GitHub OIDC current ref and provider run, not old branch',()=>{
 const edge=read('supabase/functions/reality-genuine-capability-auto-admit/index.ts');
 assert.match(edge,/c\.workflow_ref!==REPO\+'\/'\+WORKFLOW\+'@'\+c\.ref/);
 assert.match(edge,/signedPreviewRef\(c\.ref\)/);
 assert.match(edge,/v==='refs\/heads\/'\+APPROVED_PREVIEW_BRANCH/);
 assert.match(edge,/run\.head_branch!==c\.ref\.slice/);
 assert.match(edge,/const HISTORICAL_BRANCH=/);
 assert.match(edge,/validHistoricalRef/);
 assert.doesNotMatch(edge,/c\.ref!==BRANCH/);
});
test('auto-generation workflow wakes ONLY from signed capability trigger files',()=>{
 const workflow=read('.github/workflows/reality-genuine-capability-auto-trigger-v1.yml');
 assert.match(workflow,/branches:\s*\n\s*- 'reality\/chat-direct-work-handoff-20261115'/);
 assert.doesNotMatch(workflow,/branches:\s*\n\s*- 'reality\/\*\*'/);
 assert.match(workflow,/paths:\s*\n\s*- 'reality-genuine-triggers\/\*\*'/);
 assert.match(workflow,/generate_missing_capability:/);
 assert.match(workflow,/verify_missing_capability:/);
 assert.match(workflow,/qualify_verified_capability:/);
 assert.match(workflow,/activate_owner_approved_preview:/);
 assert.match(workflow,/resume_original_job:/);
});
