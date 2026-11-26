import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectFinalLoopOnExistingSignedWorker as inspect,
 recordOneFinalLoopEvidenceCheckpoint as record}
 from '../src/reality-final-loop-signed-worker-bridge-v1.js';
import {assertRealityUnifiedShiftGraph} from '../src/reality-shift-unified-execution-controller-v1.js';
import {projectRecoveryContractFromFinalLoop} from '../src/reality-final-loop-proof-carrying-recovery-v1.js';

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
 owner_acceptance_verified:false,acceptance_frozen:false,
 acceptance_contract_sha256:null,
 missing_proofs:[
  'FROZEN_CUSTOMER_ORIGINAL_ACCEPTANCE',
  'EXACT_ORIGINAL_EFFECT_AUTHORITY',
  'SCHEDULED_WORKER_CAPACITY_ATTESTATION',
  'INDEPENDENT_ORIGINAL_OUTCOME_AND_UNIVERSE_RECONCILIATION'
 ],
 execution_authorized:false,installation_authorized:false,
 original_job_completed:false,production_changed:false,
 frozen_shift_scope_sha256:sha('2'),
 continuity_root_id:'cccccccc-cccc-4ccc-cccc-cccccccccccc',
 continuity_head_sha256:sha('e'),
 observed_at:'2026-11-22T22:00:00Z',
 revision:1,jobs:[{
  source_ref:source,original_work_id:work,
  source_step_index:2,source_phase:'SOURCE_ADMITTED',
  native_next_governed_action:'GENERATE_AND_TEST_ORIGINAL',
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


test('canonical Final Loop consumes current qualified next action without granting execution',async()=>{
 const h={
  source_ref:source,original_work_id:work,source_step_index:2,
  qualifier_receipt_sha256:sha('9'),
  qualifier_checked_at:'2026-11-22T22:00:00Z',
  qualifier_next_action:'VERIFY_DISTINCT_CASE_SPECIFIC_FROZEN_CI_REUSE_PRIOR_DIAGNOSTIC',
  unresolved_proof_gates:['CASE_SPECIFIC_FROZEN_RED_NOT_VERIFIED','BUSINESS_ORIGINAL_WARRANT_MISMATCH'],
  independent_source_proof_verified:true,proposed_transition:'SUSPEND',
  reason_code:'AUTHORITY_NOT_VERIFIED',diagnosis_consumable:true,
  recovery_authority_scope:'NO_DISPATCH',
  registered_capability_lease:false,execution_authorized:false,
  owner_approval_granted:false,original_job_completed:false,production_changed:false
 };
 const p={...pendingEnvelope,governed_qualification_handoffs:[h]};
 const r=await caller(async(db,name)=>{
  if(name==='reality_read_current_shift_execution_graph_v1')return rawGraph();
  if(name==='reality_read_current_final_loop_proof_envelope_v1')return p;
  throw Error('UNEXPECTED_RPC');
 });
 assert.equal(r.status,'FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING');
 assert.equal(r.next_governed_action,h.qualifier_next_action);
 assert.equal(r.governed_qualification_handoffs[0].decision,'SUSPEND');
 assert.deepEqual(r.governed_qualification_handoffs[0].unresolved_proof_gates,
  h.unresolved_proof_gates);
 assert.equal(r.governed_qualification_handoffs[0].executor_invoked,false);

 const recovering=await caller(async(db,name)=>{
  if(name==='reality_read_current_shift_execution_graph_v1')return rawGraph();
  return {...p,governed_qualification_handoffs:[{
   ...h,proposed_transition:'RECOVER',
   reason_code:'BLOCKER_ATTESTATION_PENDING',
   recovery_authority_scope:'INTERNAL_MAINTENANCE_ONLY'
  }]};
 });
 assert.equal(recovering.status,'FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING');
 assert.equal(recovering.governed_qualification_handoffs[0].decision,'RECOVER');
 assert.equal(recovering.governed_qualification_handoffs[0].recovery_authority_scope,
  'INTERNAL_MAINTENANCE_ONLY');
 assert.equal(recovering.transition_committed,false);
 assert.equal(recovering.governed_qualification_handoffs[0].executor_invoked,false);

 assert.equal(r.transition_committed,false);
 assert.equal(r.installation_authorized,false);
 const forged=await caller(async(db,name)=>{
  if(name==='reality_read_current_shift_execution_graph_v1')return rawGraph();
  return {...p,governed_qualification_handoffs:[{...h,owner_approval_granted:true}]};
 });
 assert.equal(forged.status,'FINAL_LOOP_GOVERNED_QUALIFICATION_HANDOFF_INVALID');
 const swapped=await caller(async(db,name)=>{
  if(name==='reality_read_current_shift_execution_graph_v1')return rawGraph();
  return {...p,governed_qualification_handoffs:[{...h,original_work_id:'work:'+'2'.repeat(32)}]};
 });
 assert.equal(swapped.status,'FINAL_LOOP_GOVERNED_QUALIFICATION_HANDOFF_INVALID');
});


test('signed Final Loop consumes event shadow only for the same original, never dispatches',async()=>{
 const qualifier={
  source_ref:source,original_work_id:work,source_step_index:2,
  qualifier_receipt_sha256:sha('9'),
  qualifier_checked_at:'2026-11-22T22:00:00Z',
  qualifier_next_action:'COMPLETE_EXISTING_SIGNED_MAINTENANCE_FROZEN_CI',
  unresolved_proof_gates:['CASE_SPECIFIC_FROZEN_RED_NOT_VERIFIED'],
  independent_source_proof_verified:true,proposed_transition:'RECOVER',
  reason_code:'BLOCKER_ATTESTATION_PENDING',diagnosis_consumable:true,
  recovery_authority_scope:'INTERNAL_MAINTENANCE_ONLY',
  registered_capability_lease:false,execution_authorized:false,
  owner_approval_granted:false,original_job_completed:false,production_changed:false
 };
 const event={
  event_id:'66666666-6666-4666-8666-666666666666',
  original_work_id:work,source_ref:source,
  event_kind:'INDEPENDENT_FROZEN_CI_RECEIPT',
  source_receipt_sha256:sha('5'),
  event_causality_sha256:sha('6'),
  event_state:'SHADOW_PENDING',continuity_revision:1,
  source_current:true,would_resume_suspended_obligation:true
 };
 const shadow={
  schema:'reality-final-loop-event-resume-shadow-v1',
  status:'FINAL_LOOP_EVENT_SUBSCRIPTIONS_AND_SIGNAL_TRACE_READ_ONLY',
  shift_id:shift,subscriptions:[{
   original_work_id:work,source_ref:source,
   condition_kind:'INDEPENDENT_FROZEN_CI_RECEIPT',
   subscribed_receipt_sha256:sha('9'),state:'SHADOW_SIGNALED',
   continuity_revision:1
  }],events:[event],
  event_dispatch_enabled:false,execution_authorized:false,
  installation_authorized:false,original_job_completed:false,
  production_changed:false
 };
 const pending={...pendingEnvelope,governed_qualification_handoffs:[qualifier]};
 const state={...env,REALITY_FINAL_LOOP_EVENT_RESUME_SHADOW_ENABLED:'true'};
 const collect=async(db,name)=>{
  if(name==='reality_read_current_shift_execution_graph_v1')return rawGraph();
  if(name==='reality_read_current_final_loop_proof_envelope_v1')return pending;
  if(name==='reality_read_final_loop_event_resume_shadow_v1')return shadow;
  throw Error('UNEXPECTED_RPC');
 };
 const r=await caller(collect,{env:state});
 assert.equal(r.status,'FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING');
 assert.equal(r.event_resume_shadow.shadow_ready_event_count,1);
 assert.equal(r.event_resume_shadow.event_dispatch_enabled,false);
 assert.equal(r.event_resume_shadow.ready_event_refs[0].executor_invoked,false);
 assert.equal(r.original_job_completed,false);
 const terminalAction='QUALIFY_DISTINCT_RECOVERY_EVIDENCE_AND_EXACT_BUDGET_NO_REPLAY';
 const terminal=await caller(async(db,name)=>{
  if(name==='reality_read_current_final_loop_proof_envelope_v1')
   return {...pending,governed_qualification_handoffs:[{...qualifier,qualifier_next_action:terminalAction,
    unresolved_proof_gates:[...qualifier.unresolved_proof_gates,'TERMINAL_BUILDER_DISTINCT_EVIDENCE_AND_BUDGET_REQUIRED']}]};
  if(name==='reality_read_final_loop_event_resume_shadow_v1')
   return {...shadow,subscriptions:[{...shadow.subscriptions[0],condition_kind:'QUALIFIER_PROOF_CHANGED',
    next_qualified_action:'VERIFY_DISTINCT_CASE_SPECIFIC_FROZEN_CI_REUSE_PRIOR_DIAGNOSTIC'}],
    events:[{...event,event_kind:'QUALIFIER_PROOF_CHANGED',source_receipt_sha256:qualifier.qualifier_receipt_sha256}]};
  return collect(db,name);
 },{env:state});
 assert.equal(terminal.event_resume_shadow.ready_event_refs[0].next_qualified_action,terminalAction);
 assert.equal(terminal.event_resume_shadow.ready_event_refs[0].execution_authorized,false);
 const forged=await caller(async(db,name)=>{
  if(name!=='reality_read_final_loop_event_resume_shadow_v1')
   return collect(db,name);
  return {...shadow,event_dispatch_enabled:true};
 },{env:state});
 assert.equal(forged.status,'FINAL_LOOP_EVENT_RESUME_SCOPE_OR_AUTHORITY_INVALID');
 const foreign=await caller(async(db,name)=>{
  if(name!=='reality_read_final_loop_event_resume_shadow_v1')
   return collect(db,name);
  return {...shadow,events:[{...event,original_work_id:'work:'+'f'.repeat(32)}]};
 },{env:state});
 assert.equal(foreign.status,'FINAL_LOOP_EVENT_RESUME_EVENT_INVALID');
 const stale=await caller(async(db,name)=>{
  if(name!=='reality_read_final_loop_event_resume_shadow_v1')
   return collect(db,name);
  return {...shadow,events:[{...event,event_state:'SHADOW_STALE',
   source_current:false,would_resume_suspended_obligation:false}]};
 },{env:state});
 assert.equal(stale.status,'FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING');
 assert.equal(stale.event_resume_shadow.shadow_ready_event_count,0);
});


test('event-driven Final Loop schema records receipts but never invents execution',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261123235957_final_loop_event_driven_resume_shadow_v1.sql',
  import.meta.url),'utf8');
 assert.match(sql,/final_loop_resume_conditions_v1/);
 assert.match(sql,/final_loop_resume_events_v1/);
 assert.match(sql,/QUALIFIER_PROOF_CHANGED/);
 assert.match(sql,/INDEPENDENT_FROZEN_CI_RECEIPT/);
 assert.match(sql,/on_final_loop_qualifier_receipt_change_v1/);
 assert.match(sql,/on_final_loop_independent_frozen_ci_v1/);
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/event_dispatch_enabled',false/);
 assert.match(sql,/execution_authorized',false/);
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.doesNotMatch(sql,/net\.http_post|send_governed_wake_hint_v1|cron\.unschedule/);
 assert.doesNotMatch(sql,/github\.com\/maloney2323\/Reality\/pull\/307/);
});


