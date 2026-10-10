/**
 * Reality Evidence Warrant v1.0
 *
 * Append-only provenance object binding the operational decision chain.
 * A warrant proves linkage; it does not grant authority and cannot mutate policy.
 */
import crypto from 'node:crypto';

export const EVIDENCE_WARRANT_VERSION = 'reality-evidence-warrant-v1.0';

const hash = value => crypto.createHash('sha256').update(JSON.stringify(value ?? null)).digest('hex');
const ref = (value, name) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name}_REQUIRED`);
  return value.trim();
};

export function createEvidenceWarrant({
  warrantId = null,
  parentWarrantHash = null,
  observationRefs = [],
  evidenceRefs = [],
  transformationReceiptRefs = [],
  epistemicAssessment = null,
  frictionDecision = null,
  attentionDecision = null,
  workProposal = null,
  authorityArtifact = null,
  executionReceipt = null,
  verificationReceipt = null,
  outcome = null,
  learningProposal = null,
  policyVersion = null,
} = {}) {
  const observations = observationRefs.filter(Boolean).map(String);
  const evidence = evidenceRefs.filter(Boolean).map(String);

  if (!observations.length) throw new Error('WARRANT_OBSERVATION_REQUIRED');
  if (!evidence.length) throw new Error('WARRANT_EVIDENCE_REQUIRED');
  if (!epistemicAssessment) throw new Error('WARRANT_EPISTEMIC_ASSESSMENT_REQUIRED');
  if (!frictionDecision) throw new Error('WARRANT_FRICTION_DECISION_REQUIRED');

  const body = {
    warrant_version: EVIDENCE_WARRANT_VERSION,
    warrant_id: warrantId || `warrant:${crypto.randomUUID()}`,
    parent_warrant_hash: parentWarrantHash,
    observation_refs: observations,
    evidence_refs: evidence,
    transformation_receipt_refs: transformationReceiptRefs.filter(Boolean).map(String),
    epistemic_assessment: epistemicAssessment,
    friction_decision: frictionDecision,
    attention_decision: attentionDecision,
    work_proposal: workProposal,
    authority_artifact: authorityArtifact,
    execution_receipt: executionReceipt,
    verification_receipt: verificationReceipt,
    outcome,
    learning_proposal: learningProposal,
    policy_version: policyVersion,
    authority_granted_by_warrant: false,
    policy_mutation_authorized_by_warrant: false,
  };

  return Object.freeze({
    ...body,
    warrant_hash: hash(body),
  });
}

export function appendEvidenceWarrant({ previousWarrant, ...next } = {}) {
  if (!previousWarrant?.warrant_hash) throw new Error('PREVIOUS_WARRANT_REQUIRED');
  return createEvidenceWarrant({
    ...next,
    parentWarrantHash: previousWarrant.warrant_hash,
  });
}

export function verifyEvidenceWarrant(warrant) {
  if (!warrant?.warrant_hash) return { valid: false, reason: 'WARRANT_HASH_REQUIRED' };
  const { warrant_hash, ...body } = warrant;
  const expected = hash(body);
  if (expected !== warrant_hash) return { valid: false, reason: 'WARRANT_HASH_MISMATCH' };
  if (warrant.authority_granted_by_warrant === true) return { valid: false, reason: 'WARRANT_CANNOT_GRANT_AUTHORITY' };
  if (warrant.policy_mutation_authorized_by_warrant === true) return { valid: false, reason: 'WARRANT_CANNOT_MUTATE_POLICY' };
  return { valid: true, warrant_hash };
}

export function verifyWarrantChain(warrants = []) {
  if (!Array.isArray(warrants)) throw new Error('WARRANTS_ARRAY_REQUIRED');
  for (let i = 0; i < warrants.length; i += 1) {
    if (i > 0 && warrants[i].parent_warrant_hash !== warrants[i - 1].warrant_hash) {
      throw new Error('WARRANT_CHAIN_BREAK');
    }
    const result = verifyEvidenceWarrant(warrants[i]);
    if (!result.valid) throw new Error(`WARRANT_INVALID:${result.reason}`);
  }
  return Object.freeze({
    valid: true,
    warrant_count: warrants.length,
    terminal_warrant_hash: warrants.length ? warrants[warrants.length - 1].warrant_hash : null,
  });
}

export function attachLearningProposalToWarrant({ warrant, learningProposal } = {}) {
  const result = verifyEvidenceWarrant(warrant);
  if (!result.valid) throw new Error(`WARRANT_INVALID:${result.reason}`);
  return createEvidenceWarrant({
    warrantId: null,
    parentWarrantHash: warrant.warrant_hash,
    observationRefs: warrant.observation_refs,
    evidenceRefs: warrant.evidence_refs,
    transformationReceiptRefs: warrant.transformation_receipt_refs,
    epistemicAssessment: warrant.epistemic_assessment,
    frictionDecision: warrant.friction_decision,
    attentionDecision: warrant.attention_decision,
    workProposal: warrant.work_proposal,
    authorityArtifact: warrant.authority_artifact,
    executionReceipt: warrant.execution_receipt,
    verificationReceipt: warrant.verification_receipt,
    outcome: warrant.outcome,
    learningProposal,
    policyVersion: warrant.policy_version,
  });
}
