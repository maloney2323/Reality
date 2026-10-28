import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fingerprintApprovedWorkItem} from '../src/reality-authority-v1.0.js';
import {exactOwnerUpgradeStageWorkItem}
 from '../src/reality-owner-upgrade-stage-authority-v0.1.js';
import {prepareOwnerInstalledUpgradeContinuation,
 readOwnerPreviousVerifiedInstall,
 continueOwnerUpgradeAfterVerifiedInstall}
 from '../src/reality-owner-upgrade-install-continuation-v0.1.js';
const owner=randomUUID(),conversationId=randomUUID(),
 originalWorkId='work:'+'7'.repeat(32),goalRev=randomUUID(),
 candidate='8'.repeat(64),head='9'.repeat(40),base='a'.repeat(40),merge='b'.repeat(40),
 grantId=randomUUID(),resumeGrantId=randomUUID();
const session={user_id:owner,config:{url:'https://hvkfreoagbrphwghjajw.supabase.co'}};
const env={VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:'hvkfreoagbrphwghjajw',
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:'hvkfreoagbrphwghjajw',
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:session.config.url,
 REALITY_UNIVERSE_PERSISTENCE_KEY:'test-only-not-real',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'hvkfreoagbrphwghjajw'};
const data={
 owner_id:owner,conversation_id:conversationId,original_work_id:originalWorkId,
 original_goal_id:'goal-original:test',goal_revision:goalRev,
 originalWorkItem:{continuity_root_id:'continuity:real:1',worldline_id:'worldline:real:1'},
 verifiedExperiment:{capability_id:'extension:original-work-parser',verification_hash:'c'.repeat(64)},
 evidence_warrant:{pinned_base_commit_sha:base},
 evidence_warrant_id:'warrant:'+'d'.repeat(64),
 candidate_hash:candidate,persisted_and_reobserved:true,
 original_job_completed:false,external_action_authorized:false,
};
const draft={
 owner_id:owner,conversation_id:conversationId,original_work_id:originalWorkId,
 original_goal_id:data.original_goal_id,
 goal_revision:goalRev,candidate_sha256:candidate,
 verification_hash:data.verifiedExperiment.verification_hash,
 warrant_id:data.evidence_warrant_id,pinned_base_sha:base,
 github_pr_number:1550,github_pr_url:'https://github.com/maloney2323/Reality/pull/1550',
 github_branch:'reality/build/build-'+'e'.repeat(32),
 github_commit_sha:head,durably_recorded:true,independently_reobserved:true,
 draft_pr_verified:true,reservation_status:'VERIFIED',
 production_merge_authorized:false,capability_installed:false,
 original_job_completed:false};
const prepArgs={session,conversationId,originalWorkId,env,
 loadTrusted:async()=>data,loadDraft:async()=>draft};
const {plan,scope}={
 plan:{state:'AWAITING_SEPARATE_INSTALLATION_AUTHORIZATION',
  owner_id:owner,conversation_id:conversationId,original_work_id:originalWorkId,
  original_goal_id:data.original_goal_id,goal_revision:goalRev,
  continuity_root_id:data.originalWorkItem.continuity_root_id,
  worldline_id:data.originalWorkItem.worldline_id,
  candidate_sha256:candidate,capability_id:data.verifiedExperiment.capability_id,
  github_head_sha:head,pinned_base_sha:base,github_pr_number:1550,
  github_pr_url:draft.github_pr_url,github_branch:draft.github_branch,
  customer_installation_authorized:false,capability_installed:false,
  original_job_completed:false,
 },
 scope:{ownerId:owner,conversationId,workId:originalWorkId,
  goalRevision:goalRev,candidateSha:candidate,headSha:head,
  pinnedBaseSha:base,githubPrNumber:1550,
  continuityRootId:data.originalWorkItem.continuity_root_id,
  worldlineId:data.originalWorkItem.worldline_id,
  base:'experiment/reality-live-durable-adversarial-20261025'},
};
const lease={reservation_id:grantId,merge_commit_sha:merge,
 independently_reobserved:true};
