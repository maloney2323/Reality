// Universe Intelligence Form V1: evidence-grounded, reusable competence memory.
// A "form" is an evolving, typed problem-solving capability hypothesis, NOT
// an independent LLM, conscious being, prompt role, automatic code deployment,
// or a grant of business authority.
//
// A form can grow from *actual LLM failure receipts* in a previous turn.
// It becomes eligible as verified learning only after independent held-out
// evaluation, non-regression controls and separately verified promotion scope.
// Every transition is a new immutable Universe entry; history is never edited.
import {createHash} from 'node:crypto';
import {createUniverseEntry,validateUniverseEntry}
 from './reality-universe-persistence-contract-v1.0.js';

export const INTELLIGENCE_FORM_VERSION='reality-universe-intelligence-form-v1.0';
const hash=x=>'sha256:'+createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'
 ?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const text=x=>typeof x==='string'&&x.trim().length>0;
const fail=x=>{throw Error(x)};
const states=new Set(['CANDIDATE','VERIFIED']);
const classes=new Set(['UNVERIFIED_ACTION_PRECONDITION','UNVERIFIED_EXECUTION_CLAIM',
 'UNVERIFIED_MATERIAL_FACT','CONTESTED_SOURCE_REFERENCE',
 'UNVERIFIED_MATERIAL_ACTION_AUTHORITY','MISSED_CLAIM_EXTRACTION',
 'FALSE_POSITIVE_OVERBLOCK','OTHER_EVALUATED_ERROR']);
