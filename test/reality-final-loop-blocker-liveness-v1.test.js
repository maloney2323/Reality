import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyFinalLoopBlockerLiveness as classify}
 from '../src/reality-final-loop-blocker-liveness-v1.js';
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const shift='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const work='work:315562fe1bd66b30a48bb9be4f1d162a';
const source='https://github.com/maloney2323/Reality/pull/307';
const sha=x=>'sha256:'+x.repeat(64);
const contract={status:'RECOVERY_PROOF_CONTRACT_CANDIDATE_NEEDS_DURABLE_FREEZE',
 read_only:true,contract_candidate:{owner_id:owner,shift_id:shift,
 obligation_id:work,source_ref:source,contract_id:sha('a'),
 ledger_freeze_verified:false}};
const route={status:'RECOVERY_REUSE_VERIFIED_CI_DIAGNOSTIC_FROZEN_CASE_SPEC_MISSING',
 owner_id:owner,shift_id:shift,obligation_id:work,source_ref:source,
 contract_id:sha('a'),prior_diagnostic_verified:true,
 existing_diagnostic_receipt_sha256:sha('c'),
 repeat_prior_ci_dispatch_permitted:false,
 case_specific_frozen_red_verified:false,
 original_job_completed:false,installation_authorized:false,
 production_changed:false};
const args=(overrides={})=>({contractProposal:contract,
 existingCiRoute:route,signedRecovery:{status:'RECOVERY_CAPABILITY_ACQUISITION_REQUIRED'},
 ...overrides});
