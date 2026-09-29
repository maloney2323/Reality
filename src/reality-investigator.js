const SOURCES = Object.freeze({
  github: Object.freeze({
    provider: 'github',
    scope: 'repository',
    required: true,
    read_actions: ['read_repository', 'read_file', 'read_commit', 'read_pull_request'],
  }),
  vercel: Object.freeze({
    provider: 'vercel',
    scope: 'project',
    required: true,
    read_actions: ['read_project', 'read_deployment'],
  }),
  base44: Object.freeze({
    provider: 'base44',
    scope: 'app',
    required: true,
    read_actions: ['read_app', 'read_file', 'read_connectors'],
  }),
});

export const INVESTIGATOR_VERSION = '0.1.0';

export function investigatorWorld() {
  return {
    version: INVESTIGATOR_VERSION,
    mode: 'READ_INVESTIGATE_VERIFY',
    required_sources: Object.keys(SOURCES),
    sources: SOURCES,
    rules: {
      no_invented_evidence: true,
      preserve_contradictions: true,
      independent_verification_required: true,
      no_unverified_completion: true,
      source_timestamp_required: true,
      source_version_required_when_available: true,
    },
  };
}

export function planInvestigation({ question, availableSources = Object.keys(SOURCES) } = {}) {
  if (!question || typeof question !== 'string') throw new Error('QUESTION_REQUIRED');
  const sourceSet = new Set(availableSources);
  const missing = Object.keys(SOURCES).filter((id) => !sourceSet.has(id));
  return {
    investigator_version: INVESTIGATOR_VERSION,
    question,
    required_sources: Object.keys(SOURCES),
    available_sources: availableSources,
    missing_sources: missing,
    status: missing.length ? 'BLOCKED_MISSING_WORLD_SOURCE' : 'READY_TO_INVESTIGATE',
  };
}

export function acceptEvidence({ source, evidence, observedAt, sourceVersion = null } = {}) {
  if (!SOURCES[source]) throw new Error('UNKNOWN_WORLD_SOURCE');
  if (!evidence) throw new Error('EVIDENCE_REQUIRED');
  if (!observedAt) throw new Error('OBSERVED_AT_REQUIRED');

  return {
    evidence_id: `ev:${source}:${crypto.randomUUID()}`,
    source,
    observed_at: observedAt,
    source_version: sourceVersion,
    evidence,
    independently_verified: false,
  };
}

export function reconcileEvidence(receipts = []) {
  const contradictions = [];
  for (let i = 0; i < receipts.length; i += 1) {
    for (let j = i + 1; j < receipts.length; j += 1) {
      if (receipts[i].claim && receipts[j].claim && receipts[i].claim.key === receipts[j].claim.key &&
          JSON.stringify(receipts[i].claim.value) !== JSON.stringify(receipts[j].claim.value)) {
        contradictions.push({
          key: receipts[i].claim.key,
          left: receipts[i],
          right: receipts[j],
          status: 'UNRESOLVED_CONTRADICTION',
        });
      }
    }
  }
  return {
    evidence_count: receipts.length,
    contradictions,
    status: contradictions.length ? 'CONTRADICTION_PRESERVED' : 'NO_CONTRADICTION_OBSERVED',
  };
}
