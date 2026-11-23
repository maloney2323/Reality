import test from 'node:test';
import assert from 'node:assert/strict';
import {readOwnerTimeHorizonEvidence}
 from '../api/reality/personal-time-horizon.js';
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
