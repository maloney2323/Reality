import test from 'node:test';
import assert from 'node:assert/strict';
import {
 GOVERNED_SELF_IMPROVEMENT_VERSION,
 createGovernedSelfImprovement,verifySelfImprovementJournal,
 acceptGovernedObservation,proposeGovernedCandidate,
 classifyIndependentFailure,nextGovernedSelfImprovementAction,
 readGovernedSelfImprovementOrientation
} from '../src/reality-governed-self-improvement-spine-v1.0.js';
import {continueGovernedSelfImprovement}
 from '../src/reality-governed-self-improvement-driver-v1.0.js';

const scope=Object.freeze({
 owner_id:'owner:reality-test',goal_id:'user-goal:219764fa8213a41a2ba638c5c2533d5b',
 goal_transition_receipt_ref:'universe:event:goal-authenticated',
 goal_evidence_ref:'supabase:reality_chat_messages:verified-user-text',
 original_work_id:'work:24cda9611404e9bcb47909976067605c',
 continuity_root_id:'root:original-143',worldline_id:'worldline:owner-original-143',
 target_environment:'ISOLATED_PREVIEW',
 governance_kernel_hash:'sha256:immutable-policy-baseline',
});
const candidate=(content='export const fixed=true;')=>({
 rationale:'Repair the verified original #143 capability gap',
 verification_plan_ref:'suite:independent-original143',
 model_response_ref:'response:reality-model',
 files:[{path:'src/reality-extensions/reality-original-143-repair-capability.js',content}],
});
function harness(){
 const known=new Map();let n=0;
 const issue=(state,kind,attrs={})=>{
  const evidence_ref='trusted:provider:'+ (++n);
  const evidence_hash='provider-hash:'+n;
  const proof={kind,evidence_ref,evidence_hash,
   ...Object.fromEntries(['owner_id','goal_id','original_work_id',
    'continuity_root_id','worldline_id'].map(k=>[k,state.scope[k]])),
   ...attrs};
  // This independent ledger models a provider-backed receipt. The model does
  // not have access to this map or the production trusted adapter.
  known.set(evidence_ref,{evidence_hash,
   scope_hash:state.scope_hash,original_work_id:state.scope.original_work_id,
   candidate_hash:state.candidate?.artifact_hash||null});
  return proof;
 };
 const verifyProvider=async ({scope_hash,receipt,candidate_hash})=>{
  const remembered=known.get(receipt.evidence_ref);
  if(!remembered||
     remembered.evidence_hash!==receipt.evidence_hash||
     remembered.scope_hash!==scope_hash||
     remembered.original_work_id!==receipt.original_work_id||
     remembered.candidate_hash!==candidate_hash)return {verified:false};
  return {verified:true,independent_provider_readback:true,
   evidence_ref:receipt.evidence_ref,evidence_hash:receipt.evidence_hash,
   original_work_id:receipt.original_work_id,scope_hash,
   attestation_ref:'trusted:attestation:'+receipt.evidence_ref};
 };
 return {issue,verifyProvider,known};
}
async function gap(state,h){
 return acceptGovernedObservation(state,h.issue(state,'GAP_CONFIRMED',{
  capability_id:'reality.original-143-executor',
  failure_refs:['github:issues/143','github:actions/runs/original-fail'],
  verification_suite_ref:'suite:original143-frozen',
 }),{verifyProvider:h.verifyProvider});
}
async function verified(state,h){
 const id=state.candidate.artifact_hash;
 return acceptGovernedObservation(state,h.issue(state,'SANDBOX_VERIFIED',{
  artifact_hash:id,independent_tests_passed:true,frozen_regression_passed:true,
  governance_preserved:true,verifier_run_ref:'github:actions/verified-run',
 }),{verifyProvider:h.verifyProvider});
}
async function auth(state,h){
 return acceptGovernedObservation(state,h.issue(state,'PROMOTION_AUTHORIZED',{
  owner_id:scope.owner_id,artifact_hash:state.candidate.artifact_hash,
  approval_origin:'AUTHENTICATED_OWNER_EXPLICIT_ACTION',consumed_once:true,
  reservation_ref:'database:single-use-reservation-1',
 }),{verifyProvider:h.verifyProvider});
}
test('foundational kernel keeps source-linked goal, owner, work and environment immutable',()=>{
 const s=createGovernedSelfImprovement({scope});
 assert.equal(s.phase,'DISCOVERING');
 assert.equal(s.scope.original_work_id,scope.original_work_id);
 assert.equal(s.scope.target_environment,'ISOLATED_PREVIEW');
 assert.equal(s.version,GOVERNED_SELF_IMPROVEMENT_VERSION);
 assert.equal(s.journal.length,0);
 assert.equal(verifySelfImprovementJournal(s),true);
 assert.ok(Object.isFrozen(s.scope));
 assert.ok(Object.isFrozen(s));
});
test('rejects missing goal provenance and non-isolated target',()=>{
 for(const patch of [{goal_evidence_ref:''},{goal_transition_receipt_ref:''},
  {target_environment:'production'},{governance_kernel_hash:''},{original_work_id:''}]){
  assert.throws(()=>createGovernedSelfImprovement({scope:{...scope,...patch}}),
   /SELF_IMPROVEMENT_VERIFIED_GOAL_SCOPE_REQUIRED/);
 }
});
test('bounded retry budget cannot be disabled by model',()=>{
 for(const attemptLimit of [0,-1,1.5,6,Infinity])
  assert.throws(()=>createGovernedSelfImprovement({scope,attemptLimit}),
   /SELF_IMPROVEMENT_FINITE_ATTEMPT_BUDGET_REQUIRED/);
});
test('model cannot authorize work by proposing candidate before provider-confirmed gap',()=>{
 const s=createGovernedSelfImprovement({scope});
 assert.throws(()=>proposeGovernedCandidate(s,candidate()),
 /SELF_IMPROVEMENT_GAP_OR_REPAIR_REQUIRED/);
});
test('model-supplied verified/authorized flags do not install a candidate',async()=>{
 const h=harness();const s=await gap(createGovernedSelfImprovement({scope}),h);
 const changed=proposeGovernedCandidate(s,{...candidate(),
  verified:true,authorized:true,registered:true,settled:true});
 assert.equal(changed.phase,'CANDIDATE_READY');
 assert.equal(changed.candidate.verified,false);
 assert.equal(changed.candidate.authorized,false);
 assert.equal(changed.candidate.installed,false);
 assert.equal(nextGovernedSelfImprovementAction(changed).installation_authorized,false);
});
test('cannot propose editing the constitution, owner auth, or governance kernel',async()=>{
 const h=harness();const s=await gap(createGovernedSelfImprovement({scope}),h);
 for(const path of ['src/reality-governed-self-improvement-spine-v1.0.js',
  'src/reality-private-chat-auth-v0.1.js','src/reality-cognition-execution-bridge-v0.1.js',
  'src/reality-constitution.js']){
  assert.throws(()=>proposeGovernedCandidate(s,{...candidate(),
   files:[{path,content:'export const tamper=true;'}]}),
   /SELF_IMPROVEMENT_CONSTITUTIONAL_KERNEL_IMMUTABLE/);
 }
});
test('rejects path escapes, duplicate files, empty content or missing verification plan',async()=>{
 const h=harness();const s=await gap(createGovernedSelfImprovement({scope}),h);
 for(const files of [[{path:'src/../package.json',content:'x'}],
  [{path:'src/reality-extensions/x.js',content:'x'},{path:'src/reality-extensions/x.js',content:'y'}],
  [{path:'/tmp/test.js',content:'test'}],
  [{path:'src/reality-extensions/x.js',content:''}]]){
  assert.throws(()=>proposeGovernedCandidate(s,{...candidate(),files}),/SELF_IMPROVEMENT_CANDIDATE_/);
 }
 assert.throws(()=>proposeGovernedCandidate(s,{...candidate(),verification_plan_ref:''}),
  /SELF_IMPROVEMENT_CANDIDATE_VERIFICATION_PLAN_REQUIRED/);
});
test('untrusted model receipt cannot create verified evidence without provider readback',async()=>{
 const h=harness();const s=createGovernedSelfImprovement({scope});
 const forged={kind:'GAP_CONFIRMED',...scope,evidence_ref:'model:fabricated',
  evidence_hash:'model:fabricated',capability_id:'fictitious',
  failure_refs:['fabricated:1'],verification_suite_ref:'model:suite'};
 await assert.rejects(acceptGovernedObservation(s,forged,{
  verifyProvider:h.verifyProvider
 }),/SELF_IMPROVEMENT_INDEPENDENT_PROVIDER_READBACK_FAILED/);
});
test('evidence attestor is required even when input says independently_verified',async()=>{
 const s=createGovernedSelfImprovement({scope});
 await assert.rejects(acceptGovernedObservation(s,{kind:'GAP_CONFIRMED',
  ...scope,evidence_ref:'bogus',evidence_hash:'bogus',independently_verified:true}),
 /SELF_IMPROVEMENT_INDEPENDENT_VERIFIER_REQUIRED/);
});
test('foreign owner, goal, work, worldline or target is rejected BEFORE attestation',async()=>{
 const h=harness();const s=createGovernedSelfImprovement({scope});
 for(const key of ['owner_id','goal_id','original_work_id','worldline_id','continuity_root_id']){
  let proof=h.issue(s,'GAP_CONFIRMED',{
   capability_id:'x',failure_refs:['receipt:x'],verification_suite_ref:'suite:x'});
  proof[key]='malicious-other-'+key;
  await assert.rejects(acceptGovernedObservation(s,proof,{
   verifyProvider:h.verifyProvider}),/SELF_IMPROVEMENT_ORIGINAL_SCOPE_CHANGED/);
 }
 const proof=h.issue(s,'GAP_CONFIRMED',{
  capability_id:'x',failure_refs:['receipt:x'],verification_suite_ref:'suite:x',
  target_environment:'production'});
 await assert.rejects(acceptGovernedObservation(s,proof,{
  verifyProvider:h.verifyProvider}),/SELF_IMPROVEMENT_TARGET_ENVIRONMENT_CHANGED/);
});
test('frozen regression failure changes decision to evidence-led model repair',async()=>{
 const h=harness();let s=await gap(createGovernedSelfImprovement({scope}),h);
 s=proposeGovernedCandidate(s,candidate());
 s=await acceptGovernedObservation(s,h.issue(s,'SANDBOX_FAILED',{
  artifact_hash:s.candidate.artifact_hash,
  diagnostics:{output:'not ok 3 - original owner authorization mismatch',
   code:'TEST_FAILED'}
 }),{verifyProvider:h.verifyProvider});
 assert.equal(s.phase,'REPAIR_REQUIRED');
 assert.equal(s.independent_failure.classification.class,'REGRESSION');
 assert.equal(nextGovernedSelfImprovementAction(s).action,
 'MODEL_REPAIR_WITH_FROZEN_FAILURE_FEEDBACK');
 assert.equal(s.attempt_count,1);
});
test('missing database operation is not confused with a code retry',async()=>{
 const h=harness();let s=await gap(createGovernedSelfImprovement({scope}),h);
 s=proposeGovernedCandidate(s,candidate());
 s=await acceptGovernedObservation(s,h.issue(s,'SANDBOX_FAILED',{
  artifact_hash:s.candidate.artifact_hash,
  diagnostics:{output:'missing database RPC',missingDependency:'database:register-capability'},
 }),{verifyProvider:h.verifyProvider});
 assert.equal(s.phase,'ESCALATED');
 assert.equal(nextGovernedSelfImprovementAction(s).action,'DISCOVER_DEPENDENCY');
 assert.equal(s.independent_failure.classification.retry_source_without_dependency,false);
});
test('authorization failure is not turned into another hallucinated source patch',()=>{
 assert.equal(classifyIndependentFailure({output:'RESERVATION_REQUIRED'}).class,
 'AUTHORITY_REQUIRED');
 assert.equal(classifyIndependentFailure({output:'SyntaxError: unexpected token'}).class,
 'SYNTAX_OR_IMPORT');
 assert.equal(classifyIndependentFailure({output:'ERR_ASSERTION not ok 3'}).class,
 'REGRESSION');
});
test('cannot claim sandbox verified without independent and frozen regression receipts',async()=>{
 const h=harness();let s=await gap(createGovernedSelfImprovement({scope}),h);
 s=proposeGovernedCandidate(s,candidate());
 let failed=h.issue(s,'SANDBOX_VERIFIED',{
  artifact_hash:s.candidate.artifact_hash,
  independent_tests_passed:true,frozen_regression_passed:false,
  governance_preserved:true,verifier_run_ref:'CI:pass'});
 await assert.rejects(acceptGovernedObservation(s,failed,{
  verifyProvider:h.verifyProvider}),/SELF_IMPROVEMENT_SANDBOX_VERIFICATION_INCOMPLETE/);
});
test('candidate verified in sandbox is NOT permitted to promote or settle',async()=>{
 const h=harness();let s=await gap(createGovernedSelfImprovement({scope}),h);
 s=await verified(proposeGovernedCandidate(s,candidate()),h);
 assert.equal(s.phase,'AWAITING_OWNER_APPROVAL');
 assert.equal(s.registration,null);
 assert.equal(s.settlement,null);
 assert.equal(nextGovernedSelfImprovementAction(s).original_job_completed,false);
 const forged=h.issue(s,'CAPABILITY_REGISTERED',{
  artifact_hash:s.candidate.artifact_hash,status:'ACTIVE'});
 await assert.rejects(acceptGovernedObservation(s,forged,{
  verifyProvider:h.verifyProvider}),/SELF_IMPROVEMENT_LIVE_REGISTRATION_READBACK_REQUIRED/);
});
test('owner approval must be fresh, single-use, exact-artifact and source-linked',async()=>{
 const h=harness();let s=await gap(createGovernedSelfImprovement({scope}),h);
 s=await verified(proposeGovernedCandidate(s,candidate()),h);
 for(const override of [{consumed_once:false},{artifact_hash:'other'},
 {owner_id:'other-owner'},{approval_origin:'MODEL_SAYS_APPROVED'},{reservation_ref:''}]){
  const proof=h.issue(s,'PROMOTION_AUTHORIZED',{
   owner_id:scope.owner_id,artifact_hash:s.candidate.artifact_hash,
   approval_origin:'AUTHENTICATED_OWNER_EXPLICIT_ACTION',
   consumed_once:true,reservation_ref:'reservation:one-time',
   ...override});
  await assert.rejects(acceptGovernedObservation(s,proof,{
   verifyProvider:h.verifyProvider}),override.artifact_hash ? /SELF_IMPROVEMENT_CANDIDATE_BYTES_CHANGED/ : override.owner_id ? /SELF_IMPROVEMENT_ORIGINAL_SCOPE_CHANGED/ : /SELF_IMPROVEMENT_EXACT_OWNER_PROMOTION_NOT_AUTHORIZED/);
 }
});
test('registration must match exact approved artifact and original worldline',async()=>{
 const h=harness();let s=await gap(createGovernedSelfImprovement({scope}),h);
 s=await auth(await verified(proposeGovernedCandidate(s,candidate()),h),h);
 const wrong=h.issue(s,'CAPABILITY_REGISTERED',{
  artifact_hash:s.candidate.artifact_hash,
  authorization_ref:s.promotion_authorization.evidence_ref,
  registry_receipt_ref:'registry:actual',
  status:'ACTIVE',target_worldline_id:'another-world',
 });
 await assert.rejects(acceptGovernedObservation(s,wrong,{
  verifyProvider:h.verifyProvider}),/SELF_IMPROVEMENT_LIVE_REGISTRATION_READBACK_REQUIRED/);
});
test('cannot fake completion by merely setting job_completed=true on an LLM receipt',async()=>{
 const h=harness();let s=await gap(createGovernedSelfImprovement({scope}),h);
 s=await verified(proposeGovernedCandidate(s,candidate()),h);
 const receipt=h.issue(s,'ORIGINAL_JOB_SETTLED',{
  original_job_completed:true,durable_settlement_readback:true,
  independent_outcome_verified:true,settlement_receipt_ref:'fabricated'});
 await assert.rejects(acceptGovernedObservation(s,receipt,{
  verifyProvider:h.verifyProvider}),/SELF_IMPROVEMENT_DURABLE_ORIGINAL_JOB_SETTLEMENT_REQUIRED/);
});
test('a changed event or prior hash invalidates append-only journal on reload',async()=>{
 const h=harness();let s=await gap(createGovernedSelfImprovement({scope}),h);
 const corrupt=structuredClone(s);
 corrupt.journal[0].body.capability_id='invented';
 assert.throws(()=>verifySelfImprovementJournal(corrupt),
  /SELF_IMPROVEMENT_JOURNAL_TAMPERED/);
 const head=structuredClone(s);head.head_hash='fake';
 assert.throws(()=>verifySelfImprovementJournal(head),
  /SELF_IMPROVEMENT_CHECKPOINT_HASH_MISMATCH/);
});
test('orientation uses existing Reality self-questioning and immutable owner goal',async()=>{
 const h=harness();const s=await gap(createGovernedSelfImprovement({scope}),h);
 const result=readGovernedSelfImprovementOrientation(s,{capability_gap_count:1});
 assert.equal(result.original_work_id,scope.original_work_id);
 assert.equal(result.current_goal.id,scope.goal_id);
 assert.ok(result.questions.find(x=>x.id==='capability.gaps'));
 assert.equal(result.execution_authorized,false);
});
test('driver stops at owner promotion after model auto-corrects regression; no model authority',async()=>{
 const h=harness();let s=createGovernedSelfImprovement({scope});
 let called=0;const stored=[];
 const adapters={
  observeMissingCapability:async()=>h.issue(s,'GAP_CONFIRMED',{
   capability_id:'reality.original-143-executor',
   failure_refs:['github:issue:143'],verification_suite_ref:'frozen:test:143'}),
  generateCandidate:async ctx=>{
   called++;
   if(called===2){
    assert.equal(ctx.previous_independent_failure.classification.class,'REGRESSION');
    assert.equal(ctx.original_work_id,scope.original_work_id);
   }
   return candidate(called===1?'export const broken=false;':'export const corrected=true;');
  },
  runIsolatedSandbox:async ({candidate:source,attempt})=>h.issue(s,attempt===1?'SANDBOX_FAILED':'SANDBOX_VERIFIED',{
   artifact_hash:source.artifact_hash,
   ...(attempt===1?{diagnostics:{output:'not ok 2 - missed authority check',code:'TEST_FAILED'}}:
    {independent_tests_passed:true,frozen_regression_passed:true,
     governance_preserved:true,verifier_run_ref:'CI:independent:green'})
  }),
  verifyIndependentReceipt:async args=>{
   // The provider map was created for the initial state. Rebind to the actual
   // checkpoint but NEVER trust a model-generated receipt as an attestation.
   const record=h.known.get(args.receipt.evidence_ref);
   if(!record)return {verified:false};
   return {verified:true,independent_provider_readback:true,
    evidence_ref:args.receipt.evidence_ref,evidence_hash:args.receipt.evidence_hash,
    original_work_id:args.scope.original_work_id,scope_hash:args.scope_hash,
    attestation_ref:'external:proof:'+args.receipt.evidence_ref};
  },
  persistCheckpoint:async newState=>{
   s=newState;stored.push(newState.head_hash);
   return {persisted:true,independent_readback_verified:true,
    checkpoint_hash:newState.head_hash,original_work_id:newState.scope.original_work_id};
  },
 };
 const output=await continueGovernedSelfImprovement({state:s,adapters});
 assert.equal(output.status,'OWNER_APPROVAL_REQUIRED');
 assert.equal(output.state.phase,'AWAITING_OWNER_APPROVAL');
 assert.equal(output.state.attempt_count,2);
 assert.equal(output.state.journal.length,5);
 assert.equal(called,2);
 assert.equal(stored.length,5);
 assert.equal(output.original_job_completed,false);
});
test('driver will not count an unacknowledged checkpoint as durable progress',async()=>{
 const h=harness();const s=createGovernedSelfImprovement({scope});
 const adapters={observeMissingCapability:async()=>h.issue(s,'GAP_CONFIRMED',{
  capability_id:'x',failure_refs:['failure:x'],verification_suite_ref:'suite:x'}),
  verifyIndependentReceipt:h.verifyProvider,
  persistCheckpoint:async()=>({persisted:true,independent_readback_verified:false})};
 await assert.rejects(continueGovernedSelfImprovement({state:s,adapters}),
 /SELF_IMPROVEMENT_DURABLE_CHECKPOINT_READBACK_REQUIRED/);
});
test('driver cannot install from first-run discovery without owner authorization',async()=>{
 const s=createGovernedSelfImprovement({scope});
 await assert.rejects(continueGovernedSelfImprovement({state:s,adapters:{
  observeMissingCapability:async()=>({kind:'SANDBOX_VERIFIED'}),
  verifyIndependentReceipt:async()=>({verified:true}),
  persistCheckpoint:async()=>({persisted:true})
 }}),/SELF_IMPROVEMENT_PROVIDER_RESULT_TYPE_INVALID/);
});
test('driver has finite step budget',async()=>{
 const s=createGovernedSelfImprovement({scope});
 for(const limit of [-1,0,51,1.1])
  await assert.rejects(continueGovernedSelfImprovement({
   state:s,adapters:{},maxTransitions:limit
  }),/SELF_IMPROVEMENT_RUN_BUDGET_INVALID/);
});
test('full receipt chain requires approval, registry readback, original execution and settlement',async()=>{
 const h=harness();let s=await gap(createGovernedSelfImprovement({scope}),h);
 s=await auth(await verified(proposeGovernedCandidate(s,candidate()),h),h);
 const registrationRef='universe:capability:registered';
 s=await acceptGovernedObservation(s,h.issue(s,'CAPABILITY_REGISTERED',{
  artifact_hash:s.candidate.artifact_hash,
  authorization_ref:s.promotion_authorization.evidence_ref,
  registry_receipt_ref:registrationRef,
  status:'ACTIVE',target_worldline_id:scope.worldline_id
 }),{verifyProvider:h.verifyProvider});
 assert.equal(s.phase,'CAPABILITY_REGISTERED');
 assert.equal(nextGovernedSelfImprovementAction(s).original_job_completed,false);
 const executorRef='github:original-executor:readback';
 s=await acceptGovernedObservation(s,h.issue(s,'ORIGINAL_JOB_RESUMED',{
  registration_ref:registrationRef,
  original_work_id:scope.original_work_id,
  real_execution_observed:true,executor_run_ref:executorRef,
 }),{verifyProvider:h.verifyProvider});
 assert.equal(s.phase,'ORIGINAL_JOB_RESUMED');
 assert.equal(nextGovernedSelfImprovementAction(s).original_job_completed,false);
 s=await acceptGovernedObservation(s,h.issue(s,'ORIGINAL_JOB_SETTLED',{
  resumption_ref:executorRef,original_work_id:scope.original_work_id,
  durable_settlement_readback:true,independent_outcome_verified:true,
  settlement_receipt_ref:'universe:original143:settled',
 }),{verifyProvider:h.verifyProvider});
 assert.equal(s.phase,'SETTLED');
 assert.equal(nextGovernedSelfImprovementAction(s).original_job_completed,true);
 assert.equal(verifySelfImprovementJournal(s),true);
});

test('normal model upgrade cannot rewrite HTTP routes, auth, persistence or arbitrary source files',async()=>{
 const h=harness();const s=await gap(createGovernedSelfImprovement({scope}),h);
 for(const path of [
  'api/reality/personal-chat.js',
  'api/reality/self-build.js',
  'src/reality-private-chat-store-v0.1.js',
  'src/reality-github-self-build-provider-v1.0.js',
  'src/reality-universe-postgres-persistence-v0.1.js',
  'src/novel-agent-core.js'
 ]){
  assert.throws(()=>proposeGovernedCandidate(s,{
   ...candidate(),
   files:[{path,content:'export const unsafe=true;'}],
  }),/SELF_IMPROVEMENT_NON_EXTENSION_CHANGE_REQUIRES_SEPARATE_GOVERNANCE_RELEASE/);
 }
});
