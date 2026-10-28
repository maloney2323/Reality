import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {
 detectCapabilityGap,confirmCapabilityGap,createSandboxExperiment,
 authorizeSandboxExperiment,validateSandboxResult,
} from '../src/reality-autonomous-capability-loop-v1.0.js';
import {fingerprintGovernedUpgradeCandidate}
 from '../src/reality-governed-github-upgrade-provider-v0.1.js';
import {
 hashUpgradeEvidence,issueUpgradeEvidenceWarrant,
 verifyUpgradeEvidenceWarrant,
} from '../src/reality-upgrade-evidence-warrant-v0.1.js';
import {personalGoalScope} from '../src/reality-personal-goal-readback-v0.1.js';
import {createContinuitySpine,appendContinuityNode}
 from '../src/reality-continuity-spine-v2.0.js';
import {
 projectAuthenticatedWarrantedUpgrade,loadAuthenticatedWarrantedUpgrade,
} from '../src/reality-warranted-upgrade-candidate-loader-v0.1.js';
const owner=randomUUID(),conversationId=randomUUID();
const project='hvkfreoagbrphwghjajw',url='https://'+project+'.supabase.co';
const originalWorkId='work:'+'9'.repeat(32);
const goalId='goal:test-sandbox-discovery';
const goalRevision='goal-transition:owner-affirmed-20261027';
const baseCommitSha='a'.repeat(40);
const now=1793140000000;
const env={
 VERCEL_ENV:'preview',
 REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',
 REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:project,
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:project,
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:url,
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project,
 REALITY_UNIVERSE_PERSISTENCE_KEY:'mock-persistence-key-local-test-only',
 REALITY_CHAT_RECEIPT_HMAC_KEY:'local-test-secret-never-used-by-reality-123456789',
};
function fixture(){
 const scope=personalGoalScope({userId:owner,conversationId});
 const spine=createContinuitySpine({
  continuityRootId:scope.root,worldlineId:scope.worldline,subjectId:owner,
 });
 const originalWorkItem={id:originalWorkId,
  continuity_root_id:spine.continuity_root_id,
  worldline_id:spine.worldline_id,status:'BLOCKED',
 };
 const gap=detectCapabilityGap({
  consequence:{gap:'MISSING_CAPABILITY',subject:'extension.invoice-parser'},
  workItem:originalWorkItem,capabilities:[],
 });
 const confirmed=confirmCapabilityGap(gap,{
  historicalFailureRefs:['github:actions:failed-original-invoice-work'],
  verificationSuiteRef:'test:extension.invoice-parser:frozen',
 });
 const proposed=createSandboxExperiment({
  confirmedGap:confirmed,primaryWorldlineId:spine.worldline_id,
 });
 const authorized=authorizeSandboxExperiment(proposed,{
  authorizationRef:'sandbox:owner-reviewed',authorizedBy:owner,
 });
 const files=[{path:'src/reality-extensions/invoice-parser.js',
  content:"export function parseInvoice(input){return input.trim()}\n",mode:'100644'}];
 const verifiedExperiment=validateSandboxResult(authorized,{
  synthesizedCapability:{files},
  frozenRegression:{passed:true,total:4,failed:0},
  isolatedVerification:{verified:true,runner:'isolated-node-v1',tests:5},
  capabilitySignature:'sandbox-signed:original-invoice-parser',
 });
 const verifierReceipt={
  status:'INDEPENDENT_SANDBOX_VERIFIED',
  work_item_id:originalWorkId,
  experiment_hash:verifiedExperiment.experiment_hash,
  verification_hash:verifiedExperiment.verification_hash,
  candidate_sha256:fingerprintGovernedUpgradeCandidate(files),
  frozen_regression_sha256:hashUpgradeEvidence(
   verifiedExperiment.verification_bundle.frozen_regression),
  holdout:{passed:true,case_count:7,result_sha256:'c'.repeat(64)},
  isolation:{production_write_permitted:false,secrets_accessible:false},
  verifier_run_ref:'github:actions:isolated-holdout-run:101',
 };
 const at=i=>new Date(now-10000+i*1000).toISOString();
 const root=appendContinuityNode({
  spine,stage:'RAW_SIGNAL',entityId:originalWorkId,eventId:randomUUID(),
  effectiveTime:at(0),assertionTime:at(0),
  payload:{source:'original-owner-goal'},
 });
 const checkpoint=appendContinuityNode({
  spine,stage:'WORK',entityId:originalWorkId,eventId:randomUUID(),
  parentEventId:root.event_id,priorLineageHash:root.lineage_hash,
  effectiveTime:at(1),assertionTime:at(1),epistemicStatus:'OBSERVED',
  payload:{original_work_id:originalWorkId,original_goal_id:goalId,
   job_completed:false,new_external_action_authorized:false},
 });
 const warrant=issueUpgradeEvidenceWarrant({
  experiment:verifiedExperiment,originalWorkItem,
  blockedCheckpointId:checkpoint.event_id,
  goalRevision,ownerId:owner,conversationId,
  baseCommitSha,verifierReceipt,env,now:now-5000,
 });
 const sandbox=appendContinuityNode({
  spine,stage:'VERIFICATION',entityId:originalWorkId,eventId:randomUUID(),
  parentEventId:checkpoint.event_id,priorLineageHash:checkpoint.lineage_hash,
  effectiveTime:at(2),assertionTime:at(2),epistemicStatus:'VERIFIED',
  payload:{original_work_id:originalWorkId,original_goal_id:goalId,
   goal_revision:goalRevision,
   verified_experiment:verifiedExperiment,verifier_receipt:verifierReceipt},
  provenance:{source:'reality-independent-sandbox-verifier-v0.1',
   principal_id:owner,conversation_id:conversationId},
 });
 const warrantEvent=appendContinuityNode({
  spine,stage:'VERIFICATION',entityId:originalWorkId,eventId:randomUUID(),
  parentEventId:sandbox.event_id,priorLineageHash:sandbox.lineage_hash,
  effectiveTime:at(3),assertionTime:at(3),epistemicStatus:'VERIFIED',
  payload:{original_work_id:originalWorkId,original_goal_id:goalId,
   goal_revision:goalRevision,blocked_checkpoint_id:checkpoint.event_id,
   sandbox_receipt_id:sandbox.event_id,warrant},
  provenance:{source:'reality-upgrade-warrant-issuer-v0.1',
   principal_id:owner,conversation_id:conversationId},
 });
 const mark=(e,type)=>({...e,entity_type:type});
 const history=[mark(root,'raw_signal'),mark(checkpoint,'personal_recovery_checkpoint'),
  mark(sandbox,'personal_upgrade_sandbox_verified'),
  mark(warrantEvent,'personal_upgrade_evidence_warrant')];
 const inputs={experiment:verifiedExperiment,originalWorkItem,
  blockedCheckpointId:checkpoint.event_id,goalRevision,
  ownerId:owner,conversationId,baseCommitSha,verifierReceipt,env,now};
 const projectArgs={history,originalWorkId,ownerId:owner,conversationId,
  activeGoalId:goalId,goalRevision,
  continuityRootId:spine.continuity_root_id,
  worldlineId:spine.worldline_id,env,now};
 return {scope,spine,history,originalWorkItem,
  verifiedExperiment,verifierReceipt,warrant,inputs,projectArgs,
  checkpoint,sandbox,warrantEvent};
}
test('actual Recovery v1 sandbox signature is tied to exact bytes and held-out verification',()=>{
 const f=fixture();
 const verified=verifyUpgradeEvidenceWarrant({warrant:f.warrant,...f.inputs});
 assert.equal(verified.valid,true);
 assert.equal(verified.status,'VERIFIED_NOT_AUTHORIZED');
 assert.equal(verified.execution_authorized,false);
 assert.equal(verified.original_job_completed,false);
 assert.equal(f.warrant.candidate_sha256,
  fingerprintGovernedUpgradeCandidate(f.verifiedExperiment.synthesized_capability.files));
 assert.equal(f.warrant.verification_hash,hashUpgradeEvidence(
  f.verifiedExperiment.verification_bundle));
});
test('mutation, wrong owner, goal revision, revoked holdout and expired signature fail closed',()=>{
 const f=fixture();
 const original=f.warrant;
 const variants=[
  [{...original,signature:'0'.repeat(64)},f.inputs],
  [{...original,candidate_sha256:'f'.repeat(64)},f.inputs],
  [{...original,promotion_authorized:true},f.inputs],
  [original,{...f.inputs,ownerId:randomUUID()}],
  [original,{...f.inputs,goalRevision:'other-goal-revision'}],
  [original,{...f.inputs,baseCommitSha:'f'.repeat(40)}],
  [original,{...f.inputs,verifierReceipt:{
   ...f.verifierReceipt,holdout:{...f.verifierReceipt.holdout,result_sha256:'e'.repeat(64)}}}],
  [original,{...f.inputs,now:now+90000000}],
 ];
 for(const [warrant,input] of variants){
  const out=verifyUpgradeEvidenceWarrant({warrant,...input});
  assert.equal(out.valid,false);
  assert.equal(out.execution_authorized,false);
 }
});
test('unverified holdouts and sandbox isolation violations cannot be signed',()=>{
 const f=fixture();
 for(const bad of [
  {...f.verifierReceipt,holdout:{passed:false,case_count:7,result_sha256:'c'.repeat(64)}},
  {...f.verifierReceipt,holdout:{passed:true,case_count:0,result_sha256:'c'.repeat(64)}},
  {...f.verifierReceipt,isolation:{production_write_permitted:true,secrets_accessible:false}},
  {...f.verifierReceipt,work_item_id:'work:'+'e'.repeat(32)},
 ]){
  assert.throws(()=>issueUpgradeEvidenceWarrant({...f.inputs,verifierReceipt:bad}),
   /UPGRADE_WARRANT_INDEPENDENT_HOLDOUT_AND_SCOPE_REQUIRED/);
 }
});
test('missing server-owned key blocks signing and verification',()=>{
 const f=fixture();
 assert.throws(()=>issueUpgradeEvidenceWarrant({...f.inputs,env:{}}),
  /UPGRADE_WARRANT_SERVER_KEY_REQUIRED/);
 const res=verifyUpgradeEvidenceWarrant({warrant:f.warrant,...f.inputs,env:{}});
 assert.equal(res.valid,false);
});
test('loader recovers only a unique signed warrant from the same original work worldline',()=>{
 const f=fixture();
 const result=projectAuthenticatedWarrantedUpgrade(f.projectArgs);
 assert.equal(result.persisted_and_reobserved,true);
 assert.equal(result.original_work_id,originalWorkId);
 assert.equal(result.originalWorkItem.id,originalWorkId);
 assert.equal(result.verified_not_authorized,true);
 assert.equal(result.candidate_hash,f.warrant.candidate_sha256);
 assert.equal(result.evidence_warrant_id,f.warrant.warrant_id);
 assert.equal(result.external_action_authorized,false);
 assert.equal(result.original_job_completed,false);
});
test('missing warrant, untrusted lineage and wrong signed work cannot become upgrade authority',()=>{
 const f=fixture();
 const attempts=[
  {...f.projectArgs,history:f.history.slice(0,3)},
  {...f.projectArgs,history:[...f.history,{...f.history[3],event_id:randomUUID()}]},
  {...f.projectArgs,history:f.history.map((x,i)=>i===2?{...x,
   provenance:{...x.provenance,source:'llm-generated-verification'}}:x)},
  {...f.projectArgs,goalRevision:'goal:changed'},
  {...f.projectArgs,history:f.history.map((x,i)=>i===3?{...x,
   payload:{...x.payload,warrant:{...f.warrant,signature:'0'.repeat(64)}}}:x)},
  {...f.projectArgs,originalWorkId:'work:'+'e'.repeat(32)},
 ];
 for(const args of attempts){
  assert.throws(()=>projectAuthenticatedWarrantedUpgrade(args),
   /UPGRADE_LOADER_/);
 }
});
test('authenticated loader reads existing isolated DB without trusting browser proposals',async()=>{
 const f=fixture();
 const session={user_id:owner,config:{url}};
 const goal={principal_id:owner,conversation_id:conversationId,
  scope:f.scope,state:{continuity_root_id:f.spine.continuity_root_id,
   world_id:f.scope.world,active_goal_id:goalId,
   active_goal:{goal_id:goalId,status:'ACTIVE',user_confirmed:true,
    last_transition_receipt_id:goalRevision}}};
 let reads=0;
 const options={session,conversationId,originalWorkId,env,now,
  readGoal:async()=>goal,
  createPersistence:()=>({reconstruct:async arg=>{
   assert.equal(arg.continuityRootId,f.spine.continuity_root_id);
   assert.equal(arg.worldlineId,f.spine.worldline_id);
   reads++;return f.history;
  }}),
 };
 const out=await loadAuthenticatedWarrantedUpgrade(options);
 assert.equal(reads,1);
 assert.equal(out.original_work_id,originalWorkId);
 await assert.rejects(loadAuthenticatedWarrantedUpgrade({
  ...options,session:{...session,user_id:randomUUID()},
 }),/UPGRADE_LOADER_CONFIRMED_GOAL_CHANGED/);
 await assert.rejects(loadAuthenticatedWarrantedUpgrade({
  ...options,readGoal:async()=>({...goal,state:{...goal.state,
   active_goal:{...goal.state.active_goal,status:'PAUSED'}}}),
 }),/UPGRADE_LOADER_CONFIRMED_GOAL_CHANGED/);
});
test('no source event means no warrant and never a default upgrade candidate',async()=>{
 const f=fixture();
 await assert.rejects(loadAuthenticatedWarrantedUpgrade({
  session:{user_id:owner,config:{url}},conversationId,originalWorkId,env,now,
  readGoal:async()=>({principal_id:owner,conversation_id:conversationId,
   scope:f.scope,state:{continuity_root_id:f.spine.continuity_root_id,
    world_id:f.scope.world,active_goal_id:goalId,
    active_goal:{goal_id:goalId,status:'ACTIVE',user_confirmed:true,
     last_transition_receipt_id:goalRevision}}}),
  createPersistence:()=>({reconstruct:async()=>f.history.slice(0,2)}),
 }),/UPGRADE_LOADER_VERIFIED_SANDBOX_AND_WARRANT_NOT_PERSISTED/);
});
