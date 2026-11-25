import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {routeExistingSignedCaseCiForRecovery}
 from '../src/reality-final-loop-existing-case-ci-bridge-v1.js';
const sha=x=>'sha256:'+x.repeat(64);
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const shift='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const work='work:315562fe1bd66b30a48bb9be4f1d162a';
const root='36f0ad48-f391-549f-8622-66cd493977e7';
const source='https://github.com/maloney2323/Reality/pull/307';
const maintenance='b7181e5b-a01c-4cb2-b191-10dea9dbe04f';
const origin='fd888f5c-ee4e-4257-9756-3d09a6e622c7';
const review=sha('9');
const candidate={status:'RECOVERY_PROOF_CONTRACT_CANDIDATE_NEEDS_DURABLE_FREEZE',
 read_only:true,contract_candidate:{contract_id:sha('a'),owner_id:owner,
 shift_id:shift,continuity_root_id:root,obligation_id:work,
 source_ref:source,blocker_evidence_sha256:sha('b'),
 freeze_state:'CANDIDATE_NOT_DURABLE',ledger_freeze_verified:false,
 required_proofs:['RED','REPAIR_ISOLATED','GREEN','REGRESSION','CONTINUATION']}};
const item={owner_id:owner,source_ref:source,origin_incident_id:maintenance,
 origin_shift_id:origin,independent_review_receipt_sha256:review,
 independent_failure_baseline_receipt_sha256:sha('1'),
 signed_executor_state:'COMPLETED',
 signed_executor_action:'RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED',
 ci_dispatch_receipt_sha256:sha('2'),
 ci_independent_diagnostic_receipt_sha256:sha('3'),
 frozen_reproduction_verified:false,
 independent_frozen_test_receipt_sha256:null,
 original_customer_job_completed:false,
 installation_authorized_by_read:false,external_action_authorized_by_read:false,
 production_changed:false};
const sibling={...item,origin_incident_id:'05d1e1a9-8f9e-43a5-94ba-acd367cc2611',
 source_ref:'https://github.com/maloney2323/Reality/pull/308',
 signed_executor_state:'COMPLETED',frozen_reproduction_verified:true,
 independent_frozen_test_receipt_sha256:sha('4')};
const warrant=(x)=>({source_ref:x.source_ref,maintenance_id:x.origin_incident_id,
 origin_shift_id:x.origin_shift_id,
 independent_review_receipt_sha256:x.independent_review_receipt_sha256});
const ledger=(items=[item,sibling])=>({
 status:'OWNER_VERIFIED_INTERNAL_MAINTENANCE_READ_ONLY',
 owner_id:owner,read_only:true,production_changed:false,
 count:items.length,items,
 active_maintenance_warrant:{
  status:'VERIFIED_ACTIVE_OWNER_MAINTENANCE_WARRANT_SCOPE',
  shift_id:shift,state:'ACTIVE',
  mode:'UNTIL_ALL_INDEPENDENT_INTERNAL_MAINTENANCE_RECEIPTS',
  source_scope:items.map(warrant)}});
