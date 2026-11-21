import test from 'node:test';
import assert from 'node:assert/strict';
import {
 CANONICAL_ORIGINAL_STAGES,projectOriginalAgainstCanonicalSpine,
 projectMultiOriginalCanonicalSpine
} from '../src/reality-canonical-original-work-spine-v1.js';

const owner='11111111-1111-4111-8111-111111111111';
const ref='reality:qualification:'+'a'.repeat(64);
const work='work:'+'b'.repeat(32);
function fixture(overrides={}){
 const item={
  continuity_ref:ref,source_ref:'supabase:reality_chat_messages:test',
  original_work_id:null,intake_family:'AUTHENTICATED_CHAT',
  acceptance_gate:'CANONICAL_ORIGINAL_ADMISSION_REQUIRED',
  qualified_evidence_for_governed_executor_preflight:false,
  independent_final_receipt_verified:false,
  exact_business_warrant_verified:false,
  owner_goal_acceptance_worldline_verified:false,
  execution_authorized_by_read:false,
  owner_approval_granted_by_read:false,new_shift_started:false,
  ...overrides
 };
 const preflight={
  status:'OWNER_MULTI_ORIGINAL_SHIFT_INDEPENDENT_PREFLIGHT',
  owner_id:owner,read_only:true,
  source_qualification_is_not_authority:true,
  current_shift_scope_is_not_general_business_permission:true,
  owner_approval_granted:false,model_execution_authorized:false,
  ready_to_start_multi_original_execution:false,
  production_changed:false,prioritized_source_preflight:[item]
 };
 return {preflight,item};
}
test('all eleven original stages use the unmodified canonical order',()=>{
 const {preflight,item}=fixture();
 const out=projectOriginalAgainstCanonicalSpine(preflight,item);
 assert.deepEqual(out.canonical_spine.map(s=>s.stage),CANONICAL_ORIGINAL_STAGES);
 assert.equal(out.original_work_id,null);
 assert.equal(out.next_governed_action,'EXACT_OWNER_ORIGINAL_ADMISSION_REQUIRED');
 assert.equal(out.canonical_spine[4].state,'ORIGINAL_ADMISSION_REQUIRED');
 assert.equal(out.canonical_spine[5].state,'EXACT_BUSINESS_WARRANT_AND_ITEMIZED_APPROVAL_REQUIRED');
 assert.equal(out.canonical_spine[7].state,'INDEPENDENT_ORIGINAL_ACCEPTANCE_REQUIRED');
 assert.equal(out.execution_authorized_by_projection,false);
 assert.equal(out.original_job_completed_by_projection,false);
});
test('verified source & warrant are not one-use effect authorization',()=>{
 const {preflight,item}=fixture({
  original_work_id:work,acceptance_gate:'CANONICAL_ORIGINAL_PRESENT_RECHECK_REGISTERED_EXECUTOR_AND_EFFECT_SCOPE',
  qualified_evidence_for_governed_executor_preflight:true,
  owner_goal_acceptance_worldline_verified:true,
  exact_business_warrant_verified:true
 });
 const out=projectOriginalAgainstCanonicalSpine(preflight,item);
 assert.equal(out.canonical_spine[4].state,'CANONICAL_SHIFT_ORIGINAL_QUALIFIED');
 assert.equal(out.canonical_spine[5].state,'BUSINESS_WARRANT_PRESENT_ITEMIZED_EFFECT_APPROVAL_REQUIRED');
 assert.equal(out.canonical_spine[6].state,'EXECUTOR_CLAIM_AND_EFFECT_EVIDENCE_NOT_PROVEN');
 assert.equal(out.next_governed_action,'VERIFY_INSTALLED_EXECUTOR_AND_EXACT_ITEMIZED_EFFECT_APPROVAL');
 assert.equal(out.execution_authorized_by_projection,false);
});
test('an independent original receipt does not manufacture verified learning',()=>{
 const {preflight,item}=fixture({
  original_work_id:work,qualified_evidence_for_governed_executor_preflight:true,
  owner_goal_acceptance_worldline_verified:true,exact_business_warrant_verified:true,
  independent_final_receipt_verified:true,
  acceptance_gate:'FINAL_OR_TERMINAL_SOURCE_NO_REPLAY'
 });
 const out=projectOriginalAgainstCanonicalSpine(preflight,item);
 assert.equal(out.canonical_spine[7].state,'INDEPENDENT_FINAL_RECEIPT_VERIFIED');
 assert.equal(out.canonical_spine[8].state,'INDEPENDENT_ORIGINAL_OUTCOME_RECORDED');
 assert.equal(out.canonical_spine[9].state,'VERIFIED_LEARNING_RECEIPT_NOT_PROVEN');
 assert.equal(out.original_job_completed_by_projection,false);
 assert.equal(out.next_governed_action,'INDEPENDENT_UNIVERSE_OUTCOME_AND_LEARNING_RECONCILIATION');
});
test('isolated original without original proof cannot pass the authority gate',()=>{
 const {preflight,item}=fixture({
  original_work_id:work,acceptance_gate:'EXACT_SHIFT_ORIGINAL_CLAIM_REQUIRED'
 });
 const [out]=projectMultiOriginalCanonicalSpine(preflight);
 assert.equal(out.canonical_spine[4].state,'ORIGINAL_RECORDED_NOT_EXECUTION_QUALIFIED');
 assert.equal(out.next_governed_action,'EXACT_SHIFT_ORIGINAL_CLAIM_REQUIRED');
});
test('reject orphan final receipts, claim-warrant contradictions and forged model approvals',()=>{
 let {preflight,item}=fixture({independent_final_receipt_verified:true});
 assert.throws(()=>projectOriginalAgainstCanonicalSpine(preflight,item),/ORPHAN_PROOF/);
 ({preflight,item}=fixture({original_work_id:work,
  qualified_evidence_for_governed_executor_preflight:true}));
 assert.throws(()=>projectOriginalAgainstCanonicalSpine(preflight,item),/CONTRADICTS_AUTHORITY/);
 ({preflight,item}=fixture({execution_authorized_by_read:true}));
 assert.throws(()=>projectOriginalAgainstCanonicalSpine(preflight,item),/SOURCE_SCOPE_INVALID/);
 ({preflight,item}=fixture());
 preflight.owner_approval_granted=true;
 assert.throws(()=>projectOriginalAgainstCanonicalSpine(preflight,item),/SOURCE_SCOPE_INVALID/);
});
test('no parallel job identifiers or fabricated original completions',()=>{
 const {preflight}=fixture();
 const [a]=projectMultiOriginalCanonicalSpine(preflight);
 assert.deepEqual(Object.keys(a).sort(),[
  'acceptance_gate','canonical_spine','continuity_ref',
  'execution_authorized_by_projection','installation_authorized',
  'new_shift_started','next_governed_action','original_final_receipt_observed',
  'original_job_completed_by_projection','original_work_id',
  'owner_approval_granted_by_projection','production_changed','source_ref'
 ].sort());
 assert.equal(a.original_work_id,null);
 assert.equal(a.production_changed,false);
});
