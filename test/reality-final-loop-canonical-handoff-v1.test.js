import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyFinalLoopCanonicalContinuityHandoff as verify}
 from '../src/reality-final-loop-canonical-handoff-v1.js';
import {projectRealityFinalLoopTimeHorizon as temporal}
 from '../src/reality-final-loop-time-horizon-v1.js';
import {projectRealityFinalLoopExecutiveBrief as executive}
 from '../src/reality-final-loop-executive-brief-v1.js';
const owner='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const shift='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const root='cccccccc-cccc-4ccc-cccc-cccccccccccc';
const hash=n=>'sha256:'+n.repeat(64);
const work='work:'+'1'.repeat(32);
const source='https://github.com/maloney2323/Reality/issues/301';
const time=Date.parse('2026-11-22T22:01:00Z');
const missing=[
 'FROZEN_CUSTOMER_ORIGINAL_ACCEPTANCE',
 'EXACT_ORIGINAL_EFFECT_AUTHORITY',
 'SCHEDULED_WORKER_CAPACITY_ATTESTATION',
 'INDEPENDENT_ORIGINAL_OUTCOME_AND_UNIVERSE_RECONCILIATION'
];
const proof={
 schema:'reality-final-loop-canonical-proof-readback-v1',
 status:'FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING',
 owner_id:owner,shift_id:shift,
 plan_fingerprint:hash('a'),frozen_shift_scope_sha256:hash('b'),
 continuity_root_id:root,continuity_head_sha256:hash('c'),
 revision:1,observed_at:'2026-11-22T22:00:00Z',
 missing_proofs:missing,
 read_only:true,independent_owner_scope_verified:true,
 owner_acceptance_verified:false,acceptance_frozen:false,
 acceptance_contract_sha256:null,
 execution_authorized:false,installation_authorized:false,
 original_job_completed:false,production_changed:false,
 jobs:[{
  source_ref:source,original_work_id:work,
  source_step_index:2,source_phase:'SOURCE_ADMITTED',
  native_next_governed_action:'GENERATE_AND_TEST_ORIGINAL',
  source_proof_sha256:hash('d'),independent_source_proof_verified:true,
  original_acceptance_verified:false,authority_proof_verified:false,
  capacity_proof_verified:false,final_outcome_verified:false,
  settlement_eligible:false,evidence_checkpoint_recorded_on_head:false
 }]
};
const sourceGraph={
 status:'UNIFIED_OWNER_JOB_CONTROL_READY',
 owner_id:owner,shift_id:shift,plan_fingerprint:hash('a'),
 installation_authorized:false,production_changed:false,
 jobs:[{source_ref:source,original_work_id:work,
  source_step_index:2,phase:'SOURCE_ADMITTED',
  next_governed_action:'GENERATE_AND_TEST_ORIGINAL',
  source_proof_sha256:hash('d'),independent_source_proof_verified:true}]
};
function bundle(raw=proof){
 const timeHorizon=temporal({engine:{
  schema:'reality-final-loop-owner-readback-v1',
  status:'FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING',
  owner_id:owner,shift_id:shift,
  plan_fingerprint:raw.plan_fingerprint,
  frozen_shift_scope_sha256:raw.frozen_shift_scope_sha256,
  continuity_root_id:raw.continuity_root_id,
  continuity_head_sha256:raw.continuity_head_sha256,
  revision:raw.revision,missing_proofs:raw.missing_proofs,
  original_job_completed:false,shift_completed:false,
  installation_authorized:false,production_changed:false,
  decisions:raw.jobs.map(j=>({
   original_work_id:j.original_work_id,source_ref:j.source_ref,
   source_step_index:j.source_step_index,source_phase:j.source_phase,
   native_next_governed_action:j.native_next_governed_action,
   decision:'REFRESH',
   next_governed_action:
    'INDEPENDENTLY_BIND_FROZEN_ORIGINAL_GOAL_ACCEPTANCE_AND_FOUR_PROOFS',
   reason:'CUSTOMER_ORIGINAL_ACCEPTANCE_NOT_INDEPENDENTLY_PROVEN',
   transition_committed:false
  }))
 }});
 return {timeHorizon,executive:executive({timeHorizon})};
}
const check=(changes={})=>{
 const {timeHorizon,executive:brief}=bundle();
 return verify({
  proof,expectedOwnerId:owner,expectedShiftId:shift,
  expectedPlanFingerprint:hash('a'),sourceGraph,
  timeHorizon,executive:brief,now:time,...changes
 });
};
test('existing shift source proof Continuity time horizon and CEO brief share one bound capsule',()=>{
 const r=check();
 assert.equal(r.status,'CANONICAL_HANDOFF_CARRIED_WITH_UNFINISHED_PROOFS');
 assert.equal(r.canonical_handoff_verified,true);
 assert.equal(r.continuity_root_id,root);
 assert.deepEqual(r.missing_proofs,missing);
 assert.equal(r.source_count,1);
 assert.match(r.read_model_digest_sha256,/^sha256:[0-9a-f]{64}$/);
 assert.equal(r.original_acceptance_verified,false);
 assert.equal(r.execution_authorized,false);
 assert.equal(r.digest_is_not_independent_fact_proof,true);
 assert.equal(check().read_model_digest_sha256,r.read_model_digest_sha256);
});
test('cannot silently omit any proof obligation before CEO or Universe',()=>{
 const missingOne={...proof,missing_proofs:missing.slice(0,3)};
 const r=check({proof:missingOne});
 assert.equal(r.canonical_handoff_verified,false);
 assert.equal(r.status,'CANONICAL_HANDOFF_SCOPE_OR_REQUIRED_PROOFS_MISSING');
});
test('cross-root/shift/source tampering is rejected before a proposed next step',()=>{
 for(const input of [
  {proof:{...proof,continuity_root_id:owner}},
  {proof:{...proof,continuity_head_sha256:hash('f')}},
  {proof:{...proof,jobs:[{...proof.jobs[0],original_work_id:'work:'+'2'.repeat(32)}]}},
  {expectedOwnerId:root},
  {sourceGraph:{...sourceGraph,shift_id:root}}
 ]){
  const r=check(input);
  assert.equal(r.canonical_handoff_verified,false);
  assert.equal(r.execution_authorized,false);
 }
});
test('CEO cannot silently change Future into automatically executable work',()=>{
 const {timeHorizon,executive:brief}=bundle();
 const forged={...timeHorizon,future:{
  ...timeHorizon.future,
  preparations:[{...timeHorizon.future.preparations[0],
   automatically_executable:true}]
 }};
 const r=check({timeHorizon:forged,executive:brief});
 assert.equal(r.status,'CANONICAL_HANDOFF_FUTURE_OR_ORIGINAL_DECISION_DRIFT');
 assert.equal(r.canonical_handoff_verified,false);
});
test('a receipt checksum means payload equality, never a verified business outcome',()=>{
 const r=check();
 assert.equal(r.original_job_completed,false);
 assert.equal(r.shift_completed,false);
 assert.equal(r.owner_approval_recorded,false);
 assert.equal(r.digest_is_not_independent_fact_proof,true);
});
