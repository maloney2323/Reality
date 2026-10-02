import { runCognitiveEvolutionBenchmark, assertCognitiveEvolutionBenchmark } from './reality-cognitive-evolution-v0.1.test.js';

const result = runCognitiveEvolutionBenchmark();
assertCognitiveEvolutionBenchmark(result);

console.log(JSON.stringify({
  status: 'PASS',
  benchmark: result.benchmark_version,
  training: result.evaluation.metrics,
  selection: result.selection,
  hidden: result.hidden_evaluation.metrics,
  held_out: result.held_out,
  generated_primitive: result.generated_primitive.primitive_id,
  composite_primitive: result.composite_primitive.primitive_id,
}, null, 2));
