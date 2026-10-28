import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {exactOwnerUpgradeStageWorkItem,prepareOwnerUpgradeStageApproval,
 consumeOwnerUpgradeInstallGrant,consumeOwnerUpgradeResumeGrant}
 from '../src/reality-owner-upgrade-stage-authority-v0.1.js';
import {fingerprintApprovedWorkItem}
 from '../src/reality-authority-v1.0.js';
import {verifyPersonalWorkGroundingProof}
 from '../src/reality-personal-work-grounding-proof-v0.1.js';
const owner=randomUUID(),conversationId=randomUUID(),workId='work:'+'3'.repeat(32);
const env={VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CHAT_RECEIPT_HMAC_KEY:'test-user-approval-binding-secret-never-real-1234567890'};
const session={user_id:owner},transitionId=randomUUID();
const plan={
 state:'AWAITING_SEPARATE_INSTALLATION_AUTHORIZATION',
 owner_id:owner,conversation_id:conversationId,original_work_id:workId,
 original_goal_id:'goal-original-30',goal_revision:transitionId,
 candidate_sha256:'4'.repeat(64),github_head_sha:'5'.repeat(40),
 pinned_base_sha:'6'.repeat(40),github_pr_number:1550,
 capability_id:'extension:job-repair',warrant_id:'warrant:'+'7'.repeat(64)};
const scope={
 ownerId:owner,conversationId,workId,goalRevision:transitionId,
 candidateSha:plan.candidate_sha256,headSha:plan.github_head_sha,
 pinnedBaseSha:plan.pinned_base_sha,githubPrNumber:plan.github_pr_number,
 base:'experiment/reality-live-durable-adversarial-20261025',
};
const installed={original_work_id:workId,candidate_sha256:plan.candidate_sha256,
 independent:true,installed:true,exact_candidate_files_verified:true,
 merge_commit_sha:'8'.repeat(40),production_deployment_performed:false};
