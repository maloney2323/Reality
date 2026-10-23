import test from 'node:test';
import assert from 'node:assert/strict';
import {CTB_TURNS,CTB_MANIFEST,CTB_DOMAINS,getModelFacingSequence,
 getTrustedTestEventsBefore,validateSameModelInputs} from '../benchmarks/consequential-trust-llm-v1.js';
import {CTB_SEMANTIC_TARGETS,getEvaluatorOracle} from '../benchmarks/consequential-trust-llm-v1.oracle.js';
import {compareConsequentialTrustRuns} from '../benchmarks/consequential-trust-llm-v1.report.js';
const model='same-underlying-test-model';
const responses=()=>CTB_TURNS.map((x,i)=>({turn_id:x.turn_id,
  text:'Synthetic answer '+i,response_id:'synthetic:'+i}));
const arm=(mode)=>({mode,model,model_version:'fixed-2026-test',
 sampling_config_hash:'sha256:test-sampling-frozen',
 inputs:getModelFacingSequence(),responses:responses()});
const label=(mode,x,err=false)=>({
 arm:mode,turn_id:x.turn_id,judge_type:'INDEPENDENT_HUMAN_REVIEW',
 rationale:'Independent test fixture label, not a live LLM grade',
 task_miss:err,drift:err,hallucination:false,
 instruction_loss:false,authority_violation:false,
 false_execution_claim:false,legitimate_work_blocked:false,
});
test('100-turn LLM-focused frozen stress corpus covers 10 independent failure categories',()=>{
 assert.equal(CTB_TURNS.length,100);
 assert.equal(CTB_MANIFEST.task_count,100);
 assert.equal(new Set(CTB_TURNS.map(t=>t.turn_id)).size,100);
 assert.equal(CTB_TURNS.filter(t=>t.split==='development').length,60);
 assert.equal(CTB_TURNS.filter(t=>t.split==='held_out').length,40);
 assert.deepEqual(new Set(CTB_TURNS.map(t=>t.failure_mode)),new Set(CTB_DOMAINS));
 assert.match(CTB_MANIFEST.prompt_hash,/^sha256:[a-f0-9]{64}$/);
});
test('model-facing script does not contain grading criteria or hidden oracle fields',()=>{
 const input=getModelFacingSequence();
 assert.equal(input.length,100);
 assert.deepEqual(Object.keys(input[0]).sort(),['content','role','turn_id']);
 assert.equal(input.some(x=>Object.keys(x).includes('ground_truth')),false);
 assert.equal(input.some(x=>Object.keys(x).includes('failure_mode')),false);
 assert.equal(input.some(x=>Object.keys(x).includes('expected_answer')),false);
 assert.equal(getEvaluatorOracle().expected_turn_count,100);
 assert.equal(CTB_SEMANTIC_TARGETS.length>=20,true);
});
test('verified synthetic evidence is independently fed to both arms on correct turns',()=>{
 const original=getTrustedTestEventsBefore('CTB-001');
 assert.equal(original.length,0);
 const approval=getTrustedTestEventsBefore('CTB-081');
 assert.equal(approval.length,1);
 assert.equal(approval[0].source_id,'WR-AUTH-86');
 assert.equal(approval[0].owner_send_authority,false);
 const owner=getTrustedTestEventsBefore('CTB-087');
 assert.equal(owner.length,1);
 assert.equal(owner[0].real_customer_destination_authorized,false);
 assert.equal(getTrustedTestEventsBefore('CTB-090').length,0);
 // Copies do not mutate canonical model-facing evidence.
 approval[0].fact='TAMPERED';
 assert.notEqual(getTrustedTestEventsBefore('CTB-081')[0].fact,'TAMPERED');
});
test('identical model-facing user messages enforced; any edited prompt rejected',()=>{
 const left=getModelFacingSequence();
 const right=getModelFacingSequence();
 const ok=validateSameModelInputs(left,right);
 assert.equal(ok.same_inputs,true);
 assert.equal(ok.turns,100);
 const altered=getModelFacingSequence();
 altered[4].content='Silently altered case';
 assert.throws(()=>validateSameModelInputs(left,altered),/CTB_PROMPT_OR_ORDER_TAMPERED/);
});
test('cannot invent benchmark rate from structural green checks or ungraded outputs',()=>{
 const noData=compareConsequentialTrustRuns();
 assert.equal(noData.status,'UNRUN');
 assert.equal(noData.metrics,null);
 const partial=compareConsequentialTrustRuns({
  baseline:arm('DIRECT_NO_REALITY_CONTEXT'),
  reality:arm('REALITY_LAYER_ENABLED')});
 assert.equal(partial.status,'PARTIAL_NOT_SCOREABLE');
 assert.equal(partial.metrics,null);
 assert.equal(partial.verified_model_uplift,null);
});
test('unmatched underlying model or sampling changes invalidate comparison',()=>{
 const b=arm('DIRECT_NO_REALITY_CONTEXT');
 const r=arm('REALITY_LAYER_ENABLED');r.model_version='other';
 assert.throws(()=>compareConsequentialTrustRuns({baseline:b,reality:r}),
 /CTB_MODEL_SAMPLING_MISMATCH/);
});
test('blinded synthetic reviewer fixtures illustrate results without claiming causal proof',()=>{
 const b=arm('DIRECT_NO_REALITY_CONTEXT'),r=arm('REALITY_LAYER_ENABLED');
 const baseLabels=CTB_TURNS.map((t,i)=>label(b.mode,t,i<10));
 const realityLabels=CTB_TURNS.map((t,i)=>label(r.mode,t,i<3));
 const result=compareConsequentialTrustRuns({
  baseline:b,reality:r,baselineReviews:baseLabels,realityReviews:realityLabels});
 assert.equal(result.status,'BLINDED_HUMAN_SCORES_AVAILABLE');
 assert.equal(result.baseline.counts.task_miss,10);
 assert.equal(result.reality.counts.task_miss,3);
 assert.equal(result.differences.task_miss_rate_change_pp,-7);
 assert.equal(result.verified_model_uplift,null);
 assert.equal(result.causal_proof,'NOT_ESTABLISHED_BY_SINGLE_RUN');
});
test('reject pretending machine labels are independent human reviews',()=>{
 const b=arm('DIRECT_NO_REALITY_CONTEXT'),r=arm('REALITY_LAYER_ENABLED');
 const labels=CTB_TURNS.map(t=>label(b.mode,t));
 labels[3].judge_type='MODEL_JUDGE_ONLY';
 assert.throws(()=>compareConsequentialTrustRuns({baseline:b,reality:r,
  baselineReviews:labels,realityReviews:CTB_TURNS.map(t=>label(r.mode,t))}),
 /CTB_BLINDED_REVIEW_INVALID/);
});
