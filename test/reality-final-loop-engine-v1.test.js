import test from 'node:test';
import assert from 'node:assert/strict';
import {
 evaluateRealityFinalLoopEngine,REALITY_FINAL_LOOP_ENGINE_VERSION
} from '../src/reality-shift-unified-execution-controller-v1.js';

const owner='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const shift='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const root='cccccccc-cccc-4ccc-cccc-cccccccccccc';
const work1='work:'+'1'.repeat(32),work2='work:'+'2'.repeat(32);
const hash=x=>'sha256:'+x.repeat(64);
const time='2026-11-22T22:00:00Z';
const now='2026-11-22T22:01:00Z';
const issue=n=>'https://github.com/maloney2323/Reality/issues/'+n;
const pr=n=>'https://github.com/maloney2323/Reality/pull/'+n;
const jobs=[
 {source_step_index:2,source_ref:issue(300),original_kind:'REAL_ENGINEERING_REPAIR_ORIGINAL',
  phase:'SOURCE_ADMITTED',original_work_id:work1,
  next_governed_action:'GENERATE_AND_TEST_ORIGINAL',
  independent_source_proof_verified:true,source_proof_sha256:hash('a'),
  capability_installation_authorized:false,provider_effect_claimed_by_graph:false,
  original_job_completed_by_graph:false},
 {source_step_index:3,source_ref:pr(301),original_kind:'REAL_PR_REVIEW_ORIGINAL',
  phase:'PREPARED',original_work_id:work2,
  next_governed_action:'INDEPENDENTLY_REVIEW_ORIGINAL',
  independent_source_proof_verified:true,source_proof_sha256:hash('b'),
  capability_installation_authorized:false,provider_effect_claimed_by_graph:false,
  original_job_completed_by_graph:false}
];
const graph={
 status:'OWNER_SHIFT_UNIFIED_EXECUTION_GRAPH_VERIFIED',owner_id:owner,shift_id:shift,
 plan_fingerprint:hash('c'),completion_bound:true,selected_sources:2,
 execution_scope_from_owner_warrant_only:true,new_job_created:false,
 installation_authorized:false,original_job_completed_by_graph:false,
 production_changed:false,jobs
};
const proof=(item)=>({
 original_work_id:item.original_work_id,source_ref:item.source_ref,
 acceptance_contract_sha256:hash('d'),continuity_head_sha256:hash('e'),
 ledger_revision:1,original_settled:false,
 evidence:{independently_verified:true,receipt_sha256:hash('f'),observed_at:time},
 authority:{status:'EXACT_WARRANT_VERIFIED',owner_id:owner,
  original_work_id:item.original_work_id,acceptance_contract_sha256:hash('d'),
  independently_verified:true,receipt_sha256:hash('0'),claim_consumed:false,
  permitted_effects:['READ','PREPARE'],requested_effects:['READ']},
 capacity:{status:'SIGNED_WORKER_HANDLER_ATTESTED',independently_attested:true,
  receipt_sha256:hash('1'),scheduled_worker_observed:true},
 outcome:{status:'NOT_VERIFIED'},universe:{independently_reconciled:false},
 blocker:null
});
const ledger=(ps=jobs.map(proof))=>({
 status:'OWNER_SHIFT_FINAL_LOOP_LEDGER_INDEPENDENT_READ',
 read_only:true,independent_owner_scope_verified:true,owner_id:owner,
 shift_id:shift,plan_fingerprint:hash('c'),
 continuity_root_id:root,head_sha256:hash('e'),
 acceptance_contract_sha256:hash('d'),acceptance_frozen:true,
 owner_acceptance_verified:true,revision:1,observed_at:time,
 installation_authorized:false,production_changed:false,jobs:ps
});
const run=(l=ledger(),g=graph,extras={})=>
 evaluateRealityFinalLoopEngine({graph:g,ledger:l,now,...extras});

test('Final Loop Engine is bound to existing unified shift, not a new worker or warrant',()=>{
 const r=run();
 assert.equal(r.schema,REALITY_FINAL_LOOP_ENGINE_VERSION);
 assert.equal(r.status,'CANONICAL_FINAL_LOOP_DECISIONS_READY');
 assert.deepEqual(r.decisions.map(x=>x.decision),['ADVANCE','ADVANCE']);
 assert.equal(r.decisions[0].next_governed_action,
  'CLAIM_ONE_USE_GOVERNED_EXECUTION_FOR_SAME_ORIGINAL');
 assert.equal(r.decisions[0].execution_authorized_by_engine,false);
 assert.equal(r.decisions[0].atomic_service_transition_required,true);
 assert.equal(r.canonical_ledger_mutated,false);
 assert.equal(r.all_selected_settled,false);
 assert.equal(r.shift_completed,false);
});

