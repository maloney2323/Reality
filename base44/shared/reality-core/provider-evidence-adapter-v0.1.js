// Reality Provider Evidence Adapter v0.1
//
// Normalizes provider connection/read results into one evidence-bound contract.
// This layer does not grant truth, authority, completeness, or external action.
// A connection is not a read. A read is not complete. A provider result is not
// automatically a verified business fact.

export const PROVIDER_EVIDENCE_ADAPTER_VERSION = 'reality-provider-evidence-adapter-v0.1';

export const ProviderReadState = Object.freeze({
  NOT_CONNECTED: 'NOT_CONNECTED',
  CONNECTED_NOT_READ: 'CONNECTED_NOT_READ',
  READ_FAILED: 'READ_FAILED',
  READ_READY: 'READ_READY',
});

export const ProviderEvidenceAuthority = 'BOUNDED_PROVIDER_OBSERVATION_ONLY';

function clean(value, max = 500) {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, max)
    : null;
}

function bool(value) {
  return value === true;
}

function readState({ connected, readAttempted, readExecuted, readabilityEstablished }) {
  if (!connected) return ProviderReadState.NOT_CONNECTED;
  if (!readExecuted) return readAttempted ? ProviderReadState.READ_FAILED : ProviderReadState.CONNECTED_NOT_READ;
  return readabilityEstablished ? ProviderReadState.READ_READY : ProviderReadState.READ_FAILED;
}

function normalizeEvidence(evidence) {
  if (!Array.isArray(evidence)) return Object.freeze([]);
  return Object.freeze(evidence.slice(0, 12).map((item, index) => Object.freeze({
    evidence_id: `provider-observation:${index + 1}`,
    content: typeof item === 'string' ? item.slice(0, 1800) : JSON.stringify(item).slice(0, 1800),
    authority: ProviderEvidenceAuthority,
  })));
}

export function normalizeProviderEvidenceResult(input = {}) {
  const provider = clean(input.provider || input.plugin_slug, 120) || 'unknown';
  const connected = bool(input.connected);
  const readAttempted = bool(input.read_attempted);
  const readExecuted = bool(input.read_executed);
  const readabilityEstablished = bool(input.readability_established);
  const completenessEstablished = bool(input.completeness_established);

  return Object.freeze({
    adapter_version: PROVIDER_EVIDENCE_ADAPTER_VERSION,
    provider,
    adapter_id: clean(input.adapter_id, 160),
    connection_state: connected ? 'CONNECTED' : 'NOT_CONNECTED',
    read_state: readState({ connected, readAttempted, readExecuted, readabilityEstablished }),
    read_attempted: readAttempted,
    read_executed: readExecuted,
    readability_established: readabilityEstablished,
    completeness_established: completenessEstablished,
    evidence: normalizeEvidence(input.evidence),
    provenance: clean(input.provenance, 300),
    exact_ref_sha: clean(input.exact_ref_sha, 128),
    provider_identity: clean(input.provider_identity, 300),
    reason: clean(input.reason, 900),
    authority: ProviderEvidenceAuthority,
    truth_authorized: false,
    action_authorized: false,
    write_authorized: false,
    external_effects_permitted: false,
  });
}

export function buildProviderEvidenceReceipt(results = []) {
  const normalized = (Array.isArray(results) ? results : []).map(normalizeProviderEvidenceResult);

  return Object.freeze({
    schema_version: PROVIDER_EVIDENCE_ADAPTER_VERSION,
    authority: ProviderEvidenceAuthority,
    providers: Object.freeze(normalized),
    connected_count: normalized.filter((item) => item.connection_state === 'CONNECTED').length,
    readable_count: normalized.filter((item) => item.readability_established).length,
    read_executed_count: normalized.filter((item) => item.read_executed).length,
    complete_count: normalized.filter((item) => item.completeness_established).length,
    evidence_count: normalized.reduce((sum, item) => sum + item.evidence.length, 0),
    truth_authorized: false,
    action_authorized: false,
    write_authorized: false,
    external_effects_permitted: false,
  });
}
