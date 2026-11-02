const EXPECTED_REPOSITORY = 'maloney2323/Reality';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const WORK_ID_RE = /^work:[0-9a-f]{32}$/;
const GOAL_ID_RE = /^user-goal:[A-Za-z0-9._:-]+$/;
const SHA1_RE = /^[0-9a-f]{40}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;

const PROVIDER_SOURCES = new Set([
  'GITHUB',
  'GITHUB_ACTIONS',
  'GITHUB_ACTIONS_API',
  'GITHUB_PROVIDER_API',
  'PROVIDER_API',
  'INDEPENDENT_PROVIDER_READBACK'
]);

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function optionalExact(object, key, expected) {
  return !hasOwn(object, key) || object[key] === expected;
}

function blocked(reason) {
  return {
    status: 'BLOCKED',
    reason,
    universe_settlement_verified: false,
    installation_authorized: false,
    production_changed: false,
    original_job_completed_in_universe: false,
    reconciliation: null
  };
}

function providerSourceIsValid(provider) {
  for (const key of ['evidence_source', 'attestation_source', 'source']) {
    if (hasOwn(provider, key) && !PROVIDER_SOURCES.has(provider[key])) return false;
  }
  return true;
}

function providerCommitIsBound(provider, installedCommit) {
  const shaKeys = [
    'head_sha',
    'run_head_sha',
    'commit_sha',
    'current_run_sha',
    'checked_run_sha',
    'workflow_sha'
  ];

  for (const key of shaKeys) {
    if (hasOwn(provider, key)) {
      if (!SHA1_RE.test(provider[key]) || provider[key] !== installedCommit) return false;
    }
  }

  if (isRecord(provider.current_run) && hasOwn(provider.current_run, 'head_sha')) {
    if (!SHA1_RE.test(provider.current_run.head_sha) ||
        provider.current_run.head_sha !== installedCommit) return false;
  }

  return true;
}

function providerOutcomeIsVerified(provider) {
  if (provider.run_status !== 'completed' ||
      provider.original_job_success !== true ||
      provider.independent_provider_readback !== true) {
    return false;
  }

  if (provider.run_conclusion === 'success') return true;

  if (provider.run_conclusion !== 'failure') return false;

  return provider.resume_job_success === true &&
    provider.settlement_job_success === true &&
    provider.unrelated_job_failure_verified === true &&
    SHA256_RE.test(provider.settlement_artifact_digest);
}

function staleOrSuperseded(provider) {
  if (provider.stale === true || provider.superseded === true || provider.is_current === false) {
    return true;
  }

  for (const key of ['current_run_id', 'latest_successful_run_id', 'authoritative_run_id']) {
    if (hasOwn(provider, key)) {
      if (!Number.isSafeInteger(provider[key]) || provider[key] <= 0) return true;
      if (provider[key] !== provider.run_id) return true;
    }
  }

  if (hasOwn(provider, 'superseded_by_run_id') && provider.superseded_by_run_id !== null) {
    if (!Number.isSafeInteger(provider.superseded_by_run_id) ||
        provider.superseded_by_run_id !== provider.run_id) return true;
  }

  const candidates = [];
  if (isRecord(provider.superseding_successful_run)) {
    candidates.push(provider.superseding_successful_run);
  }
  if (Array.isArray(provider.superseding_successful_runs)) {
    candidates.push(...provider.superseding_successful_runs);
  }

  for (const candidate of candidates) {
    if (!isRecord(candidate)) return true;
    const successful = candidate.run_conclusion === 'success' || candidate.conclusion === 'success';
    if (successful && candidate.run_id !== provider.run_id) return true;
  }

  return false;
}

function completionMatches(event, expected) {
  return isRecord(event) &&
    event.original_work_id === expected.originalWorkId &&
    event.owner_id === expected.ownerId &&
    event.continuity_root_id === expected.rootId &&
    event.worldline_id === expected.worldlineId &&
    event.installed_commit_sha === expected.installedCommit &&
    event.provider_run_id === expected.providerRunId &&
    event.provider_outcome_digest === expected.providerDigest &&
    event.epistemic_status === 'VERIFIED' &&
    event.constitutional_phase === 'SETTLED' &&
    event.original_job_completed === true;
}

