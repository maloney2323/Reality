import assert from 'node:assert/strict';
import { createRecursiveDryfireWorld, validateDryfireWorld } from '../src/reality-recursive-dryfire-world-v0.1.js';
import { runRecursiveClosure } from '../src/reality-recursive-closure-conductor-v0.1.js';
import { createActionProposal, evaluateGovernance, createAuthorization, createExecutionReceipt, reconcileVerifiedOutcome as reconcileBridge } from '../src/reality-cognition-execution-bridge-v0.1.js';
import { createBitemporalLedgerEntry, assertLedgerContinuity, assertLedgerTemporalOrder } from '../src/reality-universe-bitemporal-ledger-v0.1.js';
import { runUniverseCognitionPass } from '../src/reality-universe-cognition-runner-v0.1.js';
import { createDryfirePersistenceAdapter, persistRecursiveClosureTrace, reloadRecursiveClosureTrace } from '../src/reality-universe-dryfire-persistence-v0.1.js';

const world = createRecursiveDryfireWorld();
const persistence = createDryfirePersistenceAdapter();
assert.deepEqual(validateDryfireWorld(world).valid, true);

let executionBridgeReceipt;
let lastLearningInput;
let universeUpdate;

const result = await runRecursiveClosure({
  workItem: world.workItem,
  reactivation: {
    continuation_token: 'dryfire-continuation:shipment-8472',
    capability_id: world.capability.capability_id,
  },
  execution: {
    async run({ workItem, continuation }) {
      const proposal = createActionProposal({
        proposalId: 'proposal:shipment-8472:carrier-status',
        decisionId: 'decision:shipment-8472:resolve',
        continuityRootId: world.continuityRootId,
        worldlineId: world.worldlineId,
        action: 'lookup_carrier_status',
        target: 'shipment-8472',
        payload: { capability_id: continuation.capability_id },
        consequenceClass: 'REVERSIBLE_EXTERNAL_EFFECT',
        expectedEffect: 'Retrieve current carrier status without mutating shipment state.',
        evidenceReferences: world.evidence.map((item) => item.evidence_id),
      });
      const governance = evaluateGovernance({
        proposal,
        policy: { evaluate: () => ({ allowed: true, reason: 'DRYFIRE_AUTHORIZED_POLICY', policy_ref: 'policy:dryfire' }) },
      });
      const authorization = createAuthorization({
        authorizationId: 'authorization:shipment-8472:carrier-status',
        proposal,
        authorityRef: 'authority:dryfire',
        authorizedBy: 'dryfire-test-harness',
        signature: 'dryfire-signature',
        scope: { work_item_id: workItem.id, capability_id: continuation.capability_id },
      });
      executionBridgeReceipt = createExecutionReceipt({
        proposal,
        authorization,
        executionId: 'execution:shipment-8472:carrier-status',
        connectorRef: 'connector:synthetic-carrier-status',
        providerReceipt: { status: 'SUCCEEDED', synthetic: true },
      });
      return { ...executionBridgeReceipt, work_item_id: workItem.id, capability_id: continuation.capability_id, status: 'SUCCEEDED' };
    },
  },
  verification: {
    async observe({ executionReceipt }) {
      return {
        observation_id: world.targetObservation.observation_id,
        execution_receipt_hash: executionReceipt.execution_receipt_hash,
        claim: world.targetObservation.claim,
        source: 'independent-carrier-readback',
        evidence_references: world.targetObservation.evidence_references,
      };
    },
    async independentlyVerify({ executionReceipt, targetObservation }) {
      return {
        verification_id: world.independentVerification.verification_id,
        execution_receipt_hash: executionReceipt.execution_receipt_hash,
        target_observation_id: targetObservation.observation_id,
        method: 'independent_source_reconciliation',
        result: 'CONFIRMED',
        verified: true,
        evidence_references: world.independentVerification.evidence_references,
      };
    },
    async reconcile({ executionReceipt, targetObservation, independentVerification }) {
      const bridgeOutcome = reconcileBridge({ executionReceipt, targetObservation, independentVerification });
      return {
        ...bridgeOutcome,
        outcome_id: world.verifiedOutcome.outcome_id,
        evidence_references: world.targetObservation.evidence_references,
      };
    },
  },
  learning: {
    async create({ executionReceipt, targetObservation, independentVerification, verifiedOutcome, continuation }) {
      const ledgerEntry = createBitemporalLedgerEntry({
        entryId: 'ledger:shipment-8472:verified-delivery',
        eventKind: 'VERIFIED_OUTCOME',
        effectiveTime: '2026-10-01T16:42:00Z',
        assertionTime: '2026-10-01T16:43:00Z',
        continuityRootId: world.continuityRootId,
        worldlineId: world.worldlineId,
        payload: { outcome_id: verifiedOutcome.outcome_id, claim: targetObservation.claim },
        evidenceReferences: targetObservation.evidence_references,
        sourceRef: independentVerification.verification_id,
      });

      const learningResult = await runUniverseCognitionPass({
        universe: {
          worldId: world.worldId,
          continuityRootId: world.continuityRootId,
          worldlineId: world.worldlineId,
          evidence: world.evidence,
          capabilities: [{ id: world.capability.capability_id, status: 'VERIFIED' }],
          work: [world.workItem],
        },
        learning: {
          verifiedOutcome: {
            outcomeId: verifiedOutcome.outcome_id,
            executionReceiptHash: executionReceipt.execution_receipt_hash,
            targetObservationId: targetObservation.observation_id,
            independentVerificationId: independentVerification.verification_id,
            verificationResult: independentVerification.result,
            evidenceReferences: targetObservation.evidence_references,
          },
          learningDeltaId: 'learning-delta:shipment-8472:delivery',
          changedClaims: ['Shipment 8472 is delivered.'],
          capabilityEffects: [{ capability_id: world.capability.capability_id, effect: 'VERIFIED_FOR_REUSE' }],
          falsificationResults: [{ ref: 'stale-delivery-claim', result: 'INSUFFICIENT_AS_PRIMARY_EVIDENCE' }],
          evidenceReferences: targetObservation.evidence_references,
          ledgerEntry,
        },
      });

      lastLearningInput = { ledgerEntry, learningResult, continuation };
      return learningResult.learning.learningDelta;
    },
  },
  cognition: {
    async resume({ verifiedOutcome, learningDelta, continuation }) {
      const priorUniverse = {
        worldId: world.worldId,
        continuityRootId: world.continuityRootId,
        worldlineId: world.worldlineId,
        evidence: world.evidence,
        capabilities: [{ id: world.capability.capability_id, status: 'VERIFIED' }],
        work: [{ ...world.workItem, status: 'COMPLETED', missing_capabilities: [] }],
        outcomes: [{ id: verifiedOutcome.outcome_id, kind: 'VERIFIED_OUTCOME', claim: verifiedOutcome.claim || world.verifiedOutcome.claim, status: 'VERIFIED' }],
      };
      const ledgerEntry = lastLearningInput.ledgerEntry;
      const resumed = await runUniverseCognitionPass({ universe: priorUniverse, ledgerEntry, learning: undefined });
      universeUpdate = {
        universe_state_id: resumed.state.state_id,
        universe_learning_update_id: lastLearningInput.learningResult.learning.universeUpdate.universe_learning_update_id,
        prior_learning_delta_id: learningDelta.learning_delta_id,
      };
      return universeUpdate;
    },
    async nextPass({ universeUpdate }) {
      const next = await runUniverseCognitionPass({
        universe: {
          worldId: world.worldId,
          continuityRootId: world.continuityRootId,
          worldlineId: world.worldlineId,
          evidence: [...world.evidence, world.targetObservation],
          capabilities: [{ id: world.capability.capability_id, status: 'VERIFIED' }],
          work: [{ ...world.workItem, status: 'COMPLETED', missing_capabilities: [] }],
          outcomes: [{ id: world.verifiedOutcome.outcome_id, kind: 'VERIFIED_OUTCOME', claim: world.verifiedOutcome.claim }],
        },
      });
      return {
        cognitive_state_id: next.state.state_id,
        universe_learning_update_id: universeUpdate.universe_learning_update_id,
      };
    },
  },
  cycleGuard: { depth: 0, maxDepth: 1 },
});