function ports(){
 const calls=[],record=name=>()=>{calls.push(name)};
 const installed={
  original_work_id:originalWorkId,owner_id:owner,conversation_id:conversationId,
  goal_revision:goalRev,candidate_sha256:candidate,head_sha:head,
  independent:true,installed:true,exact_candidate_files_verified:true,
  base_ref:scope.base,merge_commit_sha:merge,production_deployment_performed:false,
 };
 const active={
  ...installed,capability_id:plan.capability_id,registered:true,runtime_active:true,
  independently_reobserved:true,customer_application_runtime_active:false,
 };
 const goal={principal_id:owner,conversation_id:conversationId,
  active_goal_id:plan.original_goal_id,goal_revision:goalRev,
  active:true,user_confirmed:true,original_job_completed:false};
 const resumeGrant={
  ...installed,status:'CONSUMED_ONCE',operation:'resume_original_work',
  original_goal_id:plan.original_goal_id,authorized_by:owner,grant_id:resumeGrantId,
  separate_from_install_authorization:true,
 };
 const outcome={...installed,original_goal_id:plan.original_goal_id,
  original_job_completed:true,independent:true,work_id:originalWorkId,
  capability_sha256:candidate,execution_receipt_id:'execution:exact-original',
  evidence_ref:'https://github.com/maloney2323/Reality/issues/333'};
 const saved={...outcome,continuity_root_id:plan.continuity_root_id,
  worldline_id:plan.worldline_id,independently_reobserved:true,
  settlement_receipt_id:'settlement:confirmed'};
 const values={
  observeInstall:installed,register:{registered:true},readRegistry:active,
  readFreshGoal:goal,consumeResumeGrant:resumeGrant,
  resumeOriginal:{execution_id:outcome.execution_receipt_id},
  observeOriginal:outcome,settleResumeGrant:{
   status:'VERIFIED',reservation_id:resumeGrantId,durably_settled:true},
  appendSettlement:{receipt_id:'settlement:confirmed'},readSettlement:saved,
 };
 const adapters=Object.fromEntries(Object.entries(values).map(([key,value])=>[
  key,async(...args)=>{calls.push(key);return value},
 ]));
 adapters.install=record('install:UNAUTHORIZED');
 adapters.consumeInstallGrant=record('consumeInstallGrant:UNAUTHORIZED');
 return {calls,adapters,values};
}
const args={session,conversationId,originalWorkId,env,
 prepare:async()=>({plan,scope}),
 readInstall:async()=>lease};
