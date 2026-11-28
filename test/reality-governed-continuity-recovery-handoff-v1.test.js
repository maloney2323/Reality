import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyRealityContinuityRecoveryHandoff as classify}
 from '../src/reality-governed-continuity-evidence-classifier-v1.js';

const owner='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const shift='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const incident='cccccccc-cccc-4ccc-cccc-cccccccccccc';
const sha=n=>'sha256:'+n.repeat(64);
const investigated={
 incident_id:incident,shift_id:shift,
 kind:'SIGNED_GOVERNED_TRANSITION_STALLED',
 phase:'INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF',
 proposed_upgrade:'[GOVERNED_ACTION:REQUEST_EXACT_OWNER_APPROVAL][BLOCKER_CLASS:MISSING_OWNER_AUTHORITY] Independently check the provider state',
 investigation_receipt_sha256:sha('a'),
 recovery_receipt_sha256:null,recovered_at:null
};
const incidentLedger=(items=[investigated])=>({
 status:'OWNER_SHIFT_CONTINUITY_INCIDENTS_READ_ONLY',owner_id:owner,
 owner_scope_verified:true,read_only:true,execution_authorized:false,
 installation_authorized:false,production_changed:false,
 count:items.length,items
});
const actionLedger=(items=[])=>({
 status:'OWNER_SIGNED_SHIFT_RECOVERY_ACTIONS_READ_ONLY',owner_id:owner,
 owner_scope_verified:true,read_only:true,execution_authorized:false,
 installation_authorized:false,production_changed:false,
 count:items.length,items
});
const call=(incidents=incidentLedger(),actions=actionLedger())=>
 classify({ownerId:owner,shiftId:shift,
  incidentsReadback:incidents,actionsReadback:actions});

test('diagnosis is only a diagnosis; no permission or completed repair is inferred',()=>{
 const got=call();
 assert.equal(got.status,'GOVERNED_RECOVERY_DURABLE_HANDOFFS_CLASSIFIED');
 assert.equal(got.count,1);
 assert.equal(got.items[0].continuity_state,
  'DIAGNOSIS_RECORDED_CORRECTIVE_ACTION_UNVERIFIED');
 assert.equal(got.items[0].proposed_action,'REQUEST_EXACT_OWNER_APPROVAL');
 assert.equal(got.items[0].next_governed_action,
  'VERIFY_PROVIDER_AUTHORITY_BEFORE_EXACT_OWNER_REQUEST');
 for(const key of ['action_dispatched','repair_executed',
  'independent_repair_verified','original_job_completed',
  'installation_authorized','owner_approval_granted','production_changed'])
  assert.equal(got[key],false);
 assert.equal(got.items[0].execution_permitted_by_classification,false);
});

test('a signed action receipt without independent review never becomes verified repair',()=>{
 const a={incident_id:incident,shift_id:shift,
  kind:investigated.kind,incident_phase:investigated.phase,
  action_receipt_sha256:sha('b'),action_independently_rechecked:false,
  independent_review_receipt_sha256:null,
  original_job_completed:false,installation_authorized:false,
  production_changed:false};
 const got=call(incidentLedger(),actionLedger([a]));
 assert.equal(got.items[0].continuity_state,
  'GOVERNED_ACTION_RECORDED_INDEPENDENT_REVIEW_PENDING');
 assert.equal(got.items[0].next_governed_action,
  'WAIT_FOR_DISTINCT_INDEPENDENT_ACTION_REVIEW');
 assert.equal(got.items[0].repair_verified_by_classification,false);
});

test('independent source requalification does not settle the original business job',()=>{
 const changed={...investigated,kind:'SIGNED_SHIFT_REPEATED_NO_PROGRESS',
  proposed_upgrade:'[GOVERNED_ACTION:REQUALIFY_EXISTING_CONTINUITY_SOURCE][BLOCKER_CLASS:MISSING_SOURCE_EVIDENCE] Recheck current authenticated sources'};
 const a={incident_id:incident,shift_id:shift,kind:changed.kind,
  incident_phase:changed.phase,action_receipt_sha256:sha('c'),
  action_independently_rechecked:true,
  independent_review_receipt_sha256:sha('d'),
  owner_next_action:'EXACT_OWNER_SOURCE_SCOPE_AND_ITEMIZED_BUSINESS_WARRANT_REQUIRED_IN_CHAT',
  original_job_completed:false,installation_authorized:false,
  production_changed:false};
 const got=call(incidentLedger([changed]),actionLedger([a]));
 assert.equal(got.items[0].continuity_state,
  'GOVERNED_ACTION_INDEPENDENTLY_REVIEWED_ORIGINAL_UNSETTLED');
 assert.equal(got.items[0].next_governed_action,a.owner_next_action);
 assert.equal(got.items[0].original_job_completed,false);
 assert.equal(got.original_job_completed,false);
});

test('recorded recovery still requires independent original settlement',()=>{
 const got=call(incidentLedger([{...investigated,
  recovered_at:'2026-11-22T12:00:00Z',recovery_receipt_sha256:sha('e')}]));
 assert.equal(got.items[0].continuity_state,
  'INCIDENT_RECOVERY_RECEIPTED_ORIGINAL_SETTLEMENT_UNVERIFIED');
 assert.equal(got.items[0].next_governed_action,
  'VERIFY_ORIGINAL_JOB_SETTLEMENT_INDEPENDENTLY');
 assert.equal(got.original_job_completed,false);
});