/**
 * Validates evidence for continuity reconciliation without writing to a ledger,
 * granting installation authority, promoting an artifact, or changing production.
 */
export function assessContinuityReconciliation(evidence) {
  if (!isRecord(evidence)) return blocked('EVIDENCE_MISSING');

  const {original, approval, installation, provider, settlement, ledger} = evidence;
  for (const [name, receipt] of Object.entries({
    original,
    approval,
    installation,
    provider,
    settlement,
    ledger
  })) {
    if (!isRecord(receipt)) return blocked(`${name.toUpperCase()}_RECEIPT_MISSING`);
  }

  if (!UUID_RE.test(original.owner_id) ||
      !UUID_RE.test(original.continuity_root_id) ||
      !UUID_RE.test(original.worldline_id) ||
      !UUID_RE.test(original.original_event_id) ||
      !WORK_ID_RE.test(original.original_work_id) ||
      !GOAL_ID_RE.test(original.goal_id) ||
      !SHA256_RE.test(original.source_content_hash) ||
      !SHA256_RE.test(original.original_event_lineage_hash)) {
    return blocked('ORIGINAL_PROVENANCE_INVALID');
  }

  if (original.epistemic_status !== 'VERIFIED' || original.original_job_completed !== false) {
    return blocked('ORIGINAL_STATE_INVALID');
  }

  if (!UUID_RE.test(approval.approval_id) ||
      approval.owner_id !== original.owner_id ||
      approval.original_work_id !== original.original_work_id ||
      approval.source !== 'AUTHENTICATED_OWNER_EXPLICIT_ACTION' ||
      approval.target_environment !== 'ISOLATED_PREVIEW' ||
      approval.consumed_once !== true ||
      !SHA256_RE.test(approval.artifact_sha256)) {
    return blocked('APPROVAL_INVALID_OR_FOREIGN');
  }

  if (!optionalExact(approval, 'goal_id', original.goal_id) ||
      !optionalExact(approval, 'continuity_root_id', original.continuity_root_id) ||
      !optionalExact(approval, 'worldline_id', original.worldline_id)) {
    return blocked('APPROVAL_PROVENANCE_MISMATCH');
  }

  if (installation.original_work_id !== original.original_work_id ||
      installation.artifact_sha256 !== approval.artifact_sha256 ||
      !SHA256_RE.test(installation.artifact_sha256) ||
      !SHA1_RE.test(installation.installed_commit_sha) ||
      installation.installed_source_verified !== true ||
      installation.production_changed !== false) {
    return blocked('INSTALLATION_RECEIPT_INVALID');
  }

  if (!optionalExact(installation, 'owner_id', original.owner_id) ||
      !optionalExact(installation, 'goal_id', original.goal_id) ||
      !optionalExact(installation, 'continuity_root_id', original.continuity_root_id) ||
      !optionalExact(installation, 'worldline_id', original.worldline_id)) {
    return blocked('INSTALLATION_PROVENANCE_MISMATCH');
  }

  if (provider.repository !== EXPECTED_REPOSITORY ||
      !Number.isSafeInteger(provider.run_id) || provider.run_id <= 0 ||
      !SHA256_RE.test(provider.provider_outcome_digest) ||
      !providerSourceIsValid(provider) ||
      !providerOutcomeIsVerified(provider)) {
    return blocked('PROVIDER_ATTESTATION_INVALID');
  }

  if (!providerCommitIsBound(provider, installation.installed_commit_sha)) {
    return blocked('PROVIDER_RUN_SHA_MISMATCH');
  }

  if (!optionalExact(provider, 'original_work_id', original.original_work_id) ||
      !optionalExact(provider, 'owner_id', original.owner_id) ||
      !optionalExact(provider, 'goal_id', original.goal_id) ||
      !optionalExact(provider, 'continuity_root_id', original.continuity_root_id) ||
      !optionalExact(provider, 'worldline_id', original.worldline_id)) {
    return blocked('PROVIDER_PROVENANCE_MISMATCH');
  }

  if (settlement.status !== 'SETTLED_ISOLATED' ||
      settlement.original_work_id !== original.original_work_id ||
      settlement.original_job_completed !== true ||
      settlement.independent_outcome_verified !== true ||
      settlement.owner_approval_id !== approval.approval_id ||
      settlement.artifact_sha256 !== approval.artifact_sha256 ||
      !SHA256_RE.test(settlement.artifact_sha256) ||
      settlement.installed_commit_sha !== installation.installed_commit_sha ||
      settlement.provider_run_id !== provider.run_id ||
      settlement.provider_outcome_digest !== provider.provider_outcome_digest ||
      settlement.production_changed !== false) {
    return blocked('SETTLEMENT_RECEIPT_INVALID');
  }

  if (!optionalExact(settlement, 'owner_id', original.owner_id) ||
      !optionalExact(settlement, 'goal_id', original.goal_id) ||
      !optionalExact(settlement, 'continuity_root_id', original.continuity_root_id) ||
      !optionalExact(settlement, 'worldline_id', original.worldline_id) ||
      !optionalExact(settlement, 'repository', EXPECTED_REPOSITORY)) {
    return blocked('SETTLEMENT_PROVENANCE_MISMATCH');
  }

  if (ledger.continuity_root_id !== original.continuity_root_id ||
      ledger.worldline_id !== original.worldline_id ||
      ledger.append_only_verified !== true ||
      !SHA256_RE.test(ledger.head_lineage_hash) ||
      !Array.isArray(ledger.verified_completion_events)) {
    return blocked('LEDGER_LINEAGE_INVALID');
  }

  const tipIsOriginalEvent = ledger.head_lineage_hash === original.original_event_lineage_hash;
  if (!tipIsOriginalEvent && ledger.original_event_in_chain_verified !== true) {
    return blocked('ORIGINAL_EVENT_ANCESTRY_UNVERIFIED');
  }

  const expectedCompletion = {
    originalWorkId: original.original_work_id,
    ownerId: original.owner_id,
    rootId: original.continuity_root_id,
    worldlineId: original.worldline_id,
    installedCommit: installation.installed_commit_sha,
    providerRunId: provider.run_id,
    providerDigest: provider.provider_outcome_digest
  };

  if (ledger.verified_completion_events.length > 0) {
    if (ledger.verified_completion_events.length !== 1 ||
        !completionMatches(ledger.verified_completion_events[0], expectedCompletion)) {
      return blocked('LEDGER_COMPLETION_CONTRADICTORY_OR_DUPLICATE');
    }

    return {
      status: 'ALREADY_RECONCILED',
      original_work_id: original.original_work_id,
      universe_settlement_verified: true,
      installation_authorized: false,
      production_changed: false,
      original_job_completed_in_universe: true,
      reconciliation: null
    };
  }

  // Freshness is evaluated immediately before proposal generation. Neither a
  // dashboard nor a model claim can replace provider or ledger evidence.
  if (staleOrSuperseded(provider)) {
    return blocked('PROVIDER_RUN_STALE_OR_SUPERSEDED');
  }

  return {
    status: 'RECONCILIATION_REQUIRED',
    original_work_id: original.original_work_id,
    universe_settlement_verified: false,
    installation_authorized: false,
    production_changed: false,
    original_job_completed_in_universe: false,
    reconciliation: {
      status: 'PROPOSED_NOT_APPENDED',
      original_work_id: original.original_work_id,
      owner_id: original.owner_id,
      goal_id: original.goal_id,
      continuity_root_id: original.continuity_root_id,
      worldline_id: original.worldline_id,
      source_event_id: original.original_event_id,
      source_content_hash: original.source_content_hash,
      prior_lineage_hash: ledger.head_lineage_hash,
      artifact_sha256: approval.artifact_sha256,
      installed_commit_sha: installation.installed_commit_sha,
      provider_repository: EXPECTED_REPOSITORY,
      provider_run_id: provider.run_id,
      provider_outcome_digest: provider.provider_outcome_digest,
      owner_approval_id: approval.approval_id,
      epistemic_status: 'PROPOSED',
      append_authorized: false,
      production_changed: false
    }
  };
}

export default assessContinuityReconciliation;
