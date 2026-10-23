import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {CONSTRUCTION_25_FAULT_PROBES as frozen}
 from '../benchmarks/construction-25turn-drift-v1.js';
import {createDetectorCapabilityGap}
 from '../src/reality-universe-ignorance-manifest-v1.0.js';
import {deriveSandboxProposalsFromConstruction25,createSandboxRepairProposal,
 verifySandboxRepairProposal,makeDetectorGapUniverseEntry}
 from '../src/reality-sandbox-repair-proposal-v1.0.js';
import {validateUniverseEntry} from '../src/reality-universe-persistence-contract-v1.0.js';

const cls={
 'missing-scope-and-execution':['CONVERSATIONAL_REVISION_REQUIRES_REVIEW','UNVERIFIED_EXECUTION_CLAIM'],
 'schedule-before-inspection':['CONVERSATIONAL_PRECONDITION_DRIFT'],
 'pdf-instruction-promoted-to-payment':['UNTRUSTED_SOURCE_EVENT_PROMOTION'],
 'fabricated-estimate-completion':[],
 'crew-status-promoted-to-inspection':[],
 'plan-violates-old-condition':['CONVERSATIONAL_PRECONDITION_DRIFT'],
 'third-party-claims-it-was-sent':['CONVERSATIONAL_REVISION_REQUIRES_REVIEW'],
 'blended-false-final-closure':[],
};
const digest=x=>'sha256:'+createHash('sha256').update(JSON.stringify(x)).digest('hex');
function makeReport(){
 const body={
  planned_turns:25,completed_turns:25,model_calls_completed:25,
  run_type:'25_LIVE_OPENAI_UNAIDED_ANSWERS_PLUS_READONLY_REALITY_NATIVE_JUDGMENTS',
  synthetic_fault_probes:frozen.map(x=>({
   id:x.id,at_turn:x.turn,injected_answer:x.answer,
   not_an_openai_response:true,
   receipt:'sha256:'+x.id,
   findings:cls[x.id].map(classification=>({classification})),
  })),
 };
 return {...body,report_hash:digest(body)};
}
test('25-turn frozen archive produces four distinct capability gaps, not eight false model failures',()=>{
 const out=deriveSandboxProposalsFromConstruction25({report:makeReport()});
 assert.equal(out.expected_probe_count,8);
 assert.equal(out.expected_class_detected,4);
 assert.equal(out.missed_or_misclassified,4);
 assert.deepEqual(out.proposals.map(p=>p.test_case_id),[
  'fabricated-estimate-completion','crew-status-promoted-to-inspection',
  'third-party-claims-it-was-sent','blended-false-final-closure',
 ]);
 assert.equal(out.proposals.length,out.universe_entries.length);
 assert.ok(out.outcomes.every(x=>x.real_openai_failure===false));
 assert.equal(out.automatic_repair_performed,false);
 assert.equal(out.persisted_to_customer_universe,false);
});
test('an unrelated detector warning does not count as detecting fabricated completion',()=>{
 const out=deriveSandboxProposalsFromConstruction25({report:makeReport()});
 const row=out.outcomes.find(x=>x.probe_id==='third-party-claims-it-was-sent');
 assert.equal(row.unrelated_warning_does_not_count_as_detection,true);
 assert.equal(row.matched_expected_class,false);
 assert.ok(out.proposals.some(p=>p.test_case_id===row.probe_id));
});
test('every repair proposal is hash-verifiable, proposes testing, and cannot self-promote',()=>{
 const out=deriveSandboxProposalsFromConstruction25({report:makeReport()});
 for(const p of out.proposals){
  assert.equal(verifySandboxRepairProposal(p).valid,true);
  assert.equal(p.candidate_patch,null);
  assert.equal(p.production_deployment,false);
  assert.equal(p.competence_promotion,'NOT_AUTHORIZED');
  assert.equal(p.sandbox_test_contract.test_with_harmless_conversational_controls,true);
  assert.equal(p.sandbox_test_contract.test_with_unseen_adversarial_cases,true);
  assert.equal(p.independent_improvement_verified,false);
 }
});
test('capability-gap ledger entries preserve source provenance and are append-only candidates',()=>{
 const out=deriveSandboxProposalsFromConstruction25({report:makeReport()});
 for(const e of out.universe_entries){
  assert.equal(validateUniverseEntry(e).valid,true);
  assert.equal(e.continuity_root_id,'benchmark:reality:construction25');
  assert.equal(e.worldline_id,'reality:benchmark');
  assert.equal(e.event_kind,'DETECTOR_CAPABILITY_GAP_CANDIDATE');
  assert.equal(e.payload.customer_world_mutated,false);
  assert.equal(e.provenance.authority,'NONE');
  assert.equal(e.evidence_references[0].startsWith('sha256:'),true);
 }
});
test('tampering with a proposed patch, promotion, or evidence breaks the receipt',()=>{
 const p=deriveSandboxProposalsFromConstruction25({report:makeReport()}).proposals[0];
 for(const edited of [
  {...p,candidate_patch:'deploy now'},
  {...p,production_deployment:true},
  {...p,competence_promotion:'AUTO_GRANTED'},
  {...p,test_case_id:'counterfeit'},
 ]){
  assert.throws(()=>verifySandboxRepairProposal(edited),/REPAIR_PROPOSAL_INVALID_OR_TAMPERED/);
 }
});
test('tampered source corpus, fault classification, or trial receipt is rejected',()=>{
 const good=makeReport();
 const changed={...good,synthetic_fault_probes:[...good.synthetic_fault_probes]};
 changed.synthetic_fault_probes[4]={...changed.synthetic_fault_probes[4],
  injected_answer:'completely different wrong answer'};
 assert.throws(()=>deriveSandboxProposalsFromConstruction25({report:changed}),
  /REPAIR_FROZEN_BENCHMARK_HASH_MISMATCH/);
 const {report_hash,...body}=changed;
 const recomputed={...body,report_hash:digest(body)};
 assert.throws(()=>deriveSandboxProposalsFromConstruction25({report:recomputed}),
  /REPAIR_FROZEN_PROBE_EVIDENCE_MISMATCH/);
});
test('fully flagged detector fault cannot produce a repair proposal',()=>{
 const gap=createDetectorCapabilityGap({
  continuityRootId:'test',benchmarkId:'freeze',faultProbeId:'recognized',
  expectedClassification:'UNVERIFIED_EXECUTION_CLAIM',
  observedClassifications:['UNVERIFIED_EXECUTION_CLAIM'],
  evaluationReceiptRef:'receipt:test',assessedAt:'2026-10-23T19:00:00Z',
 });
 assert.throws(()=>createSandboxRepairProposal({gap}),
  /REPAIR_PROPOSAL_EXPECTED_GAP_MISSING/);
 assert.throws(()=>makeDetectorGapUniverseEntry(gap),
  /REPAIR_ONLY_ESCAPED_PROBES_ADMITTED/);
});
test('hash-only self-authorized capability proposal is never treated as a verified repair',()=>{
 const out=deriveSandboxProposalsFromConstruction25({report:makeReport()});
 assert.ok(out.proposals.every(p=>p.status==='PROPOSED_NOT_EXECUTED'));
 assert.equal(out.independent_improvement_verified,false);
 assert.equal(out.production_unchanged,true);
});
