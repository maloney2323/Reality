import { runIntelligenceOrchestratorBenchmark, assertIntelligenceOrchestratorBenchmark } from './reality-intelligence-orchestrator-v0.1.test.js';

const result = await runIntelligenceOrchestratorBenchmark();
await assertIntelligenceOrchestratorBenchmark(result);
console.log(JSON.stringify({ status: 'PASS', ...result }, null, 2));