test('continuation is reconstructed from original durable warranted source and verified draft, never arbitrary new work',async()=>{
 const r=await prepareOwnerInstalledUpgradeContinuation(prepArgs);
 assert.equal(r.plan.original_work_id,originalWorkId);
 assert.equal(r.scope.workId,originalWorkId);
 assert.equal(r.plan.candidate_sha256,candidate);
 const modified={...draft,original_work_id:'work:'+'f'.repeat(32)};
 await assert.rejects(prepareOwnerInstalledUpgradeContinuation({
  ...prepArgs,loadDraft:async()=>modified,
 }),/UPGRADE_CONTINUATION_EXACT_SAVED_OWNER_PROOF_REQUIRED/);
});
test('exact service-only reservation readback binds owner and original work approval fingerprint',async()=>{
 const calls=[];
 const response=await readOwnerPreviousVerifiedInstall({
  session,scope,plan,env,
  fetchImpl:async(url,options)=>{
   calls.push({url,options});
   return {ok:true,json:async()=>[{
    reservation_id:grantId,verification_receipt_ref:'github-preview-merge:'+merge,
    action_policy_id:'policy:original',settled_at:'2026-10-28T13:00:00Z',
   }]};
  },
 });
 assert.equal(response.reservation_id,grantId);
 assert.equal(response.merge_commit_sha,merge);
 const expected=fingerprintApprovedWorkItem(exactOwnerUpgradeStageWorkItem({
  session,scope,plan,stage:'INSTALL',env,
 }));
 assert.equal(response.work_fingerprint,expected);
 assert.equal(calls.length,1);
 assert.equal(calls[0].options.method,'POST');
 assert.equal(JSON.parse(calls[0].options.body).p_work_fingerprint,expected);
 assert.equal(calls[0].options.headers.authorization,'Bearer unit-test-fake-not-secret');
});
test('missing verified durable lease cannot trigger another installation',async()=>{
 const r=await readOwnerPreviousVerifiedInstall({
  session,scope,plan,env,fetchImpl:async()=>({
   ok:true,json:async()=>[],
  }),
 }).catch(e=>e.message);
 assert.equal(r,'UPGRADE_CONTINUATION_EXACT_SETTLED_INSTALL_LEASE_MISSING');
});
test('full continuation follows already settled merge through original action to independent final settlement, without a second install',async()=>{
 const p=ports();
 const r=await continueOwnerUpgradeAfterVerifiedInstall({
  ...args,connectPorts:()=>p.adapters,
 });
 assert.equal(r.status,'ORIGINAL_CUSTOMER_ACTION_SETTLED_AFTER_VERIFIED_UPGRADE');
 assert.equal(r.original_job_completed,true);
 assert.equal(r.installation_replayed,false);
 assert.equal(r.prior_install_lease_verified,true);
 assert.equal(r.installed_commit_sha,merge);
 assert.deepEqual(p.calls,['observeInstall','register','readRegistry',
  'readFreshGoal','consumeResumeGrant','resumeOriginal','observeOriginal',
  'settleResumeGrant','appendSettlement','readSettlement']);
});
test('post-merge CI not yet completed is a safe read-only wait and a later retry resumes without remerging',async()=>{
 let ready=false;const p=ports();
 p.adapters.register=async()=>{p.calls.push('register');if(!ready)throw Error('UPGRADE_RUNTIME_EXACT_POST_MERGE_CI_NOT_GREEN')};
 const config={...args,connectPorts:()=>p.adapters};
 const waiting=await continueOwnerUpgradeAfterVerifiedInstall(config);
 assert.equal(waiting.status,'WAITING_FOR_INDEPENDENT_POST_MERGE_CI');
 assert.equal(waiting.safe_to_recheck,true);
 assert.equal(waiting.original_job_completed,false);
 assert.equal(p.calls.includes('resumeOriginal'),false);
 ready=true;
 const completed=await continueOwnerUpgradeAfterVerifiedInstall(config);
 assert.equal(completed.status,'ORIGINAL_CUSTOMER_ACTION_SETTLED_AFTER_VERIFIED_UPGRADE');
 assert.equal(p.calls.includes('install:UNAUTHORIZED'),false);
});
test('separate resume grant is missing: no original action and no reuse of installation grant',async()=>{
 const p=ports();
 p.adapters.consumeResumeGrant=async()=>{p.calls.push('consumeResumeGrant');throw Error('UPGRADE_STAGE_AUTHORITY_NO_USER_APPROVAL')};
 const r=await continueOwnerUpgradeAfterVerifiedInstall({...args,connectPorts:()=>p.adapters});
 assert.equal(r.status,'UNRESOLVED_NO_AUTOMATIC_RETRY');
 assert.equal(r.original_job_completed,false);
 assert.equal(p.calls.includes('resumeOriginal'),false);
});
test('a different installation commit refuses all capability registration, job execution and settlement',async()=>{
 const p=ports();
 const r=await continueOwnerUpgradeAfterVerifiedInstall({
  ...args,readInstall:async()=>({...lease,merge_commit_sha:'c'.repeat(40)}),
  connectPorts:()=>p.adapters,
 });
 assert.equal(r.status,'UNRESOLVED_NO_AUTOMATIC_RETRY');
 assert.equal(r.blocked_at,'INDEPENDENT_INSTALL_RECHECK');
 assert.deepEqual(p.calls,['observeInstall']);
});
