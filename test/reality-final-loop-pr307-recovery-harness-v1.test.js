// PR #307's actual source/Continuity identities, used only as a TEST FIXTURE.
// It is NOT a live RED receipt, a signed DB write, or a verified repaired job.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareRecoveryContract,decideNextRecoveryTransition,
 fingerprintRecoveryStrategy,projectRecoveryContractFromFinalLoop}
 from '../src/reality-final-loop-proof-carrying-recovery-v1.js';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const shift='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const root='36f0ad48-f391-549f-8622-66cd493977e7';
const work='work:315562fe1bd66b30a48bb9be4f1d162a';
const source='https://github.com/maloney2323/Reality/pull/307';
const sourceHead='ef66038297480f5da9444072e5e79f5c59b27184';
const continuityHead='sha256:29b89171b23a7009a6e6fa42f10ae3b0a653e9246cec61c486bdff6b4c12eb93';
const qualifier='sha256:2970895f1e43cb93649bd33c3804e684d1397c9ee7bec472652ca1612ddcdf1a';
const diagnostic='sha256:336e6cfc1ed67599d5478d32e9a5288034678cde90caa6e6e8f3fba17e365e0f';
const sha=x=>'sha256:'+x.repeat(64);
const graph={status:'UNIFIED_OWNER_JOB_CONTROL_READY',owner_id:owner,shift_id:shift,
 jobs:[{source_ref:source,original_work_id:work,independent_source_proof_verified:true},
  {source_ref:'https://github.com/maloney2323/Reality/pull/308',
   original_work_id:null,independent_source_proof_verified:true}]};
const handoff={source_ref:source,original_work_id:work,
 continuity_identity_verified:true,qualifier_digest_verified:true,
 qualifier_receipt_sha256:qualifier,
 unresolved_proof_gates:['CASE_SPECIFIC_FROZEN_RED_NOT_VERIFIED',
  'BUSINESS_ORIGINAL_WARRANT_MISMATCH','ORIGINAL_CLAIM_NOT_ADMITTED']};
const continuityReturn={status:'FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING',
 owner_id:owner,shift_id:shift,continuity_head_sha256:continuityHead,
 shared_continuity_guard:{status:'FINAL_LOOP_SHARED_CONTINUITY_GUARD_VERIFIED_READ_ONLY',
  continuity_root_id:root,handoffs:[handoff]}};
const stagedRoutes={status:'FINAL_LOOP_STAGED_PLANS_VERIFIED_AND_NEXT_HANDLERS_CLASSIFIED',
 routes:[{source_ref:source,parent_original_work_id:work,source_head_sha:sourceHead}]};
const packets={status:'FINAL_LOOP_OWNER_EXACT_CHILD_APPROVALS_READ_ONLY',
 owner_id:owner,shift_id:shift,execution_authorized:false,
 packets:[{source_ref:source,parent_original_work_id:work,approved:true,
  state:'APPROVED_ONCE',effect_type:'READ_ONLY_INTERNAL_PR_REVIEW',
  packet_id:'d174c05e-67b7-4a2b-a0f3-4ab320c009b7'}]};