assert.equal(result.state, 'COMPLETED');
assert.equal(result.continuation.state, 'COMPLETED');
assert.equal(result.continuation.original_work_item_id, world.workItem.id);
assert.equal(result.executionReceipt.execution_receipt_hash, executionBridgeReceipt.execution_receipt_hash);
assert.equal(result.independentVerification.verified, true);
assert.equal(result.verifiedOutcome.outcome_id, world.verifiedOutcome.outcome_id);
assert.ok(result.learningDelta.learning_delta_id);
assert.ok(result.universeUpdate.universe_learning_update_id);
assert.ok(result.nextCognitiveState.cognitive_state_id);
assert.equal(result.continuation.next_cognitive_state_id, result.nextCognitiveState.cognitive_state_id);

const ledgerEntry = createBitemporalLedgerEntry({
  entryId: 'ledger:shipment-8472:persistence-proof', eventKind: 'VERIFIED_OUTCOME',
  effectiveTime: '2026-10-01T16:42:00Z', assertionTime: '2026-10-01T16:43:00Z',
  continuityRootId: world.continuityRootId, worldlineId: world.worldlineId,
  payload: { outcome_id: result.verifiedOutcome.outcome_id },
  evidenceReferences: result.targetObservation.evidence_references,
  sourceRef: result.independentVerification.verification_id,
});
await persistRecursiveClosureTrace({ persistence, result, ledgerEntry });
assert.equal(persistence.size(), 8);
const reloaded = reloadRecursiveClosureTrace(persistence);
assert.equal(reloaded.executionReceipt.execution_receipt_hash, result.executionReceipt.execution_receipt_hash);
assert.equal(reloaded.targetObservation.execution_receipt_hash, reloaded.executionReceipt.execution_receipt_hash);
assert.equal(reloaded.independentVerification.execution_receipt_hash, reloaded.executionReceipt.execution_receipt_hash);
assert.equal(reloaded.independentVerification.target_observation_id, reloaded.targetObservation.observation_id);
assert.equal(reloaded.verifiedOutcome.independent_verification_id, reloaded.independentVerification.verification_id);
assert.equal(reloaded.learningDelta.source_outcome_id, reloaded.verifiedOutcome.outcome_id);
assert.equal(reloaded.nextCognitiveState.cognitive_state_id, result.nextCognitiveState.cognitive_state_id);
const reconstructed = {
  worldId: world.worldId, continuityRootId: world.continuityRootId, worldlineId: world.worldlineId,
  evidence: [...world.evidence, reloaded.targetObservation],
  capabilities: [{ id: world.capability.capability_id, status: 'VERIFIED' }],
  work: [{ ...world.workItem, status: 'COMPLETED', missing_capabilities: [] }],
  outcomes: [{ id: reloaded.verifiedOutcome.outcome_id, kind: 'VERIFIED_OUTCOME', claim: world.verifiedOutcome.claim }],
};
const resumedFromPersisted = await runUniverseCognitionPass({ universe: reconstructed, ledgerEntry: reloaded.ledgerEntry });
assert.equal(resumedFromPersisted.state.world_id, world.worldId);
assert.equal(resumedFromPersisted.state.verified_outcomes[0].id, reloaded.verifiedOutcome.outcome_id);

