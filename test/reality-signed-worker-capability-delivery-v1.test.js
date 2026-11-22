import test from 'node:test';
import assert from 'node:assert/strict';
import {attestSignedWorkerLoadedCapabilities as attest,
 assessSignedWorkerCapabilityActivation as assess}
 from '../src/reality-signed-worker-capability-delivery-v1.js';

const owner='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const shift='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const old='1'.repeat(40), next='2'.repeat(40);
const branch='feature/governed-capability-preview';
const action='REQUALIFY_EXISTING_CONTINUITY_SOURCE';
const wake={status:'SHIFT_WORKER_PULSE_DURABLY_RECORDED',shift_id:shift};
const graph={status:'UNIFIED_OWNER_JOB_CONTROL_READY',
 owner_id:owner,shift_id:shift,installation_authorized:false,
 production_changed:false};
const env=(sha=next)=>({VERCEL_ENV:'preview',
 VERCEL_GIT_COMMIT_SHA:sha,VERCEL_GIT_COMMIT_REF:branch});
const signed=(sha=next,actions=[action])=>attest({
 wake,graph,env:env(sha),registeredActionKeys:actions
});
const candidate={sha:next,branch,shift_id:shift,
 capability_key:action,environment:'ISOLATED_PREVIEW',
 provider_deployment_ready:true,preview_only:true,production_changed:false};
const ci={status:'INDEPENDENT_FROZEN_CI_PASSED',release_sha:next,
 independently_verified:true,test_source_pinned:true,run_id:2026};
const approval={status:'EXACT_PREVIEW_RELEASE_OWNER_APPROVED',
 owner_id:owner,shift_id:shift,release_sha:next,capability_key:action,
 target_environment:'ISOLATED_PREVIEW',receipt_sha256:'sha256:'+'c'.repeat(64),
 approved_at:'2026-11-22T20:00:00Z',production_change_permitted:false};
const alias={independently_observed:true,provider:'VERCEL',
 resolved_release_sha:next,resolved_branch:branch,
 preview_only:true,project_verified:true};
const check=(over={})=>assess({
 attestation:signed(),candidate,ci,approval,alias,
 targetActionKey:action,...over
});

test('signed worker attests the loaded version and real capability types only',()=>{
 const a=signed();
 assert.equal(a.status,'SIGNED_WORKER_RELEASE_AND_REGISTERED_ACTIONS_OBSERVED');
 assert.equal(a.running_release_sha,next);
 assert.deepEqual(a.registered_capability_keys,[action]);
 assert.equal(a.candidate_release_activated,false);
 assert.equal(a.model_tool_permission_granted,false);
 assert.equal(a.original_job_completed,false);
 assert.equal(a.installation_authorized,false);
});

test('missing/forged runtime identity and shift fail closed',()=>{
 assert.equal(attest({wake,graph,env:{VERCEL_ENV:'preview'},
  registeredActionKeys:[action]}).status,
 'SIGNED_WORKER_RUNNING_RELEASE_UNVERIFIED');
 assert.equal(attest({wake:{...wake,shift_id:owner},graph,env:env(),
  registeredActionKeys:[action]}).status,
 'SIGNED_WORKER_CAPABILITY_SCOPE_UNVERIFIED');
 assert.equal(attest({wake,graph,env:env(),registeredActionKeys:['foo']}).status,
 'SIGNED_WORKER_CAPABILITY_SCOPE_UNVERIFIED');
 assert.equal(check({attestation:{...signed(),candidate_release_activated:true}}).status,
 'SIGNED_WORKER_RUNTIME_ATTESTATION_MISSING');
});

test('a deploy-ready candidate with independent CI is not owner activation authority',()=>{
 const v=check({approval:null});
 assert.equal(v.status,
  'QUALIFIED_RELEASE_REQUIRES_EXACT_OWNER_ACTIVATION_AUTHORITY');
 assert.equal(v.next_governed_action,
  'PRESENT_EXACT_CAPABILITY_RELEASE_AND_SCOPE_FOR_OWNER_APPROVAL');
 assert.equal(v.owner_approval_granted,false);
 assert.equal(v.release_change_performed,false);
});

