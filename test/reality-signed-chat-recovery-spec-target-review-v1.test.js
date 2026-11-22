import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 verifyFrozenRecoveryCapabilityClaim,freezeNumberedRecoverySourceExcerpt,
 deriveExactPatchFromFrozenLineSpan
} from '../src/reality-chat-new-development-worker-v1.js';
import {inspectPinnedSignedRecoverySourceRoots}
 from '../src/reality-signed-chat-recovery-target-review-v1.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sql=read('../supabase/migrations/20261122013100_signed_chat_recovery_existing_target_review_gate_v1.sql');
const strategy=read('../supabase/migrations/20261122010500_signed_chat_recovery_distinct_line_span_compiler_v1.sql');
const worker=read('../api/reality/governed-employee-shift-worker.js');
const broker=read('../supabase/functions/reality-chat-recovery-quarantine-broker-v1/index.ts');
const boundary=read('../src/reality-governed-shift-boundary-v1.js');
const reviewer=read('../src/reality-signed-chat-recovery-target-review-v1.js');
const ROOTS=['api/reality/governed-employee-shift-worker.js',
 'api/reality/generalized-original-install-review.js',
 'api/reality/generalized-owner-install-approval.js'];
const id='work:'+'a'.repeat(32),msg='11111111-1111-4111-8111-111111111111';
const sha='b'.repeat(64),gap='sha256:'+'c'.repeat(64);
const spec={
 schema:'reality-recovery-compiler-capability-spec-v2',
 original_work_id:id,signed_message_id:msg,source_sha256:sha,
 blocker_receipt_sha256:gap,
 original_goal:'Restore full independent original job feature acceptance and same-original installer',
 required_interfaces:['existing-chat-source-to-governed-development',
 'independent-full-original-goal-feature-acceptance',
 'compatible-same-original-preview-installer',
 'separate-exact-owner-install-authorization',
 'independent-provider-effect-and-final-universe-reconciliation'],
 source_relevance_roots:ROOTS,
 quarantine_policy:{permissions_expansion:false,runtime_execution:false,
 source_write:'isolated-draft-pr-only'},
 checkpoint:{original_work_id:id,signed_source_sha256:sha},
 patch_strategy:'FROZEN_GITHUB_LINE_SPAN_INDEPENDENT_EXACT_ANCHOR',
 source_size_max_bytes:210000,line_span_max_lines:81,
 full_goal_accepted:false,installation_authorized:false,
 original_job_completed:false,production_changed:false
};
const claim={original_work_id:id,message_id:msg,message_sha256:sha,
 recovery_blocker_receipt_sha256:gap,recovery_spec:spec};
