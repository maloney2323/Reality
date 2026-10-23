// Reality-native consequential trust judge v1.
// Reality judges its own model outputs using its EXISTING Intelligence Spine
// receipts, trusted continuity, and later replay. No second LLM judge.
// CANDIDATE flags are not proven wrong answers. Self-score != true accuracy.
import {createHash} from 'node:crypto';
export const REALITY_NATIVE_JUDGE_VERSION='reality-consequential-native-judge-v1.0';
const hash=x=>'sha256:'+createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail=x=>{throw Error(x)};
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
const validIssues=new Set([
 'STALE_RESPONSE_REPLAY','POSSIBLE_CURRENT_TURN_MISALIGNMENT',
 'CONVERSATIONAL_PRECONDITION_DRIFT','CONVERSATIONAL_REVISION_REQUIRES_REVIEW',
 'CONVERSATIONAL_RETROSPECTIVE_DRIFT','POTENTIAL_MATERIAL_DRIFT',
 'CONTESTED_SOURCE_REFERENCE','UNVERIFIED_EXECUTION_CLAIM',
 'POSSIBLE_MISMATCH','POSSIBLE_HALLUCINATION','UNSUPPORTED_CLAIM'
]);
function percent(n,d){return d?Number((100*n/d).toFixed(2)):null;}
function checkSpine(spine,turn){
 if(!spine||spine.version!=='reality-intelligence-spine-v1.0'||
    spine.continuity_root_id!==turn.continuity_root_id||
    spine.request_source_ref!==turn.user_source_ref||
    spine.answer_source_ref!==turn.answer_source_ref||
    !nonempty(spine.evidence_receipt_hash)||
    !Array.isArray(spine.findings)||!spine.coverage)
  fail('NATIVE_JUDGE_SPINE_EVIDENCE_REQUIRED');
 if(!['REVIEW_REQUIRED','LIMITED_COVERAGE_NO_CANDIDATES'].includes(spine.status))
  fail('NATIVE_JUDGE_SPINE_STATUS_INVALID');
 // A self-reported successful check does not mean an independent truth verdict.
 if(spine.independently_verified_corrections!==0||
    spine.external_action_authorized!==false||
    spine.production_publication_authorized!==false)
  fail('NATIVE_JUDGE_UNAUTHORIZED_PROMOTION');
 for(const finding of spine.findings){
  if(!nonempty(finding.issue_id)||!validIssues.has(finding.classification)||
    finding.independently_adjudicated!==false)
   fail('NATIVE_JUDGE_UNTRUSTED_FINDING');
 }
}
function trustedHistory(turn){
 if(!nonempty(turn?.turn_id)||!nonempty(turn.continuity_root_id)||
    !nonempty(turn.user_source_ref)||!nonempty(turn.answer_source_ref)||
    !nonempty(turn.request)||!nonempty(turn.answer)||
    turn.owner_scoped_readback_verified!==true||
    !nonempty(turn.user_message_receipt_hash)||
    !nonempty(turn.assistant_message_receipt_hash))
  fail('NATIVE_JUDGE_AUTHENTICATED_READBACK_REQUIRED');
}
const kinds=['request_alignment','continuity','factual_grounding',
 'semantic_reasoning','retrospective_replay','business_outcome'];
