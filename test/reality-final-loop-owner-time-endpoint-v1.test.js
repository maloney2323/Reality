import test from 'node:test';
import assert from 'node:assert/strict';
import {readOwnerTimeHorizonEvidence}
 from '../api/reality/personal-time-horizon.js';
import {projectFinalLoopOwnerReviewedRecoveryGuidance}
 from '../src/reality-final-loop-owner-time-bridge-v1.js';
const owner='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const shift='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const root='cccccccc-cccc-4ccc-cccc-cccccccccccc';
const sha=c=>'sha256:'+c.repeat(64);
const work='work:'+'1'.repeat(32);
const source='https://github.com/maloney2323/Reality/issues/301';
const moment=Date.parse('2026-11-22T22:01:00Z');
const shifts={status:'OWNER_SCOPED_EMPLOYEE_SHIFT_READBACK',
 work_installation_authorized_by_read:false,production_changed:false,
 verified_human_hours_saved:null,shifts:[{
  shift_id:shift,plan_fingerprint:sha('3'),
  status:'AWAITING_EXACT_ORIGINAL_WORK',planned_end_at:'infinity',
  steps:Array.from({length:8},(_,i)=>({
   step_index:i+1,state:'QUEUED',proof_sha256:null
  }))
 }]};
const past={status:'INDEPENDENT_FINAL_RECEIPT_READBACK',
 does_not_authorize_actions:true,receipts:[]};
