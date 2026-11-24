// Frozen PR307-linked Recovery-handoff regression. This does NOT attest that
// PR307's missing business-original admission, or its separate case RED, passed.
// Execute these SAME bytes against the previous faulty worker policy (RED)
// and the corrected policy (GREEN) in isolated GitHub Actions worktrees.
import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyFinalLoopBlockerLiveness as classify}
 from '../../src/reality-final-loop-blocker-liveness-v1.js';
const sha=x=>'sha256:'+x.repeat(64);
const owner='85eeae0b-2988-43c4-b20c-590fb51da70d';
const shift='ee80b4d8-0546-4269-9cfc-7bf6cb2b97ce';
const obligation='work:315562fe1bd66b30a48bb9be4f1d162a';
const source='https://github.com/maloney2323/Reality/pull/307';
const proposal={status:'RECOVERY_PROOF_CONTRACT_CANDIDATE_NEEDS_DURABLE_FREEZE',
 read_only:true,contract_candidate:{
  contract_id:sha('a'),owner_id:owner,shift_id:shift,
  obligation_id:obligation,source_ref:source,ledger_freeze_verified:false
 }};
const route={status:'RECOVERY_COMPLETED_CI_CLAIM_INDEPENDENT_OUTCOME_UNVERIFIED',
 owner_id:owner,shift_id:shift,obligation_id:obligation,source_ref:source,
 contract_id:sha('a'),original_job_completed:false,
 installation_authorized:false,production_changed:false};
const inputs=(r=route,other={})=>({
 contractProposal:proposal,existingCiRoute:r,
 signedRecovery:{status:'RECOVERY_CAPABILITY_ACQUISITION_REQUIRED'},...other
});
test('PR307 recovery frozen RED: reconcile completed uncertain provider action before attempting new capability acquisition',()=>{
 const result=classify(inputs());
 assert.equal(result.status,'RECOVERY_INDEPENDENT_PROVIDER_RECONCILIATION_DUE',
  'uncertain completed CI must be independently reconciled BEFORE acquisition');
 assert.equal(result.next_actor,'REALITY');
 assert.equal(result.next_governed_action,
  'RECONCILE_SIGNED_CASE_CI_PROVIDER_OUTCOME_NO_REPLAY');
 assert.equal(result.repeat_prior_ci_dispatch_permitted,false);
 assert.equal(result.event_dispatched,false);
 assert.equal(result.original_job_completed,false);
});
test('PR307 signed diagnostic with verified no-RED evidence requires distinct frozen-case acquisition',()=>{
 const r={...route,status:
  'RECOVERY_REUSE_VERIFIED_CI_DIAGNOSTIC_FROZEN_CASE_SPEC_MISSING',
  prior_diagnostic_verified:true,
  existing_diagnostic_receipt_sha256:sha('d'),
  repeat_prior_ci_dispatch_permitted:false,
  case_specific_frozen_red_verified:false};
 const result=classify(inputs(r));
 assert.equal(result.status,'RECOVERY_AUTONOMOUS_CASE_SPEC_ACQUISITION_DUE');
 assert.equal(result.next_actor,'REALITY');
 assert.equal(result.capability_execution_ready,false);
 assert.equal(result.original_job_completed,false);
});
test('PR307 wrong original or source cannot inherit a prior CI receipt',()=>{
 const result=classify(inputs({...route,
  source_ref:'https://github.com/maloney2323/Reality/pull/308'}));
 assert.equal(result.status,'RECOVERY_EXISTING_CI_IDENTITY_UNVERIFIED');
 assert.equal(result.original_job_completed,false);
 assert.equal(result.event_dispatched,false);
});
test('PR307 hard recovery budget stops execution but retains original obligation',()=>{
 const result=classify(inputs(route,{
  budgetState:{status:'RECOVERY_BUDGET_EXHAUSTED'}}));
 assert.equal(result.status,'RECOVERY_EXPLICIT_HARD_BUDGET_BOUNDARY');
 assert.equal(result.obligation_id,obligation);
 assert.equal(result.original_obligation_open,true);
 assert.equal(result.execution_authorized,false);
 assert.equal(result.manual_restart_required,false);
});