test('same-ledger cross-layer guard requires independent receipts and denies invented authority',async()=>{
 const guard={
  schema:'reality-shared-cross-layer-continuity-handoff-v1',
  status:'FINAL_LOOP_SHARED_CONTINUITY_CHECKED',
  owner_id:owner,shift_id:shift,
  continuity_root_id:pendingEnvelope.continuity_root_id,
  continuity_head_sha256:pendingEnvelope.continuity_head_sha256,
  frozen_shift_scope_sha256:pendingEnvelope.frozen_shift_scope_sha256,
  revision:pendingEnvelope.revision,handoff_observation_sha256:sha('8'),
  read_only:true,no_new_executable_authority:true,
  first_signal_anchor_verified:true,
  worldline_parent_links_verified:true,
  shift_scope_authority_event_present:true,
  verified_evidence_event_count:2,
  unverified_handoffs:0,transition_committed:false,
  executor_invoked:false,execution_authorized:false,
  installation_authorized:false,original_job_completed:false,
  production_changed:false,
  obligations:[{
   source_ref:source,original_work_id:work,
   status:'CONTINUITY_OPEN_PENDING_PROOFS',
   source_proof_verified:true,continuity_identity_verified:true,
   original_work_universe_event_verified:true,
   qualifier_digest_verified:true,qualifier_receipt_sha256:sha('9'),
   unresolved_proof_gates:['CASE_SPECIFIC_FROZEN_RED_NOT_VERIFIED'],
   internal_maintenance_independent_frozen_ci_verified:false,
   original_claim_admitted:false,
   independent_original_outcome_verified:false,
   universe_return_verified:false,
   executor_authorized_by_observation:false,
   execution_permitted_by_handoff:false
  }]
 };
 const state={...env,REALITY_FINAL_LOOP_SHARED_CONTINUITY_GUARD_ENABLED:'true'};
 const load=async(db,name)=>{
  if(name==='reality_read_current_shift_execution_graph_v1')return rawGraph();
  if(name==='reality_read_current_final_loop_proof_envelope_v1')
   return pendingEnvelope;
  if(name==='reality_read_final_loop_shared_continuity_guard_v1')
   return guard;
  throw Error('UNEXPECTED_RPC_'+name);
 };
 const good=await caller(load,{env:state});
 assert.equal(good.status,'FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING');
 assert.equal(good.shared_continuity_guard.status,
  'FINAL_LOOP_SHARED_CONTINUITY_GUARD_VERIFIED_READ_ONLY');
 assert.equal(good.shared_continuity_guard.handoffs[0].original_work_id,work);
 assert.equal(good.shared_continuity_guard.handoffs[0].qualifier_receipt_sha256,sha('9'));
 assert.deepEqual(good.shared_continuity_guard.handoffs[0].unresolved_proof_gates,
  ['CASE_SPECIFIC_FROZEN_RED_NOT_VERIFIED']);
 // Exercise the actual bridge output, not a manually enriched recovery fixture.
 const pr='https://github.com/maloney2323/Reality/pull/307';
 const raw=rawGraph();
 raw.jobs=[{...raw.jobs[0],source_ref:pr,original_kind:'REAL_PR_REVIEW_ORIGINAL',
  phase:'BLOCKED'}];
 const prGraph=assertRealityUnifiedShiftGraph(raw);
 const prEnvelope={...pendingEnvelope,jobs:[{...pendingEnvelope.jobs[0],
  source_ref:pr,original_kind:'REAL_PR_REVIEW_ORIGINAL',source_phase:'BLOCKED'}]};
 const prGuard={...guard,obligations:[{...guard.obligations[0],source_ref:pr,
  unresolved_proof_gates:['CASE_SPECIFIC_FROZEN_RED_NOT_VERIFIED',
   'BUSINESS_ORIGINAL_WARRANT_MISMATCH','ORIGINAL_CLAIM_NOT_ADMITTED']}]};
 const actual=await caller(async(db,name)=>{
  if(name==='reality_read_current_shift_execution_graph_v1')return raw;
  if(name==='reality_read_current_final_loop_proof_envelope_v1')return prEnvelope;
  if(name==='reality_read_final_loop_shared_continuity_guard_v1')return prGuard;
  throw Error('UNEXPECTED_RPC');
 },{env:state,graph:prGraph});
 assert.equal(actual.status,'FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING');
 const contract=projectRecoveryContractFromFinalLoop({graph:prGraph,
  continuityReturn:actual,stagedRoutes:{
   status:'FINAL_LOOP_STAGED_PLANS_VERIFIED_AND_NEXT_HANDLERS_CLASSIFIED',
   routes:[{source_ref:pr,parent_original_work_id:work,source_head_sha:'a'.repeat(40)}]},
  ownerPackets:{status:'FINAL_LOOP_OWNER_EXACT_CHILD_APPROVALS_READ_ONLY',
   owner_id:owner,shift_id:shift,packets:[]}});
 assert.equal(contract.status,'RECOVERY_PROOF_CONTRACT_CANDIDATE_NEEDS_DURABLE_FREEZE');
 assert.equal(contract.contract_candidate.blocker_evidence_sha256,sha('9'));
 assert.equal(contract.contract_candidate.obligation_id,work);
 assert.equal(contract.execution_authorized,false);
 assert.equal(contract.contract_candidate.ledger_freeze_verified,false);
 const evidence={status:'NO_FENCED_CHILD_INVOCATION_OBSERVED',fenced_count:0,
  signed_observation_count:0,observations:[],canonical_return_committed:false,
  execution_authorized:false,provider_outcome_verified:false,original_job_completed:false,replay_authorized:false};
 const observe=async(e)=>caller(async(db,name)=>name==='reality_read_final_loop_shared_continuity_guard_v1'?
  {...guard,obligations:[{...guard.obligations[0],execution_spine_readback:e}]}:load(db,name),{env:state});
 assert.deepEqual((await observe(evidence)).shared_continuity_guard.handoffs[0].execution_spine_readback,evidence);
 assert.equal((await observe({...evidence,replay_authorized:true})).status,
  'FINAL_LOOP_SHARED_CONTINUITY_EXECUTION_READBACK_CONFLICT');
 assert.equal((await observe({...evidence,signed_observation_count:1})).status,
  'FINAL_LOOP_SHARED_CONTINUITY_EXECUTION_READBACK_CONFLICT');
 assert.equal(good.shared_continuity_guard.handoffs[0].universe_return_verified,false);
 assert.equal(good.executor_invoked,false);
 for(const [mutation,expected] of [
  [{...guard,execution_authorized:true},
   'FINAL_LOOP_SHARED_CONTINUITY_SCOPE_OR_PROOF_INVALID'],
  [{...guard,continuity_head_sha256:sha('f')},
   'FINAL_LOOP_SHARED_CONTINUITY_SCOPE_OR_PROOF_INVALID'],
  [{...guard,first_signal_anchor_verified:false},
   'FINAL_LOOP_SHARED_CONTINUITY_SCOPE_OR_PROOF_INVALID'],
  [{...guard,worldline_parent_links_verified:false},
   'FINAL_LOOP_SHARED_CONTINUITY_SCOPE_OR_PROOF_INVALID'],
  [{...guard,revision:2},
   'FINAL_LOOP_SHARED_CONTINUITY_SCOPE_OR_PROOF_INVALID'],
  [{...guard,obligations:[{...guard.obligations[0],
    original_work_id:'work:'+'f'.repeat(32)}]},
   'FINAL_LOOP_SHARED_CONTINUITY_ORIGINAL_IDENTITY_MISMATCH'],
  [{...guard,obligations:[{...guard.obligations[0],
    qualifier_digest_verified:false}]},
   'FINAL_LOOP_SHARED_CONTINUITY_ORIGINAL_PROOF_NOT_VERIFIED'],
  [{...guard,obligations:[{...guard.obligations[0],
    universe_return_verified:true}]},
   'FINAL_LOOP_SHARED_CONTINUITY_VERIFIER_OR_AUTHORITY_CONFLICT']
 ]){
  const r=await caller(async(db,name)=>name===
    'reality_read_final_loop_shared_continuity_guard_v1'?mutation:
    load(db,name),{env:state});
  assert.equal(r.status,expected);
  assert.equal(r.original_job_completed,false);
  assert.equal(r.transition_committed,false);
 }
 const down=await caller(async(db,name)=>{
  if(name==='reality_read_final_loop_shared_continuity_guard_v1')
   throw Error('TEMPORARY_READ_UNAVAILABLE');
  return load(db,name);
 },{env:state});
 assert.equal(down.status,'FINAL_LOOP_SHARED_CONTINUITY_GUARD_READ_UNAVAILABLE');
});


