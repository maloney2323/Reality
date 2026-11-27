const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const WORK_ID = /^work:[0-9a-f]{32}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const COMMIT_SHA = /^[0-9a-f]{40}$/;
const GOAL_ID = /^verified:[A-Za-z0-9._:-]+$/;
const RESERVATION_REF = /^supabase:owner:single-use:[A-Za-z0-9._:-]+$/;
const EXECUTOR_REF = /^github:actions:run:[1-9][0-9]*:job:[1-9][0-9]*$/;
const SETTLEMENT_REF = /^supabase:universe_events:([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;
const BRANCH = /^(?!.*(?:^|\/)\.\.?(?:\/|$))[A-Za-z0-9][A-Za-z0-9._/-]{0,254}$/;

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function own(recordValue, key) {
  return Object.prototype.hasOwnProperty.call(recordValue, key);
}

function text(recordValue, key, pattern) {
  return own(recordValue, key) &&
    typeof recordValue[key] === 'string' &&
    pattern.test(recordValue[key]);
}

function flag(recordValue, key, expected) {
  return own(recordValue, key) && recordValue[key] === expected;
}

function unverified(input) {
  return {
    verified: false,
    status: 'UNVERIFIED',
    original_work_id:
      record(input) && typeof input.original_work_id === 'string'
        ? input.original_work_id
        : null,
    production_changed:
      record(input) && record(input.installation) &&
      typeof input.installation.production_changed === 'boolean'
        ? input.installation.production_changed
        : null,
  };
}

/**
 * Checks whether a supplied set of independent receipts is internally scoped
 * to one owner, work item, artifact, installation, execution, and settlement.
 * This function only validates receipt data; it does not authorize, execute,
 * install, settle, or independently create evidence.
 */
export function verifyRealityCompletion(input) {
  try {
    if (!record(input) ||
        !text(input, 'owner_id', UUID) ||
        !text(input, 'goal_id', GOAL_ID) ||
        !text(input, 'original_work_id', WORK_ID) ||
        !text(input, 'artifact_hash', SHA256)) {
      return unverified(input);
    }

    const approval = input.signed_owner_approval;
    const sandbox = input.sandbox;
    const installation = input.installation;
    const resumption = input.resumption;
    const settlement = input.settlement;

    if (!record(approval) || !record(sandbox) || !record(installation) ||
        !record(resumption) || !record(settlement)) {
      return unverified(input);
    }

    const approvalValid =
      flag(approval, 'verified', true) &&
      flag(approval, 'consumed_once', true) &&
      approval.owner_id === input.owner_id &&
      approval.original_work_id === input.original_work_id &&
      approval.artifact_hash === input.artifact_hash &&
      approval.origin === 'AUTHENTICATED_OWNER_EXPLICIT_ACTION' &&
      text(approval, 'reservation_ref', RESERVATION_REF);

    const sandboxValid =
      flag(sandbox, 'independently_verified', true) &&
      sandbox.artifact_hash === input.artifact_hash &&
      flag(sandbox, 'frozen_regression_passed', true) &&
      flag(sandbox, 'governance_preserved', true);

    const installationValid =
      flag(installation, 'independent_provider_readback', true) &&
      installation.original_work_id === input.original_work_id &&
      installation.artifact_hash === input.artifact_hash &&
      text(installation, 'installed_commit_sha', COMMIT_SHA) &&
      flag(installation, 'production_changed', false) &&
      text(installation, 'installed_branch', BRANCH);

    const resumptionValid =
      flag(resumption, 'independent_provider_readback', true) &&
      flag(resumption, 'real_execution_observed', true) &&
      resumption.original_work_id === input.original_work_id &&
      resumption.installed_commit_sha === installation.installed_commit_sha &&
      text(resumption, 'executor_run_ref', EXECUTOR_REF) &&
      resumption.outcome === 'SUCCEEDED';

    const settlementValid =
      flag(settlement, 'durable_settlement_readback', true) &&
      flag(settlement, 'independent_outcome_verified', true) &&
      settlement.original_work_id === input.original_work_id &&
      settlement.artifact_hash === input.artifact_hash &&
      settlement.installed_commit_sha === installation.installed_commit_sha &&
      text(settlement, 'receipt_ref', SETTLEMENT_REF);

    if (!approvalValid || !sandboxValid || !installationValid ||
        !resumptionValid || !settlementValid) {
      return unverified(input);
    }

    return {
      verified: true,
      status: 'VERIFIED_SETTLED',
      original_work_id: input.original_work_id,
      production_changed: false,
    };
  } catch {
    return unverified(null);
  }
}