function scopeOf(s){
 if(!s||!text(s.continuity_root_id)||!text(s.worldline_id)||
  !text(s.owner_user_id)||!text(s.work_item_id)||
  !Number.isFinite(Date.parse(s.as_of)))fail('INTELLIGENCE_FORM_SCOPE_REQUIRED');
 return {continuity_root_id:s.continuity_root_id,worldline_id:s.worldline_id,
  owner_user_id:s.owner_user_id,work_item_id:s.work_item_id,
  as_of:new Date(s.as_of).toISOString()};
}
function requireForm(form){
 if(!form||form.version!==INTELLIGENCE_FORM_VERSION||
  !text(form.form_id)||!text(form.form_receipt_hash)||
  !states.has(form.state))fail('INTELLIGENCE_FORM_REQUIRED');
 const {form_id,form_receipt_hash,...body}=form;
 if(form_id!=='intform:'+hash(body).slice(7,39)||
    form_receipt_hash!==hash(body))fail('INTELLIGENCE_FORM_INTEGRITY_ERROR');
 scopeOf(form.scope);
 return form;
}
const originAllowed=new Set(['LIVE_LLM_TURN','INDEPENDENTLY_ADJUDICATED_CUSTOMER_INCIDENT']);
// Identify the missing capability without pretending the original answer,
// correction draft, or "error" label independently establishes ground truth.
export function proposeIntelligenceForm({
 scope,origin,sourceTurnId,sourceModelRef,sourceTurnReceiptId,
 sourceVerificationReceiptId,failureClass,competenceCoordinate,
 hypothesis,proposedGeneralization,detectorVersion=null,
}={}){
 const s=scopeOf(scope);
 if(!originAllowed.has(origin)||!text(sourceTurnId)||!text(sourceModelRef)||
  !text(sourceTurnReceiptId)||!text(sourceVerificationReceiptId)||
  !classes.has(failureClass)||!text(competenceCoordinate)||
  !text(hypothesis)||!text(proposedGeneralization)||
  [sourceTurnId,sourceModelRef,sourceTurnReceiptId,
   sourceVerificationReceiptId,competenceCoordinate,hypothesis,
   proposedGeneralization].some(x=>x.length>700))
   fail('INTELLIGENCE_FORM_EVIDENCE_REQUIRED');
 const body={
  version:INTELLIGENCE_FORM_VERSION,state:'CANDIDATE',
  scope:s,origin,source_turn_id:sourceTurnId,
  source_model_ref:sourceModelRef,
  source_turn_receipt_id:sourceTurnReceiptId,
  source_verification_receipt_id:sourceVerificationReceiptId,
  detector_version:detectorVersion,
  failure_class:failureClass,
  competence_coordinate:competenceCoordinate,
  working_hypothesis:hypothesis,proposed_generalization:proposedGeneralization,
  original_failure_preserved:true,
  verified_causal_root_cause:false,verified_competence:false,
  independent_heldout_proof:null,
  action_authority_granted:false,automatic_model_weights_changed:false,
  self_deploy_authorized:false,
 };
 return Object.freeze({...body,form_id:'intform:'+hash(body).slice(7,39),
  form_receipt_hash:hash(body)});
}
function entryOf(form,kind,epistemic,at,refs){
 const s=scopeOf(form.scope);
 if(!Number.isFinite(Date.parse(at)))fail('INTELLIGENCE_FORM_TIME_REQUIRED');
 return createUniverseEntry({
  entry_id:'universe:'+form.form_id,
  continuity_root_id:s.continuity_root_id,worldline_id:s.worldline_id,
  event_kind:kind,epistemic_kind:epistemic,
  assertion_time:new Date(at).toISOString(),
  effective_time:new Date(at).toISOString(),
  source_ref:INTELLIGENCE_FORM_VERSION,
  payload:{intelligence_form:form,source_semantics:'COMPETENCE_NOT_ACTION_AUTHORITY'},
  evidence_references:[...new Set(refs)],
  provenance:{source:INTELLIGENCE_FORM_VERSION,
   owner_user_id:s.owner_user_id,work_item_id:s.work_item_id,
   authority:'NONE',learning_scope:'SANDBOX_ONLY'},
 });
}
export function intelligenceFormCandidateEntry({form,at}={}){
 requireForm(form);
 if(form.state!=='CANDIDATE')fail('INTELLIGENCE_FORM_NOT_CANDIDATE');
 return entryOf(form,'INTELLIGENCE_FORM_CANDIDATE','UNCERTAINTY',at,
  [form.source_turn_receipt_id,form.source_verification_receipt_id]);
}
// External held-out assessor; the LLM that generated a candidate CANNOT
// independently certify itself. The caller supplies an authenticated
// server-owned verifier that re-reads evaluations rather than trusting their
// self-reported "PASS". No evaluation fixture implies a real improvement.
export async function verifyIntelligenceFormLearning({
 candidate,heldoutEvaluations=[],independentEvaluator,
 promotionApproval,independentAuthorityVerifier,at,
}={}){
 requireForm(candidate);
 if(candidate.state!=='CANDIDATE'||!Array.isArray(heldoutEvaluations)||
  heldoutEvaluations.length<6||heldoutEvaluations.length>100||
  typeof independentEvaluator?.verify!=='function'||
  typeof independentAuthorityVerifier?.verify!=='function'||
  !Number.isFinite(Date.parse(at)))
  fail('INTELLIGENCE_FORM_HOLDOUT_AND_AUTHORITY_REQUIRED');
 const s=scopeOf(candidate.scope),seen=new Set();
 let bugs=0,positiveBetter=0,benign=0;
 const receipts=[];
 for(const trial of heldoutEvaluations){
  if(!trial||!text(trial.test_case_id)||!text(trial.receipt_ref)||
   !['KNOWN_FAILURE_CLASS','BENIGN_CONTROL'].includes(trial.case_kind)||
   typeof trial.baseline_pass!=='boolean'||
   typeof trial.with_form_pass!=='boolean'||
   seen.has(trial.test_case_id))
   fail('INTELLIGENCE_FORM_HOLDOUT_TRIAL_INVALID');
  seen.add(trial.test_case_id);
  const v=await independentEvaluator.verify({
   form_id:candidate.form_id,form_receipt_hash:candidate.form_receipt_hash,
   trial,scope:s,
  });
  if(v?.verified!==true||v?.independent!==true||
    v?.form_id!==candidate.form_id||
    v?.test_case_id!==trial.test_case_id||
    v?.receipt_ref!==trial.receipt_ref||
    v?.continuity_root_id!==s.continuity_root_id||
    v?.worldline_id!==s.worldline_id||
    v?.owner_user_id!==s.owner_user_id||
    v?.work_item_id!==s.work_item_id)
    fail('INTELLIGENCE_FORM_HOLDOUT_NOT_INDEPENDENTLY_VERIFIED');
  receipts.push(trial.receipt_ref);
  if(trial.case_kind==='KNOWN_FAILURE_CLASS'){
   bugs++;
   if(trial.with_form_pass&&!trial.baseline_pass)positiveBetter++;
   if(!trial.with_form_pass&&trial.baseline_pass)
    fail('INTELLIGENCE_FORM_REGRESSION');
  }else{
   benign++;
   if(!trial.with_form_pass)fail('INTELLIGENCE_FORM_HARMLESS_CONTROL_REGRESSION');
  }
 }
 if(bugs<3||benign<3||positiveBetter<2)
  fail('INTELLIGENCE_FORM_NO_MEASURED_HOLDOUT_IMPROVEMENT');
 const auth=await independentAuthorityVerifier.verify({
  candidate_form_id:candidate.form_id,
  scope:s,approval:promotionApproval,
  evaluation_receipts:receipts,
 });
 if(auth?.verified!==true||auth?.independent!==true||
  auth?.form_id!==candidate.form_id||
  auth?.continuity_root_id!==s.continuity_root_id||
  auth?.worldline_id!==s.worldline_id||
  auth?.owner_user_id!==s.owner_user_id||
  auth?.work_item_id!==s.work_item_id||
  auth?.approved_for_advisory_learning!==true||
  !text(auth?.approval_receipt_ref))
  fail('INTELLIGENCE_FORM_PROMOTION_AUTHORITY_INVALID');
 const body={
  version:INTELLIGENCE_FORM_VERSION,state:'VERIFIED',scope:s,
  parent_candidate_id:candidate.form_id,
  parent_candidate_receipt_hash:candidate.form_receipt_hash,
  origin:candidate.origin,
  competence_coordinate:candidate.competence_coordinate,
  failure_class:candidate.failure_class,
  proposed_generalization:candidate.proposed_generalization,
  source_turn_receipt_id:candidate.source_turn_receipt_id,
  source_verification_receipt_id:candidate.source_verification_receipt_id,
  measured_hard_failure_cases:bugs,
  measured_harmless_cases:benign,
  measured_improvements_on_holdout:positiveBetter,
  independent_heldout_proof:{
   evaluation_receipt_refs:receipts,
   approval_receipt_ref:auth.approval_receipt_ref,
   evaluation_type:'NEW_CASES_INDEPENDENTLY_REVIEWED',
  },
  verified_competence:true,
  effective_at:new Date(at).toISOString(),
  application_mode:'ADVISORY_EVIDENCE_CONDITION_ONLY',
  action_authority_granted:false,
  automatic_model_weights_changed:false,self_deploy_authorized:false,
 };
 return Object.freeze({...body,form_id:'intform:'+hash(body).slice(7,39),
   form_receipt_hash:hash(body)});
}
export function intelligenceFormVerifiedEntry({form}={}){
 requireForm(form);
 if(form.state!=='VERIFIED'||!form.verified_competence||
  form.application_mode!=='ADVISORY_EVIDENCE_CONDITION_ONLY'||
  form.action_authority_granted!==false)
  fail('INTELLIGENCE_FORM_NOT_VERIFIED_FOR_ADVISORY');
 return entryOf(form,'INTELLIGENCE_FORM_COMPETENCE_VERIFIED','OBSERVATION',
  form.effective_at,[form.parent_candidate_id,
   form.source_turn_receipt_id,...form.independent_heldout_proof.evaluation_receipt_refs,
   form.independent_heldout_proof.approval_receipt_ref]);
}
// Only independently established, scope-matched, verified forms are eligible
// for advisory retrieval. A candidate is NOT a new ability for Reality.
// Source/admission verification and authenticated ledger readback are external
// requirements. Never widen scope from the model's string alone.
export function selectLearningFormsForNextTurn({
 scope,verifiedUniverseEntries=[],competenceCoordinate,
}={}){
 const s=scopeOf(scope);
 if(!text(competenceCoordinate)||!Array.isArray(verifiedUniverseEntries)||
  verifiedUniverseEntries.length>200)fail('INTELLIGENCE_FORM_RETRIEVAL_INVALID');
 const selected=[];
 for(const e of verifiedUniverseEntries){
  validateUniverseEntry(e);
  if(e.event_kind!=='INTELLIGENCE_FORM_COMPETENCE_VERIFIED')continue;
  if(e.continuity_root_id!==s.continuity_root_id||
    e.worldline_id!==s.worldline_id||
    e.provenance?.owner_user_id!==s.owner_user_id||
    e.provenance?.work_item_id!==s.work_item_id)
   continue;
  const f=e.payload?.intelligence_form;
  try{requireForm(f);}catch{continue;}
  if(f.state!=='VERIFIED'||f.action_authority_granted!==false||
   f.competence_coordinate!==competenceCoordinate||
   Date.parse(f.effective_at)>Date.parse(s.as_of))continue;
  selected.push(Object.freeze({
   form_id:f.form_id,competence_coordinate:f.competence_coordinate,
   failure_class:f.failure_class,
   learned_strategy:f.proposed_generalization,
   evidence_entry_id:e.entry_id,
   supporting_case_count:f.measured_hard_failure_cases+f.measured_harmless_cases,
   action_authority_granted:false,
   applies_as:'ADVISORY_ONLY_REVERIFY_CURRENT_WORLD_BEFORE_ACTION',
  }));
 }
 return Object.freeze(selected);
}