test('shared guard is enforced by the existing checkpoint writer, not by a model',()=>{
 const file=readFileSync(new URL(
 '../supabase/migrations/20261124005000_final_loop_shared_continuity_verifier_guard_v1.sql',
 import.meta.url),'utf8');
 assert.match(file,/reality_read_final_loop_shared_continuity_guard_v1/);
 assert.match(file,/reality_record_final_loop_evidence_checkpoint_v1/);
 assert.match(file,/v_shared:=public\.reality_read_final_loop_shared_continuity_guard_v1/);
 assert.match(file,/FINAL_LOOP_SHARED_CONTINUITY_PROOF_OR_IDENTITY_GAP_NO_EFFECT/);
 assert.match(file,/independent_original_outcome_verified/);
 assert.match(file,/universe_return_verified/);
 assert.match(file,/qualifier_digest_verified/);
 assert.match(file,/UNIVERSE/);
 assert.doesNotMatch(file,/net\.http_post|cron\.unschedule/);
 assert.doesNotMatch(file,/github\.com\/maloney2323\/Reality\/pull\/307/);
});


test('signed worker connects the same Continuity/verifier BEFORE its first operational executor and AFTER Universe return',()=>{
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const boundary=readFileSync(new URL(
  '../src/reality-governed-shift-boundary-v1.js',import.meta.url),'utf8');
 const i=worker.indexOf("workerStage='CONTINUOUS_QUALIFICATION_INBOX_RECONCILIATION'");
 const q=worker.indexOf("workerStage='CONTINUITY_QUALIFICATION_GOVERNED_ROUTE'");
 const gate=worker.indexOf("workerStage='SHARED_CONTINUITY_VERIFIER_PREEXECUTION_FENCE'");
 const effect=worker.indexOf("workerStage='EXACT_APPROVED_BUSINESS_EFFECT_SIGNED_HANDOFF'");
 const maintenance=worker.indexOf("workerStage='SIGNED_MAINTENANCE_REGISTERED_EXECUTOR_HANDOFF'");
 const universe=worker.indexOf("workerStage='SIGNED_MAINTENANCE_POSTINSTALL_UNIVERSE_RECONCILIATION'");
 const returnFence=worker.indexOf("workerStage='SHARED_CONTINUITY_VERIFIER_RETURN_FENCE'");
 const publish=worker.indexOf("workerStage='WORKER_RESPONSE_PUBLICATION'");
 assert.ok(i>0&&i<q&&q<gate&&gate<effect&&effect<maintenance);
 assert.ok(universe>maintenance&&returnFence>universe&&publish>returnFence);
 assert.match(worker,/FINAL_LOOP_SHARED_CONTINUITY_PREEXECUTION_FENCE_REJECTED/);
 assert.match(worker,/FINAL_LOOP_SHARED_CONTINUITY_RETURN_FENCE_REJECTED/);
 assert.match(worker,/final_loop_continuity_ingress:finalLoopContinuityIngress/);
 assert.match(worker,/final_loop_continuity_return:finalLoopContinuityReturn/);
 assert.match(boundary,/read_final_loop_shared_continuity_guard_v1/);
 assert.match(boundary,/read_final_loop_event_resume_shadow_v1/);
 assert.doesNotMatch(worker,/strictContinuityCycle\s*\?\s*true/);
});


