// Reality Governed Egress Signal Cleaner v0.1
//
// Final epistemic/action boundary for information leaving Reality.
// It does not establish truth, create authority, execute actions, or rewrite
// epistemic state. Human authorization can change what Reality may do, but
// cannot change what Reality knows.
//
// CHAT_ADVISORY is intentionally distinct from STATEMENT: ordinary chat may
// contain model-generated reasoning, but that output is not allowed to cross
// the boundary as established world truth without evidence binding.

export const GOVERNED_EGRESS_SIGNAL_CLEANER_VERSION = 'reality-governed-egress-signal-cleaner-v0.1';
export const GOVERNED_EGRESS_AUTHORITY = 'EGRESS_POLICY_GATE_ONLY';

export const EGRESS_KIND = Object.freeze({
  CHAT_ADVISORY: 'CHAT_ADVISORY',
  STATEMENT: 'STATEMENT',
  PROPOSAL: 'PROPOSAL',
  ACTION: 'ACTION',
});

export const EGRESS_DISPOSITION = Object.freeze({
  PERMIT: 'PERMIT',
  REFRAME_REQUIRED: 'REFRAME_REQUIRED',
  CONDITIONAL_REVIEW: 'CONDITIONAL_REVIEW',
  BLOCKED: 'BLOCKED',
  DENIED_EXECUTION_SIG: 'DENIED_EXECUTION_SIG',
});

const EPISTEMIC_STATUS = new Set([
  'KNOWN', 'SUPPORTED', 'UNCERTAIN', 'CONTESTED',
  'CONTRADICTED', 'NOT_PROVABLE', 'UNVERIFIABLE', 'INSUFFICIENT_EVIDENCE',
]);

