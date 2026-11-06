import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {qualifyUnboundSourceForReview,qualifyUnboundSourceBatch}
 from '../src/reality-owner-unbound-capability-qualification-v1.js';
const contentOf=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const migration=contentOf('supabase/migrations/20261104_link_frozen_source_to_existing_owner_original_v1.sql');
const api=contentOf('api/reality/personal-gap-intake.js');
const homepage=contentOf('index.html');
const source=Buffer.from("import test from 'node:test';\ntest('exact frozen',()=>{});\n");
const sha=createHash('sha256').update(source).digest('hex');
const work='work:bf17f1716f7c9550680d761e64f8b591';
const matched={
 status:'EXISTING_UNSETTLED_OWNER_ORIGINAL_MATCHED',
 original_work_id:work,queue_phase:'ISOLATED_INSTALLED_PROBATION',
 continuation_state:'ACCEPTED_FOR_ISOLATED_RESUMPTION',
 recovery_status:'RECONCILE_ALREADY_SATISFIED_PRIOR_WORK',
 next_evidence_action:'INDEPENDENT_ORIGINAL_OBJECTIVE_DISPOSITION',
 original_source_frozen_red_verified:true,same_owner_active_goal_verified:true,
 existing_original_reused:true,fresh_job_required:false,
 fresh_capability_generation_authorized:false,
 replay_external_effects_authorized:false,
 independent_final_receipt_recorded:false,
 installation_authorized_by_discovery:false,production_changed:false
};
const input={
 frozen_sha256:sha,
 frozen_test_path:'test/reality-frozen-regressions/reality-continuity-settlement-reconciler-v1.test.js',
 missing_module_path:'src/reality-extensions/reality-continuity-settlement-reconciler.mjs',
 observations:18,status:'AWAITING_OWNER_WORK_BINDING',
 first_observed_sha:'a'.repeat(40),latest_observed_sha:'b'.repeat(40),
 last_observed_at:'2026-11-04T13:00:00Z',existing_original_match:matched
};
const current='c'.repeat(40);
const fetchGitHub=async(url)=>{
 const parsed=new URL(url),path=parsed.pathname.split('/contents/')[1];
 if(path===input.missing_module_path)return {ok:false,status:404};
 return {ok:true,status:200,json:async()=>({
   path,encoding:'base64',content:source.toString('base64')
 })};
};
test('exact existing original is linked to frozen discovery without creating a job',async()=>{
 const x=await qualifyUnboundSourceForReview(input,{currentCommit:current,
  fetchImpl:fetchGitHub});
 assert.equal(x.stage,'EXISTING_ORIGINAL_RECOVERY_DISPOSITION_REQUIRED');
 assert.equal(x.linked_original_work_id,work);
 assert.equal(x.existing_original_queue_phase,'ISOLATED_INSTALLED_PROBATION');
 assert.equal(x.existing_recovery_status,'RECONCILE_ALREADY_SATISFIED_PRIOR_WORK');
 assert.equal(x.existing_next_evidence_action,'INDEPENDENT_ORIGINAL_OBJECTIVE_DISPOSITION');
 for(const k of ['verified_missing_capability','executable_job',
  'installation_authorized','owner_authorized_new_job','production_changed',
  'existing_original_final_receipt_recorded','candidate_independently_tested'])
  assert.equal(x[k],false,k);
 assert.equal(x.owner_authorized_existing_investigation,true);
 assert.match(x.next_proof,/SAME original job remains unsettled/);
});
test('other unbound discovery never borrows original #201 or its owner authorization',async()=>{
 const x=await qualifyUnboundSourceForReview({
  ...input,existing_original_match:null
 },{currentCommit:current,fetchImpl:fetchGitHub});
 assert.equal(x.stage,'CURRENT_SOURCE_MISSING_OWNER_JOB');
 assert.equal(x.linked_original_work_id,undefined);
 assert.equal(x.owner_authorized_new_job,false);
});
test('forged linked identity, settlement or replay fails closed',async()=>{
 const invalid=[
  {original_work_id:'work:'+'f'.repeat(32),same_owner_active_goal_verified:false},
  {independent_final_receipt_recorded:true},
  {replay_external_effects_authorized:true},
  {installation_authorized_by_discovery:true},
  {fresh_job_required:true},
  {fresh_capability_generation_authorized:true},
  {queue_phase:'SETTLED_ISOLATED'},
  {original_source_frozen_red_verified:false}
 ];
 for(const patch of invalid){
  await assert.rejects(qualifyUnboundSourceBatch([{
    ...input,existing_original_match:{...matched,...patch}
  }]),/UNTRUSTED_OBSERVATION/);
 }
});
test('a new frozen test digest cannot pass the original-source link',async()=>{
 const wrong=await qualifyUnboundSourceForReview({
  ...input,frozen_sha256:'e'.repeat(64)
 },{currentCommit:current,fetchImpl:fetchGitHub});
 assert.equal(wrong.stage,'FROZEN_SOURCE_CHANGED_NEEDS_REQUALIFICATION');
 assert.equal(wrong.linked_original_work_id,undefined);
});
test('database only links exactly matched, unsettled, owner-governed original and never writes',()=>{
 for(const part of [
  "current_user<>'service_role'",
  'q.owner_id=p_owner_id',
  'g.user_id=q.owner_id and g.conversation_id=q.conversation_id',
  "ev.epistemic_status='VERIFIED'",
  "ev.payload->>'owner_authorized_investigation'='true'",
  "ev.payload->>'original_job_completed'='false'",
  "ev.payload->>'source_path'=v_discovery.missing_module_path",
  "ev.payload->>'frozen_test_path'=v_discovery.frozen_test_path",
  "ev.payload->>'frozen_test_sha256'=v_discovery.frozen_sha256",
  "q.verified_frozen_reproduction->>'status'='ORIGINAL_FROZEN_REPRODUCED_RED'",
  'c.settled_at is null',
  'v_link.matching_work_count=1',
  'reality_internal.genuine_independent_final_receipts_v1',
  "'existing_original_reused',true",
  "'fresh_job_required',false",
  "'replay_external_effects_authorized',false",
  "'installation_authorized_by_discovery',false",
  'revoke all on function'
 ])assert.ok(migration.includes(part),part);
 assert.doesNotMatch(migration,/\bupdate\s+reality_internal\.|\binsert\s+into\s+reality_internal\./i);
});
test('signed-in category displays the existing job and correct next disposition',()=>{
 for(const part of [
  "EXISTING_ORIGINAL_RECOVERY_DISPOSITION_REQUIRED",
  'existing_original_recovery_links',
  "source.observations.some(v=>v.existing_original_match!=null",
  'x.existing_original_source_verified!==true',
  'x.owner_authorized_existing_investigation!==true',
 ]) assert.ok(api.includes(part),part);
 for(const part of [
  'EXISTING ORIGINAL JOB FOUND · RECOVERY DISPOSITION PENDING',
  "x.linked_original_work_id",
  'originalLink+frozenEvidence',
  'No second job, repeat install, or execution replay.',
  'existing_original_recovery_links'
 ])assert.ok(homepage.includes(part),part);
});
