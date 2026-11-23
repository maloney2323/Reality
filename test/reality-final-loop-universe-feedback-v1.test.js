import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectFinalLoopUniverseFeedback as feedback}
 from '../src/reality-final-loop-universe-feedback-v1.js';
const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const shift='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const root='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const universe='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const receipt='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const pr307='https://github.com/maloney2323/Reality/pull/307';
const pr308='https://github.com/maloney2323/Reality/pull/308';
const work='work:'+'1'.repeat(32);
const hash=c=>'sha256:'+c.repeat(64);
const obligations=[{
 original_work_id:work,source_ref:pr307,
 decision:'RECOVER',next_governed_action:
  'RECONCILE_EXISTING_PARENT_BLOCKER_AND_REQUIRE_EXACT_ACCEPTANCE',
 action_executed:false,settlement_committed:false
},{
 original_work_id:null,source_ref:pr308,
 decision:'SUSPEND',next_governed_action:
  'QUALIFY_DISTINCT_PARENT_ORIGINAL_BEFORE_CHILD_REVIEW',
 action_executed:false,settlement_committed:false
}];
const view={
 status:'FINAL_LOOP_OWNER_TIME_AND_EXECUTIVE_EVIDENCE_READY',
 read_only:true,owner_id:owner,shift_id:shift,
 continuity_head_sha256:hash('1'),
 original_job_completed:false,
 canonical_continuity_handoff:{
  status:'CANONICAL_HANDOFF_CARRIED_WITH_UNFINISHED_PROOFS',
  canonical_handoff_verified:true,read_only:true,
  continuity_root_id:root,continuity_head_sha256:hash('1'),
  revision:3,original_job_completed:false
 },
 time_horizon:{
  status:'FINAL_LOOP_TIME_HORIZONS_PROJECTED_READ_ONLY',
  execution_authorized:false,original_job_completed:false,
  present:{owner_id:owner,shift_id:shift,continuity_root_id:root,
   obligations}
 }
};
const outcomes=(items=[])=>({
 status:'FINAL_LOOP_SAME_OWNER_PARENT_OUTCOMES_INDEPENDENTLY_READ',
 owner_id:owner,shift_id:shift,read_only:true,
 owner_scope_verified:true,execution_authorized:false,
 outcomes:items,parent_delivery_count:items.length,
 verified_parent_count:items.filter(x=>x.original_job_completed).length,
 unfinished_parent_count:items.filter(x=>!x.original_job_completed).length
});
const verified={
 original_work_id:work,source_ref:pr307,
 source_manifest_sha256:hash('5'),
 status:'INDEPENDENTLY_SETTLED_UNIVERSE_PAST',
 independent_universe_verified:true,original_job_completed:true,
 verified_provider_comment_url:pr307+'#issuecomment-123',
 verified_universe_outcome_event_id:universe,
 parent_settlement_receipt_id:receipt
};
test('empty independently read Universe still preserves unresolved original and source',()=>{
 const r=feedback({canonicalView:view,parentOutcomes:outcomes()});
 assert.equal(r.status,'FINAL_LOOP_UNIVERSE_CONTINUITY_FEEDBACK_VERIFIED_READ_ONLY');
 assert.equal(r.verified_parent_count,0);
 assert.equal(r.unfinished_obligation_count,2);
 assert.equal(r.universe_readback_verified,true);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.execution_authorized,false);
 assert.equal(r.universe_is_not_a_second_truth_ledger,true);
 assert.equal(r.continuity_head_sha256,hash('1'));
 assert.equal(r.observations.length,2);
 assert.equal(r.observations[0].original_job_completed,false);
 assert.equal(r.observations[1].original_work_id,null);
});
test('independent Universe receipt becomes verified Past but does not close entire shift',()=>{
 const r=feedback({canonicalView:view,parentOutcomes:outcomes([verified])});
 assert.equal(r.status,'FINAL_LOOP_UNIVERSE_CONTINUITY_FEEDBACK_VERIFIED_READ_ONLY');
 assert.equal(r.verified_parent_count,1);
 assert.equal(r.unfinished_obligation_count,1);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.shift_completed,false);
 assert.equal(r.verified_outcomes[0].universe_outcome_event_id,universe);
 assert.equal(r.observations[0].event_kind,
  'owner_independent_original_job_final_receipt');
 assert.equal(r.observations[0].independent_original_settlement_verified,true);
 assert.equal(r.observations[1].original_job_completed,false);
});
test('reviewed recovery can guide next step, never self-authorize it',()=>{
 const recoveryGuidance={
  status:'FINAL_LOOP_OWNER_CANONICAL_RECOVERY_GUIDANCE_READY',
  owner_id:owner,shift_id:shift,
  continuity_head_sha256:hash('1'),
  read_only:true,recovery_verified:false,original_job_completed:false,
  original_work_id:work,source_ref:pr307,
  future:{
   next_governed_action:'PREPARE_EXACT_SOURCE_BOUND_OWNER_APPROVAL_PACKET',
   automatically_executable:false
  }
 };
 const r=feedback({canonicalView:view,parentOutcomes:outcomes(),
  recoveryGuidance});
 assert.equal(r.next_attention.original_work_id,work);
 assert.equal(r.next_attention.next_governed_action,
  'PREPARE_EXACT_SOURCE_BOUND_OWNER_APPROVAL_PACKET');
 assert.equal(r.action_dispatched,false);
 assert.equal(r.owner_approval_granted,false);
 assert.equal(r.observations[0].summary.includes('No owner consent'),true);
});
test('foreign owner, forged outcome, broken continuity head and missing readback fail closed',()=>{
 const cases=[
  {canonicalView:{...view,owner_id:root},parentOutcomes:outcomes()},
  {canonicalView:{...view,continuity_head_sha256:hash('2')},
   parentOutcomes:outcomes()},
  {canonicalView:view,parentOutcomes:undefined},
  {canonicalView:view,parentOutcomes:outcomes([{
   ...verified,verified_universe_outcome_event_id:null}])},
  {canonicalView:view,parentOutcomes:outcomes([{
   ...verified,source_ref:pr308}])},
  {canonicalView:view,parentOutcomes:outcomes([verified,verified])},
  {canonicalView:view,parentOutcomes:outcomes([{
   ...verified,original_job_completed:false}])}
 ];
 for(const c of cases){
  const r=feedback(c);
  assert.notEqual(r.status,
   'FINAL_LOOP_UNIVERSE_CONTINUITY_FEEDBACK_VERIFIED_READ_ONLY');
  assert.equal(r.execution_authorized,false);
  assert.equal(r.original_job_completed,false);
 }
});
test('owner and Chat use one optional authenticated Universe feedback projection',()=>{
 const ownerApi=readFileSync(new URL(
  '../api/reality/personal-time-horizon.js',import.meta.url),'utf8');
 const chat=readFileSync(new URL(
  '../api/reality/personal-chat.js',import.meta.url),'utf8');
 assert.match(ownerApi,/projectFinalLoopUniverseFeedback/);
 assert.match(ownerApi,/final_loop_universe_feedback:finalLoopUniverseFeedback/);
 assert.match(ownerApi,/REALITY_FINAL_LOOP_UNIVERSE_FEEDBACK_ENABLED/);
 assert.match(chat,/readOwnerTimeHorizonEvidence/);
 assert.match(chat,/REALITY_FINAL_LOOP_UNIVERSE_CHAT_CONTEXT_ENABLED/);
 assert.match(chat,/\.\.\.finalLoopUniverseObservations/);
 assert.match(chat,/feedback\.owner_id===session\.user_id/);
 assert.match(chat,/feedback\.shift_id===verifiedOwnerShift\?\.active_owner_shift_id/);
 assert.doesNotMatch(chat,/reality_record_final_loop_parent_settlement_v1/);
});


