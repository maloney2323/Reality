import crypto from 'node:crypto';

export const REALITY_SHADOW_OBSERVER_VERSION = 'reality-shadow-observer-v0.1';

function stable(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stable);
  return Object.fromEntries(Object.keys(value).sort().map((k) => [k, stable(value[k])]));
}
function hash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}
function normalizeSubject(subject = '') {
  return String(subject)
    .toLowerCase()
    .replace(/^(feat|fix|test|chore|refactor|docs|perf|build|ci)(\([^)]*\))?:\s*/i, '')
    .replace(/#\d+\b/g, '')
    .replace(/[0-9a-f]{7,40}/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function category(subject = '') {
  const s = subject.toLowerCase();
  if (/deploy|vercel|production|release|runtime|api|environment/.test(s)) return 'deployment_and_runtime';
  if (/test|benchmark|audit|verify|verification|proof/.test(s)) return 'verification_and_audit';
  if (/universe|memory|ledger|continuity|evidence|receipt/.test(s)) return 'evidence_and_continuity';
  if (/work|execution|authorization|action|connector/.test(s)) return 'work_execution';
  if (/self.?evolution|capability|upgrade|learning/.test(s)) return 'capability_growth';
  return 'software_maintenance';
}

export function buildShadowObservations({ commits = [], observedAt = new Date().toISOString() } = {}) {
  return commits.map((commit) => Object.freeze({
    observation_id: `shadow:github:commit:${commit.sha}`,
    source: 'GITHUB',
    observed_at: observedAt,
    effective_at: commit.date || observedAt,
    epistemic_status: 'OBSERVED',
    external_id: commit.sha,
    subject: commit.message || '',
    normalized_subject: normalizeSubject(commit.message || ''),
    category: category(commit.message || ''),
    provenance: {
      repository: commit.repository,
      url: commit.url || null,
      author: commit.author || null,
    },
    content_hash: `sha256:${hash(commit)}`,
  }));
}

export function detectRecurringWork(observations = []) {
  const groups = new Map();
  for (const observation of observations) {
    const key = observation.normalized_subject || observation.category;
    if (!key) continue;
    const current = groups.get(key) || {
      recurrence_key: key,
      category: observation.category,
      observations: [],
    };
    current.observations.push(observation);
    groups.set(key, current);
  }

  return [...groups.values()]
    .filter((group) => group.observations.length >= 2)
    .map((group) => {
      const evidenceRefs = group.observations.map((o) => o.observation_id);
      const statement = `Recurring work detected: ${group.observations[0].subject || group.category}`;
      return Object.freeze({
        work_candidate_id: `work_candidate:${hash([group.recurrence_key, evidenceRefs]).slice(0, 32)}`,
        status: 'CANDIDATE',
        recurrence_key: group.recurrence_key,
        category: group.category,
        statement,
        frequency_signal: group.observations.length,
        evidence_refs: evidenceRefs,
        epistemic_status: 'INFERRED_FROM_OBSERVED_HISTORY',
        authority: 'NONE',
        execution: 'NOT_AUTHORIZED',
        next_step: 'ASSESS_CAN_REALITY_OWN',
      });
    })
    .sort((a, b) => b.frequency_signal - a.frequency_signal);
}