test('untrusted owner, foreign shift, forged review and wrong receipt all fail closed',()=>{
 assert.equal(classify({ownerId:'bad',shiftId:shift,
  incidentsReadback:incidentLedger(),actionsReadback:actionLedger()}).count,0);
 assert.equal(call({...incidentLedger(),owner_id:'another-owner'}).status,
  'GOVERNED_RECOVERY_DURABLE_READBACK_UNVERIFIED');
 assert.equal(call(incidentLedger([{...investigated,
  shift_id:'dddddddd-dddd-4ddd-dddd-dddddddddddd'}])).count,0);
 const bad={incident_id:incident,shift_id:shift,kind:investigated.kind,
  incident_phase:investigated.phase,action_receipt_sha256:sha('f'),
  action_independently_rechecked:true,independent_review_receipt_sha256:null,
  original_job_completed:false,installation_authorized:false,
  production_changed:false};
 assert.equal(call(incidentLedger(),actionLedger([bad])).status,
  'GOVERNED_RECOVERY_ACTION_RECEIPT_UNVERIFIED');
 assert.equal(call(incidentLedger(),actionLedger([{...bad,
  action_independently_rechecked:false,installation_authorized:true}])).status,
  'GOVERNED_RECOVERY_ACTION_LINEAGE_UNVERIFIED');
});

test('different genuine blocker labels remain data-driven without job or provider exceptions',()=>{
 for(const [kind,action,blocker] of [
  ['INTEGRATION_FAILURE','VERIFY_INSTALLED_EXECUTOR','MISSING_EXECUTOR_ADAPTER'],
  ['CAPABILITY_DEFECT','RUN_INDEPENDENT_FROZEN_TEST','CAPABILITY_DEFECT'],
  ['AUTH_SCOPE_DEFICIT','REQUEST_EXACT_OWNER_APPROVAL','MISSING_OWNER_AUTHORITY'],
  ['ORIGINAL_LINEAGE_GAP','REQUALIFY_EXISTING_CONTINUITY_SOURCE','MISSING_SOURCE_EVIDENCE']
 ]){
  const got=call(incidentLedger([{...investigated,kind,
   proposed_upgrade:`[GOVERNED_ACTION:${action}][BLOCKER_CLASS:${blocker}] Source-backed diagnosis`}]));
  assert.equal(got.items[0].proposed_action,action);
  assert.equal(got.items[0].blocker_class,blocker);
  assert.equal(got.items[0].original_job_completed,false);
  assert.equal(got.items[0].execution_permitted_by_classification,false);
 }
});

test('an owner\'s historical action receipts are ignored for the active shift',()=>{
 const prior={incident_id:'eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee',
  shift_id:'ffffffff-ffff-4fff-ffff-ffffffffffff',
  kind:'HISTORICAL_RECOVERY',incident_phase:'INVESTIGATION_RECORDED_NEEDS_INDEPENDENT_PROOF',
  action_receipt_sha256:sha('a'),action_independently_rechecked:true,
  independent_review_receipt_sha256:sha('b'),
  original_job_completed:false,installation_authorized:false,
  production_changed:false};
 const got=call(incidentLedger(),actionLedger([prior]));
 assert.equal(got.status,'GOVERNED_RECOVERY_DURABLE_HANDOFFS_CLASSIFIED');
 assert.equal(got.count,1);
 assert.equal(got.items[0].continuity_state,
  'DIAGNOSIS_RECORDED_CORRECTIVE_ACTION_UNVERIFIED');
 assert.equal(got.original_job_completed,false);
});

test('returned unresolved invocation routes through existing investigator without claiming or replaying work',()=>{
 const worker=readFileSync(new URL('../api/reality/governed-employee-shift-worker.js',import.meta.url),'utf8');
 const sql=readFileSync(new URL('../sql/reality-final-loop-blocker-incident-handoff-v1.sql',import.meta.url),'utf8');
 const start=worker.indexOf('const unresolvedInvocationInvestigationDue=');
 const route=worker.slice(start,worker.indexOf('let finalLoopParentIntegration=',start));
 assert.ok(start>0);
 assert.match(route,/FINAL_LOOP_CANONICAL_UNRESOLVED_INVOCATION_RECOVERY_REQUIRED_NO_CLAIM/);
 assert.match(route,/QUALIFY_DISTINCT_RECOVERY_EVIDENCE_AND_EXACT_BUDGET_NO_REPLAY/);
 assert.match(route,/reality_observe_signed_shift_no_progress_v1/);
 assert.match(route,/FINAL_LOOP_UNRESOLVED_INVOCATION_INVESTIGATION_REQUIRED/);
 assert.match(route,/investigateOneSignedShiftContinuityIncident/);
 assert.doesNotMatch(route,/reality_claim_final_loop_child_review_v1|runIsolatedAdvisory/);
 const branch=sql.slice(sql.indexOf('-- Re-read current canonical evidence'),sql.indexOf('evidence:=pg_catalog.jsonb_build_object'));
 for(const required of ['FINAL_LOOP_SHARED_CONTINUITY_CHECKED','SIGNED_INVOCATION_OBSERVATIONS_RETURNED_ORIGINAL_OPEN',
  'canonical_return_committed','replay_authorized','model_artifact_recorded','provider_outcome_verified',
  'invocation_observation_sha256','FINAL_LOOP_UNRESOLVED_INVOCATION_SOURCE_UNVERIFIED']){
  assert.ok(branch.includes(required),required);
 }
 assert.match(sql,/previous_attempt_budget_preserved',true,'new_attempt_authorized',false/);
 assert.doesNotMatch(branch,/UPDATE reality_internal\.final_loop_child_review_work_v1|INSERT INTO reality_internal\.final_loop_child_review_work_v1/);
});
