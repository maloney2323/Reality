import crypto from 'node:crypto';

export const DISCOVERED_WORK_VERSION = '0.1.0';
export const DISCOVERED_WORK_STATES = Object.freeze([
  'DISCOVERED','VALIDATED','PROPOSED','AWAITING_AUTHORIZATION','AUTHORIZED',
  'EXECUTING','AWAITING_VERIFICATION','RECONCILED','COMPLETED','REJECTED',
  'BLOCKED','AWAITING_CAPABILITY','AWAITING_AUTHORITY','FAILED'
]);
export const WORK_CLASSIFICATIONS = Object.freeze([
  'ONE_OFF','RECURRING','UNFINISHED','BLOCKED','DELEGATED','NEGLECTED',
  'OPPORTUNITY','CAPABILITY_GAP','AUTHORITY_GAP','UNKNOWN'
]);

const text = (v) => typeof v === 'string' ? v.trim() : '';
const list = (v) => Array.isArray(v) ? v.filter(Boolean) : [];
function stable(v) {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(stable);
  return Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable(v[k])]));
}
function digest(v) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
}
function normalize(value = '') {
  return String(value).toLowerCase()
    .replace(/\b(feat|fix|test|chore|refactor|docs|perf|build|ci)(\([^)]*\))?:\s*/i, '')
    .replace(/[0-9a-f]{7,40}/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function tokens(value) {
  return new Set(normalize(value).split(' ').filter((x) => x.length > 2));
}
function similarity(a, b) {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return 0;
  let intersection = 0;
  for (const t of A) if (B.has(t)) intersection++;
  return intersection / Math.max(1, new Set([...A, ...B]).size);
}
function observationId(o, index) {
  return text(o?.observation_id || o?.id) || 'observation:' + digest([o, index]).slice(0, 32);
}
function evidenceSummary(observations) {
  return observations.map((o, index) => ({
    observation_id: observationId(o, index),
    source: text(o?.source) || 'UNKNOWN',
    effective_at: o?.effective_at || o?.observed_at || null,
    subject: text(o?.subject || o?.message || o?.activity),
    actor: text(o?.actor || o?.author || o?.owner) || null,
    system: text(o?.system || o?.connector || o?.repository) || null,
    status: text(o?.status) || null,
    provenance: o?.provenance || null,
  }));
}

/* Deterministic reconstruction; inference never becomes authority. */
export function reconstructOperationalWork({ observations = [] } = {}) {
  const valid = list(observations).filter((o) => o && typeof o === 'object' && text(o.subject || o.message || o.activity));
  const clusters = [];
  for (const observation of valid) {
    const subject = text(observation.subject || observation.message || observation.activity);
    let best = null, bestScore = 0;
    for (const cluster of clusters) {
      const score = similarity(subject, cluster.representative_subject);
      if (score > bestScore) { bestScore = score; best = cluster; }
    }
    if (!best || bestScore < 0.35) clusters.push({ representative_subject: subject, observations: [observation] });
    else best.observations.push(observation);
  }
  return clusters.map((cluster, index) => {
    const evidence = evidenceSummary(cluster.observations);
    const actors = [...new Set(evidence.map((e) => e.actor).filter(Boolean))];
    const systems = [...new Set(evidence.map((e) => e.system).filter(Boolean))];
    const timestamps = evidence.map((e) => e.effective_at).filter(Boolean).sort();
    const category = text(cluster.observations[0].category) || 'operational_work';
    const frequency = evidence.length;
    const recurring = frequency >= 2;
    const blocked = evidence.some((e) => /block|fail|error|waiting|stuck|rejected/i.test((e.subject || '') + ' ' + (e.status || '')));
    const unfinished = evidence.some((e) => /todo|pending|unfinished|open|in progress|await/i.test((e.subject || '') + ' ' + (e.status || '')));
    const classification = recurring ? 'RECURRING' : blocked ? 'BLOCKED' : unfinished ? 'UNFINISHED' : 'ONE_OFF';
    return Object.freeze({
      reconstruction_id: 'reconstruction:' + digest([cluster.representative_subject, evidence]).slice(0, 32),
      activity: cluster.representative_subject,
      category,
      evidence,
      evidence_count: evidence.length,
      actors,
      systems,
      temporal: {
        first_observed_at: timestamps[0] || null,
        last_observed_at: timestamps.at(-1) || null,
        observation_count: frequency,
        recurring_signal: recurring,
      },
      classification,
      reconstruction_confidence: frequency >= 3 ? 'HIGH' : frequency >= 2 ? 'MEDIUM' : 'LOW',
      contradiction_refs: [],
      index,
    });
  });
}

export function analyzeOwnership(reconstruction, { accountabilityEvidence = [] } = {}) {
  if (!reconstruction?.reconstruction_id) throw new Error('RECONSTRUCTION_REQUIRED');
  const evidence = reconstruction.evidence || [];
  const actors = [...new Set([
    ...reconstruction.actors,
    ...list(accountabilityEvidence).map((x) => text(x?.actor || x?.owner)).filter(Boolean),
  ])];
  const counts = new Map();
  for (const e of evidence) if (e.actor) counts.set(e.actor, (counts.get(e.actor) || 0) + 1);
  const ranked = [...counts.entries()].sort((a,b) => b[1] - a[1]);
  const apparent = ranked[0]?.[0] || null;
  return Object.freeze({
    reconstruction_id: reconstruction.reconstruction_id,
    apparent_operator: apparent,
    operator_evidence_count: apparent ? ranked[0][1] : 0,
    candidate_people: actors,
    accountability_status: accountabilityEvidence.length ? 'PARTIALLY_ESTABLISHED' : 'UNESTABLISHED',
    ownership_confidence: apparent && ranked.length === 1 ? 'MEDIUM' : apparent ? 'LOW' : 'UNKNOWN',
    ownership_claim: apparent
      ? 'Observed activity is repeatedly performed by ' + apparent + '; accountability is not established by operator evidence alone.'
      : 'No sufficiently supported operator identified.',
    evidence_refs: reconstruction.evidence.map((e) => e.observation_id),
  });
}

export function analyzeCapabilityAndAuthority(reconstruction, {
  knownCapabilities = [], knownAuthority = [], capabilityRequirements = [], authorityRequirements = [],
} = {}) {
  if (!reconstruction?.reconstruction_id) throw new Error('RECONSTRUCTION_REQUIRED');
  const requiredCapabilities = list(capabilityRequirements);
  const requiredAuthority = list(authorityRequirements);
  const capabilitySet = new Set(list(knownCapabilities).map((x) => text(x?.id || x?.name || x)));
  const authoritySet = new Set(list(knownAuthority).map((x) => text(x?.id || x?.scope || x)));
  const missingCapabilities = requiredCapabilities.filter((x) => !capabilitySet.has(text(x)));
  const missingAuthority = requiredAuthority.filter((x) => !authoritySet.has(text(x)));
  let disposition = 'READY_TO_PROPOSE';
  if (missingCapabilities.length) disposition = 'AWAITING_CAPABILITY';
  else if (missingAuthority.length) disposition = 'AWAITING_AUTHORITY';
  return Object.freeze({
    reconstruction_id: reconstruction.reconstruction_id,
    can_perform: missingCapabilities.length === 0,
    authority_established: missingAuthority.length === 0,
    missing_capabilities: missingCapabilities,
    missing_authority: missingAuthority,
    disposition,
    authority_is_not_inferred: true,
  });
}

export function createDiscoveredWork({
  reconstruction, ownership, capabilityAuthority, materiality = 'MEDIUM',
  proposedNextAction = 'INVESTIGATE', verificationRequirements = [],
} = {}) {
  if (!reconstruction?.reconstruction_id) throw new Error('RECONSTRUCTION_REQUIRED');
  if (!ownership?.reconstruction_id || !capabilityAuthority?.reconstruction_id) throw new Error('OWNERSHIP_AND_CAPABILITY_AUTHORITY_REQUIRED');
  if (ownership.reconstruction_id !== reconstruction.reconstruction_id || capabilityAuthority.reconstruction_id !== reconstruction.reconstruction_id)
    throw new Error('ANALYSIS_RECONSTRUCTION_MISMATCH');
  const state = capabilityAuthority.disposition === 'AWAITING_CAPABILITY'
    ? 'AWAITING_CAPABILITY'
    : capabilityAuthority.disposition === 'AWAITING_AUTHORITY' ? 'AWAITING_AUTHORITY' : 'DISCOVERED';
  return Object.freeze({
    kind: 'DISCOVERED_WORK',
    version: DISCOVERED_WORK_VERSION,
    discovered_work_id: 'discovered_work:' + digest({
      reconstruction: reconstruction.reconstruction_id,
      evidence: reconstruction.evidence.map((x) => x.observation_id),
    }).slice(0, 32),
    state,
    classification: reconstruction.classification || 'UNKNOWN',
    activity: reconstruction.activity,
    category: reconstruction.category,
    evidence_refs: reconstruction.evidence.map((x) => x.observation_id),
    reconstruction_id: reconstruction.reconstruction_id,
    ownership,
    capability: capabilityAuthority,
    materiality,
    proposed_next_action: proposedNextAction,
    verification_requirements: list(verificationRequirements),
    unresolved_contradictions: reconstruction.contradiction_refs || [],
    authority: 'NONE_UNLESS_EXPLICITLY_ESTABLISHED',
    execution: 'NOT_EXECUTED',
  });
}

export function validateDiscoveredWork(work, { minimumEvidence = 1 } = {}) {
  if (!work?.discovered_work_id) throw new Error('DISCOVERED_WORK_REQUIRED');
  const evidenceCount = list(work.evidence_refs).length;
  const valid = evidenceCount >= minimumEvidence && Boolean(work.reconstruction_id) && work.authority !== 'GRANTED';
  return Object.freeze({
    ...work,
    state: valid && work.state === 'DISCOVERED' ? 'VALIDATED' : work.state,
    validation: { valid, evidence_sufficient: evidenceCount >= minimumEvidence, authority_not_inferred: work.authority !== 'GRANTED' },
  });
}

export function prioritizeDiscoveredWork(workItems = []) {
  return [...list(workItems)].sort((a, b) => {
    const rank = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    const materiality = (rank[b.materiality] || 0) - (rank[a.materiality] || 0);
    return materiality || ((b.evidence_refs?.length || 0) - (a.evidence_refs?.length || 0));
  });
}
