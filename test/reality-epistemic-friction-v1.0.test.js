import assert from 'node:assert/strict';
import {
  EPISTEMIC_FRICTION_VERSION,
  assessEpistemicFriction,
  applyFrictionToAttentionProposal,
} from '../src/reality-epistemic-friction-v1.0.js';

const unknown = assessEpistemicFriction({
  candidate: { attention_candidate_id: 'attention:unknown' },
  evidenceProfile: {},
  actionProfile: { risk: 'LOW', reversibility: 'REVERSIBLE', blast_radius: 1 },
});
assert.equal(unknown.engine_version, EPISTEMIC_FRICTION_VERSION);
assert.equal(unknown.epistemic_state, 'INSUFFICIENT_EVIDENCE');
assert.equal(unknown.friction_level, 'MAXIMUM');
assert.equal(unknown.action_authorized, false);

const supported = assessEpistemicFriction({
  candidate: { attention_candidate_id: 'attention:supported' },
  evidenceProfile: {
    evidence_references: ['e1','e2','e3'],
    corroboration_score: 36,
    historical_precedent_score: 18,
    temporal_consistency_score: 14,
    source_authority_score: 14,
    signal_integrity_score: 10,
  },
  actionProfile: { risk: 'LOW', reversibility: 'REVERSIBLE', blast_radius: 1 },
});
assert.equal(supported.epistemic_state, 'STRONGLY_SUPPORTED');
assert.equal(supported.friction_level, 'LOW');
assert.equal(supported.authority_preserved, true);
assert.equal(supported.required_authority, 'EXISTING_EXPLICIT_AUTHORITY_ONLY');

const risky = assessEpistemicFriction({
  candidate: { attention_candidate_id: 'attention:risky' },
  evidenceProfile: {
    evidence_references: ['e1','e2','e3'],
    corroboration_score: 36,
    historical_precedent_score: 18,
    temporal_consistency_score: 14,
    source_authority_score: 14,
    signal_integrity_score: 10,
  },
  actionProfile: { risk: 'LOW', reversibility: 'IRREVERSIBLE', blast_radius: 5 },
});
assert.equal(risky.epistemic_state, 'STRONGLY_SUPPORTED');
assert.equal(risky.friction_level, 'HIGH');
assert.match(risky.gate_reason, /risk/i);

const applied = applyFrictionToAttentionProposal({
  proposal: { state: 'PROPOSED', authority: 'NONE_UNLESS_EXPLICITLY_ESTABLISHED', action_authorized: false },
  frictionDecision: unknown,
});
assert.equal(applied.state, 'BLOCKED_PENDING_EVIDENCE');
assert.equal(applied.action_authorized, false);
assert.equal(applied.authority, 'NONE_UNLESS_EXPLICITLY_ESTABLISHED');

console.log('REALITY_EPISTEMIC_FRICTION_V1_0_PASS');