const proof={
 schema:'reality-final-loop-canonical-proof-readback-v1',
 status:'FINAL_LOOP_FROZEN_SCOPE_VERIFIED_ORIGINAL_ACCEPTANCE_PENDING',
 owner_id:owner,shift_id:shift,plan_fingerprint:sha('3'),
 frozen_shift_scope_sha256:sha('4'),
 continuity_root_id:root,continuity_head_sha256:sha('5'),
 read_only:true,independent_owner_scope_verified:true,
 owner_acceptance_verified:false,acceptance_frozen:false,
 acceptance_contract_sha256:null,revision:1,
 observed_at:'2026-11-22T22:00:00Z',
 missing_proofs:[
  'FROZEN_CUSTOMER_ORIGINAL_ACCEPTANCE',
  'EXACT_ORIGINAL_EFFECT_AUTHORITY',
  'SCHEDULED_WORKER_CAPACITY_ATTESTATION',
  'INDEPENDENT_ORIGINAL_OUTCOME_AND_UNIVERSE_RECONCILIATION'
 ],
 original_job_completed:false,execution_authorized:false,
 installation_authorized:false,production_changed:false,
 jobs:[{source_ref:source,source_proof_sha256:sha('6'),
  source_step_index:2,source_phase:'SOURCE_ADMITTED',
  native_next_governed_action:'GENERATE_AND_TEST_ORIGINAL',
  original_work_id:work,independent_source_proof_verified:true,
  original_acceptance_verified:false,authority_proof_verified:false,
  capacity_proof_verified:false,final_outcome_verified:false,
  settlement_eligible:false,evidence_checkpoint_recorded_on_head:false
 }]
};
const api=async(db,name,args)=>{
 if(name==='reality_read_owner_final_receipts_v1')return past;
 if(name==='reality_read_owner_employee_shifts_v1')return shifts;
 if(name==='reality_read_owner_employee_discovery_v1')throw Error('NO_DISCOVERY');
 if(name==='reality_read_current_final_loop_proof_envelope_v1'){
  assert.deepEqual(args,{p_shift_id:shift});return proof;
 }
 throw Error('UNKNOWN_SOURCE');
};
test('default owner Past Present Future remains only three proven readbacks',async()=>{
 const calls=[];
 const r=await readOwnerTimeHorizonEvidence({ownerId:owner,db:{},now:moment,
  env:{VERCEL_ENV:'preview'},
  call:async(...args)=>{calls.push(args[1]);return api(...args)}});
 assert.equal(calls.length,3);
 assert.equal(r.past.status,'INDEPENDENT_HISTORY_VERIFIED');
 assert.equal(r.present.active_shift_count,1);
 assert.equal(r.future.status,'FUTURE_DISCOVERY_NOT_VERIFIED');
 assert.equal(r.final_loop_owner.status,'FINAL_LOOP_OWNER_TIME_VIEW_NOT_ENABLED');
 assert.equal(r.approved_new_work_by_read,false);
});
test('enabled preview reads one exact active owner shift with no new authority',async()=>{
 const calls=[];
 const r=await readOwnerTimeHorizonEvidence({ownerId:owner,db:{},now:moment,
  env:{VERCEL_ENV:'preview',REALITY_FINAL_LOOP_OWNER_TIME_VIEW_ENABLED:'true'},
  call:async(...args)=>{calls.push(args[1]);return api(...args)}});
 assert.equal(calls.length,4);
 assert.equal(r.final_loop_owner.status,
  'FINAL_LOOP_OWNER_TIME_AND_EXECUTIVE_EVIDENCE_READY');
 assert.equal(r.final_loop_owner.time_horizon.past.independently_verified_full_loop_receipts,0);
 assert.equal(r.final_loop_owner.executive.priority_count,1);
 assert.equal(r.final_loop_owner.executive.primary_attention.engine_decision,'REFRESH');
 assert.equal(r.final_loop_owner.external_execution_authorized,false);
 assert.equal(r.new_jobs_created_by_read,0);
});
test('missing canonical proof reader leaves three original time horizons intact',async()=>{
 const r=await readOwnerTimeHorizonEvidence({ownerId:owner,db:{},now:moment,
  env:{VERCEL_ENV:'preview',REALITY_FINAL_LOOP_OWNER_TIME_VIEW_ENABLED:'true'},
  call:async(...args)=>{
   if(args[1]==='reality_read_current_final_loop_proof_envelope_v1')
    throw Error('RPC_NOT_DEPLOYED');
   return api(...args);
  }});
 assert.equal(r.past.status,'INDEPENDENT_HISTORY_VERIFIED');
 assert.equal(r.present.active_shift_count,1);
 assert.equal(r.final_loop_owner.status,
  'FINAL_LOOP_CANONICAL_PROOF_READER_NOT_INSTALLED_OR_UNAVAILABLE');
 assert.equal(r.final_loop_owner.executive,null);
});
test('cross-owner canonical proof cannot appear as owner executive priority',async()=>{
 const r=await readOwnerTimeHorizonEvidence({ownerId:owner,db:{},now:moment,
  env:{VERCEL_ENV:'preview',REALITY_FINAL_LOOP_OWNER_TIME_VIEW_ENABLED:'true'},
  call:async(...args)=>args[1]==='reality_read_current_final_loop_proof_envelope_v1'?
   {...proof,owner_id:root}:api(...args)});
 assert.equal(r.final_loop_owner.owner_scope_verified,false);
 assert.equal(r.final_loop_owner.executive,null);
 assert.equal(r.approved_new_work_by_read,false);
});

