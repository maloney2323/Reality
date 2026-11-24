import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {advanceOneSignedProofRecovery}
 from '../src/reality-final-loop-signed-proof-recovery-worker-v1.js';
import {projectRecoveryContractFromFinalLoop}
 from '../src/reality-final-loop-proof-carrying-recovery-v1.js';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const shift='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const root='36f0ad48-f391-549f-8622-66cd493977e7';
const id='work:315562fe1bd66b30a48bb9be4f1d162a';
const source='https://github.com/maloney2323/Reality/pull/307';
const head='ef66038297480f5da9444072e5e79f5c59b27184';
const sha=x=>'sha256:'+x.repeat(64);
const graph={status:'UNIFIED_OWNER_JOB_CONTROL_READY',owner_id:owner,
 shift_id:shift,jobs:[{source_ref:source,original_work_id:id,
 independent_source_proof_verified:true}]};
const handoff={source_ref:source,original_work_id:id,continuity_identity_verified:true,
 qualifier_digest_verified:true,
 qualifier_receipt_sha256:'sha256:2970895f1e43cb93649bd33c3804e684d1397c9ee7bec472652ca1612ddcdf1a',
 unresolved_proof_gates:['CASE_SPECIFIC_FROZEN_RED_NOT_VERIFIED']};
const continuityReturn={status:'FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING',
 owner_id:owner,shift_id:shift,continuity_head_sha256:
 'sha256:29b89171b23a7009a6e6fa42f10ae3b0a653e9246cec61c486bdff6b4c12eb93',
 shared_continuity_guard:{status:'FINAL_LOOP_SHARED_CONTINUITY_GUARD_VERIFIED_READ_ONLY',
  continuity_root_id:root,handoffs:[handoff]}};
const stagedRoutes={status:'FINAL_LOOP_STAGED_PLANS_VERIFIED_AND_NEXT_HANDLERS_CLASSIFIED',
 routes:[{source_ref:source,parent_original_work_id:id,source_head_sha:head}]};
const ownerPackets={status:'FINAL_LOOP_OWNER_EXACT_CHILD_APPROVALS_READ_ONLY',
 owner_id:owner,shift_id:shift,packets:[{source_ref:source,
  parent_original_work_id:id,state:'APPROVED_ONCE',approved:true}]};
const candidate=projectRecoveryContractFromFinalLoop({graph,continuityReturn,
 stagedRoutes,ownerPackets}).contract_candidate;
const wake={status:'SHIFT_WORKER_PULSE_DURABLY_RECORDED',shift_id:shift};
const run='12345678-1234-4123-8123-123456789abc';
const isolated='reallyisolatedpreview99';
const db={strictSecrets:true,project:isolated};
const env={VERCEL_ENV:'preview',REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED:'true',
 REALITY_FINAL_LOOP_PROOF_RECOVERY_ENABLED:'true',
 REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED:'true',
 REALITY_SIGNED_WORKER_RELEASE_ATTESTATION_ENABLED:'true',
 REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF:isolated,
 REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF:'hvkfreoagbrphwghjajw',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:isolated};
const args={db,env,wake,graph,continuityReturn,stagedRoutes,ownerPackets,
 workerRunId:run};
const frozen={status:'RECOVERY_CONTRACT_SIGNED_OWNER_READBACK',
 contract_id:candidate.contract_id,contract:candidate,
 durableFreeze:{status:'RECOVERY_CONTRACT_ATOMIC_FREEZE_VERIFIED',
  contract_id:candidate.contract_id,
  freeze_receipt_sha256:sha('b'),independently_observed:true},
 read_only:true,execution_authorized:false,original_job_completed:false};
