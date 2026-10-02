export const CAPABILITY_EVOLUTION_LEDGER_VERSION = 'reality-capability-evolution-ledger-v0.1';

const STATUSES = Object.freeze(['PROPOSED', 'EXPERIMENTAL', 'VERIFIED', 'REJECTED', 'RETIRED']);

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function createCapabilityEvolutionLedger({ entries = [] } = {}) {
  return Object.freeze({
    ledger_version: CAPABILITY_EVOLUTION_LEDGER_VERSION,
    entries: entries.map(clone),
  });
}

export function createCapabilityEvolutionEntry({
  entryId,
  capabilityGap,
  baselineRef,
  hypothesis,
  candidateRef,
  experimentRef,
  evaluationRef = null,
  independentVerificationRef = null,
  regressionCheck = null,
  governanceBoundary = 'IMMUTABLE_GOVERNANCE_KERNEL',
  status = 'PROPOSED',
} = {}) {
  if (!entryId) throw new Error('LEDGER_ENTRY_ID_REQUIRED');
  if (!capabilityGap) throw new Error('LEDGER_GAP_REQUIRED');
  if (!baselineRef) throw new Error('LEDGER_BASELINE_REQUIRED');
  if (!hypothesis) throw new Error('LEDGER_HYPOTHESIS_REQUIRED');
  if (!candidateRef) throw new Error('LEDGER_CANDIDATE_REQUIRED');
  if (!experimentRef) throw new Error('LEDGER_EXPERIMENT_REQUIRED');
  if (!STATUSES.includes(status)) throw new Error('LEDGER_STATUS_INVALID');

  return {
    ledger_version: CAPABILITY_EVOLUTION_LEDGER_VERSION,
    entry_id: entryId,
    capability_gap: capabilityGap,
    baseline_ref: baselineRef,
    hypothesis,
    candidate_ref: candidateRef,
    experiment_ref: experimentRef,
    evaluation_ref: evaluationRef,
    independent_verification_ref: independentVerificationRef,
    regression_check: regressionCheck,
    governance_boundary: governanceBoundary,
    status,
    created_at: new Date().toISOString(),
  };
}

export function retainCapabilityEvolution({
  entry,
  independentVerification = {},
  regressionCheck = {},
  governanceCheck = {},
} = {}) {
  if (!entry?.entry_id) throw new Error('LEDGER_ENTRY_REQUIRED');

  const verified = independentVerification.passed === true;
  const regressionSafe = regressionCheck.passed === true;
  const governancePreserved = governanceCheck.preserved === true;

  if (!verified || !regressionSafe || !governancePreserved) {
    return {
      ...clone(entry),
      status: 'REJECTED',
      rejection_reasons: [
        !verified ? 'INDEPENDENT_VERIFICATION_FAILED' : null,
        !regressionSafe ? 'REGRESSION_CHECK_FAILED' : null,
        !governancePreserved ? 'GOVERNANCE_BOUNDARY_NOT_PRESERVED' : null,
      ].filter(Boolean),
    };
  }

  return {
    ...clone(entry),
    status: 'VERIFIED',
    independent_verification_ref: independentVerification.ref || entry.independent_verification_ref,
    regression_check: clone(regressionCheck),
    governance_boundary: entry.governanceBoundary || entry.governance_boundary,
    verified_at: new Date().toISOString(),
  };
}

export function appendCapabilityEvolution(ledger, entry) {
  if (!ledger?.ledger_version) throw new Error('LEDGER_REQUIRED');
  if (!entry?.entry_id) throw new Error('LEDGER_ENTRY_REQUIRED');
  if ((ledger.entries || []).some((item) => item.entry_id === entry.entry_id)) {
    throw new Error('LEDGER_ENTRY_DUPLICATE');
  }
  return {
    ...clone(ledger),
    entries: [...(ledger.entries || []), clone(entry)],
  };
}
