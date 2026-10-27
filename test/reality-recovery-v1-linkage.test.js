import test from 'node:test';
import assert from 'node:assert/strict';
import {
 runAutonomousClosurePass,
} from '../src/reality-autonomous-closure-orchestrator-v1.0.js';
import {
 detectCapabilityGap,confirmCapabilityGap,createSandboxExperiment,
 authorizeSandboxExperiment,validateSandboxResult,
 authorizeWorldlineMerge,registerVerifiedCapability,reactivationPlan,
 handleSynthesisFailure,
} from '../src/reality-autonomous-capability-loop-v1.0.js';

const original=Object.freeze({
 id:'work:original-ci-repair',continuity_root_id:'root:recovery',
 worldline_id:'worldline:recovery',status:'BLOCKED',
 missing_capabilities:['git.repair.workflow'],
 capability_contract:{verification_suite_ref:'tests:ci-regression'},
});
const universe=()=>({
 worldId:'world:recovery',continuityRootId:original.continuity_root_id,
 worldlineId:original.worldline_id,
 work:[{id:original.id,status:'BLOCKED',
  missing_capabilities:[...original.missing_capabilities]}],
 capabilities:[],particles:[],evidence:[],
});
const required={
 workItem:original,universe:universe(),
 historicalFailureRefs:['github:actions:run:1','github:actions:run:2'],
 verificationSuiteRef:'tests:frozen-regression',
 inputSchema:{type:'object'},outputSchema:{type:'object'},
};
const authorize=()=>({authorizationRef:'sandbox:authorized:one',
 authorizedBy:'test-sandbox-owner'});
const spies=()=>({
 synthesisCalls:0,verifyCalls:0,mergeCheckCalls:0,mergeCalls:0,registerCalls:0,
});
const mocks=(s=spies(),overrides={})=>{
 const synthesis={async run({experiment,production_graph_write_permitted}){
  s.synthesisCalls++;
  assert.equal(production_graph_write_permitted,false);
  assert.equal(experiment.work_item_id,original.id);
  return {id:'git.repair.workflow',revision:'candidate-v1'};
 }};
 const sandboxVerifier={async verify({experiment}){
  s.verifyCalls++;
  assert.equal(experiment.primary_worldline_id,original.worldline_id);
  return {frozen_regression:{passed:true},
   isolated_verification:{verified:true},
   capability_signature:'test-only-signature'};
 }};
 const mergeVerifier={
  async verify(experiment){
   s.mergeCheckCalls++;
   return {approved:true,verification_hash:experiment.verification_hash,
    target_worldline_id:experiment.primary_worldline_id};
  },
  async merge(experiment){
   s.mergeCalls++;
   return {merged:true,verification_hash:experiment.verification_hash,
    target_worldline_id:experiment.primary_worldline_id};
  },
 };
 const capabilityRegistry={register(input){
  s.registerCalls++;
  assert.equal(input.original_work_item_id,original.id);
  return {registered:true,capability_id:input.capability_id,
   verification_hash:input.verification_hash};
 }};
 return {synthesis,sandboxVerifier,mergeVerifier,capabilityRegistry,...overrides};
};
const ready=async()=>{
 const s=spies(),m=mocks(s);
 const pending=await runAutonomousClosurePass({...required,...m,authorization:authorize()});
 assert.equal(pending.state,'AWAITING_PROMOTION_AUTHORIZATION');
 return {pending,spies:s,mocks:m};
};
function promotion(experiment){
 return {approved:true,authorization_ref:'owner:promotion:exact',
  authorized_by:'authenticated-owner',
  original_work_item_id:original.id,
  verification_hash:experiment.verification_hash,
  target_worldline_id:original.worldline_id};
}

