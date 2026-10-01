export const EKR_VERSION = 'reality-ekr-v0.1';

const VALID_STATES = Object.freeze(['FACT', 'DELTA', 'HYPOTHESIS', 'RESOLUTION']);

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function contextMatches(prior = {}, observed = {}) {
  const context = prior.context || {};
  return Object.entries(context).every(([key, value]) => observed[key] === value);
}

function conditionMatches(prior = {}, observed = {}) {
  if (prior.condition?.type === 'minimum') {
    const actual = Number(observed[prior.condition.field]);
    return Number.isFinite(actual) && actual >= Number(prior.condition.value);
  }
  return true;
}

export function createEKR({
  id,
  state = 'RESOLUTION',
  epistemicStatus = 'CONDITIONAL',
  context = {},
  condition = null,
  verifiedOutcome,
  resolution = null,
  evidenceRefs = [],
  observedAt = new Date().toISOString(),
} = {}) {
  if (!id) throw new Error('EKR_ID_REQUIRED');
  if (!VALID_STATES.includes(state)) throw new Error('EKR_STATE_INVALID');
  if (!verifiedOutcome) throw new Error('EKR_VERIFIED_OUTCOME_REQUIRED');

  return Object.freeze({
    ekr_version: EKR_VERSION,
    id,
    state,
    epistemic_status: epistemicStatus,
    context: clone(context),
    condition: clone(condition),
    verified_outcome: verifiedOutcome,
    resolution,
    evidence_refs: [...evidenceRefs],
    observed_at: observedAt,
  });
}

export function retrieveRelevantEKR({ records = [], observedContext = {} } = {}) {
  return records.filter((record) => (
    record?.ekr_version === EKR_VERSION
    && record.state === 'RESOLUTION'
    && record.epistemic_status !== 'OBSOLETE'
    && contextMatches(record, observedContext)
    && conditionMatches(record, observedContext)
  ));
}

export function buildEpistemicPrior(records = []) {
  return records.map((record) => ({
    source: 'EKR',
    id: record.id,
    epistemic_status: record.epistemic_status,
    verified_outcome: record.verified_outcome,
    resolution: record.resolution,
    context: clone(record.context),
    condition: clone(record.condition),
    evidence_refs: [...(record.evidence_refs || [])],
  }));
}

export function invalidateContradictedEKR(record, contradictionEvidence) {
  if (!record?.id) throw new Error('EKR_REQUIRED');
  if (!contradictionEvidence) throw new Error('CONTRADICTION_EVIDENCE_REQUIRED');

  return {
    ...clone(record),
    state: 'RESOLUTION',
    epistemic_status: 'OBSOLETE',
    contradiction: clone(contradictionEvidence),
    invalidated_at: new Date().toISOString(),
  };
}

export function retrieveApplicableEKR({ records = [], observedContext = {} } = {}) {
  return retrieveRelevantEKR({ records, observedContext }).filter((record) =>
    conditionMatches(record, observedContext)
  );
}