test('PR307 existing verified diagnostic stays recoverable and explicitly machine-owned',()=>{
 const v=classify(args());
 assert.equal(v.status,'RECOVERY_AUTONOMOUS_CASE_SPEC_ACQUISITION_DUE');
 assert.equal(v.liveness,'RECOVERABLE_UNFINISHED');
 assert.equal(v.next_actor,'REALITY');
 assert.equal(v.obligation_id,work);
 assert.equal(v.resume_same_obligation,true);
 assert.equal(v.recovery_worker_next_wake_required,true);
 assert.equal(v.repeat_prior_ci_dispatch_permitted,false);
 assert.equal(v.next_required_capability,'CONSTRUCT_SIGNED_FROZEN_CASE_SPEC');
 assert.equal(v.capability_execution_ready,false);
 for(const k of ['original_job_completed','production_changed',
  'repair_executed','owner_approval_granted','execution_authorized',
  'capability_acquired','event_dispatched','continuation_verified'])
  assert.equal(v[k],false,k);
});
test('false diagnostic receipt cannot trigger apparent liveness advancement',()=>{
 const v=classify(args({existingCiRoute:{
  ...route,existing_diagnostic_receipt_sha256:null}}));
 assert.equal(v.status,'RECOVERY_EXISTING_CI_PROOF_CONTRADICTION');
 assert.equal(v.next_actor,'REALITY');
 assert.equal(v.continuation_verified,false);
});
test('authority boundary never silently mints permission',()=>{
 const v=classify(args({signedRecovery:{
  status:'RECOVERY_EXACT_MUTATION_WARRANT_REQUIRED'}}));
 assert.equal(v.status,'RECOVERY_EXACT_OWNER_AUTHORITY_BOUNDARY');
 assert.equal(v.next_actor,'OWNER');
 assert.equal(v.execution_authorized,false);
 assert.equal(v.manual_restart_required,false);
});
test('hard budget is not bypassed by repeated attempts or next worker wakes',()=>{
 const v=classify(args({budgetState:{status:'RECOVERY_BUDGET_EXHAUSTED'}}));
 assert.equal(v.status,'RECOVERY_EXPLICIT_HARD_BUDGET_BOUNDARY');
 assert.equal(v.next_actor,'OWNER');
 assert.equal(v.liveness,'PAUSED_WITH_EVIDENCE');
 assert.equal(v.event_dispatched,false);
});
test('RED proof from the same source requires independent reconciliation',()=>{
 const v=classify(args({existingCiRoute:{
  ...route,status:
   'RECOVERY_EXISTING_CASE_SPECIFIC_CI_SOURCE_PROOF_NEEDS_CONTRACT_RECONCILIATION',
  frozen_test_receipt_sha256:sha('d')}}));
 assert.equal(v.status,'RECOVERY_AUTONOMOUS_INDEPENDENT_RED_RECONCILIATION_DUE');
 assert.equal(v.next_actor,'REALITY');
 assert.equal(v.continuation_verified,false);
});
test('unverified provider receipt must reconcile, never replay the CI dispatch',()=>{
 const v=classify(args({existingCiRoute:{...route,
  status:'RECOVERY_COMPLETED_CI_CLAIM_INDEPENDENT_OUTCOME_UNVERIFIED'}}));
 assert.equal(v.status,'RECOVERY_INDEPENDENT_PROVIDER_RECONCILIATION_DUE');
 assert.equal(v.repeat_prior_ci_dispatch_permitted,false);
 assert.equal(v.next_actor,'REALITY');
 assert.equal(v.event_dispatched,false);
});
test('wrong source or sibling PR cannot take over original recovery',()=>{
 for(const invalid of [
  {...route,source_ref:'https://github.com/maloney2323/Reality/pull/308'},
  {...route,owner_id:'11111111-1111-4111-8111-111111111111'},
  {...route,contract_id:sha('f')},
  {...route,original_job_completed:true}
 ]){
  const v=classify(args({existingCiRoute:invalid}));
  assert.equal(v.status,'RECOVERY_EXISTING_CI_IDENTITY_UNVERIFIED');
  assert.equal(v.original_job_completed,false);
  assert.equal(v.next_actor,'REALITY');
 }
});
test('unregistered acquisition remains a due action, not a completed capability',()=>{
 const v=classify(args({existingCiRoute:{...route,
  status:'RECOVERY_EXISTING_CASE_CI_EVIDENCE_CONFLICT_NEEDS_REVIEW'},
  signedRecovery:{status:'RECOVERY_CAPABILITY_ACQUISITION_REQUIRED'}}));
 assert.equal(v.status,'RECOVERY_AUTONOMOUS_ACQUISITION_DUE');
 assert.equal(v.capability_execution_ready,false);
 assert.equal(v.capability_acquired,false);
});
test('external technical proof advances only machine-owned business qualification, not full-loop RED',()=>{
 const r=classify(args({technicalCiObservation:{
  status:'RECOVERY_TECHNICAL_CI_PROVIDER_ATTESTED_BUSINESS_PROOF_PENDING',
  contract_id:sha('a'),owner_id:owner,shift_id:shift,
  obligation_id:work,source_ref:source,
  independent_technical_ci_verified:true,frozen_technical_red_verified:true,
  original_business_case_red_verified:false,business_original_warrant_verified:false,
  original_job_completed:false,execution_authorized:false,production_changed:false,
  github_artifact_digest:sha('f'),github_run_id:33012345
 }}));
 assert.equal(r.status,
  'RECOVERY_TECHNICAL_PROOF_OBSERVED_BUSINESS_LINEAGE_STILL_DUE');
 assert.equal(r.next_actor,'REALITY');
 assert.equal(r.technical_ci_verified,true);
 assert.equal(r.business_original_red_verified,false);
 assert.equal(r.continuation_verified,false);
 assert.equal(r.original_job_completed,false);
 assert.equal(r.next_governed_action,
  'RECONCILE_EXISTING_TECHNICAL_CI_WITH_SIGNED_CONTINUITY');
 assert.equal(r.technical_ci_durable_attachment_verified,false);
 assert.equal(r.repeat_prior_ci_dispatch_permitted,false);
});
test('forged technical CI from PR308 or unsupported business claim cannot advance',()=>{
 const proof={
  status:'RECOVERY_TECHNICAL_CI_PROVIDER_ATTESTED_BUSINESS_PROOF_PENDING',
  contract_id:sha('a'),owner_id:owner,shift_id:shift,
  obligation_id:work,source_ref:source,
  independent_technical_ci_verified:true,frozen_technical_red_verified:true,
  original_business_case_red_verified:false,business_original_warrant_verified:false,
  original_job_completed:false,execution_authorized:false,production_changed:false,
  github_artifact_digest:sha('f'),github_run_id:33012345
 };
 for(const invalid of [
  {...proof,source_ref:'https://github.com/maloney2323/Reality/pull/308'},
  {...proof,original_business_case_red_verified:true},
  {...proof,github_artifact_digest:null},
  {...proof,contract_id:sha('0')}
 ]){
  const r=classify(args({technicalCiObservation:invalid}));
  assert.notEqual(r.status,
   'RECOVERY_TECHNICAL_PROOF_OBSERVED_BUSINESS_LINEAGE_STILL_DUE');
  assert.equal(r.original_job_completed,false);
 }
});
test('every actual signed worker wake exposes the liveness next action',()=>{
 const code=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',
  import.meta.url),'utf8');
 assert.match(code,/classifyFinalLoopBlockerLiveness/);
 assert.match(code,/final_loop_blocker_liveness:finalLoopBlockerLiveness/);
 const i=code.indexOf('const finalLoopBlockerLiveness=');
 assert.ok(i>code.indexOf("workerStage='FINAL_LOOP_EXISTING_CASE_CI_RECOVERY_CLASSIFICATION'"));
 assert.ok(i<code.indexOf("workerStage='WORKER_RESPONSE_PUBLICATION'",i));
});

