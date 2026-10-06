import assert from 'node:assert/strict';
import {planEvolutionExperiment,evaluateExperiment} from '../src/reality-experiment-planner-v0.2.js';
const plan=planEvolutionExperiment({opportunity:{id:'op:1'},baselineMetric:'supported_claim_rate',evaluationSet:'fixed-v1',minimumImprovement:.08,allowedRegression:{latency:.05},rollbackVersion:'cap:v1'});
const result=evaluateExperiment({plan,baseline:.80,candidate:.92,holdout:{passed:true,regressions:{latency:.08}},adversarial:{passed:true}});
assert.equal(result.passed,false);
assert.ok(result.regressions.includes('latency'));
console.log('ANTI_GAMING_V0_2_PASS');