test('owner Present/CEO can read pinned proposed scopes without making Future executable',async()=>{
 const pr='https://github.com/maloney2323/Reality/pull/307';
 const p={...proof,jobs:[{...proof.jobs[0],source_ref:pr,
  source_phase:'BLOCKED',
  native_next_governed_action:'READ_CURRENT_PR_REVIEW_PROVIDER_EFFECT'}]};
 const env={VERCEL_ENV:'preview',
  REALITY_FINAL_LOOP_OWNER_TIME_VIEW_ENABLED:'true',
  REALITY_FINAL_LOOP_PR_SOURCE_PLAN_OWNER_VIEW_ENABLED:'true'};
 const calls=[];
 const r=await readOwnerTimeHorizonEvidence({ownerId:owner,db:{},now:moment,env,
  call:async(_db,name,args)=>{
   calls.push(name);
   if(name==='reality_read_current_final_loop_proof_envelope_v1')return p;
   if(name==='reality_read_final_loop_pr_source_plans_v1')return {
    schema:'reality-final-loop-pr-source-plans-readback-v1',
    status:'FINAL_LOOP_PROPOSED_SOURCE_PLANS_NOT_EXECUTABLE',
    owner_id:owner,shift_id:shift,plan_fingerprint:sha('3'),
    read_only:true,execution_authorized:false,
    original_job_completed:false,child_originals_admitted:0,
    plans:[{source_ref:pr,parent_original_work_id:work,
     source_manifest_sha256:sha('7'),source_head_sha:'8'.repeat(40),
     file_count:34,proposed_scope_count:5,
     state:'PROPOSED_SOURCE_PLAN_AWAITING_INDEPENDENT_ADMISSION',
     independent_source_review_verified:false,
     owner_acceptance_verified:false,child_originals_admitted:0}]
   };
   return api(_db,name,args);
  }});
 assert.equal(calls.length,5);
 assert.equal(r.final_loop_owner.status,
  'FINAL_LOOP_OWNER_TIME_AND_EXECUTIVE_EVIDENCE_READY');
 assert.equal(r.final_loop_source_plans.status,
  'FINAL_LOOP_SAME_OWNER_PENDING_SOURCE_PLANS_VERIFIED_READ_ONLY');
 assert.equal(r.final_loop_source_plans.plans[0].proposed_scope_count,5);
 assert.equal(r.final_loop_owner.executive.execution_authorized,false);
 assert.equal(r.final_loop_owner.time_horizon.future.automatically_authorized_jobs,0);
 assert.equal(r.new_jobs_created_by_read,0);
});
test('foreign or falsely authorized source-plan readback is not accepted by owner UI',async()=>{
 const pr='https://github.com/maloney2323/Reality/pull/307';
 const p={...proof,jobs:[{...proof.jobs[0],source_ref:pr}]};
 const env={VERCEL_ENV:'preview',
  REALITY_FINAL_LOOP_OWNER_TIME_VIEW_ENABLED:'true',
  REALITY_FINAL_LOOP_PR_SOURCE_PLAN_OWNER_VIEW_ENABLED:'true'};
 for(const bad of [
  {owner_id:root,execution_authorized:false},
  {owner_id:owner,execution_authorized:true}
 ]){
  const r=await readOwnerTimeHorizonEvidence({ownerId:owner,db:{},now:moment,env,
   call:async(_db,name,args)=>{
    if(name==='reality_read_current_final_loop_proof_envelope_v1')return p;
    if(name==='reality_read_final_loop_pr_source_plans_v1')return {
     schema:'reality-final-loop-pr-source-plans-readback-v1',
     status:'FINAL_LOOP_PROPOSED_SOURCE_PLANS_NOT_EXECUTABLE',
     owner_id:bad.owner_id,shift_id:shift,plan_fingerprint:sha('3'),
     read_only:true,execution_authorized:bad.execution_authorized,
     original_job_completed:false,child_originals_admitted:0,plans:[]
    };
    return api(_db,name,args);
   }});
  assert.equal(r.final_loop_source_plans.owner_scope_verified,false);
  assert.equal(r.final_loop_source_plans.status,
   'FINAL_LOOP_SOURCE_PLAN_OWNER_VIEW_NOT_ENABLED');
  assert.equal(r.final_loop_owner.external_execution_authorized,false);
 }
});


