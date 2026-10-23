import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniverseEntry,validateUniverseEntry}
 from '../src/reality-universe-persistence-contract-v1.0.js';
import {createSandboxUniverseLedger}
 from '../src/reality-universe-closed-loop-v1.0.js';
import {
 proposeIntelligenceForm,intelligenceFormCandidateEntry,
 verifyIntelligenceFormLearning,intelligenceFormVerifiedEntry,
 selectLearningFormsForNextTurn,absorbClosedLoopMistakesIntoLearningForms,
} from '../src/reality-universe-intelligence-forms-v1.0.js';

const scope={continuity_root_id:'benchmark:fictional:learning',
 worldline_id:'reality:benchmark',owner_user_id:'fictional:owner',
 work_item_id:'job:WR-41',as_of:'2026-10-23T23:30:00Z'};
const at=scope.as_of;
const failure={
 classification:'UNVERIFIED_MATERIAL_FACT',
 model_source_ref:'model:actual-openai-response-example',
 observed_answer_span:'definitely at least 152 units onsite',
 proof_refs:[],reason:'Contradictory foreman counts cannot establish exact stock',
};
const answer='We definitely have definitely at least 152 units onsite.';
const output={
 turn:6,original_response_id:'actual-openai-response-example',
 original_answer:answer,original_findings:[failure],
};
function entry(id,kind,source,payload){
 return createUniverseEntry({
  entry_id:id,continuity_root_id:scope.continuity_root_id,
  worldline_id:scope.worldline_id,
  event_kind:kind,epistemic_kind:'OBSERVATION',
  assertion_time:at,effective_time:at,source_ref:source,
  payload,evidence_references:[],
  provenance:{source:'reality-universe-closed-loop-v1.0',
   owner_user_id:scope.owner_user_id,work_item_id:scope.work_item_id,
   authority:'NONE'},
 });
}
async function provenance(){
 const ledger=createSandboxUniverseLedger({trustedScope:scope});
 const first=entry('raw:e6','LLM_ORIGINAL_RESPONSE',
  'model:actual-openai-response-example',
  {text:answer,response_id:'actual-openai-response-example',stage:'INITIAL'});
 const checked=entry('verified:e6','LLM_CLAIM_VERIFICATION',
  'model:actual-openai-response-example',
  {stage:'INITIAL',model_response_ref:'model:actual-openai-response-example',
   findings:[failure]});
 await ledger.append(first);await ledger.append(checked);
 const result={...output,receipts:[
  {kind:'LLM_ORIGINAL_RESPONSE',entry_id:first.entry_id,
   hash:first.ledger_entry_hash,readback_verified:true},
  {kind:'LLM_CLAIM_VERIFICATION',entry_id:checked.entry_id,
   hash:checked.ledger_entry_hash,readback_verified:true},
 ]};
 return {result,readLedger:async id=>ledger.read(id),ledger};
}
const propose=async()=>({
 hypothesis:'The LLM promoted contradictory reported counts into certified physical stock.',
 generalization:'Treat attributed foreman counts as conflicting observations; require independently reconciled inventory before asserting verified on-hand units.',
 competence_coordinate:'construction.inventory.physical_state_grounding',
});
const proposed=()=>proposeIntelligenceForm({
 scope,origin:'LIVE_LLM_TURN',sourceTurnId:'6',
 sourceModelRef:'model:actual-openai-response-example',
 sourceTurnReceiptId:'raw:e6',sourceVerificationReceiptId:'verified:e6',
 failureClass:'UNVERIFIED_MATERIAL_FACT',
 competenceCoordinate:'construction.inventory.physical_state_grounding',
 hypothesis:'An LLM promoted conflicting counts into physical certainty.',
 proposedGeneralization:'Separate reported counts from independently reconciled inventory.',
});
function heldout(){
 return [
  {test_case_id:'h1',case_kind:'KNOWN_FAILURE_CLASS',receipt_ref:'independent:h1',baseline_pass:false,with_form_pass:true},
  {test_case_id:'h2',case_kind:'KNOWN_FAILURE_CLASS',receipt_ref:'independent:h2',baseline_pass:false,with_form_pass:true},
  {test_case_id:'h3',case_kind:'KNOWN_FAILURE_CLASS',receipt_ref:'independent:h3',baseline_pass:true,with_form_pass:true},
  {test_case_id:'c1',case_kind:'BENIGN_CONTROL',receipt_ref:'independent:c1',baseline_pass:true,with_form_pass:true},
  {test_case_id:'c2',case_kind:'BENIGN_CONTROL',receipt_ref:'independent:c2',baseline_pass:true,with_form_pass:true},
  {test_case_id:'c3',case_kind:'BENIGN_CONTROL',receipt_ref:'independent:c3',baseline_pass:true,with_form_pass:true},
 ];
}
const independentEvaluator={verify:async({form_id,trial,scope:s})=>({
 verified:true,independent:true,form_id,test_case_id:trial.test_case_id,
 receipt_ref:trial.receipt_ref,
 continuity_root_id:s.continuity_root_id,worldline_id:s.worldline_id,
 owner_user_id:s.owner_user_id,work_item_id:s.work_item_id,
})};
const independentAuthorityVerifier={verify:async({candidate_form_id,scope:s})=>({
 verified:true,independent:true,form_id:candidate_form_id,
 continuity_root_id:s.continuity_root_id,worldline_id:s.worldline_id,
 owner_user_id:s.owner_user_id,work_item_id:s.work_item_id,
 approved_for_advisory_learning:true,approval_receipt_ref:'approved:fictional',
})};
test('original saved underlying LLM and native detector evidence generates exactly one candidate learning form',async()=>{
 const {result,readLedger,ledger}=await provenance();
 let calls=0;
 const forms=await absorbClosedLoopMistakesIntoLearningForms({
  scope,turnResult:result,readLedger,
  generateHypothesis:async()=>{calls++;return propose();},at,
 });
 assert.equal(forms.length,1);assert.equal(calls,1);
 assert.equal(forms[0].candidate.state,'CANDIDATE');
 assert.equal(forms[0].candidate.origin,'LIVE_LLM_TURN');
 assert.equal(forms[0].candidate.verified_competence,false);
 assert.equal(forms[0].candidate.action_authority_granted,false);
 assert.equal(forms[0].automated_hypothesis_created,true);
 assert.equal(validateUniverseEntry(forms[0].universe_candidate_entry).valid,true);
 assert.equal(forms[0].universe_candidate_entry.event_kind,'INTELLIGENCE_FORM_CANDIDATE');
 await ledger.append(forms[0].universe_candidate_entry);
 const selected=selectLearningFormsForNextTurn({
  scope,competenceCoordinate:'construction.inventory.physical_state_grounding',
  verifiedUniverseEntries:await ledger.list(),
 });
 assert.equal(selected.length,0,'A candidate is not operationally verified learning');
});
test('identical real-error references and generalization yield deterministic candidate IDs',()=>{
 assert.equal(proposed().form_id,proposed().form_id);
 assert.match(proposed().form_receipt_hash,/^sha256:[a-f0-9]{64}$/);
 assert.equal(intelligenceFormCandidateEntry({form:proposed(),at}).epistemic_kind,'UNCERTAINTY');
});
test('learning promotion requires independently verified heldout improvement and harmless-task non-regression',async()=>{
 const candidate=proposed();
 const form=await verifyIntelligenceFormLearning({
  candidate,heldoutEvaluations:heldout(),
  independentEvaluator,independentAuthorityVerifier,
  promotionApproval:{request:'approve verified advisory'},
  at:'2026-10-23T23:35:00Z',
 });
 assert.equal(form.state,'VERIFIED');
 assert.equal(form.measured_hard_failure_cases,3);
 assert.equal(form.measured_harmless_cases,3);
 assert.equal(form.measured_improvements_on_holdout,2);
 assert.equal(form.action_authority_granted,false);
 assert.equal(form.automatic_model_weights_changed,false);
 const entry=intelligenceFormVerifiedEntry({form});
 assert.equal(validateUniverseEntry(entry).valid,true);
 assert.equal(entry.event_kind,'INTELLIGENCE_FORM_COMPETENCE_VERIFIED');
 const results=selectLearningFormsForNextTurn({
  scope:{...scope,as_of:'2026-10-23T23:40:00Z'},
  verifiedUniverseEntries:[entry],
  competenceCoordinate:form.competence_coordinate,
 });
 assert.equal(results.length,1);
 assert.equal(results[0].applies_as,'ADVISORY_ONLY_REVERIFY_CURRENT_WORLD_BEFORE_ACTION');
 assert.equal(results[0].action_authority_granted,false);
 assert.equal(results[0].learned_strategy,form.proposed_generalization);
});
test('one failed harmless control blocks all promotion',async()=>{
 const trials=heldout();trials[4].with_form_pass=false;
 await assert.rejects(verifyIntelligenceFormLearning({
  candidate:proposed(),heldoutEvaluations:trials,
  independentEvaluator,independentAuthorityVerifier,at,
 }),/INTELLIGENCE_FORM_HARMLESS_CONTROL_REGRESSION/);
});
test('a regression on a previously passing business task disqualifies upgrade',async()=>{
 const trials=heldout();trials[2].with_form_pass=false;
 await assert.rejects(verifyIntelligenceFormLearning({
  candidate:proposed(),heldoutEvaluations:trials,
  independentEvaluator,independentAuthorityVerifier,at,
 }),/INTELLIGENCE_FORM_REGRESSION/);
});
test('too few improved adversarial held-out cases cannot earn competence',async()=>{
 const trials=heldout();trials[1].with_form_pass=false;
 await assert.rejects(verifyIntelligenceFormLearning({
  candidate:proposed(),heldoutEvaluations:trials,
  independentEvaluator,independentAuthorityVerifier,at,
 }),/INTELLIGENCE_FORM_NO_MEASURED_HOLDOUT_IMPROVEMENT/);
});
test('self-authored "passed" evaluation without independent receipt is rejected',async()=>{
 await assert.rejects(verifyIntelligenceFormLearning({
  candidate:proposed(),heldoutEvaluations:heldout(),
  independentEvaluator:{verify:async()=>({verified:true})},
  independentAuthorityVerifier,at,
 }),/INTELLIGENCE_FORM_HOLDOUT_NOT_INDEPENDENTLY_VERIFIED/);
});
test('owner approval is distinct from independent test outcomes',async()=>{
 await assert.rejects(verifyIntelligenceFormLearning({
  candidate:proposed(),heldoutEvaluations:heldout(),
  independentEvaluator,
  independentAuthorityVerifier:{verify:async()=>({verified:true})},at,
 }),/INTELLIGENCE_FORM_PROMOTION_AUTHORITY_INVALID/);
});
test('forged form cannot be activated by toggling verified fields',()=>{
 const candidate=proposed();
 assert.throws(()=>intelligenceFormVerifiedEntry({
  form:{...candidate,state:'VERIFIED',verified_competence:true},
 }),/INTELLIGENCE_FORM_INTEGRITY_ERROR/);
});
test('foreign tenant and future verified learning cannot contaminate this world',async()=>{
 const form=await verifyIntelligenceFormLearning({
  candidate:proposed(),heldoutEvaluations:heldout(),
  independentEvaluator,independentAuthorityVerifier,at:'2026-10-23T23:35:00Z',
 });
 const entry=intelligenceFormVerifiedEntry({form});
 assert.equal(selectLearningFormsForNextTurn({
  scope:{...scope,as_of:'2026-10-23T23:30:00Z'},
  verifiedUniverseEntries:[entry],
  competenceCoordinate:form.competence_coordinate,
 }).length,0);
 assert.equal(selectLearningFormsForNextTurn({
  scope:{...scope,as_of:'2026-10-23T23:40:00Z',owner_user_id:'foreign-owner'},
  verifiedUniverseEntries:[entry],competenceCoordinate:form.competence_coordinate,
 }).length,0);
});
test('unverified fabricated original answer or source-hash change prevents automatic learning',async()=>{
 const {result,readLedger}=await provenance();
 await assert.rejects(absorbClosedLoopMistakesIntoLearningForms({
  scope,turnResult:{...result,original_answer:'Fabricated different answer'},
  readLedger,generateHypothesis:propose,at,
 }),/INTELLIGENCE_FORM_SOURCE_FAILURE_MISMATCH/);
 await assert.rejects(absorbClosedLoopMistakesIntoLearningForms({
  scope,turnResult:{...result,receipts:result.receipts.map((r,i)=>
   i===0?{...r,hash:'sha256:forged'}:r)},
  readLedger,generateHypothesis:propose,at,
 }),/INTELLIGENCE_FORM_SOURCE_PROOF_SCOPE_INVALID/);
});
test('no observed native model failure does not manufacture self-learning',async()=>{
 const {result,readLedger}=await provenance();
 let invoked=false;
 const forms=await absorbClosedLoopMistakesIntoLearningForms({
  scope,turnResult:{...result,original_findings:[]},
  readLedger,generateHypothesis:async()=>{invoked=true;return propose();},at,
 });
 assert.deepEqual(forms,[]);
 assert.equal(invoked,false);
});
