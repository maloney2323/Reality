import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectRealityFinalLoopExecutiveBrief as brief}
 from '../src/reality-final-loop-executive-brief-v1.js';
import {projectRealityFinalLoopTimeHorizon as horizon}
 from '../src/reality-final-loop-time-horizon-v1.js';
import {projectOwnerFinalLoopTimeReadback as ownerBridge}
 from '../src/reality-final-loop-owner-time-bridge-v1.js';
const owner='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const shift='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const root='cccccccc-cccc-4ccc-cccc-cccccccccccc';
const source='https://github.com/maloney2323/Reality/issues/301';
const work='work:'+'1'.repeat(32);
const sha=c=>'sha256:'+c.repeat(64);
const engine={
 schema:'reality-final-loop-engine-v1',
 owner_id:owner,shift_id:shift,continuity_head_sha256:sha('a'),
 original_job_completed:false,shift_completed:false,
 installation_authorized:false,production_changed:false,
 decisions:[{original_work_id:work,source_ref:source,decision:'RECOVER',
  next_governed_action:'ROUTE_ATTESTED_BLOCKER_TO_EXISTING_CAPABILITY_RECOVERY',
  reason:'INDEPENDENT_RECOVERY_CANDIDATE_REQUIRED',
  transition_committed:false}]
};
const supervisor={
 version:'reality-automatic-shift-supervisor-v1',
 status:'AUTOMATIC_SOURCE_TRIAGE_RECONCILED_NO_NEW_AUTHORITY',
 owner_id:owner,shift_id:shift,
 read_only:true,install_approval_authorized_by_triage:false,
 shift_completed_by_triage:false,production_changed:false,
 jobs:[{original_work_id:work,source_ref:source,
  creates_job:false,approved_installation:false}]
};
const proof={
 schema:'reality-final-loop-canonical-proof-readback-v1',
 status:'FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING',
 owner_id:owner,shift_id:shift,read_only:true,
 independent_owner_scope_verified:true,
 owner_acceptance_verified:false,acceptance_frozen:false,
 acceptance_contract_sha256:null,
 original_job_completed:false,installation_authorized:false,
 execution_authorized:false,production_changed:false,
 plan_fingerprint:sha('e'),frozen_shift_scope_sha256:sha('f'),
 continuity_head_sha256:sha('a'),continuity_root_id:root,
 revision:1,observed_at:'2026-11-22T22:00:00Z',
 missing_proofs:[
  'FROZEN_CUSTOMER_ORIGINAL_ACCEPTANCE',
  'EXACT_ORIGINAL_EFFECT_AUTHORITY',
  'SCHEDULED_WORKER_CAPACITY_ATTESTATION',
  'INDEPENDENT_ORIGINAL_OUTCOME_AND_UNIVERSE_RECONCILIATION'
 ],
 jobs:[{
  original_work_id:work,source_ref:source,
  source_step_index:2,source_phase:'SOURCE_ADMITTED',
  native_next_governed_action:'GENERATE_AND_TEST_ORIGINAL',
  source_proof_sha256:sha('b'),
  independent_source_proof_verified:true,
  original_acceptance_verified:false,
  authority_proof_verified:false,capacity_proof_verified:false,
  final_outcome_verified:false,settlement_eligible:false,
  evidence_checkpoint_recorded_on_head:false
 }]
};
const now=Date.parse('2026-11-22T22:01:00Z');
const past={
 status:'INDEPENDENT_HISTORY_VERIFIED',
 receipt_scope:'INDEPENDENT_SETTLED_FULL_LOOP_ONLY',
 verified_final_loop_receipts:2,
 most_recent_verified_at:'2026-11-20T12:00:00Z'
};
test('executive brief reuses exact owner shift and historical receipts without executing recovery',()=>{
 const h=horizon({engine,independentHistory:past});
 const r=brief({timeHorizon:h,supervisor});
 assert.equal(r.status,'EXECUTIVE_SIGNED_SHIFT_PRIORITIES_READY');
 assert.equal(r.existing_supervisor_cross_checked,true);
 assert.equal(r.priority_items[0].engine_decision,'RECOVER');
 assert.equal(r.past_independent_receipt_count,2);
 assert.equal(r.execution_authorized,false);
 assert.equal(r.new_job_admitted,false);
 assert.equal(r.original_job_completed,false);
});
test('mismatched supervisor and model-invented completed work cannot become CEO priorities',()=>{
 const h=horizon({engine});
 assert.equal(brief({timeHorizon:h,supervisor:{...supervisor,shift_id:root}}).status,
  'EXECUTIVE_SUPERVISOR_SCOPE_CONTRADICTS_FINAL_LOOP');
 assert.equal(brief({timeHorizon:h,supervisor:{...supervisor,jobs:[{
  ...supervisor.jobs[0],original_work_id:'work:'+'2'.repeat(32)}]}}).status,
  'EXECUTIVE_SUPERVISOR_SOURCE_MISMATCH');
 assert.equal(brief({timeHorizon:{...h,execution_authorized:true}}).status,
  'EXECUTIVE_FINAL_LOOP_EVIDENCE_NOT_CONNECTED');
});
test('owner time view projects canonical missing acceptance without claiming a CEO agent',()=>{
 const r=ownerBridge({ownerId:owner,shiftId:shift,
 expectedPlanFingerprint:proof.plan_fingerprint,proof,now,
  independentHistory:past});
 assert.equal(r.status,'FINAL_LOOP_OWNER_TIME_AND_EXECUTIVE_EVIDENCE_READY');
 assert.equal(r.executive.status,'EXECUTIVE_SIGNED_SHIFT_PRIORITIES_READY');
 assert.equal(r.executive.primary_attention.independent_original_acceptance_pending,true);
 assert.equal(r.time_horizon.past.independently_verified_full_loop_receipts,2);
 assert.equal(r.time_horizon.present.obligations[0].decision,'REFRESH');
 assert.equal(r.time_horizon.future.preparations[0].automatically_executable,false);
 assert.equal(r.new_job_authorized,false);
 assert.equal(r.external_execution_authorized,false);
});
test('foreign owner, stale snapshot, fake proof or modified acceptance fails closed',()=>{
 const changes=[
  {ownerId:root,shiftId:shift,proof,now},
  {ownerId:owner,shiftId:shift,proof:{...proof,owner_acceptance_verified:true},now},
  {ownerId:owner,shiftId:shift,proof:{...proof,installation_authorized:true},now},
  {ownerId:owner,shiftId:shift,proof:{...proof,continuity_head_sha256:sha('x')},now},
  {ownerId:owner,shiftId:shift,proof:{...proof,
   jobs:[{...proof.jobs[0],original_work_id:'work:'+'2'.repeat(32),
    settlement_eligible:true}]},now},
  {ownerId:owner,shiftId:shift,proof,now:now+3600000}
 ];
 for(const data of changes){
  const r=ownerBridge({
   expectedPlanFingerprint:proof.plan_fingerprint,...data
  });
  assert.equal(r.owner_scope_verified,false);
  assert.equal(r.executive,null);
  assert.equal(r.external_execution_authorized,false);
 }
});
test('the worker and owner UI share one executive read model rather than new employee control',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const worker=read('api/reality/governed-employee-shift-worker.js');
 const ownerApi=read('api/reality/personal-time-horizon.js');
 const matrix=read('reality-past-present-future-v1.js');
 assert.match(worker,/projectRealityFinalLoopExecutiveBrief/);
 assert.match(worker,/final_loop_executive_brief:finalLoopExecutiveBrief/);
 assert.match(ownerApi,/projectOwnerFinalLoopTimeReadback/);
 assert.match(ownerApi,/REALITY_FINAL_LOOP_OWNER_TIME_VIEW_ENABLED/);
 assert.match(ownerApi,/final_loop_owner:finalLoopOwner/);
 assert.match(matrix,/Final Loop owner proof view not yet verified/);
 assert.match(matrix,/matrixPastCount/);
 assert.match(matrix,/matrixPresentCount/);
 assert.match(matrix,/matrixFutureCount/);
});
