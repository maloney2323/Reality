import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifySignedFinalLoopStagedPlanActions as classify,
 hasCurrentApprovedChildReviewRoute as canRoute,
 projectCanonicalApprovedReviewHandoff as handoff,
 reconcileReviewedRecoveryToFinalLoopSource as reconcile,
 inspectFinalLoopRecoveryContinuation as inspect,
 verifyFinalLoopRecoveryContinuityReadback as observe}
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
 assert.match(worker,/finalLoopChildReview=hasCurrentApprovedChildReviewRoute\(\{[\s\S]*?\?await advanceOneFinalLoopChildReview/);
});


// The reviewed recovery exists in the same canonical shift. Its original
// investigation has no source_claim_id, so an eligible proposal must not be
// misrepresented as a proven causal link or an execution authorization.
const reviewedIncident='33333333-3333-4333-8333-333333333333';
const classification={
 schema:'reality-governed-continuity-recovery-handoff-v1',
 status:'GOVERNED_RECOVERY_DURABLE_HANDOFFS_CLASSIFIED',
 owner_id:owner,shift_id:shift,classification_only:true,
 action_dispatched:false,
 items:[{incident_id:reviewedIncident,shift_id:shift,
  continuity_state:'GOVERNED_ACTION_INDEPENDENTLY_REVIEWED_ORIGINAL_UNSETTLED',
  independent_action_review_receipt_sha256:hash('a'),
  original_job_completed:false,execution_permitted_by_classification:false}]
};
const recoveryRouting={
 schema:'reality-categorized-continuity-registered-action-route-v1',
 status:'CONTINUITY_REGISTERED_ACTION_ROUTES_CLASSIFIED',
 owner_id:owner,shift_id:shift,action_dispatched:false,
 items:[{incident_id:reviewedIncident,shift_id:shift,
  route:'EXACT_ORIGINAL_REENTRY_GATE_REQUIRED',
  investigation_receipt_sha256:hash('b'),
  execution_authorized:false,action_executed:false,
  original_job_completed:false}]
};
const operatingLane={
 status:'FINAL_LOOP_WORKER_OWNER_PACKET_LANE_CONFIGURED_NOT_ACTIVATED',
 operating_lane:'NORMAL_SIGNED_SHIFT'
};
const candidate=()=>reconcile({
 graph,stagedActions:classify({graph,staged,preflight}),
 continuityClassification:classification,registeredRouting:recoveryRouting
});
test('independently reviewed recovery joins one canonical original and owner packet candidate, without granting causal proof',()=>{
 const c=candidate();
 assert.equal(c.status,
  'FINAL_LOOP_REVIEWED_RECOVERY_HAS_ONE_ELIGIBLE_OWNER_PACKET_SOURCE');
 assert.equal(c.incident_id,reviewedIncident);
 assert.equal(c.original_work_id,work);
 assert.equal(c.source_ref,admitted.source_ref);
 assert.equal(c.incident_causal_lineage_independently_verified,false);
 assert.equal(c.original_source_and_goal_verified_for_owner_proposal,true);
 assert.equal(c.action_dispatched,false);
 assert.equal(c.execution_authorized,false);
 assert.equal(c.recovery_verified,false);
});
test('missing independent review or stale source/owner fails closed',()=>{
 const cases=[
  {continuityClassification:{...classification,items:[{
   ...classification.items[0],independent_action_review_receipt_sha256:null}]}},
  {registeredRouting:{...recoveryRouting,owner_id:'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'}},
  {stagedActions:classify({...{graph,staged,preflight},
   staged:{...staged,plans:[{...admitted,source_head_sha:'0'},unadmitted]}})}
 ];
 for(const c of cases){
  const r=reconcile({graph,
   stagedActions:classify({graph,staged,preflight}),
   continuityClassification:classification,
   registeredRouting:recoveryRouting,...c});
  assert.notEqual(r.status,
   'FINAL_LOOP_REVIEWED_RECOVERY_HAS_ONE_ELIGIBLE_OWNER_PACKET_SOURCE');
  assert.equal(r.action_dispatched,false);
  assert.equal(r.original_job_completed,false);
 }
});
test('staging-only release cannot report owner-packet dispatch',()=>{
 const result=inspect({candidate:candidate(),
  operatingLane:{status:'SOURCE_STAGING_ONLY_NOT_NORMAL_SCHEDULED_WORKER',
   operating_lane:'STAGING_ONLY'}});
 assert.equal(result.status,
  'FINAL_LOOP_REENTRY_BLOCKED_WORKER_RELEASE_OR_ISOLATION');
 assert.equal(result.recovery_verified,false);
 assert.equal(result.original_job_completed,false);
});
test('real packet acknowledgement is a pending owner action, not recovery or settlement',()=>{
 const c=candidate();
 const p=inspect({candidate:c,operatingLane,
  approvalRequest:{
   status:'FINAL_LOOP_CHILD_APPROVAL_GATED_BY_EXACT_OWNER_ACTION',
   owner_id:owner,shift_id:shift,
   approvals:[{plan_id:admitted.plan_id,source_ref:admitted.source_ref,
    status:'FINAL_LOOP_CHILD_EXACT_OWNER_APPROVAL_REQUIRED',
    packet_id:'44444444-4444-4444-8444-444444444444',
    proposal_fingerprint:hash('a')}]}
 });
 assert.equal(p.status,
  'FINAL_LOOP_EXACT_OWNER_APPROVAL_PACKET_DURABLY_PREPARED');
 assert.equal(p.handler_dispatched,true);
 assert.equal(p.handler_result_verified,true);
 assert.equal(p.recovery_verified,false);
 assert.equal(p.original_job_completed,false);
 const missing=inspect({candidate:c,operatingLane,approvalRequest:{
  status:'FINAL_LOOP_CHILD_APPROVAL_GATED_BY_EXACT_OWNER_ACTION',
  owner_id:owner,shift_id:shift,approvals:[]}});
 assert.equal(missing.status,
  'FINAL_LOOP_REGISTERED_OWNER_PACKET_HANDLER_NOT_VERIFIED');
 assert.equal(missing.handler_dispatched,false);
});