test('shared benchmark cannot freeze or dispatch despite approval',async()=>{
 const called=[];
 const r=await advanceOneSignedProofRecovery({...args,db:{strictSecrets:true,
  project:'hvkfreoagbrphwghjajw'},call:async(...x)=>{called.push(x);throw Error('no')}});
 assert.equal(r.status,'RECOVERY_PROOF_CONTRACT_PREPARED_ISOLATED_EXECUTOR_NOT_ACTIVATED');
 assert.equal(r.original_job_completed,false);
 assert.equal(r.contract_frozen,false);
 assert.equal(called.length,0);
});
test('isolated signed claim proposal freezes once, reads back and routes missing capability',async()=>{
 const calls=[];
 const call=async(_,rpc)=>{
  calls.push(rpc);
  if(rpc==='reality_read_final_loop_recovery_contract_v1')
   return calls.filter(x=>x===rpc).length===1?
    {status:'RECOVERY_NO_DURABLE_CONTRACT'}:frozen;
  if(rpc==='reality_freeze_final_loop_recovery_contract_v1')
   return {status:'RECOVERY_CONTRACT_ATOMIC_FREEZE_RECORDED',
    contract_id:candidate.contract_id,obligation_id:id,
    continuity_root_id:root,freeze_receipt_sha256:sha('b'),
    original_job_completed:false,execution_authorized:false,
    production_changed:false};
  if(rpc==='reality_read_final_loop_recovery_capability_v1')
   return {status:'RECOVERY_CAPABILITY_NOT_INDEPENDENTLY_REGISTERED'};
  throw Error('unexpected');
 };
 const r=await advanceOneSignedProofRecovery({...args,call});
 assert.deepEqual(calls,[
  'reality_read_final_loop_recovery_contract_v1',
  'reality_freeze_final_loop_recovery_contract_v1',
  'reality_read_final_loop_recovery_contract_v1',
  'reality_read_final_loop_recovery_capability_v1']);
 assert.equal(r.status,'RECOVERY_CAPABILITY_ACQUISITION_REQUIRED');
 assert.equal(r.contract_frozen,true);
 assert.equal(r.strategy_executed,false);
 assert.equal(r.independent_red_verified,false);
 assert.equal(r.original_job_completed,false);
});
test('readback finds existing matching freeze and never repeats the write',async()=>{
 const calls=[];
 const result=await advanceOneSignedProofRecovery({...args,call:async(_,rpc)=>{
  calls.push(rpc);return rpc==='reality_read_final_loop_recovery_capability_v1'?
   {status:'RECOVERY_CAPABILITY_NOT_INDEPENDENTLY_REGISTERED'}:frozen;
 }});
 assert.equal(calls.filter(x=>x==='reality_freeze_final_loop_recovery_contract_v1').length,0);
 assert.equal(result.contract_frozen,true);
});
test('unknown write outcome never produces success or retries freeze',async()=>{
 const calls=[];
 const result=await advanceOneSignedProofRecovery({...args,call:async(_,rpc)=>{
  calls.push(rpc);if(rpc==='reality_read_final_loop_recovery_contract_v1')
   return {status:'RECOVERY_NO_DURABLE_CONTRACT'};
  if(rpc==='reality_freeze_final_loop_recovery_contract_v1')throw Error('timeout');
 }});
 assert.equal(result.status,'RECOVERY_FREEZE_OUTCOME_UNCERTAIN_NO_REPLAY');
 assert.equal(result.contract_frozen,false);
 assert.equal(result.next_governed_action,'RECONCILE_EXACT_CONTRACT_READBACK');
 assert.equal(calls.filter(x=>x==='reality_freeze_final_loop_recovery_contract_v1').length,1);
});
test('wrong contract identity fails closed before capability lookup',async()=>{
 const calls=[];
 const r=await advanceOneSignedProofRecovery({...args,call:async(_,rpc)=>{
  calls.push(rpc);return {...frozen,contract_id:sha('0')};
 }});
 assert.equal(r.status,'RECOVERY_FROZEN_CONTRACT_INDEPENDENT_READBACK_MISMATCH');
 assert.equal(r.claim_created,false);
 assert.equal(calls.length,1);
});
test('registered diagnostic does not autonomously execute without budget/warrant/epoch proofs',async()=>{
 const calls=[];
 const r=await advanceOneSignedProofRecovery({...args,call:async(_,rpc)=>{
  calls.push(rpc);return rpc==='reality_read_final_loop_recovery_capability_v1'?
   {status:'RECOVERY_CAPABILITY_SIGNED_REGISTRATION_EXISTS',
    capability_id:'REPRODUCE_CASE_SPECIFIC_FROZEN_RED',
    effect_kind:'EVIDENCE_ONLY_FROZEN_CI_REPRODUCTION',
    registration_receipt_sha256:sha('c')}:frozen;
 }});
 assert.equal(r.status,'RECOVERY_SIGNED_CAPABILITY_STRATEGY_PROOF_REQUIRED');
 assert.equal(r.contract_frozen,true);
 assert.equal(r.claim_created,false);
 assert.equal(r.strategy_executed,false);
});
test('SQL migration binds same original/ledger, service role, disabled registry and disallows owner authority minting',()=>{
 const sql=readFileSync(new URL(
  '../supabase/migrations/20261124033000_final_loop_proof_carrying_recovery_ledger_v1.sql',
  import.meta.url),'utf8');
 for(const phrase of ['final_loop_recovery_contracts_v1',
  'final_loop_recovery_strategy_attempts_v1','final_loop_recovery_proofs_v1',
  'final_loop_recovery_capability_registry_v1',
  'reality_read_final_loop_shared_continuity_guard_v1',
  'reality_read_current_final_loop_proof_envelope_v1',
  'reality_freeze_final_loop_recovery_contract_v1',
  'reality_read_final_loop_recovery_contract_v1',
  'current_user<>\'service_role\'',
  'NOT_INDEPENDENTLY_REGISTERED','FOR UPDATE',
  'REVOKE ALL ON FUNCTION','GRANT EXECUTE ON FUNCTION'])
  assert.ok(sql.includes(phrase),phrase);
 assert.doesNotMatch(sql,/CREATE\s+TRIGGER\s+.*EXECUTE\s+PROCEDURE/);
 assert.doesNotMatch(sql,/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+.*\s+TO\s+authenticated/i);
 const src=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.ok(src.includes('final_loop_signed_proof_recovery:finalLoopSignedProofRecovery'));
 assert.ok(src.indexOf('const finalLoopSignedProofRecovery')>
  src.indexOf("workerStage='SHARED_CONTINUITY_VERIFIER_RETURN_FENCE'"));
});
