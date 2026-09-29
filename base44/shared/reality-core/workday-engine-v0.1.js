import { canonicalJson, sha256Hex } from '../action-gate/canonical.js';
import { normalizeAuthorityEnvelope, digestAuthorityEnvelope } from './workday-authority-envelope-v0.1.js';
import { PROVIDER_EVIDENCE_ADAPTER_VERSION, ProviderEvidenceAuthority } from './provider-evidence-adapter-v0.1.js';

export const REALITY_WORKDAY_ENGINE_VERSION = 'reality-workday-engine-v0.1';

export const WORKDAY_STATES = Object.freeze([
  'PLANNED',
  'IMPLEMENTING',
  'IMPLEMENTED',
  'BUILD_VERIFIED',
  'DEPLOYED',
  'RUNTIME_VERIFIED',
  'OPERATIONALLY_VERIFIED',
  'CLOSED'
]);

export const WORKLOAD_CLASSIFICATIONS = Object.freeze([
  'ACTIVE',
  'WAITING',
  'BLOCKED',
  'RECURRING',
  'TIME_SENSITIVE',
  'DELEGABLE',
  'HUMAN_ONLY',
  'INSUFFICIENT_EVIDENCE'
]);

export const EVIDENCE_STATES = Object.freeze([
  'OBSERVED',
  'CALCULATED',
  'EXPLICITLY_ESTIMATED',
  'INFERRED',
  'INSUFFICIENT_EVIDENCE'
]);

const TERMINAL_STATES = new Set(['CLOSED']);

