import test from 'node:test';
import assert from 'node:assert/strict';
import {
 prepareGovernedAutonomousUpgrade,executeGovernedAutonomousUpgradeDraft,
} from '../src/reality-governed-autonomous-upgrade-orchestrator-v0.1.js';

const REPO='maloney2323/Reality',ROOT='/repos/'+REPO,
 BASE='experiment/reality-live-durable-adversarial-20261025';
const WORK='work:24cda9611404e9bcb47909976067605c';
const SHA_A='a'.repeat(40),SHA_B='b'.repeat(40),POLICY='c'.repeat(40);
function fixture(){
 const originalWorkItem={id:WORK,continuity_root_id:'root:original',
  worldline_id:'worldline:original',status:'BLOCKED'};
 const candidate={files:[{path:'src/reality-extensions/schedule-notifier.js',
  content:"export function notify(){return 'scheduled';}\n",mode:'100644'}]};
 const verifiedExperiment={
  state:'SANDBOX_VERIFIED',work_item_id:WORK,continuity_root_id:'root:original',
  worldline_id:'worldline:original',production_graph_write_permitted:false,
  capability_id:'extension.schedule-notifier',
  gap_id:'gap:original-work',verification_hash:'d'.repeat(64),
  capability_signature:'verified:signature',
  ephemeral_worldline_id:'worldline:ephemeral:'+'f'.repeat(32),
  frozen_historical_failure_refs:['github:failed-test'],
  capability_contract:{verification_suite_ref:'node-test:extension.schedule-notifier'},
  verification_bundle:{frozen_regression:{passed:true},
   isolated_verification:{verified:true},
   capability_signature:'verified:signature',
   synthesized_capability:candidate},
 };
 const plan=prepareGovernedAutonomousUpgrade({verifiedExperiment,originalWorkItem});
 const ownerApproval={verified_by_server:true,original_work_id:WORK,
  approved_build_id:plan.proposal.build_id,
  approved_candidate_hash:plan.verified_candidate_hash,
  operation:'github:create_isolated_upgrade_pr',
  policy_sha:POLICY,authorization_ref:'policy:verified-owner-consent',
  authorized_by:'authenticated-owner',promotion_authorized:false};
 const consumedReservation={status:'DISPATCHING',single_use_claim_consumed:true,
  original_work_id:WORK,approved_build_id:plan.proposal.build_id,
  approved_candidate_hash:plan.verified_candidate_hash,
  operation:'github:create_isolated_upgrade_pr',repository:REPO,base_ref:BASE,
  pinned_base_sha:SHA_A,authorization_policy_sha:POLICY,
  production_merge_authorized:false};
 return {originalWorkItem,verifiedExperiment,plan,ownerApproval,consumedReservation};
}
function mockGithub(){
 const state={branch:null,sha:SHA_A,files:new Map(),pr:null,writes:[]};
 const get=async path=>{
  if(path===ROOT+'/git/ref/heads/'+BASE)
   return {ref:'refs/heads/'+BASE,object:{sha:SHA_A}};
  if(path===ROOT+'/git/ref/heads/'+state.branch)
   return {ref:'refs/heads/'+state.branch,object:{sha:state.sha}};
  if(path.startsWith(ROOT+'/contents/')){
   const name=path.slice((ROOT+'/contents/').length).split('?')[0];
   if(!state.files.has(name)){const e=new Error('404');e.status=404;throw e;}
   return {type:'file',encoding:'base64',path:name,sha:'blob',
    content:Buffer.from(state.files.get(name),'utf8').toString('base64')};
  }
  if(state.pr&&path===ROOT+'/pulls/'+state.pr.number)
   return {...state.pr,head:{ref:state.branch,sha:SHA_B},base:{ref:BASE},
    draft:true,merged:false};
  throw Error('UNKNOWN_GITHUB_GET');
 };
 const write=async(path,method,body)=>{
  state.writes.push({path,method,body});
  if(path===ROOT+'/git/refs'&&method==='POST'){
   state.branch=body.ref.slice('refs/heads/'.length);
   return {ref:body.ref,object:{sha:SHA_A}};
  }
  if(path.startsWith(ROOT+'/contents/')&&method==='PUT'){
   const name=path.slice((ROOT+'/contents/').length);
   state.files.set(name,Buffer.from(body.content,'base64').toString('utf8'));
   state.sha=SHA_B;
   return {content:{path:name},commit:{sha:SHA_B}};
  }
  if(path===ROOT+'/pulls'&&method==='POST'){
   state.pr={number:1490,html_url:'https://github.com/'+REPO+'/pull/1490'};
   return state.pr;
  }
  throw Error('UNKNOWN_GITHUB_WRITE');
 };
 return {get,write,state};
}
test('existing recovery verification becomes an exact draft-PR plan without any authorization',()=>{
 const {plan,originalWorkItem,verifiedExperiment}=fixture();
 assert.equal(plan.state,'AWAITING_EXACT_DRAFT_PR_AUTHORIZATION');
 assert.equal(plan.original_work_id,WORK);
 assert.equal(plan.verified_experiment_hash,verifiedExperiment.verification_hash);
 assert.equal(plan.proposal.state,'PROPOSED');
 assert.equal(plan.proposal.production_merge_permitted,false);
 assert.equal(plan.original_work_completed,false);
 assert.equal(plan.code_upgrade_executed,false);
 assert.equal(plan.proposal.files[0].content,verifiedExperiment.verification_bundle.synthesized_capability.files[0].content);
});
test('real self-build controller + bounded provider form a complete mock branch → commit → PR path, never a promotion',async()=>{
 const args=fixture();const mock=mockGithub();
 const result=await executeGovernedAutonomousUpgradeDraft({...args,get:mock.get,write:mock.write});
 assert.equal(result.state,'DRAFT_PR_CREATED_CI_AND_PROMOTION_PENDING');
 assert.equal(result.original_work_id,WORK);
 assert.equal(result.draft_pr_verified,true);
 assert.equal(result.github_pr_url,'https://github.com/'+REPO+'/pull/1490');
 assert.equal(result.github_commit_sha,SHA_B);
 assert.equal(result.independent_post_pr_ci_verified,false);
 assert.equal(result.original_work_resumed,false);
 assert.equal(result.original_work_completed,false);
 assert.equal(result.promotion_authorized,false);
 assert.deepEqual(mock.state.writes.map(x=>x.method),['POST','PUT','POST']);
 assert.equal(mock.state.writes.at(-1).body.draft,true);
 assert.equal(mock.state.writes.at(-1).body.base,BASE);
});
test('different owner, changed goal-linked work or unsigned promotion are blocked before any provider effect',async()=>{
 const baseline=fixture();
 const altered=[
  {...baseline,ownerApproval:{...baseline.ownerApproval,verified_by_server:false}},
  {...baseline,ownerApproval:{...baseline.ownerApproval,original_work_id:'work:'+'f'.repeat(32)}},
  {...baseline,ownerApproval:{...baseline.ownerApproval,approved_candidate_hash:'f'.repeat(64)}},
  {...baseline,ownerApproval:{...baseline.ownerApproval,promotion_authorized:true}},
  {...baseline,consumedReservation:{...baseline.consumedReservation,authorization_policy_sha:'e'.repeat(40)}},
  {...baseline,verifiedExperiment:{...baseline.verifiedExperiment,verification_hash:'e'.repeat(64)}},
 ];
 for(const args of altered){
  const mock=mockGithub();
  await assert.rejects(executeGovernedAutonomousUpgradeDraft({
   ...args,get:mock.get,write:mock.write,
  }),/AUTONOMOUS_UPGRADE_EXACT_OWNER_APPROVAL_AND_CONSUMED_LEASE_REQUIRED/);
  assert.equal(mock.state.writes.length,0);
 }
});
test('changed code bytes after verification cannot be promoted as authorized candidate',async()=>{
 const base=fixture(),mock=mockGithub();
 const mutated={...base.plan,proposal:{...base.plan.proposal,files:[
  {...base.plan.proposal.files[0],content:'changed by assistant after approval'},
 ]}};
 await assert.rejects(executeGovernedAutonomousUpgradeDraft({
  ...base,plan:mutated,get:mock.get,write:mock.write,
 }),/AUTONOMOUS_UPGRADE_CANDIDATE_CHANGED/);
 assert.equal(mock.state.writes.length,0);
});
test('a fabricated capability gap or wrong worldline cannot enter the pipeline',()=>{
 const base=fixture();
 for(const data of [
  {...base.verifiedExperiment,state:'SANDBOX_PROPOSED'},
  {...base.verifiedExperiment,worldline_id:'other-world'},
  {...base.verifiedExperiment,work_item_id:'work:'+'f'.repeat(32)},
  {...base.verifiedExperiment,verification_bundle:{
   ...base.verifiedExperiment.verification_bundle,frozen_regression:{passed:false}}},
 ]){
  assert.throws(()=>prepareGovernedAutonomousUpgrade({
   verifiedExperiment:data,originalWorkItem:base.originalWorkItem,
  }),/AUTONOMOUS_UPGRADE_ORIGINAL_WORK_AND_SANDBOX_REQUIRED/);
 }
});
