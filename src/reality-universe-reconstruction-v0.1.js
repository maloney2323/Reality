import crypto from 'node:crypto';
import {
  EPISTEMIC_STATUS,
  WORLD_OBSERVATION_FABRIC_VERSION,
} from './reality-world-observation-fabric-v0.1.js';

export const UNIVERSE_RECONSTRUCTION_VERSION = '0.1.0';

const WORK_TYPES = Object.freeze({
  UNRESOLVED_COMMITMENT: 'UNRESOLVED_COMMITMENT',
  RECURRING_PROCESS: 'RECURRING_PROCESS',
  UNFINISHED_STATE: 'UNFINISHED_STATE',
  UNKNOWN_REQUIRING_EVIDENCE: 'UNKNOWN_REQUIRING_EVIDENCE',
});

function text(v) { return typeof v === 'string' ? v.trim() : ''; }
function list(v) { return Array.isArray(v) ? v.filter(Boolean) : []; }
function stable(v) {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(stable);
  return Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable(v[k])]));
}
function hash(v) { return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex'); }
function id(prefix, v) { return `${prefix}:${hash(v).slice(0, 32)}`; }

function claim({ kind, subjectRefs, objectRefs = [], value, epistemicStatus, evidenceRefs, uncertainty = [] }) {
  return Object.freeze({
    claim_id: id('claim', { kind, subjectRefs, objectRefs, value, evidenceRefs }),
    claim_kind: kind,
    subject_refs: list(subjectRefs),
    object_refs: list(objectRefs),
    value,
    epistemic_status: epistemicStatus,
    evidence_refs: list(evidenceRefs),
    uncertainty: list(uncertainty),
  });
}

function actorFromObservation(observation) {
  return observation.actor_refs[0] || null;
}

function textOf(observation) {
  const meta = observation.content_or_metadata || {};
  return [meta.subject, meta.snippet, meta.message, meta.description, meta.summary].filter(Boolean).join(' ').trim();
}

function hasCommitmentSignal(textValue) {
  return /\b(i('|’)ll|we('|’)ll|will|promise|promised|due|deadline|send|follow\s*up|reply|respond|deliver|provide|confirm)\b/i.test(textValue);
}

function hasCompletionSignal(textValue) {
  return /\b(done|completed|sent|delivered|resolved|closed|finished|confirmed)\b/i.test(textValue);
}

export function reconstructUniverse({ observations = [], now = new Date().toISOString() } = {}) {
  const ordered = [...observations].sort((a, b) => Date.parse(a.event_time) - Date.parse(b.event_time));
  const claims = [];
  const entities = new Map();
  const events = [];
  const contradictions = [];

  for (const observation of ordered) {
    for (const ref of [...observation.actor_refs, ...observation.object_refs]) {
      entities.set(ref, { entity_ref: ref, evidence_refs: [...(entities.get(ref)?.evidence_refs || []), observation.observation_id] });
    }

    events.push({
      event_id: id('event', observation.observation_id),
      event_type: observation.event_type,
      effective_time: observation.event_time,
      observed_at: observation.observed_at,
      evidence_refs: [observation.observation_id],
      actor_refs: observation.actor_refs,
      object_refs: observation.object_refs,
    });

    if (observation.event_type === 'EMAIL_MESSAGE' || observation.event_type === 'CALENDAR_EVENT') {
      const body = textOf(observation);
      if (hasCommitmentSignal(body)) {
        claims.push(claim({
          kind: 'POSSIBLE_COMMITMENT',
          subjectRefs: [actorFromObservation(observation)].filter(Boolean),
          objectRefs: observation.object_refs,
          value: { text: body, status: hasCompletionSignal(body) ? 'POSSIBLY_COMPLETED' : 'UNRESOLVED' },
          epistemicStatus: EPISTEMIC_STATUS.INFERRED,
          evidenceRefs: [observation.observation_id],
          uncertainty: ['COMMITMENT_NOT_EXPLICITLY_STRUCTURED', 'OUTCOME_NOT_INDEPENDENTLY_VERIFIED'],
        }));
      }
    }

    claims.push(claim({
      kind: 'EVENT_OCCURRED',
      subjectRefs: observation.actor_refs,
      objectRefs: observation.object_refs,
      value: { event_type: observation.event_type, source: observation.source },
      epistemicStatus: EPISTEMIC_STATUS.NORMALIZED,
      evidenceRefs: [observation.observation_id],
    }));
  }

  const recurrenceGroups = new Map();
  for (const observation of ordered) {
    const key = [
      observation.event_type,
      ...observation.actor_refs.slice(0, 1),
      ...observation.object_refs.slice(0, 1),
    ].join('|');
    if (!key) continue;
    const group = recurrenceGroups.get(key) || [];
    group.push(observation);
    recurrenceGroups.set(key, group);
  }

  const recurring = [];
  for (const [key, group] of recurrenceGroups) {
    if (group.length < 3) continue;
    const times = group.map((o) => Date.parse(o.event_time)).filter(Number.isFinite);
    if (!times.length) continue;
    recurring.push(claim({
      kind: 'RECURRING_PROCESS_SIGNAL',
      subjectRefs: group.flatMap((o) => o.actor_refs).filter(Boolean).slice(0, 3),
      objectRefs: group.flatMap((o) => o.object_refs).filter(Boolean).slice(0, 3),
      value: { recurrence_key: key, occurrence_count: group.length, first_event: new Date(Math.min(...times)).toISOString(), last_event: new Date(Math.max(...times)).toISOString() },
      epistemicStatus: EPISTEMIC_STATUS.RECONSTRUCTED,
      evidenceRefs: group.map((o) => o.observation_id),
      uncertainty: ['REPETITION_DOES_NOT_PROVE_FORMAL_PROCESS'],
    }));
  }

  for (const claimItem of claims.filter((c) => c.claim_kind === 'POSSIBLE_COMMITMENT')) {
    const sameSubject = claims.filter((c) => c.claim_kind === 'POSSIBLE_COMMITMENT' && c.subject_refs.join('|') === claimItem.subject_refs.join('|'));
    const completed = sameSubject.some((c) => c.value.status === 'POSSIBLY_COMPLETED');
    if (!completed) {
      claims.push(claim({
        kind: 'UNKNOWN',
        subjectRefs: claimItem.subject_refs,
        objectRefs: claimItem.object_refs,
        value: { missing: 'INDEPENDENT_OUTCOME_OR_EXPLICIT_COMMITMENT_STATE' },
        epistemicStatus: EPISTEMIC_STATUS.UNKNOWN,
        evidenceRefs: claimItem.evidence_refs,
        uncertainty: ['MISSING_OUTCOME_EVIDENCE'],
      }));
    }
  }

  const discoveredWork = [
    ...claims.filter((c) => c.claim_kind === 'POSSIBLE_COMMITMENT' && c.value.status === 'UNRESOLVED').map((c) => ({
      work_id: id('work', c.claim_id),
      work_type: WORK_TYPES.UNRESOLVED_COMMITMENT,
      epistemic_status: EPISTEMIC_STATUS.RECONSTRUCTED,
      materiality: 'CANDIDATE',
      trigger_claims: [c.claim_id],
      evidence_refs: c.evidence_refs,
      responsible_actor: c.subject_refs[0] || null,
      current_state: 'UNRESOLVED',
      proposed_next_action: 'REVIEW_SUPPORTING_EVIDENCE_AND_PREPARE_DRAFT_ONLY',
      required_capability: ['evidence_review', 'draft_preparation'],
      required_authority: [],
      missing_information: c.uncertainty,
    })),
    ...recurring.map((c) => ({
      work_id: id('work', c.claim_id),
      work_type: WORK_TYPES.RECURRING_PROCESS,
      epistemic_status: EPISTEMIC_STATUS.RECONSTRUCTED,
      materiality: 'CANDIDATE',
      trigger_claims: [c.claim_id],
      evidence_refs: c.evidence_refs,
      responsible_actor: c.subject_refs[0] || null,
      current_state: 'RECURRING_SIGNAL',
      proposed_next_action: 'REVIEW_REPEATED_ACTIVITY_FOR_PROCESS_BOUNDARY',
      required_capability: ['pattern_analysis', 'evidence_review'],
      required_authority: [],
      missing_information: c.uncertainty,
    })),
  ];

  const snapshot = {
    universe_version: UNIVERSE_RECONSTRUCTION_VERSION,
    observation_fabric_version: WORLD_OBSERVATION_FABRIC_VERSION,
    reconstructed_at: new Date(now).toISOString(),
    entities: [...entities.values()],
    events,
    claims,
    recurring_process_signals: recurring,
    discovered_work: discoveredWork,
    contradictions,
    epistemic_rule: 'OBSERVATION_NEVER_AUTO_PROMOTES_TO_AUTHORITY',
  };

  return Object.freeze({
    ...snapshot,
    reconstruction_hash: `sha256:${hash(snapshot)}`,
  });
}

export function resolveCapabilityAndAuthority(work, { capabilities = {}, authorizations = {} } = {}) {
  const required = list(work.required_capability);
  const capable = required.every((capability) => capabilities[capability] === true);
  const authorized = authorizations[work.work_id] === true;
  return Object.freeze({
    work_id: work.work_id,
    capable,
    authorized,
    disposition: !capable ? 'AWAITING_CAPABILITY' : !authorized ? 'AWAITING_AUTHORIZATION' : 'READY_FOR_GOVERNED_EXECUTION',
  });
}
