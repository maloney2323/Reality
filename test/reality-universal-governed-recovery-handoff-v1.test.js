import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {
 sealGovernedRecoveryHandoff,verifyGovernedRecoveryHandoff,
 brokerGovernedRecoveryCapability,planZeroTouchSameJobContinuation
} from '../src/reality-universal-governed-recovery-handoff-v1.js';

const KEY=randomBytes(32),WRONG=randomBytes(32);
const OWNER='11111111-2222-4333-8444-555555555555';
const SHIFT='22222222-3333-4444-8555-666666666666';
const WORK='work:'+'a'.repeat(32),ROOT='root:original',WORLD='world:original';
const ISSUED='2026-11-06T18:00:00.000Z';
const NOW='2026-11-06T18:01:00.000Z';
const LATER='2026-11-06T18:02:00.000Z';
const S={owner_id:OWNER,shift_id:SHIFT,original_work_id:WORK,
 goal_id:'goal:source-repair',continuity_root_id:ROOT,
 worldline_id:WORLD,source_identity_hash:'9'.repeat(64),
 ledger_head_hash:'a'.repeat(64),
 authorization_fingerprint:'b'.repeat(64),
 authorization_expires_at:'2026-11-06T20:00:00.000Z',
 target_environment:'ISOLATED_PREVIEW',
 allowed_capabilities:['github:read','sandbox:isolated','tool:verify'],
 original_job_authorized:true,independently_settled:false,
 provider_effect_may_have_occurred:false,installation_authorized:false,
 production_changed:false};
const F={failure_id:'33333333-4444-4555-8666-777777777777',
 owner_id:OWNER,shift_id:SHIFT,original_work_id:WORK,goal_id:S.goal_id,
 continuity_root_id:ROOT,worldline_id:WORLD,
 source_identity_hash:S.source_identity_hash,ledger_head_hash:S.ledger_head_hash,
 failed_valid_at:'2026-11-06T17:59:00.000Z',
 provider_evidence_sha256:'c'.repeat(64),capability_id:'repair_runner',
 blocker_class:'ENVIRONMENT_CONTEXT_DEFICIT',
 provider_observation_independently_verified:true,
 durable_failure_readback_verified:true,
 provider_effect_may_have_occurred:false,production_changed:false};
const make=(scope=S,failure=F)=>
 sealGovernedRecoveryHandoff({currentScope:scope,failure,
  signingKey:KEY,transactionTime:ISSUED});
const args=(envelope=make(),scope=S)=>({envelope,signingKey:KEY,
 currentScope:scope,executionTime:NOW});
const manifest={capability_id:F.capability_id,
 schema_sha256:'d'.repeat(64),required_capabilities:['github:read'],
 external_permission_escalation:false,production_write_authorized:false};
const registry=(status,tool=manifest)=>({
 independently_verified:true,status,original_work_id:WORK,
 capability_id:F.capability_id,manifest:tool});
const repro={independently_verified:true,
 original_work_id:WORK,capability_id:F.capability_id,
 reproduced_failure:true,frozen_suite_sha256:'e'.repeat(64),
 external_action_performed:false};
const candidate={independently_verified:true,
 original_work_id:WORK,capability_id:F.capability_id,
 frozen_suite_sha256:repro.frozen_suite_sha256,
 artifact_sha256:'f'.repeat(64),isolation:'NO_NETWORK_NO_SECRETS',
 sandbox_tests_passed:true,production_changed:false,manifest};
const approval={independently_verified:true,original_work_id:WORK,owner_id:OWNER,
 artifact_sha256:candidate.artifact_sha256,exact_owner_approval:true,
 approved_environment:'ISOLATED_PREVIEW'};
const checkpoint={independently_verified:true,
 original_work_id:WORK,owner_id:OWNER,goal_id:S.goal_id,
 failure_id:F.failure_id,source_identity_hash:S.source_identity_hash,
 checkpoint_sha256:'1'.repeat(64),
 provider_effect_may_have_occurred:false,original_job_settled:false};
