import test from 'node:test';
import assert from 'node:assert/strict';
import {executeAuthorizedWork}
 from '../src/reality-governed-execution-engine-v0.1.js';
import {continueOriginalJobFromVerifiedCapabilityGap}
 from '../src/reality-execution-self-repair-handoff-v1.0.js';
const WORK='work:'+'a'.repeat(32);
const REF='https://github.com/maloney2323/Reality/actions/runs/41177409146';
const observation={
 original_work_id:WORK,
 independently_verified:true,evidence_kind:'OBSERVED_FAILURE',
 blocker_class:'MISSING_INSTRUMENT',source_ref:REF,
 capability_id:'reality_completion_receipt',
 verification_suite_ref:'github:frozen-regression:sha256:'+'b'.repeat(64),
 external_action_performed:false,provider_effect_may_have_occurred:false,
};
const scope={
 owner_id:'verified-owner',goal_id:'confirmed-goal',
 original_work_id:WORK,continuity_root_id:'verified-root',
 worldline_id:'verified-world',goal_transition_receipt_ref:'verified-owner-goal-event',
 goal_evidence_ref:'supabase:source-goal',
 target_environment:'ISOLATED_PREVIEW',governance_kernel_hash:'sha256:'+'c'.repeat(64),
};
const workItem={
 work_item_id:WORK,workflow_id:'workflow:user-job',
 action:'Verify customer job completion using missing original-work receipt capability',
 connector:null,operation:'read',consequential:false,
};
const run=async({verify=observation,repair=null}={})=>
 executeAuthorizedWork({
  workItem,workflowId:workItem.workflow_id,originalWorkId:WORK,
  authorization:{authorization_id:'pure-internal-nonconsequential'},
  connector:{execute:async()=>({providerExecutionId:'internal:original-customer-job',
   observation:{work_item_id:WORK,phase:'RUNNING'}})},
  independentVerifier:{verify:async()=>verify},
  ...(repair?{onVerifiedCapabilityGap:repair}:{}),
 });