test('missing ledger cannot create original authority or an execution path',()=>{
 const r=run(null);
 assert.equal(r.status,'CANONICAL_LEDGER_UNVERIFIED');
 assert.deepEqual(r.decisions.map(x=>x.decision),['SUSPEND','SUSPEND']);
 assert.equal(r.installation_authorized,false);
});

test('one job can recover without blocking unrelated ready job',()=>{
 const p=jobs.map(proof);
 p[0].blocker={status:'FROZEN_REPRODUCED',independently_attested:true,
  receipt_sha256:hash('5'),provider_effect_uncertain:false,
  recovery_permitted_without_new_authority:true};
 const r=run(ledger(p));
 assert.deepEqual(r.decisions.map(x=>x.decision),['RECOVER','ADVANCE']);
 assert.equal(r.decisions[0].original_work_id,work1);
 assert.equal(r.decisions[1].original_work_id,work2);
 assert.equal(r.all_selected_settled,false);
});

test('uncertain provider effects are fenced, never automatically retried',()=>{
 const p=jobs.map(proof);
 p[0].blocker={status:'PROVIDER_EFFECT_UNCERTAIN',
  independently_attested:true,receipt_sha256:hash('6'),
  provider_effect_uncertain:true,recovery_permitted_without_new_authority:true};
 const r=run(ledger(p));
 assert.equal(r.decisions[0].decision,'SUSPEND');
 assert.equal(r.decisions[0].next_governed_action,
  'RECONCILE_PROVIDER_EFFECT_WITHOUT_REPLAY');
 assert.equal(r.decisions[0].retry_external_effects_authorized,false);
 assert.equal(r.decisions[1].decision,'ADVANCE');
});

test('unattested blocker is not an invented capability gap',()=>{
 const p=jobs.map(proof);
 p[0].blocker={status:'SOME_PROBLEM',independently_attested:false};
 assert.equal(run(ledger(p)).decisions[0].decision,'REFRESH');
});

test('capability acquisition remains gated on independent missing-capacity evidence',()=>{
 const p=jobs.map(proof);
 p[0].capacity={status:'INDEPENDENT_CAPABILITY_MISSING',
  independently_attested:true,receipt_sha256:hash('9')};
 const r=run(ledger(p));
 assert.equal(r.decisions[0].decision,'RECOVER');
 assert.equal(r.decisions[0].next_governed_action,
  'QUALIFY_MISSING_CAPABILITY_WITH_EXISTING_GOVERNED_ENGINE');
 assert.equal(r.decisions[0].installation_authorized,false);
 p[0].capacity={status:'INDEPENDENT_CAPABILITY_MISSING',
  independently_attested:false,receipt_sha256:hash('9')};
 assert.equal(run(ledger(p)).decisions[0].decision,'REFRESH');
});

test('authority cannot widen the approved effect scope',()=>{
 const p=jobs.map(proof);
 p[0].authority.requested_effects=['INSTALL_PREVIEW'];
 const r=run(ledger(p));
 assert.equal(r.decisions[0].decision,'SUSPEND');
 assert.equal(r.decisions[0].new_authority_granted,false);
});

test('outcome receipt is not settlement until independent Universe reconciliation',()=>{
 const p=jobs.map(proof);
 p[0].outcome={status:'INDEPENDENT_FINAL_VERIFIED',
  verifier_independent:true,original_work_id:work1,
  acceptance_contract_sha256:hash('d'),receipt_sha256:hash('a')};
 let r=run(ledger(p));
 assert.equal(r.decisions[0].decision,'ADVANCE');
 assert.equal(r.decisions[0].next_governed_action,
  'RECONCILE_INDEPENDENT_ORIGINAL_RECEIPT_TO_UNIVERSE');
 p[0].universe={independently_reconciled:true,receipt_sha256:hash('b'),
  original_work_id:work1,outcome_receipt_sha256:hash('a')};
 r=run(ledger(p));
 assert.equal(r.decisions[0].decision,'SETTLE');
 assert.equal(r.decisions[0].independent_settlement_committed,false);
 assert.equal(r.decisions[0].original_job_completed,false);
 assert.equal(r.all_selected_settled,false);
 assert.equal(r.all_originals_independently_settlement_eligible,false);
});

