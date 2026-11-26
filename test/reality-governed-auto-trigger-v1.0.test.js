import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {
 capabilityFromSourcePath,registerOriginalJobCapabilityAutoTrigger,
 claimOriginalJobCapabilityAutoTrigger,routeVerifiedFinalLoopResumeTrigger,
} from '../src/reality-governed-auto-trigger-v1.0.js';
const project='hvkfreoagbrphwghjajw',url='https://'+project+'.supabase.co';
const owner=randomUUID(),conv=randomUUID(),event=randomUUID(),goalEvent=randomUUID(),trigger=randomUUID(),claim=randomUUID();
const original='work:'+'a'.repeat(32);
const env={VERCEL_ENV:'preview',REALITY_UNIVERSE_PERSISTENCE_ENABLED:'true',REALITY_CONTINUOUS_RELIABILITY_ENABLED:'true',
 REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF:project,
 REALITY_PERSONAL_CHAT_SUPABASE_URL:url,
 REALITY_PERSONAL_CHAT_PUBLISHABLE_KEY:'sb_publishable_testonly',
 REALITY_RELIABILITY_BENCHMARK_PROJECT_REF:project,
 REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF:project,
 REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL:url,
 REALITY_UNIVERSE_PERSISTENCE_KEY:'non-real-db-secret-unit-test'};
const session={user_id:owner,config:{url}};
const evidence={independently_verified:true,source_sha:'c'.repeat(40),
 source_path:'src/reality-extensions/reality-general-execution-receipt.mjs',
 original_provider_failed_run_id:41177409146};
test('a real missing extension maps to an exact governed capability, never an arbitrary path',()=>{
 assert.equal(capabilityFromSourcePath(evidence.source_path),'reality_general_execution_receipt');
 for(const path of ['../exec.mjs','api/reality/personal-chat.js','src/reality-extensions/../danger.mjs','src/reality-extensions/Danger.mjs'])
  assert.throws(()=>capabilityFromSourcePath(path),/GOVERNED_AUTO_TRIGGER_SOURCE_PATH_UNVERIFIED/);
});
test('an original work receipt automatically enqueues once, with no installation authorization',async()=>{
 let observed=0;
 const result=await registerOriginalJobCapabilityAutoTrigger({
  session,conversationId:conv,originalWorkId:original,
  originalWorkEventId:event,goalTransitionEventId:goalEvent,evidence,env,
  invoke:async (_db,name,input)=>{
   observed++;
   assert.equal(name,'reality_enqueue_governed_auto_trigger_v1');
   assert.equal(input.p_owner_id,owner);
   assert.equal(input.p_conversation_id,conv);
   assert.equal(input.p_original_work_id,original);
   assert.equal(input.p_original_work_event_id,event);
   assert.equal(input.p_goal_transition_event_id,goalEvent);
   assert.equal(input.p_capability_id,'reality_general_execution_receipt');
   return {trigger_id:trigger,source_event_id:event,
    original_work_id:original,phase:'PENDING_VERIFIED_GAP_REOBSERVATION',
    installation_authorized:false,original_job_completed:false,
    production_changed:false,new_customer_job_created:false};
  },
 });
 assert.equal(observed,1);
 assert.equal(result.status,'PENDING_VERIFIED_GAP_REOBSERVATION');
 assert.equal(result.original_work_id,original);
 assert.equal(result.installation_authorized,false);
 assert.equal(result.new_customer_job_created,false);
});
test('worker claims at most one original event; claim is not a model grant',async()=>{
 const result=await claimOriginalJobCapabilityAutoTrigger({
  session,triggerId:trigger,originalWorkId:original,env,
  invoke:async (_db,name,input)=>{
   assert.equal(name,'reality_claim_governed_auto_trigger_v1');
   assert.equal(input.p_owner_id,owner);
   return {trigger_id:trigger,claim_id:claim,original_work_id:original,
    original_work_event_id:event,phase:'CLAIMED_FOR_INDEPENDENT_INVESTIGATION',
    reobserve_before_generation:true,installation_authorized:false,
    original_job_completed:false,new_customer_job_created:false,production_changed:false};
  },
 });
 assert.equal(result.model_generation_authorized,false);
 assert.equal(result.original_job_completed,false);
 assert.equal(result.claim_id,claim);
});
test('unauthenticated, foreign scope, forged evidence and false success are rejected',async()=>{
 const common={session,conversationId:conv,originalWorkId:original,
  originalWorkEventId:event,goalTransitionEventId:goalEvent,evidence,env};
 const bad=[
  {...common,session:{...session,user_id:'fake'}},
  {...common,env:{...env,VERCEL_ENV:'production'}},
  {...common,originalWorkId:'work:'+'f'.repeat(33)},
  {...common,evidence:{...evidence,independently_verified:false}},
  {...common,evidence:{...evidence,source_sha:'unknown'}},
 ];
 for(const input of bad)await assert.rejects(
  registerOriginalJobCapabilityAutoTrigger({...input,invoke:async()=>{throw Error('MUST_NOT_CALL')}}),
  /GOVERNED_AUTO_TRIGGER_/);
 await assert.rejects(registerOriginalJobCapabilityAutoTrigger({
  ...common,invoke:async()=>({trigger_id:trigger,source_event_id:event,
   original_work_id:original,phase:'PENDING_VERIFIED_GAP_REOBSERVATION',
   installation_authorized:true,original_job_completed:false,
   production_changed:false,new_customer_job_created:false}),
 }),/GOVERNED_AUTO_TRIGGER_DURABLE_PROVIDER_RECEIPT_MISMATCH/);
});