test('independent native+Universe parent outcome projects verified Past and unfinished Present without executing',async()=>{
 const env={VERCEL_ENV:'preview',
  REALITY_FINAL_LOOP_PARENT_OUTCOME_OWNER_VIEW_ENABLED:'true'};
 const sourceRef='https://github.com/maloney2323/Reality/pull/307';
 const receipt='33333333-3333-4333-8333-333333333333';
 const universe='44444444-4444-4444-8444-444444444444';
 const rows=[
  {original_work_id:work,source_ref:sourceRef,
   source_manifest_sha256:sha('a'),status:'INDEPENDENTLY_SETTLED_UNIVERSE_PAST',
   delivery_phase:'SETTLED',original_job_completed:true,
   independent_universe_verified:true,
   verified_provider_comment_url:sourceRef+'#issuecomment-9988',
   verified_universe_outcome_event_id:universe,
   parent_settlement_receipt_id:receipt},
  {original_work_id:'work:'+'2'.repeat(32),
   source_ref:'https://github.com/maloney2323/Reality/pull/308',
   source_manifest_sha256:sha('b'),status:'PARENT_DELIVERY_UNFINISHED_PRESENT',
   delivery_phase:'AWAITING_EXACT_PUBLICATION_APPROVAL',
   original_job_completed:false,independent_universe_verified:false,
   verified_provider_comment_url:null,
   verified_universe_outcome_event_id:null}
 ];
 const calls=[];
 const r=await readOwnerTimeHorizonEvidence({ownerId:owner,db:{},now:moment,env,
  call:async(_db,name,args)=>{
   calls.push(name);
   if(name==='reality_read_owner_final_loop_parent_outcomes_v1'){
    assert.deepEqual(args,{p_owner_id:owner,p_shift_id:shift});
    return {status:'FINAL_LOOP_OWNER_PARENT_OUTCOMES_READ_ONLY',
     owner_id:owner,shift_id:shift,read_only:true,
     owner_scope_verified:true,execution_authorized:false,
     shift_completed_by_read:false,outcomes:rows,
     parent_delivery_count:2,verified_parent_count:1,
     unfinished_parent_count:1};
   }
   return api(_db,name,args);
  }});
 assert.equal(calls.length,4);
 assert.equal(r.final_loop_parent_outcomes.status,
  'FINAL_LOOP_SAME_OWNER_PARENT_OUTCOMES_INDEPENDENTLY_READ');
 assert.equal(r.final_loop_parent_outcomes.verified_parent_count,1);
 assert.equal(r.final_loop_parent_outcomes.unfinished_parent_count,1);
 assert.equal(r.past.status,'INDEPENDENT_HISTORY_VERIFIED');
 assert.equal(r.present.active_shift_count,1);
 assert.equal(r.approved_new_work_by_read,false);
 assert.equal(r.new_jobs_created_by_read,0);
});

test('cross-owner, missing settlement evidence or invented counts never appear as Past',async()=>{
 const sourceRef='https://github.com/maloney2323/Reality/pull/307';
 for(const mutation of [
  {owner_id:root},
  {verified_parent_count:2},
  {execution_authorized:true},
  {outcomes:[{original_work_id:work,source_ref:sourceRef,
    source_manifest_sha256:sha('a'),
    status:'INDEPENDENTLY_SETTLED_UNIVERSE_PAST',
    original_job_completed:true,independent_universe_verified:true,
    verified_provider_comment_url:null,
    verified_universe_outcome_event_id:null}]}
 ]){
  const base={status:'FINAL_LOOP_OWNER_PARENT_OUTCOMES_READ_ONLY',
   owner_id:owner,shift_id:shift,read_only:true,
   owner_scope_verified:true,execution_authorized:false,
   shift_completed_by_read:false,outcomes:[],
   parent_delivery_count:0,verified_parent_count:0,
   unfinished_parent_count:0};
  const value={...base,...mutation};
  if(mutation.outcomes){
   value.parent_delivery_count=1;value.verified_parent_count=1;
   value.unfinished_parent_count=0;
  }
  const r=await readOwnerTimeHorizonEvidence({
   ownerId:owner,db:{},now:moment,
   env:{VERCEL_ENV:'preview',
    REALITY_FINAL_LOOP_PARENT_OUTCOME_OWNER_VIEW_ENABLED:'true'},
   call:async(_db,name,args)=>{
    if(name==='reality_read_owner_final_loop_parent_outcomes_v1')
     return value;
    return api(_db,name,args);
   }});
  assert.equal(r.final_loop_parent_outcomes.owner_scope_verified,false);
  assert.equal(r.final_loop_parent_outcomes.verified_parent_count,null);
  assert.equal(r.approved_new_work_by_read,false);
 }
});


