import test from 'node:test';
import assert from 'node:assert/strict';
import {createEvidenceBoundGenerationFactory}
 from '../src/reality-genuine-capability-generation-bridge-v1.js';
import {createGenuineCapabilityEngine}
 from '../src/reality-genuine-capability-engine-v1.js';
const work='work:'+'a'.repeat(32),owner='owner:verified',goal='goal:original';
const source='reality:provider-verified:inventory:missing-receipt-validator';
const suite='github:frozen-regression:sha256:'+'b'.repeat(64);
const scope={owner_id:owner,goal_id:goal,original_work_id:work,
 goal_transition_receipt_ref:'supabase:owner:goal-transition-1',
 goal_evidence_ref:'supabase:owner:source-message',
 continuity_root_id:'root:owner',worldline_id:'worldline:original',
 target_environment:'ISOLATED_PREVIEW',governance_kernel_hash:'sha256:'+'e'.repeat(64)};
const gap={kind:'GENUINE_MISSING_CAPABILITY',
 original_work_id:work,capability_id:'business_receipt_validator',
 original_failure_ref:source,frozen_failure_ref:'frozen:suite:verified-reproduction',
 frozen_suite_sha256:'c'.repeat(64),evidence_hash:'d'.repeat(64),
 install_authorized:false,production_changed:false};
