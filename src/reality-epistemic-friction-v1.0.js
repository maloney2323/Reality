/**
 * Reality Epistemic Friction Engine v1.0
 *
 * Converts epistemic support and action risk into a deterministic gate burden.
 * It NEVER grants authority. Lower friction only means fewer epistemic
 * requirements inside an already-authorized policy envelope.
 */
import crypto from 'node:crypto';

export const EPISTEMIC_FRICTION_VERSION = 'reality-epistemic-friction-v1.0';
export const EPISTEMIC_STATES = Object.freeze([
  'INSUFFICIENT_EVIDENCE',
  'CONTESTED',
  'SUPPORTED',
  'STRONGLY_SUPPORTED',
]);
export const FRICTION_LEVELS = Object.freeze(['MAXIMUM','HIGH','STANDARD','LOW']);

const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, Number(n) || 0));
const id = (prefix, value) => `${prefix}:${crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,24)}`;

function evidenceCount(profile) {
  return Array.isArray(profile?.evidence_references) ? new Set(profile.evidence_references.filter(Boolean)).size : 0;
}

function supportScore(profile) {
  const count = Math.min(evidenceCount(profile), 5);
  const corroboration = clamp(profile?.corroboration_score ?? count * 12, 0, 40);
  const precedent = clamp(profile?.historical_precedent_score ?? 0, 0, 20);
  const temporal = clamp(profile?.temporal_consistency_score ?? 0, 0, 15);
  const source = clamp(profile?.source_authority_score ?? 0, 0, 15);
  const integrity = clamp(profile?.signal_integrity_score ?? 0, 0, 10);
  const contradictions = clamp(profile?.contradiction_penalty ?? 0, 0, 100);
  return clamp(corroboration + precedent + temporal + source + integrity - contradictions);
}

export function classifyEpistemicState({ score, evidenceCount: count, contradictions = 0 } = {}) {
  if (count === 0 || score < 40) return 'INSUFFICIENT_EVIDENCE';
  if (contradictions > 0 || score < 65) return 'CONTESTED';
  if (score < 85) return 'SUPPORTED';
  return 'STRONGLY_SUPPORTED';
}

export function assessEpistemicFriction({ candidate = {}, evidenceProfile = {}, actionProfile = {} } = {}) {
  const count = evidenceCount(evidenceProfile);
  const score = supportScore(evidenceProfile);
  const contradictions = clamp(evidenceProfile.contradiction_penalty ?? 0);
  const state = classifyEpistemicState({ score, evidenceCount: count, contradictions });

  const irreversible = actionProfile.reversibility === 'IRREVERSIBLE';
  const highBlastRadius = Number(actionProfile.blast_radius ?? 0) >= 3;
  const highRisk = actionProfile.risk === 'HIGH' || irreversible || highBlastRadius;

  let friction = 'STANDARD';
  if (state === 'INSUFFICIENT_EVIDENCE' || state === 'CONTESTED') friction = 'MAXIMUM';
  else if (highRisk) friction = 'HIGH';
  else if (state === 'STRONGLY_SUPPORTED' && actionProfile.risk === 'LOW') friction = 'LOW';

  const requiredEvidence = state === 'INSUFFICIENT_EVIDENCE'
    ? ['ACQUIRE_EVIDENCE', 'CORROBORATE_SOURCE']
    : state === 'CONTESTED'
      ? ['RESOLVE_CONTRADICTION', 'CORROBORATE_SOURCE']
      : ['RETAIN_EVIDENCE_CHAIN'];

  const requiredVerification = highRisk
    ? ['INDEPENDENT_EXTERNAL_VERIFICATION', 'POST_ACTION_HEALTH_CHECK']
    : ['INDEPENDENT_EXTERNAL_VERIFICATION'];

  return {
    friction_decision_id: id('friction', { candidate: candidate.attention_candidate_id ?? null, score, state, friction }),
    engine_version: EPISTEMIC_FRICTION_VERSION,
    epistemic_state: state,
    support_score: score,
    score_semantics: 'DETERMINISTIC_POLICY_SCORE_NOT_STATISTICAL_PROBABILITY',
    contradiction_penalty: contradictions,
    friction_level: friction,
    required_evidence: requiredEvidence,
    required_authority: 'EXISTING_EXPLICIT_AUTHORITY_ONLY',
    required_verification: requiredVerification,
    action_authorized: false,
    authority_preserved: true,
    gate_reason: highRisk
      ? 'Action risk imposes a gate independent of epistemic confidence.'
      : state === 'INSUFFICIENT_EVIDENCE'
        ? 'Insufficient evidence requires evidence work before action.'
        : state === 'CONTESTED'
          ? 'Contradictory evidence requires resolution before action.'
          : 'Epistemic support determines gate burden only inside an existing authority envelope.',
  };
}

export function applyFrictionToAttentionProposal({ proposal, frictionDecision } = {}) {
  if (!proposal || !frictionDecision) throw new Error('PROPOSAL_AND_FRICTION_DECISION_REQUIRED');
  return {
    ...proposal,
    epistemic_friction: frictionDecision,
    state: frictionDecision.epistemic_state === 'INSUFFICIENT_EVIDENCE' || frictionDecision.epistemic_state === 'CONTESTED'
      ? 'BLOCKED_PENDING_EVIDENCE'
      : proposal.state,
    authority: 'NONE_UNLESS_EXPLICITLY_ESTABLISHED',
    action_authorized: false,
  };
}