// An independently reviewed recovery and a source-backed pending original
// feed a single owner-scoped read-only Past/Present/Future/CEO projection.
// The owner must still approve the actual effect; history is not settlement.
test('reviewed recovery informs owner past present future CEO without authorizing execution',()=>{
 const pr='https://github.com/maloney2323/Reality/pull/307';
 const planId='33333333-3333-4333-8333-333333333333';
 const incident='44444444-4444-4444-8444-444444444444';
 const baseView={
  status:'FINAL_LOOP_OWNER_TIME_AND_EXECUTIVE_EVIDENCE_READY',
  owner_scope_verified:true,owner_id:owner,shift_id:shift,
  continuity_head_sha256:sha('9'),original_job_completed:false,
  external_execution_authorized:false
 };
 const sourcePlans={
  status:'FINAL_LOOP_SAME_OWNER_PENDING_SOURCE_PLANS_VERIFIED_READ_ONLY',
  owner_id:owner,shift_id:shift,owner_scope_verified:true,read_only:true,
  plans:[{plan_id:planId,source_ref:pr,parent_original_work_id:work,
   source_manifest_sha256:sha('7'),parent_source_phase:'BLOCKED',
   state:'PROPOSED_SOURCE_PLAN_AWAITING_INDEPENDENT_ADMISSION'}]
 };
 const preflight={
  status:'FINAL_LOOP_CHILD_GOAL_ACCEPTANCE_PREFLIGHT_READ_ONLY',
  owner_id:owner,shift_id:shift,read_only:true,
  execution_authorized:false,
  plans:[{plan_id:planId,source_ref:pr,parent_original_work_id:work,
   source_manifest_sha256:sha('7'),acceptance_contract_sha256:sha('8'),
   verified_signed_source_goal_contract_prepared:true,
   pending_exact_owner_approval:true,independent_goal_acceptance_verified:false}]
 };
 const actions={
  status:'OWNER_SIGNED_SHIFT_RECOVERY_ACTIONS_READ_ONLY',
  owner_id:owner,owner_scope_verified:true,read_only:true,
  items:[{incident_id:incident,shift_id:shift,
   kind:'SIGNED_SHIFT_REPEATED_NO_PROGRESS',
   action_independently_rechecked:true,
   action_receipt_sha256:sha('1'),
   independent_review_receipt_sha256:sha('2'),
   owner_next_action:'EXACT_OWNER_SOURCE_SCOPE_AND_ITEMIZED_BUSINESS_WARRANT_REQUIRED_IN_CHAT',
   original_job_completed:false,installation_authorized:false,
   production_changed:false}]
 };
 const g=projectFinalLoopOwnerReviewedRecoveryGuidance({
  ownerView:baseView,sourcePlans,preflight,recoveryActions:actions,
  ownerPackets:{status:'FINAL_LOOP_OWNER_EXACT_CHILD_APPROVALS_READ_ONLY',
   owner_id:owner,shift_id:shift,read_only:true,packets:[]}
 });
 assert.equal(g.status,'FINAL_LOOP_OWNER_CANONICAL_RECOVERY_GUIDANCE_READY');
 assert.equal(g.continuity_head_sha256,sha('9'));
 assert.equal(g.original_work_id,work);
 assert.equal(g.past.reviewed_recovery_is_not_original_settlement,true);
 assert.equal(g.present.original_settled,false);
 assert.equal(g.future.next_governed_action,
  'PREPARE_EXACT_SOURCE_BOUND_OWNER_APPROVAL_PACKET');
 assert.equal(g.ceo.required_next_action,g.future.next_governed_action);
 assert.equal(g.ceo.autonomous_authority_granted,false);
 assert.equal(g.action_dispatched,false);
 assert.equal(g.original_job_completed,false);
 const foreign=projectFinalLoopOwnerReviewedRecoveryGuidance({
  ownerView:{...baseView,owner_id:root},
  sourcePlans,preflight,recoveryActions:actions});
 assert.notEqual(foreign.status,'FINAL_LOOP_OWNER_CANONICAL_RECOVERY_GUIDANCE_READY');
 assert.equal(foreign.authority_granted,false);
});