test('existing signed lineage evidence routes the actual admission boundary before repeating CI',()=>{
 const root='36f0ad48-f391-549f-8622-66cd493977e7';
 const maintenance='b7181e5b-a01c-4cb2-b191-10dea9dbe04f';
 const lineage={status:'SIGNED_ORIGINAL_LINEAGE_EXISTING_EVIDENCE_INDEPENDENTLY_READ',
  source_reconciled:true,owner_id:owner,shift_id:shift,original_work_id:work,
  source_ref:source,continuity_root_id:root,maintenance_id:maintenance,
  packet_id:'a9c70bb0-dc74-4ef6-aec2-d3ab053eeaf8',evidence_sha256:sha('d'),
  continuity_fact:'CURRENT_ORIGINAL_REMAINS_UNFINISHED',customer_original_verified:false,
  original_claim_admitted:false,original_job_completed:false,installation_authorized:false,
  production_changed:false,independent_review_required:true,
  next_action:'VERIFY_CANONICAL_OWNER_BUSINESS_WORK_LINEAGE_BEFORE_CI'};
 const input=args({contractProposal:{...contract,contract_candidate:{
  ...contract.contract_candidate,continuity_root_id:root}},
  existingCiRoute:{...route,maintenance_id:maintenance},originalLineageEvidence:lineage});
 const v=classify(input);
 assert.equal(v.status,'RECOVERY_VERIFIED_LINEAGE_ORIGINAL_AUTHORITY_RECONCILIATION_DUE');
 assert.equal(v.original_lineage_verified,true);
 assert.equal(v.repeat_prior_ci_dispatch_permitted,false);
 assert.equal(v.next_governed_action,'VERIFY_EXISTING_ORIGINAL_WARRANT_NO_SILENT_SCOPE_EXPANSION');
 assert.equal(v.original_job_completed,false);
 assert.equal(v.execution_authorized,false);
 for(const bad of [{...lineage,continuity_root_id:shift},{...lineage,maintenance_id:shift},
  {...lineage,source_ref:'https://github.com/maloney2323/Reality/pull/308'},
  {...lineage,customer_original_verified:true},{...lineage,evidence_sha256:null}]){
  const r=classify({...input,originalLineageEvidence:bad});
  assert.notEqual(r.status,v.status);
  assert.equal(r.execution_authorized,false);
 }
});

