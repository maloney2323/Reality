import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyRealityGovernedContinuityEvidence as classify}
 from '../src/reality-governed-continuity-evidence-classifier-v1.js';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const shift='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const m307='b7181e5b-a01c-4cb2-b191-10dea9dbe04f';
const m308='05d1e1a9-8f9e-43a5-94ba-acd367cc2611';
const h='sha256:'+'a'.repeat(64);
const c='sha256:'+'b'.repeat(64);
const pr307='https://github.com/maloney2323/Reality/pull/307';
const pr308='https://github.com/maloney2323/Reality/pull/308';
const originalGate={
 status:'EXISTING_ORIGINAL_AUTHORIZED_INTERNAL_MAINTENANCE',
 owner_id:owner,shift_id:shift,read_only:true,
 warrant_mode:'UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS',
 source_ref:pr307,original_work_id:'work:315562fe1bd66b30a48bb9be4f1d162a',
 existing_maintenance_id:m307,
 next_action:'VERIFY_CANONICAL_OWNER_BUSINESS_WORK_LINEAGE_BEFORE_CI',
 canonical_owner_business_original_missing:true,
 case_specific_maintenance_ci_red_attested:false,
 original_job_completed:false,independent_final_receipt_verified:false,
 installation_authorized:false,new_job_created:false,production_changed:false,
 signed_external_review_receipt_sha256:h,
 scoped_maintenance_case_ci_receipts:[{
  source_ref:pr308,maintenance_id:m308,
  case_specific_ci_receipt_sha256:c,frozen_source_red_verified:true,
  corrected_code_green_verified:true,repair_installed:false,
  original_job_completed:false
 }]
};
const artifact={
 maintenance_id:m308,shift_id:shift,source_ref:pr308,
 case_ci_receipt_sha256:c,review_receipt_sha256:h,
 github_artifact_digest:h,github_run_id:44786999190,
 github_artifact_id:14654462891,
 candidate_commit_sha:'60cf616c4fd6453aac3efea65290cfc9d8135446',
 candidate_source_blob_sha:'eb380af12a58daf229e30cf446c52754e3f10008',
 install_target_verified:false,owner_approval_ready:false,
 installation_authorized:false,repair_installed:false,
 original_job_completed:false
};
const readback={status:'OWNER_VERIFIED_MAINTENANCE_ARTIFACTS_READ_ONLY',
 owner_id:owner,count:1,items:[artifact],
 installation_authorized:false,production_changed:false};
function call(g=originalGate,a=readback){
 return classify({ownerId:owner,shiftId:shift,
  originalGate:g,artifactReadback:a});
}
test('Reality separates independently verified repair from non-admitted business original',()=>{
 const r=call();
 assert.equal(r.status,'GOVERNED_CONTINUITY_EVIDENCE_SEPARATED_AND_ROUTED');
 assert.equal(r.lane_count,2);
 assert.deepEqual(r.lanes.map(x=>x.lane_kind),
  ['INTERNAL_CAPABILITY_REPAIR','CANONICAL_BUSINESS_ORIGINAL']);
 assert.equal(r.lanes[0].maintenance_id,m308);
 assert.equal(r.lanes[0].verified_fact,'EXACT_SOURCE_REPAIR_ARTIFACT_IN_LEDGER');
 assert.equal(r.lanes[0].next_governed_action,
  'INDEPENDENT_INSTALL_TARGET_AND_OWNER_APPROVAL_REVIEW_REQUIRED');
 assert.equal(r.lanes[1].maintenance_id,m307);
 assert.equal(r.lanes[1].original_work_id,originalGate.original_work_id);
 assert.equal(r.lanes[1].next_governed_action,
  'VERIFY_CANONICAL_OWNER_BUSINESS_WORK_LINEAGE_BEFORE_CI');
 assert.equal(r.lanes[1].original_customer_execution_verified,false);
 for(const key of ['classifier_grants_authority','ledger_mutated',
   'universe_state_mutated','installation_authorized','repair_installed',
   'original_job_completed','production_changed','new_shift_started'])
  assert.equal(r[key],false);
 assert.equal(Object.isFrozen(r),true);
 assert.equal(Object.isFrozen(r.lanes),true);
 assert.equal(Object.isFrozen(r.lanes[0]),true);
});
test('Reality refuses to turn a forged approval or installed flag into a classified repair',()=>{
 for(const d of [{installation_authorized:true},{owner_approval_ready:true},
  {repair_installed:true},{original_job_completed:true},
  {install_target_verified:true},{source_ref:pr307},
  {case_ci_receipt_sha256:h},{github_artifact_id:0}]){
  const r=call(originalGate,{...readback,items:[{...artifact,...d}]});
  assert.equal(r.lanes.some(x=>x.lane_kind==='INTERNAL_CAPABILITY_REPAIR'),false);
  assert.ok(r.classifier_notes.includes('ARTIFACT_CROSS_LEDGER_LINEAGE_OR_AUTHORITY_CONFLICT'));
  assert.equal(r.original_job_completed,false);
 }
});
test('source evidence is not customer execution even when artifact provider is unavailable',()=>{
 const r=call(originalGate,{status:'ARTIFACT_PROVIDER_DOWN'});
 assert.equal(r.lane_count,1);
 assert.equal(r.lanes[0].lane_kind,'CANONICAL_BUSINESS_ORIGINAL');
 assert.equal(r.lanes[0].execution_permitted_by_classification,false);
 assert.equal(r.status,'GOVERNED_CONTINUITY_PARTIAL_EVIDENCE_CLASSIFIED');
});
test('foreign owner, stale shift or forged independently completed original are rejected',()=>{
 for(const changed of [{owner_id:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'},
  {shift_id:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'},
  {original_job_completed:true},{independent_final_receipt_verified:true},
  {installation_authorized:true},{production_changed:true}]){
  const r=call({...originalGate,...changed});
  assert.equal(r.lane_count,0);
  assert.equal(r.status,'GOVERNED_CLASSIFIER_ORIGINAL_GATE_UNVERIFIED');
 }
});
test('unlinked frozen CI or claimed original cannot give a repair an executable job identity',()=>{
 const r=call({...originalGate,scoped_maintenance_case_ci_receipts:[]});
 assert.equal(r.lanes.some(x=>x.lane_kind==='INTERNAL_CAPABILITY_REPAIR'),false);
 assert.equal(r.lanes[0].original_work_id,originalGate.original_work_id);
 assert.equal(r.lanes[0].execution_permitted_by_classification,false);
});
test('unsigned or malformed identity is rejected before any classification',()=>{
 assert.equal(classify({ownerId:'bad',shiftId:shift,
  originalGate,artifactReadback:readback}).lane_count,0);
});