function candidate(g=graph,c=continuityReturn){
 return projectRecoveryContractFromFinalLoop({
  graph:g,continuityReturn:c,stagedRoutes,ownerPackets:packets});
}
test('PR307 freezes a contract CANDIDATE on existing source, same original, no new job',()=>{
 const r=candidate();
 assert.equal(r.status,'RECOVERY_PROOF_CONTRACT_CANDIDATE_NEEDS_DURABLE_FREEZE');
 assert.equal(r.contract_candidate.obligation_id,work);
 assert.equal(r.contract_candidate.source_revision,sourceHead);
 assert.equal(r.contract_candidate.continuity_head_sha256,continuityHead);
 assert.equal(r.contract_candidate.blocker_evidence_sha256,qualifier);
 assert.equal(r.contract_candidate.ledger_freeze_verified,false);
 assert.equal(r.read_only_review_approved,true);
 assert.equal(r.execution_authorized,false);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.production_changed,false);
});
test('existing CI diagnostic is not the missing frozen RED proof',()=>{
 const c=candidate().contract_candidate;
 assert.notEqual(diagnostic,c.blocker_evidence_sha256);
 const verdict=decideNextRecoveryTransition({
  contract:c,proofReceipts:[],failedAttempts:[],
  durableFreeze:{status:'NO_ATOMIC_CONTINUITY_FREEZE_RECORDED'}
 });
 assert.equal(verdict.status,'RECOVERY_CONTRACT_NOT_DURABLY_FROZEN');
 assert.equal(verdict.next_governed_action,
  'FREEZE_RECOVERY_CONTRACT_WITH_ATOMIC_CONTINUITY_SERVICE');
 assert.equal(verdict.original_job_completed,false);
});
test('PR308 cannot be folded into PR307 by sharing the shift',()=>{
 const counterfeit={...continuityReturn,shared_continuity_guard:{
  ...continuityReturn.shared_continuity_guard,
  handoffs:[{...handoff,source_ref:'https://github.com/maloney2323/Reality/pull/308'}]}};
 const r=candidate(graph,counterfeit);
 assert.equal(r.status,'RECOVERY_SOURCE_OR_PARENT_IDENTITY_AMBIGUOUS');
 assert.equal(r.execution_authorized,false);
});
test('model candidates from prior wrong-target review are not proof',()=>{
 const c=prepareRecoveryContract({obligation:{owner_id:owner,shift_id:shift,
  obligation_id:work,continuity_root_id:root,
  continuity_head_sha256:continuityHead,source_ref:source,
  source_revision:sourceHead,independent_source_proof_verified:true},
  blocker:{classification:'EVIDENCE',kind:'CASE_SPECIFIC_FROZEN_RED_MISSING',
   signature:'MISSING_INDEPENDENT_FROZEN_TEST',target_scope:'ORIGINAL_SOURCE_BOUND_MAINTENANCE',
   evidence_sha256:qualifier,independent_evidence_observed:true}});
 const s={capability_id:'RUN_CASE_SPECIFIC_FROZEN_RED',
  hypothesis_class:'PRIOR_WRONG_TARGET_ATTEMPT',
  target_scope_sha256:sha('f'),env_state_hash:sha('1'),source_revision:sourceHead,
  proposed_changed_files:0,estimated_wall_seconds:50,estimated_cost_units:3};
 const failure={contract_id:c.contract_id,obligation_id:work,
  strategy_fingerprint:fingerprintRecoveryStrategy(c,s),
  failure_class:'WRONG_TARGET',
  independent_failure_receipt_sha256:sha('9'),
  executor_worker_run_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  verifier_worker_run_id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  independent_failure_verified:true,
  source:'INDEPENDENT_SIGNED_VERIFIER_LEDGER_READBACK',
  wall_seconds:30,cost_units:2,changed_files:0};
 const freeze={status:'RECOVERY_CONTRACT_ATOMIC_FREEZE_VERIFIED',
  contract_id:c.contract_id,contract_fingerprint:c.contract_fingerprint,
  obligation_id:work,continuity_root_id:root,freeze_receipt_sha256:sha('2'),
  independently_observed:true};
 const env={source:'INDEPENDENT_SIGNED_SOURCE_EPOCH_READBACK',
  independent_verified:true,env_state_hash:sha('1'),
  source_revision:sourceHead,receipt_sha256:sha('3')};
 const budgetLedger={
  source:'INDEPENDENT_SIGNED_RECOVERY_BUDGET_LEDGER_READBACK',
  independent_verified:true,contract_id:c.contract_id,obligation_id:work,
  continuity_root_id:root,receipt_sha256:sha('5'),
  total_attempts:1,spent_wall_seconds:30,spent_cost_units:2,
  cumulative_touched_files:0
 };
 const diag={source:'SIGNED_WARRANT_LEDGER_READBACK',valid:true,
  obligation_id:work,continuity_root_id:root,source_revision:sourceHead,
  warrant_receipt_sha256:sha('4')};
 const same=decideNextRecoveryTransition({contract:c,durableFreeze:freeze,budgetLedger,
  failedAttempts:[failure],strategy:{...s,environment_proof:env},
  diagnosticWarrant:diag,registeredCapabilities:[s.capability_id]});
 assert.equal(same.status,'RECOVERY_IDENTICAL_FAILED_STRATEGY_REJECTED');
 const pivot=decideNextRecoveryTransition({contract:c,durableFreeze:freeze,budgetLedger,
  failedAttempts:[failure],strategy:{...s,
   hypothesis_class:'FOCUSED_CAUSAL_TEST_REPRODUCTION',
   environment_proof:env},diagnosticWarrant:diag,
  registeredCapabilities:[s.capability_id]});
 assert.equal(pivot.status,'RECOVERY_SIGNED_CAPABILITY_CLAIM_ELIGIBLE_NOT_DISPATCHED');
 assert.equal(pivot.claim_created,false);
 assert.equal(pivot.execution_authorized,false);
});
test('same signed worker publishes recovery candidate after return fence, never claims freeze',()=>{
 const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',
  import.meta.url),'utf8');
 assert.match(worker,/projectRecoveryContractFromFinalLoop/);
 assert.match(worker,/final_loop_proof_carrying_recovery:finalLoopProofCarryingRecovery/);
 assert.ok(worker.indexOf('const finalLoopProofCarryingRecovery=')>
  worker.indexOf("workerStage='SHARED_CONTINUITY_VERIFIER_RETURN_FENCE'"));
 assert.ok(worker.indexOf('const finalLoopProofCarryingRecovery=')<
  worker.indexOf("workerStage='WORKER_RESPONSE_PUBLICATION'"));
 assert.doesNotMatch(worker,/reality_claim_proof_recovery_from_model_v1/);
});