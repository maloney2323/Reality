import crypto from 'node:crypto';
function digest(v){return crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex')}
export function planEvolutionExperiment({opportunity,baselineMetric,evaluationSet,minimumImprovement=0.08,allowedRegression={},rollbackVersion,objectiveId}={}) {
  if(!opportunity?.id) throw new Error('OPPORTUNITY_REQUIRED'); if(!baselineMetric) throw new Error('BASELINE_METRIC_REQUIRED'); if(!evaluationSet) throw new Error('EVALUATION_SET_REQUIRED'); if(!rollbackVersion) throw new Error('ROLLBACK_VERSION_REQUIRED');
  const plan={version:'reality-experiment-planner-v0.2',objective_id:objectiveId||null,opportunity_id:opportunity.id,baseline_metric:baselineMetric,evaluation_set:evaluationSet,minimum_improvement:minimumImprovement,allowed_regression:allowedRegression,rollback_version:rollbackVersion,holdout_required:true,adversarial_cases_required:true,production_graph_write_permitted:false};
  return Object.freeze({...plan,experiment_hash:`experiment:${digest(plan)}`});
}
export function evaluateExperiment({plan,baseline,candidate,holdout,adversarial}={}) {
  if(!plan?.experiment_hash) throw new Error('EXPERIMENT_PLAN_REQUIRED');
  const improvement=Number(candidate)-Number(baseline);
  const holdoutPassed=holdout?.passed===true, adversarialPassed=adversarial?.passed===true;
  const regressions=Object.entries(plan.allowed_regression||{}).filter(([k,max])=>Number(holdout?.regressions?.[k]||0)>Number(max)).map(([k])=>k);
  return {experiment_hash:plan.experiment_hash,improvement,meets_target:improvement>=plan.minimum_improvement,holdout_passed:holdoutPassed,adversarial_passed:adversarialPassed,regressions,passed:improvement>=plan.minimum_improvement&&holdoutPassed&&adversarialPassed&&!regressions.length};
}