test('owner endpoint carries the same independently reviewed recovery to Past Present Future CEO',async()=>{
 const pr='https://github.com/maloney2323/Reality/pull/307';
 const planId='55555555-5555-4555-8555-555555555555';
 const env={VERCEL_ENV:'preview',
  REALITY_FINAL_LOOP_OWNER_TIME_VIEW_ENABLED:'true',
  REALITY_FINAL_LOOP_PR_SOURCE_PLAN_OWNER_VIEW_ENABLED:'true',
  REALITY_FINAL_LOOP_RECOVERY_OWNER_GUIDANCE_ENABLED:'true'};
 const liveProof={...proof,jobs:[{...proof.jobs[0],source_ref:pr,
  source_phase:'BLOCKED',
  native_next_governed_action:'READ_CURRENT_PR_REVIEW_PROVIDER_EFFECT'}]};
 const sourcePlan={plan_id:planId,source_ref:pr,
  parent_original_work_id:work,source_manifest_sha256:sha('7'),
  source_head_sha:'8'.repeat(40),file_count:34,proposed_scope_count:5,
  parent_source_phase:'BLOCKED',
  state:'PROPOSED_SOURCE_PLAN_AWAITING_INDEPENDENT_ADMISSION',
  independent_source_review_verified:false,
  owner_acceptance_verified:false,child_originals_admitted:0};
 const calls=[];
 const got=await readOwnerTimeHorizonEvidence({ownerId:owner,db:{},
  now:moment,env,call:async(_db,name,args)=>{
   calls.push(name);
   if(name==='reality_read_current_final_loop_proof_envelope_v1')
    return liveProof;
   if(name==='reality_read_final_loop_pr_source_plans_v1')
    return {schema:'reality-final-loop-pr-source-plans-readback-v1',
     status:'FINAL_LOOP_PROPOSED_SOURCE_PLANS_NOT_EXECUTABLE',
     owner_id:owner,shift_id:shift,plan_fingerprint:sha('3'),
     read_only:true,execution_authorized:false,
     original_job_completed:false,child_originals_admitted:0,
     plans:[sourcePlan]};
   if(name==='reality_read_final_loop_child_approval_preflight_v1')
    return {status:'FINAL_LOOP_CHILD_GOAL_ACCEPTANCE_PREFLIGHT_READ_ONLY',
     owner_id:owner,shift_id:shift,read_only:true,
     execution_authorized:false,plans:[{
      plan_id:planId,source_ref:pr,parent_original_work_id:work,
      source_manifest_sha256:sha('7'),
      acceptance_contract_sha256:sha('8'),
      verified_signed_source_goal_contract_prepared:true,
      independent_goal_acceptance_verified:false,
      pending_exact_owner_approval:true}]};
   if(name==='reality_read_owner_signed_shift_recovery_actions_v1')
    return {status:'OWNER_SIGNED_SHIFT_RECOVERY_ACTIONS_READ_ONLY',
     owner_id:owner,owner_scope_verified:true,read_only:true,
     items:[{incident_id:'66666666-6666-4666-8666-666666666666',
      shift_id:shift,kind:'SIGNED_SHIFT_REPEATED_NO_PROGRESS',
      action_independently_rechecked:true,
      action_receipt_sha256:sha('1'),
      independent_review_receipt_sha256:sha('2'),
      owner_next_action:'EXACT_OWNER_SOURCE_SCOPE_AND_ITEMIZED_BUSINESS_WARRANT_REQUIRED_IN_CHAT',
      original_job_completed:false,installation_authorized:false,
      production_changed:false}]};
   if(name==='reality_read_owner_final_loop_child_approvals_v1')
    return {status:'FINAL_LOOP_OWNER_EXACT_CHILD_APPROVALS_READ_ONLY',
     owner_id:owner,shift_id:shift,read_only:true,packets:[]};
   return api(_db,name,args);
  }});
 assert.equal(calls.length,8);
 assert.equal(got.final_loop_recovery_guidance.status,
  'FINAL_LOOP_OWNER_CANONICAL_RECOVERY_GUIDANCE_READY');
 assert.equal(got.final_loop_owner.recovery_guidance.original_work_id,work);
 assert.equal(got.final_loop_owner.recovery_guidance.continuity_head_sha256,
  got.final_loop_owner.continuity_head_sha256);
 assert.equal(got.final_loop_recovery_guidance.ceo.required_next_action,
  'PREPARE_EXACT_SOURCE_BOUND_OWNER_APPROVAL_PACKET');
 assert.equal(got.final_loop_owner.time_horizon.future.automatically_authorized_jobs,0);
 assert.equal(got.past.status,'INDEPENDENT_HISTORY_VERIFIED');
 assert.equal(got.approved_new_work_by_read,false);
 assert.equal(got.final_loop_recovery_guidance.recovery_verified,false);
});