test('first layer was observed in same Universe worldline, not inferred from a digest',()=>{
 const migration=readFileSync(new URL(
  '../supabase/migrations/20261124012000_final_loop_continuity_first_signal_worldline_guard_v1.sql',
  import.meta.url),'utf8');
 assert.match(migration,/first_signal_anchor_verified/);
 assert.match(migration,/worldline_parent_links_verified/);
 assert.match(migration,/original_work_universe_event_verified/);
 assert.match(migration,/parent_event_id/);
 assert.match(migration,/v_broken_links/);
 assert.match(migration,/FINAL_LOOP_SHARED_CONTINUITY_FIRST_SIGNAL_OR_WORLDLINE_UNVERIFIED/);
 assert.doesNotMatch(migration,/net\.http_post|cron\.unschedule/);
});


test('signed cross-source recovery cannot relabel one original as another',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261124013500_final_loop_original_source_identity_guard_v1.sql',
  import.meta.url),'utf8');
 assert.match(sql,/original_source_ref'=v_source/);
 assert.match(sql,/m\.owner_id=v_owner/);
 assert.match(sql,/m\.claimed_shift_id=p_shift_id/);
 assert.match(sql,/original_work_universe_event_verified/);
 assert.match(sql,/original_job_completed'='false/);
 assert.doesNotMatch(sql,/net\.http_post|cron\.unschedule/);
 assert.doesNotMatch(sql,/github\.com\/maloney2323\/Reality\/pull\/307/);
});


