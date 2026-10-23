import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectConversationDrift} from '../src/reality-continuous-integrity-spine-v0.1.js';
import {assessIntelligenceSpineV1,attemptIntelligenceCorrectionV1,INTELLIGENCE_SPINE_V1}
 from '../src/reality-intelligence-spine-v1.0.js';

const root='preview:owned:construction';
const requestSource='signal:turn8';
const answerSource='model-response:turn8';
const previous=[
 {role:'user',source_ref:'user:turn7',
  text:'A subcontractor claims the homeowner approved everything verbally, but there is no independent record. Is the estimate authorized to be sent?'},
 {role:'assistant',source_ref:'assistant:turn7',
  text:'No, the estimate is not authorized to be sent. The original instruction requires explicit approval of the final scope; a subcontractor claim is insufficient.'},
];
const request='Different topic: brainstorm an inventory checklist for the next workday, without buying anything.';
const badAnswer=previous[1].text;
const safeAnswer='Inventory checklist: count fasteners, inspect tool batteries, reconcile cabinet hardware, and check supplies before the shift. No purchase was made.';
function getDrift(answer){
 return inspectConversationDrift({
  priorTurns:previous,currentUserMessage:request,modelAnswer:answer,
  continuityRootId:root,modelResponseId:'turn8',
  currentUserSourceRef:requestSource,
  historySource:'AUTHENTICATED_CONVERSATION_MESSAGES',
 });
}
function assess(answer,drift=getDrift(answer),extras={}){
 return assessIntelligenceSpineV1({
  continuityRootId:root,userSourceRef:requestSource,modelSourceRef:answerSource,
  currentRequest:request,rawAnswer:answer,
  priorConversationSource:'AUTHENTICATED_CONVERSATION_MESSAGES',
  authenticatedHistoryVerified:true,
  conversationDrift:drift,
  modelIntegrity:{status:'NO_TRUSTED_REFERENCE',findings:[]},
  trajectoryReplay:{status:'LIMITED_REPLAY_NO_DRIFT_FLAGGED',findings:[]},
  ...extras,
 });
}
test('v1 combines existing continuity detector and records all unverified coverage honestly',()=>{
 const out=assess(badAnswer);
 assert.equal(out.version,INTELLIGENCE_SPINE_V1);
 assert.equal(out.status,'REVIEW_REQUIRED');
 assert.equal(out.findings.some(x=>x.classification==='STALE_RESPONSE_REPLAY'),true);
 assert.equal(out.coverage.factual_grounding.status,'NO_TRUSTED_REFERENCE');
 assert.equal(out.coverage.semantic_reasoning.status,'NOT_EVALUATED');
 assert.equal(out.coverage.business_outcome.status,'NOT_OBSERVED');
 assert.equal(out.measured_drift_rate,null);
 assert.equal(out.measured_hallucination_rate,null);
 assert.equal(out.external_action_authorized,false);
 assert.equal(out.production_publication_authorized,false);
 assert.match(out.evidence_receipt_hash,/^sha256:[a-f0-9]{64}$/);
 assert.equal(out.evidence_receipt_hash,assess(badAnswer).evidence_receipt_hash);
});
test('correctly distinguish zero detector candidates from an independently verified correct answer',()=>{
 const out=assess(safeAnswer);
 assert.equal(out.status,'LIMITED_COVERAGE_NO_CANDIDATES');
 assert.equal(out.coverage.semantic_reasoning.status,'NOT_EVALUATED');
 assert.equal(out.coverage.factual_grounding.independent_truth_adjudication,'NOT_PERFORMED');
 assert.equal(out.detector_recall,null);
 assert.equal(out.independently_verified_corrections,0);
});
test('same-source semantic review can flag an additional candidate but cannot certify hallucination',()=>{
 const out=assess(safeAnswer,getDrift(safeAnswer),{
  semanticReviews:[{request_source_ref:requestSource,response_source_ref:answerSource,
   assessment:'POSSIBLE_HALLUCINATION',
   summary:'Invented cabinet supplier in an unsupported claim'}],
 });
 assert.equal(out.status,'REVIEW_REQUIRED');
 assert.equal(out.findings.some(x=>x.classification==='POSSIBLE_HALLUCINATION'),true);
 assert.equal(out.findings.every(x=>x.independently_adjudicated===false),true);
 assert.equal(out.coverage.semantic_reasoning.independent_truth_adjudication,'NOT_PERFORMED');
 assert.equal(out.coverage.factual_grounding.candidate_count,1);
});
test('reject a semantic reviewer finding for another user or model response',()=>{
 assert.throws(()=>assess(safeAnswer,getDrift(safeAnswer),{
  semanticReviews:[{request_source_ref:'foreign:turn',response_source_ref:answerSource,
   assessment:'POSSIBLE_MISMATCH',summary:'unrelated'}],
 }),/SPINE_V1_REVIEW_SCOPE_INVALID/);
 assert.throws(()=>assess(safeAnswer,getDrift(safeAnswer),{
  semanticReviews:[{request_source_ref:requestSource,response_source_ref:'foreign:answer',
   assessment:'POSSIBLE_HALLUCINATION',summary:'unrelated'}],
 }),/SPINE_V1_REVIEW_SCOPE_INVALID/);
 assert.throws(()=>assessIntelligenceSpineV1({
  continuityRootId:root,userSourceRef:requestSource,modelSourceRef:answerSource,
  currentRequest:request,rawAnswer:safeAnswer,
  priorConversationSource:'AUTHENTICATED_CONVERSATION_MESSAGES',
  authenticatedHistoryVerified:false,
 }),/SPINE_V1_HISTORY_VERIFICATION_REQUIRED/);
});
test('bounded candidate correction preserves original answer and does not self-certify',async()=>{
 const original=assess(badAnswer);let generates=0,reviews=0;
 const result=await attemptIntelligenceCorrectionV1({
  evaluation:original,originalAnswer:badAnswer,
  generateCandidate:async instructions=>{
   generates++;assert.equal(instructions.no_external_tools,true);
   assert.equal(instructions.max_attempts,1);
   assert.equal(instructions.detected_issues.length,original.findings.length);
   return safeAnswer;
  },
  assessCandidate:async text=>{reviews++;return assess(text)},
 });
 assert.equal(generates,1);
 assert.equal(reviews,1);
 assert.equal(result.attempt_count,1);
 assert.equal(result.status,'IMPROVED_CANDIDATE_NOT_VERIFIED');
 assert.equal(result.candidate_better_on_available_checks,true);
 assert.equal(result.original_answer,badAnswer);
 assert.equal(result.proposed_answer,safeAnswer);
 assert.equal(result.publish_authorized,false);
 assert.equal(result.independently_verified,false);
 assert.equal(result.external_action_authorized,false);
 assert.match(result.correction_receipt_hash,/^sha256:[a-f0-9]{64}$/);
});
test('correction cannot run if there is no candidate, no verified scope, or a new issue',async()=>{
 const clean=assess(safeAnswer);
 const noRun=await attemptIntelligenceCorrectionV1({
  evaluation:clean,originalAnswer:safeAnswer,
  generateCandidate:async()=>{throw Error('SHOULD_NOT_CALL')},
  assessCandidate:async()=>{throw Error('SHOULD_NOT_CALL')},
 });
 assert.equal(noRun.status,'NOT_ATTEMPTED_NO_DETECTED_CANDIDATE');
 assert.equal(noRun.attempt_count,0);
 await assert.rejects(()=>attemptIntelligenceCorrectionV1({
  evaluation:assess(badAnswer),originalAnswer:'tampered original',
  generateCandidate:async()=>safeAnswer,assessCandidate:async()=>assess(safeAnswer),
 }),/SPINE_V1_CORRECTION_EVIDENCE_MISMATCH/);
 const failed=await attemptIntelligenceCorrectionV1({
  evaluation:assess(badAnswer),originalAnswer:badAnswer,
  generateCandidate:async()=>safeAnswer,
  assessCandidate:async()=>assess(safeAnswer,getDrift(safeAnswer),{
   semanticReviews:[{request_source_ref:requestSource,response_source_ref:answerSource,
    assessment:'POSSIBLE_MISMATCH',summary:'new unresolved issue'}],
  }),
 });
 assert.equal(failed.status,'CORRECTION_NOT_PROVEN');
 assert.equal(failed.publish_authorized,false);
});
test('candidate reviewer must belong to the same root, request and raw response',async()=>{
 await assert.rejects(()=>attemptIntelligenceCorrectionV1({
  evaluation:assess(badAnswer),originalAnswer:badAnswer,
  generateCandidate:async()=>safeAnswer,
  assessCandidate:async()=>({...assess(safeAnswer),continuity_root_id:'someone-else'}),
 }),/SPINE_V1_CORRECTION_REVIEW_SCOPE_INVALID/);
});
