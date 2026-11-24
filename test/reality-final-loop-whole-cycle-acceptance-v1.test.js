import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateRealityWholeCycleAcceptance as assess}
 from '../src/reality-final-loop-whole-cycle-acceptance-v1.js';
const owner='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const shift='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const root='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const original='work:'+'1'.repeat(32);
const src='https://github.com/example/Reality/pull/31';
const digest=x=>'sha256:'+x.repeat(64);
const graph={status:'UNIFIED_OWNER_JOB_CONTROL_READY',
 owner_id:owner,shift_id:shift,plan_fingerprint:digest('a'),
 production_changed:false,jobs:[{source_ref:src,original_work_id:original,
 independent_source_proof_verified:true,phase:'BLOCKED'}]};
const handoff={source_ref:src,original_work_id:original,
 continuity_identity_verified:true,qualifier_digest_verified:true,
 independent_internal_ci_verified:false,original_claim_admitted:false,
 independent_original_outcome_verified:false,universe_return_verified:false};
const verifiedGuard={status:'FINAL_LOOP_SHARED_CONTINUITY_GUARD_VERIFIED_READ_ONLY',
 continuity_root_id:root,continuity_head_sha256:digest('b'),
 revision:2,handoffs:[handoff]};
const checkpoint={status:'FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING',
 owner_id:owner,shift_id:shift,continuity_head_sha256:digest('b'),
 revision:2,shared_continuity_guard:verifiedGuard};
const packets={status:'FINAL_LOOP_OWNER_EXACT_CHILD_APPROVALS_READ_ONLY',
 owner_id:owner,shift_id:shift,read_only:true,execution_authorized:false,
 packets:[{packet_id:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
 source_ref:src,parent_original_work_id:original,
 approval_fingerprint:digest('c'),acceptance_contract_sha256:digest('d'),
 source_manifest_sha256:digest('e'),
 effect_type:'READ_ONLY_INTERNAL_PR_REVIEW',
 file_count:34,original_job_completed:false,
 state:'AWAITING_EXACT_OWNER_APPROVAL',approved:false}]};
const recovery={status:'FINAL_LOOP_EXACT_OWNER_APPROVAL_PACKET_DURABLY_PREPARED',
 recovery_verified:false,original_job_completed:false,owner_approval_granted:false};
const args={graph,ingress:checkpoint,continuityReturn:checkpoint,
 ownerPackets:packets,recovery};