test('v1 missing imports are now resolved and gap projects exact same work',async()=>{
 const result=await runAutonomousClosurePass({...required});
 assert.equal(result.state,'AWAITING_AUTHORIZATION');
 assert.equal(result.gap.work_item_id,original.id);
 assert.equal(result.experiment.primary_worldline_id,original.worldline_id);
 assert.equal(result.experiment.production_graph_write_permitted,false);
});
test('without a real gap there is no synthesis or implied job completion',async()=>{
 const s=spies(),m=mocks(s);
 const result=await runAutonomousClosurePass({...required,
  universe:{...universe(),work:[]},...m});
 assert.equal(result.state,'NO_CAPABILITY_GAP');
 assert.equal(s.synthesisCalls,0);
 assert.equal(s.mergeCalls,0);
});
test('sandbox authorization alone NEVER allows upgrade merge',async()=>{
 const {pending,spies:s}=await ready();
 assert.equal(pending.upgrade_verified_in_sandbox,true);
 assert.equal(pending.promotion_authorized,false);
 assert.equal(pending.original_work_executed,false);
 assert.equal(pending.job_completed,false);
 assert.equal(s.synthesisCalls,1);
 assert.equal(s.verifyCalls,1);
 assert.equal(s.mergeCalls,0);
 assert.equal(s.registerCalls,0);
});
test('exact separate promotion authorization is tied to original work, hash and target',async()=>{
 const {pending,mocks:m}=await ready();
 for(const bad of [
  {...promotion(pending.experiment),original_work_item_id:'work:other'},
  {...promotion(pending.experiment),verification_hash:'tampered'},
  {...promotion(pending.experiment),target_worldline_id:'worldline:other'},
  {...promotion(pending.experiment),approved:false},
 ]){
  await assert.rejects(
   runAutonomousClosurePass({...required,...m,authorization:authorize(),
    promotionAuthorization:bad}),
   /EXACT_SEPARATE_PROMOTION_AUTHORIZATION_REQUIRED/
  );
 }
});
test('an approved, verified adapter merge yields a plan to resume SAME job, never a completion claim',async()=>{
 const {pending}=await ready();
 const counters=spies(),adapters=mocks(counters);
 const r=await runAutonomousClosurePass({...required,...adapters,
  authorization:authorize(),promotionAuthorization:promotion(pending.experiment)});
 assert.equal(r.state,'REACTIVATION_READY');
 assert.equal(r.registration.registration.registered,true);
 assert.equal(r.reactivation.original_work_item_id,original.id);
 assert.equal(r.reactivation.original_continuity_root_id,original.continuity_root_id);
 assert.equal(r.reactivation.original_worldline_id,original.worldline_id);
 assert.equal(r.reactivation.execution_authorized,false);
 assert.equal(r.reactivation.original_work_executed,false);
 assert.equal(r.reactivation.job_completed,false);
 assert.equal(r.continuation_requires_fresh_work_authorization,true);
 assert.equal(counters.mergeCalls,1);
 assert.equal(counters.registerCalls,1);
});
test('missing verification or failed synthesis never reaches promotion',async()=>{
 const s=spies();
 const m=mocks(s,{sandboxVerifier:{async verify(){s.verifyCalls++;return {
   frozen_regression:{passed:false},isolated_verification:{verified:true},
   capability_signature:'test-signature'};
 }}});
 const r=await runAutonomousClosurePass({...required,...m,
  authorization:authorize(),attempt:3,attemptLimit:3});
 assert.equal(r.state,'ESCALATED');
 assert.equal(r.failure.human_review_required,true);
 assert.equal(r.original_work_executed,false);
 assert.equal(s.mergeCalls,0);
});
test('an uncertain merge is never silently retried as another synthesis',async()=>{
 const s=spies();
 const m=mocks(s,{mergeVerifier:{
  async verify(experiment){return {approved:true,
   verification_hash:experiment.verification_hash,
   target_worldline_id:experiment.primary_worldline_id};},
  async merge(){s.mergeCalls++;throw Error('PROVIDER_TIMEOUT_AFTER_WRITE');},
 }});
 const {pending}=await ready();
 const r=await runAutonomousClosurePass({...required,...m,
  authorization:authorize(),promotionAuthorization:promotion(pending.experiment)});
 assert.equal(r.state,'MERGE_OR_REGISTRATION_OUTCOME_UNCERTAIN');
 assert.equal(r.retry_allowed,false);
 assert.equal(r.read_only_reconciliation_required,true);
 assert.equal(r.original_work_executed,false);
 assert.equal(s.mergeCalls,1);
});
test('cross-worldline original work is blocked before capability acquisition',async()=>{
 await assert.rejects(runAutonomousClosurePass({
  ...required,workItem:{...original,worldline_id:'other-worldline'},
  authorization:authorize(),
 }),/ORIGINAL_WORK_UNIVERSE_SCOPE_MISMATCH/);
});
test('recovery primitives cannot reactivate different original task',()=>{
 const gap=detectCapabilityGap({
  consequence:{gap:'MISSING_CAPABILITY',subject:'git.repair.workflow'},
  workItem:original,
 });
 const confirmed=confirmCapabilityGap(gap,{historicalFailureRefs:['run:1'],
  verificationSuiteRef:'tests:frozen'});
 const exp=createSandboxExperiment({confirmedGap:confirmed,
  primaryWorldlineId:original.worldline_id});
 const signed=authorizeSandboxExperiment(exp,authorize());
 const verified=validateSandboxResult(signed,{
  synthesizedCapability:{id:'git.repair.workflow'},
  frozenRegression:{passed:true},isolatedVerification:{verified:true},
  capabilitySignature:'test-signature',
 });
 assert.throws(()=>authorizeWorldlineMerge(verified,{originalWorkItem:{...original,id:'other'},
  mergeVerifier:()=>({approved:true})}),/ORIGINAL_WORK_SCOPE_MISMATCH/);
 const m=authorizeWorldlineMerge(verified,{originalWorkItem:original,
  promotionAuthorization:promotion(verified),
  mergeVerifier:()=>({approved:true,verification_hash:verified.verification_hash,
   target_worldline_id:original.worldline_id})});
 const reg=registerVerifiedCapability(m,{
  mergeResult:{merged:true,verification_hash:verified.verification_hash,
   target_worldline_id:original.worldline_id},
  capabilityRegistry:{register:({capability_id,verification_hash})=>({
   registered:true,capability_id,verification_hash})},
 });
 assert.throws(()=>reactivationPlan(confirmed,{registration:reg,
  originalWorkItem:{...original,id:'work:other'}}),
 /ORIGINAL_WORK_IDENTITY_CHANGED/);
 const continuation=reactivationPlan(confirmed,{registration:reg,
  originalWorkItem:original});
 assert.equal(continuation.state,'REACTIVATION_READY');
 assert.equal(continuation.job_completed,false);
 assert.equal(handleSynthesisFailure(exp,{nextAttempt:4,attemptLimit:3}).state,'ESCALATED');
});