test('Final Loop auto trigger rejects ambiguous, stale or unauthorized proof events',()=>{
 const shiftId=randomUUID(),root=randomUUID(),eventId=randomUUID();
 const digest='sha256:'+'b'.repeat(64),head='sha256:'+'c'.repeat(64);
 const source='https://github.com/maloney2323/Reality/pull/307';
 const action='VERIFY_DISTINCT_CASE_SPECIFIC_FROZEN_CI_REUSE_PRIOR_DIAGNOSTIC';
 const identity={source_ref:source,original_work_id:original};
 const h={...identity,continuity_identity_verified:true,qualifier_digest_verified:true,
  qualifier_receipt_sha256:digest,unresolved_proof_gates:['CASE_SPECIFIC_FROZEN_RED_NOT_VERIFIED'],
  independent_internal_ci_verified:false,execution_authorized:false,original_job_completed:false};
 const e={...identity,event_id:eventId,event_kind:'QUALIFIER_PROOF_CHANGED',
  source_receipt_sha256:digest,event_causality_sha256:digest,continuity_revision:2,
  continuity_head_sha256:head,next_qualified_action:action,
  would_resume_suspended_obligation:true,executor_invoked:false,execution_authorized:false};
 const c={status:'FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING',owner_id:owner,shift_id:shiftId,
  read_only:true,transition_committed:false,executor_invoked:false,owner_approval_granted:false,
  installation_authorized:false,production_changed:false,
  original_job_completed:false,revision:2,continuity_head_sha256:head,
  shared_continuity_guard:{status:'FINAL_LOOP_SHARED_CONTINUITY_GUARD_VERIFIED_READ_ONLY',
   owner_id:owner,shift_id:shiftId,continuity_root_id:root,revision:2,
   continuity_head_sha256:head,read_only:true,execution_authorized:false,
   original_job_completed:false,handoffs:[h]},
  governed_qualification_handoffs:[{...identity,qualifier_receipt_sha256:digest,next_qualified_action:action}],
  event_resume_shadow:{status:'FINAL_LOOP_VERIFIED_EVENT_SHADOW_CONSUMED_NO_DISPATCH',
   event_dispatch_enabled:false,execution_authorized:false,shadow_ready_event_count:1,ready_event_refs:[e]}};
 const route=continuity=>routeVerifiedFinalLoopResumeTrigger({continuity,shiftId});
 const change=x=>({...c,event_resume_shadow:{...c.event_resume_shadow,ready_event_refs:[{...e,...x}]}});
 const accepted=route(c);
 assert.equal(accepted.status,'FINAL_LOOP_GOVERNED_TRIGGER_EXISTING_CASE_VERIFIER_READY');
 assert.deepEqual(accepted.resume_event,{event_id:eventId,source_ref:source});
 assert.equal(accepted.dispatch_permitted,true);
 assert.equal(accepted.execution_authorized_by_trigger,false);
 for(const bad of [null,{...c,shift_id:randomUUID()},{...c,execution_authorized:true},
  {...c,shared_continuity_guard:{...c.shared_continuity_guard,revision:1}},
  change({continuity_revision:1}),change({continuity_head_sha256:digest}),
  change({source_receipt_sha256:head}),change({next_qualified_action:'INSTALL'}),
  change({original_work_id:'work:'+'f'.repeat(32)}),change({execution_authorized:true}),
  {...c,event_resume_shadow:{...c.event_resume_shadow,shadow_ready_event_count:2,ready_event_refs:[e,e]}},
  {...c,shared_continuity_guard:{...c.shared_continuity_guard,handoffs:[{...h,independent_internal_ci_verified:true}]}}
 ])assert.equal(route(bad).dispatch_permitted,false);
 const terminalAction='QUALIFY_DISTINCT_RECOVERY_EVIDENCE_AND_EXACT_BUDGET_NO_REPLAY';
 const terminalGate='TERMINAL_BUILDER_DISTINCT_EVIDENCE_AND_BUDGET_REQUIRED';
 const terminal={...change({next_qualified_action:terminalAction}),
  shared_continuity_guard:{...c.shared_continuity_guard,handoffs:[{...h,
   next_qualified_action:terminalAction,unresolved_proof_gates:[...h.unresolved_proof_gates,terminalGate]}]},
  governed_qualification_handoffs:[{...identity,qualifier_receipt_sha256:digest,
   next_qualified_action:terminalAction}]};
 const recovery=route(terminal);
 assert.equal(recovery.status,'FINAL_LOOP_GOVERNED_TRIGGER_TERMINAL_EVIDENCE_REQUALIFICATION_DUE');
 assert.equal(recovery.evidence_readback_permitted,true);
 assert.equal(recovery.dispatch_permitted,false);
 assert.equal(recovery.resume_event,null);
 assert.equal(recovery.new_attempt_authorized,false);
 assert.equal(recovery.previous_attempt_budget_preserved,true);
 assert.equal(recovery.repeat_prior_ci_dispatch_permitted,false);
 assert.equal(recovery.execution_authorized_by_trigger,false);
 for(const invalid of [
  {...terminal,governed_qualification_handoffs:c.governed_qualification_handoffs},
  {...terminal,shared_continuity_guard:{...terminal.shared_continuity_guard,handoffs:[h]}},
  {...terminal,event_resume_shadow:{...terminal.event_resume_shadow,ready_event_refs:[{...e,next_qualified_action:terminalAction,source_receipt_sha256:head}]}},
  {...c,shared_continuity_guard:terminal.shared_continuity_guard}
 ]){const blocked=route(invalid);assert.equal(blocked.dispatch_permitted,false);assert.notEqual(blocked.evidence_readback_permitted,true);}
 // Independent review qualification may coexist with a terminal repair.
 // The claimed event selects the exact scope, not the first event in a shift.
 const reviewAction='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM';
 const reviewEvent=randomUUID(),planId=randomUUID(),packetId=randomUUID();
 const reviewEvidence={...e,event_id:reviewEvent,next_qualified_action:reviewAction};
 const reviewGuard={...h,next_qualified_action:reviewAction,
  unresolved_proof_gates:[...h.unresolved_proof_gates,terminalGate]};
 const reviewContinuity={...c,
  shared_continuity_guard:{...c.shared_continuity_guard,handoffs:[reviewGuard]},
  governed_qualification_handoffs:[{...identity,qualifier_receipt_sha256:digest,next_qualified_action:reviewAction}],
  event_resume_shadow:{...c.event_resume_shadow,shadow_ready_event_count:2,
   ready_event_refs:[e,reviewEvidence]}};
 const scope={schema:'reality-canonical-approved-review-scope-v1',
  status:'CANONICAL_APPROVED_REVIEW_SCOPE_BOUND_CLAIM_REQUIRED',
  owner_id:owner,shift_id:shiftId,parent_original_work_id:original,source_ref:source,
  plan_id:planId,packet_id:packetId,owner_approval_receipt_sha256:digest,plan_fingerprint:digest,
  source_head_sha:'a'.repeat(40),source_manifest_sha256:digest,acceptance_contract_sha256:digest,
  continuity_root_id:root,continuity_head_sha256:head,revision:2,
  effect_type:'READ_ONLY_INTERNAL_PR_REVIEW',canonical_claim_required:true,
  next_governed_action:'CLAIM_EXACT_CANONICAL_CHILD_REVIEW_THROUGH_EXISTING_SIGNED_WORKER',
  read_only:true,execution_authorized:false,original_job_completed:false,production_changed:false};
 const reviewRoute={source_ref:source,parent_original_work_id:original,plan_id:planId,
  source_head_sha:scope.source_head_sha,source_manifest_sha256:digest,acceptance_contract_sha256:digest,
  operation_category:'EXECUTION',authority_scope:'EXACT_ACCEPTED_READ_ONLY_REVIEW',
  next_governed_action:reviewAction,next_registered_handler:reviewAction,
  existing_owner_goal_acceptance_verified:true,owner_action_required:false,
  child_execution_authorized:false,handler_dispatched:false,original_job_completed:false,
  parent_source_phase:'BLOCKED',canonical_execution_handoff:scope};
 const stagedActions={status:'FINAL_LOOP_STAGED_PLANS_VERIFIED_AND_NEXT_HANDLERS_CLASSIFIED',
  read_only:true,action_dispatched:false,model_execution_authorized:false,
  original_job_completed:false,routes:[reviewRoute]};
 const input={continuity:reviewContinuity,shiftId,claimedEventId:reviewEvent,stagedActions};
 const review=routeVerifiedFinalLoopResumeTrigger(input);
 assert.equal(review.status,'FINAL_LOOP_GOVERNED_TRIGGER_EXACT_REVIEW_CLAIM_ROUTE_READY');
 assert.equal(review.review_claim_route_ready,true);
 assert.equal(review.canonical_claim_handoff,scope);
 assert.equal(review.dispatch_permitted,false);
 assert.equal(review.resume_event,null);
 assert.equal(review.new_attempt_authorized,false);
 assert.equal(review.repeat_prior_ci_dispatch_permitted,false);
 assert.equal(review.execution_authorized_by_trigger,false);
 for(const changes of [
  {claimedEventId:null},{claimedEventId:randomUUID()},{claimedEventId:eventId},{stagedActions:null},
  {stagedActions:{...stagedActions,routes:[reviewRoute,reviewRoute]}},
  ...[{authority_scope:'SIGNED_MAINTENANCE_WARRANT'},{operation_category:'RECOVERY'},
    {canonical_execution_handoff:{...scope,revision:3}},
    {canonical_execution_handoff:{...scope,execution_authorized:true}},
    {canonical_execution_handoff:{...scope,parent_original_work_id:'work:'+'a'.repeat(32)}}]
   .map(d=>({stagedActions:{...stagedActions,routes:[{...reviewRoute,...d}]}}))
 ]){
  const blocked=routeVerifiedFinalLoopResumeTrigger({...input,...changes});
  assert.notEqual(blocked.review_claim_route_ready,true);
  assert.equal(blocked.dispatch_permitted,false);
 }
 const completed=change({event_kind:'INDEPENDENT_FROZEN_CI_RECEIPT'});
 completed.shared_continuity_guard={...c.shared_continuity_guard,handoffs:[{...h,independent_internal_ci_verified:true}]};
 assert.equal(route(completed).status,'FINAL_LOOP_GOVERNED_TRIGGER_RECONCILIATION_DUE');
 assert.equal(route(completed).dispatch_permitted,false);
});
