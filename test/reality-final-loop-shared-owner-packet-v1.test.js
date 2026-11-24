import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectFinalLoopSignedWorkerOperatingLane}
 from '../src/reality-signed-worker-operating-lane-v1.js';
import {requestFinalLoopChildApprovalFromAcceptedOriginal}
 from '../src/reality-final-loop-child-approval-request-v1.js';

const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const shift='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const work='work:315562fe1bd66b30a48bb9be4f1d162a';
const source='https://github.com/maloney2323/Reality/pull/307';
const plan='bc597605-3854-4b9f-ab27-929c567868db';
const packet='18d8224b-cf1b-42af-9dd2-afc822de3395';
const dbProject='hvkfreoagbrphwghjajw';
const hash=c=>'sha256:'+c.repeat(64);
const env={
 VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_SHA:'a'.repeat(40),
 VERCEL_GIT_COMMIT_REF:'feature/final-loop-governed-qualification-handoff-20261123',
 REALITY_FINAL_LOOP_ENGINE_SHADOW_ENABLED:'true',
 REALITY_FINAL_LOOP_PR_SOURCE_PLAN_STAGING_ENABLED:'true',
 REALITY_FINAL_LOOP_CHILD_APPROVAL_PREPARATION_ENABLED:'true',
 REALITY_FINAL_LOOP_SHARED_BENCHMARK_STAGING_ENABLED:'true',
 REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED:'false',
 REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF:dbProject,
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:dbProject,
 REALITY_FINAL_LOOP_SHARED_BENCHMARK_OWNER_ID:owner,
 REALITY_FINAL_LOOP_SHARED_BENCHMARK_SHIFT_ID:shift,
 REALITY_FINAL_LOOP_CHILD_EXECUTION_ENABLED:'false',
 REALITY_FINAL_LOOP_PARENT_DELIVERY_ENABLED:'false'
};
const graph={
 status:'UNIFIED_OWNER_JOB_CONTROL_READY',
 owner_id:owner,shift_id:shift,plan_fingerprint:hash('1'),
 jobs:[{source_ref:source,original_work_id:work,
  phase:'BLOCKED',independent_source_proof_verified:true}],
};
const db={strictSecrets:true,project:dbProject};
const preflight={
 status:'FINAL_LOOP_CHILD_GOAL_ACCEPTANCE_PREFLIGHT_READ_ONLY',
 owner_id:owner,shift_id:shift,plan_fingerprint:graph.plan_fingerprint,
 read_only:true,execution_authorized:false,
 plans:[{plan_id:plan,source_ref:source,parent_original_work_id:work,
  source_manifest_sha256:hash('2'),acceptance_contract_sha256:hash('3'),
  verified_signed_source_goal_contract_prepared:true,
  owner_goal_acceptance_pending:true,independent_goal_acceptance_verified:false,
  pending_exact_owner_approval:true}]
};
const prepared={
 status:'FINAL_LOOP_CHILD_EXACT_OWNER_APPROVAL_REQUIRED',
 packet_id:packet,owner_id:owner,shift_id:shift,
 source_ref:source,parent_original_work_id:work,
 source_manifest_sha256:hash('2'),acceptance_contract_sha256:hash('3'),
 proposal_fingerprint:hash('4'),effect_type:'READ_ONLY_INTERNAL_PR_REVIEW',
 owner_approval_granted:false,execution_authorized:false,
 original_job_completed:false
};
const workerRunId='c6e77b46-fc1a-40f5-9049-326c7dc39a16';
const call=async(_db,fn,args)=>{
 if(fn==='reality_read_final_loop_child_approval_preflight_v1'){
  assert.equal(args.p_shift_id,shift);return preflight;
 }
 if(fn==='reality_prepare_final_loop_child_approval_v1'){
  assert.equal(args.p_plan_id,plan);
  assert.equal(args.p_acceptance_contract_sha256,hash('3'));
  assert.equal(args.p_worker_run_id,workerRunId);
  return prepared;
 }
 throw Error('UNEXPECTED_DB_RPC_'+fn);
};
test('signed shared packet lane is configured but NEVER isolated or active',()=>{
 const lane=inspectFinalLoopSignedWorkerOperatingLane({env,dbProject});
 assert.equal(lane.status,'FINAL_LOOP_WORKER_SHARED_OWNER_PACKET_PREPARATION_ONLY');
 assert.equal(lane.owner_packet_preparation_configured,true);
 assert.equal(lane.independent_database_isolation_verified,false);
 assert.equal(lane.worker_execution_authorized,false);
 assert.equal(lane.child_execution_authorized,false);
 assert.equal(lane.scheduled_alias_change_authorized,false);
 assert.equal(lane.release_activation_verified,false);
});
test('same signed original can prepare an EXACT packet without approval or execution',async()=>{
 const r=await requestFinalLoopChildApprovalFromAcceptedOriginal({
  db,env,graph,workerRunId,call,fetchImpl:async()=>{throw Error('No provider call');}
 });
 assert.equal(r.status,'FINAL_LOOP_CHILD_APPROVAL_GATED_BY_EXACT_OWNER_ACTION');
 assert.equal(r.pending_exact_approval_count,1);
 assert.equal(r.approvals[0].packet_id,packet);
 assert.equal(r.approvals[0].source_ref,source);
 assert.equal(r.owner_approval_granted,false);
 assert.equal(r.execution_authorized,false);
 assert.equal(r.original_job_completed,false);
});
test('shared benchmark refuses execution, delivery, foreign owner, foreign project and wrong shift',async()=>{
 for(const modified of [
  {...env,REALITY_FINAL_LOOP_CHILD_EXECUTION_ENABLED:'true'},
  {...env,REALITY_FINAL_LOOP_PARENT_DELIVERY_ENABLED:'true'},
  {...env,REALITY_FINAL_LOOP_SHARED_BENCHMARK_OWNER_ID:'f'.repeat(36)},
  {...env,REALITY_FINAL_LOOP_SHARED_BENCHMARK_SHIFT_ID:'f'.repeat(36)},
  {...env,REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF:'incorrectbenchmarkref'},
  {...env,REALITY_FINAL_LOOP_SHARED_BENCHMARK_STAGING_ENABLED:'false'}
 ]){
  const lane=inspectFinalLoopSignedWorkerOperatingLane({env:modified,dbProject});
  assert.notEqual(lane.status,'FINAL_LOOP_WORKER_SHARED_OWNER_PACKET_PREPARATION_ONLY');
  const r=await requestFinalLoopChildApprovalFromAcceptedOriginal({
   db,env:modified,graph,workerRunId,call,fetchImpl:async()=>{}
  });
  assert.equal(r.status,'FINAL_LOOP_CHILD_APPROVAL_GOVERNED_SCOPE_NOT_ENABLED');
  assert.equal(r.owner_approval_granted,false);
  assert.equal(r.execution_authorized,false);
 }
});
test('the existing worker registers packet handler without treating packet as authority',()=>{
 const code=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',
  import.meta.url),'utf8');
 assert.match(code,/FINAL_LOOP_WORKER_SHARED_OWNER_PACKET_PREPARATION_ONLY/);
 assert.match(code,/PREPARE_FINAL_LOOP_CHILD_OWNER_PACKET/);
 assert.match(code,/finalLoopStagedActionRoutes\.status===/);
 assert.match(code,/REALITY_FINAL_LOOP_CHILD_APPROVAL_PREPARATION_ENABLED/);
 assert.doesNotMatch(code,/owner_approval_granted:\s*true/);
});
