import test from 'node:test';
import assert from 'node:assert/strict';
import {assessContinuityReconciliation as assess} from '../src/reality-extensions/reality-continuity-settlement-reconciler.mjs';

// Relationship-level holdout from the independently read Nov 2 customer
// provider record. Do not publish customer owner or conversation UUIDs.
const owner='11111111-1111-4111-8111-111111111111';
const root='22222222-2222-4222-8222-222222222222';
const worldline='33333333-3333-4333-8333-333333333333';
const source='44444444-4444-4444-8444-444444444444';
const approval='55555555-5555-4555-8555-555555555555';
const id='work:'+'a'.repeat(32);
const sourceHash='a'.repeat(64), artifactHash='b'.repeat(64);
const sourceLineage='c'.repeat(64), currentTip='d'.repeat(64);
const installedCommit='818a74ed47079765153ff80a4d8261486df251f7';
const digest='e'.repeat(64);
const outcomeArtifact='f'.repeat(64);
function realShape(){
 return {
  original:{owner_id:owner,goal_id:'user-goal:actual',
    original_work_id:id,continuity_root_id:root,worldline_id:worldline,
    original_event_id:source,source_content_hash:sourceHash,
    original_event_lineage_hash:sourceLineage,
    epistemic_status:'VERIFIED',original_job_completed:false},
  approval:{owner_id:owner,original_work_id:id,approval_id:approval,
    source:'AUTHENTICATED_OWNER_EXPLICIT_ACTION',
    target_environment:'ISOLATED_PREVIEW',consumed_once:true,
    artifact_sha256:artifactHash},
  installation:{original_work_id:id,artifact_sha256:artifactHash,
    installed_commit_sha:installedCommit,installed_source_verified:true,
    production_changed:false},
  provider:{repository:'maloney2323/Reality',run_id:41390537103,
    run_status:'completed',run_conclusion:'failure',
    original_job_success:true,independent_provider_readback:true,
    resume_job_success:true,settlement_job_success:true,
    unrelated_job_failure_verified:true,
    settlement_artifact_digest:outcomeArtifact,
    provider_outcome_digest:digest,evidence_source:'GITHUB_ACTIONS_API'},
  settlement:{status:'SETTLED_ISOLATED',original_work_id:id,
    original_job_completed:true,independent_outcome_verified:true,
    owner_approval_id:approval,artifact_sha256:artifactHash,
    installed_commit_sha:installedCommit,provider_run_id:41390537103,
    provider_outcome_digest:digest,production_changed:false},
  ledger:{continuity_root_id:root,worldline_id:worldline,
    append_only_verified:true,original_event_in_chain_verified:true,
    head_lineage_hash:currentTip,verified_completion_events:[]}
 };
}
test('authentic observed shape: original hash differs, tip advanced and unrelated job red',()=>{
 const x=assess(realShape());
 assert.equal(x.status,'RECONCILIATION_REQUIRED',x.reason);
 assert.equal(x.original_work_id,id);
 assert.equal(x.reconciliation.artifact_sha256,artifactHash);
 assert.equal(x.reconciliation.prior_lineage_hash,currentTip);
 assert.equal(x.reconciliation.status,'PROPOSED_NOT_APPENDED');
 assert.equal(x.reconciliation.append_authorized,false);
 assert.equal(x.universe_settlement_verified,false);
});
test('overall workflow failed is not enough to infer job success',()=>{
 const a=realShape();a.provider.settlement_job_success=false;
 assert.equal(assess(a).status,'BLOCKED');
 const b=realShape();delete b.provider.unrelated_job_failure_verified;
 assert.equal(assess(b).status,'BLOCKED');
 const c=realShape();c.provider.settlement_artifact_digest='bad';
 assert.equal(assess(c).status,'BLOCKED');
});
test('different hashes are legitimate, but approval/install/settlement artifact must agree',()=>{
 const a=realShape();a.approval.artifact_sha256='0'.repeat(64);
 assert.equal(assess(a).status,'BLOCKED');
 const b=realShape();b.settlement.artifact_sha256='0'.repeat(64);
 assert.equal(assess(b).status,'BLOCKED');
 const c=realShape();c.installation.installed_commit_sha='0'.repeat(40);
 assert.equal(assess(c).status,'BLOCKED');
});
test('advancing a chain does not prove ancestry; exact verified source must remain ancestor',()=>{
 const a=realShape();delete a.ledger.original_event_in_chain_verified;
 assert.equal(assess(a).status,'BLOCKED');
 const b=realShape();b.ledger.original_event_in_chain_verified=false;
 assert.equal(assess(b).status,'BLOCKED');
 const c=realShape();c.ledger.worldline_id='6'.repeat(8)+'-6666-4666-8666-666666666666';
 assert.equal(assess(c).status,'BLOCKED');
});
test('original immutable acceptance remains a proposal, no authority is fabricated',()=>{
 const x=assess(realShape());
 assert.equal(x.installation_authorized,false);
 assert.equal(x.original_job_completed_in_universe,false);
 assert.equal(x.production_changed,false);
});