console.log(JSON.stringify({
  dryfire: 'PASS',
  persistence_dryfire: 'PASS',
  persisted_records: persistence.size(),
  reloaded_cognitive_state_id: resumedFromPersisted.state.state_id,
  state: result.state,
  work_item_id: result.continuation.original_work_item_id,
  execution_receipt_hash: result.executionReceipt.execution_receipt_hash,
  verified_outcome_id: result.verifiedOutcome.outcome_id,
  learning_delta_id: result.learningDelta.learning_delta_id,
  universe_learning_update_id: result.universeUpdate.universe_learning_update_id,
  next_cognitive_state_id: result.nextCognitiveState.cognitive_state_id,
  external_side_effects: false,
}, null, 2));


const adversarialStore = createDryfirePersistenceAdapter();
persistRecursiveClosureTrace({ persistence: adversarialStore, result, ledgerEntry });
adversarialStore.corruptPayload('trace:target-observation', (payload) => ({ ...payload, claim: payload.claim + ' CORRUPTED' }));
let integrityRejected = false;
try { reloadRecursiveClosureTrace(adversarialStore); }
catch (error) { integrityRejected = String(error?.message || error).includes('EPISTEMIC_INTEGRITY_VIOLATION:PERSISTENCE_HASH_MISMATCH:trace:target-observation'); }
assert.equal(integrityRejected, true);
console.log(JSON.stringify({ adversarial_hash_chain_sever: 'PASS', corrupted_record: 'trace:target-observation', circuit_breaker: 'CLOSED', cognition_resume_permitted: false, auto_repair: false, external_side_effects: false }, null, 2));


