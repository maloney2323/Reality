// Conversation trust pulse v0.1: receipt-derived, non-promotional confidence status.
// Does NOT claim zero drift when an extractor, truth adjudicator, or persistence is unavailable.
export const CONVERSATION_TRUST_PULSE_VERSION='reality-conversation-trust-pulse-v0.1';
const VERSION='reality-continuous-reliability-v0.1';
const STATUS=Object.freeze({
 DETECTED_CONTAINED:'DETECTED_AND_CONTAINED',
 FINDINGS_NEED_REVIEW:'FINDINGS_NEED_REVIEW',
 FULL_CHECK_CLEAR:'CHECKED_NO_FINDINGS_FULLY_ADJUDICATED',
 LIMITED_CHECK:'NO_FINDINGS_IN_LIMITED_CHECK',
 INSUFFICIENT:'COVERAGE_INSUFFICIENT',
 NOT_MONITORED:'NOT_MONITORED',
 CONVERSATION_RISK:'CONVERSATIONAL_DRIFT_RISK',
 USER_REVISION:'USER_INTENT_REVISION_REVIEW',
});
const unique=a=>[...new Set(a)];
const integer=x=>Number.isInteger(x)&&x>=0;

export function buildUnmonitoredTrustPulse(reason='CONTINUOUS_RELIABILITY_NOT_ENABLED'){
 return Object.freeze({
  version:CONVERSATION_TRUST_PULSE_VERSION,
  status:STATUS.NOT_MONITORED,
  headline:'Monitoring unavailable',
  note:'No drift or hallucination assurance is possible for this turn.',
  reason:String(reason).slice(0,100),
  evidence_receipt_id:null,turn:null,checked_scope:'NONE',
  whole_response_verified:false,drift_free_claim_allowed:false,
  next_digest_in_turns:null,digest:null,
 });
}

export function buildConversationTrustPulse({history,turn,interval=10}={}){
 if(!Array.isArray(history)||!Number.isInteger(turn)||turn<1 ||
    !Number.isInteger(interval)||interval<2||interval>100)
  throw Error('TRUST_PULSE_HISTORY_AND_TURN_REQUIRED');
 const raw=history.filter(e=>e.event_kind==='RAW_SIGNAL');
 if(raw.length!==turn)throw Error('TRUST_PULSE_TURN_MISMATCH');
 const findings=history.filter(e=>e.event_kind==='VERIFICATION' &&
   e.payload?.cycle_version===VERSION &&
   e.payload?.event_type==='MODEL_OUTPUT_ASSESSMENT');
 const atTurn=findings.filter(e=>e.payload.turn===turn);
 if(atTurn.length!==1 || !atTurn[0].event_id)
  throw Error('TRUST_PULSE_ASSESSMENT_RECEIPT_REQUIRED');
 const current=atTurn[0],p=current.payload;
 const evaluated=p.evaluation_status==='EVALUATED_AGAINST_SOURCE_ATTESTATION';
 const classified=unique([...(p.drift||[]),...(p.hallucination_suspected||[])]);
 const hasFindings=classified.length>0;
 const conversationFindings=Array.isArray(p.conversational_drift?.findings)?p.conversational_drift.findings:[];
 const modelDriftCandidates=conversationFindings.filter(f=>f.classification!=='CONVERSATIONAL_REVISION_REQUIRES_REVIEW');
 const userRevisions=conversationFindings.filter(f=>f.classification==='CONVERSATIONAL_REVISION_REQUIRES_REVIEW');
 const conversationRisk=modelDriftCandidates.length>0;
 const contained=p.model_output_quarantined===true;
 const wholeResponse=evaluated && p.independent_truth_adjudication===true &&
   p.extraction_completeness_verified===true && !hasFindings && conversationFindings.length===0;
 let status,headline,note;
 if(hasFindings){
  status=contained?STATUS.DETECTED_CONTAINED:STATUS.FINDINGS_NEED_REVIEW;
  headline=contained?'Potential mistake detected · Answer contained':'Potential mistake detected · Review needed';
  note='Typed findings were recorded against source attestations. Correction is not a verified real-world repair.';
 }else if(conversationRisk){
  status=STATUS.CONVERSATION_RISK;
  headline=modelDriftCandidates.some(f=>f.recurrence_count>=2)
    ?'Recurring conversational drift risk' : 'Possible conversational drift detected';
  note='Reality found a possible deviation from authenticated user intent or the current question. This is a limited diagnostic, not a verified semantic error or an executed repair.';
 }else if(userRevisions.length){
  status=STATUS.USER_REVISION;
  headline='User changed a prior instruction · Review needed';
  note='Reality preserved the earlier condition and recorded a possible user revision. This is NOT classified as an AI drift error.';
 }else if(wholeResponse){
  status=STATUS.FULL_CHECK_CLEAR;
  headline='Checked answer · No findings';
  note='Independent adjudication and complete extraction were attested for this turn only.';
 }else if(evaluated){
  status=STATUS.LIMITED_CHECK;
  headline='Limited check · No findings in checked claims';
  note='The entire answer was not independently adjudicated. Undetected errors remain possible.';
 }else{
  status=STATUS.INSUFFICIENT;
  headline='Verification incomplete';
  note='This answer was not evaluated against sufficient source-attested structured evidence.';
 }
 const remainder=turn%interval;
 const digest=remainder===0?buildDigest(findings,{windowEnd:turn,interval,sourceReceipts:history}):null;
 return Object.freeze({
  version:CONVERSATION_TRUST_PULSE_VERSION,status,headline,note,
  evidence_receipt_id:current.event_id,turn,
  checked_scope:evaluated?'SOURCE_ATTESTED_STRUCTURED_CLAIMS_ONLY':'NOT_EVALUATED',
  extraction_completeness_verified:p.extraction_completeness_verified===true,
  independent_truth_adjudication:p.independent_truth_adjudication===true,
  whole_response_verified:wholeResponse,
  drift_free_claim_allowed:false, // Even fully checked output is NOT proof of universal error absence.
  detected_codes:classified,
  conversational_drift_codes:unique(conversationFindings.map(f=>f.classification)),
  conversational_drift_count:conversationFindings.length,
  conversational_drift_findings:conversationFindings.map(f=>({
    issue_id:f.issue_id,classification:f.classification,
    first_detected_turn:f.first_detected_turn||turn,
    detected_turn:turn,recurrence_count:f.recurrence_count||1,
    source_receipt_refs:f.source_receipt_refs||[],
    original_user_text:f.original_user_text||null,
    observed_model_text:f.observed_model_text||null,
    repair_verified_turn:null,
  })),
  conversational_coverage:p.conversational_drift?.assessment_scope||'NOT_EVALUATED',
  model_output_quarantined:contained,
  correction_proposed:p.correction_proposed===true,
  repair_independently_verified:p.recovery_independently_verified===true,
  no_external_effects_claimed:p.external_actions_authorized!==true,
  next_digest_in_turns:remainder===0?interval:interval-remainder,
  digest,
 });
}

