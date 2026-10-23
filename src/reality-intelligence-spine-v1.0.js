// Reality Intelligence Spine v1.0: one evaluation and bounded correction contract.
// Reuses existing authenticated continuity, drift, model output and trajectory results.
// Never treats model agreement as independent fact, never executes tools, and never
// promotes an unverified correction or modifies authoritative history.
import {createHash} from 'node:crypto';
import {inspectResponseEvidenceBoundary} from './reality-evidence-boundary-v1.0.js';

export const INTELLIGENCE_SPINE_V1='reality-intelligence-spine-v1.0';
const validText=x=>typeof x==='string'&&x.trim().length>0;
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'
 ?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const digest=x=>'sha256:'+createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
const fail=msg=>{throw Error(msg)};
const array=x=>Array.isArray(x)?x:[];
const DRIFT_CLASSES=new Set([
 'STALE_RESPONSE_REPLAY','POSSIBLE_CURRENT_TURN_MISALIGNMENT',
 'CONVERSATIONAL_PRECONDITION_DRIFT','CONVERSATIONAL_REVISION_REQUIRES_REVIEW',
 'CONVERSATIONAL_RETROSPECTIVE_DRIFT',
]);
const REFERENCE_CLASSES=new Set([
 'POTENTIAL_MATERIAL_DRIFT','CONTESTED_SOURCE_REFERENCE',
 'UNVERIFIED_EXECUTION_CLAIM',
]);
function result(source,sourceResult){
 return array(sourceResult?.findings).map(f=>({
  issue_id:String(f.issue_id||digest([source,f]).slice(7,39)),
  classification:String(f.classification||'UNCLASSIFIED'),
  origin_stage:String(f.origin_stage||'COGNITION'),
  source_receipt_refs:array(f.source_receipt_refs).filter(validText),
  excerpt:String(f.observed_model_text||f.excerpt||'').slice(0,240),
  detection_source:source,
  independently_adjudicated:false,
 }));
}
function validation(req){
 if(!validText(req?.continuityRootId)||!validText(req?.userSourceRef)
    ||!validText(req?.modelSourceRef))fail('SPINE_V1_VERIFIED_IDENTITY_REQUIRED');
 if(!validText(req?.currentRequest)||!validText(req?.rawAnswer))fail('SPINE_V1_CONTENT_REQUIRED');
 if(req?.priorConversationSource!=='AUTHENTICATED_CONVERSATION_MESSAGES'
    &&req?.priorConversationSource!=='NOT_ATTESTED')
    fail('SPINE_V1_HISTORY_SOURCE_INVALID');
 if(req?.priorConversationSource==='AUTHENTICATED_CONVERSATION_MESSAGES'
    &&req?.authenticatedHistoryVerified!==true)
    fail('SPINE_V1_HISTORY_VERIFICATION_REQUIRED');
}
// Semantic reviewer results are model-assisted *candidates*, even if reviewers
// agree. Only independent source readback / a ground-truth oracle outside this
// module could upgrade a disputed assertion into an adjudicated fact.
function semanticCandidates(reviews,identity){
 if(!Array.isArray(reviews)||reviews.length>16)fail('SPINE_V1_REVIEW_SET_INVALID');
 return reviews.map((review,i)=>{
  if(review?.request_source_ref!==identity.userSourceRef||
     review?.response_source_ref!==identity.modelSourceRef||
     !['POSSIBLE_MISMATCH','POSSIBLE_HALLUCINATION','UNSUPPORTED_CLAIM','NO_ISSUE','UNKNOWN']
        .includes(review?.assessment))
    fail('SPINE_V1_REVIEW_SCOPE_INVALID');
  return review.assessment==='NO_ISSUE'||review.assessment==='UNKNOWN'?null:{
   issue_id:'spine-v1:'+digest([identity.userSourceRef,identity.modelSourceRef,
     review.assessment,i,review.summary]).slice(7,39),
   classification:review.assessment,
   origin_stage:'COGNITION',
   source_receipt_refs:[identity.userSourceRef,identity.modelSourceRef],
   excerpt:String(review.summary||'').slice(0,240),
   detection_source:'SEMANTIC_REVIEW_CANDIDATE',
   independently_adjudicated:false,
  };
 }).filter(Boolean);
}
export function assessIntelligenceSpineV1({
 continuityRootId,userSourceRef,modelSourceRef,currentRequest,rawAnswer,
 priorConversationSource='NOT_ATTESTED',authenticatedHistoryVerified=false,
 conversationDrift=null,modelIntegrity=null,trajectoryReplay=null,
 semanticReviews=[],providerCompletion=null,
}={}){
 const args={continuityRootId,userSourceRef,modelSourceRef,currentRequest,rawAnswer,
  priorConversationSource,authenticatedHistoryVerified};
 validation(args);
 const drift=result('CONTINUITY',conversationDrift);
 const factual=result('MODEL_OUTPUT_INTEGRITY',modelIntegrity);
 const replay=result('TRAJECTORY',trajectoryReplay);
 const semantic=semanticCandidates(semanticReviews,{userSourceRef,modelSourceRef});
 const boundary=inspectResponseEvidenceBoundary({
  userMessage:currentRequest,modelAnswer:rawAnswer,
  userSourceRef,modelSourceRef,
  providerStatus:providerCompletion?.status??null,
  providerIncompleteReason:providerCompletion?.incomplete_reason??null,
  outputTokens:providerCompletion?.output_tokens??null,
  maxOutputTokens:providerCompletion?.max_output_tokens??null,
 });
 const evidenceBoundary=result('NATIVE_EVIDENCE_BOUNDARY',boundary);
 // Historical replay findings belong to their *original assistant turn*.
 // Attaching them to the current answer would falsely count one past problem
 // as a new current-answer failure and inflate the native self-score penalty.
 const findings=[...drift,...factual,...semantic,...evidenceBoundary];
 const deduped=[...new Map(findings.map(f=>[f.issue_id,f])).values()];
 const responseCandidateCount=deduped.filter(f=>DRIFT_CLASSES.has(f.classification)||
  f.classification==='POSSIBLE_MISMATCH').length;
 const groundingCandidateCount=deduped.filter(f=>REFERENCE_CLASSES.has(f.classification)||
  f.classification==='POSSIBLE_HALLUCINATION'||
  f.classification==='UNSUPPORTED_CLAIM'||
  f.classification==='UNTRUSTED_SOURCE_EVENT_PROMOTION').length;
 const status=deduped.length?'REVIEW_REQUIRED':'LIMITED_COVERAGE_NO_CANDIDATES';
 const basis={
  version:INTELLIGENCE_SPINE_V1,
  continuity_root_id:continuityRootId,
  request_source_ref:userSourceRef,
  answer_source_ref:modelSourceRef,
  request_hash:digest(currentRequest),
  raw_answer_hash:digest(rawAnswer),
  status,findings:deduped,
  historical_replay_findings:replay,
  historical_replay_candidate_count:replay.length,
  evidence_boundary:boundary,
  coverage:{
   request_alignment:{
    status:conversationDrift?'BOUNDED_CHECK':'NOT_EVALUATED',
    candidate_count:responseCandidateCount,
    full_semantic_coverage_proven:false,
   },
   continuity:{
    status:conversationDrift?.status||'NOT_EVALUATED',
    authenticated_history:authenticatedHistoryVerified===true&&
      priorConversationSource==='AUTHENTICATED_CONVERSATION_MESSAGES',
   },
   factual_grounding:{
    status:modelIntegrity?.status||'NOT_EVALUATED',
    candidate_count:groundingCandidateCount,
    independent_truth_adjudication:'NOT_PERFORMED',
   },
   semantic_reasoning:{
    status:semanticReviews.length?'CANDIDATE_REVIEW_ONLY':'NOT_EVALUATED',
    review_count:semanticReviews.length,
    independent_truth_adjudication:'NOT_PERFORMED',
   },
   retrospective_replay:{
    status:trajectoryReplay?.status||'NOT_EVALUATED',
   },
   evidence_provenance:{status:boundary.coverage.untrusted_source_boundary,
    candidate_count:evidenceBoundary.filter(x=>x.classification==='UNTRUSTED_SOURCE_EVENT_PROMOTION').length,
    independent_fact_adjudication:'NOT_PERFORMED'},
   response_completeness:{status:boundary.coverage.response_completeness,
    candidate_count:evidenceBoundary.filter(x=>x.classification==='MODEL_RESPONSE_INCOMPLETE').length},
   business_outcome:{
    status:'NOT_OBSERVED',
    independent_external_readback:false,
   },
  },
  // A zero detector count does not imply zero actual hallucinations or drift.
  measured_drift_rate:null,measured_hallucination_rate:null,
  detector_recall:null,independently_verified_corrections:0,
  recovery:{
   disposition:deduped.length?'CANDIDATE_CORRECTION_ELIGIBLE':'NO_CANDIDATE_FOUND',
   original_answer_retained:true,
   regeneration_limit:1,
   needs_independent_review:true,
  },
  external_action_authorized:false,
  external_action_executed:false,
  production_publication_authorized:false,
 };
 return Object.freeze({...basis,evidence_receipt_hash:digest(basis)});
}