test('current technical CI proof supersedes a stale case-construction recommendation; only durable exact attachment advances reconciliation',()=>{
 const root='36f0ad48-f391-549f-8622-66cd493977e7';
 const maintenance='b7181e5b-a01c-4cb2-b191-10dea9dbe04f';
 const revision='ef66038297480f5da9444072e5e79f5c59b27184';
 const proof={status:'RECOVERY_TECHNICAL_CI_PROVIDER_ATTESTED_BUSINESS_PROOF_PENDING',
  contract_id:sha('a'),owner_id:owner,shift_id:shift,obligation_id:work,source_ref:source,
  source_revision:revision,independent_technical_ci_verified:true,frozen_technical_red_verified:true,
  original_business_case_red_verified:false,business_original_warrant_verified:false,
  original_job_completed:false,execution_authorized:false,production_changed:false,
  github_artifact_digest:sha('f'),github_run_id:33012345};
 const lineage={status:'SIGNED_ORIGINAL_LINEAGE_EXISTING_EVIDENCE_INDEPENDENTLY_READ',
  source_reconciled:true,owner_id:owner,shift_id:shift,original_work_id:work,source_ref:source,
  continuity_root_id:root,maintenance_id:maintenance,evidence_sha256:sha('d'),
  continuity_fact:'CURRENT_ORIGINAL_REMAINS_UNFINISHED',customer_original_verified:false,
  original_claim_admitted:false,original_job_completed:false,installation_authorized:false,
  production_changed:false,independent_review_required:true,
  next_action:'VERIFY_CANONICAL_OWNER_BUSINESS_WORK_LINEAGE_BEFORE_CI'};
 const attachment={status:'RECOVERY_TECH_CI_OBSERVATION_DURABLY_RECONCILED',
  technical_observation_recorded:true,contract_id:sha('a'),obligation_id:work,
  source_ref:source,owner_id:owner,shift_id:shift,github_run_id:proof.github_run_id,
  github_artifact_digest:proof.github_artifact_digest,observation_receipt_sha256:sha('e'),
  original_business_red_verified:false,original_job_completed:false,execution_authorized:false,production_changed:false};
 const input=args({contractProposal:{...contract,contract_candidate:{...contract.contract_candidate,
  source_revision:revision,continuity_root_id:root}},existingCiRoute:{...route,maintenance_id:maintenance},
  originalLineageEvidence:lineage,technicalCiObservation:proof});
 const pending=classify(input);
 assert.equal(pending.next_governed_action,'RECONCILE_EXISTING_TECHNICAL_CI_WITH_SIGNED_CONTINUITY');
 assert.equal(pending.repeat_prior_ci_dispatch_permitted,false);
 const done=classify({...input,technicalCiAttachment:attachment});
 assert.equal(done.technical_ci_durable_attachment_verified,true);
 assert.equal(done.next_governed_action,'INDEPENDENTLY_QUALIFY_BUSINESS_ORIGINAL_AND_CASE_SPECIFIC_RED');
 assert.equal(done.original_job_completed,false);
 assert.equal(done.execution_authorized,false);
 for(const wrong of [{...attachment,github_artifact_digest:sha('0')},
  {...attachment,source_ref:'https://github.com/maloney2323/Reality/pull/308'},
  {...attachment,original_job_completed:true},{...attachment,observation_receipt_sha256:null}]){
  assert.equal(classify({...input,technicalCiAttachment:wrong}).technical_ci_durable_attachment_verified,false);
 }
 assert.equal(classify({...input,technicalCiObservation:{...proof,source_revision:'0'.repeat(40)}}).technical_ci_verified,undefined);
});

