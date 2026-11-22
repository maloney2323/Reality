import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectFinalLoopOnExistingSignedWorker as inspect,
 recordOneFinalLoopEvidenceCheckpoint as record}
 from '../src/reality-final-loop-signed-worker-bridge-v1.js';
import {assertRealityUnifiedShiftGraph} from '../src/reality-shift-unified-execution-controller-v1.js';

const owner='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const shift='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const work='work:'+'1'.repeat(32);
const sha=n=>'sha256:'+n.repeat(64);
const source='https://github.com/maloney2323/Reality/issues/301';
const graph=assertRealityUnifiedShiftGraph({
 status:'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED',
 owner_id:owner,shift_id:shift,plan_fingerprint:sha('c'),
 completion_bound:true,selected_sources:1,
 execution_scope_from_owner_warrant_only:true,new_job_created:false,
 installation_authorized:false,original_job_completed_by_graph:false,
 production_changed:false,jobs:[{
  source_step_index:2,source_ref:source,
  original_kind:'REAL_ENGINEERING_REPAIR_ORIGINAL',
  phase:'SOURCE_ADMITTED',original_work_id:work,
  source_proof_sha256:sha('a'),independent_source_proof_verified:true,
  next_governed_action:'GENERATE_AND_TEST_ORIGINAL',
  capability_installation_authorized:false,
  provider_effect_claimed_by_graph:false,
  original_job_completed_by_graph:false
 }]
});
const wake={status:'SHIFT_WORKER_PULSE_DURABLY_RECORDED',shift_id:shift};
const db={strictSecrets:true,project:'reality-test'};
const env={VERCEL_ENV:'preview',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:'reality-test',
 REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED:'true'};
const now='2026-11-22T22:01:00Z';
const proof={
 original_work_id:work,source_ref:source,
 acceptance_contract_sha256:sha('d'),
 continuity_head_sha256:sha('e'),ledger_revision:1,
 evidence:{independently_verified:true,receipt_sha256:sha('f'),
  observed_at:'2026-11-22T22:00:00Z'},
 authority:{status:'EXACT_WARRANT_VERIFIED',owner_id:owner,
  original_work_id:work,acceptance_contract_sha256:sha('d'),
  independently_verified:true,receipt_sha256:sha('7'),
  claim_consumed:false,requested_effects:['READ'],
  permitted_effects:['READ']},
 capacity:{status:'SIGNED_WORKER_HANDLER_ATTESTED',
  independently_attested:true,receipt_sha256:sha('8'),
  scheduled_worker_observed:true},
 outcome:{status:'NOT_VERIFIED'},universe:null,blocker:null,
 original_settled:false
};
const ledger={
 status:'OWNER_SHIFT_FINAL_LOOP_LEDGER_INDEPENDENT_READ',
 read_only:true,independent_owner_scope_verified:true,
 owner_id:owner,shift_id:shift,plan_fingerprint:sha('c'),
 continuity_root_id:'cccccccc-cccc-4ccc-cccc-cccccccccccc',
 head_sha256:sha('e'),acceptance_contract_sha256:sha('d'),
 acceptance_frozen:true,owner_acceptance_verified:true,
 observed_at:'2026-11-22T22:00:00Z',revision:1,
 installation_authorized:false,production_changed:false,jobs:[proof]
};
const caller=(read,options={})=>inspect({
 db,wake,graph,env,now,read,fetchImpl:async()=>{throw Error('NO_NETWORK');},
 ...options
});

test('disabled signed worker shadow makes zero provider calls',async()=>{
 let count=0;
 const r=await caller(async()=>{count++;throw Error('NOT_EXPECTED')},{
  env:{...env,REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED:'false'}
 });
 assert.equal(r.status,'FINAL_LOOP_SHADOW_NOT_ENABLED');
 assert.equal(count,0);
 assert.equal(r.executor_invoked,false);
});

test('invalid signed wake never calls provider or evaluates ledger',async()=>{
 let count=0;
 const r=await caller(async()=>{count++;return null;},{
  wake:{...wake,shift_id:'dddddddd-dddd-4ddd-dddd-dddddddddddd'}
 });
 assert.equal(r.status,'FINAL_LOOP_SIGNED_WORKER_OWNER_SCOPE_UNVERIFIED');
 assert.equal(count,0);
});

test('reuses current DB shift graph and fences wrong lineage before reading proofs',async()=>{
 const drift={...graph,plan_fingerprint:sha('9')};
 let count=0;
 const r=await caller(async(db,name)=>{
  count++;assert.equal(name,'reality_read_current_shift_execution_graph_v1');
  return {...drift,status:'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED',
   completion_bound:true,selected_sources:1,
   execution_scope_from_owner_warrant_only:true,
   new_job_created:false,original_job_completed_by_graph:false,
   jobs:[{...graph.jobs[0]}]};
 });
 assert.equal(count,1);
 assert.equal(r.status,'FINAL_LOOP_CANONICAL_SOURCE_GRAPH_DRIFT_FENCED');
 assert.equal(r.transition_committed,false);
});