function ticket(){
 return {owner_id:owner,goal_id:goal,original_work_id:work,
 goal_transition_receipt_ref:scope.goal_transition_receipt_ref,
 goal_evidence_ref:scope.goal_evidence_ref,
 continuity_root_id:scope.continuity_root_id,worldline_id:scope.worldline_id,
 confirmed_gap_receipt_ref:gap.frozen_failure_ref,
 confirmed_gap_evidence_hash:gap.evidence_hash,
 frozen_regression_manifest_ref:'inventory_frozen_v1',
 frozen_regression_sha256:gap.frozen_suite_sha256,
 repository_base_sha:'f'.repeat(40),
 repository_branch:'feature/reality-general-capability-engine-20261101',
 source_entrypoint:'src/reality-extensions/business_receipt_validator.mjs',
 environment:'ISOLATED_PREVIEW',max_attempts:3,
 confirmed_gap_source:'INDEPENDENT_PROVIDER_READBACK',
 allowed_source_roots:['src/reality-extensions/','test/reality-extensions/']};
}
const providerAdapters={
 observeMissingCapability:async()=>{throw Error('SYNTHETIC_DISABLED')},
 persistCheckpoint:async()=>{throw Error('SYNTHETIC_DISABLED')},
 verifyIndependentReceipt:async()=>{throw Error('SYNTHETIC_DISABLED')},
};
test('only independently pinned original-job ticket connects real model/sandbox adapters',async()=>{
 let issued=0,constructed=0;
 const factory=createEvidenceBoundGenerationFactory({
  issuePinnedTicket:async input=>{
   issued++;assert.equal(input.original_work_id,work);
   assert.equal(input.no_model_authority,true);
   return ticket();
  },
  providerAdapters,
  makeSandboxAndModel:async({ticket})=>{
   constructed++;
   assert.match(ticket.ticket_hash,/^[a-f0-9]{64}$/);
   assert.equal(ticket.frozen_regression_sha256,gap.frozen_suite_sha256);
   return {generateCandidate:async()=>({}),runIsolatedSandbox:async()=>({})};
  },
 });
 const adapters=await factory({scope,confirmed_gap:gap,original_work_id:work});
 assert.equal(issued,1);assert.equal(constructed,1);
 assert.equal(typeof adapters.generateCandidate,'function');
 assert.equal(typeof adapters.runIsolatedSandbox,'function');
 assert.equal(adapters.persistCheckpoint,providerAdapters.persistCheckpoint);
 assert.equal('authorizePromotion' in adapters,false);
});
test('stale owner goal, frozen suite, different original work, and generated ticket cannot start model',async()=>{
 let builds=0;
 for(const override of [
  {goal_id:'goal:shifted'},
  {original_work_id:'work:'+'b'.repeat(32)},
  {frozen_regression_sha256:'9'.repeat(64)},
  {confirmed_gap_receipt_ref:'frozen:unrelated'},
  {confirmed_gap_evidence_hash:'8'.repeat(64)},
 ]){
  const factory=createEvidenceBoundGenerationFactory({
   issuePinnedTicket:async()=>({...ticket(),...override}),
   providerAdapters,
   makeSandboxAndModel:async()=>{builds++;return {}},
  });
  await assert.rejects(factory({scope,confirmed_gap:gap,original_work_id:work}),
   /GENUINE_GENERATION_PINNED_TICKET_DIFFERS_FROM_ORIGINAL_GAP/);
 }
 assert.equal(builds,0);
});
test('end-to-end original gap proof can select existing live generation adapters once, without executing install',async()=>{
 let builds=0,drivers=0;
 const factory=createEvidenceBoundGenerationFactory({
  issuePinnedTicket:async()=>ticket(),providerAdapters,
  makeSandboxAndModel:async()=>{
   builds++;return {generateCandidate:async()=>({files:[]}),
    runIsolatedSandbox:async()=>({kind:'SANDBOX_FAILED'})};
  },
 });
 const obs={
  original_work_id:work,evidence_kind:'OBSERVED_FAILURE',
  blocker_class:'MISSING_INSTRUMENT',independently_verified:true,
  capability_id:gap.capability_id,source_ref:source,
  verification_suite_ref:suite,
  external_action_performed:false,provider_effect_may_have_occurred:false,
 };
 const engine=createGenuineCapabilityEngine({
  observeOriginalFailure:async()=>obs,
  reobserveOriginalFailure:async()=>obs,
  reproduceFrozenFailure:async()=>({
   independently_verified:true,reproduced_failure:true,
   original_work_id:work,capability_id:gap.capability_id,
   source_ref:source,verification_suite_ref:suite,
   frozen_suite_sha256:gap.frozen_suite_sha256,
   provider_run_ref:'reality:provider-verified:inventory:frozen-reproduction-run-1000',
   frozen_failure_ref:'frozen:suite:verified-reproduction',
   external_action_performed:false,provider_effect_may_have_occurred:false,
  }),
  inspectRegisteredCapability:async()=>({
   independently_verified:true,original_work_id:work,
   capability_id:gap.capability_id,status:'ABSENT'}),
  createAdapters:async input=>{
   // Real source proof hash is computed by the capability engine, rather than
   // taken from the fabricated gap variable in this purely isolated test.
   const dynamicGap=input.confirmed_gap;
   const issue=createEvidenceBoundGenerationFactory({
    issuePinnedTicket:async()=>({...ticket(),
     confirmed_gap_evidence_hash:dynamicGap.evidence_hash}),
    providerAdapters,makeSandboxAndModel:async args=>{
     builds++;assert.equal(args.ticket.original_work_id,work);
     return {generateCandidate:async()=>({files:[]}),
      runIsolatedSandbox:async()=>({kind:'SANDBOX_FAILED'})};
    },
   });
   return issue(input);
  },
  runRepair:async({adapters})=>{
   drivers++;assert.equal(typeof adapters.generateCandidate,'function');
   assert.equal(typeof adapters.runIsolatedSandbox,'function');
   return {status:'OWNER_APPROVAL_REQUIRED',original_work_id:work,
    original_goal_id:goal,new_job_created:false,owner_action_required:true,
    installation_authorized:false,original_job_completed:false,
    capability_phase:'AWAITING_OWNER_APPROVAL',state:{}};
  },
 });
 const result=await engine.run({originalWorkId:work,scope});
 assert.equal(result.status,'OWNER_APPROVAL_REQUIRED');
 assert.equal(result.installed,false);
 assert.equal(builds,1);assert.equal(drivers,1);
});
