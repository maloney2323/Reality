export const ADVERSARIAL_CRITIQUE_VERSION = 'reality-adversarial-critique-v0.1';

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function generateAdversarialCritique({
  proposal,
  evidence = [],
  alternatives = [],
  authority = {},
  uncertainty = [],
} = {}) {
  if (!proposal) throw new Error('PROPOSAL_REQUIRED');

  const evidenceIds = evidence.map((item) => item?.id || item?.ref).filter(Boolean);
  const unsupportedClaims = evidence.length === 0 ? ['PROPOSAL_HAS_NO_EVIDENCE'] : [];

  const strongestAlternative = alternatives[0] || null;
  const authorityAllowed = authority.allowed !== false;

  const critique = {
    critique_version: ADVERSARIAL_CRITIQUE_VERSION,
    proposal: clone(proposal),
    supporting_evidence_refs: evidenceIds,
    strongest_counterargument: strongestAlternative
      ? clone(strongestAlternative)
      : 'No explicit alternative supplied; proposal must be treated as insufficiently challenged.',
    unsupported_claims: unsupportedClaims,
    uncertainty: clone(uncertainty),
    authority_check: {
      allowed: authorityAllowed,
      reason: authority.reason || (authorityAllowed ? 'No blocking authority constraint supplied.' : 'Authority boundary blocks proposal.'),
    },
    challenge_status: 'CHALLENGED',
  };

  critique.disposition = (
    !authorityAllowed ? 'BLOCK'
      : unsupportedClaims.length ? 'INSUFFICIENT_EVIDENCE'
        : strongestAlternative ? 'REQUIRES_COMPARISON'
          : 'REQUIRES_ADDITIONAL_CHALLENGE'
  );

  return critique;
}

export function assertCritiqueIntegrity({ critique } = {}) {
  if (!critique || critique.critique_version !== ADVERSARIAL_CRITIQUE_VERSION) {
    throw new Error('CRITIQUE_VERSION_INVALID');
  }
  if (critique.challenge_status !== 'CHALLENGED') throw new Error('CRITIQUE_NOT_EXECUTED');
  if (!critique.authority_check) throw new Error('AUTHORITY_CHECK_MISSING');
  return {
    integrity: 'VALID',
    disposition: critique.disposition,
  };
}
