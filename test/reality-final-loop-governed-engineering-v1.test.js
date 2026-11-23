import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectFinalLoopGovernedEngineering as inspect}
 from '../src/reality-final-loop-governed-engineering-v1.js';
const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const shift='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const root='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const maintenance='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const work='work:'+'1'.repeat(32);
const sha=c=>'sha256:'+c.repeat(64);
const source='https://github.com/maloney2323/Reality/pull/307';
const other='https://github.com/maloney2323/Reality/pull/308';
const canonicalView={
 status:'FINAL_LOOP_ORIGINAL_GOAL_ACCEPTANCE_PENDING',
 owner_id:owner,shift_id:shift,original_job_completed:false,
 continuity_head_sha256:sha('1'),
 canonical_continuity_handoff:{
  status:'CANONICAL_HANDOFF_CARRIED_WITH_UNFINISHED_PROOFS',
  canonical_handoff_verified:true,read_only:true,
  continuity_root_id:root,continuity_head_sha256:sha('1'),
  original_job_completed:false,revision:2
 },
 time_horizon:{
  present:{owner_id:owner,shift_id:shift,
   obligations:[{original_work_id:work,source_ref:source,
    action_executed:false,settlement_committed:false}]}
 }
};
const maintenanceGate={
 status:'EXISTING_ORIGINAL_AUTHORIZED_INTERNAL_MAINTENANCE',
 owner_id:owner,shift_id:shift,read_only:true,
 existing_maintenance_id:maintenance,
 original_work_id:work,source_ref:source,
 original_job_completed:false,installation_authorized:false,
 independent_final_receipt_verified:false,production_changed:false,
 canonical_owner_business_original_missing:true,
 next_action:'VERIFY_CANONICAL_OWNER_BUSINESS_WORK_LINEAGE_BEFORE_CI'
};
const modelCandidate={
 status:'SIGNED_MAINTENANCE_REPAIR_CODE_CANDIDATE_RECORDED',
 maintenance_id:maintenance,
 owner_id:owner,shift_id:shift,original_work_id:work,source_ref:source,
 candidate_receipt_sha256:sha('2'),model_generated:true,
 independent_frozen_red_verified:false,independent_ci_verified:false,
 original_job_completed:false,installation_authorized:false,
 production_changed:false
};
const caseCi={
 status:'EXACT_SIGNED_MAINTENANCE_SOURCE_CI_RED_GREEN_INDEPENDENTLY_ATTESTED',
 shift_id:shift,maintenance_id:maintenance,
 case_specific_ci_receipt_sha256:sha('3'),
 case_specific_frozen_red_attested:true,
 code_regression_green_verified:true,repair_installed:false,
 original_job_completed:false,installation_authorized:false
};
test('PR307 draft cannot bypass missing canonical business warrant or frozen RED',()=>{
 const r=inspect({canonicalView,maintenanceGate,modelCandidate,caseCi});
 assert.equal(r.status,'ENGINEERING_EXACT_BUSINESS_ORIGINAL_WARRANT_REQUIRED');
 assert.equal(r.next_governed_action,
  'VERIFY_CANONICAL_OWNER_BUSINESS_WORK_LINEAGE_BEFORE_CI');
 assert.equal(r.original_work_id,work);
 assert.equal(r.continuity_head_sha256,sha('1'));
 assert.equal(r.engineering_handler_dispatch_authorized,false);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.owner_approval_granted,false);
});
test('once business lineage is verified, stage exact case CI but do not self-test model code',()=>{
 const gate={...maintenanceGate,canonical_owner_business_original_missing:false};
 const r=inspect({canonicalView,maintenanceGate:gate,modelCandidate,
  releaseLane:{operating_lane:'NORMAL_SIGNED_SHIFT',status:'RUNNING'}});
 assert.equal(r.status,'ENGINEERING_INDEPENDENT_FROZEN_RED_STILL_REQUIRED');
 assert.equal(r.model_candidate_status,'SOURCE_CANDIDATE_DURABLY_RECORDED_NOT_TESTED');
 assert.equal(r.next_registered_handler,
  'RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED');
 assert.equal(r.handler_claim_must_reverify_exact_warrant,true);
 assert.equal(r.frozen_case_red_independently_verified,false);
 assert.equal(r.engineering_handler_dispatch_authorized,false);
 const staged=inspect({canonicalView,maintenanceGate:gate,
  releaseLane:{operating_lane:'STAGING_ONLY',status:'SOURCE_STAGING_ONLY'}});
 assert.equal(staged.registered_engineering_execution_not_permitted,true);
});
test('independent CI of this EXACT maintenance is evidence not final installation',()=>{
 const gate={...maintenanceGate,canonical_owner_business_original_missing:false};
 const r=inspect({canonicalView,maintenanceGate:gate,modelCandidate,caseCi});
 assert.equal(r.status,'ENGINEERING_CASE_CI_VERIFIED_ORIGINAL_STILL_OPEN');
 assert.equal(r.case_ci_receipt_sha256,sha('3'));
 assert.equal(r.frozen_case_red_independently_verified,true);
 assert.equal(r.next_governed_action,
  'INDEPENDENTLY_VERIFY_CANDIDATE_FIX_AND_REQUEST_EXACT_INSTALL_APPROVAL');
 assert.equal(r.candidate_is_not_verified_repair,true);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.installation_authorized,false);
});
test('CI for a DIFFERENT PR, and model drafts of another maintenance, never settle original',()=>{
 const gate={...maintenanceGate,canonical_owner_business_original_missing:false};
 const unrelated={...caseCi,maintenance_id:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'};
 const r=inspect({canonicalView,maintenanceGate:gate,caseCi:unrelated});
 assert.equal(r.status,'ENGINEERING_INDEPENDENT_FROZEN_RED_STILL_REQUIRED');
 assert.equal(r.frozen_case_red_independently_verified,false);
 const off=inspect({canonicalView,maintenanceGate:gate,
  modelCandidate:{...modelCandidate,maintenance_id:unrelated.maintenance_id}});
 assert.equal(off.status,'ENGINEERING_MODEL_CANDIDATE_IS_DIFFERENT_MAINTENANCE');
 assert.equal(off.original_job_completed,false);
 const forged=inspect({canonicalView,maintenanceGate:gate,
  modelCandidate:{...modelCandidate,source_ref:other}});
 assert.equal(forged.status,'ENGINEERING_GENERATED_CANDIDATE_RECEIPT_UNVERIFIED');
});
test('cross-owner, cross-original and canonical head drift fail closed',()=>{
 const bad=[
  {canonicalView:{...canonicalView,continuity_head_sha256:sha('9')}},
  {maintenanceGate:{...maintenanceGate,owner_id:root}},
  {maintenanceGate:{...maintenanceGate,source_ref:other}},
  {maintenanceGate:{...maintenanceGate,original_job_completed:true}},
  {canonicalView:{...canonicalView,original_job_completed:true}},
 ];
 for(const x of bad){
  const r=inspect({canonicalView,maintenanceGate,...x});
  assert.notEqual(r.status,'ENGINEERING_EXACT_BUSINESS_ORIGINAL_WARRANT_REQUIRED');
  assert.equal(r.original_job_completed,false);
  assert.equal(r.engineering_handler_dispatch_authorized,false);
 }
});
test('signed worker consumes real coding outcomes and reports staging-only stop without creating another agent',()=>{
 const s=readFileSync(new URL(
  '../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.match(s,/inspectFinalLoopGovernedEngineering/);
 assert.match(s,/modelCandidate:signedMaintenanceRepairModelCandidate/);
 assert.match(s,/caseCi:signedMaintenanceCaseCiReconciliation/);
 assert.match(s,/maintenanceGate:sameOriginalPostmaintenanceGate/);
 assert.match(s,/final_loop_governed_engineering:finalLoopGovernedEngineering/);
 assert.match(s,/ENGINEERING_SIGNED_CODING_WORKER_NOT_REACHED_STAGING_ONLY/);
 assert.doesNotMatch(s,/model_approves_own_install:true/);
});
