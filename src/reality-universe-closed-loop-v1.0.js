// Reality closed-loop proof V1.
// Actual LLM answer -> model-extracted claims -> source-bound Universe verifier
// -> (max one) real LLM regeneration -> reextract/reverify -> append-only
// original/error/correction/delivery receipts -> next-turn continuity.
// No model self-awards authority. Sandbox by default; storage adapter injection
// is required; no live business tool calls or customer database mutations.
import {createHash} from 'node:crypto';
import {createUniverseEntry,validateUniverseEntry,assertAppendOnly}
 from './reality-universe-persistence-contract-v1.0.js';
import {verifyCandidateCorrectionAgainstUniverse}
 from './reality-universe-correction-verifier-v1.0.js';
import {absorbClosedLoopMistakesIntoLearningForms}
 from './reality-universe-intelligence-forms-v1.0.js';

export const CLOSED_LOOP_VERSION='reality-universe-closed-loop-v1.0';
const norm=x=>Array.isArray(x)?x.map(norm):x&&typeof x==='object'
 ?Object.fromEntries(Object.keys(x).sort().map(k=>[k,norm(x[k])])):x;
const sha=x=>'sha256:'+createHash('sha256').update(JSON.stringify(norm(x))).digest('hex');
const text=x=>typeof x==='string'&&x.trim().length>0;
const fail=x=>{throw Error(x)};
function requireScope(scope){
 if(!scope||!text(scope.continuity_root_id)||!text(scope.worldline_id)||
  !text(scope.owner_user_id)||!text(scope.work_item_id)||
  !Number.isFinite(Date.parse(scope.as_of)))fail('CLOSED_LOOP_SCOPE_REQUIRED');
 return scope;
}
export function createSandboxUniverseLedger({trustedScope}={}){
 const scope=requireScope(trustedScope);
 const rows=new Map(),order=[];
 return Object.freeze({
  async append(entry){
   validateUniverseEntry(entry);
   if(entry.continuity_root_id!==scope.continuity_root_id||
     entry.worldline_id!==scope.worldline_id||
     entry.provenance?.owner_user_id!==scope.owner_user_id||
     entry.provenance?.work_item_id!==scope.work_item_id)
      fail('CLOSED_LOOP_LEDGER_SCOPE_VIOLATION');
   const existing=rows.get(entry.entry_id);
   assertAppendOnly(existing?[existing]:[],entry);
   if(!existing){rows.set(entry.entry_id,structuredClone(entry));order.push(entry.entry_id);}
   return {status:existing?'DUPLICATE_IDENTICAL':'APPENDED_SANDBOX',
    entry:structuredClone(rows.get(entry.entry_id))};
  },
  async read(entryId){
   const row=rows.get(entryId);
   return row?structuredClone(row):null;
  },
  async list(){return order.map(k=>structuredClone(rows.get(k)));},
  storage_semantics:'IN_PROCESS_BENCHMARK_SANDBOX_NOT_DURABLE_CUSTOMER_DATABASE',
 });
}
async function appendVerified(ledger,entry){
 const saved=await ledger.append(entry);
 if(!['DUPLICATE_IDENTICAL','APPENDED_SANDBOX','PERSISTED','DUPLICATE_IDENTICAL_CONCURRENT']
   .includes(saved?.status))fail('CLOSED_LOOP_APPEND_UNVERIFIED');
 const seen=await ledger.read(entry.entry_id);
 if(!seen)fail('CLOSED_LOOP_READBACK_MISSING');
 validateUniverseEntry(seen);
 if(seen.ledger_entry_hash!==entry.ledger_entry_hash||
    seen.entry_id!==entry.entry_id||
    sha(seen)!==sha(entry))
  fail('CLOSED_LOOP_READBACK_MISMATCH');
 return {entry_id:entry.entry_id,hash:entry.ledger_entry_hash,
   readback_verified:true,store_status:saved.status};
}
function event({scope,turn,kind,source,payload,refs=[],at}){
 return createUniverseEntry({
  entry_id:'closed-loop:'+sha([scope.continuity_root_id,scope.worldline_id,
   scope.work_item_id,turn,kind,source,payload]).slice(7,39),
  continuity_root_id:scope.continuity_root_id,
  worldline_id:scope.worldline_id,
  event_kind:kind,epistemic_kind:'OBSERVATION',
  assertion_time:at,effective_time:at,source_ref:source,
  payload,evidence_references:[...new Set(refs)],
  provenance:{source:CLOSED_LOOP_VERSION,
   owner_user_id:scope.owner_user_id,work_item_id:scope.work_item_id,
   origin:'BENCHMARK_SANDBOX_NO_CUSTOMER_WRITE',authority:'NONE'},
 });
}
function filterClaims(extracted,answer,scope,modelRef){
 if(!Array.isArray(extracted)||extracted.length>30)
  fail('CLOSED_LOOP_EXTRACTOR_BOUNDS_EXCEEDED');
 const accepted=[],rejected=[];
 for(const x of extracted){
  const consequent=['SEND_ESTIMATE','ORDER_MATERIALS','SCHEDULE_INSTALLATION'].includes(x?.operation);
  const action=['ACTION_COMMITMENT','OUTCOME_COMPLETED'].includes(x?.claim_kind);
  if(!x||typeof x.source_span!=='string'||x.source_span.length<8||
    !answer.includes(x.source_span)||!text(x.claim_kind)||
    !text(x.operation)||!text(x.resource)){
    rejected.push({reason:'INVALID_VERBATIM_MODEL_CLAIM',
      material_risk:consequent&&action});continue;
  }
  const explicitUncertainty=/\b(?:uncertain|unresolved|unsettled|disputed|conflicting|pending|unknown|unverified|undecided|not\s+(?:yet\s+)?(?:decided|confirmed|verified|known|settled|signed|approved|finalized)|no\s+(?:verified|confirmed|evidence|amount|agreement)|(?:counts?|reports?|figures?)\s+(?:differ|disagree|conflict)|\bopen\s+(?:decisions|questions))\b/i.test(x.source_span);
  // Source-attributed quantities are reports, not independent physical truth.
  const explicitAttribution=/\b(?:foreman|crew|supplier|subcontractor|homeowner|portal|inspector)\b.{0,55}\b(?:says|reports?|reported|counted|claims?|lists?|shows?)\b/i.test(x.source_span)||
   /\b(?:according to|reported by|counted by)\b/i.test(x.source_span);
  // "No count is verified" and "the sink remains unsettled" are positive
  // ADMISSIONS OF IGNORANCE, not claims of known physical truth.
  let normalizedKind=x.claim_kind==='MATERIAL_FACT'&&explicitUncertainty?
    'UNCERTAINTY_ADMISSION':
    x.claim_kind==='MATERIAL_FACT'&&explicitAttribution?
    'ATTRIBUTED_REPORT':x.claim_kind;
  const isFact=normalizedKind==='MATERIAL_FACT';
  if(isFact&&(!text(x.entity_ref)||!text(x.state_key)||
   !Object.hasOwn(x,'value')||
   (typeof x.value!=='string'&&typeof x.value!=='number'&&typeof x.value!=='boolean')||
   (typeof x.value==='number'&&!Number.isFinite(x.value)))){
   rejected.push({reason:'MALFORMED_MATERIAL_FACT_EXTRACTION',
     source_span:x.source_span,material_risk:true});continue;
  }
  // Minimal native semantic rescue of a *clearly negated* verbatim claim:
  // "I will not send" cannot be treated as "I will send" even if a model
  // extractor mislabels its kind. This is a correction of intent TYPE only,
  // never proof the underlying facts or authorizations are true.
  const negated=/(?:\b(?:will|would|shall)\s+not\s+(?:send|schedule|confirm|order|dispatch)|\b(?:cannot|can't|won't|shouldn't|must not|do not|never)\s+(?:send|schedule|confirm|order|dispatch|proceed)|\b(?:not|never)\s+(?:be\s+)?(?:sent|scheduled|ordered|confirmed|dispatched))\b/i.test(x.source_span);
  const draftOnly=/\b(?:draft|prepare a draft|unsent draft)\b/i.test(x.source_span)&&
   !/\b(?:send|sent|publish|dispatched|confirmed)\b/i.test(x.source_span);
  const completedNegation=/\b(?:no|not|never|without)\b.{0,80}\b(?:sent|scheduled|confirmed|dispatched|ordered|executed|delivered)\b/i.test(x.source_span)||
   /\b(?:not|never|no)\s+(?:final\s+)?(?:estimate|order|schedule)\b.{0,80}\b(?:sent|confirmed|completed)\b/i.test(x.source_span);
  if(['ACTION_COMMITMENT','OUTCOME_COMPLETED'].includes(normalizedKind)){
   if(negated||completedNegation)normalizedKind='DENIAL_OF_ACTION';
   else if(draftOnly)normalizedKind='DRAFT_ONLY';
  }
  accepted.push({...x,claim_kind:normalizedKind,model_source_ref:modelRef,
   continuity_root_id:scope.continuity_root_id});
 }
 return {accepted,rejected};
}
const REVIEWABLE=new Set(['UNVERIFIED_ACTION_PRECONDITION',
 'UNVERIFIED_EXECUTION_CLAIM','UNVERIFIED_MATERIAL_FACT',
 'UNVERIFIED_MATERIAL_ACTION_AUTHORITY','CONTESTED_SOURCE_REFERENCE']);
function correctionContext(original,prompt,review){
 const reasons=review.findings.filter(f=>REVIEWABLE.has(f.classification))
  .map(f=>({kind:f.classification,span:f.observed_answer_span,
   source_refs:f.proof_refs,reason:f.reason}));
 return Object.freeze({
  original_answer:original,
  current_user_request:prompt,
  defect_observations:reasons,
  possible_extraction_coverage_gap:review.possible_unexamined_material_assertion,
  instructions:'Correct only unsupported claims; distinguish request, source report, external verified approval, actual execution and draft. Never state that an email, purchase, dispatch or payment happened without a separate effect receipt. If counts conflict and physical count is not independently verified, acknowledge uncertainty. Keep useful explanations, hypothetical calculations and drafts. Produce a complete natural reply to the original user; do not mention evaluation machinery.',
 });
}
const BLOCKED_RESPONSE='Reality cannot verify the consequential action or the material fact requested from the available evidence. No email, order, payment, or installation schedule has been executed. I can still prepare a draft, compare options, and identify the specific approval or source record needed.';
export async function runUniverseClosedLoopTurn({
 trustedScope,turn,prompt,history=[],policyProjection,ledger,
 generateAnswer,extractClaims,independentEvidenceVerifier,
 evidenceEntries=[],maxRepairs=1,at=null,
 generateLearningHypothesis=null,
}={}){
 const scope=requireScope(trustedScope);
 if(!Number.isInteger(turn)||turn<1||turn>1000||!text(prompt)||
  !Array.isArray(history)||history.length>2000||
  !policyProjection||policyProjection.scope?.continuity_root_id!==scope.continuity_root_id||
  policyProjection.scope?.worldline_id!==scope.worldline_id||
  policyProjection.scope?.owner_user_id!==scope.owner_user_id||
  policyProjection.scope?.work_item_id!==scope.work_item_id||
  !ledger||typeof ledger.append!=='function'||typeof ledger.read!=='function'||
  typeof generateAnswer!=='function'||typeof extractClaims!=='function'||
  !independentEvidenceVerifier||
  !Number.isInteger(maxRepairs)||maxRepairs<0||maxRepairs>2)
   fail('CLOSED_LOOP_SERVER_ADAPTERS_REQUIRED');
 const stamp=at||scope.as_of;
 if(!Number.isFinite(Date.parse(stamp)))fail('CLOSED_LOOP_TIME_INVALID');
 const receipts=[];
 async function save(kind,source,payload,refs=[]){
  const entry=event({scope,turn,kind,source,payload,refs,at:stamp});
  const receipt=await appendVerified(ledger,entry);
  receipts.push({kind,...receipt});return receipt;
 }
 const original=await generateAnswer({stage:'INITIAL',turn,prompt,history});
 if(!text(original?.answer)||!text(original?.response_id))
  fail('CLOSED_LOOP_GENERATION_INVALID');
 const originalRef='model:'+original.response_id;
 const origSaved=await save('LLM_ORIGINAL_RESPONSE',originalRef,{
  role:'assistant',text:original.answer,turn,stage:'INITIAL',delivered:false,
  response_id:original.response_id,source:'ACTUAL_UNDERLYING_MODEL',
 },['user-turn:'+turn,originalRef]);
 async function evaluate(answer,responseId,stage){
  const ref='model:'+responseId;
  const x=await extractClaims({turn,prompt,answer,stage,response_id:responseId,
   history,policyProjection});
  const parsed=filterClaims(x?.claims,answer,scope,ref);
  const e=await verifyCandidateCorrectionAgainstUniverse({
   policyProjection,modelAnswer:answer,modelSourceRef:ref,
   proposedClaims:parsed.accepted,evidenceEntries,independentEvidenceVerifier});
  const rcpt=await save('LLM_CLAIM_VERIFICATION',ref,{
   stage,model_response_ref:ref,model_answer_hash:sha(answer),
   proposed_claim_count:x?.claims?.length??null,
   valid_claim_count:parsed.accepted.length,
   invalid_claim_count:parsed.rejected.length,
   extracted_claims:parsed.accepted,
   findings:e.findings,assessments:e.assessments,
   verifier_receipt_hash:e.evaluation_receipt_hash,
   coverage_gap:e.possible_unexamined_material_assertion,
   source_evidence_count:e.admitted_independent_proofs.length,
   semantic_coverage_proven:false,
  },[ref,e.evaluation_receipt_hash]);
  return {e,parsed,receipt:rcpt,extractor:x};
 }
 const first=await evaluate(original.answer,original.response_id,'INITIAL');
 let chosen=original,latest=first,usedRepair=false;
 const confirmedIssue=first.e.findings.some(f=>REVIEWABLE.has(f.classification));
 const flaggedCoverage=first.e.possible_unexamined_material_assertion;
 const materialExtractionFailure=first.parsed.rejected.some(r=>r.material_risk===true);
 const needRepair=confirmedIssue||flaggedCoverage||materialExtractionFailure;
 const repairs=[];
 if(needRepair){
  for(let i=0;i<maxRepairs;i++){
   const feedback=correctionContext(original.answer,prompt,latest.e);
   const proposal=await generateAnswer({stage:'REPAIR',turn,prompt,history,
     prior_answer:original.answer,repair_feedback:feedback,attempt:i+1});
   if(!text(proposal?.answer)||!text(proposal?.response_id))
    fail('CLOSED_LOOP_REPAIR_GENERATION_INVALID');
   const candidateSaved=await save('LLM_REPAIR_PROPOSAL','model:'+proposal.response_id,{
    role:'assistant',text:proposal.answer,stage:'REPAIR',delivered:false,
    parent_response_id:original.response_id,response_id:proposal.response_id,
    original_error_receipt:first.e.evaluation_receipt_hash,
   },[origSaved.entry_id,first.e.evaluation_receipt_hash]);
   const check=await evaluate(proposal.answer,proposal.response_id,'REPAIR');
   const noClaimsCoverage=check.parsed.accepted.length===0;
   const accepted=check.e.findings.length===0&&
    !check.e.possible_unexamined_material_assertion&&
    !noClaimsCoverage&&check.parsed.rejected.length===0;
   repairs.push({attempt:i+1,model_response_id:proposal.response_id,
     proposal_receipt:candidateSaved.entry_id,
     verification_receipt:check.e.evaluation_receipt_hash,
     accepted_on_typed_checks:accepted,
     residual_findings:check.e.findings.map(f=>f.classification),
     possible_unexamined_material_assertion:check.e.possible_unexamined_material_assertion,
     complete_semantic_correctness_proven:false});
   latest=check;
   if(accepted){chosen=proposal;usedRepair=true;break;}
  }
 }
 const unresolved=needRepair&&!usedRepair;
 // Hard fallback is limited to *positive material claims* or action-commitment
 // violations. A generic extraction gap is not justification for replacing a
 // useful answer with a canned refusal; mark it unverified and preserve it.
 const knownConsequentialIssue=confirmedIssue||materialExtractionFailure||
   (flaggedCoverage&&/\b(?:definitely|certainly|guaranteed)\b/i.test(original.answer));
 const safetyFallback=unresolved&&knownConsequentialIssue;
 const delivered=safetyFallback?BLOCKED_RESPONSE:chosen.answer;
 const deliveryStatus=safetyFallback?'UNCERTAINTY_DISCLOSED_ACTION_WITHHELD':
   usedRepair?'MODEL_REPAIR_ACCEPTED_ON_TYPED_EVIDENCE':
   unresolved?'ORIGINAL_PRESERVED_EXTRACTION_UNCERTAINTY':
   'ORIGINAL_ANSWER_UNCHANGED_LIMITED_COVERAGE';
 const deliveredSaved=await save('LLM_DELIVERY_DECISION',
  usedRepair?'model:'+chosen.response_id:originalRef,{
   turn,text:delivered,status:deliveryStatus,
   original_response_id:original.response_id,
   selected_response_id:usedRepair?chosen.response_id:original.response_id,
   model_answer_hash:sha(delivered),
   initial_verification_hash:first.e.evaluation_receipt_hash,
   final_verification_hash:latest.e.evaluation_receipt_hash,
   source_authenticity_proven_for_business:false,
   complete_semantic_correctness_proven:false,
   customer_effect_executed:false,
   publication_is_sandbox_only:true,
  },[origSaved.entry_id,latest.receipt.entry_id]);
 const previousHistory=history.map(m=>({role:m.role,content:m.content}));
 const newHistory=[...previousHistory,
  {role:'user',content:prompt},{role:'assistant',content:delivered}];
 const continuitySaved=await save('CONTINUITY_TURN_COMMITTED',
  'closed-loop:continuity:'+turn,{
   turn,user_message:prompt,assistant_message:delivered,
   delivered_decision_id:deliveredSaved.entry_id,
   historical_message_count:history.length,
   next_message_count:newHistory.length,
   last_delivered_hash:sha(delivered),
   carries_model_corrected_answer:usedRepair,
   full_history_integrity_anchored_to_previous_turn:true,
   prior_receipt:history.length?sha(previousHistory):null,
   real_world_action_executed:false,
  },[deliveredSaved.entry_id,origSaved.entry_id]);
 // Actual mistakes may create learning candidates *after* delivery/continuity.
 // Neither the original answer nor a proposed form is rewritten as competence.
 // Candidate formation is optional and deliberately separate from the chat
 // success path and all consequential authority.
 const learningCandidates=[];
 if(generateLearningHypothesis!==null){
  if(typeof generateLearningHypothesis!=='function')
   fail('CLOSED_LOOP_LEARNING_GENERATOR_INVALID');
  const candidateForms=await absorbClosedLoopMistakesIntoLearningForms({
   scope,at:stamp,
   readLedger:id=>ledger.read(id),
   generateHypothesis:generateLearningHypothesis,
   turnResult:{
    turn,original_response_id:original.response_id,
    original_answer:original.answer,
    original_findings:first.e.findings,
    receipts,
   },
  });
  for(const record of candidateForms){
   const saved=await appendVerified(ledger,record.universe_candidate_entry);
   receipts.push({kind:'INTELLIGENCE_FORM_CANDIDATE',...saved});
   learningCandidates.push({
    form_id:record.candidate.form_id,
    learning_state:'CANDIDATE_UNVERIFIED',
    failure_class:record.candidate.failure_class,
    competence_coordinate:record.candidate.competence_coordinate,
    universe_receipt_id:saved.entry_id,
    available_to_apply_as_verified_competence:false,
   });
  }
 }
 return Object.freeze({
  turn,prompt,
  original_answer:original.answer,original_response_id:original.response_id,
  original_findings:first.e.findings,
  original_typed_claims:first.parsed.accepted,
  original_possible_missing_claim:first.e.possible_unexamined_material_assertion,
  correction_attempted:repairs.length>0,
  repair_attempts:repairs,
  candidate_model_answer:chosen.answer,final_answer:delivered,
  delivery_status:deliveryStatus,
  repaired_in_history:usedRepair,
  residual_typed_findings:latest.e.findings,
  evidence_repair_verified:usedRepair,
  independently_verified_full_semantics:false,
  evidence_entries_read_back:first.e.admitted_independent_proofs,
  intelligence_form_candidates:learningCandidates,
  candidate_forms_are_not_verified_learning:true,
  receipts,continuity_receipt_id:continuitySaved.entry_id,
  next_history:newHistory,
  external_actions_executed:0,
  customer_data_mutated:false,
 });
}