function buildDigest(findings,{windowEnd,interval,sourceReceipts}){
 const start=windowEnd-interval+1;
 const subset=findings.filter(e=>e.payload.turn>=start&&e.payload.turn<=windowEnd);
 const present=new Set(subset.map(e=>e.payload.turn));
 const evaluated=subset.filter(e=>e.payload.evaluation_status==='EVALUATED_AGAINST_SOURCE_ATTESTATION');
 const complete=subset.filter(e=>e.payload.evaluation_status==='EVALUATED_AGAINST_SOURCE_ATTESTATION' &&
    e.payload.independent_truth_adjudication===true &&
    e.payload.extraction_completeness_verified===true);
 const detected=subset.filter(e=>[...(e.payload.drift||[]),...(e.payload.hallucination_suspected||[])].length>0);
 const contained=detected.filter(e=>e.payload.model_output_quarantined===true);
 // Don't silently discard previously detected incidents that lack verified closure.
 const allIncidentTurns=findings.filter(e=>e.payload.turn<=windowEnd &&
   [...(e.payload.drift||[]),...(e.payload.hallucination_suspected||[])].length>0);
 const unresolved=allIncidentTurns.filter(e=>e.payload.recovery_independently_verified!==true);
 const conversationFindings=subset.flatMap(e=>e.payload.conversational_drift?.findings||[]);
 const modelDriftCandidates=conversationFindings.filter(f=>f.classification!=='CONVERSATIONAL_REVISION_REQUIRES_REVIEW');
 const allConversationFindings=findings.filter(e=>e.payload.turn<=windowEnd)
   .flatMap(e=>e.payload.conversational_drift?.findings||[]);
 const unverifiedConvo=new Set(allConversationFindings.filter(f=>!integer(f.repair_verified_turn))
   .map(f=>f.anchor_id || f.classification+'|'+(f.source_receipt_refs||[])[0]));
 const conversationalCoverage=subset.filter(e=>e.payload.conversational_drift?.history_scope===
   'AUTHENTICATED_PRIOR_TURNS_PLUS_CURRENT').length;
 return Object.freeze({
  kind:'TEN_TURN_CONVERSATION_HEALTH_DIGEST',
  window_start:start,window_end:windowEnd,expected_turns:interval,
  assessment_receipts:subset.length,
  missing_assessment_turns:interval-present.size,
  source_attested_structured_checks:evaluated.length,
  independently_fully_adjudicated_turns:complete.length,
  insufficient_or_partially_assessed_turns:interval-complete.length,
  turns_with_typed_findings:detected.length,
  turns_with_conversational_risks:subset.filter(e=>(e.payload.conversational_drift?.findings||[]).some(f=>f.classification!=='CONVERSATIONAL_REVISION_REQUIRES_REVIEW')).length,
  conversational_risk_observations:modelDriftCandidates.length,
  user_intent_revision_reviews:conversationFindings.length-modelDriftCandidates.length,
  recurring_conversational_risks:conversationFindings.filter(f=>f.recurrence_count>=2).length,
  unresolved_conversational_incident_anchors:unverifiedConvo.size,
  authenticated_historical_alignment_checks:conversationalCoverage,
  model_outputs_contained:contained.length,
  open_or_unverified_incident_turns:unresolved.length,
  missed_error_rate_pct:null,
  drift_rate_pct:null,
  hallucination_rate_pct:null,
  all_clear:false, // Cannot declare whole-conversation drift freedom.
  evidence_receipt_ids:subset.map(e=>e.event_id),
  integrity_basis:'CALLER_SUPPLIED_HISTORY_MUST_BE_VALIDATED_BY_CONTINUITY_RUNTIME',
  source_event_count:sourceReceipts.length,
 });
}