test('shared benchmark packet preparation resolves recovery blocker without granting autonomous owner authority',()=>{
 const r=inspect({
  candidate:candidate(),
  operatingLane:{
   status:'FINAL_LOOP_WORKER_SHARED_OWNER_PACKET_PREPARATION_ONLY',
   operating_lane:'NORMAL_SIGNED_SHIFT'
  },
  approvalRequest:{
   status:'FINAL_LOOP_CHILD_APPROVAL_GATED_BY_EXACT_OWNER_ACTION',
   owner_id:owner,shift_id:shift,
   approvals:[{
    plan_id:admitted.plan_id,source_ref:admitted.source_ref,
    status:'FINAL_LOOP_CHILD_EXACT_OWNER_APPROVAL_REQUIRED',
    packet_id:'77777777-7777-4777-8777-777777777777',
    proposal_fingerprint:hash('a')
   }]
  }
 });
 assert.equal(r.status,'FINAL_LOOP_EXACT_OWNER_APPROVAL_PACKET_DURABLY_PREPARED');
 assert.equal(r.blocker_class,'EXACT_OWNER_AUTHORIZATION_REQUIRED');
 assert.equal(r.next_governed_action,'PRESENT_EXACT_OWNER_PACKET_IN_REALITY_CHAT');
 assert.equal(r.handler_result_verified,true);
 assert.equal(r.child_execution_authorized,false);
 assert.equal(r.recovery_verified,false);
 assert.equal(r.owner_approval_granted,false);
 assert.equal(r.automatic_retry_without_new_evidence,false);
 assert.equal(r.original_job_completed,false);
});

test('signed worker publishes recovery-to-source disposition separately from outcome receipts',()=>{
 const worker=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(worker,/reconcileReviewedRecoveryToFinalLoopSource/);
 assert.match(worker,/inspectFinalLoopRecoveryContinuation/);
 assert.match(worker,/final_loop_recovery_continuation:/);
});