test('PR307 maps completed signed diagnostic to distinct frozen-case proof, no replay',()=>{
 const r=routeExistingSignedCaseCiForRecovery({contractProposal:candidate,
  maintenanceLedger:ledger()});
 assert.equal(r.status,'RECOVERY_REUSE_VERIFIED_CI_DIAGNOSTIC_FROZEN_CASE_SPEC_MISSING');
 assert.equal(r.contract_id,candidate.contract_candidate.contract_id);
 assert.equal(r.maintenance_id,maintenance);
 assert.equal(r.obligation_id,work);
 assert.equal(r.existing_diagnostic_receipt_sha256,sha('3'));
 assert.equal(r.registered_existing_capability,
  'RUN_CASE_SPECIFIC_INDEPENDENT_MAINTENANCE_CI_RED');
 assert.equal(r.next_governed_action,
  'QUALIFY_DISTINCT_FROZEN_CASE_SPEC_AND_RED_TEST_FROM_EXISTING_DIAGNOSTIC');
 assert.equal(r.repeat_prior_ci_dispatch_permitted,false);
 assert.equal(r.case_specific_frozen_red_verified,false);
 assert.equal(r.claim_created,false);
 assert.equal(r.handler_invoked,false);
 assert.equal(r.installation_authorized,false);
 assert.equal(r.original_job_completed,false);
});
test('PR308 verified RED is not proof for PR307 or its source identity',()=>{
 const r=routeExistingSignedCaseCiForRecovery({contractProposal:candidate,
  maintenanceLedger:ledger()});
 assert.equal(r.frozen_test_receipt_sha256,null);
 const missing=routeExistingSignedCaseCiForRecovery({contractProposal:candidate,
  maintenanceLedger:ledger([sibling])});
 assert.equal(missing.status,'RECOVERY_CASE_CI_SOURCE_AMBIGUOUS_OR_UNREGISTERED');
});
test('same signed source but wrong maintenance scope cannot inherit warrant',()=>{
 const l=ledger();l.active_maintenance_warrant.source_scope=
  [warrant(sibling)];
 const r=routeExistingSignedCaseCiForRecovery({contractProposal:candidate,
  maintenanceLedger:l});
 assert.equal(r.status,'RECOVERY_EXISTING_CASE_CI_EXACT_WARRANT_OR_BASELINE_MISSING');
 assert.equal(r.handler_invoked,false);
});
test('already verified frozen RED only triggers independent contract reconciliation',()=>{
 const done={...item,frozen_reproduction_verified:true,
  independent_frozen_test_receipt_sha256:sha('5')};
 const r=routeExistingSignedCaseCiForRecovery({contractProposal:candidate,
  maintenanceLedger:ledger([done])});
 assert.equal(r.status,
  'RECOVERY_EXISTING_CASE_SPECIFIC_CI_SOURCE_PROOF_NEEDS_CONTRACT_RECONCILIATION');
 assert.equal(r.case_specific_frozen_red_verified,false);
 assert.equal(r.original_job_completed,false);
});
test('uncertain completed CI needs independent provider reconciliation not dispatch',()=>{
 const pending={...item,ci_independent_diagnostic_receipt_sha256:null};
 const r=routeExistingSignedCaseCiForRecovery({contractProposal:candidate,
  maintenanceLedger:ledger([pending])});
 assert.equal(r.status,'RECOVERY_COMPLETED_CI_CLAIM_INDEPENDENT_OUTCOME_UNVERIFIED');
 assert.equal(r.repeat_prior_ci_dispatch_permitted,false);
 assert.equal(r.next_governed_action,
  'RECONCILE_SIGNED_CASE_CI_PROVIDER_OUTCOME_NO_REPLAY');
});
test('unclaimed signed CI action still needs exact claim and frozen-case specification',()=>{
 const notClaimed={...item,signed_executor_state:null,
  signed_executor_action:null,ci_dispatch_receipt_sha256:null,
  ci_independent_diagnostic_receipt_sha256:null};
 const r=routeExistingSignedCaseCiForRecovery({contractProposal:candidate,
  maintenanceLedger:ledger([notClaimed])});
 assert.equal(r.status,'RECOVERY_EXISTING_SIGNED_CI_RUNNER_REQUIRES_ATOMIC_CLAIM');
 assert.equal(r.signed_claim_required,true);
 assert.equal(r.claim_created,false);
 assert.equal(r.handler_invoked,false);
});
test('reject readback from another owner and duplicate source rows',()=>{
 const mismatch=routeExistingSignedCaseCiForRecovery({contractProposal:candidate,
  maintenanceLedger:{...ledger(),owner_id:'11111111-1111-4111-8111-111111111111'}});
 assert.equal(mismatch.status,'RECOVERY_EXISTING_MAINTENANCE_WARRANT_READBACK_REQUIRED');
 const duplicate=routeExistingSignedCaseCiForRecovery({contractProposal:candidate,
  maintenanceLedger:ledger([item,{...item}])});
 assert.equal(duplicate.status,'RECOVERY_CASE_CI_SOURCE_AMBIGUOUS_OR_UNREGISTERED');
});
test('existing signed worker routes from actual owner maintenance ledger, no extra executor',()=>{
 const src=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',
  import.meta.url),'utf8');
 assert.match(src,/routeExistingSignedCaseCiForRecovery/);
 assert.match(src,/reality_read_owner_internal_maintenance_v1/);
 assert.match(src,/final_loop_existing_case_ci_recovery:finalLoopExistingCaseCiRecovery/);
 assert.ok(src.indexOf("workerStage='FINAL_LOOP_EXISTING_CASE_CI_RECOVERY_CLASSIFICATION'")>
  src.indexOf("workerStage='SHARED_CONTINUITY_VERIFIER_RETURN_FENCE'"));
 assert.ok(src.indexOf("workerStage='FINAL_LOOP_EXISTING_CASE_CI_RECOVERY_CLASSIFICATION'")<
  src.indexOf("workerStage='WORKER_RESPONSE_PUBLICATION'"));
});

test('terminal evidence route reuses only completed diagnostic and exact event; never leases another attempt',()=>{
 const t={...candidate.contract_candidate,qualifier_receipt_sha256:sha('8'),next_qualified_action:'QUALIFY_DISTINCT_RECOVERY_EVIDENCE_AND_EXACT_BUDGET_NO_REPLAY'};
 const proposal={status:'RECOVERY_EXISTING_TERMINAL_BUILDER_REQUALIFICATION_REQUIRED',read_only:true,contract_candidate:null,terminal_requalification:t,previous_attempt_budget_preserved:true,repeat_prior_ci_dispatch_permitted:false};
 const trigger={status:'FINAL_LOOP_GOVERNED_TRIGGER_TERMINAL_EVIDENCE_REQUALIFICATION_DUE',evidence_readback_permitted:true,dispatch_permitted:false,execution_authorized_by_trigger:false,new_attempt_authorized:false,previous_attempt_budget_preserved:true,repeat_prior_ci_dispatch_permitted:false,owner_id:owner,shift_id:shift,original_work_id:work,source_ref:source,continuity_root_id:root,qualifier_receipt_sha256:sha('8')};
 const read=(resumeTrigger,maintenanceLedger=ledger())=>routeExistingSignedCaseCiForRecovery({contractProposal:proposal,resumeTrigger,maintenanceLedger});
 const r=read(trigger);assert.equal(r.status,'RECOVERY_TERMINAL_EXISTING_CI_DIAGNOSTIC_READBACK_READY');assert.equal(r.contract_id,null);assert.equal(r.new_attempt_authorized,false);assert.equal(r.claim_created,false);assert.equal(r.repeat_prior_ci_dispatch_permitted,false);
 for(const invalid of [undefined,{...trigger,new_attempt_authorized:true},{...trigger,qualifier_receipt_sha256:sha('7')},{...trigger,original_work_id:'work:'+'f'.repeat(32)}])assert.notEqual(read(invalid).status,r.status);
 assert.notEqual(read(trigger,ledger([{...item,signed_executor_state:'PENDING'}])).status,r.status);
});
