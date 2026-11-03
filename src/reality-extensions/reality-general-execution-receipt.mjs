const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const WORK_RE = /^work:[0-9a-f]{32}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const COMMIT_SHA_RE = /^[0-9a-f]{40}$/;
const EXECUTOR_REF_RE = /^github:actions:run:[1-9][0-9]*:job:[1-9][0-9]*$/;
const SETTLEMENT_REF_RE = /^supabase:universe_events:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const APPROVAL_REF = 'supabase:owner:single-use:receipt';

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function own(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function failed(receipt, reason) {
  return {
    verified: false,
    status: 'UNVERIFIED',
    original_work_id: record(receipt) && typeof receipt.original_work_id === 'string'
      ? receipt.original_work_id
      : null,
    production_changed: record(receipt) && record(receipt.installation)
      ? receipt.installation.production_changed === true
      : false,
    reason,
  };
}

function expectedValueMatches(receipt, expected) {
  const bindings = [
    ['owner_id', 'owner_id'],
    ['goal_id', 'goal_id'],
    ['original_work_id', 'original_work_id'],
    ['artifact_hash', 'artifact_hash'],
    ['repository', 'repository'],
  ];

  for (const [expectedKey, receiptKey] of bindings) {
    if (own(expected, expectedKey) && receipt[receiptKey] !== expected[expectedKey]) {
      return false;
    }
  }

  if (own(expected, 'current_commit_sha')) {
    if (!COMMIT_SHA_RE.test(expected.current_commit_sha)) return false;
    if (receipt.installation.installed_commit_sha !== expected.current_commit_sha) return false;
    if (receipt.resumption.installed_commit_sha !== expected.current_commit_sha) return false;
    if (receipt.settlement.installed_commit_sha !== expected.current_commit_sha) return false;
  }

  return true;
}

/**
 * Verify a completion receipt without treating caller/model assertions as evidence.
 * Optional `expected` values must come from the invoking trusted context.
 */
export function verifyRealityCompletion(receipt, expected = {}) {
  if (!record(receipt) || !record(expected)) {
    return failed(receipt, 'INVALID_INPUT');
  }

  // Superseding/staleness controls are evaluated before any success path.
  if (
    receipt.superseding_success === true ||
    receipt.status === 'SUPERSEDED' ||
    (own(receipt, 'superseded_by') && receipt.superseded_by !== null)
  ) {
    return failed(receipt, 'SUPERSEDED_EVIDENCE');
  }

  const approval = receipt.signed_owner_approval;
  const sandbox = receipt.sandbox;
  const installation = receipt.installation;
  const resumption = receipt.resumption;
  const settlement = receipt.settlement;

  if (![approval, sandbox, installation, resumption, settlement].every(record)) {
    return failed(receipt, 'INCOMPLETE_EVIDENCE');
  }

  if (
    !UUID_RE.test(receipt.owner_id) ||
    !nonEmpty(receipt.goal_id) ||
    !WORK_RE.test(receipt.original_work_id) ||
    !SHA256_RE.test(receipt.artifact_hash)
  ) {
    return failed(receipt, 'INVALID_IDENTITY_OR_HASH');
  }

  if (!expectedValueMatches(receipt, expected)) {
    return failed(receipt, 'EXPECTED_PROVENANCE_MISMATCH');
  }

  if (
    approval.verified !== true ||
    approval.consumed_once !== true ||
    approval.origin !== 'AUTHENTICATED_OWNER_EXPLICIT_ACTION' ||
    approval.reservation_ref !== APPROVAL_REF ||
    approval.owner_id !== receipt.owner_id ||
    approval.original_work_id !== receipt.original_work_id ||
    approval.artifact_hash !== receipt.artifact_hash
  ) {
    return failed(receipt, 'INVALID_OWNER_APPROVAL');
  }

  if (
    sandbox.independently_verified !== true ||
    sandbox.frozen_regression_passed !== true ||
    sandbox.governance_preserved !== true ||
    sandbox.artifact_hash !== receipt.artifact_hash
  ) {
    return failed(receipt, 'INVALID_SANDBOX_ATTESTATION');
  }

  if (
    installation.independent_provider_readback !== true ||
    installation.original_work_id !== receipt.original_work_id ||
    installation.artifact_hash !== receipt.artifact_hash ||
    !COMMIT_SHA_RE.test(installation.installed_commit_sha) ||
    installation.production_changed !== false ||
    !nonEmpty(installation.installed_branch) ||
    !installation.installed_branch.startsWith('feature/')
  ) {
    return failed(receipt, 'INVALID_INSTALLATION_ATTESTATION');
  }

  if (
    resumption.independent_provider_readback !== true ||
    resumption.real_execution_observed !== true ||
    resumption.outcome !== 'SUCCEEDED' ||
    resumption.original_work_id !== receipt.original_work_id ||
    resumption.installed_commit_sha !== installation.installed_commit_sha ||
    !EXECUTOR_REF_RE.test(resumption.executor_run_ref)
  ) {
    return failed(receipt, 'INVALID_EXECUTION_ATTESTATION');
  }

  if (
    settlement.durable_settlement_readback !== true ||
    settlement.independent_outcome_verified !== true ||
    settlement.original_work_id !== receipt.original_work_id ||
    settlement.artifact_hash !== receipt.artifact_hash ||
    settlement.installed_commit_sha !== installation.installed_commit_sha ||
    !SETTLEMENT_REF_RE.test(settlement.receipt_ref)
  ) {
    return failed(receipt, 'INVALID_SETTLEMENT_ATTESTATION');
  }

  for (const evidence of [approval, sandbox, installation, resumption, settlement]) {
    if (own(evidence, 'goal_id') && evidence.goal_id !== receipt.goal_id) {
      return failed(receipt, 'FOREIGN_GOAL');
    }
    if (own(evidence, 'repository') && evidence.repository !== receipt.repository) {
      return failed(receipt, 'FOREIGN_REPOSITORY');
    }
  }

  const providerRefs = [
    approval.reservation_ref,
    resumption.executor_run_ref,
    settlement.receipt_ref,
  ];
  if (new Set(providerRefs).size !== providerRefs.length) {
    return failed(receipt, 'NON_DISTINCT_PROVIDER_EVIDENCE');
  }

  return {
    verified: true,
    status: 'VERIFIED_SETTLED',
    original_work_id: receipt.original_work_id,
    production_changed: false,
  };
}

export default verifyRealityCompletion;