test('after-action Continuity readback detects real head revision but cannot self-certify recovery',()=>{
 const c=candidate(),before={
  status:'CANONICAL_HANDOFF_CARRIED_WITH_UNFINISHED_PROOFS',
  canonical_handoff_verified:true,
  continuity_root_id:'55555555-5555-4555-8555-555555555555',
  continuity_head_sha256:hash('1'),revision:3
 };
 const after={
  schema:'reality-final-loop-canonical-proof-readback-v1',
  status:'FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING',
  owner_id:owner,shift_id:shift,read_only:true,
  independent_owner_scope_verified:true,
  continuity_root_id:before.continuity_root_id,
  continuity_head_sha256:hash('1'),revision:3,
  original_job_completed:false
 };
 const unchanged=observe({candidate:c,before,after});
 assert.equal(unchanged.status,
  'FINAL_LOOP_RECOVERY_CONTINUITY_NO_STATE_CHANGE_ORIGINAL_OPEN');
 assert.equal(unchanged.continuity_state_changed,false);
 const advanced=observe({candidate:c,before,after:{
  ...after,continuity_head_sha256:hash('2'),revision:4}});
 assert.equal(advanced.status,
  'FINAL_LOOP_RECOVERY_CONTINUITY_NEW_REVISION_ORIGINAL_STILL_OPEN');
 assert.equal(advanced.continuity_state_changed,true);
 assert.equal(advanced.recovery_verified,false);
 assert.equal(advanced.original_job_completed,false);
 for(const invalid of [
  {...after,continuity_head_sha256:hash('2')},
  {...after,owner_id:'99999999-9999-4999-8999-999999999999'},
  {...after,original_job_completed:true},
  {...after,continuity_root_id:'66666666-6666-4666-8666-666666666666'}
 ]){
  const r=observe({candidate:c,before,after:invalid});
  assert.notEqual(r.status,
   'FINAL_LOOP_RECOVERY_CONTINUITY_NEW_REVISION_ORIGINAL_STILL_OPEN');
  assert.equal(r.recovery_verified,false);
 }
});


test('existing exact approved goal remains connected to reviewed recovery without preparing another approval',()=>{
 const accepted={...preflight,plans:[{...preflight.plans[0],
  independent_goal_acceptance_verified:true,owner_goal_acceptance_pending:false,
  pending_exact_owner_approval:false,owner_approval_claim_window_current:true,
  owner_approval_expired:false}]};
 const routes=classify({graph,staged,preflight:accepted});
 assert.equal(routes.status,'FINAL_LOOP_STAGED_PLANS_VERIFIED_AND_NEXT_HANDLERS_CLASSIFIED');
 assert.equal(routes.prepared_owner_packet_candidate_count,0);
 assert.equal(routes.routes[0].existing_owner_goal_acceptance_verified,true);
 assert.equal(routes.routes[0].owner_action_required,false);
 assert.equal(routes.routes[0].next_registered_handler,'VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM');
 assert.equal(routes.routes[0].child_execution_authorized,false);
 assert.equal(canRoute({routes,operatingLane}),true);
 assert.equal(canRoute({routes,operatingLane:{...operatingLane,status:'FINAL_LOOP_WORKER_SHARED_OWNER_PACKET_PREPARATION_ONLY'}}),false);
 assert.equal(canRoute({routes:{...routes,action_dispatched:true},operatingLane}),false);
 assert.equal(canRoute({routes:{...routes,routes:[{...routes.routes[0],acceptance_contract_sha256:null}]},operatingLane}),false);
 assert.equal(canRoute({routes:classify({graph,staged,preflight}),operatingLane}),false);
 const c=reconcile({graph,stagedActions:routes,
  continuityClassification:classification,registeredRouting:recoveryRouting});
 assert.equal(c.status,'FINAL_LOOP_REVIEWED_RECOVERY_HAS_EXISTING_ACCEPTED_GOAL');
 assert.equal(c.original_work_id,work);
 assert.equal(c.execution_authorized,false);
 const r=inspect({candidate:c,operatingLane});
 assert.equal(r.status,'FINAL_LOOP_EXISTING_ACCEPTED_GOAL_REQUIRES_VERIFIED_CHILD_CLAIM');
 assert.equal(r.owner_action_required,false);
 assert.equal(r.child_execution_authorized,false);
 assert.equal(r.original_job_completed,false);
 for(const change of [{owner_approval_claim_window_current:false},
  {owner_approval_expired:true},{source_manifest_sha256:hash('0')},
  {owner_goal_acceptance_pending:true},{pending_exact_owner_approval:true}]){
  const rejected=classify({graph,staged,preflight:{...accepted,
   plans:[{...accepted.plans[0],...change}]}});
  assert.notEqual(rejected.status,'FINAL_LOOP_STAGED_PLANS_VERIFIED_AND_NEXT_HANDLERS_CLASSIFIED');
  assert.equal(rejected.action_dispatched,false);
 }
});