test('current durable strategy and next proof outrank stale diagnostic acquisition',()=>{
 const durable={contract_id:sha('a'),contract_frozen:true,strategy_executed:false,
  original_job_completed:false,production_changed:false,installation_authorized:false};
 for(const [status,expected,action,extra] of [
  ['RECOVERY_DURABLE_STRATEGY_OUTCOME_UNCERTAIN_NO_REPLAY','RECOVERY_DURABLE_LEDGER_RECONCILIATION_DUE','RECONCILE_EXISTING_SIGNED_STRATEGY_OUTCOME',{}],
  ['RECOVERY_INDEPENDENT_PROOF_DELTA_UNVERIFIED','RECOVERY_DURABLE_LEDGER_RECONCILIATION_DUE','RECONCILE_SIGNED_RECOVERY_LEDGER',{}],
  ['RECOVERY_DURABLE_NEXT_PROOF_REQUIRES_EXACT_SIGNED_HANDLER','RECOVERY_DURABLE_NEXT_PROOF_HANDLER_DUE','QUALIFY_EXACT_REGISTERED_HANDLER_AND_WARRANT_FOR_NEXT_PROOF',{next_required_proof:'REPAIR_ISOLATED'}],
  ['RECOVERY_PROOF_CHAIN_INDEPENDENTLY_RECEIPTED','RECOVERY_DURABLE_PROOF_CHAIN_RETURN_DUE','RECONCILE_CANONICAL_ORIGINAL_SETTLEMENT_AND_UNIVERSE',{verified_proof_count:5}]
 ]){
  const r=classify(args({signedRecovery:{...durable,status,...extra}}));
  assert.equal(r.status,expected);assert.equal(r.next_governed_action,action);
  assert.equal(r.repeat_prior_ci_dispatch_permitted,false);
  assert.equal(r.original_job_completed,false);assert.equal(r.execution_authorized,false);
 }
});

import {qualifyDistinctApprovedReviewScopes} from '../src/reality-final-loop-child-review-worker-v1.js';

test('completed uncertain read-only attempts quarantine only their frozen scopes',()=>{
 const uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
 const fingerprint=n=>({index:n,scope_sha256:sha(String(n))});
 const handoff={effect_type:'READ_ONLY_INTERNAL_PR_REVIEW',read_only:true,
  execution_authorized:false,original_job_completed:false,production_changed:false,
  scope_count:5,scope_fingerprints:[0,1,2,3,4].map(fingerprint)};
 const observation=n=>({child_work_id:'work:'+String(n).repeat(32),
  scope_sha256:sha(String(n)),invocation_id:uuid(n+1),worker_run_id:uuid(n+10),
  event_id:uuid(n+20),event_head_sha256:sha('a'),release_sha:'b'.repeat(40),
  release_receipt_sha256:sha('c'),worker_completed:true,replay_authorized:false,
  model_artifact_recorded:false,provider_outcome_verified:false});
 const evidence={status:'SIGNED_INVOCATION_OBSERVATIONS_RETURNED_ORIGINAL_OPEN',
  canonical_return_committed:true,canonical_return_event_id:uuid(50),
  canonical_return_head_sha256:sha('a'),observation_sha256:sha('d'),
  replay_authorized:false,execution_authorized:false,original_job_completed:false,
  fenced_count:2,signed_observation_count:2,observations:[observation(0),observation(1)]};
 const proof=qualifyDistinctApprovedReviewScopes(evidence,handoff);
 assert.deepEqual(proof.blocked_scope_sha256s,[sha('0'),sha('1')]);
 assert.deepEqual(handoff.scope_fingerprints.filter(x=>
  !proof.blocked_scope_sha256s.includes(x.scope_sha256)).map(x=>x.index),[2,3,4]);
 assert.equal(proof.replay_authorized,false);
 assert.equal(proof.original_job_completed,false);
 for(const bad of [
  {...evidence,canonical_return_committed:false},
  {...evidence,replay_authorized:true},
  {...evidence,fenced_count:3},
  {...evidence,observations:[observation(0),{...observation(1),worker_completed:false}]},
  {...evidence,observations:[observation(0),{...observation(1),scope_sha256:sha('f')}]},
  {...evidence,observations:[observation(0),{...observation(1),provider_outcome_verified:true}]},
  {...evidence,observations:[observation(0),observation(0)]}
 ])assert.equal(qualifyDistinctApprovedReviewScopes(bad,handoff),null);
 assert.equal(qualifyDistinctApprovedReviewScopes(evidence,
  {...handoff,effect_type:'GITHUB_PUBLICATION'}),null);
});


import {selectRegisteredSignedEventCapability,boundedRegisteredCapabilityCheckpoint}
 from '../src/reality-evidence-driven-capability-router-v1.js';