test('independent final receipt from another original or acceptance contract cannot settle',()=>{
 const p=jobs.map(proof);
 p[0].outcome={status:'INDEPENDENT_FINAL_VERIFIED',
  verifier_independent:true,original_work_id:work2,
  acceptance_contract_sha256:hash('d'),receipt_sha256:hash('a')};
 p[0].universe={independently_reconciled:true,receipt_sha256:hash('b')};
 assert.equal(run(ledger(p)).decisions[0].decision,'SUSPEND');
 p[0].outcome.original_work_id=work1;
 p[0].outcome.acceptance_contract_sha256=hash('f');
 assert.equal(run(ledger(p)).decisions[0].decision,'SUSPEND');
});

test('foreign Universe return cannot settle and already settled original is never re-issued',()=>{
 const p=jobs.map(proof);
 p[0].outcome={status:'INDEPENDENT_FINAL_VERIFIED',
  verifier_independent:true,original_work_id:work1,
  acceptance_contract_sha256:hash('d'),receipt_sha256:hash('a')};
 p[0].universe={independently_reconciled:true,receipt_sha256:hash('b'),
  original_work_id:work2,outcome_receipt_sha256:hash('a')};
 assert.equal(run(ledger(p)).decisions[0].decision,'ADVANCE');
 p[0].universe.original_work_id=work1;
 p[0].original_settled=true;
 const r=run(ledger(p));
 assert.equal(r.decisions[0].decision,'SUSPEND');
 assert.equal(r.decisions[0].next_governed_action,
  'INDEPENDENTLY_READ_PREVIOUS_ATOMIC_SETTLEMENT_NO_REPLAY');
 assert.equal(r.decisions[0].original_job_completed,false);
});

test('stale source evidence or changed causal head leads to REFRESH, not replay',()=>{
 const p=jobs.map(proof);
 p[0].evidence.observed_at='2026-11-22T21:40:00Z';
 assert.equal(run(ledger(p)).decisions[0].decision,'REFRESH');
 const checkpoint={shift_id:shift,acceptance_contract_sha256:hash('d'),
  head_sha256:hash('f'),revision:1};
 const r=run(ledger(),graph,{previousCheckpoint:checkpoint});
 assert.deepEqual(r.decisions.map(x=>x.decision),['REFRESH','REFRESH']);
});

test('foreign, duplicate, or rewritten originals are rejected without action',()=>{
 const p=jobs.map(proof);
 p[1].original_work_id=work1;
 assert.equal(run(ledger(p)).status,'CANONICAL_LEDGER_UNVERIFIED');
 const x=jobs.map(proof);
 x[0].acceptance_contract_sha256=hash('a');
 assert.equal(run(ledger(x)).status,'CANONICAL_LEDGER_UNVERIFIED');
 const y=jobs.map(proof);
 y[0].source_ref=issue(999);
 assert.equal(run(ledger(y)).status,'CANONICAL_LEDGER_UNVERIFIED');
});

test('no original is created for a source pending admission',()=>{
 const g={...graph,jobs:[{...jobs[0],original_work_id:null,
  original_kind:'SOURCE_REVIEW_NOT_YET_AN_EXECUTABLE_ORIGINAL',phase:'NOT_ADMITTED'}],
  selected_sources:1};
 const r=run(ledger([]),g);
 assert.equal(r.decisions[0].decision,'SUSPEND');
 assert.equal(r.decisions[0].next_governed_action,'QUALIFY_CANONICAL_ORIGINAL_WORK');
 assert.equal(r.decisions[0].original_job_completed,false);
});

test('all independently proven jobs request settlement but are not declared settled',()=>{
 const p=jobs.map(proof);
 for(const x of p){
  x.outcome={status:'INDEPENDENT_FINAL_VERIFIED',verifier_independent:true,
   original_work_id:x.original_work_id,
   acceptance_contract_sha256:hash('d'),receipt_sha256:hash('a')};
  x.universe={independently_reconciled:true,receipt_sha256:hash('b'),
   original_work_id:x.original_work_id,outcome_receipt_sha256:hash('a')};
 }
 const r=run(ledger(p));
 assert.equal(r.all_originals_independently_settlement_eligible,true);
 assert.deepEqual(r.decisions.map(x=>x.decision),['SETTLE','SETTLE']);
 assert.equal(r.shift_completed,false);
});
