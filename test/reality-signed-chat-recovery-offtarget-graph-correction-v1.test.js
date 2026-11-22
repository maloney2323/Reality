import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectPinnedSignedRecoverySourceRoots}
 from '../src/reality-signed-chat-recovery-target-review-v1.js';
import {verifyFrozenRecoveryCapabilityClaim}
 from '../src/reality-chat-new-development-worker-v1.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sql=read('../supabase/migrations/20261122015400_signed_chat_recovery_offtarget_graph_strategy_v1.sql');
const generator=read('../src/reality-chat-new-development-worker-v1.js');
const review=read('../src/reality-signed-chat-recovery-target-review-v1.js');
const worker=read('../api/reality/governed-employee-shift-worker.js');
const bound=read('../src/reality-governed-shift-boundary-v1.js');
const roots=['api/reality/governed-employee-shift-worker.js',
 'api/reality/generalized-original-install-review.js',
 'api/reality/generalized-owner-install-approval.js'];
test('independently pinned source graph is reusable before model file selection',()=>{
 const sources=roots.map((p,i)=>({path:p,sha:'a'.repeat(40),
  source:'import {x} from "../../src/reality-chat-new-development-worker-v1.js";\n'+
    'export const value = '+i+';\n'}));
 const result=inspectPinnedSignedRecoverySourceRoots(sources,
  'src/reality-chat-new-development-worker-v1.js',roots);
 assert.equal(result.verified,true);
 assert.equal(result.target_in_graph,true);
 assert.ok(result.source_scope_paths.includes('src/reality-chat-new-development-worker-v1.js'));
 assert.equal(result.source_scope_paths.includes('src/reality-saved-chat-work-adapter-v1.js'),false);
 assert.equal(result.source_scope_paths.length,result.source_scope_count);
 assert.equal(new Set(result.source_scope_paths).size,result.source_scope_paths.length);
 assert.match(generator,/inspectPinnedSignedRecoverySourceRoots\(/);
 assert.match(generator,/pinnedTargetScope=new Set\(scope\.source_scope_paths\)/);
 assert.match(generator,/pinnedTargetScope===null\|\|pinnedTargetScope\.has\(f\.path\)/);
 assert.match(generator,/file\.encoding!=='base64'/);
 assert.match(generator,/blobSHA\(raw\)!==file\.sha/);
 assert.match(review,/source_scope_paths:Object\.freeze/);
});
test('third strategy is source-and-owner-bound, never model authority',()=>{
 const id='work:'+'a'.repeat(32),msg='11111111-1111-4111-8111-111111111111',
  sourceSha='f'.repeat(64),gap='sha256:'+'b'.repeat(64);
 const spec={
  schema:'reality-recovery-compiler-capability-spec-v3',
  original_work_id:id,signed_message_id:msg,source_sha256:sourceSha,
  blocker_receipt_sha256:gap,source_relevance_roots:roots,
  original_goal:'Repair real original Chat-to-work executor and installer compatibility',
  required_interfaces:['existing-chat-source-to-governed-development',
   'independent-full-original-goal-feature-acceptance',
   'compatible-same-original-preview-installer',
   'separate-exact-owner-install-authorization'],
  checkpoint:{original_work_id:id,signed_source_sha256:sourceSha},
  quarantine_policy:{permissions_expansion:false,
   runtime_execution:false,source_write:'isolated-draft-pr-only'},
  patch_strategy:'FROZEN_GITHUB_LINE_SPAN_INDEPENDENT_EXACT_ANCHOR',
  source_target_policy:'PINNED_RUNTIME_ENTRYPOINT_SOURCE_GRAPH_ONLY',
  source_size_max_bytes:210000,line_span_max_lines:81,
  full_goal_accepted:false,installation_authorized:false,
  original_job_completed:false,production_changed:false
 };
 const claim={original_work_id:id,message_id:msg,message_sha256:sourceSha,
  recovery_blocker_receipt_sha256:gap,recovery_spec:spec};
 assert.equal(verifyFrozenRecoveryCapabilityClaim(claim),true);
 assert.equal(verifyFrozenRecoveryCapabilityClaim({
  ...claim,recovery_spec:{...spec,source_target_policy:'ALLOW_ANY_REPOSITORY_FILE'}
 }),false);
});
test('existing signed worker requalifies only independently rejected target on NEW release',()=>{
 for(const x of [
  "phase='SIGNED_CHAT_RECOVERY_RELEVANCE_REJECTED'",
  "'CANDIDATE_TARGET_OUTSIDE_PINNED_RUNTIME_GRAPH'",
  "source_kind='SIGNED_CHAT_DEVELOPMENT_RECOVERY'",
  "qualified_candidate->>'base_sha' is distinct from p_release_sha",
  "qualification_receipt->>'target_review_receipt_sha256'",
  "qualification_receipt->'target_review'->>'target_in_graph'='false'",
  "q.qualified_candidate->>'original_work_id' is distinct from q.original_work_id",
  "w.development->>'phase'='CI_VERIFIED'",
  "w.development->>'original_work_id'=q.original_work_id",
  "q.recovery_spec_sha256",
  "'reality-recovery-compiler-capability-spec-v3'",
  "'source_target_policy','PINNED_RUNTIME_ENTRYPOINT_SOURCE_GRAPH_ONLY'",
  "'prior_offtarget_candidate_receipt_sha256',receipt",
  "'offtarget_history'",
  "qualified_candidate=null",
  "claim_id=null,claim_expires_at=null",
  "'target_scope_revision_count',1",
  "'installation_authorized',false",
  "'original_job_completed',false",
  "'production_changed',false",
  "'new_shift_started',false"
 ])assert.ok(sql.includes(x),x);
 assert.match(sql,/coalesce\(\(qualification_receipt->>'target_scope_revision_count'\)::int,0\)=0/);
 assert.doesNotMatch(sql,/INSERT INTO.*(reality_chat_messages|genuine_capability_queue_v1|governed_employee_shifts_v1)/i);
 assert.match(worker,/reality_recompile_signed_chat_recovery_offtarget_v1/);
 assert.match(worker,/recoveryOfftargetProgress/);
 assert.match(bound,/recompile_signed_chat_recovery_offtarget_v1/);
});
test('service-only guard and no publisher bypass',()=>{
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/revoke all on function public\.reality_recompile_signed_chat_recovery_offtarget_v1/);
 assert.match(sql,/grant execute on function public\.reality_recompile_signed_chat_recovery_offtarget_v1/);
 assert.doesNotMatch(sql,/installation_authorized',true|production_changed',true|original_job_completed',true/);
 const broker=read('../supabase/functions/reality-chat-recovery-quarantine-broker-v1/index.ts');
 assert.match(broker,/s\.independent_target_review_verified===true/);
 assert.match(broker,/SIGNED_CHAT_RECOVERY_TARGET_REVIEWED/);
 assert.doesNotMatch(broker,/SIGNED_CHAT_RECOVERY_DRAFT_GENERATED/);
});