test('existing signed event selects only its registered, exact approved capability',()=>{
 const uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
 const key='VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM';
 const event=uuid(10),run=uuid(11),root=uuid(12),revision=4,head=sha('a'),releaseSha='b'.repeat(40);
 const graph={status:'UNIFIED_OWNER_JOB_CONTROL_READY',owner_id:owner,shift_id:shift,
  plan_fingerprint:sha('c'),installation_authorized:false,production_changed:false};
 const delivery={kind:'RESUME',owner_id:owner,shift_id:shift,event_id:event,
  release_sha:releaseSha,plan_fingerprint:graph.plan_fingerprint};
 const h={schema:'reality-canonical-approved-review-scope-v1',owner_id:owner,shift_id:shift,
  parent_original_work_id:work,source_ref:source,continuity_root_id:root,
  continuity_head_sha256:head,revision,effect_type:'READ_ONLY_INTERNAL_PR_REVIEW',
  canonical_claim_required:true,read_only:true,execution_authorized:false,
  original_job_completed:false,production_changed:false};
 const trigger={status:'FINAL_LOOP_GOVERNED_TRIGGER_EXACT_REVIEW_CLAIM_ROUTE_READY',
  next_action:key,review_claim_route_ready:true,dispatch_permitted:false,
  execution_authorized_by_trigger:false,canonical_claim_required:true,
  new_attempt_authorized:false,previous_attempt_budget_preserved:true,
  original_job_completed:false,production_changed:false,owner_id:owner,shift_id:shift,
  event_id:event,original_work_id:work,source_ref:source,continuity_root_id:root,
  continuity_head_sha256:head,continuity_revision:revision,canonical_claim_handoff:h};
 const release={status:'SIGNED_WORKER_RELEASE_WAKE_DURABLY_RECORDED',
  worker_run_id:run,shift_id:shift,release_sha:releaseSha};
 const input={trigger,delivery,graph,release,workerRunId:run,registeredActionKeys:[key],
  wake:{status:'SHIFT_WORKER_PULSE_DURABLY_RECORDED',shift_id:shift},
  env:{VERCEL_ENV:'preview',REALITY_RELEASE_CONTROL_RUNTIME_TOPOLOGY:'CANONICAL_BENCHMARK_PREVIEW',
   REALITY_FINAL_LOOP_REVIEW_TRANSPORT_ENABLED:'true',REALITY_SIGNED_WORKER_TARGET_CAPABILITY_KEY:key}};
 assert.equal(selectRegisteredSignedEventCapability(input),key);
 for(const change of [
  {registeredActionKeys:[]},{delivery:{...delivery,event_id:uuid(20)}},
  {delivery:{...delivery,kind:'START'}},{release:{...release,release_sha:'d'.repeat(40)}},
  {release:{...release,worker_run_id:uuid(21)}},{graph:{...graph,owner_id:uuid(22)}},
  {trigger:{...trigger,next_action:'UNREGISTERED_EFFECT'}},
  {trigger:{...trigger,execution_authorized_by_trigger:true}},
  {trigger:{...trigger,new_attempt_authorized:true}},
  {trigger:{...trigger,canonical_claim_handoff:{...h,revision:5}}},
  {trigger:{...trigger,canonical_claim_handoff:{...h,effect_type:'GITHUB_PUBLICATION'}}},
  {env:{...input.env,VERCEL_ENV:'production'}}
 ])assert.equal(selectRegisteredSignedEventCapability({...input,...change}),null);
});

