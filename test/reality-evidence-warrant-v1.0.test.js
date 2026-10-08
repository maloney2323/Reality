import assert from 'node:assert/strict';
import {
  EVIDENCE_WARRANT_VERSION,
  createEvidenceWarrant,
  appendEvidenceWarrant,
  verifyEvidenceWarrant,
  verifyWarrantChain,
  attachLearningProposalToWarrant,
} from '../src/reality-evidence-warrant-v1.0.js';

const base = createEvidenceWarrant({
  observationRefs: ['observation:1'],
  evidenceRefs: ['evidence:1', 'evidence:2'],
  transformationReceiptRefs: ['transform:1'],
  epistemicAssessment: { state: 'SUPPORTED', score: 82 },
  frictionDecision: { level: 'STANDARD', required_verification: ['INDEPENDENT_EXTERNAL_VERIFICATION'] },
  attentionDecision: { disposition: 'INVESTIGATE' },
  workProposal: { state: 'PROPOSED' },
  authorityArtifact: { authority_id: 'authority:1' },
  executionReceipt: { execution_id: 'execution:1' },
  verificationReceipt: { verification_id: 'verification:1', independent: true },
  outcome: { result: 'SUCCESS', verified: true },
  policyVersion: 'friction-policy:1',
});

assert.equal(base.warrant_version, EVIDENCE_WARRANT_VERSION);
assert.equal(verifyEvidenceWarrant(base).valid, true);
assert.equal(base.authority_granted_by_warrant, false);
assert.equal(base.policy_mutation_authorized_by_warrant, false);

const next = appendEvidenceWarrant({
  previousWarrant: base,
  observationRefs: ['observation:2'],
  evidenceRefs: ['evidence:3'],
  epistemicAssessment: { state: 'STRONGLY_SUPPORTED', score: 91 },
  frictionDecision: { level: 'LOW' },
  learningProposal: { state: 'PROPOSED', policy_mutation_authorized: false },
});
assert.equal(next.parent_warrant_hash, base.warrant_hash);
assert.equal(verifyWarrantChain([base, next]).valid, true);

const attached = attachLearningProposalToWarrant({
  warrant: base,
  learningProposal: { mutation_proposal_id: 'mutation:1', state: 'PROPOSED' },
});
assert.equal(attached.parent_warrant_hash, base.warrant_hash);
assert.equal(attached.learning_proposal.mutation_proposal_id, 'mutation:1');
assert.equal(verifyEvidenceWarrant(attached).valid, true);

const tampered = { ...base, friction_decision: { level: 'LOW' } };
assert.equal(verifyEvidenceWarrant(tampered).valid, false);
assert.throws(() => verifyWarrantChain([base, { ...next, parent_warrant_hash: 'bad' }]), /WARRANT_CHAIN_BREAK/);

console.log('REALITY_EVIDENCE_WARRANT_V1_0_PASS');
