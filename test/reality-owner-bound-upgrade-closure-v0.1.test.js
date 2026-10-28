import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {prepareOwnerBoundUpgradeClosure,executeOwnerBoundUpgradeClosure}
 from '../src/reality-owner-bound-upgrade-closure-v0.1.js';
import {issueUpgradeEvidenceWarrant,hashUpgradeEvidence}
 from '../src/reality-upgrade-evidence-warrant-v0.1.js';
import {fingerprintGovernedUpgradeCandidate}
 from '../src/reality-governed-github-upgrade-provider-v0.1.js';
const owner=randomUUID(),conversationId=randomUUID(),workId='work:'+'a'.repeat(32);
const sourceHash='b'.repeat(64),headSha='c'.repeat(40),baseSha='d'.repeat(40);
const capabilityId='extension.original-work-parser';
const originalGoalId='user-goal:'+'e'.repeat(32);
const goalRevision='goal-receipt:42';
const root='continuity:original',worldline='worldline:original';
const env={VERCEL_ENV:'preview',
 REALITY_CHAT_RECEIPT_HMAC_KEY:'a-server-side-secret-not-for-frontend-1234567890123'};
const session={user_id:owner};
const plan=Object.freeze({
 version:'reality-owner-bound-upgrade-closure-v0.1',
 state:'AWAITING_SEPARATE_INSTALLATION_AUTHORIZATION',
 owner_id:owner,conversation_id:conversationId,original_work_id:workId,
 original_goal_id:originalGoalId,goal_revision:goalRevision,
 continuity_root_id:root,worldline_id:worldline,capability_id:capabilityId,
 candidate_sha256:sourceHash,verified_experiment_hash:'f'.repeat(64),
 warrant_id:'warrant:'+'3'.repeat(64),
 github_pr_number:1550,github_pr_url:'https://github.com/maloney2323/Reality/pull/1550',
 github_branch:'reality/build/build-'+'1'.repeat(32),
 github_head_sha:headSha,pinned_base_sha:baseSha,
 verified_ci_runs:[{run_id:101},{run_id:102}],
 customer_installation_authorized:false,capability_installed:false,
 original_job_resumed:false,original_job_completed:false,
});
const args={session,conversationId,originalWorkId:workId,env,prepare:async()=>plan};
const scope={owner_id:owner,conversation_id:conversationId,original_work_id:workId,
 goal_revision:goalRevision,candidate_sha256:sourceHash,head_sha:headSha};
