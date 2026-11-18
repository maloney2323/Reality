import crypto from 'node:crypto';

export const OPERATIONAL_GREETING_VERSION = 'reality-operational-greeting-v0.1';

const text = value => typeof value === 'string' ? value.trim() : '';
const allowedSource = source => source?.provider === 'github' && Boolean(text(source.repository));
const urlEvidence = value =>
  typeof value === 'string' && /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/(?:actions\/runs|pull|issues)\//i.test(value);

function evidenceBackedCandidate(work) {
  if (!work || typeof work !== 'object') return null;
  const id = text(work.work_id || work.work_key);
  const objective = text(work.objective || work.action);
  const evidence = [...new Set(
    (Array.isArray(work.evidence_refs) ? work.evidence_refs : []).filter(urlEvidence)
  )].sort();
  if (!id || !objective || evidence.length === 0) return null;
  return Object.freeze({
    work_id: id,
    objective,
    state: text(work.state) || 'UNKNOWN',
    evidence_refs: Object.freeze(evidence),
    requires_authorization: work.authorization_required === true,
    next_action: text(work.next_action) || 'REVIEW_EVIDENCE',
    execution_status: 'NOT_VERIFIED_BY_GREETING',
  });
}

/**
 * A deterministic, read-only projection from the already-connected
 * Reality stewardship observation. No employee status, repair, authority
 * or execution is inferred from an issue, an observation or an LLM answer.
 */
export function buildOperationalGreeting(observation) {
  const coverage = Object.freeze({
    engineering_work: 'GITHUB_STEWARDSHIP',
    employee_job_states: 'NOT_CONNECTED_TO_THIS_BRIEF',
    independent_repair_receipts: 'NOT_CONNECTED_TO_THIS_BRIEF',
  });
  const unavailable = {
    greeting_version: OPERATIONAL_GREETING_VERSION,
    status: 'SOURCE_UNAVAILABLE',
    material_change: false,
    fingerprint: null,
    headline: 'I could not verify current operational changes.',
    message: 'I will not report employee progress or claim a repair without source-backed evidence.',
    coverage,
    findings: [],
    authority: 'NOT_GRANTED_BY_GREETING',
    execution: 'NOT_EXECUTED_BY_GREETING',
    verification: 'NOT_ESTABLISHED_BY_GREETING',
  };

  if (!observation || observation.status !== 'OBSERVED' || !allowedSource(observation.source)) {
    return Object.freeze(unavailable);
  }

  const findings = (Array.isArray(observation.work) ? observation.work : [])
    .map(evidenceBackedCandidate)
    .filter(Boolean)
    .sort((a, b) => a.work_id.localeCompare(b.work_id));
  const awaitingApproval = findings.filter(item => item.requires_authorization).length;
  const fingerprint = findings.length ? crypto.createHash('sha256').update(JSON.stringify({
    repository: observation.source.repository,
    findings: findings.map(({ work_id, objective, state, evidence_refs, next_action, requires_authorization }) =>
      ({ work_id, objective, state, evidence_refs, next_action, requires_authorization })),
  })).digest('hex').slice(0, 24) : null;

  return Object.freeze({
    greeting_version: OPERATIONAL_GREETING_VERSION,
    status: findings.length ? 'SOURCE_BACKED_WORK_FOUND' : 'NO_SOURCE_BACKED_WORK_FOUND',
    material_change: findings.length > 0,
    fingerprint,
    headline: findings.length
      ? 'I found ' + findings.length + ' source-backed operational work ' +
        (findings.length === 1 ? 'candidate.' : 'candidates.')
      : 'No new source-backed engineering work was identified.',
    message: findings.length
      ? 'I checked connected GitHub operational evidence. ' +
        (awaitingApproval
          ? awaitingApproval + ' work ' + (awaitingApproval === 1 ? 'candidate requires' : 'candidates require') +
            ' exact authorization before external action. '
          : 'No new authorization request was established by this brief. ') +
        'I can show the supporting evidence and the next proposed action. ' +
        'AI employee assignments and repairs have not been independently checked in this brief.'
      : 'This only describes the connected GitHub engineering source, not all employees or all business work.',
    observed_at: text(observation.observed_at) || null,
    source: Object.freeze({ provider: 'github', repository: observation.source.repository }),
    coverage,
    findings: Object.freeze(findings),
    attention_count: awaitingApproval,
    authority: 'NOT_GRANTED_BY_GREETING',
    execution: 'NOT_EXECUTED_BY_GREETING',
    verification: 'NOT_ESTABLISHED_BY_GREETING',
  });
}