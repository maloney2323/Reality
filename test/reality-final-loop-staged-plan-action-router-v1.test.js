import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifySignedFinalLoopStagedPlanActions as classify}
 from '../src/reality-final-loop-staged-plan-action-router-v1.js';
const owner='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const shift='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const work='work:'+'1'.repeat(32);
const hash=x=>'sha256:'+x.repeat(64);
const src=n=>'https://github.com/example/Reality/pull/'+n;
const plan=(id,source,phase,original,n)=>({
 plan_id:id,source_ref:source,parent_source_phase:phase,
 parent_original_work_id:original,
 state:'PROPOSED_SOURCE_PLAN_AWAITING_INDEPENDENT_ADMISSION',
 source_head_sha:'e'.repeat(40),source_manifest_sha256:hash('c'),
 file_count:n,proposed_scope_count:Math.ceil(n/8),
 child_originals_admitted:0,owner_acceptance_verified:false,
 independent_source_review_verified:false
});
const admitted=plan('11111111-1111-4111-8111-111111111111',src(31),
 'BLOCKED',work,34);
const unadmitted=plan('22222222-2222-4222-8222-222222222222',src(32),
 'NOT_ADMITTED',null,304);
const graph={
 status:'UNIFIED_OWNER_JOB_CONTROL_READY',
 owner_id:owner,shift_id:shift,plan_fingerprint:hash('f'),
 installation_authorized:false,production_changed:false,
 jobs:[admitted,unadmitted].map(p=>({
  original_kind:'REAL_PR_REVIEW_ORIGINAL',
  source_ref:p.source_ref,original_work_id:p.parent_original_work_id,
  phase:p.parent_source_phase,independent_source_proof_verified:true
 }))
};
const staged={
 schema:'reality-final-loop-pr-source-plans-readback-v1',
 status:'FINAL_LOOP_PROPOSED_SOURCE_PLANS_NOT_EXECUTABLE',
 owner_id:owner,shift_id:shift,plan_fingerprint:hash('f'),
 read_only:true,execution_authorized:false,
 original_job_completed:false,child_originals_admitted:0,
 plans:[admitted,unadmitted]
};
const preflight={
 status:'FINAL_LOOP_CHILD_GOAL_ACCEPTANCE_PREFLIGHT_READ_ONLY',
 owner_id:owner,shift_id:shift,plan_fingerprint:hash('f'),
 read_only:true,execution_authorized:false,
 original_job_completed:false,
 plans:[{
  plan_id:admitted.plan_id,source_ref:admitted.source_ref,
  parent_original_work_id:work,
  source_manifest_sha256:admitted.source_manifest_sha256,
  acceptance_contract_sha256:hash('d'),
  verified_signed_source_goal_contract_prepared:true,
  owner_goal_acceptance_pending:true,
  independent_goal_acceptance_verified:false,
  pending_exact_owner_approval:true,
  child_review_automatically_authorized:false
 }]
};
test('categorizer routes staged admitted original to approval packet and unadmitted original to qualification',()=>{
 const r=classify({graph,staged,preflight});
 assert.equal(r.status,'FINAL_LOOP_STAGED_PLANS_VERIFIED_AND_NEXT_HANDLERS_CLASSIFIED');
 assert.equal(r.prepared_owner_packet_candidate_count,1);
 assert.equal(r.parent_admission_required_count,1);
 assert.equal(r.routes[0].next_registered_handler,'PREPARE_FINAL_LOOP_CHILD_OWNER_PACKET');
 assert.equal(r.routes[0].next_governed_action,
  'PREPARE_EXACT_SOURCE_BOUND_OWNER_APPROVAL_PACKET');
 assert.equal(r.routes[1].next_governed_action,'QUALIFY_AND_ADMIT_EXACT_PARENT_ORIGINAL');
 assert.equal(r.routes[1].next_registered_handler,null);
 assert.equal(r.action_dispatched,false);
 assert.equal(r.owner_approval_granted,false);
 assert.equal(r.model_execution_authorized,false);
 assert.equal(r.original_job_completed,false);
});
test('no accepted DB preflight, wrong owner, drifted source or fabricated consent fails closed',()=>{
 for(const input of [
  {preflight:null},
  {graph:{...graph,owner_id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc'}},
  {staged:{...staged,plans:[{...admitted,source_head_sha:'0'},unadmitted]}},
  {staged:{...staged,plans:[{...admitted,child_originals_admitted:1},unadmitted]}},
  {preflight:{...preflight,plans:[{...preflight.plans[0],
   source_manifest_sha256:hash('0')}]}},
  {preflight:{...preflight,plans:[{...preflight.plans[0],
   independent_goal_acceptance_verified:true}]}},
  {staged:{...staged,plans:[admitted,admitted]}}
 ]){
  const r=classify({graph,staged,preflight,...input});
  assert.notEqual(r.status,'FINAL_LOOP_STAGED_PLANS_VERIFIED_AND_NEXT_HANDLERS_CLASSIFIED');
  assert.equal(r.action_dispatched,false);
  assert.equal(r.original_job_completed,false);
 }
});
test('verified source contract without independent parent authority does not dispatch handler',()=>{
 const r=classify({graph,staged,preflight});
 assert.equal(r.routes[0].handler_requires_isolated_service_claim,true);
 assert.equal(r.routes[0].handler_dispatched,false);
 assert.equal(r.routes[0].child_execution_authorized,false);
});
test('existing signed worker must publish route and keep child execution distinct from packet preparation',()=>{
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const approval=readFileSync(new URL(
  '../src/reality-final-loop-child-approval-request-v1.js',import.meta.url),'utf8');
 assert.match(worker,/classifySignedFinalLoopStagedPlanActions/);
 assert.match(worker,/final_loop_staged_action_routes/);
 assert.match(worker,/REALITY_FINAL_LOOP_CHILD_APPROVAL_PREPARATION_ENABLED/);
 assert.match(approval,/REALITY_FINAL_LOOP_CHILD_APPROVAL_PREPARATION_ENABLED/);
 assert.match(approval,/REALITY_FINAL_LOOP_PR_SOURCE_PLANS_DB_ISOLATED/);
 assert.match(worker,/REALITY_FINAL_LOOP_CHILD_EXECUTION_ENABLED/);
});
