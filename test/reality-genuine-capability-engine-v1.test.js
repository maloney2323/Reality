import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenuineCapabilityEngine,createGenuineCapabilityExecutionHandoff}
 from '../src/reality-genuine-capability-engine-v1.js';
import {executeAuthorizedWork}
 from '../src/reality-governed-execution-engine-v0.1.js';

const WORK='work:'+'a'.repeat(32);
const SOURCE='https://github.com/maloney2323/Reality/actions/runs/41311122233';
const FROZEN='github:frozen-regression:sha256:'+'b'.repeat(64);
const scope={owner_id:'independently-verified-owner',goal_id:'verified-goal',
 original_work_id:WORK,continuity_root_id:'root:customer',
 worldline_id:'worldline:customer',
 goal_transition_receipt_ref:'owner-goal-transition',
 goal_evidence_ref:'supabase:owner-confirmed-goal',
 target_environment:'ISOLATED_PREVIEW',governance_kernel_hash:'sha256:'+'c'.repeat(64)};
const original={
 original_work_id:WORK,evidence_kind:'OBSERVED_FAILURE',
 blocker_class:'MISSING_INSTRUMENT',independently_verified:true,
 capability_id:'business_receipt_validator',source_ref:SOURCE,
 verification_suite_ref:FROZEN,
 external_action_performed:false,provider_effect_may_have_occurred:false,
 no_automatic_retry:false,
};
const providerProof={
 original_work_id:WORK,capability_id:original.capability_id,
 source_ref:SOURCE,verification_suite_ref:FROZEN,
 frozen_suite_sha256:'d'.repeat(64),
 provider_run_ref:'https://github.com/maloney2323/Reality/actions/runs/41311122334',
 frozen_failure_ref:'github:frozen-regression:receipt:41311122334',
 reproduced_failure:true,independently_verified:true,
 external_action_performed:false,provider_effect_may_have_occurred:false,
};
function fixture({
 observation=original,reobserved=original,proof=providerProof,registryStatus='ABSENT',
 after=null,
}={}){
 let observations=0,registryReads=0,reproductions=0,drivers=0;
 const modelAdapter={
  observeMissingCapability:async()=>{throw Error('NOT_INVOKED')},
  generateCandidate:async()=>{throw Error('NOT_INVOKED')},
  runIsolatedSandbox:async()=>{throw Error('NOT_INVOKED')},
  persistCheckpoint:async()=>{throw Error('NOT_INVOKED')},
  verifyIndependentReceipt:async()=>{throw Error('NOT_INVOKED')},
 };
 const engine=createGenuineCapabilityEngine({
  observeOriginalFailure:async()=>{observations++;return observation},
  reobserveOriginalFailure:async()=>reobserved,
  reproduceFrozenFailure:async()=>{reproductions++;return proof},
  inspectRegisteredCapability:async()=>{registryReads++;
   return {independently_verified:true,original_work_id:WORK,
    capability_id:original.capability_id,status:registryStatus};
  },
  arbitrateAndReceipt:async()=>({
   original_work_id:WORK,owner_id:scope.owner_id,goal_id:scope.goal_id,
   capability_id:original.capability_id,
   verified_frozen_failure_ref:providerProof.frozen_failure_ref,
   persisted:true,independently_verified:true,signature_verified:true,
   source:'REALITY_BITEMPORAL_CONTINUITY',
   reused_capabilities_checked:true,authorized_integrations_checked:true,
   selected_tier:'BUILD',reusable_candidate_count:0,
   authorized_compatible_integration_count:0,
   why_reuse_not_viable:'NO_COMPATIBLE_REGISTERED_CAPABILITY',
   why_integration_not_viable:'NO_AUTHORIZED_COMPATIBLE_INTEGRATION',
   receipt_hash:'d'.repeat(64),pre_state_hash:'a'.repeat(64),
   post_state_hash:'b'.repeat(64),
   valid_time:'2026-10-28T14:32:00.000Z',
   transaction_time:'2026-10-28T14:32:05.120Z',
   receipt_ref:'fixture:verified:arbitrage',
   installation_authorized:false,
  }),
  adapters:modelAdapter,
  runRepair:async argument=>{
   drivers++;return after?after(argument):{
    status:'OWNER_APPROVAL_REQUIRED',original_work_id:WORK,
    original_goal_id:scope.goal_id,new_job_created:false,
    capability_phase:'AWAITING_OWNER_APPROVAL',
    installation_authorized:false,original_job_completed:false,
    owner_action_required:true,state:{original:WORK},
   };
  },
 });
 return {engine,calls:()=>({observations,registryReads,reproductions,drivers})};
}
test('proven real failure + independent frozen reproduction reaches original-work driver',async()=>{
 const f=fixture({after:args=>{
  assert.equal(args.originalWorkId,WORK);
  assert.equal(args.scope.goal_id,scope.goal_id);
  assert.equal(args.originalJobFailure.source_ref,SOURCE);
  assert.equal(args.originalJobFailure.frozen_suite_sha256,'d'.repeat(64));
  assert.equal(args.originalJobFailure.external_action_performed,false);
  assert.ok(typeof args.adapters.generateCandidate==='function');
  assert.ok(typeof args.adapters.persistCheckpoint==='function');
  return {status:'OWNER_APPROVAL_REQUIRED',original_work_id:WORK,
   original_goal_id:scope.goal_id,new_job_created:false,
   capability_phase:'AWAITING_OWNER_APPROVAL',owner_action_required:true,
   installation_authorized:false,original_job_completed:false,
   state:{journal:'managed by separate constitutional driver'}};
 }});
 const result=await f.engine.run({originalWorkId:WORK,scope});
 assert.equal(result.status,'OWNER_APPROVAL_REQUIRED');
 assert.equal(result.capability_id,'business_receipt_validator');
 assert.equal(result.confirmed_gap.frozen_suite_sha256,'d'.repeat(64));
 assert.equal(result.confirmed_gap.install_authorized,false);
 assert.equal(result.owner_action_required,true);
 assert.equal(result.original_job_completed,false);
 assert.equal(result.production_changed,false);
 assert.deepEqual(f.calls(),{observations:1,registryReads:1,reproductions:1,drivers:1});
});
test('transient, policy, uncertain external effect or unverified failures do not generate',async()=>{
 for(const modified of [
  {blocker_class:'TRANSIENT_NETWORK'},
  {blocker_class:'AUTHORITY_MISSING'},
  {independently_verified:false},
  {external_action_performed:true},
  {provider_effect_may_have_occurred:true},
  {no_automatic_retry:true},
  {original_work_id:'work:'+'f'.repeat(32)},
  {source_ref:'https://attacker.example/issue/123'},
 ]){
  const f=fixture({observation:{...original,...modified}});
  const r=await f.engine.run({originalWorkId:WORK,scope});
  assert.equal(r.status,'NOT_A_VERIFIED_CAPABILITY_GAP');
  assert.equal(r.original_job_completed,false);
  assert.equal(f.calls().drivers,0);
  assert.equal(f.calls().reproductions,0);
 }
});
test('stale independent re-observation never becomes new model work',async()=>{
 const f=fixture({reobserved:{...original,verification_suite_ref:'changed-suite'}});
 await assert.rejects(f.engine.run({originalWorkId:WORK,scope}),
  /GENUINE_CAPABILITY_ORIGINAL_PROVIDER_FAILURE_CHANGED/);
 assert.equal(f.calls().drivers,0);
});
test('registered capability triggers existing-job reassessment, not another installation',async()=>{
 const f=fixture({registryStatus:'ACTIVE'});
 const r=await f.engine.run({originalWorkId:WORK,scope});
 assert.equal(r.status,'CAPABILITY_ALREADY_PRESENT_REASSESS_JOB');
 assert.equal(r.model_generated,false);
 assert.equal(r.installed,false);
 assert.equal(f.calls().reproductions,0);
});
test('unverified frozen regression cannot become generation or owner approval',async()=>{
 for(const broken of [
  {independently_verified:false},
  {reproduced_failure:false},
  {frozen_suite_sha256:'invalid'},
  {original_work_id:'work:'+'f'.repeat(32)},
  {capability_id:'different_capability'},
  {provider_effect_may_have_occurred:true},
 ]){
  const f=fixture({proof:{...providerProof,...broken}});
  await assert.rejects(f.engine.run({originalWorkId:WORK,scope}),
   /GENUINE_CAPABILITY_FROZEN_INDEPENDENT_REPRODUCTION_REQUIRED/);
  assert.equal(f.calls().drivers,0);
 }
});
test('no synthetic or model-provided adapter can bypass trusted provider boundary',async()=>{
 assert.throws(()=>createGenuineCapabilityEngine({}),
  /GENUINE_CAPABILITY_TRUSTED_ADAPTER_MISSING/);
 const f=fixture();
 await assert.rejects(f.engine.run({originalWorkId:WORK,
  scope:{...scope,target_environment:'production'}}),
  /GENUINE_CAPABILITY_ORIGINAL_GOAL_SCOPE_REQUIRED/);
});
test('driver cannot swap original work or fabricate settlement identity',async()=>{
 const f=fixture({after:()=>({
  status:'ORIGINAL_JOB_INDEPENDENTLY_SETTLED',
  original_work_id:'work:'+'f'.repeat(32),original_goal_id:scope.goal_id,
  new_job_created:false,original_job_completed:true,
 })});
 await assert.rejects(f.engine.run({originalWorkId:WORK,scope}),
  /GENUINE_CAPABILITY_DRIVER_ORIGINAL_JOB_IDENTITY_CHANGED/);
});