test('preview readiness cannot substitute for independent pinned CI',()=>{
 const x=check({ci:{...ci,release_sha:old}});
 assert.equal(x.status,'CANDIDATE_RELEASE_INDEPENDENT_CI_UNVERIFIED');
 assert.equal(x.capability_usable_by_llm,false);
});

test('an approval for another exact release is unusable',()=>{
 const v=check({approval:{...approval,release_sha:old}});
 assert.equal(v.status,
  'QUALIFIED_RELEASE_REQUIRES_EXACT_OWNER_ACTIVATION_AUTHORITY');
 assert.equal(v.owner_approval_granted,false);
});

test('independent provider alias readback must be available',()=>{
 const v=check({alias:{...alias,independently_observed:false}});
 assert.equal(v.status,'SCHEDULED_WORKER_PROVIDER_ALIAS_UNVERIFIED');
 assert.equal(v.alias_repointed,false);
});

test('old scheduled worker alias blocks delivery even if preview is ready',()=>{
 const v=check({alias:{...alias,resolved_release_sha:old}});
 assert.equal(v.status,'APPROVED_CAPABILITY_NOT_DELIVERED_TO_SCHEDULED_WORKER');
 assert.equal(v.observed_scheduled_release_sha,old);
 assert.equal(v.next_governed_action,
  'GOVERNED_EXACT_PREVIEW_RELEASE_ACTIVATION_REQUIRED');
 assert.equal(v.alias_change_authorized_by_evaluator,false);
});

test('correct alias alone is not proof the signed worker ran new release',()=>{
 const v=check({attestation:signed(old)});
 assert.equal(v.status,'SCHEDULED_WORKER_NOT_YET_ATTESTED_APPROVED_RELEASE');
 assert.equal(v.next_governed_action,'OBSERVE_NEXT_ACTUAL_SIGNED_WORKER_WAKE');
 assert.equal(v.original_job_completed,false);
});

test('matching installed code still needs its registered action handler',()=>{
 const v=check({attestation:signed(next,[])});
 assert.equal(v.status,'APPROVED_RELEASE_LOADED_HANDLER_NOT_REGISTERED');
 assert.equal(v.next_governed_action,
  'REGISTER_AND_INDEPENDENTLY_TEST_EXACT_CAPABILITY_ADAPTER');
 assert.equal(v.capability_usable_by_llm,false);
});

test('fully matched preview remains governed; no implied LLM tool rights or settlement',()=>{
 const v=check();
 assert.equal(v.status,
  'APPROVED_CAPABILITY_LOADED_AWAITING_SIGNED_EXECUTOR_CLAIM');
 assert.equal(v.release_identity_matches,true);
 assert.equal(v.verified_capability_key,action);
 assert.equal(v.next_governed_action,
  'CLAIM_EXACT_GOVERNED_ACTION_AND_INDEPENDENTLY_VERIFY_OUTCOME');
 for(const field of ['release_change_performed','alias_repointed',
  'capability_usable_by_llm','execution_authorized','owner_approval_granted',
  'repair_executed','original_job_completed','production_changed'])
  assert.equal(v[field],false,field);
});

test('arbitrary signed capability types and owner shifts use the same contract',()=>{
 const custom='RECONCILE_PROVIDER_EFFECT_WITHOUT_REPLAY';
 const otherOwner='dddddddd-dddd-4ddd-dddd-dddddddddddd';
 const customWake={...wake,shift_id:otherOwner};
 const customGraph={...graph,owner_id:otherOwner,shift_id:otherOwner};
 const customAtt=attest({wake:customWake,graph:customGraph,env:env(),
  registeredActionKeys:[custom]});
 const v=assess({attestation:customAtt,
  candidate:{...candidate,shift_id:otherOwner,capability_key:custom},
  ci,approval:{...approval,owner_id:otherOwner,shift_id:otherOwner,
   capability_key:custom},alias,targetActionKey:custom});
 assert.equal(v.status,
  'APPROVED_CAPABILITY_LOADED_AWAITING_SIGNED_EXECUTOR_CLAIM');
 assert.equal(v.capability_usable_by_llm,false);
});
