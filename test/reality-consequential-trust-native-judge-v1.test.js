import test from 'node:test';
import assert from 'node:assert/strict';
import {assessIntelligenceSpineV1} from '../src/reality-intelligence-spine-v1.0.js';
import {CTB_TURNS,getModelFacingSequence} from '../benchmarks/consequential-trust-llm-v1.js';
import {compareConsequentialTrustNativeRuns}
 from '../benchmarks/consequential-trust-llm-v1.report.js';
import {realityJudgeTurn,auditRealityJudgments}
 from '../benchmarks/consequential-trust-native-judge-v1.js';

const root='sandbox:owner:judge:one';
function makeTurn(index,issue=false){
 const item=CTB_TURNS[index];
 const userSource='verified:user:'+item.turn_id;
 const answerSource='model-response:'+item.turn_id;
 const reply=issue
  ?'We will send the construction estimate now.'
  :'We can prepare a draft but cannot claim an external customer send occurred.';
 const finding={issue_id:'existing-continuity-detector:'+item.turn_id,
  classification:'CONVERSATIONAL_PRECONDITION_DRIFT',origin_stage:'COGNITION',
  source_receipt_refs:[userSource,answerSource],observed_model_text:reply,
  independently_adjudicated:false};
 const spine=assessIntelligenceSpineV1({
  continuityRootId:root,userSourceRef:userSource,modelSourceRef:answerSource,
  currentRequest:item.text,rawAnswer:reply,
  priorConversationSource:'AUTHENTICATED_CONVERSATION_MESSAGES',
  authenticatedHistoryVerified:true,
  conversationDrift:{
   status:issue?'EARLY_CONVERSATION_DRIFT_RISK':'LIMITED_CONVERSATION_CHECK_NO_FLAG',
   findings:issue?[finding]:[],
  },modelIntegrity:{status:'NO_TRUSTED_REFERENCE',findings:[]},
  trajectoryReplay:{status:'LIMITED_REPLAY_NO_DRIFT_FLAGGED',findings:[]},
 });
 return {turn_id:item.turn_id,continuity_root_id:root,
  user_source_ref:userSource,answer_source_ref:answerSource,
  request:item.text,answer:reply,
  owner_scoped_readback_verified:true,
  user_message_receipt_hash:'sha256:synthetic-user-'+index,
  assistant_message_receipt_hash:'sha256:synthetic-assistant-'+index,
  spine};
}
test('Reality self-score can be 100 even when its coverage is incomplete',()=>{
 const t1=realityJudgeTurn(makeTurn(0));
 const t2=realityJudgeTurn(makeTurn(1));
 const report=auditRealityJudgments({judgments:[t1,t2]});
 assert.equal(report.self_reported_clear_pct,100);
 assert.equal(report.turns_with_candidate_findings,0);
 assert.equal(report.true_accuracy_pct,null);
 assert.equal(report.actual_escaped_errors,null);
 assert.ok(report.coverage_dimensions_unassessed>0);
 assert.match(report.self_audit_receipt_hash,/^sha256:[0-9a-f]{64}$/);
});
test('existing Continuity Spine detector findings become native Reality judge candidates',()=>{
 const evaluated=realityJudgeTurn(makeTurn(2,true));
 assert.equal(evaluated.verdict,'REVIEW_CANDIDATES');
 assert.equal(evaluated.finding_count,1);
 assert.equal(evaluated.findings[0].classification,'CONVERSATIONAL_PRECONDITION_DRIFT');
 assert.equal(evaluated.true_drift_count,null);
 assert.equal(evaluated.detector_recall,null);
 assert.equal(evaluated.no_real_customer_execution_claimed,true);
});
test('retrospective Reality replay discovers previously missed candidates',()=>{
 const early=realityJudgeTurn(makeTurn(0));
 const later=realityJudgeTurn(makeTurn(1));
 const report=auditRealityJudgments({judgments:[early,later],
  replayFindings:[{original_answer_source_ref:early.answer_source_ref,
    continuity_root_id:root,discovery_turn_id:later.turn_id,
    audit_receipt_hash:'sha256:trusted-replay-audit',
    classification:'STALE_RESPONSE_REPLAY'}]});
 assert.equal(report.self_reported_clear_pct,100);
 assert.equal(report.retrospective_revised_clear_pct,50);
 assert.equal(report.retrospectively_reclassified_turn_count,1);
 assert.equal(report.original_self_score_preserved,true);
 assert.equal(report.previously_unflagged_candidates_discovered_later,1);
 assert.equal(report.retrospective_candidates[0].status,'NEW_RETROSPECTIVE_CANDIDATE');
 assert.equal(report.retrospective_candidates[0].independently_verified_hallucination,false);
});
test('a previous issue rediscovered is not falsely counted as a new miss',()=>{
 const earlier=realityJudgeTurn(makeTurn(0,true));
 const later=realityJudgeTurn(makeTurn(1));
 const out=auditRealityJudgments({judgments:[earlier,later],
  replayFindings:[{original_answer_source_ref:earlier.answer_source_ref,
    continuity_root_id:root,discovery_turn_id:later.turn_id,
    audit_receipt_hash:'sha256:replay-reconfirm',
    classification:'CONVERSATIONAL_PRECONDITION_DRIFT'}]});
 assert.equal(out.previously_unflagged_candidates_discovered_later,0);
 assert.equal(out.retrospective_candidates[0].status,'RECONFIRMED');
});
test('Reality cannot claim verified facts, forge identity or tamper with the Spine hash',()=>{
 const valid=makeTurn(4);
 assert.throws(()=>realityJudgeTurn({...valid,request:'changed after check'}),
   /NATIVE_JUDGE_SPINE_HASH_OR_CONTENT_MISMATCH/);
 assert.throws(()=>realityJudgeTurn({...valid,owner_scoped_readback_verified:false}),
   /NATIVE_JUDGE_AUTHENTICATED_READBACK_REQUIRED/);
 assert.throws(()=>realityJudgeTurn({...valid,spine:{
   ...valid.spine,independently_verified_corrections:1}}),
   /NATIVE_JUDGE_SPINE_HASH_OR_CONTENT_MISMATCH|NATIVE_JUDGE_UNAUTHORIZED_PROMOTION/);
});
test('no cross-world replay and no forged native receipts',()=>{
 const a=realityJudgeTurn(makeTurn(0));
 const b=realityJudgeTurn(makeTurn(1));
 assert.throws(()=>auditRealityJudgments({judgments:[a,b],
  replayFindings:[{original_answer_source_ref:a.answer_source_ref,
    continuity_root_id:'another:tenant',discovery_turn_id:b.turn_id,
    audit_receipt_hash:'sha256:trusted-replay-audit',
    classification:'STALE_RESPONSE_REPLAY'}]}),
   /NATIVE_JUDGE_AUDIT_CROSS_SCOPE_OR_MISSING_TURN/);
 assert.throws(()=>auditRealityJudgments({judgments:[
  {...a,findings:[{classification:'fabricated'}]},b]}),
  /NATIVE_JUDGE_AUDIT_RECEIPT_TAMPERED/);
 assert.throws(()=>auditRealityJudgments({judgments:[a,b],
  replayFindings:[{original_answer_source_ref:a.answer_source_ref,
    continuity_root_id:root,discovery_turn_id:a.turn_id,
    audit_receipt_hash:'sha256:replay',
    classification:'STALE_RESPONSE_REPLAY'}]}),
   /NATIVE_JUDGE_RETROSPECTIVE_ORDER_INVALID/);
});

