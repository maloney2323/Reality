// End-to-end read-only handoff contract across EXISTING signed worker,
// Final Loop controller, owner Past/Present/Future and CEO-style priority view.
// Both projections consume ONE identical service-only canonical proof. The
// test does not fake any independent original outcome or authorize execution.
import test from 'node:test';
import assert from 'node:assert/strict';
import {assertRealityUnifiedShiftGraph}
 from '../src/reality-shift-unified-execution-controller-v1.js';
import {inspectFinalLoopOnExistingSignedWorker}
 from '../src/reality-final-loop-signed-worker-bridge-v1.js';
import {projectOwnerFinalLoopTimeReadback}
 from '../src/reality-final-loop-owner-time-bridge-v1.js';
const owner='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const shift='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const root='cccccccc-cccc-4ccc-cccc-cccccccccccc';
const h=c=>'sha256:'+c.repeat(64);
const original='work:'+'1'.repeat(32);
const source='https://github.com/maloney2323/Reality/issues/301';
const now='2026-11-22T22:01:00Z';
const raw={
 status:'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED',
 owner_id:owner,shift_id:shift,plan_fingerprint:h('a'),
 completion_bound:true,selected_sources:1,
 execution_scope_from_owner_warrant_only:true,
 new_job_created:false,installation_authorized:false,
 original_job_completed_by_graph:false,production_changed:false,
 jobs:[{
  source_step_index:2,source_ref:source,
  original_kind:'REAL_ENGINEERING_REPAIR_ORIGINAL',
  phase:'SOURCE_ADMITTED',original_work_id:original,
  source_proof_sha256:h('d'),independent_source_proof_verified:true,
  next_governed_action:'RECONCILE_UNFINISHED_ORIGINAL',
  capability_installation_authorized:false,
  original_job_completed_by_graph:false,
  provider_effect_claimed_by_graph:false
 }]
};
const proof={
 schema:'reality-final-loop-canonical-proof-readback-v1',
 status:'FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING',
 owner_id:owner,shift_id:shift,plan_fingerprint:h('a'),
 frozen_shift_scope_sha256:h('b'),continuity_root_id:root,
 continuity_head_sha256:h('c'),
 revision:1,observed_at:'2026-11-22T22:00:00Z',
 missing_proofs:[
  'FROZEN_CUSTOMER_ORIGINAL_ACCEPTANCE',
  'EXACT_ORIGINAL_EFFECT_AUTHORITY',
  'SCHEDULED_WORKER_CAPACITY_ATTESTATION',
  'INDEPENDENT_ORIGINAL_OUTCOME_AND_UNIVERSE_RECONCILIATION'
 ],
 read_only:true,independent_owner_scope_verified:true,
 owner_acceptance_verified:false,acceptance_frozen:false,
 acceptance_contract_sha256:null,
 execution_authorized:false,installation_authorized:false,
 original_job_completed:false,production_changed:false,
 jobs:[{
  source_ref:source,original_work_id:original,
  source_step_index:2,source_phase:'SOURCE_ADMITTED',
  native_next_governed_action:'RECONCILE_UNFINISHED_ORIGINAL',
  source_proof_sha256:h('d'),independent_source_proof_verified:true,
  original_acceptance_verified:false,authority_proof_verified:false,
  capacity_proof_verified:false,final_outcome_verified:false,
  settlement_eligible:false,evidence_checkpoint_recorded_on_head:false
 }]
};
const inspection=async(p=proof,sourceGraph=raw)=>inspectFinalLoopOnExistingSignedWorker({
 db:{strictSecrets:true,project:'reality-test'},
 wake:{status:'SHIFT_WORKER_PULSE_DURABLY_RECORDED',shift_id:shift},
 graph:assertRealityUnifiedShiftGraph(sourceGraph),
 env:{VERCEL_ENV:'preview',REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED:'true',
  REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'reality-test'},
 now,fetchImpl:async()=>{throw Error('NO_NETWORK')},
 read:async(_db,name)=>{
  if(name==='reality_read_current_shift_execution_graph_v1')return sourceGraph;
  if(name==='reality_read_current_final_loop_proof_envelope_v1')return p;
  throw Error('UNKNOWN_RPC');
 }
});
test('signed worker and owner CEO use same canonical Continuity handoff identity and digest',async()=>{
 const signed=await inspection();
 const ownerView=projectOwnerFinalLoopTimeReadback({
  ownerId:owner,shiftId:shift,expectedPlanFingerprint:h('a'),
  proof,now:Date.parse(now)
 });
 assert.equal(signed.status,'FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING');
 assert.equal(ownerView.status,'FINAL_LOOP_OWNER_TIME_AND_EXECUTIVE_EVIDENCE_READY');
 assert.equal(signed.canonical_continuity_handoff.canonical_handoff_verified,true);
 assert.equal(ownerView.canonical_continuity_handoff.canonical_handoff_verified,true);
 assert.equal(
  signed.canonical_continuity_handoff.read_model_digest_sha256,
  ownerView.canonical_continuity_handoff.read_model_digest_sha256
 );
 assert.deepEqual(signed.canonical_continuity_handoff.missing_proofs,
  ownerView.canonical_continuity_handoff.missing_proofs);
 assert.equal(ownerView.executive.primary_attention.engine_decision,'REFRESH');
 assert.equal(signed.original_job_completed,false);
 assert.equal(ownerView.external_execution_authorized,false);
});
test('different owner readback or omitted proof cannot cross the worker-to-CEO handoff',async()=>{
 const wrong={...proof,missing_proofs:proof.missing_proofs.slice(1)};
 const signed=await inspection(wrong);
 const ownerView=projectOwnerFinalLoopTimeReadback({
  ownerId:owner,shiftId:shift,expectedPlanFingerprint:h('a'),
  proof:wrong,now:Date.parse(now)
 });
 assert.equal(signed.status,'FINAL_LOOP_SIGNED_CONTINUITY_HANDOFF_REJECTED');
 assert.equal(ownerView.owner_scope_verified,false);
 assert.equal(ownerView.executive,null);
});