const orphanStore = createDryfirePersistenceAdapter();
persistRecursiveClosureTrace({ persistence: orphanStore, result, ledgerEntry });
orphanStore.delete('trace:execution');
let orphanRejected = false;
try { reloadRecursiveClosureTrace(orphanStore); }
catch (error) { orphanRejected = String(error?.message || error).includes('PERSISTED_RECORD_NOT_FOUND'); }
assert.equal(orphanRejected, true);
console.log(JSON.stringify({
  adversarial_orphaned_lineage: 'PASS',
  deleted_record: 'trace:execution',
  circuit_breaker: 'CLOSED',
  cognition_resume_permitted: false,
  auto_repair: false,
  external_side_effects: false
}, null, 2));


const temporalBase = createBitemporalLedgerEntry({
  entryId: 'ledger:temporal:base', eventKind: 'OBSERVATION',
  effectiveTime: '2026-10-01T10:00:00Z', assertionTime: '2026-10-01T11:00:00Z',
  continuityRootId: world.continuityRootId, worldlineId: world.worldlineId,
  payload: { claim: 'Temporal baseline' },
});
const temporalParadox = createBitemporalLedgerEntry({
  entryId: 'ledger:temporal:paradox', eventKind: 'OBSERVATION',
  effectiveTime: '2026-10-01T12:00:00Z', assertionTime: '2026-10-01T10:30:00Z',
  continuityRootId: world.continuityRootId, worldlineId: world.worldlineId,
  payload: { claim: 'Later record asserted earlier' },
  priorLedgerHash: temporalBase.ledger_entry_hash,
});
let temporalRejected = false;
try { assertLedgerTemporalOrder(temporalBase, temporalParadox); }
catch (error) { temporalRejected = String(error?.message || error).includes('LEDGER_TEMPORAL_PARADOX:ASSERTION_TIME_REGRESSION'); }
assert.equal(temporalRejected, true);
let continuityRejected = false;
try { assertLedgerContinuity(temporalBase, temporalParadox); }
catch (error) { continuityRejected = String(error?.message || error).includes('LEDGER_TEMPORAL_PARADOX:ASSERTION_TIME_REGRESSION'); }
assert.equal(continuityRejected, true);
console.log(JSON.stringify({
  adversarial_temporal_paradox: 'PASS',
  invalid_condition: 'ASSERTION_TIME_REGRESSION',
  circuit_breaker: 'CLOSED',
  cognition_resume_permitted: false,
  auto_repair: false,
  external_side_effects: false
}, null, 2));
