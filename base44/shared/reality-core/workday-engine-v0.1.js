import { canonicalJson, sha256Hex } from '../action-gate/canonical.js';
import { normalizeAuthorityEnvelope, digestAuthorityEnvelope } from './workday-authority-envelope-v0.1.js';

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

export async function createWorkday({
  workday_id,
  subject,
  objective,
  operating_window = null,
  authority = {},
  created_at,
  evidence_refs = []
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
    evidence_gaps,
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
    evidence_refs: uniqueSorted(evidence_refs),
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

export function authorizeWorkday(workday, authorityInput = {}) {
  if (!workday || workday.schema_version !== REALITY_WORKDAY_ENGINE_VERSION) throw new Error('invalid workday');
  const authority_envelope = normalizeAuthorityEnvelope({
    ...authorityInput,
    workday_id: workday.workday_id,
    subject_id: workday.subject.subject_id
  });

  return {
    ...workday,
    authority_envelope,
    authority_digest: null,
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
    evidence_refs: workday.evidence_refs
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