test('owner PPF CEO surfaces the same-original engineering business warrant without executing',async()=>{
 const pr='https://github.com/maloney2323/Reality/pull/307';
 const env={VERCEL_ENV:'preview',
  REALITY_FINAL_LOOP_OWNER_TIME_VIEW_ENABLED:'true',
  REALITY_FINAL_LOOP_GOVERNED_ENGINEERING_VIEW_ENABLED:'true'};
 const p={...proof,jobs:[{...proof.jobs[0],source_ref:pr,source_phase:'BLOCKED',
  native_next_governed_action:'READ_CURRENT_PR_REVIEW_PROVIDER_EFFECT'}]};
 const calls=[];
 const r=await readOwnerTimeHorizonEvidence({ownerId:owner,db:{},now:moment,env,
  call:async(_db,name,args)=>{
   calls.push(name);
   if(name==='reality_read_current_final_loop_proof_envelope_v1')return p;
   if(name==='reality_read_same_original_postmaintenance_gate_v1'){
    assert.deepEqual(args,{p_shift_id:shift});
    return {status:'EXISTING_ORIGINAL_AUTHORIZED_INTERNAL_MAINTENANCE',
     read_only:true,owner_id:owner,shift_id:shift,source_ref:pr,
     original_work_id:work,
     existing_maintenance_id:'33333333-3333-4333-8333-333333333333',
     original_job_completed:false,installation_authorized:false,
     production_changed:false,independent_final_receipt_verified:false,
     canonical_owner_business_original_missing:true,
     next_action:'VERIFY_CANONICAL_OWNER_BUSINESS_WORK_LINEAGE_BEFORE_CI'};
   }
   return api(_db,name,args);
  }});
 assert.equal(calls.length,5);
 assert.equal(r.final_loop_governed_engineering.status,
  'ENGINEERING_EXACT_BUSINESS_ORIGINAL_WARRANT_REQUIRED');
 assert.equal(r.final_loop_governed_engineering.original_work_id,work);
 assert.equal(r.final_loop_owner.governed_engineering.continuity_head_sha256,
  r.final_loop_owner.continuity_head_sha256);
 assert.equal(r.final_loop_governed_engineering.next_governed_action,
  'VERIFY_CANONICAL_OWNER_BUSINESS_WORK_LINEAGE_BEFORE_CI');
 assert.equal(r.final_loop_governed_engineering.original_job_completed,false);
 assert.equal(r.final_loop_governed_engineering.engineering_handler_dispatch_authorized,false);
 assert.equal(r.approved_new_work_by_read,false);
 assert.equal(r.new_jobs_created_by_read,0);
});
