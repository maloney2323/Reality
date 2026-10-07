import crypto from 'node:crypto';
import { retrieveUniverseMemory } from './reality-universe-memory-retrieval-v0.1.js';

export const REALITY_INTELLIGENCE_SUBSTRATE_VERSION = 'reality-intelligence-substrate-v1.0';

export const INTELLIGENCE_SUBSTRATE_INVARIANTS = Object.freeze({
  universe_is_source_of_context: true,
  observations_are_not_truth: true,
  model_output_is_not_truth: true,
  model_output_is_not_authority: true,
  capability_is_not_authority: true,
  hidden_evaluation_is_not_exposed: true,
  governance_is_outside_learner_control: true,
  learning_signals_require_verified_outcomes: true,
  provenance_is_preserved: true,
  contradictions_are_preserved: true,
});

function stable(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));}
function digest(v){return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');}

export function createIntelligenceSubstrate({
  universeEntries = [],
  verifiedLearningSignals = [],
  workItems = [],
  capabilityState = {},
  governanceState = {},
  hiddenEvaluation = null,
  query = {},
} = {}) {
  const memory = retrieveUniverseMemory(universeEntries, query);
  const signals = verifiedLearningSignals
    .filter((signal) => signal?.verified_outcome?.status === 'VERIFIED')
    .map((signal) => ({
      signal_id: signal.signal_id,
      episode_id: signal.episode_id,
      capability_delta: signal.capability_delta || {},
      corrections: signal.corrections || [],
      failure_signals: signal.failure_signals || [],
      independent_verifier_ref: signal.independent_verifier_ref,
      signal_hash: signal.signal_hash,
    }));

  const context = {
    substrate_version: REALITY_INTELLIGENCE_SUBSTRATE_VERSION,
    context_id: 'intelligence_context:' + digest({
      memory_query_id: memory.query_id,
      signal_ids: signals.map((s) => s.signal_id),
      work_item_ids: workItems.map((w) => w?.id || w?.work_item_id).filter(Boolean),
    }),
    universe: { memory_query_id: memory.query_id, matched_count: memory.matched_count, entries: memory.entries },
    work: workItems,
    capability_state: capabilityState,
    governance_state: governanceState,
    verified_learning_signals: signals,
    hidden_evaluation: hiddenEvaluation ? { status: 'SEALED', ref: hiddenEvaluation.ref || null } : { status: 'SEALED', ref: null },
    epistemic_contract: {
      observations_are_evidence_not_truth: true,
      model_must_preserve_uncertainty: true,
      model_cannot_grant_authority: true,
      model_cannot_modify_governance: true,
    },
  };
  return Object.freeze(context);
}

export function assertLearnerOutput(output) {
  if (!output || typeof output !== 'object') throw new Error('LEARNER_OUTPUT_REQUIRED');
  if (output.authority_granted === true || output.execution_authorized === true) throw new Error('LEARNER_CANNOT_GRANT_AUTHORITY');
  return true;
}