// Bounded optional *sandbox-only* correction exercise. The generator and
// evaluator must be supplied by the trusted server; neither can authorize
// external effects. The original answer is always preserved for the customer
// and auditors. Producing better-looking prose is not independent proof.
export async function attemptIntelligenceCorrectionV1({
 evaluation,originalAnswer,generateCandidate,assessCandidate,
}={}){
 if(evaluation?.version!==INTELLIGENCE_SPINE_V1||
   !validText(originalAnswer)||
   evaluation.raw_answer_hash!==digest(originalAnswer))
   fail('SPINE_V1_CORRECTION_EVIDENCE_MISMATCH');
 if(typeof generateCandidate!=='function'||typeof assessCandidate!=='function')
   fail('SPINE_V1_SERVER_CORRECTION_ADAPTERS_REQUIRED');
 if(evaluation.status!=='REVIEW_REQUIRED')return Object.freeze({
   status:'NOT_ATTEMPTED_NO_DETECTED_CANDIDATE',attempt_count:0,
   original_answer:originalAnswer,proposed_answer:null,
   independently_verified:false,publish_authorized:false,
 });
 const instructions=Object.freeze({
   request_source_ref:evaluation.request_source_ref,
   answer_source_ref:evaluation.answer_source_ref,
   request_hash:evaluation.request_hash,
   detected_issues:evaluation.findings.map(x=>({
     classification:x.classification,issue_id:x.issue_id,
     evidence_references:[...x.source_receipt_refs],
   })),
   no_external_tools:true,max_attempts:1,
 });
 const proposal=await generateCandidate(instructions);
 if(!validText(proposal)||proposal===originalAnswer)return Object.freeze({
   status:'NO_USEFUL_CORRECTION',attempt_count:1,
   original_answer:originalAnswer,proposed_answer:null,
   independently_verified:false,publish_authorized:false,
 });
 const assessment=await assessCandidate(proposal,instructions);
 if(assessment?.version!==INTELLIGENCE_SPINE_V1||
   assessment?.continuity_root_id!==evaluation.continuity_root_id||
   assessment?.request_source_ref!==evaluation.request_source_ref||
   assessment?.raw_answer_hash!==digest(proposal))
   fail('SPINE_V1_CORRECTION_REVIEW_SCOPE_INVALID');
 const newFindings=array(assessment.findings);
 const previousIds=new Set(evaluation.findings.map(f=>f.issue_id));
 const improvement=newFindings.length<evaluation.findings.length &&
   !newFindings.some(f=>!previousIds.has(f.issue_id));
 const outcome={
  status:improvement?'IMPROVED_CANDIDATE_NOT_VERIFIED':'CORRECTION_NOT_PROVEN',
  attempt_count:1,
  original_answer:originalAnswer,
  proposed_answer:proposal,
  initial_issue_count:evaluation.findings.length,
  candidate_issue_count:newFindings.length,
  candidate_better_on_available_checks:improvement,
  independently_verified:false,
  publish_authorized:false,external_action_authorized:false,
  preserved_original_receipt:evaluation.evidence_receipt_hash,
  candidate_receipt:assessment.evidence_receipt_hash,
 };
 return Object.freeze({...outcome,correction_receipt_hash:digest(outcome)});
}