test('uninstalled canonical proof RPC is a visible blocker, not fabricated success',async()=>{
 const r=await caller(async(db,name)=>{
  if(name==='reality_read_current_shift_execution_graph_v1')
   return {...graph,status:'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED',
    completion_bound:true,selected_sources:1,
    execution_scope_from_owner_warrant_only:true,new_job_created:false,
    original_job_completed_by_graph:false,
    jobs:[{...graph.jobs[0]}]};
  assert.equal(name,'reality_read_current_final_loop_proof_envelope_v1');
  throw Error('RPC_NOT_YET_DEPLOYED');
 });
 assert.equal(r.status,'FINAL_LOOP_CANONICAL_PROOF_RPC_NOT_CONNECTED');
 assert.equal(r.next_governed_action,
  'CONNECT_SERVICE_ONLY_CANONICAL_ACCEPTANCE_AND_PROOF_READBACK');
 assert.equal(r.original_job_completed,false);
});

test('same signed shift with independent proof envelope only yields bounded decisions',async()=>{
 const r=await caller(async(db,name,payload)=>{
  if(name==='reality_read_current_shift_execution_graph_v1')
   return {...graph,status:'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED',
    completion_bound:true,selected_sources:1,
    execution_scope_from_owner_warrant_only:true,new_job_created:false,
    original_job_completed_by_graph:false,
    jobs:[{...graph.jobs[0]}]};
  assert.equal(name,'reality_read_current_final_loop_proof_envelope_v1');
  assert.deepEqual(payload,{p_shift_id:shift});
  return ledger;
 });
 assert.equal(r.status,'CANONICAL_FINAL_LOOP_DECISIONS_READY');
 assert.equal(r.decisions[0].decision,'ADVANCE');
 assert.equal(r.decisions[0].original_work_id,work);
 assert.equal(r.decisions[0].transition_committed,false);
 assert.equal(r.transition_requires_atomic_service_claim,true);
 for(const k of ['executor_invoked','transition_committed',
  'installation_authorized','original_job_completed','shift_completed'])
  assert.equal(r[k],false);
});

test('signed worker source actually invokes shadow bridge without changing executors',()=>{
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const rpc=readFileSync(new URL(
  '../src/reality-governed-shift-boundary-v1.js',import.meta.url),'utf8');
 assert.match(worker,/inspectFinalLoopOnExistingSignedWorker/);
 assert.match(worker,/final_loop_engine_shadow:finalLoopEngineShadow/);
 assert.match(worker,/expectedShiftId:initialGraph.shift_id/);
 assert.match(rpc,/read_current_final_loop_proof_envelope_v1/);
});


const pendingEnvelope={
 schema:'reality-final-loop-canonical-proof-readback-v1',
 status:'FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING',
 owner_id:owner,shift_id:shift,plan_fingerprint:sha('c'),
 read_only:true,independent_owner_scope_verified:true,
 owner_acceptance_verified:false,acceptance_contract_sha256:null,
 execution_authorized:false,installation_authorized:false,
 original_job_completed:false,production_changed:false,
 frozen_shift_scope_sha256:sha('2'),continuity_head_sha256:sha('e'),
 revision:1,jobs:[{
  source_ref:source,original_work_id:work,
  original_kind:'REAL_ENGINEERING_REPAIR_ORIGINAL',
  source_proof_sha256:sha('a'),
  independent_source_proof_verified:true,
  original_acceptance_verified:false,authority_proof_verified:false,
  capacity_proof_verified:false,final_outcome_verified:false,
  settlement_eligible:false,evidence_checkpoint_recorded_on_head:false
 }]
};
const rawGraph=()=>({...graph,status:'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED',
 completion_bound:true,selected_sources:1,
 execution_scope_from_owner_warrant_only:true,new_job_created:false,
 original_job_completed_by_graph:false,jobs:[{...graph.jobs[0]}]});