test('actual internal job executor hands off same unverified work to durable capability engine',async()=>{
 const f=fixture();let persisted=0;
 const handler=createGenuineCapabilityExecutionHandoff({
  engine:f.engine,scope,persistAndReadback:async x=>{
   persisted++;
   assert.equal(x.original_work_id,WORK);
   assert.equal(x.execution_not_yet_settled,true);
   assert.equal(x.no_new_job,true);
   return {...x,independently_verified:true,
    receipt_ref:'supabase:continuity:verified-gap'};
  },
 });
 const workItem={work_item_id:WORK,workflow_id:'customer:original-work',
  action:'Internal audit outcome',connector:null,operation:'read',consequential:false};
 const result=await executeAuthorizedWork({
  workItem,workflowId:workItem.workflow_id,originalWorkId:WORK,
  authorization:{authorization_id:'internal:read-only'},
  connector:{execute:async()=>({providerExecutionId:'internal:read-only',
   observation:{original_work_id:WORK}})},
  independentVerifier:{verify:async()=>({
   ...original,independent:true,verified:false,
  })},
  onVerifiedCapabilityGap:handler,
 });
 assert.equal(result.status,'UNRESOLVED');
 assert.equal(result.self_repair?.status,'OWNER_APPROVAL_REQUIRED');
 assert.equal(result.self_repair?.new_job_created,false);
 assert.equal(result.self_repair?.original_job_completed,false);
 assert.equal(f.calls().drivers,1);
 assert.equal(persisted,1);
});
test('handoff never conceals missing durable readback or altered runtime evidence',async()=>{
 const f=fixture();
 const base={original_work_id:WORK,authorization_continues_unchanged:true,
  production_write_permitted:false,customer_job_completed:false,
  original_execution_receipt:'internal:original-execution',
  independent_failure:original};
 const noReceipt=createGenuineCapabilityExecutionHandoff({
  engine:f.engine,scope,
  persistAndReadback:async()=>({independently_verified:false}),
 });
 await assert.rejects(noReceipt(base),
  /GENUINE_CAPABILITY_DURABLE_ORIGINAL_REPAIR_HANDOFF_READBACK_REQUIRED/);
 const forged=createGenuineCapabilityExecutionHandoff({
  engine:f.engine,scope,
  persistAndReadback:async()=>{throw Error('must never persist')},
 });
 await assert.rejects(forged({...base,
  independent_failure:{...original,source_ref:'https://github.com/maloney2323/Reality/actions/runs/9999'}}),
  /GENUINE_CAPABILITY_RUNTIME_FAILURE_AND_PROVIDER_EVIDENCE_DISAGREE/);
});

test('job-agnostic trusted connector receipt supports non-GitHub customer work',async()=>{
 const inventoryRef='reality:provider-verified:inventory:observation-5500-original-work';
 const observed={...original,source_ref:inventoryRef};
 const proof={...providerProof,source_ref:inventoryRef,
  provider_run_ref:'reality:provider-verified:inventory:frozen-reproduction-5500'};
 const f=fixture({observation:observed,reobserved:observed,proof});
 const result=await f.engine.run({originalWorkId:WORK,scope});
 assert.equal(result.status,'OWNER_APPROVAL_REQUIRED');
 assert.equal(result.confirmed_gap.original_failure_ref,inventoryRef);
 assert.equal(result.production_changed,false);
 assert.equal(f.calls().drivers,1);
});