test('normal original job automatically hands off independently verified missing capability to same constitutional driver',async()=>{
 let observed=0,providerReceipt=0,driverCalls=0;
 const actual=await run({
  verify:{verified:false,independent:true,...observation},
  repair:async request=>{
   observed++;
   assert.equal(request.original_work_id,WORK);
   assert.equal(request.independent_failure.capability_id,'reality_completion_receipt');
   assert.equal(request.production_write_permitted,false);
   assert.equal(request.customer_job_completed,false);
   return continueOriginalJobFromVerifiedCapabilityGap({
    originalWorkId:request.original_work_id,scope,
    originalJobFailure:request.independent_failure,
    providerReobserve:async input=>{
     providerReceipt++;
     assert.equal(input.source_ref,REF);
     return {...observation};
    },
    adapters:{
     observeMissingCapability:async()=>({
      kind:'GAP_CONFIRMED',original_work_id:WORK,
      capability_id:'reality_completion_receipt',failure_refs:[REF],
      verification_suite_ref:observation.verification_suite_ref,
     }),
     verifyIndependentReceipt:async()=>({verified:true}),
     persistCheckpoint:async()=>({persisted:true}),
    },
    runDriver:async ({state,adapters})=>{
     driverCalls++;
     const evidence=await adapters.observeMissingCapability({scope});
     assert.equal(evidence.original_work_id,WORK);
     assert.equal(evidence.capability_id,'reality_completion_receipt');
     // This check proves the handoff, NOT that the missing source is installed.
     return {status:'WORK_BUDGET_EXHAUSTED_CHECKPOINT_PRESERVED',
      state,original_job_completed:false,owner_action_required:false};
    },
   });
  },
 });
 assert.equal(observed,1);
 assert.equal(providerReceipt,1);
 assert.equal(driverCalls,1);
 assert.equal(actual.status,'UNRESOLVED');
 assert.equal(actual.self_repair.status,'WORK_BUDGET_EXHAUSTED_CHECKPOINT_PRESERVED');
 assert.equal(actual.self_repair.original_work_id,WORK);
 assert.equal(actual.self_repair.new_job_created,false);
 assert.equal(actual.self_repair.original_job_completed,false);
});
test('missing owner approval or fake independent observation never invokes self repair',async()=>{
 let repairs=0;
 for(const verify of [
  {verified:false,independent:false,...observation},
  {verified:false,independent:true,...observation,
   independently_verified:false},
  {verified:false,independent:true,...observation,
   blocker_class:'AUTHORIZATION_MISSING'},
  {verified:false,independent:true,...observation,
   blocker_class:'TRANSIENT_PROVIDER_FAILURE'},
  {verified:false,independent:true,...observation,
   external_action_performed:true},
  {verified:false,independent:true,...observation,
   provider_effect_may_have_occurred:true},
  {verified:false,independent:true,...observation,
   original_work_id:'work:'+'f'.repeat(32)},
  {verified:true,independent:true,...observation},
 ]){
  const result=await run({verify,repair:async()=>{repairs++;}});
  assert.equal(result.self_repair,undefined);
 }
 assert.equal(repairs,0);
});
test('model-only or stale provider evidence does not start source generation',async()=>{
 const adapters={observeMissingCapability:async()=>{throw Error('MODEL_NOT_ALLOWED')},
  persistCheckpoint:async()=>{},verifyIndependentReceipt:async()=>{}};
 for(const mutated of [
  {...observation,source_ref:'https://not-our-repo/issues/9'},
  {...observation,independently_verified:false},
  {...observation,blocker_class:'AUTHORIZATION_MISSING'},
  {...observation,no_automatic_retry:true},
 ]){
  await assert.rejects(continueOriginalJobFromVerifiedCapabilityGap({
   originalWorkId:WORK,scope,originalJobFailure:mutated,
   providerReobserve:async()=>{throw Error('SHOULD_NOT_READ');},adapters,
  }),/EXECUTION_SELF_REPAIR_SAFE_INDEPENDENT_MISSING_INSTRUMENT_REQUIRED/);
 }
});
test('same original owner work fails closed if provider recheck disagrees',async()=>{
 await assert.rejects(continueOriginalJobFromVerifiedCapabilityGap({
  originalWorkId:WORK,scope,originalJobFailure:observation,
  providerReobserve:async()=>({...observation,
   source_ref:'https://github.com/maloney2323/Reality/actions/runs/99'}),
  adapters:{observeMissingCapability:async()=>({kind:'GAP_CONFIRMED'})},
 }),/EXECUTION_SELF_REPAIR_REOBSERVED_CAPABILITY_GAP_NOT_ESTABLISHED/);
});
test('registered capability is a diagnosis, not a new job or new installation',async()=>{
 let driverCalls=0;
 const result=await continueOriginalJobFromVerifiedCapabilityGap({
  originalWorkId:WORK,scope,originalJobFailure:observation,
  providerReobserve:async()=>observation,
  capabilityRegistry:[{id:'reality_completion_receipt'}],
  adapters:{observeMissingCapability:async()=>{throw Error('SHOULD_NOT_RUN')}},
  runDriver:async()=>{driverCalls++},
 });
 assert.equal(result.status,'DIAGNOSIS_ONLY_NO_NEW_CAPABILITY');
 assert.equal(result.new_job_created,false);
 assert.equal(result.installation_authorized,false);
 assert.equal(driverCalls,0);
});
test('repair handoff error does not rewrite an unresolved original job as success',async()=>{
 const result=await run({
  verify:{verified:false,independent:true,...observation},
  repair:async()=>{throw Error('UNAVAILABLE_NO_MODEL_GRANT')},
 });
 assert.equal(result.status,'UNRESOLVED');
 assert.equal(result.self_repair.status,'REPAIR_HANDOFF_NEEDS_RECONCILIATION');
 assert.equal(result.self_repair.original_job_completed,false);
});
