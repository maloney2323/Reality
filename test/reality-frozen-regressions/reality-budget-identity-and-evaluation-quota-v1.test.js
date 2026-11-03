// Frozen acceptance for actual Reality cognitive engine, not a mocked
// discovery or invented failed receipt. This is a negative baseline test on
// the unchanged provider working tree before the isolated repair is staged.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
 createCognitiveGenome,createCandidatePopulation,
 evaluateCognitivePopulation,fingerprintCognitiveGenome
} from '../../src/reality-cognitive-research-engine-v0.1.js';

const genome=(resourceBudget, id='REALITY-BUDGET-CANDIDATE')=>
 createCognitiveGenome({
  genomeId:id,researchObjective:'Bound actual evaluation work by explicit owner policy',
  resourceBudget,
  modules:{reasoning:'existing-real-cognitive-engine'},
  evaluationContract:{acceptance:'frozen-visible-and-hidden'},
 });
const cases=[{id:'visible-unique',input:'source-bound-execution'}];
const hiddenCases=[{id:'hidden-unique',input:'cannot-bypass-budget'}];
const population=createCandidatePopulation({
 candidates:[genome({},'CANDIDATE-A'),genome({},'CANDIDATE-B')]
});
const evaluate=(args={})=>({
 genome_id:args.candidate.genome_id,
 metrics:{accuracy_delta:0,generalization_delta:0,quality_delta:0,robustness_delta:0,efficiency_delta:0},
 phase_case_ids:args.cases.map(x=>x.id)
});
test('Different configured resource budgets must yield different Reality capability fingerprints',()=>{
 const small=genome({max_evaluator_calls:1});
 const large=genome({max_evaluator_calls:100});
 assert.notEqual(fingerprintCognitiveGenome(small),fingerprintCognitiveGenome(large),
   'Reality must bind the same code and acceptance policy to the actual resource budget');
});
test('Evaluation budget rejection occurs BEFORE any evaluator work or provider effect',()=>{
 const baseline=genome({max_evaluator_calls:3},'BASELINE');
 let calls=0;
 assert.throws(()=>evaluateCognitivePopulation({
  population,baselineGenome:baseline,cases,hiddenCases,
  evaluator:params=>{calls++;return evaluate(params)}
 }),/COGNITIVE_EVALUATION_BUDGET_EXCEEDED/);
 assert.equal(calls,0,'Never begin an over-budget batch');
});
test('A correctly sized evaluation budget allows exactly the planned visible and hidden cases',()=>{
 const baseline=genome({max_evaluator_calls:4},'BASELINE');
 let calls=0;
 const actual=evaluateCognitivePopulation({
  population,baselineGenome:baseline,cases,hiddenCases,
  evaluator:params=>{calls++;return evaluate(params)}
 });
 assert.equal(calls,4);
 assert.equal(actual.visible.length,2);
 assert.equal(actual.hidden.length,2);
});
test('Invalid evaluation budgets must fail closed before running evaluator',()=>{
 for(const budget of [-1,0,1.5,'unlimited',null]){
  const baseline=genome({max_evaluator_calls:budget},'BASELINE');
  let calls=0;
  assert.throws(()=>evaluateCognitivePopulation({
   population,baselineGenome:baseline,cases,hiddenCases,
   evaluator:params=>{calls++;return evaluate(params)}
  }),/COGNITIVE_EVALUATION_BUDGET_INVALID|COGNITIVE_EVALUATION_BUDGET_EXCEEDED/);
  assert.equal(calls,0);
 }
});
test('Unset evaluation-call budget remains compatible with existing cognitive engine',()=>{
 const baseline=genome({},'BASELINE');
 const actual=evaluateCognitivePopulation({
  population,baselineGenome:baseline,cases,hiddenCases,
  evaluator:evaluate
 });
 assert.equal(actual.visible.length,2);
 assert.equal(actual.hidden.length,2);
});
