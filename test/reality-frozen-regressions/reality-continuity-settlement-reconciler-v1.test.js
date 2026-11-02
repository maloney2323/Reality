// Frozen business acceptance for an observed November 2 production-readiness defect.
// A successful isolated job receipt exists, but the primary Universe ledger has no VERIFIED completion.
// The missing extension may PREPARE an evidence-bound reconciliation request; it may NOT write,
// self-authorize, or falsely certify an independent provider/database readback.
import test from 'node:test';
import assert from 'node:assert/strict';
import {assessContinuityReconciliation} from '../../src/reality-extensions/reality-continuity-settlement-reconciler.mjs';
const id='work:'+'a'.repeat(32),owner='11111111-1111-4111-8111-111111111111';
const root='22222222-2222-4222-8222-222222222222';
const world='33333333-3333-4333-8333-333333333333';
const source='44444444-4444-4444-8444-444444444444';
const commit='a'.repeat(40),hash='b'.repeat(64),digest='c'.repeat(64),chain='d'.repeat(64);
function realEvidence(){
 return {
 original:{owner_id:owner,goal_id:'user-goal:example',original_work_id:id,
  continuity_root_id:root,worldline_id:world,original_event_id:source,
  epistemic_status:'VERIFIED',original_job_completed:false,
  source_content_hash:hash,original_event_lineage_hash:chain},
 approval:{owner_id:owner,original_work_id:id,approval_id:'55555555-5555-4555-8555-555555555555',
  target_environment:'ISOLATED_PREVIEW',consumed_once:true,source:'AUTHENTICATED_OWNER_EXPLICIT_ACTION',
  artifact_sha256:hash},
 installation:{original_work_id:id,artifact_sha256:hash,installed_commit_sha:commit,
  installed_source_verified:true,production_changed:false},
 provider:{repository:'maloney2323/Reality',run_id:123456789,
  run_status:'completed',run_conclusion:'success',original_job_success:true,
  independent_provider_readback:true,provider_outcome_digest:digest},
 settlement:{status:'SETTLED_ISOLATED',original_work_id:id,
  original_job_completed:true,independent_outcome_verified:true,
  owner_approval_id:'55555555-5555-4555-8555-555555555555',
  artifact_sha256:hash,installed_commit_sha:commit,provider_run_id:123456789,
  provider_outcome_digest:digest,production_changed:false},
 ledger:{continuity_root_id:root,worldline_id:world,
  append_only_verified:true,head_lineage_hash:chain,verified_completion_events:[]}
 };
}
test('unreconciled genuine settlement remains NOT COMPLETE in Universe',()=>{
 const result=assessContinuityReconciliation(realEvidence());
 assert.equal(result.status,'RECONCILIATION_REQUIRED');
 assert.equal(result.original_work_id,id);
 assert.equal(result.universe_settlement_verified,false);
 assert.equal(result.installation_authorized,false);
 assert.equal(result.production_changed,false);
 assert.equal(result.original_job_completed_in_universe,false);
 assert.equal(result.reconciliation?.status,'PROPOSED_NOT_APPENDED');
 assert.equal(result.reconciliation?.original_work_id,id);
 assert.equal(result.reconciliation?.continuity_root_id,root);
 assert.equal(result.reconciliation?.worldline_id,world);
 assert.equal(result.reconciliation?.installed_commit_sha,commit);
});
test('a model or dashboard saying completed cannot substitute for ledger event',()=>{
 const e=realEvidence();e.model_claim={completed:true,authority:'SYSTEM'};e.dashboard_status='COMPLETED';
 const result=assessContinuityReconciliation(e);
 assert.equal(result.universe_settlement_verified,false);
 assert.notEqual(result.status,'VERIFIED_SETTLED');
});
test('wrong owner, swapped work id and foreign approval must fail closed',()=>{
 for(const mutate of [
   e=>e.approval.owner_id='66666666-6666-4666-8666-666666666666',
   e=>e.approval.original_work_id='work:'+'f'.repeat(32),
   e=>e.settlement.owner_approval_id='77777777-7777-4777-8777-777777777777',
   e=>e.original.epistemic_status='CLAIMED',
 ]){
  const e=realEvidence();mutate(e);
  const r=assessContinuityReconciliation(e);
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.universe_settlement_verified,false);
 }
});
test('source, artifact and installed commit cannot drift across receipts',()=>{
 for(const mutate of [
   e=>e.installation.installed_commit_sha='f'.repeat(40),
   e=>e.settlement.installed_commit_sha='f'.repeat(40),
   e=>e.approval.artifact_sha256='f'.repeat(64),
   e=>e.provider.provider_outcome_digest='e'.repeat(64),
 ]){
  const e=realEvidence();mutate(e);
  assert.equal(assessContinuityReconciliation(e).status,'BLOCKED');
 }
});
test('provider must be independently successful and isolation enforced',()=>{
 for(const mutate of [
  e=>e.provider.run_conclusion='failure',
  e=>e.provider.independent_provider_readback=false,
  e=>e.settlement.independent_outcome_verified=false,
  e=>e.installation.production_changed=true,
  e=>e.approval.consumed_once=false,
  e=>e.approval.target_environment='PRODUCTION',
 ]){
  const e=realEvidence();mutate(e);
  const r=assessContinuityReconciliation(e);
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.production_changed,false);
 }
});
test('continuity lineage mismatch or unverified head blocks reconciliation',()=>{
 for(const mutate of [
  e=>e.ledger.worldline_id='66666666-6666-4666-8666-666666666666',
  e=>e.ledger.continuity_root_id='66666666-6666-4666-8666-666666666666',
  e=>e.ledger.append_only_verified=false,
  e=>e.ledger.head_lineage_hash='invalid'
 ]){
  const e=realEvidence();mutate(e);
  assert.equal(assessContinuityReconciliation(e).status,'BLOCKED');
 }
});
test('matching independently VERIFIED existing ledger event is read as reconciled, never reappended',()=>{
 const e=realEvidence();
 e.ledger.verified_completion_events=[{
  original_work_id:id,owner_id:owner,continuity_root_id:root,
  worldline_id:world,installed_commit_sha:commit,
  provider_run_id:123456789,provider_outcome_digest:digest,
  epistemic_status:'VERIFIED',constitutional_phase:'SETTLED',original_job_completed:true
 }];
 const r=assessContinuityReconciliation(e);
 assert.equal(r.status,'ALREADY_RECONCILED');
 assert.equal(r.universe_settlement_verified,true);
 assert.equal(r.reconciliation,null);
});
test('duplicate or contradictory ledger completions are not accepted',()=>{
 const e=realEvidence();
 const completed={
  original_work_id:id,owner_id:owner,continuity_root_id:root,
  worldline_id:world,installed_commit_sha:commit,
  provider_run_id:123456789,provider_outcome_digest:digest,
  epistemic_status:'VERIFIED',constitutional_phase:'SETTLED',original_job_completed:true
 };
 e.ledger.verified_completion_events=[completed,{...completed}];
 assert.equal(assessContinuityReconciliation(e).status,'BLOCKED');
 e.ledger.verified_completion_events=[{...completed,installed_commit_sha:'f'.repeat(40)}];
 assert.equal(assessContinuityReconciliation(e).status,'BLOCKED');
});
test('missing or fabricated settlement receipt cannot justify a reconciliation',()=>{
 const e=realEvidence();e.settlement=null;
 assert.equal(assessContinuityReconciliation(e).status,'BLOCKED');
 const b=realEvidence();b.settlement.status='AI_SAYS_DONE';
 assert.equal(assessContinuityReconciliation(b).status,'BLOCKED');
});