const installGrantId=randomUUID(),resumeGrantId=randomUUID();
function fakePorts(){
 const calls=[];
 const wrap=(name,fn)=>async a=>{calls.push(name);return fn(a);};
 const installed={...scope,independent:true,installed:true,
  github_pr_number:1550,base_ref:'experiment/reality-live-durable-adversarial-20261025',
  exact_candidate_files_verified:true,merge_commit_sha:'4'.repeat(40),
  production_deployment_performed:false};
 const outcome={...scope,independent:true,original_job_completed:true,
  original_goal_id:originalGoalId,work_id:workId,capability_sha256:sourceHash,
  execution_receipt_id:'execution:original:123',evidence_ref:'github:issue:234'};
 const ports={
  consumeInstallGrant:wrap('consumeInstallGrant',()=>({
   ...scope,status:'CONSUMED_ONCE',operation:'github:install_exact_verified_upgrade',
   repository:'maloney2323/Reality',
   base_ref:'experiment/reality-live-durable-adversarial-20261025',
   github_pr_number:1550,authorized_by:owner,
   separate_from_draft_authorization:true,grant_id:installGrantId,
   promotion_only:true,
  })),
  install:wrap('install',()=>({requested:true,ref:'provider:issued'})),
  observeInstall:wrap('observeInstall',()=>installed),
  register:wrap('register',()=>({requested:true})),
  readRegistry:wrap('readRegistry',()=>({
   ...scope,registered:true,runtime_active:true,
   capability_id:capabilityId,merge_commit_sha:installed.merge_commit_sha,
   independently_reobserved:true,
  })),
  readFreshGoal:wrap('readFreshGoal',()=>({
   principal_id:owner,conversation_id:conversationId,active_goal_id:originalGoalId,
   goal_revision:goalRevision,active:true,user_confirmed:true,
   original_job_completed:false,
  })),
  consumeResumeGrant:wrap('consumeResumeGrant',()=>({
   ...scope,status:'CONSUMED_ONCE',operation:'resume_original_work',
   authorized_by:owner,original_goal_id:originalGoalId,
   grant_id:resumeGrantId,separate_from_install_authorization:true,
  })),
  resumeOriginal:wrap('resumeOriginal',()=>({execution_id:'execution:original:123'})),
  observeOriginal:wrap('observeOriginal',()=>outcome),
  appendSettlement:wrap('appendSettlement',()=>({event_id:'receipt:original:123'})),
  readSettlement:wrap('readSettlement',()=>({
   ...scope,original_goal_id:originalGoalId,continuity_root_id:root,
   worldline_id:worldline,original_job_completed:true,independently_reobserved:true,
   execution_receipt_id:outcome.execution_receipt_id,
   evidence_ref:outcome.evidence_ref,capability_sha256:sourceHash,
   settlement_receipt_id:'receipt:original:123',
  })),
 };
 return {ports,calls};
}
test('complete original owner-bound loop requires two grants and 3 independent readbacks',async()=>{
 const {ports,calls}=fakePorts();
 const r=await executeOwnerBoundUpgradeClosure({...args,ports});
 assert.equal(r.status,'ORIGINAL_CUSTOMER_JOB_SETTLED_AFTER_VERIFIED_UPGRADE');
 assert.equal(r.original_work_id,workId);
 assert.equal(r.original_job_completed,true);
 assert.equal(r.independent_install_readback,true);
 assert.equal(r.independent_job_readback,true);
 assert.equal(r.durable_settlement_readback,true);
 assert.equal(r.production_deployment_performed,false);
 assert.deepEqual(calls,['consumeInstallGrant','install','observeInstall','register',
  'readRegistry','readFreshGoal','consumeResumeGrant','resumeOriginal','observeOriginal',
  'appendSettlement','readSettlement']);
});
test('no effect adapters or browser-shaped plan can begin the loop',async()=>{
 const {ports,calls}=fakePorts();delete ports.observeInstall;
 await assert.rejects(executeOwnerBoundUpgradeClosure({...args,ports}),
  /UPGRADE_CLOSURE_ADAPTER_MISSING_observeInstall/);
 assert.equal(calls.length,0);
 await assert.rejects(executeOwnerBoundUpgradeClosure({
  ...args,ports:fakePorts().ports,prepare:async()=>({...plan,state:'READY'}),
 }),/UPGRADE_CLOSURE_FRESH_PREPARED_PROOF_REQUIRED/);
});
test('missing or forged installation grant prevents all provider changes',async()=>{
 for(const mutate of [
  x=>({...x,grant_id:'bad'}),
  x=>({...x,separate_from_draft_authorization:false}),
  x=>({...x,candidate_sha256:'0'.repeat(64)}),
  x=>({...x,original_work_id:'work:'+'f'.repeat(32)}),
  x=>({...x,operation:'github:create_isolated_upgrade_pr'}),
  x=>({...x,repository:'attacker/repo'}),
  x=>({...x,authorized_by:randomUUID()}),
  x=>({...x,status:'RESERVED_NOT_DISPATCHED'}),
 ]){
  const {ports,calls}=fakePorts(),f=ports.consumeInstallGrant;
  ports.consumeInstallGrant=async a=>mutate(await f(a));
  const r=await executeOwnerBoundUpgradeClosure({...args,ports});
  assert.equal(r.status,'UNRESOLVED_NO_AUTOMATIC_RETRY');
  assert.equal(r.blocked_at,'INSTALL_GRANT');
  assert.equal(r.original_job_completed,false);
  assert.deepEqual(calls,['consumeInstallGrant']);
 }
});
test('failed installation, forged readback or changed installed source never resumes',async()=>{
 for(const mutate of [
  ()=>{throw Error('NETWORK_TIMEOUT')},
  x=>({...x,independent:false}),
  x=>({...x,exact_candidate_files_verified:false}),
  x=>({...x,candidate_sha256:'7'.repeat(64)}),
  x=>({...x,production_deployment_performed:true}),
  x=>({...x,merge_commit_sha:'bad'}),
 ]){
  const {ports,calls}=fakePorts();
  if(mutate.length===0)ports.install=async()=>{calls.push('install');return mutate()};
  else{const f=ports.observeInstall;ports.observeInstall=async a=>mutate(await f(a));}
  const r=await executeOwnerBoundUpgradeClosure({...args,ports});
  assert.equal(r.status,'UNRESOLVED_NO_AUTOMATIC_RETRY');
  assert.equal(r.external_effect_may_have_occurred,true);
  assert.equal(r.original_job_completed,false);
  assert.equal(calls.includes('resumeOriginal'),false);
  assert.equal(calls.includes('appendSettlement'),false);
 }
});
test('registry readback must show exact active capability',async()=>{
 for(const mutate of [
  x=>({...x,registered:false}),x=>({...x,runtime_active:false}),
  x=>({...x,capability_id:'wrong'}),x=>({...x,independently_reobserved:false}),
  x=>({...x,merge_commit_sha:'0'.repeat(40)}),
 ]){
  const {ports,calls}=fakePorts(),f=ports.readRegistry;
  ports.readRegistry=async a=>mutate(await f(a));
  const r=await executeOwnerBoundUpgradeClosure({...args,ports});
  assert.equal(r.status,'UNRESOLVED_NO_AUTOMATIC_RETRY');
  assert.equal(r.blocked_at,'REGISTRY_READBACK');
  assert.equal(calls.includes('resumeOriginal'),false);
 }
});
test('stale goal or missing second authorization never reexecutes original task',async()=>{
 for(const mutate of [
  x=>({...x,goal_revision:'newer-goal'}),
  x=>({...x,active:false}),x=>({...x,user_confirmed:false}),
  x=>({...x,original_job_completed:true}),
 ]){
  const {ports,calls}=fakePorts(),f=ports.readFreshGoal;
  ports.readFreshGoal=async a=>mutate(await f(a));
  const r=await executeOwnerBoundUpgradeClosure({...args,ports});
  assert.equal(r.status,'UNRESOLVED_NO_AUTOMATIC_RETRY');
  assert.equal(r.blocked_at,'FRESH_ORIGINAL_GOAL');
  assert.equal(calls.includes('resumeOriginal'),false);
 }
 for(const mutate of [
  x=>({...x,grant_id:installGrantId}),
  x=>({...x,operation:'github:install_exact_verified_upgrade'}),
  x=>({...x,separate_from_install_authorization:false}),
  x=>({...x,original_work_id:'work:'+'f'.repeat(32)}),
 ]){
  const {ports,calls}=fakePorts(),f=ports.consumeResumeGrant;
  ports.consumeResumeGrant=async a=>mutate(await f(a));
  const r=await executeOwnerBoundUpgradeClosure({...args,ports});
  assert.equal(r.status,'UNRESOLVED_NO_AUTOMATIC_RETRY');
  assert.equal(r.blocked_at,'RESUME_GRANT');
  assert.equal(calls.includes('resumeOriginal'),false);
 }
});
test('claimed completion without independent original provider readback cannot settle',async()=>{
 for(const mutate of [
  x=>({...x,original_job_completed:false}),
  x=>({...x,independent:false}),
  x=>({...x,execution_receipt_id:null}),
  x=>({...x,work_id:'work:'+'9'.repeat(32)}),
  x=>({...x,capability_sha256:'0'.repeat(64)}),
 ]){
  const {ports,calls}=fakePorts(),f=ports.observeOriginal;
  ports.observeOriginal=async a=>mutate(await f(a));
  const r=await executeOwnerBoundUpgradeClosure({...args,ports});
  assert.equal(r.status,'UNRESOLVED_NO_AUTOMATIC_RETRY');
  assert.equal(r.blocked_at,'ORIGINAL_OBSERVATION');
  assert.equal(r.original_job_completed,false);
  assert.equal(calls.includes('appendSettlement'),false);
 }
});
test('no durable continuity readback means job cannot be marked completed',async()=>{
 for(const mutate of [
  x=>({...x,original_job_completed:false}),
  x=>({...x,worldline_id:'foreign'}),
  x=>({...x,independently_reobserved:false}),
  x=>({...x,settlement_receipt_id:null}),
  x=>({...x,execution_receipt_id:'wrong'}),
 ]){
  const {ports,calls}=fakePorts(),f=ports.readSettlement;
  ports.readSettlement=async a=>mutate(await f(a));
  const r=await executeOwnerBoundUpgradeClosure({...args,ports});
  assert.equal(r.status,'UNRESOLVED_NO_AUTOMATIC_RETRY');
  assert.equal(r.blocked_at,'SETTLEMENT_READBACK');
  assert.equal(r.original_job_completed,false);
  assert.ok(calls.includes('appendSettlement'));
 }
});
function verifiedSource(){
 const originalWorkItem={id:workId,continuity_root_id:root,worldline_id:worldline};
 const files=[{path:'src/reality-extensions/original-work-parser.js',
  mode:'100644',content:'export function parse(){return true;}\n'}];
 const experiment={state:'SANDBOX_VERIFIED',
  capability_id:capabilityId,work_item_id:workId,
  continuity_root_id:root,worldline_id:worldline,
  experiment_hash:'6'.repeat(64),
  capability_signature:'signed:test',production_graph_write_permitted:false,
  ephemeral_worldline_id:'worldline:ephemeral:'+'9'.repeat(32),
  synthesized_capability:{files},
  verification_bundle:{experiment_hash:'6'.repeat(64),
   synthesized_capability:{files},frozen_regression:{passed:true},
   isolated_verification:{verified:true},capability_signature:'signed:test'},
 };
 experiment.verification_hash=hashUpgradeEvidence(experiment.verification_bundle);
 const receipt={status:'INDEPENDENT_SANDBOX_VERIFIED',work_item_id:workId,
  experiment_hash:experiment.experiment_hash,
  verification_hash:experiment.verification_hash,
  candidate_sha256:fingerprintGovernedUpgradeCandidate(files),
  frozen_regression_sha256:hashUpgradeEvidence(experiment.verification_bundle.frozen_regression),
  holdout:{passed:true,case_count:2,result_sha256:'1'.repeat(64)},
  isolation:{production_write_permitted:false,secrets_accessible:false},
  verifier_run_ref:'github:independent:source'};
 const checkpoint=randomUUID();
 const warrant=issueUpgradeEvidenceWarrant({
  experiment,originalWorkItem,blockedCheckpointId:checkpoint,
  goalRevision,ownerId:owner,conversationId,baseCommitSha:baseSha,
  verifierReceipt:receipt,env,
 });
 return {owner_id:owner,conversation_id:conversationId,
  original_work_id:workId,original_goal_id:originalGoalId,
  goal_revision:goalRevision,persisted_and_reobserved:true,
  external_action_authorized:false,original_job_completed:false,
  originalWorkItem,verifiedExperiment:experiment,verifierReceipt:receipt,
  blocked_checkpoint_receipt_id:checkpoint,evidence_warrant:warrant,
  evidence_warrant_id:warrant.warrant_id};
}
function draftAndCI(){
 const s=verifiedSource(),candidate=s.verifierReceipt.candidate_sha256;
 const draft={owner_id:owner,conversation_id:conversationId,
  original_work_id:workId,goal_revision:goalRevision,
  candidate_sha256:candidate,verification_hash:s.verifiedExperiment.verification_hash,
  warrant_id:s.evidence_warrant_id,durably_recorded:true,
  independently_reobserved:true,draft_pr_verified:true,
  reservation_status:'VERIFIED',production_merge_authorized:false,
  capability_installed:false,original_job_completed:false,
  pinned_base_sha:baseSha,github_pr_number:1550,
  github_commit_sha:headSha,github_branch:'reality/build/build-'+'1'.repeat(32)};
 const repo='maloney2323/Reality';
 const root='https://api.github.com/repos/'+repo;
 const responses=new Map([
  [root+'/pulls/1550',{number:1550,state:'open',draft:true,merged:false,
   html_url:'https://github.com/'+repo+'/pull/1550',
   head:{ref:draft.github_branch,sha:headSha,repo:{full_name:repo}},
   base:{ref:'experiment/reality-live-durable-adversarial-20261025',sha:baseSha,
    repo:{full_name:repo}},created_at:'2026-10-28T04:00:00Z'}],
 ]);
 for(let [i,name] of ['Governed Autonomous Self-Upgrading Provider v0.1',
   'Reality Governed Execution Engine v0.1'].entries()){
  const id=101+i;
  responses.set(root+'/actions/runs/'+id,{id,name,workflow_id:100+id,
   repository:{full_name:repo},head_repository:{full_name:repo},
   head_sha:headSha,head_branch:draft.github_branch,
   status:'completed',conclusion:'success',event:'pull_request',
   created_at:'2026-10-28T04:01:00Z',
   html_url:'https://github.com/'+repo+'/actions/runs/'+id});
 }
 const fetchImpl=async url=>({ok:responses.has(url),
  json:async()=>responses.get(url)});
 return {s,draft,fetchImpl,responses};
}
test('fresh signed warrant + durable PR + two exact green GitHub readbacks prepares only approval request',async()=>{
 const x=draftAndCI();
 const r=await prepareOwnerBoundUpgradeClosure({
  session,conversationId,originalWorkId:workId,env,
  loadTrustedUpgrade:async()=>x.s,
  loadVerifiedDraft:async()=>x.draft,
  ciRunIds:[101,102],fetchImpl:x.fetchImpl,
 });
 assert.equal(r.state,'AWAITING_SEPARATE_INSTALLATION_AUTHORIZATION');
 assert.equal(r.original_work_id,workId);
 assert.equal(r.customer_installation_authorized,false);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.verified_ci_runs.length,2);
});
test('old warrant, unsigned source and switched draft cannot be promoted',async()=>{
 const x=draftAndCI();
 for(const change of [
  {loadTrustedUpgrade:async()=>({...x.s,evidence_warrant:{
   ...x.s.evidence_warrant,signature:'0'.repeat(64)}}),
   loadVerifiedDraft:async()=>x.draft,ciRunIds:[101,102]},
  {loadTrustedUpgrade:async()=>x.s,
   loadVerifiedDraft:async()=>({...x.draft,candidate_sha256:'0'.repeat(64)}),
   ciRunIds:[101,102]},
  {loadTrustedUpgrade:async()=>x.s,
   loadVerifiedDraft:async()=>x.draft,ciRunIds:[101,101]},
 ]){
  await assert.rejects(prepareOwnerBoundUpgradeClosure({
   session,conversationId,originalWorkId:workId,env,
   fetchImpl:x.fetchImpl,...change,
  }),/UPGRADE_CLOSURE_|UPGRADE_CI_/);
 }
});