test('bounded capability checkpoint preserves negative evidence without raw provider content',()=>{
 const c=boundedRegisteredCapabilityCheckpoint('VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM',{
  status:'FINAL_LOOP_CANONICAL_ISOLATED_PROVIDER_UNCERTAIN_NO_REPLAY',
  provider_failure_reason:'FINAL_LOOP_CHILD_MODEL_PROVIDER_REQUEST_UNVERIFIED',
  isolated_authority_read_attempts:1,raw_provider_error:'private data',
  candidate:'untrusted model content',original_job_completed:false,production_changed:false});
 assert.equal(c.provider_failure_reason,'FINAL_LOOP_CHILD_MODEL_PROVIDER_REQUEST_UNVERIFIED');
 assert.equal(c.isolated_authority_read_attempts,1);
 assert.equal(c.original_job_completed,false);
 assert.equal(c.production_changed,false);
 assert.equal(c.raw_provider_error,undefined);
 assert.equal(c.candidate,undefined);
 assert.equal(boundedRegisteredCapabilityCheckpoint('bad',{status:'bad'}),null);
 assert.equal(boundedRegisteredCapabilityCheckpoint('VALID_CAPABILITY',{
  status:'VALID_STATUS',provider_failure_reason:'raw private error',original_job_completed:false,production_changed:false}).provider_failure_reason,null);
 assert.equal(boundedRegisteredCapabilityCheckpoint('VALID_CAPABILITY',{
  status:'VALID_STATUS',original_job_completed:true,production_changed:false}),null);
 const code=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const select=code.indexOf('const selectedEventCapability=selectRegisteredSignedEventCapability(');
 const execute=code.indexOf('finalLoopChildReview=await selectedEventHandler()');
 const checkpoint=code.indexOf('canonicalReviewCheckpoint=boundedRegisteredCapabilityCheckpoint(');
 assert.ok(select>=0&&execute>select&&checkpoint>execute);
 assert.ok(checkpoint<code.indexOf("workerStage='SHARED_CONTINUITY_VERIFIER_RETURN_FENCE'"));
 assert.match(code,/registered_capability_checkpoint:canonicalReviewCheckpoint/);
});


import {selectEngineeringDispatchScope} from '../src/reality-evidence-driven-capability-router-v1.js';