test('canonical approved scope binds exact receipt and five scopes to the shared head, without authority transfer',()=>{
 const p={...preflight.plans[0],independent_goal_acceptance_verified:true,
  owner_goal_acceptance_pending:false,pending_exact_owner_approval:false,
  owner_approval_claim_window_current:true,owner_approval_expired:false};
 const h={schema:'reality-canonical-approved-review-scope-v1',
  packet_id:'44444444-4444-4444-8444-444444444444',
  approval_request_id:'55555555-5555-4555-8555-555555555555',
  acceptance_event_id:'66666666-6666-4666-8666-666666666666',
  owner_approval_receipt_sha256:hash('1'),acceptance_event_content_hash:'2'.repeat(64),
  owner_id:owner,shift_id:shift,plan_id:admitted.plan_id,plan_fingerprint:graph.plan_fingerprint,
  parent_original_work_id:work,source_ref:admitted.source_ref,source_head_sha:admitted.source_head_sha,
  source_proof_sha256:hash('3'),source_manifest_sha256:admitted.source_manifest_sha256,
  acceptance_contract_sha256:p.acceptance_contract_sha256,scope_count:5,
  scope_fingerprints:Array.from({length:5},(_,i)=>({index:i,scope_sha256:hash(String(i+4))})),
  effect_type:'READ_ONLY_INTERNAL_PR_REVIEW',canonical_claim_required:true,
  execution_authorized:false,original_job_completed:false,production_changed:false};
 const guard={status:'FINAL_LOOP_SHARED_CONTINUITY_GUARD_VERIFIED_READ_ONLY',
  owner_id:owner,shift_id:shift,continuity_root_id:'77777777-7777-4777-8777-777777777777',
  continuity_head_sha256:hash('9'),revision:2,read_only:true,
  execution_authorized:false,original_job_completed:false};
 const continuity={status:'FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING',owner_id:owner,
  shift_id:shift,continuity_head_sha256:guard.continuity_head_sha256,revision:2,
  original_job_completed:false,shared_continuity_guard:guard,
  canonical_continuity_handoff:{...guard,canonical_handoff_verified:true}};
 const input={graph:{...graph,jobs:graph.jobs.map(j=>j.source_ref===admitted.source_ref?
  {...j,source_proof_sha256:h.source_proof_sha256}:j)},plan:admitted,
  approval:{...p,canonical_review_handoff:h},continuity};
 const result=handoff(input);
 assert.equal(result.status,'CANONICAL_APPROVED_REVIEW_SCOPE_BOUND_CLAIM_REQUIRED');
 assert.equal(result.scope_count,5);
 assert.equal(result.canonical_claim_required,true);
 assert.equal(result.execution_authorized,false);
 assert.equal(result.original_job_completed,false);
 for(const drift of [{owner_id:shift},{source_head_sha:'0'.repeat(40)},{effect_type:'PUBLISH'},
  {execution_authorized:true},{scope_fingerprints:h.scope_fingerprints.slice(1)},
  {acceptance_contract_sha256:hash('0')},{owner_approval_receipt_sha256:null}]){
  assert.equal(handoff({...input,approval:{...input.approval,canonical_review_handoff:{...h,...drift}}}),null);
 }
 assert.equal(handoff({...input,continuity:{...continuity,revision:3}}),null);
 assert.equal(handoff({...input,approval:{...input.approval,owner_approval_expired:true}}),null);
 const routes=classify({graph:input.graph,staged,preflight:{...preflight,plans:[input.approval]},continuity});
 assert.equal(routes.routes[0].canonical_execution_handoff.status,result.status);
 assert.equal(routes.routes[1].canonical_execution_handoff,null);
});