test('mixed live-shaped shift: admitted blocked original vs selected unadmitted source retain DISTINCT instructions',async()=>{
 const unadmitted={
  source_step_index:3,
  source_ref:'https://github.com/maloney2323/Reality/pull/308',
  original_kind:'REAL_PR_REVIEW_ORIGINAL',
  phase:'NOT_ADMITTED',original_work_id:null,
  source_proof_sha256:h('e'),independent_source_proof_verified:true,
  next_governed_action:'ADMIT_ONE_VERIFIED_PR_REVIEW',
  capability_installation_authorized:false,
  original_job_completed_by_graph:false,
  provider_effect_claimed_by_graph:false
 };
 const sourceGraph={...raw,selected_sources:2,
  jobs:[{...raw.jobs[0],source_ref:'https://github.com/maloney2323/Reality/pull/307',
   phase:'BLOCKED',original_kind:'REAL_PR_REVIEW_ORIGINAL'},unadmitted]};
 const proof2={...proof,jobs:[{
  ...proof.jobs[0],source_ref:'https://github.com/maloney2323/Reality/pull/307',
  source_phase:'BLOCKED'
 },{
  ...proof.jobs[0],source_ref:unadmitted.source_ref,
  source_step_index:3,source_phase:'NOT_ADMITTED',
  native_next_governed_action:unadmitted.next_governed_action,
  source_proof_sha256:unadmitted.source_proof_sha256,
  original_work_id:null
 }]};
 const signed=await inspection(proof2,sourceGraph);
 const ownerView=projectOwnerFinalLoopTimeReadback({
  ownerId:owner,shiftId:shift,expectedPlanFingerprint:h('a'),
  proof:proof2,now:Date.parse(now)
 });
 assert.equal(signed.status,'FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING');
 assert.equal(ownerView.status,'FINAL_LOOP_OWNER_TIME_AND_EXECUTIVE_EVIDENCE_READY');
 assert.equal(signed.time_horizon.present.obligations.length,2);
 assert.equal(ownerView.time_horizon.present.obligations.length,2);
 const bySource=new Map(signed.time_horizon.present.obligations.map(x=>[
  x.source_ref,x
 ]));
 assert.equal(bySource.get(unadmitted.source_ref).decision,'SUSPEND');
 assert.equal(bySource.get(unadmitted.source_ref).source_admission_verified,false);
 assert.equal(bySource.get(unadmitted.source_ref).next_governed_action,
  'QUALIFY_DISTINCT_SOURCE_TO_ORIGINAL_BEFORE_ACCEPTANCE');
 assert.equal(bySource.get(sourceGraph.jobs[0].source_ref).decision,'REFRESH');
 assert.equal(bySource.get(sourceGraph.jobs[0].source_ref).source_admission_verified,true);
 assert.equal(ownerView.executive.primary_attention.original_admission_pending,true);
 assert.match(ownerView.executive.next_executive_message,/independent original-job admission/);
 assert.deepEqual(signed.checkpoint_candidates,[{
  original_work_id:original,source_ref:sourceGraph.jobs[0].source_ref
 }]);
 assert.equal(signed.canonical_continuity_handoff.read_model_digest_sha256,
  ownerView.canonical_continuity_handoff.read_model_digest_sha256);
 assert.equal(ownerView.external_execution_authorized,false);
 assert.equal(ownerView.original_job_completed,false);
});