test('signed immutable bitemporal envelope includes valid, transaction and execution times',()=>{
 const envelope=make();
 assert.equal(Object.isFrozen(envelope.body.scope),true);
 assert.equal(envelope.body.scope.original_work_id,WORK);
 assert.equal(envelope.body.failure.failed_valid_at,F.failed_valid_at);
 assert.equal(envelope.body.transaction_time,ISSUED);
 assert.equal(envelope.body.authorization_granted_by_handoff,false);
 const verified=verifyGovernedRecoveryHandoff(args(envelope));
 assert.equal(verified.status,'HANDOFF_INDEPENDENT_SCOPE_VERIFIED');
 assert.equal(verified.source_identity_hash,S.source_identity_hash);
 assert.equal(verified.execution_time,NOW);
 assert.equal(verified.installation_authorized,false);
});
test('tamper, wrong key, stale authority, foreign owner and uncertain external effects fail closed',()=>{
 const original=make();
 const mutated=JSON.parse(JSON.stringify(original));
 mutated.body.scope.original_work_id='work:'+'b'.repeat(32);
 assert.throws(()=>verifyGovernedRecoveryHandoff(args(mutated)),/SIGNATURE_INVALID/);
 assert.throws(()=>verifyGovernedRecoveryHandoff({...args(original),signingKey:WRONG}),
  /SIGNATURE_INVALID/);
 assert.throws(()=>verifyGovernedRecoveryHandoff(args(original,{
  ...S,owner_id:'44444444-5555-4666-8777-888888888888'})),
 /DRIFT/);
 assert.throws(()=>verifyGovernedRecoveryHandoff(args(original,{
  ...S,ledger_head_hash:'f'.repeat(64)})),/LEDGER_TIP_CHANGED/);
 assert.throws(()=>verifyGovernedRecoveryHandoff(args(original,{
  ...S,source_identity_hash:'f'.repeat(64)})),/DRIFT/);
 assert.throws(()=>verifyGovernedRecoveryHandoff({...args(original),
  executionTime:'2026-11-06T20:00:00.000Z'}),/EXPIRED_OR_BITEMPORAL/);
 assert.throws(()=>verifyGovernedRecoveryHandoff({...args(original),
  executionTime:'2026-11-06T18:16:01.000Z'}),/EXPIRED_OR_BITEMPORAL/);
 assert.throws(()=>make({...S,provider_effect_may_have_occurred:true}),/AUTHORITY_REQUIRED/);
 assert.throws(()=>make(S,{...F,durable_failure_readback_verified:false}),/FAILURE_REQUIRED/);
 assert.throws(()=>sealGovernedRecoveryHandoff({
  currentScope:S,failure:F,signingKey:Buffer.from('public-key'),
  transactionTime:ISSUED}),/SIGNING_KEY_REQUIRED/);
});
test('trusted existing tool is rebound without synthesis, new permissions or installation',()=>{
 const out=brokerGovernedRecoveryCapability({
  ...args(),registryReadback:registry('ACTIVE')});
 assert.equal(out.status,'EXISTING_CAPABILITY_REBOUND');
 assert.equal(out.can_rehydrate,true);
 assert.equal(out.new_tool_created,false);
 assert.equal(out.installation_authorized,false);
 const resume=planZeroTouchSameJobContinuation({
  ...args(),brokerResult:out,checkpointReadback:checkpoint});
 assert.equal(resume.status,'SAME_ORIGINAL_JOB_READY_FOR_GOVERNED_CONTINUATION');
 assert.equal(resume.original_work_id,WORK);
 assert.equal(resume.automatic_resume_completed,false);
 assert.equal(resume.tool_scope,'EPHEMERAL_ORIGINAL_JOB_ONLY');
 assert.equal(resume.existing_executor_must_acquire_atomic_fenced_claim,true);
 assert.equal(resume.independently_verified_final_receipt,false);
});
test('a stale or elevated capability is never rebound into the LLM toolset',()=>{
 const elevated={...manifest,required_capabilities:['github:write']};
 assert.throws(()=>brokerGovernedRecoveryCapability({...args(),
  registryReadback:registry('ACTIVE',elevated)}),/TOOL_MANIFEST_OUTSIDE/);
 const unexpected={...manifest,external_permission_escalation:true};
 assert.throws(()=>brokerGovernedRecoveryCapability({...args(),
  registryReadback:registry('ACTIVE',unexpected)}),/TOOL_MANIFEST_OUTSIDE/);
 const missing=brokerGovernedRecoveryCapability({...args(),
  registryReadback:registry('ACTIVE'),
  envelope:make(S,{...F,blocker_class:'MISSING_INSTRUMENT'})});
 assert.equal(missing.status,'ACTIVE_TOOL_REASSESS_FAILURE_NO_SYNTHESIS');
 assert.equal(missing.can_rehydrate,false);
 const authority=brokerGovernedRecoveryCapability({...args(),
  registryReadback:registry('ACTIVE'),
  envelope:make(S,{...F,blocker_class:'AUTH_SCOPE_DEFICIT'})});
 assert.equal(authority.status,'EXACT_AUTHORITY_REQUIRED_NOT_A_TOOL_GAP');
 assert.equal(authority.tool_manifest,null);
});
test('missing tool requires independent frozen reproduction, sandbox and exact-artifact approval',()=>{
 const envelope=make(S,{...F,blocker_class:'MISSING_INSTRUMENT'});
 const base={...args(envelope),registryReadback:registry('ABSENT')};
 assert.equal(brokerGovernedRecoveryCapability(base).status,'FROZEN_REPRODUCTION_REQUIRED');
 assert.equal(brokerGovernedRecoveryCapability({...base,
  frozenReproduction:repro}).status,'ISOLATED_CANDIDATE_VERIFICATION_REQUIRED');
 const staged=brokerGovernedRecoveryCapability({...base,
  frozenReproduction:repro,candidate});
 assert.equal(staged.status,'EXACT_ARTIFACT_APPROVAL_REQUIRED');
 assert.equal(staged.can_rehydrate,false);
 assert.equal(staged.tool_manifest,null);
 assert.throws(()=>planZeroTouchSameJobContinuation({
  ...args(envelope),brokerResult:staged,checkpointReadback:checkpoint}),
 /CAPABILITY_NOT_INSTALLED_OR_REBOUND/);
 const approved=brokerGovernedRecoveryCapability({...base,
  frozenReproduction:repro,candidate,installationApproval:approval});
 assert.equal(approved.status,'APPROVED_CANDIDATE_REQUIRES_INSTALL_READBACK');
 assert.equal(approved.can_rehydrate,false);
 assert.equal(approved.persistent_promotion_authorized,false);
 assert.throws(()=>planZeroTouchSameJobContinuation({
  ...args(envelope),brokerResult:approved,checkpointReadback:checkpoint}),
 /CAPABILITY_NOT_INSTALLED_OR_REBOUND/);
 const ready=planZeroTouchSameJobContinuation({
  ...args(envelope),brokerResult:approved,checkpointReadback:checkpoint,
  installedReadback:{independently_verified:true,original_work_id:WORK,
   artifact_sha256:candidate.artifact_sha256,environment:'ISOLATED_PREVIEW',
   activated:true,provider_effect_may_have_occurred:false}});
 assert.equal(ready.automatic_resume_completed,false);
 assert.equal(ready.persistent_promotion_authorized,false);
 assert.equal(ready.execution_side_effect_performed,false);
});
test('wrong approval artifact and unsafe newly generated permissions cannot be attached',()=>{
 const envelope=make(S,{...F,blocker_class:'MISSING_INSTRUMENT'});
 const base={...args(envelope),registryReadback:registry('ABSENT'),
  frozenReproduction:repro,candidate};
 const wrong=brokerGovernedRecoveryCapability({...base,
  installationApproval:{...approval,artifact_sha256:'0'.repeat(64)}});
 assert.equal(wrong.status,'EXACT_ARTIFACT_APPROVAL_REQUIRED');
 assert.equal(wrong.can_rehydrate,false);
 assert.throws(()=>brokerGovernedRecoveryCapability({...base,
  candidate:{...candidate,manifest:{...manifest,required_capabilities:['github:write']}},
  installationApproval:approval}),/TOOL_MANIFEST_OUTSIDE/);
});
test('model or transport cannot forge a broker approval or replace the tool manifest',()=>{
 const result=brokerGovernedRecoveryCapability({...args(),
  registryReadback:registry('ACTIVE')});
 const forged={...result,status:'APPROVED_CANDIDATE_REQUIRES_INSTALL_READBACK',
  staged_artifact_sha256:'f'.repeat(64)};
 assert.throws(()=>planZeroTouchSameJobContinuation({
  ...args(),brokerResult:forged,checkpointReadback:checkpoint,
  installedReadback:{independently_verified:true,original_work_id:WORK,
   artifact_sha256:'f'.repeat(64),environment:'ISOLATED_PREVIEW',
   activated:true,provider_effect_may_have_occurred:false}
 }),/BROKER_DECISION_SIGNATURE_INVALID/);
 const deleted={...result};delete deleted.decision_signature;
 assert.throws(()=>planZeroTouchSameJobContinuation({...args(),
  brokerResult:deleted,checkpointReadback:checkpoint}),
 /SIGNED_BROKER_DECISION_REQUIRED/);
});

test('resume requires durable same-job pre-failure checkpoint; no ambiguous replay',()=>{
 const result=brokerGovernedRecoveryCapability({...args(),
  registryReadback:registry('ACTIVE')});
 for(const changed of [
  {...checkpoint,owner_id:'44444444-5555-4666-8777-888888888888'},
  {...checkpoint,original_job_settled:true},
  {...checkpoint,provider_effect_may_have_occurred:true},
  {...checkpoint,checkpoint_sha256:'not-a-hash'},
  {...checkpoint,source_identity_hash:'0'.repeat(64)},
 ]){
  assert.throws(()=>planZeroTouchSameJobContinuation({
   ...args(),brokerResult:result,checkpointReadback:changed}),/CHECKPOINT_REQUIRED/);
 }
});
