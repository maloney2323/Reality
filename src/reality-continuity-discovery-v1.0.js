import crypto from 'node:crypto';

export const REALITY_CONTINUITY_DISCOVERY_VERSION = 'reality-continuity-discovery-v1.0';

function stable(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stable);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}
function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}
function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}
function tokens(value) {
  return new Set(
    text(value).toLowerCase()
      .replace(/[^a-z0-9_\s-]/g, ' ')
      .split(/\s+/)
      .map((v) => v.replace(/^-+|-+$/g, ''))
      .filter((v) => v.length >= 3)
  );
}
function overlap(a, b) {
  if (!a.size || !b.size) return 0;
  let hits = 0;
  for (const value of a) if (b.has(value)) hits += 1;
  return hits / Math.max(a.size, b.size);
}
function objectiveCoverage(incoming, objective) {
  if (!incoming.size || !objective.size) return 0;
  let hits = 0;
  for (const value of objective) if (incoming.has(value)) hits += 1;
  return hits / objective.size;
}
function field(entry, key) {
  return text(entry?.[key] ?? entry?.payload?.[key]);
}
function continuitySummary(entry) {
  const payload = entry?.payload || {};
  return {
    continuity_root_id: field(entry, 'continuity_root_id'),
    work_item_id: field(entry, 'work_item_id'),
    objective: field(entry, 'objective') || field(entry, 'goal'),
    continuation_condition: field(entry, 'continuation_condition'),
    domain: field(entry, 'domain'),
    source_ref: field(entry, 'source_ref'),
    state: field(entry, 'continuity_state') || field(entry, 'next_state') || payload.continuity_state || payload.next_state,
  };
}
function evidenceText(evidence) {
  const p = evidence?.payload || {};
  return [
    evidence?.title, evidence?.description, evidence?.summary, evidence?.text,
    evidence?.domain, evidence?.source_ref, evidence?.work_item_id,
    p.title, p.description, p.summary, p.text, p.domain, p.source_ref, p.work_item_id,
    p.objective, p.goal, p.continuation_condition,
  ].filter(Boolean).join(' ');
}

export function discoverDormantContinuity({
  evidence = null,
  dormantContinuities = [],
  minimumScore = 45,
  limit = 10,
} = {}) {
  const candidates = [];
  const incomingText = evidenceText(evidence);
  const incomingTokens = tokens(incomingText);
  const incomingCondition = field(evidence, 'continuation_condition');
  const incomingDomain = field(evidence, 'domain');
  const incomingWorkItem = field(evidence, 'work_item_id');

  for (const raw of Array.isArray(dormantContinuities) ? dormantContinuities : []) {
    const s = continuitySummary(raw);
    if (!s.continuity_root_id || !['WAITING','BLOCKED','DEFERRED','SUSPENDED','COMPLETED'].includes(s.state)) continue;

    const objectiveScore = objectiveCoverage(incomingTokens, tokens(s.objective));
    const conditionMatch = incomingCondition && s.continuation_condition &&
      incomingCondition.toLowerCase() === s.continuation_condition.toLowerCase();
    const domainMatch = incomingDomain && s.domain &&
      incomingDomain.toLowerCase() === s.domain.toLowerCase();
    const workMatch = incomingWorkItem && s.work_item_id && incomingWorkItem === s.work_item_id;

    const score = Math.round(Math.min(100,
      objectiveScore * 55 +
      (conditionMatch ? 30 : 0) +
      (domainMatch ? 10 : 0) +
      (workMatch ? 15 : 0)
    ));

    if (score < minimumScore) continue;
    candidates.push({
      continuity_root_id: s.continuity_root_id,
      state: s.state,
      work_item_id: s.work_item_id || null,
      objective: s.objective || null,
      continuation_condition: s.continuation_condition || null,
      score,
      matched_signals: Object.freeze({
        objective_overlap: Number(objectiveScore.toFixed(4)),
        continuation_condition: Boolean(conditionMatch),
        domain: Boolean(domainMatch),
        work_item: Boolean(workMatch),
      }),
      discovery_id: `continuity:discovery:${digest({
        root: s.continuity_root_id, score, evidence_id: evidence?.id || evidence?.evidence_id || null
      })}`,
    });
  }

  candidates.sort((a, b) => b.score - a.score || a.continuity_root_id.localeCompare(b.continuity_root_id));
  const bounded = candidates.slice(0, Math.max(1, limit));
  return Object.freeze({
    version: REALITY_CONTINUITY_DISCOVERY_VERSION,
    status: bounded.length ? 'CANDIDATES_FOUND' : 'NO_MATCH',
    evidence_id: evidence?.id || evidence?.evidence_id || null,
    candidate_count: bounded.length,
    candidates: Object.freeze(bounded),
    ambiguity_preserved: bounded.length > 1 && bounded[0].score === bounded[1].score,
    execution_authorized: false,
  });
}
