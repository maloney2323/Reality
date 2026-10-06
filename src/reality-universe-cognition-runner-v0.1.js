import {
  createCognitiveCycle,
  createUniverseSnapshot,
  deriveCognitiveConsequences,
  materializeCognitiveState,
  reasonOverUniverse,
} from './reality-universe-cognition-v0.1.js';
import {
  createBitemporalLedgerEntry,
  reconstructAsBelievedAt,
} from './reality-universe-bitemporal-ledger-v0.1.js';
import {
  createVerifiedOutcomeRecord,
  createLearningDeltaRecord,
  createUniverseLearningUpdate,
} from './reality-learning-chain-v0.1.js';

/**
 * Canonical Universe cognition pipeline.
 *
 * INGESTION -> BITEMPORAL STATE -> COGNITION -> CONSEQUENCE -> REASONING
 * -> GOVERNED EXECUTION (external bridge) -> VERIFICATION -> LEARNING
 * -> UNIVERSE UPDATE
 *
 * This runner does not execute external effects. It provides the canonical
 * integration boundary so each stage consumes the previous stage's durable
 * identity rather than passing loose model-generated context.
 */

export async function runUniverseCognitionPass({
  universe,
  reasoner = null,
  ledgerEntry = null,
  learning = null,
} = {}) {
  const snapshot = universe?.snapshot_id
    ? universe
    : createUniverseSnapshot(universe);

  const state = materializeCognitiveState(snapshot);
  const consequences = deriveCognitiveConsequences(state);
  const reasoning = await reasonOverUniverse({ state, consequences, reasoner });
  const cycle = createCognitiveCycle({ snapshot, state, consequences, reasoning });

  const result = {
    snapshot,
    state,
    consequences,
    reasoning,
    cycle,
    integration: {
      ledger: ledgerEntry ? 'CONNECTED' : 'NOT_PROVIDED',
      execution_bridge: 'CONNECTED_AT_CONSEQUENCE_BOUNDARY',
      learning_chain: learning ? 'CONNECTED' : 'READY',
    },
  };

  if (ledgerEntry) {
    result.historical_reconstruction = reconstructAsBelievedAt(
      [ledgerEntry],
      {
        assertionTime: ledgerEntry.assertion_time,
        continuityRootId: state.continuity_root_id,
        worldlineId: state.worldline_id,
      },
    );
  }

  if (learning) {
    const verifiedOutcome = createVerifiedOutcomeRecord({
      ...learning.verifiedOutcome,
      priorStateId: state.state_id,
      worldId: state.world_id,
      continuityRootId: state.continuity_root_id,
      worldlineId: state.worldline_id,
    });

    const learningDelta = createLearningDeltaRecord({
      learningDeltaId: learning.learningDeltaId,
      verifiedOutcome,
      changedClaims: learning.changedClaims,
      capabilityEffects: learning.capabilityEffects,
      falsificationResults: learning.falsificationResults,
      evidenceReferences: learning.evidenceReferences,
      priorLearningHash: learning.priorLearningHash,
    });

    if (!learning.ledgerEntry) {
      throw new Error('LEARNING_LEDGER_ENTRY_REQUIRED');
    }

    const universeUpdate = createUniverseLearningUpdate({
      verifiedOutcome,
      learningDelta,
      bitemporalLedgerEntry: learning.ledgerEntry,
      cognitiveStateId: state.state_id,
    });

    result.learning = {
      verifiedOutcome,
      learningDelta,
      universeUpdate,
    };
  }

  return Object.freeze(result);
}

/**
 * Adapter boundary for a completed governed execution.
 *
 * A caller supplies the execution/verification artifacts only after the
 * Cognition -> Execution Bridge has completed its authorization and
 * independent verification steps.
 */
export function buildLearningInputFromVerifiedExecution({
  executionReceiptHash,
  targetObservationId,
  independentVerificationId,
  verificationResult,
  evidenceReferences,
  outcomeId,
  learningDeltaId,
  changedClaims = [],
  capabilityEffects = [],
  falsificationResults = [],
  ledgerEntry,
  priorLearningHash = null,
} = {}) {
  return Object.freeze({
    verifiedOutcome: {
      outcomeId,
      executionReceiptHash,
      targetObservationId,
      independentVerificationId,
      verificationResult,
      evidenceReferences,
    },
    learningDeltaId,
    changedClaims,
    capabilityEffects,
    falsificationResults,
    ledgerEntry,
    priorLearningHash,
  });
}