test('worker reuses canonical Universe readback without calling any independent authority adapter',()=>{
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(worker,/projectFinalLoopUniverseFeedback/);
 assert.match(worker,/reality_read_owner_final_loop_parent_outcomes_v1/);
 assert.match(worker,/final_loop_universe_feedback:finalLoopUniverseFeedback/);
 assert.match(worker,/REALITY_FINAL_LOOP_UNIVERSE_FEEDBACK_ENABLED/);
 assert.match(worker,/FINAL_LOOP_UNIVERSE_OUTCOME_READBACK_UNAVAILABLE/);
});


test('owner and signed worker resolve identical Universe facts from one canonical head',()=>{
 const ownerRead=feedback({canonicalView:view,parentOutcomes:outcomes([verified])});
 const workerRead=feedback({
  canonicalView:{...view,status:'FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING'},
  parentOutcomes:{...outcomes([verified]),
   status:'FINAL_LOOP_OWNER_PARENT_OUTCOMES_READ_ONLY'}
 });
 assert.equal(ownerRead.status,
  'FINAL_LOOP_UNIVERSE_CONTINUITY_FEEDBACK_VERIFIED_READ_ONLY');
 assert.deepEqual(workerRead,ownerRead);
 assert.equal(workerRead.execution_authorized,false);
 assert.equal(workerRead.shift_completed,false);
});