// This is the *automatic absorption* seam: from a real closed-loop turn and
// its actual Universe readbacks, propose candidate reusable competencies.
// The LLM can generate hypotheses. It cannot label itself verified.
export async function absorbClosedLoopMistakesIntoLearningForms({
 scope,turnResult,readLedger,generateHypothesis,at,
}={}){
 const current=scopeOf(scope);
 if(!turnResult||!Number.isInteger(turnResult.turn)||
   !text(turnResult.original_response_id)||!text(turnResult.original_answer)||
   !Array.isArray(turnResult.original_findings)||
   !Array.isArray(turnResult.receipts)||
   typeof readLedger!=='function'||
   typeof generateHypothesis!=='function'||
   !Number.isFinite(Date.parse(at)))
   fail('INTELLIGENCE_FORM_CLOSED_LOOP_PROOF_REQUIRED');
 if(turnResult.original_findings.length>24)
   fail('INTELLIGENCE_FORM_DETECTION_BOUNDS_EXCEEDED');
 if(!turnResult.original_findings.length)return Object.freeze([]);
 const originalReceipt=turnResult.receipts.find(r=>r.kind==='LLM_ORIGINAL_RESPONSE');
 const verifiedReceipt=turnResult.receipts.find(r=>r.kind==='LLM_CLAIM_VERIFICATION');
 if(!text(originalReceipt?.entry_id)||!text(verifiedReceipt?.entry_id)||
  !originalReceipt.readback_verified||!verifiedReceipt.readback_verified)
   fail('INTELLIGENCE_FORM_SOURCE_READBACK_REQUIRED');
 const originals=await Promise.all([
  readLedger(originalReceipt.entry_id),readLedger(verifiedReceipt.entry_id),
 ]);
 for(let i=0;i<2;i++){
  const e=originals[i];
  if(!e)fail('INTELLIGENCE_FORM_SOURCE_ENTRY_MISSING');
  validateUniverseEntry(e);
  if(e.entry_id!==[originalReceipt,verifiedReceipt][i].entry_id||
   e.ledger_entry_hash!==[originalReceipt,verifiedReceipt][i].hash||
   e.continuity_root_id!==current.continuity_root_id||
   e.worldline_id!==current.worldline_id||
   e.provenance?.owner_user_id!==current.owner_user_id||
   e.provenance?.work_item_id!==current.work_item_id)
    fail('INTELLIGENCE_FORM_SOURCE_PROOF_SCOPE_INVALID');
 }
 const [original,verification]=originals;
 if(original.event_kind!=='LLM_ORIGINAL_RESPONSE'||
  original.payload?.response_id!==turnResult.original_response_id||
  original.payload?.text!==turnResult.original_answer||
  verification.event_kind!=='LLM_CLAIM_VERIFICATION'||
  verification.payload?.stage!=='INITIAL'||
  verification.payload?.model_response_ref!=='model:'+turnResult.original_response_id||
  hash(verification.payload?.findings)!==hash(turnResult.original_findings))
    fail('INTELLIGENCE_FORM_SOURCE_FAILURE_MISMATCH');
 const forms=[];
 for(const finding of turnResult.original_findings){
  if(!classes.has(finding?.classification))continue;
  if(!text(finding.observed_answer_span)||
    !turnResult.original_answer.includes(finding.observed_answer_span))
    fail('INTELLIGENCE_FORM_ORIGINAL_MODEL_SPAN_MISMATCH');
  const proposition=await generateHypothesis({
   source_turn_id:String(turnResult.turn),
   source_model_response_id:turnResult.original_response_id,
   failure_class:finding.classification,
   real_model_answer_span:finding.observed_answer_span,
   stated_reason:finding.reason,
   source_evidence_refs:finding.proof_refs,
   scope:current,
   allowed_effect:'CANDIDATE_CAPABILITY_ONLY',
  });
  if(!text(proposition?.hypothesis)||!text(proposition?.generalization)||
   !text(proposition?.competence_coordinate))
   fail('INTELLIGENCE_FORM_LLM_HYPOTHESIS_INVALID');
  const candidate=proposeIntelligenceForm({
   scope:current,origin:'LIVE_LLM_TURN',
   sourceTurnId:String(turnResult.turn),
   sourceModelRef:'model:'+turnResult.original_response_id,
   sourceTurnReceiptId:original.entry_id,
   sourceVerificationReceiptId:verification.entry_id,
   failureClass:finding.classification,
   competenceCoordinate:proposition.competence_coordinate,
   hypothesis:proposition.hypothesis,
   proposedGeneralization:proposition.generalization,
   detectorVersion:verification.source_ref,
  });
  forms.push(Object.freeze({candidate,
   universe_candidate_entry:intelligenceFormCandidateEntry({form:candidate,at}),
   candidate_is_verified_learning:false,
   automated_hypothesis_created:true,
   model_training_performed:false,
   independent_root_cause_confirmed:false,
  }));
 }
 return Object.freeze(forms);
}