const args={session,scope,plan,env};
function goal(){
 return {principal_id:owner,continuity_root_id:'root:goal',
  world_id:'world:goal',authority_source:'AUTHENTICATED_RLS_USER_GOAL_COMMAND_AND_LEDGER_READBACK',
  assistant_can_mutate_goals:false,semantic_reviewer_can_mutate_goals:false,
  external_execution_authorized:false,
  transition_count:3,
  active_goal_id:plan.original_goal_id,
  active_goal:{goal_id:plan.original_goal_id,status:'ACTIVE',
   user_confirmed:true,external_execution_authorized:false,
   source_user_message_ref:'message:user:1',
   last_transition_receipt_id:transitionId},
  recent_transition_receipts:[{event_id:transitionId,
   confirmed_by_user:true,principal_id:owner}]};
}
test('stage operations reuse existing recognized governed work classification and have distinct fingerprints',()=>{
 const i=exactOwnerUpgradeStageWorkItem({...args,stage:'INSTALL'});
 const r=exactOwnerUpgradeStageWorkItem({...args,stage:'RESUME',installed});
 assert.equal(i.operation,'install_exact_verified_upgrade');
 assert.equal(r.operation,'resume_original_work');
 assert.notEqual(fingerprintApprovedWorkItem(i),fingerprintApprovedWorkItem(r));
 assert.equal(i.inputs.original_work_id,workId);
 assert.equal(r.inputs.verified_install_commit_sha,installed.merge_commit_sha);
});
test('read-only owner approval preparation binds the exact authorized goal without executing',async()=>{
 const proposal=await prepareOwnerUpgradeStageApproval({
  ...args,conversationId,stage:'INSTALL',
  readGoal:async()=>({principal_id:owner,conversation_id:conversationId,
   state:goal()}),
 });
 assert.equal(proposal.state,'AWAITING_EXACT_STAGE_OWNER_APPROVAL');
 assert.equal(proposal.external_action_authorized,false);
 assert.equal(proposal.external_action_performed,false);
 const proof=verifyPersonalWorkGroundingProof({
  proof:proposal.grounding_proof,principalId:owner,conversationId,env});
 assert.equal(proof.status,'PROOF_VALID_FOR_FRESHNESS_ONLY');
 assert.equal(proof.binding.work_item_fingerprint,proposal.work_fingerprint);
});
test('old goal or missing genuine installed readback refuses even preparation',async()=>{
 await assert.rejects(prepareOwnerUpgradeStageApproval({
  ...args,conversationId,stage:'INSTALL',
  readGoal:async()=>({principal_id:owner,conversation_id:conversationId,
   state:{...goal(),active_goal:{...goal().active_goal,
    last_transition_receipt_id:randomUUID()}}}),
 }),/UPGRADE_STAGE_AUTHORITY_ORIGINAL_GOAL_NOT_CURRENT/);
 assert.throws(()=>exactOwnerUpgradeStageWorkItem({
  ...args,stage:'RESUME',
 }),/UPGRADE_STAGE_AUTHORITY_INDEPENDENT_INSTALL_REQUIRED/);
 assert.throws(()=>exactOwnerUpgradeStageWorkItem({
  ...args,stage:'RESUME',installed:{...installed,independent:false},
 }),/UPGRADE_STAGE_AUTHORITY_INDEPENDENT_INSTALL_REQUIRED/);
});
function setup(stage,extra={}){
 const item=exactOwnerUpgradeStageWorkItem({...args,stage,installed:stage==='RESUME'?installed:null});
 const fingerprint=fingerprintApprovedWorkItem(item);
 const receipt=randomUUID(),calls=[];
 const reserved={status:'SINGLE_USE_RESERVED_PENDING_DISPATCH',
  work_item_fingerprint:fingerprint,reservation_id:receipt,
  internal:{reservation:{status:'RESERVED_NOT_DISPATCHED'},
   authorization:{authorized:true},
   serverFreshGoalAdmission:{
    principal_id:owner,conversation_id:conversationId,work_item_fingerprint:fingerprint},
   store:{begin:async({reservationId})=>{
    calls.push('atomic-begin');return {
     status:'DISPATCHING',reservation_id:reservationId,single_use_claim_consumed:true};
   },settle:async()=>({status:'VERIFIED'})}},
 };
 const prepare=async()=>{calls.push('trusted-prepare');return {
  state:'AWAITING_EXACT_STAGE_OWNER_APPROVAL',stage,
  original_work_id:workId,work_fingerprint:fingerprint,
  work_item:item,grounding_proof:{signed:'mock-only'},
  external_action_authorized:false,
 }};
 const reserve=async x=>{calls.push('existing-approval-and-atomic-reserve');
  assert.equal(x.workItem.operation,item.operation);
  assert.equal(fingerprintApprovedWorkItem(x.workItem),fingerprint);
  return {...reserved,...extra};
 };
 return {prepare,reserve,calls,receipt,expectedFingerprint:fingerprint};
}
test('install uses one verified action approval and exactly one atomic claim, no GitHub effect',async()=>{
 const x=setup('INSTALL');
 const grant=await consumeOwnerUpgradeInstallGrant({...args,prepare:x.prepare,reserve:x.reserve});
 assert.equal(grant.status,'CONSUMED_ONCE');
 assert.equal(grant.operation,'github:install_exact_verified_upgrade');
 assert.equal(grant.original_work_id,workId);
 assert.equal(grant.grant_id,x.receipt);
 assert.equal(grant.separate_from_draft_authorization,true);
 assert.equal(grant.execution_reservation_settlement_pending,true);
 assert.deepEqual(x.calls,['trusted-prepare','existing-approval-and-atomic-reserve','atomic-begin']);
});
test('resume requires independent install plus distinct one-use exact work grant',async()=>{
 const x=setup('RESUME');
 const r=await consumeOwnerUpgradeResumeGrant({...args,installed,prepare:x.prepare,reserve:x.reserve});
 assert.equal(r.operation,'resume_original_work');
 assert.equal(r.separate_from_install_authorization,true);
 assert.equal(r.promotion_only,false);
 assert.equal(r.grant_id,x.receipt);
});
test('wrong approved fingerprint never consumes an atomic reservation',async()=>{
 const x=setup('INSTALL',{work_item_fingerprint:'sha256:'+'e'.repeat(64)});
 await assert.rejects(consumeOwnerUpgradeInstallGrant({
  ...args,prepare:x.prepare,reserve:x.reserve,
 }),/UPGRADE_STAGE_AUTHORITY_DURABLE_ATOMIC_RESERVATION_REQUIRED/);
 assert.deepEqual(x.calls,['trusted-prepare','existing-approval-and-atomic-reserve']);
});
test('failed or unconfirmed database begin never returns an owner grant',async()=>{
 const x=setup('INSTALL');
 const reserve=async q=>{
  const r=await x.reserve(q);
  return {...r,internal:{...r.internal,store:{
   ...r.internal.store,begin:async()=>({status:'UNCERTAIN'})}}};
 };
 await assert.rejects(consumeOwnerUpgradeInstallGrant({
  ...args,prepare:x.prepare,reserve,
 }),/UPGRADE_STAGE_AUTHORITY_ONE_TIME_CLAIM_NOT_CONSUMED/);
});
test('invalid signed-in owner, changed branch and absent stage approval stop before reserving',async()=>{
 const x=setup('INSTALL');
 for(const change of [
  {session:{user_id:randomUUID()}},
  {scope:{...scope,candidateSha:'a'.repeat(64)}},
  {scope:{...scope,pinnedBaseSha:'b'.repeat(40)}},
  {env:{VERCEL_ENV:'production'}},
 ]){
  const y={...args,...change,prepare:x.prepare,reserve:x.reserve};
  await assert.rejects(consumeOwnerUpgradeInstallGrant(y),
   /UPGRADE_STAGE_AUTHORITY_/);
 }
 assert.equal(x.calls.length,0);
});