test('exact qualified review event does not run unrelated engineering lifecycle',()=>{
 const event_id='11111111-1111-4111-8111-111111111111';
 const delivery={kind:'RESUME',event_id,owner_id:owner,shift_id:shift};
 const guard={status:'FINAL_LOOP_SHARED_CONTINUITY_GUARD_VERIFIED_READ_ONLY',
  revision:4,continuity_head_sha256:sha('a'),execution_authorized:false,original_job_completed:false};
 const event={event_id,event_kind:'QUALIFIER_PROOF_CHANGED',
  next_qualified_action:'VERIFY_EXISTING_APPROVED_CHILD_REVIEW_CLAIM',
  continuity_revision:4,continuity_head_sha256:sha('a'),executor_invoked:false,execution_authorized:false};
 const continuity={owner_id:owner,shift_id:shift,shared_continuity_guard:guard,
  event_resume_shadow:{ready_event_refs:[event]}};
 const trigger={status:'FINAL_LOOP_GOVERNED_TRIGGER_BLOCKED',
  reason:'CURRENT_CATEGORIZED_REVIEW_SCOPE_REQUIRED',dispatch_permitted:false,
  execution_authorized_by_trigger:false,original_job_completed:false};
 const input={trigger,continuity,delivery,wake:{status:'SHIFT_WORKER_PULSE_DURABLY_RECORDED',shift_id:shift},
  canonicalEventRuntime:true,strictContinuityCycle:true};
 assert.equal(selectEngineeringDispatchScope(input),'EXACT_CLAIMED_REVIEW_CAPABILITY_ONLY');
 for(const bad of [
  {canonicalEventRuntime:false},{strictContinuityCycle:false},
  {delivery:{...delivery,kind:'START'}},{delivery:{...delivery,event_id:shift}},
  {trigger:{...trigger,reason:'NO_CURRENT_VERIFIED_EVENT'}},
  {trigger:{...trigger,execution_authorized_by_trigger:true}},
  {continuity:{...continuity,event_resume_shadow:{ready_event_refs:[event,event]}}},
  {continuity:{...continuity,event_resume_shadow:{ready_event_refs:[{...event,continuity_revision:3}]}}},
  {continuity:{...continuity,event_resume_shadow:{ready_event_refs:[{...event,next_qualified_action:'RUN_INDEPENDENT_CASE_CI'}]}}}
 ])assert.equal(selectEngineeringDispatchScope({...input,...bad}),'EXISTING_SIGNED_SHIFT_ENGINEERING');
 const code=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 assert.ok(code.indexOf('const engineeringDispatchScope=selectEngineeringDispatchScope(')<
  code.indexOf("workerStage='CORRECTIVE_CI_WORK_READBACK'"));
 for(const name of ['generalizedInstallReview','generalizedSourceWriteTransport',
  'generalOriginalAcceptancePush','generalizedPreviewDeployment','generalOriginalInstall',
  'generalOriginalRecoveryPublication','generalOriginalSettlement'])
  assert.ok(code.includes('const '+name+'=legacyEngineeringDeferred?deferredEngineeringOutcome():'));
 assert.match(code,/if\(!legacyEngineeringDeferred&&wakeReceipt.status==='SHIFT_WORKER_PULSE_DURABLY_RECORDED'\)\{\s*workerStage='SAME_ORIGINAL_RECOVERY_ELIGIBILITY'/);
 assert.match(code,/const correctiveCiPromise=legacyEngineeringDeferred\?Promise.resolve\(deferredEngineeringOutcome\(\)\)/);
 assert.match(code,/const fencedOriginalInvestigationPromise=legacyEngineeringDeferred\?Promise.resolve\(deferredEngineeringOutcome\(\)\)/);
 assert.match(code,/const selectedEventCapability=selectRegisteredSignedEventCapability/);
});


test('exact canonical review dispatch owns the signed event before unrelated maintenance and cannot fall through',()=>{
 const code=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const ingress=code.indexOf("workerStage='SHARED_CONTINUITY_VERIFIER_PREEXECUTION_FENCE'");
 const selection=code.indexOf("workerStage='EXACT_CLAIMED_EVENT_CAPABILITY_SELECTION'");
 const dispatch=code.indexOf("workerStage='EXACT_CLAIMED_REVIEW_CAPABILITY_DISPATCH'");
 const run=code.indexOf('finalLoopChildReview=await selectedEventHandler()',dispatch);
 const fence=code.indexOf("workerStage='EXACT_CLAIMED_REVIEW_CONTINUITY_RETURN_FENCE'",run);
 const pulse=code.indexOf('p_safe_result:canonicalReviewCheckpoint?.status',fence);
 const finish=code.indexOf('return res.status(200).json({',pulse);
 const unrelated=code.indexOf("workerStage='EXACT_APPROVED_BUSINESS_EFFECT_SIGNED_HANDOFF'");
 assert.ok(ingress>=0&&selection>ingress&&dispatch>selection&&run>dispatch&&fence>run&&pulse>fence&&finish>pulse&&unrelated>finish);
 const lane=code.slice(selection,unrelated);
 assert.match(lane,/if\(!otherQualifiedRoute\)/);
 assert.match(lane,/if\(ingressScope!=='EXACT_CLAIMED_REVIEW_CAPABILITY_ONLY'\)\s*throw Error/);
 assert.match(lane,/await requireFreshFinalLoopContinuity\(\)/);
 assert.match(lane,/await readSignedWorkerReleaseWitness\(exactReviewGraph\)/);
 assert.match(lane,/connectExistingIsolatedChildTransport\(/);
 assert.match(lane,/advanceCanonicalFinalLoopChildReview\(/);
 assert.match(lane,/if\(!selectedEventHandler\)/);
 assert.match(lane,/await shiftRpc\(db,'reality_release_governed_shift_worker_run_v1'/);
 assert.match(lane,/original_job_completed:false,execution_authorized:false,installation_authorized:false/);
 assert.equal((code.match(/await advanceCanonicalFinalLoopChildReview\(/g)||[]).length,1);
 assert.doesNotMatch(lane,/continueRileyCorrectiveModelIntoIndependentCI\(|settleGeneralOwnerApprovedOriginal\(|stageGeneralizedVerifiedOriginalInstallReview\(/);
});
