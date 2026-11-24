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
 assert.ok(i<code.indexOf("workerStage='WORKER_RESPONSE_PUBLICATION'"));
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
