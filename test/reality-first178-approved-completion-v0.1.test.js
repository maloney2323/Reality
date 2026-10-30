import test from 'node:test';
import assert from 'node:assert/strict';
import {createGovernedSelfImprovement,proposeGovernedCandidate,
 acceptGovernedObservation}
 from '../src/reality-governed-self-improvement-spine-v1.0.js';
import {describeOriginal178OwnerApproval,finishOriginal178AfterExactApproval}
 from '../src/reality-first178-approved-completion-v0.1.js';
const owner='11111111-1111-4111-8111-111111111111';
const work='work:'+'e'.repeat(32);
const queueId='22222222-2222-4222-8222-222222222222';
const receiptId='33333333-3333-4333-8333-333333333333';
const scope={
 owner_id:owner,goal_id:'user-goal:first178',
 original_work_id:work,goal_transition_receipt_ref:'verified:goal-transition',
 goal_evidence_ref:'verified:human-confirmed-goal',
 continuity_root_id:'verified:root',worldline_id:'verified:world',
 target_environment:'ISOLATED_PREVIEW',
 governance_kernel_hash:'sha256:immutable-tested-release',
};
async function readyFixture(){
 const proofs=new Map();let n=0;
 const issue=(state,kind,extra={})=>{
  const evidence_ref='trusted:provider:'+(++n);
  const evidence_hash='trusted-hash:'+(n);
  proofs.set(evidence_ref,{evidence_hash,
   scope_hash:state.scope_hash,original_work_id:work,
   artifact_hash:state.candidate?.artifact_hash||null});
  return {kind,evidence_ref,evidence_hash,
   ...Object.fromEntries(['owner_id','goal_id','original_work_id',
     'continuity_root_id','worldline_id'].map(k=>[k,scope[k]])),...extra};
 };
 const verifyIndependentReceipt=async({receipt,scope_hash,candidate_hash})=>{
  const saved=proofs.get(receipt.evidence_ref);
  return saved&&saved.evidence_hash===receipt.evidence_hash&&
   saved.scope_hash===scope_hash&&saved.original_work_id===receipt.original_work_id&&
   saved.artifact_hash===candidate_hash?
    {verified:true,independent_provider_readback:true,
     evidence_ref:receipt.evidence_ref,evidence_hash:receipt.evidence_hash,
     scope_hash,original_work_id:work,
     attestation_ref:'trusted:verification:'+receipt.evidence_ref}: {verified:false};
 };
 let state=createGovernedSelfImprovement({scope});
 state=await acceptGovernedObservation(state,issue(state,'GAP_CONFIRMED',{
  capability_id:'reality.ci-failure-evidence-v1',
  failure_refs:['github:actions:run:40962921090:job:123760052647'],
  verification_suite_ref:'first-ci-evidence-gap-v1',
 }),{verifyProvider:verifyIndependentReceipt});
 state=proposeGovernedCandidate(state,{
  rationale:'Fix actual verified missing capability under first customer work',
  verification_plan_ref:'first-ci-evidence-gap-v1',
  model_response_ref:'responses:generated',
  files:[{path:'src/reality-extensions/reality-ci-failure-evidence.mjs',
   content:'export const verified=true;'},
   {path:'test/reality-extensions/model-candidate.test.js',
    content:'import test from "node:test";test("candidate",()=>{});'}],
 });
 state=await acceptGovernedObservation(state,issue(state,'SANDBOX_VERIFIED',{
  artifact_hash:state.candidate.artifact_hash,
  independent_tests_passed:true,frozen_regression_passed:true,
  governance_preserved:true,verifier_run_ref:'sandbox:real-verifier',
 }),{verifyProvider:verifyIndependentReceipt});
 const queue={phase:'AWAITING_OWNER_APPROVAL',queue_id:queueId,
  original_work_id:work,goal_id:scope.goal_id,
  report:{checkpoint_receipt_id:receiptId,checkpoint_hash:state.head_hash,
   installation_authorized:false}};
 return {state,queue,issue,verifyIndependentReceipt};
}
test('single owner button exposes EXACT independently verified artifact; no approval implicit',async()=>{
 const h=await readyFixture();
 const a=describeOriginal178OwnerApproval({
  state:h.state,queue:h.queue,session:{user_id:owner}});
 assert.equal(a.candidate_artifact_hash,h.state.candidate.artifact_hash);
 assert.equal(a.approval_required,true);
 assert.equal(a.installation_authorized,false);
 assert.equal(a.original_job_completed,false);
 assert.equal(a.target,'ISOLATED_PREVIEW_ONLY');
});
test('without real owner action, no reservation or provider install occurs',async()=>{
 const h=await readyFixture();
 let calls=0;
 await assert.rejects(finishOriginal178AfterExactApproval({
  state:h.state,queue:h.queue,session:{user_id:owner},
  ownerAction:{intent:'MODEL_SAYS_APPROVED'},
  adapters:{reserveExactOwnerApproval:async()=>{calls++;}},
 }),/FIRST178_COMPLETE_EXACT_HUMAN_INSTALLATION_CONSENT_REQUIRED/);
 assert.equal(calls,0);
});
test('missing any real installation/registry/settlement adapter blocks BEFORE consuming approval',async()=>{
 const h=await readyFixture();
 const a=describeOriginal178OwnerApproval({
  state:h.state,queue:h.queue,session:{user_id:owner}});
 let reservations=0;
 await assert.rejects(finishOriginal178AfterExactApproval({
  state:h.state,queue:h.queue,session:{user_id:owner},
  ownerAction:{intent:'APPROVE_EXACT_VERIFIED_178_UPGRADE_AND_FINISH',
   owner_confirms_installation:true,original_work_id:a.original_work_id,
   candidate_artifact_hash:a.candidate_artifact_hash,
   checkpoint_hash:a.checkpoint_hash,
   checkpoint_receipt_id:a.checkpoint_receipt_id},
  adapters:{reserveExactOwnerApproval:async()=>{reservations++;}},
 }),/FIRST178_COMPLETE_TRUSTED_VERIFYINDEPENDENTRECEIPT_NOT_CONNECTED/);
 assert.equal(reservations,0);
});
test('one owner action executes registration, exact original resumption, settlement through ONE driver',async()=>{
 const h=await readyFixture();
 const a=describeOriginal178OwnerApproval({
  state:h.state,queue:h.queue,session:{user_id:owner}});
 const names=[];
 let lastState=h.state;
 const issueReceipt=(state,kind,extra)=>h.issue(state,kind,extra);
 const receiptFromStage=(kind,props)=>issueReceipt(lastState,kind,props);
 const adapters={
  reserveExactOwnerApproval:async()=>receiptFromStage('PROMOTION_AUTHORIZED',{
   artifact_hash:a.candidate_artifact_hash,
   approval_origin:'AUTHENTICATED_OWNER_EXPLICIT_ACTION',
   consumed_once:true,reservation_ref:'db:single-use-approval-1',
   installation_target:'ISOLATED_PREVIEW'}),
  verifyIndependentReceipt:h.verifyIndependentReceipt,
  persistCheckpoint:async state=>{
   names.push(state.phase);lastState=state;
   return {persisted:true,independent_readback_verified:true,
    checkpoint_hash:state.head_hash,original_work_id:work};
  },
  registerAndReobserve:async()=>receiptFromStage('CAPABILITY_REGISTERED',{
   artifact_hash:a.candidate_artifact_hash,
   authorization_ref:lastState.promotion_authorization.evidence_ref,
   status:'ACTIVE',registry_receipt_ref:'provider:real-installed-revision',
   target_worldline_id:scope.worldline_id}),
  resumeOriginalWork:async()=>receiptFromStage('ORIGINAL_JOB_RESUMED',{
   registration_ref:lastState.registration.registry_receipt_ref,
   original_work_id:work,real_execution_observed:true,
   executor_run_ref:'provider:real-original-executor'}),
  settleAndReobserve:async()=>receiptFromStage('ORIGINAL_JOB_SETTLED',{
   resumption_ref:lastState.resumption.executor_run_ref,
   original_work_id:work,durable_settlement_readback:true,
   independent_outcome_verified:true,
   settlement_receipt_ref:'universe:verified-settlement'}),
 };
 const done=await finishOriginal178AfterExactApproval({
  state:h.state,queue:h.queue,session:{user_id:owner},
  ownerAction:{intent:'APPROVE_EXACT_VERIFIED_178_UPGRADE_AND_FINISH',
   owner_confirms_installation:true,original_work_id:a.original_work_id,
   candidate_artifact_hash:a.candidate_artifact_hash,
   checkpoint_hash:a.checkpoint_hash,
   checkpoint_receipt_id:a.checkpoint_receipt_id},
  adapters,
 });
 assert.deepEqual(names,['PROMOTION_AUTHORIZED','CAPABILITY_REGISTERED',
  'ORIGINAL_JOB_RESUMED','SETTLED']);
 assert.equal(done.status,'ORIGINAL_JOB_INDEPENDENTLY_SETTLED');
 assert.equal(done.original_job_completed,true);
 assert.equal(done.production_changed,false);
 assert.equal(done.installed_candidate_sha256,a.candidate_artifact_hash);
});