const acceptedRead=async(db,name)=>{
 if(name==='reality_read_current_shift_execution_graph_v1')return rawGraph();
 if(name==='reality_read_current_final_loop_proof_envelope_v1')
  return pendingEnvelope;
 throw Error('UNEXPECTED_RPC');
};
test('real shift warrant is not silently treated as customer-original acceptance',async()=>{
 const r=await caller(acceptedRead);
 assert.equal(r.status,'FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING');
 assert.equal(r.checkpoint_candidates[0].original_work_id,work);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.transition_committed,false);
 assert.equal(r.execution_authorized_by_engine,undefined);
});
test('a forged pending acceptance or future permission never becomes a checkpoint candidate',async()=>{
 const r=await caller(async(db,name)=>{
  if(name==='reality_read_current_shift_execution_graph_v1')
   return rawGraph();
  return {...pendingEnvelope,owner_acceptance_verified:true};
 });
 assert.equal(r.status,'FINAL_LOOP_CANONICAL_PENDING_PROOF_READBACK_INVALID');
});
test('already-checkpointed original is not repeated by the same head',async()=>{
 const r=await caller(async(db,name)=>{
  if(name==='reality_read_current_shift_execution_graph_v1')
   return rawGraph();
  return {...pendingEnvelope,jobs:[{
   ...pendingEnvelope.jobs[0],evidence_checkpoint_recorded_on_head:true
  }]};
 });
 assert.equal(r.status,'FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING');
 assert.equal(r.checkpoint_candidates.length,0);
});
const run='dddddddd-dddd-4ddd-dddd-dddddddddddd';
const checkpointEnv={...env,
 REALITY_FINAL_LOOP_EVIDENCE_CHECKPOINT_ENABLED:'true'};
const expectedInspection={
 status:'FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING',shift_id:shift,
 frozen_shift_scope_sha256:sha('2'),
 continuity_head_sha256:sha('e'),revision:1,
 checkpoint_candidates:[{original_work_id:work,source_ref:source}]
};
const receipt={
 status:'FINAL_LOOP_EVIDENCE_ONLY_CHECKPOINT_DURABLY_RECORDED',
 receipt_id:'eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee',
 receipt_sha256:sha('f'),shift_id:shift,original_work_id:work,
 decision:'REFRESH',reason_code:'CANONICAL_ACCEPTANCE_PENDING',
 evidence_only:true,transition_committed:true,
 execution_authorized:false,installation_authorized:false,
 original_job_completed:false,production_changed:false
};
test('evidence checkpoint writer disabled means zero DB calls',async()=>{
 let count=0;
 const r=await record({db,wake,workerRunId:run,
  inspection:expectedInspection,env,call:async()=>{count++}});
 assert.equal(r.status,'FINAL_LOOP_DURABLE_CHECKPOINT_DISABLED');
 assert.equal(count,0);
});
test('exact signed wake reserves only one evidence-only REFRESH checkpoint',async()=>{
 let called=0;
 const r=await record({db,wake,workerRunId:run,
  inspection:expectedInspection,env:checkpointEnv,
  call:async(db,name,payload)=>{
   called++;
   assert.equal(name,'reality_record_final_loop_evidence_checkpoint_v1');
   assert.equal(payload.p_original_work_id,work);
   assert.equal(payload.p_expected_revision,1);
   assert.equal(payload.p_decision,'REFRESH');
   assert.equal(payload.p_reason_code,'CANONICAL_ACCEPTANCE_PENDING');
   assert.equal(payload.p_worker_run_id,run);
   return receipt;
  }});
 assert.equal(called,1);
 assert.equal(r.status,'FINAL_LOOP_EVIDENCE_ONLY_CHECKPOINT_INDEPENDENTLY_ACKNOWLEDGED');
 assert.equal(r.evidence_checkpoint_acknowledged,true);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.transition_committed,false);
});
test('unknown database write effect is fenced without a second call',async()=>{
 let called=0;
 const r=await record({db,wake,workerRunId:run,
  inspection:expectedInspection,env:checkpointEnv,
  call:async()=>{called++;throw Error('TRANSIENT_TIMEOUT')}});
 assert.equal(called,1);
 assert.equal(r.status,'FINAL_LOOP_EVIDENCE_CHECKPOINT_EFFECT_UNCERTAIN_NO_RETRY');
 assert.equal(r.original_job_completed,false);
});
test('write receipt cannot authorize installation or original settlement',async()=>{
 const r=await record({db,wake,workerRunId:run,
  inspection:expectedInspection,env:checkpointEnv,
  call:async()=>({...receipt,original_job_completed:true})});
 assert.equal(r.status,'FINAL_LOOP_DB_CHECKPOINT_RECEIPT_UNVERIFIED_NO_REPLAY');
});
test('one signed worker integrates readback and optional checkpoint only',()=>{
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const boundary=readFileSync(new URL(
  '../src/reality-governed-shift-boundary-v1.js',import.meta.url),'utf8');
 assert.match(worker,/recordOneFinalLoopEvidenceCheckpoint/);
 assert.match(worker,/final_loop_evidence_checkpoint:finalLoopEvidenceCheckpoint/);
 assert.match(boundary,/record_final_loop_evidence_checkpoint_v1/);
});