test('complete independently frozen contract survives claim and rejects malformed or permissive variants',()=>{
 assert.equal(verifyFrozenRecoveryCapabilityClaim(claim),true);
 for(const bad of [
  {source_relevance_roots:['other.js',...ROOTS.slice(1)]},
  {required_interfaces:['only-a-decorative-patch']},
  {installation_authorized:true},
  {quarantine_policy:{...spec.quarantine_policy,permissions_expansion:true}},
  {checkpoint:{...spec.checkpoint,original_work_id:'work:'+'f'.repeat(32)}},
  {source_size_max_bytes:500000},
  {patch_strategy:'MODEL_SELF_APPROVES_INSTALL'}
 ])assert.equal(verifyFrozenRecoveryCapabilityClaim({
  ...claim,recovery_spec:{...spec,...bad}}),false,JSON.stringify(bad));
 assert.match(sql,/'recovery_spec',q\.recovery_spec/);
 assert.match(sql,/'source_relevance_roots'/);
 assert.match(strategy,/FROZEN_GITHUB_LINE_SPAN_INDEPENDENT_EXACT_ANCHOR/);
 assert.match(strategy,/source_relevance_roots/);
});
test('model receives source-and-goal-bound spec, no authority flags or new original',()=>{
 const code=read('../src/reality-chat-new-development-worker-v1.js');
 assert.match(code,/verifyFrozenRecoveryCapabilityClaim\(c\)/);
 assert.match(code,/Frozen, DB-verified capability contract/);
 assert.match(code,/required_interfaces:claim\.recovery_spec\.required_interfaces/);
 assert.match(code,/source_relevance_roots:claim\.recovery_spec\.source_relevance_roots/);
 assert.match(code,/role:'patch_line_correction'/);
 assert.match(code,/freezeNumberedRecoverySourceExcerpt/);
 assert.match(code,/source\.size>limit/);
 assert.doesNotMatch(code,/createShift|startNewShift|installation_authorized:true/);
});
test('frozen line source is exact, bounded, and hidden/unlabeled lines are not accepted',()=>{
 const full=Array.from({length:450},(_,i)=>
   'export const targetLine'+i+' = "value'+i+'";\n').join('');
 const frozen=freezeNumberedRecoverySourceExcerpt(full,'targetLine420',5000);
 assert.ok(frozen.text.length<=5000);
 assert.ok(frozen.text.includes('00001| '));
 assert.ok(frozen.ranges.length>=1);
 const from=frozen.ranges[0][0],to=Math.min(from+2,frozen.ranges[0][1]);
 const choice={start_line:from,end_line:to,
  replace:'export const replacedGoal = "verified";\n',
  reason:'A source bounded functional repair for original'};
 const yes=deriveExactPatchFromFrozenLineSpan(full,choice,frozen.ranges);
 assert.equal(yes.ok,true);
 const no=deriveExactPatchFromFrozenLineSpan(full,
  {...choice,start_line:430,end_line:431},[[1,20]]);
 assert.equal(no.ok,false);
 assert.equal(no.reason,'FROZEN_LINE_SPAN_NOT_VISIBLE_IN_REVIEW');
 assert.equal(deriveExactPatchFromFrozenLineSpan(full,
  {...choice,start_line:0},frozen.ranges).ok,false);
});
test('independent pinned entrypoint graph accepts an actual direct importer only',()=>{
 const f=(p,source)=>({path:p,sha:'a'.repeat(40),source});
 const first='import {x} from "../../src/reality-chat-new-development-worker-v1.js";\n'+
  'export const safe = true;\n';
 const others='import {x} from "../../src/reality-governed-shift-boundary-v1.js";\n'+
  'export function safeHandler(){return false;}\n';
 const roots=[f(ROOTS[0],first),f(ROOTS[1],others),f(ROOTS[2],others)];
 const ok=inspectPinnedSignedRecoverySourceRoots(roots,
  'src/reality-chat-new-development-worker-v1.js',ROOTS);
 assert.equal(ok.verified,true);assert.equal(ok.target_in_graph,true);
 assert.equal(ok.entrypoint_evidence.length,3);
 const off=inspectPinnedSignedRecoverySourceRoots(roots,
  'src/reality-unrelated-marketing-service.js',ROOTS);
 assert.equal(off.verified,true);assert.equal(off.target_in_graph,false);
 assert.equal(inspectPinnedSignedRecoverySourceRoots(roots,
  'src/reality-chat-new-development-worker-v1.js',['untrusted',...ROOTS.slice(1)]).verified,false);
 assert.equal(inspectPinnedSignedRecoverySourceRoots(roots,
  'src/../../.env',ROOTS).verified,false);
});
test('separate signed-worker source-target reviewer is gated by candidate provenance and immutable source',()=>{
 for(const x of [
  "run_id=p_worker_run_id and status='STARTED'",
  "updated_at<run.started_at",
  "'SIGNED_CHAT_RECOVERY_DRAFT_GENERATED'",
  "'SIGNED_CHAT_RECOVERY_TARGET_REVIEW_CLAIMED'",
  "'SIGNED_CHAT_RECOVERY_TARGET_REVIEWED'",
  "'SIGNED_CHAT_RECOVERY_RELEVANCE_REJECTED'",
  "qualified_candidate->>'candidate_sha256'",
  "recovery_spec_sha256='sha256:'",
  "w.development->>'phase'='CI_VERIFIED'",
  "w.message_sha256=pg_catalog.encode(pg_catalog.sha256(",
  "'target_review_receipt_sha256',digest",
  "CANDIDATE_TARGET_OUTSIDE_PINNED_RUNTIME_GRAPH"
 ])assert.ok(sql.includes(x),x);
 assert.match(reviewer,/readGitHub|async function gh/);
 assert.match(reviewer,/independentlyReviewOneSignedChatRecoveryTarget/);
 assert.match(reviewer,/p_worker_run_id:workerRunId/);
 assert.match(worker,/workerStage='SIGNED_CHAT_RECOVERY_INDEPENDENT_TARGET_REVIEW'/);
 assert.match(worker,/workerRunId:actualWorkerRunId/);
 assert.match(boundary,/claim_next_signed_chat_recovery_target_review_v1/);
 assert.match(boundary,/record_signed_chat_recovery_target_review_v1/);
});
test('publisher cannot fence or quarantine model-only or off-target drafts',()=>{
 assert.match(sql,/and phase='SIGNED_CHAT_RECOVERY_TARGET_REVIEWED'/);
 assert.match(sql,/qualification_receipt->>'target_review_receipt_sha256'/);
 assert.match(sql,/qualification_receipt->'target_review'->>'target_in_graph'='true'/);
 assert.match(broker,/SIGNED_CHAT_RECOVERY_TARGET_REVIEWED/);
 assert.doesNotMatch(broker,/SIGNED_CHAT_RECOVERY_DRAFT_GENERATED/);
 assert.match(broker,/s\.independent_target_review_verified===true/);
 assert.match(broker,/target_review_receipt_sha256:s\.target_review_receipt_sha256/);
 assert.match(sql,/independent_target_review_verified',true/);
 assert.doesNotMatch(sql,/installation_authorized',true|production_changed',true/);
 for(const name of [
  'reality_claim_next_signed_chat_recovery_target_review_v1',
  'reality_record_signed_chat_recovery_target_review_v1'
 ]){
  assert.ok(sql.includes('function public.'+name));
  assert.ok(sql.includes('revoke all on function public.'+name));
  assert.ok(sql.includes('grant execute on function public.'+name));
 }
});
