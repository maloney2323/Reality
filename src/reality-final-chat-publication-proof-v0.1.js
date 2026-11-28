// Exact-answer publication contract at authenticated private-chat boundary.
// This is a final cross-check of the EXISTING Continuity/Integrity decision,
// not an extra reviewer, detached guardrail, or parallel truth database.
// An assistant-generated string must never be published under a receipt
// that attested DIFFERENT bytes or a different user-goal revision.
import {createHash} from 'node:crypto';
import {assessDrift} from './reality-drift-recovery-v0.1.js';
import {adjudicateSourceReview} from './reality-source-review-adjudication-v0.1.js';
const hash=text=>'sha256:'+createHash('sha256')
 .update(JSON.stringify(text)).digest('hex');
function require(condition,code){if(!condition)throw new Error(code)}
// Server-selected operational report boundary. This selector establishes
// a stricter presentation contract, never execution or authority.
// A model's CONVERSATIONAL label cannot downgrade an operational request.
export function requiresSourceRenderedOperationalReply(message){
 const t=String(message||'');
 const domain=/\b(?:shift|worker|employee|invocation|continuity|ledger|receipt|warrant|review scope|original (?:work|job|obligation)|release|deployment|production|PR\s*#?\d+)\b/i.test(t);
 const action=/\b(?:investigat\w*|reconcil\w*|verif\w*|qualif\w*|resum\w*|continu\w*|recover\w*|fix|repair\w*|perform\w*|execut\w*|test\w*|install\w*|deploy\w*|activat\w*|complet\w*|progress|status|happened|receipt\w*|done|working|block\w*)\b/i.test(t);
 return domain&&action;
}

// Compile the exact extracted assertions against the existing source verifier.
// Extraction is a candidate, never an independent completeness or truth proof.
// Unknown source claims are unsupported, not adjudicated false. No external
// authority is granted by the outcome, even if all extracted claims match.
export function compileFinalOutputClaimAssessment({answer,candidate=null,snapshot=null,
 review=null,extractionStatus='NOT_ASSESSED'}={}){
 require(typeof answer==='string'&&answer.trim(),'CHAT_OUTPUT_CANDIDATE_REQUIRED');
 const claims=candidate?.claims||[],actions=candidate?.actions||[];
 const anchored=[...claims,...actions].every(c=>typeof c.original_quote==='string'&&
  c.original_quote.length>0&&answer.includes(c.original_quote));
 let result=null;
 if(candidate&&snapshot&&anchored)result=assessDrift({trustedSnapshot:snapshot,candidate});
 const rows=[...claims.map((c,i)=>({kind:'FACT',key:c.key,value:c.value,
  quote:c.original_quote,evidence_refs:c.evidence_refs||[],path:'claims['+i+']'})),
  ...actions.map((a,i)=>({kind:'ACTION',key:a.action_id,value:a.status,
   target:a.target,quote:a.original_quote,evidence_refs:[a.authority_ref,a.verification_ref].filter(Boolean),
   path:'actions['+i+']'}))].map(r=>{
   const violations=(result?.violations||[]).filter(v=>v.path===r.path).map(v=>v.code);
   return {...r,verification_status:!result?'UNASSESSED':violations.length?'UNSUPPORTED_OR_CONTRADICTED':
    r.kind==='ACTION'?'ACTION_CANDIDATE_NOT_OUTCOME_PROOF':'SOURCE_MATCHED_TYPED_ASSERTION_ONLY',
    violation_codes:violations};
  });
 // Preserve independently source-matched literal facts against an
 // untrusted reviewer's false positive. This is the existing adjudicator,
 // not a new reviewer or a blanket exception for any warning.
 const sourceAdjudication=adjudicateSourceReview({answer,review,candidate,sourceSnapshot:snapshot});
 const supportedQuotes=new Set(sourceAdjudication.source_supported_issue_quotes.map(x=>x.issue_quote));
 const concerns=(review?.issues||[]).filter(i=>!(i.kind==='UNSUPPORTED_FACT'&&supportedQuotes.has(i.quote))&&['UNSUPPORTED_FACT','FALSE_COMPLETION','AUTHORITY_CONFUSION','FACT_CONTRADICTION'].includes(i.kind)&&
  typeof i.quote==='string'&&answer.includes(i.quote)).map(i=>({kind:i.kind,quote:i.quote}));
 const unassessed=(review?.unassessed_claims||[]).map(x=>({key:x.key,reason:x.reason,
  quote:typeof x.quote==='string'&&answer.includes(x.quote)?x.quote:null}));
 const unsupported=Boolean(result?.codes?.some(c=>['UNSUPPORTED_CLAIM','FACT_DRIFT',
  'EVIDENCE_PROVENANCE_DRIFT','UNSUPPORTED_PROVENANCE','AUTHORITY_ESCALATION',
  'FALSE_COMPLETION','WORLD_SCOPE_DRIFT'].includes(c))||
  concerns.length||unassessed.some(x=>x.quote&&x.reason==='NOT_IN_SOURCE_RECORD')||!anchored);
 return Object.freeze({schema:'reality-final-output-claim-assessment-v0.1',
  candidate_answer_hash:hash(answer),extraction_status:extractionStatus,
  candidate_scope:['OPERATIONAL','CONVERSATIONAL'].includes(candidate?.scope)?candidate.scope:'UNKNOWN',
  source_receipt_ids:snapshot?.source_receipt_ids||[],
  claim_rows:rows,review_concerns:concerns,unassessed_claims:unassessed,
  source_adjudicated_review_warning_count:sourceAdjudication.source_supported_count,
  deterministic_violation_codes:result?.codes||[],
  unsupported_assertion_detected:unsupported,
  status:unsupported?'UNSUPPORTED_ASSERTIONS_REQUIRE_WITHHOLDING':
   result&&rows.length?'EXTRACTED_ASSERTIONS_SOURCE_COMPARED':'CLAIM_COVERAGE_UNVERIFIED',
  extraction_completeness_verified:false,semantic_accuracy_independently_verified:false,
  external_execution_authorized:false});
}

// A client receives disposition and hashes, not quarantined candidate prose,
// even when the underlying audit receipt contains the exact extracted quotes.
export function summarizeOutputClaimAssessment(assessment){
 if(!assessment)return null;
 return Object.freeze({
  schema:assessment.schema,status:assessment.status,disposition:assessment.disposition||null,
  candidate_answer_hash:assessment.candidate_answer_hash||null,
  released_answer_hash:assessment.released_answer_hash||null,
  assessment_hash:assessment.assessment_hash||null,
  ledger_receipt_id:assessment.ledger_receipt_id||null,
  durable_continuity_receipt_verified:assessment.readback_verified===true,
  unsupported_assertion_detected:assessment.unsupported_assertion_detected===true,
  extracted_claim_count:(assessment.claim_rows||[]).length,
  unassessed_claim_count:(assessment.unassessed_claims||[]).length,
  deterministic_violation_codes:assessment.deterministic_violation_codes||[],
  extraction_completeness_verified:false,semantic_accuracy_independently_verified:false,
  external_execution_authorized:false
 });
}
const ordered=v=>v===null||typeof v!=='object'?v:Array.isArray(v)?v.map(ordered):
 Object.fromEntries(Object.keys(v).sort().map(k=>[k,ordered(v[k])]));
export const hashOutputClaimAssessment=assessment=>hash(ordered(assessment));

// Reuse the canonical append-only Spine; this is an unverified claim
// assessment, not a new authority, semantic proof, or settlement.
export async function recordReadOnlyOutputClaimAssessment({
 runtime,requestId,sourceRef,answer,assessment
}={}){
 require(runtime?.enabled===true&&typeof runtime.appendStage==='function'&&
  typeof runtime.readback==='function'&&typeof requestId==='string'&&
  typeof sourceRef==='string'&&assessment?.schema==='reality-final-output-claim-assessment-v0.1',
  'CHAT_READ_ONLY_CLAIM_LEDGER_REQUIRED');
 const released=hash(answer);
 const publication={...assessment,released_answer_hash:released,
  disposition:assessment.candidate_answer_hash===released?'CANDIDATE_RELEASED_COVERAGE_LIMITED':'UNSUPPORTED_CANDIDATE_WITHHELD'};
 const digest=hashOutputClaimAssessment(publication);
 const event=await runtime.appendStage({
  stage:'VERIFICATION',entityId:'read-only-output-claim:'+requestId,
  eventId:'read-only-output-claim:'+runtime.spine.continuity_root_id+':'+requestId,
  epistemicStatus:'UNVERIFIED',evidenceRefs:[sourceRef],
  payload:{event_type:'READ_ONLY_OUTPUT_CLAIM_PUBLICATION_DECISION',
   request_id:requestId,source_user_message_ref:sourceRef,
   actual_released_answer_hash:released,output_claim_assessment:publication,
   output_claim_assessment_hash:digest,external_action_executed:false},
  provenance:{source:'reality_existing_integrity_spine_read_only_publication_boundary'}
 });
 const history=await runtime.readback();
 const copied=history.find(e=>e.event_id===event.event_id&&
  e.continuity_root_id===runtime.spine.continuity_root_id&&
  e.worldline_id===runtime.spine.worldline_id);
 require(copied?.lineage_hash===event.lineage_hash&&
  copied?.payload?.request_id===requestId&&copied.payload.source_user_message_ref===sourceRef&&
  copied.payload.actual_released_answer_hash===released&&
  copied.payload.output_claim_assessment_hash===digest&&
  hashOutputClaimAssessment(copied.payload.output_claim_assessment)===digest,
  'CHAT_READ_ONLY_CLAIM_LEDGER_READBACK_FAILED');
 return Object.freeze({...publication,assessment_hash:digest,ledger_receipt_id:event.event_id,readback_verified:true});
}

export function assertFinalChatPublicationProof({
 answer,reliability,atomicGoalPublicationEnabled=false,
}={}){
 require(atomicGoalPublicationEnabled===true,
  'CHAT_ATOMIC_GOAL_PUBLICATION_REQUIRED');
 require(typeof answer==='string'&&answer.trim().length>0,
  'CHAT_FINAL_ANSWER_REQUIRED');
 require(reliability?.canonical_epistemic_state?.status===
  'PERSISTED_AND_READBACK_VERIFIED'&&
  typeof reliability.canonical_epistemic_state.frame_hash==='string'&&
  Boolean(reliability.canonical_epistemic_state.source_receipt_id)&&
  reliability.readback_verified===true,
  'CHAT_CANONICAL_SOURCE_FRAME_NOT_VERIFIED');
 const gate=reliability?.final_direction_release;
 require(gate&&typeof gate.status==='string'&&
  typeof gate.source_receipt_id==='string'&&gate.source_receipt_id.length>0&&
  typeof gate.release_allowed==='boolean'&&
  typeof gate.final_answer_hash==='string',
  'CHAT_FINAL_DIRECTION_RECEIPT_REQUIRED');
 require(gate.final_answer_hash===hash(answer),
  'CHAT_FINAL_ANSWER_CHANGED_AFTER_DIRECTION_VERIFICATION');
 if(gate.release_allowed===false){
  require(gate.known_off_goal_text_withheld===true,
    'CHAT_KNOWN_OFF_GOAL_ANSWER_NOT_WITHHELD');
 }
 const claims=gate.output_claim_assessment;
 require(claims?.schema==='reality-final-output-claim-assessment-v0.1'&&
  claims.readback_verified===true&&claims.ledger_receipt_id===gate.source_receipt_id&&
  claims.released_answer_hash===gate.final_answer_hash&&
  typeof claims.candidate_answer_hash==='string'&&
  typeof claims.assessment_hash==='string'&&
  ['CANDIDATE_RELEASED_COVERAGE_LIMITED','UNSUPPORTED_CANDIDATE_WITHHELD','DIRECTION_CANDIDATE_WITHHELD'].includes(claims.disposition)&&
  claims.extraction_completeness_verified===false&&claims.semantic_accuracy_independently_verified===false&&
  claims.external_execution_authorized===false,
  'CHAT_FINAL_OUTPUT_CLAIM_RECEIPT_REQUIRED');
 const {assessment_hash,ledger_receipt_id,readback_verified,...assessedPayload}=claims;
 require(typeof claims.unsupported_assertion_detected==='boolean'&&
  hashOutputClaimAssessment(assessedPayload)===assessment_hash,
  'CHAT_OUTPUT_CLAIM_ASSESSMENT_DIGEST_MISMATCH');
 require(claims.unsupported_assertion_detected!==true||
  claims.disposition==='UNSUPPORTED_CANDIDATE_WITHHELD'||
  claims.disposition==='DIRECTION_CANDIDATE_WITHHELD',
  'CHAT_UNSUPPORTED_OUTPUT_NOT_WITHHELD');
 require(claims.disposition==='CANDIDATE_RELEASED_COVERAGE_LIMITED'?
  claims.candidate_answer_hash===gate.final_answer_hash:
  claims.candidate_answer_hash!==gate.final_answer_hash,
  'CHAT_OUTPUT_CLAIM_RELEASE_DISPOSITION_MISMATCH');
 // An empty operational/unknown extraction cannot authorize raw candidate bytes.
 require(!(claims.disposition==='CANDIDATE_RELEASED_COVERAGE_LIMITED'&&
  claims.status==='CLAIM_COVERAGE_UNVERIFIED'&&claims.candidate_scope!=='CONVERSATIONAL'),
  'CHAT_OUTPUT_CLAIM_COVERAGE_REQUIRED');
 const authority=reliability?.goal_authority_contracts?.authorized_user_goal_state;
 require(authority&&Number.isSafeInteger(authority.transition_count)&&
   authority.transition_count>=0,
   'CHAT_GOAL_AUTHORITY_SNAPSHOT_MISSING');
 return Object.freeze({
  status:'BOUND_TO_ORIGINAL_CANONICAL_FRAME_AND_FINAL_DIRECTION_RECEIPT',
  final_answer_hash:gate.final_answer_hash,
  final_direction_receipt_id:gate.source_receipt_id,
  canonical_frame_hash:reliability.canonical_epistemic_state.frame_hash,
  canonical_frame_receipt_id:reliability.canonical_epistemic_state.source_receipt_id,
  current_authorized_goal_revision:authority.transition_count,
  output_claim_assessment_hash:claims.assessment_hash,
  claim_extraction_completeness_verified:false,
  external_execution_authorized:false,
  semantic_accuracy_independently_verified:false,
 });
}
