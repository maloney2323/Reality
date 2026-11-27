import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateRealityWholeCycleAcceptance as assess,reconcileVerifiedFinalLoopContinuation as reconcile}
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
 const returnFence=s.indexOf("workerStage='SHARED_CONTINUITY_VERIFIER_RETURN_FENCE'");
 const acceptance=s.indexOf("workerStage='FINAL_LOOP_WHOLE_CYCLE_INDEPENDENT_ACCEPTANCE_CHECK'");
 const publication=s.indexOf("workerStage='WORKER_RESPONSE_PUBLICATION'",acceptance);
 assert.ok(returnFence>0&&acceptance>returnFence&&publication>acceptance);
 const investigationStart=s.indexOf('if(suspensionInvestigationWake){');
 const investigationEnd=s.indexOf('// Continuous, standing EVIDENCE qualification intake',investigationStart);
 assert.ok(investigationStart>0&&investigationEnd>investigationStart&&investigationEnd<returnFence);
 const investigation=s.slice(investigationStart,investigationEnd);
 assert.match(investigation,/VERIFIED_SUSPENSION_INVESTIGATION_RECORDED_ORIGINAL_OPEN/);
 assert.match(investigation,/original_job_completed:false/);
 assert.doesNotMatch(investigation,/evaluateRealityWholeCycleAcceptance/);
 assert.match(s,/reality_read_owner_final_loop_child_approvals_v1/);
 assert.match(s,/final_loop_whole_cycle_acceptance:finalLoopWholeCycleAcceptance/);
 assert.match(s,/verifiedContinuation:reconcileVerifiedFinalLoopContinuation\(\{/);
 assert.doesNotMatch(s,/verifiedContinuation:null/);
});


test('verified review approval does not hide a separate business warrant mismatch behind CI retries',()=>{
 const approved={...packets,packets:[{...packets.packets[0],state:'APPROVED_ONCE',approved:true}]};
 const h={...handoff,unresolved_proof_gates:['CASE_SPECIFIC_FROZEN_RED_NOT_VERIFIED',
  'BUSINESS_ORIGINAL_WARRANT_MISMATCH','ORIGINAL_CLAIM_NOT_ADMITTED']};
 const r=assess({...args,ownerPackets:approved,continuityReturn:{...checkpoint,
  shared_continuity_guard:{...verifiedGuard,handoffs:[h]}}});
 assert.equal(r.original_reports[0].status,'FULL_CYCLE_EXACT_BUSINESS_AUTHORITY_RECONCILIATION_REQUIRED');
 assert.equal(r.original_reports[0].exact_owner_approval_required,false);
 assert.equal(r.original_reports[0].business_original_authority_missing,true);
 assert.equal(r.original_reports[0].internal_ci_evidence_missing,true);
 assert.equal(r.next_governed_action,'VERIFY_EXISTING_ORIGINAL_WARRANT_NO_SILENT_SCOPE_EXPANSION');
 assert.equal(r.original_reports[0].next_recovery_action,'VERIFY_DISTINCT_CASE_SPECIFIC_FROZEN_CI_REUSE_PRIOR_DIAGNOSTIC');
 assert.equal(r.full_cycle_accepted,false);
 assert.equal(r.authority_extended,false);
});

test('existing event-triggered independent CI result is bound to exact canonical continuation, no synthetic receipt',()=>{
 const event='99999999-9999-4999-8999-999999999999';
 const trigger={status:'FINAL_LOOP_GOVERNED_TRIGGER_EXISTING_CASE_VERIFIER_READY',
  dispatch_permitted:true,execution_authorized_by_trigger:false,
  next_action:'VERIFY_DISTINCT_CASE_SPECIFIC_FROZEN_CI_REUSE_PRIOR_DIAGNOSTIC',
  owner_id:owner,shift_id:shift,event_id:event,original_work_id:original,
  source_ref:src,continuity_root_id:root,continuity_revision:2,
  continuity_head_sha256:digest('b'),resume_event:{event_id:event,source_ref:src}};
 const caseCi={status:'EXACT_SIGNED_MAINTENANCE_SOURCE_CI_RED_GREEN_INDEPENDENTLY_ATTESTED',
  shift_id:shift,resume_event_id:event,source_ref:src,case_specific_ci_receipt_sha256:digest('f'),
  case_specific_frozen_red_attested:true,code_regression_green_verified:true,
  repair_executed:false,repair_installed:false,original_job_completed:false,
  installation_authorized:false,production_changed:false,new_shift_started:false};
 const full={...handoff,independent_internal_ci_verified:true,
  internal_maintenance_verifier_receipt_sha256:digest('f'),
  original_claim_admitted:true,independent_original_outcome_verified:true,
  universe_return_verified:true};
 const current={...checkpoint,shared_continuity_guard:{...verifiedGuard,
  owner_id:owner,shift_id:shift,read_only:true,execution_authorized:false,handoffs:[full]}};
 const inputs={graph,trigger,caseCi,continuityReturn:current};
 const proof=reconcile(inputs);
 assert.equal(proof.independent_resume_receipt_verified,true);
 assert.equal(proof.independent_resume_receipt_sha256,digest('f'));
 const verdict=assess({...args,verifiedContinuation:proof,continuityReturn:current,
  ownerPackets:{...packets,packets:[{...packets.packets[0],state:'APPROVED_ONCE',approved:true}]}});
 assert.equal(verdict.full_cycle_accepted,true);
 for(const change of [
  {trigger:{...trigger,dispatch_permitted:false}},
  {caseCi:{...caseCi,resume_event_id:null}},
  {caseCi:{...caseCi,case_specific_ci_receipt_sha256:digest('e')}},
  {caseCi:{...caseCi,production_changed:true}},
  {continuityReturn:{...current,shared_continuity_guard:{...current.shared_continuity_guard,revision:3}}},
  {continuityReturn:{...current,shared_continuity_guard:{...current.shared_continuity_guard,
    handoffs:[{...full,independent_internal_ci_verified:false}]}}}
 ])assert.equal(reconcile({...inputs,...change}),null);
});
