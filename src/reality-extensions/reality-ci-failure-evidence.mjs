const EXPECTED_REPOSITORY = 'maloney2323/Reality';
const EXPECTED_SOURCE = 'GITHUB_ACTIONS_INDEPENDENT_PROVIDER_READBACK';
const EXPECTED_CAPABILITY = 'reality.ci-failure-evidence-v1';
const EXPECTED_MANIFEST = 'first-ci-evidence-gap-v1';

const AUTHORITY_ERRORS = new Set([
  'PERMISSION_DENIED',
  'SERVICE_ROLE_REQUIRED',
  'AUTHORITY_REQUIRED',
  'CREDENTIAL_UNAVAILABLE',
]);

const MISSING_CAPABILITY_ERRORS = new Set([
  'ERR_MODULE_NOT_FOUND',
  'MODULE_NOT_FOUND',
]);

const SHA40 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const OWNER_ID = /^owner:[A-Za-z0-9][A-Za-z0-9._-]*$/;
const GOAL_ID = /^user-goal:[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const WORK_ID = /^work:[0-9a-f]{32}$/;

function positiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function exactRunUrl(runId) {
  return `https://github.com/${EXPECTED_REPOSITORY}/actions/runs/${runId}`;
}

function exactReceipt(runId, jobId) {
  return `github:actions:run:${runId}:job:${jobId}:verified`;
}

function resultBase(evidence) {
  return {
    owner_id: evidence?.owner_id ?? null,
    goal_id: evidence?.goal_id ?? null,
    original_work_id: evidence?.original_work_id ?? null,
    missing_capability_id: evidence?.missing_capability_id ?? null,
    frozen_regression_sha256: evidence?.frozen_regression_sha256 ?? null,
    source_receipt_ref: evidence?.source_receipt_ref ?? null,
    failure_log_sha256: evidence?.failure_log_sha256 ?? null,
    decision: 'INSUFFICIENT_EVIDENCE',
    can_generate_candidate: false,
    installation_authorized: false,
    external_execution_authorized: false,
    original_job_completed: false,
    production_changed: false,
  };
}

function decide(base, decision, canGenerateCandidate = false) {
  return Object.freeze({
    ...base,
    decision,
    can_generate_candidate: canGenerateCandidate,
  });
}

function hasValidIdentity(evidence) {
  return OWNER_ID.test(evidence.owner_id)
    && GOAL_ID.test(evidence.goal_id)
    && WORK_ID.test(evidence.original_work_id);
}

function hasCurrentExactShas(evidence) {
  if (!SHA40.test(evidence.repository_base_sha)
      || !SHA40.test(evidence.run_head_sha)
      || !SHA40.test(evidence.latest_head_sha)) {
    return false;
  }

  return evidence.run_head_sha === evidence.repository_base_sha
    && evidence.latest_head_sha === evidence.repository_base_sha;
}

function hasBoundProviderProvenance(evidence) {
  if (evidence.repository !== EXPECTED_REPOSITORY
      || evidence.source !== EXPECTED_SOURCE
      || evidence.provider_readback_verified !== true
      || evidence.original_goal_verified !== true
      || !hasValidIdentity(evidence)
      || !positiveInteger(evidence.run_id)
      || !positiveInteger(evidence.job_id)) {
    return false;
  }

  if (evidence.run_url !== exactRunUrl(evidence.run_id)
      || evidence.source_receipt_ref !== exactReceipt(evidence.run_id, evidence.job_id)) {
    return false;
  }

  return hasCurrentExactShas(evidence);
}

function hasCompleteFailureEvidence(evidence) {
  return evidence.run_status === 'completed'
    && evidence.run_conclusion === 'failure'
    && SHA256.test(evidence.failure_log_sha256)
    && SHA256.test(evidence.frozen_regression_sha256)
    && evidence.missing_capability_id === EXPECTED_CAPABILITY
    && evidence.frozen_regression_manifest_ref === EXPECTED_MANIFEST
    && typeof evidence.error_code === 'string'
    && evidence.error_code.length > 0;
}

function supersedingSuccessState(evidence) {
  const success = evidence.superseding_success;
  if (success === null || success === undefined) return 'NONE';
  if (typeof success !== 'object' || Array.isArray(success)) return 'INVALID';

  const valid = success.repository === EXPECTED_REPOSITORY
    && success.repository === evidence.repository
    && SHA40.test(success.run_head_sha)
    && success.run_head_sha === evidence.run_head_sha
    && positiveInteger(success.run_id)
    && success.run_id > evidence.run_id
    && success.run_status === 'completed'
    && success.run_conclusion === 'success'
    && success.independently_verified === true;

  return valid ? 'VERIFIED_SUCCESS' : 'INVALID';
}

/**
 * Classify provider-read failure evidence without granting approval or authority.
 * The return value can only nominate source generation; it cannot install or run it.
 */
export function classifyVerifiedCiFailure(evidence) {
  const base = resultBase(evidence);

  if (evidence === null || typeof evidence !== 'object' || Array.isArray(evidence)) {
    return decide(base, 'INSUFFICIENT_EVIDENCE');
  }

  if (!hasBoundProviderProvenance(evidence) || !hasCompleteFailureEvidence(evidence)) {
    return decide(base, 'INSUFFICIENT_EVIDENCE');
  }

  const superseding = supersedingSuccessState(evidence);
  if (superseding === 'INVALID') {
    return decide(base, 'INSUFFICIENT_EVIDENCE');
  }
  if (superseding === 'VERIFIED_SUCCESS') {
    return decide(base, 'STALE_OR_ALREADY_REPAIRED');
  }

  if (AUTHORITY_ERRORS.has(evidence.error_code)) {
    return decide(base, 'AUTHORITY_OR_CONFIGURATION_BLOCK');
  }

  if (evidence.current_capability_registry_status === 'ACTIVE') {
    return decide(base, 'REPAIR_EXISTING_DEFECT');
  }

  if (evidence.current_capability_registry_status !== 'ABSENT') {
    return decide(base, 'INSUFFICIENT_EVIDENCE');
  }

  if (!MISSING_CAPABILITY_ERRORS.has(evidence.error_code)) {
    return decide(base, 'INSUFFICIENT_EVIDENCE');
  }

  return decide(base, 'MISSING_CAPABILITY', true);
}