test('one honest acceptance verdict identifies owner authority and internal CI in parallel',()=>{
 const r=assess(args);
 assert.equal(r.status,'FULL_CYCLE_ACCEPTANCE_OPEN_WITH_EXACT_BLOCKERS');
 assert.equal(r.full_cycle_accepted,false);
 assert.equal(r.original_count,1);
 assert.equal(r.continuity_revision,2);
 assert.equal(r.original_reports[0].status,
  'FULL_CYCLE_OWNER_APPROVAL_REQUIRED_AND_INTERNAL_CI_PENDING');
 assert.equal(r.original_reports[0].exact_owner_approval_required,true);
 assert.equal(r.original_reports[0].internal_ci_evidence_missing,true);
 assert.equal(r.original_reports[0].next_recovery_action,
  'VERIFY_DISTINCT_CASE_SPECIFIC_FROZEN_CI_REUSE_PRIOR_DIAGNOSTIC');
 assert.equal(r.next_governed_action,'PRESENT_EXACT_OWNER_PACKET_IN_REALITY_CHAT');
 assert.equal(r.original_reports[0].stages.length,8);
 assert.equal(r.original_reports[0].stages.filter(x=>x.verified).length,2);
 assert.equal(r.owner_approval_granted_by_evaluator,false);
 assert.equal(r.model_execution_authorized,false);
 assert.equal(r.original_job_completed_by_evaluator,false);
});
test('a missing packet is autonomously routed to registered preparation, never self-approved',()=>{
 const r=assess({...args,ownerPackets:{...packets,packets:[]}});
 assert.equal(r.next_governed_action,'PREPARE_FINAL_LOOP_CHILD_OWNER_PACKET');
 assert.equal(r.original_reports[0].status,
  'FULL_CYCLE_SELF_RECOVERY_PREPARE_EXACT_OWNER_PACKET');
 assert.equal(r.original_reports[0].exact_owner_approval_required,true);
 assert.equal(r.full_cycle_accepted,false);
});
test('approval does not authorize model, publication, settlement or internal maintenance bypass',()=>{
 const approved={...packets,packets:[{...packets.packets[0],
  state:'APPROVED_ONCE',approved:true}]};
 const r=assess({...args,ownerPackets:approved});
 assert.equal(r.original_reports[0].status,
  'FULL_CYCLE_SELF_RECOVERY_INDEPENDENT_INTERNAL_CI_REQUIRED');
 assert.equal(r.original_reports[0].next_governed_action,
  'RESUME_REGISTERED_SIGNED_MAINTENANCE_CI_VERIFIER');
 assert.equal(r.model_execution_authorized,false);
 assert.equal(r.authority_extended,false);
 assert.equal(r.full_cycle_accepted,false);
});
test('an LLM or synthetic provider-success claim is never independent original, Universe and continuation proof',()=>{
 for(const t of [
  {continuityReturn:{...checkpoint,
   shared_continuity_guard:{...verifiedGuard,
    handoffs:[{...handoff,independent_original_outcome_verified:true}]} }},
  {continuityReturn:{...checkpoint,
   shared_continuity_guard:{...verifiedGuard,
    handoffs:[{...handoff,universe_return_verified:true}]} }},
  {verifiedContinuation:{
   status:'FINAL_LOOP_INDEPENDENT_NEXT_ACTION_EXECUTED_AND_VERIFIED',
   owner_id:owner,shift_id:shift,original_work_id:original,
   source_ref:src,continuity_root_id:root,
   independent_resume_receipt_verified:true}},
  {ownerPackets:{...packets,packets:[{...packets.packets[0],
    state:'APPROVED_ONCE',approved:false}]}},
  {ingress:{...checkpoint,owner_id:'ffffffff-ffff-4fff-8fff-ffffffffffff'}},
  {continuityReturn:{...checkpoint,
   shared_continuity_guard:{...verifiedGuard,revision:0}}}
 ]){
  const r=assess({...args,...t});
  assert.equal(r.full_cycle_accepted,false);
  assert.equal(r.original_job_completed_by_evaluator,false);
  assert.equal(r.model_execution_authorized,false);
 }
});
test('full acceptance requires genuinely independent original, verified Universe and executed next action',()=>{
 const full={...handoff,independent_internal_ci_verified:true,
  original_claim_admitted:true,independent_original_outcome_verified:true,
  universe_return_verified:true};
 const next={status:'FINAL_LOOP_INDEPENDENT_NEXT_ACTION_EXECUTED_AND_VERIFIED',
  owner_id:owner,shift_id:shift,original_work_id:original,source_ref:src,
  continuity_root_id:root,independent_resume_receipt_verified:true};
 const r=assess({...args,verifiedContinuation:next,
  ownerPackets:{...packets,packets:[{...packets.packets[0],
   state:'APPROVED_ONCE',approved:true}]},
  continuityReturn:{...checkpoint,
   shared_continuity_guard:{...verifiedGuard,handoffs:[full]}}});
 assert.equal(r.full_cycle_accepted,true);
 assert.equal(r.status,'FULL_CYCLE_INDEPENDENT_ACCEPTANCE_PASS');
 assert.equal(r.original_reports[0].stages.every(x=>x.verified),true);
 assert.equal(r.original_job_completed_by_evaluator,false);
 const notAll=assess({...args,verifiedContinuation:next,
  graph:{...graph,jobs:[...graph.jobs,{source_ref:
   'https://github.com/example/Reality/pull/32',
   original_work_id:null,independent_source_proof_verified:true}]},
  ownerPackets:{...packets,packets:[{...packets.packets[0],
   state:'APPROVED_ONCE',approved:true}]},
  continuityReturn:{...checkpoint,shared_continuity_guard:{
   ...verifiedGuard,handoffs:[full]}}});
 assert.equal(notAll.full_cycle_accepted,false);
});
test('live signed worker publishes whole-cycle verdict AFTER independent return fence',()=>{
 const s=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',
  import.meta.url),'utf8');
 assert.ok(s.indexOf("workerStage='FINAL_LOOP_WHOLE_CYCLE_INDEPENDENT_ACCEPTANCE_CHECK'")>
  s.indexOf("workerStage='SHARED_CONTINUITY_VERIFIER_RETURN_FENCE'"));
 assert.ok(s.indexOf("workerStage='FINAL_LOOP_WHOLE_CYCLE_INDEPENDENT_ACCEPTANCE_CHECK'")<
  s.indexOf("workerStage='WORKER_RESPONSE_PUBLICATION'"));
 assert.match(s,/reality_read_owner_final_loop_child_approvals_v1/);
 assert.match(s,/final_loop_whole_cycle_acceptance:finalLoopWholeCycleAcceptance/);
 assert.match(s,/verifiedContinuation:null/);
});
