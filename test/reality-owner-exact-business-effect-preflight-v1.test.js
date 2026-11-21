import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {checkExactEffectReadback} from '../api/reality/personal-business-effect-authority-preflight.js';

const owner='11111111-1111-4111-8111-111111111111';
const shift='22222222-2222-4222-8222-222222222222';
const original='work:'+'b'.repeat(32);
const jobClass='customer_relations';
const effect='CUSTOMER_SEND';
const base={
 status:'OWNER_EXACT_BUSINESS_EFFECT_AUTHORITY_PREFLIGHT',
 owner_id:owner,shift_id:shift,original_work_id:original,
 source_ref:'connector:provider-id:source',job_class:jobClass,effect_type:effect,
 canonical_source_current:false,exact_business_shift_warrant_verified:false,
 independent_goal_acceptance_worldline_verified:false,
 consented_business_provider_verified:false,
 registered_executor_independently_verified:false,
 independent_final_original_already_present:false,
 ready_for_exact_effect_review:false,
 next_gate:'EXACT_BUSINESS_ORIGINAL_SHIFT_WARRANT_REQUIRED',
 itemized_approval_granted:false,execution_authorized:false,
 original_job_completed_by_read:false,new_shift_started:false,
 installation_authorized:false,production_changed:false,read_only:true
};
const check=(r)=>checkExactEffectReadback(r,owner,original,jobClass,effect);
test('read-only authority preflight preserves missing original and never auto-admits',()=>{
 const r=check({
  ...base,status:'EXACT_BUSINESS_EFFECT_ORIGINAL_NOT_ADMITTED',
  next_gate:'ADMIT_REAL_SOURCE_BACKED_ORIGINAL_WITH_OWNER_GOAL'
 });
 assert.equal(r.ready_for_exact_effect_review,false);
 assert.equal(r.execution_authorized,false);
});
test('existing maintenance warrant never grants general business effects',()=>{
 const r=check(base);
 assert.equal(r.exact_business_shift_warrant_verified,false);
 assert.equal(r.execution_authorized,false);
 assert.equal(r.itemized_approval_granted,false);
});
test('all positive proofs only permit exact effect REVIEW, not execution',()=>{
 const r=check({...base,
  canonical_source_current:true,exact_business_shift_warrant_verified:true,
  independent_goal_acceptance_worldline_verified:true,
  consented_business_provider_verified:true,
  registered_executor_independently_verified:true,
  ready_for_exact_effect_review:true,
  next_gate:'OWNER_MUST_REVIEW_EXACT_EFFECT_TARGET_PAYLOAD_AND_ONE_USE_AUTHORIZATION'
 });
 assert.equal(r.ready_for_exact_effect_review,true);
 assert.equal(r.execution_authorized,false);
 assert.equal(r.itemized_approval_granted,false);
});
test('reject guessed owner, forged approval, and false review readiness',()=>{
 assert.throws(()=>check({...base,owner_id:shift}),/RECEIPT_UNVERIFIED/);
 assert.throws(()=>check({...base,itemized_approval_granted:true}),/RECEIPT_UNVERIFIED/);
 assert.throws(()=>check({...base,execution_authorized:true}),/RECEIPT_UNVERIFIED/);
 assert.throws(()=>check({...base,ready_for_exact_effect_review:true}),/READY_WITHOUT/);
 assert.throws(()=>check({...base,production_changed:true}),/RECEIPT_UNVERIFIED/);
});
test('effect contract is source neutral, service-only and never mutates the existing job ledger',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261121235900_owner_exact_business_effect_preflight_v1.sql',import.meta.url),'utf8');
 assert.match(sql,/current_user<>'service_role'/);
 assert.match(sql,/revoke all on function public\.reality_read_owner_exact_business_effect_preflight_v1/);
 assert.match(sql,/grant execute on function public\.reality_read_owner_exact_business_effect_preflight_v1/);
 assert.match(sql,/governed_employee_original_claims_v1/);
 assert.match(sql,/governed_employee_completion_warrants_v1/);
 assert.match(sql,/owner_continuity_qualification_routes_v1/);
 assert.match(sql,/business_original_executor_contracts_v1/);
 assert.match(sql,/public\.universe_events/);
 assert.doesNotMatch(sql,/\b(insert into|update reality_internal|delete from|create table|alter table)\b/i);
});
