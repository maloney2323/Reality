const EXPECTED_REPOSITORY = 'maloney2323/Reality';
const EXPECTED_SOURCE = 'GITHUB_ACTIONS_INDEPENDENT_PROVIDER_READBACK';
const CI_FAILURE_CAPABILITY = 'reality.ci-failure-evidence-v1';

const AUTHORITY_OR_CONFIGURATION_ERRORS = new Set([
  'PERMISSION_DENIED',
  'SERVICE_ROLE_REQUIRED',
  'AUTHORITY_REQUIRED',
  'CREDENTIAL_UNAVAILABLE',
]);

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = value => typeof value === 'string' && value.length > 0;
const isPositiveInteger = value => Number.isSafeInteger(value) && value > 0;
const isSha40 = value => typeof value === 'string' && /^[a-f0-9]{40}$/i.test(value);
const isSha256 = value => typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);
const isWorkId = value => typeof value === 'string' && /^work:[a-f0-9]{32}$/i.test(value);
const isOwnerId = value => typeof value === 'string' && /^owner:[^\s]+$/.test(value);
const isGoalId = value => typeof value === 'string' && /^user-goal:[^\s]+$/.test(value);

function baseResult(input) {
  return {
    owner_id: input.owner_id ?? null,
    goal_id: input.goal_id ?? null,
    original_work_id: input.original_work_id ?? null,
    missing_capability_id: input.missing_capability_id ?? null,
    frozen_regression_sha256: input.frozen_regression_sha256 ?? null,
    source_receipt_ref: input.source_receipt_ref ?? null,
    failure_log_sha256: input.failure_log_sha256 ?? null,
    decision: 'INSUFFICIENT_EVIDENCE',
    can_generate_candidate: false,
    installation_authorized: false,
    external_execution_authorized: false,
    original_job_completed: false,
    production_changed: false,
  };
}

function hasValidProviderEvidence(input) {
  if (input.source !== EXPECTED_SOURCE || input.provider_readback_verified !== true) return false;
  if (input.original_goal_verified !== true) return false;
  if (input.run_status !== 'completed' || input.run_conclusion !== 'failure') return false;
  if (!isPositiveInteger(input.run_id) || !isPositiveInteger(input.job_id)) return false;
  if (!isSha256(input.failure_log_sha256) || !isSha256(input.frozen_regression_sha256)) return false;
  if (!isNonEmptyString(input.frozen_regression_manifest_ref)) return false;

  const expectedReceipt = `github:actions:run:${input.run_id}:job:${input.job_id}:verified`;
  const expectedRunUrl = `https://github.com/${EXPECTED_REPOSITORY}/actions/runs/${input.run_id}`;
  return input.source_receipt_ref === expectedReceipt && input.run_url === expectedRunUrl;
}

function hasValidScope(input) {
  return input.repository === EXPECTED_REPOSITORY
    && isOwnerId(input.owner_id)
    && isGoalId(input.goal_id)
    && isWorkId(input.original_work_id)
    && isSha40(input.repository_base_sha)
    && isSha40(input.run_head_sha)
    && isSha40(input.latest_head_sha)
    && input.repository_base_sha === input.run_head_sha
    && input.run_head_sha === input.latest_head_sha;
}

function supersedingState(input) {
  if (input.superseding_success === null || input.superseding_success === undefined) return 'NONE';
  const success = input.superseding_success;
  if (!isRecord(success)) return 'UNVERIFIED';

  const verified = success.independently_verified === true
    && success.repository === input.repository
    && success.run_head_sha === input.run_head_sha
    && isPositiveInteger(success.run_id)
    && success.run_id > input.run_id
    && success.run_status === 'completed'
    && success.run_conclusion === 'success';
  return verified ? 'VERIFIED_SUCCESS' : 'UNVERIFIED';
}

/**
 * Classify provider-read-back CI failure metadata without granting authority.
 * This function validates supplied evidence; it does not itself contact GitHub.
 */
export function classifyVerifiedCiFailure(value) {
  const input = isRecord(value) ? value : {};
  const result = baseResult(input);

  if (!hasValidProviderEvidence(input)) return result;

  if (!hasValidScope(input)) {
    result.decision = 'SCOPE_MISMATCH';
    return result;
  }

  const superseding = supersedingState(input);
  if (superseding === 'UNVERIFIED') return result;
  if (superseding === 'VERIFIED_SUCCESS') {
    result.decision = 'STALE_OR_ALREADY_REPAIRED';
    return result;
  }

  if (AUTHORITY_OR_CONFIGURATION_ERRORS.has(input.error_code)) {
    result.decision = 'AUTHORITY_OR_CONFIGURATION_BLOCK';
    return result;
  }

  if (input.current_capability_registry_status === 'ACTIVE') {
    result.decision = 'REPAIR_EXISTING_DEFECT';
    return result;
  }

  if (input.error_code === 'ERR_MODULE_NOT_FOUND'
      && input.current_capability_registry_status === 'ABSENT'
      && input.missing_capability_id === CI_FAILURE_CAPABILITY) {
    result.decision = 'MISSING_CAPABILITY';
    result.can_generate_candidate = true;
    return result;
  }

  result.decision = 'UNCLASSIFIED_FAILURE';
  return result;
}