test('independent provider settlement returns to the ORIGINAL canonical Continuity workline without a second scheduler',()=>{
 const boundary=readFileSync(new URL('../src/reality-governed-shift-boundary-v1.js',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const root=readFileSync(new URL(
  '../supabase/migrations/20261124015100_final_loop_shift_genesis_root_partition_v1.sql',
  import.meta.url),'utf8');
 const bridge=readFileSync(new URL(
  '../supabase/migrations/20261124015200_final_loop_independent_parent_universe_return_v1.sql',
  import.meta.url),'utf8');
 const guard=readFileSync(new URL(
  '../supabase/migrations/20261124015300_final_loop_cross_worldline_return_shared_guard_v1.sql',
  import.meta.url),'utf8');
 assert.match(boundary,/reconcile_verified_parent_universe_return_v1/);
 assert.match(worker,/reality_reconcile_verified_parent_universe_return_v1/);
 const before=worker.indexOf("workerStage='FINAL_LOOP_INDEPENDENT_UNIVERSE_TO_CONTINUITY_RETURN'");
 assert.ok(before>worker.indexOf('advanceOneFinalLoopParentDelivery'));
 assert.ok(before<worker.indexOf("workerStage='SHARED_CONTINUITY_VERIFIER_RETURN_FENCE'"));
 assert.match(worker,/FINAL_LOOP_VERIFIED_CANONICAL_RETURN_RECEIPT_INVALID/);
 assert.match(worker,/final_loop_verified_canonical_return:finalLoopVerifiedCanonicalReturn/);
 assert.match(root,/FINAL_LOOP_CANONICAL_FIRST_SIGNAL_ROOT_UNVERIFIED/);
 assert.match(root,/event_kind='RAW_SIGNAL'/);
 assert.match(bridge,/source_universe_outcome_event_id/);
 assert.match(bridge,/reality_final_loop_verified_cross_worldline_return_v1/);
 assert.match(bridge,/independent_verifier_worker_run_id IS DISTINCT FROM/);
 assert.match(bridge,/FINAL_LOOP_NO_NEW_INDEPENDENTLY_SETTLED_PARENT_TO_RETURN/);
 assert.match(bridge,/return_appended',true/);
 assert.match(bridge,/new_effect_executed',false/);
 assert.match(bridge,/new_authority_granted',false/);
 assert.match(guard,/isolated\.continuity_root_id=d\.shift_id/);
 assert.match(guard,/returned\.continuity_root_id=v_root/);
 assert.match(guard,/returned\.payload->>'original_work_id'=d\.parent_original_work_id/);
 assert.match(guard,/independent_verifier_worker_run_id/);
 assert.match(guard,/has_final:=has_final OR has_universe/);
 assert.doesNotMatch(bridge,/net\.http_post|cron\.schedule|cron\.unschedule/);
 assert.doesNotMatch(bridge,/github\.com\/maloney2323\/Reality\/pull\/307/);
});


test('signed checkpoint acknowledges only independently rebounded event subscriptions',async()=>{
 const strict={...checkpointEnv,
  REALITY_FINAL_LOOP_SHARED_CONTINUITY_GUARD_ENABLED:'true'};
 const verified={
  ...receipt,shared_continuity_guard_verified:true,
  shared_continuity_observation_sha256:sha('e'),
  next_continuity_revision:2,
  event_subscriptions_rebound_to_next_revision:2
 };
 const good=await record({
  db,wake,workerRunId:run,inspection:expectedInspection,env:strict,
  call:async()=>verified
 });
 assert.equal(good.status,'FINAL_LOOP_EVIDENCE_ONLY_CHECKPOINT_INDEPENDENTLY_ACKNOWLEDGED');
 assert.equal(good.next_continuity_revision,2);
 assert.equal(good.event_subscriptions_rebound_to_next_revision,2);
 assert.equal(good.executor_invoked,false);
 for(const response of [
  {...verified,next_continuity_revision:3},
  {...verified,event_subscriptions_rebound_to_next_revision:-1},
  {...verified,shared_continuity_guard_verified:false},
  {...verified,shared_continuity_observation_sha256:'UNVERIFIED'}
 ]){
  const result=await record({
   db,wake,workerRunId:run,inspection:expectedInspection,env:strict,
   call:async()=>response
  });
  assert.equal(result.status,
   'FINAL_LOOP_DURABLE_CHECKPOINT_SUBSCRIPTION_CAS_UNVERIFIED_NO_REPLAY');
  assert.equal(result.original_job_completed,false);
 }
 const writer=readFileSync(new URL(
  '../supabase/migrations/20261124015400_final_loop_evidence_checkpoint_atomic_resume_rebind_v1.sql',
  import.meta.url),'utf8');
 assert.match(writer,/FINAL_LOOP_EVENT_SUBSCRIPTION_CAUSAL_RECONCILIATION_REQUIRED/);
 assert.match(writer,/FINAL_LOOP_ATOMIC_SUBSCRIPTION_REVISION_REBIND_FAILED/);
 assert.match(writer,/continuity_revision=p_expected_revision\+1/);
 assert.match(writer,/event_subscriptions_rebound_to_next_revision/);
 assert.doesNotMatch(writer,/net\.http_post|cron\.unschedule/);
 const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(worker,/finalLoopEvidenceCheckpoint\?\.evidence_checkpoint_acknowledged!==true/);
});


test('effect-capable Final Loop cannot bypass shared Continuity or reuse stale ingress between executors',()=>{
 const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(worker,/if\(finalLoopEffectsRequested&&!strictContinuityCycle\)\s*throw Error\('FINAL_LOOP_EFFECTS_REQUIRE_SHARED_CONTINUITY_FENCE'\)/);
 const helper=worker.slice(worker.indexOf('const requireFreshFinalLoopContinuity=async()=>'),worker.indexOf('// Existing signed worker performs ONLY independent readback before choosing'));
 assert.match(helper,/reality_read_current_shift_execution_graph_v1/);
 assert.match(helper,/await inspectFinalLoopOnExistingSignedWorker/);
 assert.match(helper,/guard\.continuity_root_id!==prior\?\.continuity_root_id/);
 assert.match(helper,/fresh\.revision<prior\.revision/);
 assert.match(helper,/guard\.continuity_head_sha256!==fresh\.continuity_head_sha256/);
 assert.match(helper,/guard\.execution_authorized!==false/);
 assert.match(helper,/lastFinalLoopContinuity=fresh/);
 // Child routing now has an additional isolated accepted-goal guard.
 const child=worker.slice(worker.indexOf("if(process.env.REALITY_FINAL_LOOP_CHILD_EXECUTION_ENABLED==='true')"),worker.indexOf('// The same authorized signed worker handles bounded integration AFTER'));
 assert.match(child,/await requireFreshFinalLoopContinuity\(\);\s*try\{[\s\S]*?finalLoopChildReview=hasCurrentApprovedChildReviewRoute\(\{\s*routes:finalLoopStagedActionRoutes,operatingLane:signedWorkerReleaseOperatingLane\s*\}\)\?await advanceOneFinalLoopChildReview\(/);
 assert.equal((child.match(/advanceOneFinalLoopChildReview\(/g)||[]).length,1);
 assert.match(child,/FINAL_LOOP_CHILD_CURRENT_APPROVED_ISOLATED_ROUTE_REQUIRED/);
 for(const call of ['finalLoopParentIntegration=\n     await advanceOneFinalLoopParentIntegration','finalLoopParentDelivery=await advanceOneFinalLoopParentDelivery']){
  const at=worker.indexOf(call);
  assert.ok(at>0,call);
  assert.match(worker.slice(at-100,at),/await requireFreshFinalLoopContinuity\(\);\s*try\{\s*$/);
 }
});