test('Reality alone scores both underlying model and Reality treatment; no external referee needed',()=>{
 const makeArm=mode=>({
  mode,model:'identical-underlying-model',model_version:'test-lock',
  sampling_config_hash:'sha256:same-fixed-config',
  inputs:getModelFacingSequence(),
  responses:CTB_TURNS.map(t=>({turn_id:t.turn_id,
    text:'synthetic output',response_id:'response:'+t.turn_id})),
 });
 const b=makeArm('DIRECT_NO_REALITY_CONTEXT');
 const r=makeArm('REALITY_LAYER_ENABLED');
 const baselineJudgments=CTB_TURNS.map((_,i)=>realityJudgeTurn(makeTurn(i,i<8)));
 const realityJudgments=CTB_TURNS.map((_,i)=>realityJudgeTurn(makeTurn(i,i<2)));
 const out=compareConsequentialTrustNativeRuns({
  baseline:b,reality:r,baselineJudgments,realityJudgments});
 assert.equal(out.status,'REALITY_NATIVE_SCORES_COMPLETE');
 assert.equal(out.scoring_authority,'REALITY_NATIVE_INTELLIGENCE_SPINE');
 assert.equal(out.human_oracle_required,false);
 assert.equal(out.independent_llm_judge_required,false);
 assert.equal(out.baseline.audit.self_reported_clear_pct,92);
 assert.equal(out.reality.audit.self_reported_clear_pct,98);
 assert.equal(out.self_reported_clear_rate_change_pp,6);
 assert.equal(out.true_accuracy_pct,null);
 assert.equal(out.verified_model_uplift,null);
});
test('Reality native comparison with missing judge evidence cannot claim full result',()=>{
 const makeArm=mode=>({
  mode,model:'identical-underlying-model',model_version:'test-lock',
  sampling_config_hash:'sha256:same-fixed-config',
  inputs:getModelFacingSequence(),
  responses:CTB_TURNS.map(t=>({turn_id:t.turn_id,
    text:'synthetic output',response_id:'response:'+t.turn_id})),
 });
 const out=compareConsequentialTrustNativeRuns({
  baseline:makeArm('DIRECT_NO_REALITY_CONTEXT'),
  reality:makeArm('REALITY_LAYER_ENABLED'),
  baselineJudgments:[realityJudgeTurn(makeTurn(0))],
  realityJudgments:[realityJudgeTurn(makeTurn(0))],
 });
 assert.equal(out.status,'REALITY_NATIVE_SCORES_PARTIAL');
 assert.equal(out.self_reported_clear_rate_change_pp,null);
 assert.equal(out.true_accuracy_pct,null);
});