function requireNonEmpty(value, name) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${name} required`);
}

function uniqueSorted(values) {
  return [...new Set(Array.isArray(values) ? values : [])].sort();
}

function validateProviderEvidenceReceipt(receipt) {
  if (receipt == null) return null;
  if (typeof receipt !== 'object' || Array.isArray(receipt)) {
    throw new Error('provider_evidence_receipt must be an object');
  }
  if (receipt.schema_version !== PROVIDER_EVIDENCE_ADAPTER_VERSION) {
    throw new Error('unsupported provider evidence receipt schema');
  }
  if (receipt.authority !== ProviderEvidenceAuthority) {
    throw new Error('provider evidence receipt authority mismatch');
  }
  if (receipt.truth_authorized === true || receipt.action_authorized === true ||
      receipt.write_authorized === true || receipt.external_effects_permitted === true) {
    throw new Error('provider evidence receipt cannot grant authority');
  }
  if (!Array.isArray(receipt.providers)) throw new Error('provider evidence receipt providers required');
  return receipt;
}

export function buildObservedWorldSnapshot(providerEvidenceReceipt = null) {
  const receipt = validateProviderEvidenceReceipt(providerEvidenceReceipt);
  if (!receipt) {
    return {
      schema_version: 'reality-observed-world-v0.1',
      authority: ProviderEvidenceAuthority,
      observation_statement: 'No provider observations were supplied to CREATE WORKDAY.',
      providers: [],
      observed_evidence: [],
      evidence_refs: [],
      evidence_gaps: ['NO_PROVIDER_EVIDENCE_RECEIPT'],
      summary: {
        providers_seen: 0,
        providers_read: 0,
        providers_with_observed_evidence: 0,
        evidence_items_observed: 0,
        incomplete_providers: 0
      }
    };
  }

  const providers = receipt.providers.map((provider) => {
    const observed = provider.read_executed === true && provider.readability_established === true;
    const evidence = observed ? provider.evidence : [];
    return {
      provider: provider.provider,
      adapter_id: provider.adapter_id,
      connection_state: provider.connection_state,
      read_state: provider.read_state,
      read_attempted: provider.read_attempted === true,
      read_executed: provider.read_executed === true,
      readability_established: provider.readability_established === true,
      completeness_established: provider.completeness_established === true,
      observed_evidence_count: evidence.length,
      provenance: provider.provenance,
      exact_ref_sha: provider.exact_ref_sha,
      provider_identity: provider.provider_identity,
      reason: provider.reason
    };
  });

  const observedEvidence = receipt.providers
    .filter((provider) => provider.read_executed === true && provider.readability_established === true)
    .flatMap((provider) => provider.evidence.map((item) => ({
      provider: provider.provider,
      evidence_id: item.evidence_id,
      content: item.content,
      evidence_state: 'OBSERVED',
      authority: ProviderEvidenceAuthority,
      provenance: provider.provenance,
      exact_ref_sha: provider.exact_ref_sha,
      provider_identity: provider.provider_identity
    })));

  const evidenceRefs = uniqueSorted(
    observedEvidence.map((item) => `provider:${item.provider}:${item.evidence_id}`)
  );

  const evidenceGaps = uniqueSorted(receipt.providers.flatMap((provider) => {
    const gaps = [];
    if (provider.connection_state !== 'CONNECTED') gaps.push(`NOT_CONNECTED:${provider.provider}`);
    else if (provider.read_state === 'CONNECTED_NOT_READ') gaps.push(`CONNECTED_NOT_READ:${provider.provider}`);
    else if (provider.read_state === 'READ_FAILED') gaps.push(`READ_FAILED:${provider.provider}`);
    if (provider.read_executed === true && provider.completeness_established !== true) {
      gaps.push(`COMPLETENESS_NOT_ESTABLISHED:${provider.provider}`);
    }
    return gaps;
  }));

  const providersRead = providers.filter((provider) => provider.read_executed).length;
  const providersWithEvidence = providers.filter((provider) => provider.observed_evidence_count > 0).length;

  return {
    schema_version: 'reality-observed-world-v0.1',
    authority: ProviderEvidenceAuthority,
    observation_statement: 'Here is what I actually observed across your authorized world.',
    epistemic_boundary: 'These are bounded provider observations, not automatically verified truth. Missing or incomplete reads remain explicit.',
    providers,
    observed_evidence: observedEvidence,
    evidence_refs: evidenceRefs,
    evidence_gaps: evidenceGaps,
    summary: {
      providers_seen: providers.length,
      providers_read: providersRead,
      providers_with_observed_evidence: providersWithEvidence,
      evidence_items_observed: observedEvidence.length,
      incomplete_providers: providers.filter((provider) => provider.completeness_established !== true).length
    }
  };
}

export async function createWorkday({
  workday_id,
  subject,
  objective,
  operating_window = null,
  authority = {},
  created_at,
  evidence_refs = [],
  provider_evidence_receipt = null
} = {}) {
  requireNonEmpty(workday_id, 'workday_id');
  requireNonEmpty(objective, 'objective');
  requireNonEmpty(created_at, 'created_at');

  if (!subject || typeof subject !== 'object') throw new Error('subject required');
  requireNonEmpty(subject.subject_id, 'subject.subject_id');
  if (!['PERSON', 'TEAM', 'FUNCTION', 'BUSINESS'].includes(subject.subject_type)) {
    throw new Error('subject.subject_type must be PERSON, TEAM, FUNCTION, or BUSINESS');
  }

  const authority_envelope = normalizeAuthorityEnvelope({
    ...authority,
    workday_id,
    subject_id: subject.subject_id
  });

  const authority_digest = await digestAuthorityEnvelope(authority_envelope);
  const observed_world = buildObservedWorldSnapshot(provider_evidence_receipt);
  const workload_snapshot = [];
  const human_only_work = [];
  const blocked_work = [];
  const evidence_gaps = [];

  const workday = {
    schema_version: REALITY_WORKDAY_ENGINE_VERSION,
    workday_id,
    subject: {
      subject_id: subject.subject_id,
      subject_type: subject.subject_type,
      name: subject.name || null
    },
    objective,
    operating_window,
    state: 'PLANNED',
    workload_snapshot,
    human_only_work,
    blocked_work,
    evidence_gaps: uniqueSorted([...evidence_gaps, ...observed_world.evidence_gaps]),
    authority_envelope,
    authority_digest,
    delegation_state: 'NOT_AUTHORIZED',
    verification_state: 'NOT_STARTED',
    projected_human_time_returned: {
      value_hours: null,
      evidence_state: 'INSUFFICIENT_EVIDENCE'
    },
    verified_human_time_returned: {
      value_hours: null,
      evidence_state: 'INSUFFICIENT_EVIDENCE'
    },
    evidence_refs: uniqueSorted([...evidence_refs, ...observed_world.evidence_refs]),
    provider_evidence_receipt: provider_evidence_receipt ? validateProviderEvidenceReceipt(provider_evidence_receipt) : null,
    observed_world,
    created_at,
    decision_digest: null
  };

  workday.decision_digest = await digestWorkday(workday);
  return workday;
}

export function classifyWorkItem({
  id,
  title,
  status = 'INSUFFICIENT_EVIDENCE',
  evidence_refs = [],
  evidence_state = 'INSUFFICIENT_EVIDENCE',
  human_required = null,
  repeat_signal = null,
  trigger = null,
  verification = null,
  authority_required = []
} = {}) {
  requireNonEmpty(id, 'work item id');
  requireNonEmpty(title, 'work item title');

  if (!WORKLOAD_CLASSIFICATIONS.includes(status)) {
    throw new Error(`invalid workload classification: ${status}`);
  }
  if (!EVIDENCE_STATES.includes(evidence_state)) {
    throw new Error(`invalid evidence state: ${evidence_state}`);
  }

  return {
    id,
    title,
    classification: status,
    evidence_state,
    evidence_refs: uniqueSorted(evidence_refs),
    human_required,
    repeat_signal,
    trigger,
    verification,
    authority_required: uniqueSorted(authority_required)
  };
}

export function addWorkItem(workday, workItem) {
  if (!workday || workday.schema_version !== REALITY_WORKDAY_ENGINE_VERSION) {
    throw new Error('invalid workday');
  }
  if (TERMINAL_STATES.has(workday.state)) throw new Error('cannot modify closed workday');

  const workload_snapshot = [...workday.workload_snapshot, workItem];
  const human_only_work = workload_snapshot.filter((item) => item.classification === 'HUMAN_ONLY').map((item) => item.id);
  const blocked_work = workload_snapshot.filter((item) => item.classification === 'BLOCKED').map((item) => item.id);
  const evidence_gaps = workload_snapshot
    .filter((item) => item.classification === 'INSUFFICIENT_EVIDENCE' || item.evidence_state === 'INSUFFICIENT_EVIDENCE')
    .map((item) => item.id);

  return {
    ...workday,
    workload_snapshot,
    human_only_work,
    blocked_work,
    evidence_gaps,
    decision_digest: null
  };
}

export function advanceWorkday(workday, nextState) {
  if (!workday || workday.schema_version !== REALITY_WORKDAY_ENGINE_VERSION) throw new Error('invalid workday');
  if (!WORKDAY_STATES.includes(nextState)) throw new Error(`invalid workday state: ${nextState}`);

  const currentIndex = WORKDAY_STATES.indexOf(workday.state);
  const nextIndex = WORKDAY_STATES.indexOf(nextState);
  if (nextIndex < currentIndex) throw new Error(`WORKDAY_STATE_REGRESSION:${workday.state}->${nextState}`);

  return {
    ...workday,
    state: nextState,
    decision_digest: null
  };
}

export async function authorizeWorkday(workday, authorityInput = {}) {
  if (!workday || workday.schema_version !== REALITY_WORKDAY_ENGINE_VERSION) throw new Error('invalid workday');
  const authority_envelope = normalizeAuthorityEnvelope({
    ...authorityInput,
    workday_id: workday.workday_id,
    subject_id: workday.subject.subject_id
  });

  return {
    ...workday,
    authority_envelope,
    authority_digest: await digestAuthorityEnvelope(authority_envelope),
    delegation_state: authority_envelope.human_authorized ? 'AUTHORIZED' : 'NOT_AUTHORIZED',
    verification_state: 'NOT_STARTED',
    decision_digest: null
  };
}

export async function digestWorkday(workday) {
  const digestInput = {
    schema_version: REALITY_WORKDAY_ENGINE_VERSION,
    workday_id: workday.workday_id,
    subject: workday.subject,
    objective: workday.objective,
    operating_window: workday.operating_window,
    state: workday.state,
    workload_snapshot: workday.workload_snapshot,
    human_only_work: workday.human_only_work,
    blocked_work: workday.blocked_work,
    evidence_gaps: workday.evidence_gaps,
    authority_digest: workday.authority_digest || null,
    delegation_state: workday.delegation_state,
    verification_state: workday.verification_state,
    projected_human_time_returned: workday.projected_human_time_returned,
    verified_human_time_returned: workday.verified_human_time_returned,
    evidence_refs: workday.evidence_refs,
    observed_world: workday.observed_world || null
  };
  return sha256Hex(canonicalJson(digestInput));
}

export function canExecuteWorkday(workday) {
  return Boolean(
    workday &&
    workday.delegation_state === 'AUTHORIZED' &&
    workday.authority_envelope &&
    workday.authority_envelope.human_authorized === true
  );
}

export function executionCapabilityAllowed(workday, capability) {
  const capabilities = workday?.authority_envelope?.capabilities || [];
  return canExecuteWorkday(workday) && capabilities.includes(capability);
}

export function closeWorkday(workday) {
  if (!workday || workday.schema_version !== REALITY_WORKDAY_ENGINE_VERSION) throw new Error('invalid workday');
  return {
    ...workday,
    state: 'CLOSED',
    verification_state: workday.verification_state === 'VERIFIED' ? 'VERIFIED' : 'INCOMPLETE',
    decision_digest: null
  };
}
