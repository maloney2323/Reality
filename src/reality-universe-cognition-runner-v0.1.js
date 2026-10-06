import {
  createCognitiveCycle,
  createUniverseSnapshot,
  deriveCognitiveConsequences,
  materializeCognitiveState,
  reasonOverUniverse,
} from './reality-universe-cognition-v0.1.js';

/**
 * Canonical cognitive pass.
 *
 * No model is required to establish the Universe state.
 * A model may propose hypotheses/decisions, but those remain untrusted
 * until Reality's existing evidence, authority, execution and verification
 * machinery promotes them.
 */
export async function runUniverseCognitionPass({
  universe,
  reasoner = null,
} = {}) {
  const snapshot = universe?.snapshot_id
    ? universe
    : createUniverseSnapshot(universe);

  const state = materializeCognitiveState(snapshot);
  const consequences = deriveCognitiveConsequences(state);
  const reasoning = await reasonOverUniverse({ state, consequences, reasoner });
  const cycle = createCognitiveCycle({ snapshot, state, consequences, reasoning });

  return Object.freeze({
    snapshot,
    state,
    consequences,
    reasoning,
    cycle,
  });
}