function coverage(spine){
 const entries=kinds.map(k=>[k,spine.coverage[k]?.status||'NOT_EVALUATED']);
 const evaluated=entries.filter(([key,state])=>
   key==='request_alignment' ? state==='BOUNDED_CHECK' :
   key==='continuity' ? !['NOT_EVALUATED','NO_CONTINUITY_ROOT'].includes(state) :
   key==='factual_grounding' ? state==='LIMITED_CHECK_NO_FLAG'||state==='REVIEW_REQUIRED':
   key==='semantic_reasoning' ? state==='CANDIDATE_REVIEW_ONLY':
   key==='retrospective_replay' ? !['NOT_EVALUATED','NO_AUTHENTICATED_TRAJECTORY'].includes(state):
   state==='INDEPENDENTLY_OBSERVED');
 return {assessments:entries.map(([area,status])=>({area,status})),
  assessed_dimension_count:evaluated.length,unassessed_dimension_count:kinds.length-evaluated.length,
  total_dimensions:kinds.length,coverage_pct:percent(evaluated.length,kinds.length)};
}
export function realityJudgeTurn(turn){
 trustedHistory(turn);
 checkSpine(turn.spine,turn);
 const detail=coverage(turn.spine);
 const findings=turn.spine.findings.map(x=>({
  issue_id:x.issue_id,classification:x.classification,
  detection_source:x.detection_source,
  source_receipt_refs:x.source_receipt_refs,
  independently_adjudicated:false,
 }));
 const result={
  version:REALITY_NATIVE_JUDGE_VERSION,
  turn_id:turn.turn_id,continuity_root_id:turn.continuity_root_id,
  user_source_ref:turn.user_source_ref,answer_source_ref:turn.answer_source_ref,
  spine_receipt:turn.spine.evidence_receipt_hash,
  verdict:findings.length?'REVIEW_CANDIDATES':'NO_CANDIDATES_IN_CHECKED_COVERAGE',
  finding_count:findings.length,findings,coverage:detail,
  outcome_verdict:'EXTERNAL_OUTCOME_NOT_VERIFIED',
  true_hallucination_count:null,true_drift_count:null,
  detector_accuracy:null,detector_recall:null,verified_correction_count:0,
  no_real_customer_execution_claimed:true,
 };
 return Object.freeze({...result,judge_receipt_hash:hash(result)});
}
// An existing, trusted Reality audit can later discover an earlier escape.
// A finding discovered on turn N must point to the original, scoped assistant
// receipt and have its own durable audit receipt. Neither model's text is truth.
export function auditRealityJudgments({judgments=[],replayFindings=[]}={}){
 if(!Array.isArray(judgments)||!Array.isArray(replayFindings))
  fail('NATIVE_JUDGE_AUDIT_ARRAYS_REQUIRED');
 const unique=new Set(),byAnswer=new Map();
 for(const entry of judgments){
  if(entry?.version!==REALITY_NATIVE_JUDGE_VERSION||
     !nonempty(entry.judge_receipt_hash)||!nonempty(entry.answer_source_ref)||
     unique.has(entry.turn_id))fail('NATIVE_JUDGE_AUDIT_JUDGMENT_INVALID');
  unique.add(entry.turn_id);byAnswer.set(entry.answer_source_ref,entry);
 }
 const later=[];
 for(const f of replayFindings){
  if(!nonempty(f?.original_answer_source_ref)||!nonempty(f?.discovery_turn_id)||
    !nonempty(f?.audit_receipt_hash)||!nonempty(f?.classification)||
    !validIssues.has(f.classification))fail('NATIVE_JUDGE_AUDIT_SOURCE_REQUIRED');
  const original=byAnswer.get(f.original_answer_source_ref);
  if(!original||original.continuity_root_id!==f.continuity_root_id||
     !unique.has(f.discovery_turn_id))fail('NATIVE_JUDGE_AUDIT_CROSS_SCOPE_OR_MISSING_TURN');
  const originalDetected=original.findings.some(x=>x.classification===f.classification);
  later.push({origin_turn_id:original.turn_id,
    discovered_at_turn_id:f.discovery_turn_id,classification:f.classification,
    previous_detector_had_same_class:originalDetected,
    audit_receipt_hash:f.audit_receipt_hash,
    status:originalDetected?'RECONFIRMED':'NEW_RETROSPECTIVE_CANDIDATE',
    independently_verified_hallucination:false});
 }
 const reviewed=judgments.length;
 const flagged=judgments.filter(x=>x.finding_count>0).length;
 const noFlags=reviewed-flagged;
 const selfScore=percent(noFlags,reviewed);
 const answer={
  version:REALITY_NATIVE_JUDGE_VERSION,
  status:reviewed?'REALITY_SELF_AUDIT_AVAILABLE':'NOT_RUN',
  evaluated_turn_count:reviewed,
  turns_with_candidate_findings:flagged,
  self_reported_clear_turns:noFlags,
  self_reported_clear_pct:selfScore,
  // A perfect score is only no flags observed, not zero false negatives.
  score_meaning:'NO_DETECTED_CANDIDATES_IN_PERFORMED_CHECKS_ONLY',
  true_accuracy_pct:null,actual_escaped_errors:null,
  coverage_dimensions_evaluated:judgments.reduce((n,x)=>n+x.coverage.assessed_dimension_count,0),
  coverage_dimensions_unassessed:judgments.reduce((n,x)=>n+x.coverage.unassessed_dimension_count,0),
  retrospective_candidates:later,
  previously_unflagged_candidates_discovered_later:later.filter(x=>x.status==='NEW_RETROSPECTIVE_CANDIDATE').length,
  verified_corrections:0,
 };
 return Object.freeze({...answer,self_audit_receipt_hash:hash(answer)});
}