function text(value, max = 4000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function list(value, max = 32) {
  if (!Array.isArray(value)) return [];
  return Object.freeze(value.map((item) => text(item, 500)).filter(Boolean).slice(0, max));
}

function normalizeKind(value) {
  const kind = text(value, 40).toUpperCase();
  if (!Object.values(EGRESS_KIND).includes(kind)) throw new Error('unsupported egress kind');
  return kind;
}

function normalizeEpistemicStatus(value) {
  const status = text(value, 60).toUpperCase();
  return EPISTEMIC_STATUS.has(status) ? status : 'UNVERIFIABLE';
}

function witnessAllowsStatement(witness) {
  return (witness?.status === 'WITNESSED' || witness?.witness_status === 'WITNESSED')
    && witness?.truth_established_by_witness === false
    && witness?.action_authorized === false
    && witness?.implementation_authorized === false;
}

function hasEvidenceForStatement(input) {
  return list(input.evidence_refs).length > 0 && witnessAllowsStatement(input.witness);
}

function proposalLogicAllows(input) {
  return text(input.logic_consistency, 80).toUpperCase() === 'PASS'
    && list(input.evidence_refs).length > 0;
}

function authorizationAllowsAction(input) {
  const authorization = input.authorization;
  const capability = input.capability;
  return Boolean(
    authorization?.verified === true
    && authorization.receipt_id
    && authorization.epistemic_state_unchanged === true
    && capability?.verified === true
    && capability.single_use === true
    && capability.scope_matches === true,
  );
}

function result({ kind, disposition, reason_code, epistemic_status, response, reframe_instruction = null, action_authorized = false }) {
  return Object.freeze({
    record_version: GOVERNED_EGRESS_SIGNAL_CLEANER_VERSION,
    authority: GOVERNED_EGRESS_AUTHORITY,
    egress_kind: kind,
    disposition,
    reason_code,
    epistemic_status,
    response: response ?? null,
    reframe_instruction,
    action_authorized,
    truth_established: false,
    human_authorization_changes_epistemic_state: false,
  });
}

export function cleanGovernedEgress(input = {}) {
  const kind = normalizeKind(input.egress_kind);
  const epistemicStatus = normalizeEpistemicStatus(input.epistemic_status);
  const response = text(input.response, 36_000);

  if (!response && kind !== EGRESS_KIND.ACTION) {
    return result({
      kind,
      disposition: EGRESS_DISPOSITION.BLOCKED,
      reason_code: 'EGRESS_CONTENT_REQUIRED',
      epistemic_status: epistemicStatus,
    });
  }

  if (kind === EGRESS_KIND.CHAT_ADVISORY) {
    return result({
      kind,
      disposition: EGRESS_DISPOSITION.PERMIT,
      reason_code: 'CHAT_ADVISORY_NOT_WORLD_TRUTH',
      epistemic_status: epistemicStatus,
      response,
      reframe_instruction: 'Chat output is advisory only. It must not be represented as established world truth without evidence binding.',
    });
  }

  if (kind === EGRESS_KIND.STATEMENT) {
    if (epistemicStatus === 'KNOWN' || epistemicStatus === 'SUPPORTED') {
      if (!hasEvidenceForStatement(input)) {
        return result({
          kind,
          disposition: EGRESS_DISPOSITION.REFRAME_REQUIRED,
          reason_code: 'STATEMENT_WITNESS_OR_EVIDENCE_BINDING_MISSING',
          epistemic_status: epistemicStatus,
          response,
          reframe_instruction: 'State only the observed evidence and preserve uncertainty; do not present the proposition as established.',
        });
      }
      return result({
        kind,
        disposition: EGRESS_DISPOSITION.PERMIT,
        reason_code: 'SUPPORTED_EVIDENCE_BOUND_STATEMENT',
        epistemic_status: epistemicStatus,
        response,
      });
    }

    if (epistemicStatus === 'UNCERTAIN' || epistemicStatus === 'CONTESTED'
      || epistemicStatus === 'UNVERIFIABLE' || epistemicStatus === 'INSUFFICIENT_EVIDENCE') {
      return result({
        kind,
        disposition: EGRESS_DISPOSITION.REFRAME_REQUIRED,
        reason_code: 'EPISTEMIC_UNCERTAINTY_MUST_SURVIVE_EGRESS',
        epistemic_status: epistemicStatus,
        response,
        reframe_instruction: 'Reframe as a claim, observation, or uncertainty statement. Do not promote it to established fact.',
      });
    }

    return result({
      kind,
      disposition: EGRESS_DISPOSITION.BLOCKED,
      reason_code: 'CONTRADICTED_OR_NOT_PROVABLE_STATEMENT',
      epistemic_status: epistemicStatus,
      response,
    });
  }

  if (kind === EGRESS_KIND.PROPOSAL) {
    if (epistemicStatus === 'CONTRADICTED' || epistemicStatus === 'NOT_PROVABLE') {
      return result({
        kind,
        disposition: EGRESS_DISPOSITION.BLOCKED,
        reason_code: 'PROPOSAL_RESTS_ON_UNRESOLVED_NEGATIVE_EVIDENCE',
        epistemic_status: epistemicStatus,
        response,
      });
    }

    if (!proposalLogicAllows(input)) {
      return result({
        kind,
        disposition: EGRESS_DISPOSITION.REFRAME_REQUIRED,
        reason_code: 'PROPOSAL_LOGIC_OR_EVIDENCE_BINDING_MISSING',
        epistemic_status: epistemicStatus,
        response,
        reframe_instruction: 'Identify evidence, constraints, assumptions, and the inference chain before presenting the proposal as decision-ready.',
      });
    }

    if (epistemicStatus === 'UNCERTAIN' || epistemicStatus === 'CONTESTED'
      || epistemicStatus === 'UNVERIFIABLE' || epistemicStatus === 'INSUFFICIENT_EVIDENCE') {
      return result({
        kind,
        disposition: EGRESS_DISPOSITION.CONDITIONAL_REVIEW,
        reason_code: 'PROPOSAL_REQUIRES_EXPLICIT_UNCERTAINTY',
        epistemic_status: epistemicStatus,
        response,
        reframe_instruction: 'Present the proposal conditionally and preserve the unresolved evidence state.',
      });
    }

    return result({
      kind,
      disposition: EGRESS_DISPOSITION.PERMIT,
      reason_code: 'LOGIC_AND_EVIDENCE_BOUND_PROPOSAL',
      epistemic_status: epistemicStatus,
      response,
    });
  }

  if (!authorizationAllowsAction(input)) {
    return result({
      kind,
      disposition: EGRESS_DISPOSITION.DENIED_EXECUTION_SIG,
      reason_code: 'ACTION_AUTHORITY_OR_CAPABILITY_PROOF_MISSING',
      epistemic_status: epistemicStatus,
      action_authorized: false,
    });
  }

  return result({
    kind,
    disposition: EGRESS_DISPOSITION.PERMIT,
    reason_code: 'VERIFIED_AUTHORIZATION_AND_CAPABILITY',
    epistemic_status: epistemicStatus,
    action_authorized: true,
  });
}

export function assertHumanAuthorizationPreservesEpistemicState(authorization = {}) {
  if (authorization.epistemic_state_changed === true) {
    throw new Error('HUMAN_AUTHORIZATION_CANNOT_CHANGE_EPISTEMIC_STATE');
  }
  return true;
}