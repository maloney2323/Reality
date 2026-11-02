const EXPECTED_REPOSITORY = 'maloney2323/Reality';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const WORK_ID_RE = /^work:[0-9a-f]{32}$/;
const SHA1_RE = /^[0-9a-f]{40}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const GOAL_ID_RE = /^user-goal:[A-Za-z0-9._:-]+$/;

const PROVIDER_SOURCES = new Set([
  'GITHUB',
  'GITHUB_ACTIONS',
  'GITHUB_ACTIONS_API',
  'GITHUB_PROVIDER_API',
  'PROVIDER_API',
  'INDEPENDENT_PROVIDER_READBACK'
]);

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

function own(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function exactOptional(object, key, expected) {
  return !own(object, key) || object[key] === expected;
}

function validProviderSource(provider) {
  for (const key of ['evidence_source', 'attestation_source', 'source']) {
    if (own(provider, key) && !PROVIDER_SOURCES.has(provider[key])) return false;
  }
  return true;
}

function providerShaMatches(provider, installedCommit) {
  const keys = [
    'head_sha',
    'run_head_sha',
    'commit_sha',
    'current_run_sha',
    'checked_run_sha',
    'workflow_sha'
  ];
  for (const key of keys) {
    if (own(provider, key)) {
      if (!SHA1_RE.test(provider[key]) || provider[key] !== installedCommit) return false;
    }
  }
  return true;
}

function hasSupersedingSuccess(provider) {
  for (const key of ['current_run_id', 'latest_successful_run_id', 'authoritative_run_id']) {
    if (own(provider, key) && provider[key] !== provider.run_id) return true;
  }

  if (provider.stale === true || provider.is_current === false || provider.superseded === true) {
    return true;
  }

  const superseding = provider.superseding_successful_run;
  if (superseding && typeof superseding === 'object') {
    const successful = superseding.run_conclusion === 'success' || superseding.conclusion === 'success';
    if (successful && superseding.run_id !== provider.run_id) return true;
  }

  if (own(provider, 'superseded_by_run_id') && provider.superseded_by_run_id !== null) {
    return provider.superseded_by_run_id !== provider.run_id;
  }

  return false;
}

function eventMatches(event, expected) {
  return event !== null && typeof event === 'object' &&
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
 * Assesses evidence and, when appropriate, prepares an unauthorised proposal.
 * This function is pure: it does not append to a ledger or change an environment.
 */
export function assessContinuityReconciliation(evidence) {
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
    return blocked('EVIDENCE_MISSING');
  }

  const {original, approval, installation, provider, settlement, ledger} = evidence;
  for (const [name, receipt] of Object.entries({original, approval, installation, provider, settlement, ledger})) {
    if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
      return blocked(`${name.toUpperCase()}_RECEIPT_MISSING`);
    }
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
      approval.artifact_sha256 !== original.source_content_hash) {
    return blocked('APPROVAL_INVALID_OR_FOREIGN');
  }

  if (!exactOptional(approval, 'goal_id', original.goal_id) ||
      !exactOptional(approval, 'continuity_root_id', original.continuity_root_id) ||
      !exactOptional(approval, 'worldline_id', original.worldline_id)) {
    return blocked('APPROVAL_PROVENANCE_MISMATCH');
  }

  if (installation.original_work_id !== original.original_work_id ||
      installation.artifact_sha256 !== original.source_content_hash ||
      !SHA1_RE.test(installation.installed_commit_sha) ||
      installation.installed_source_verified !== true ||
      installation.production_changed !== false) {
    return blocked('INSTALLATION_RECEIPT_INVALID');
  }

  if (!exactOptional(installation, 'owner_id', original.owner_id) ||
      !exactOptional(installation, 'goal_id', original.goal_id) ||
      !exactOptional(installation, 'continuity_root_id', original.continuity_root_id) ||
      !exactOptional(installation, 'worldline_id', original.worldline_id)) {
    return blocked('INSTALLATION_PROVENANCE_MISMATCH');
  }

  if (provider.repository !== EXPECTED_REPOSITORY ||
      !Number.isSafeInteger(provider.run_id) || provider.run_id <= 0 ||
      provider.run_status !== 'completed' ||
      provider.run_conclusion !== 'success' ||
      provider.original_job_success !== true ||
      provider.independent_provider_readback !== true ||
      !SHA256_RE.test(provider.provider_outcome_digest) ||
      !validProviderSource(provider)) {
    return blocked('PROVIDER_ATTESTATION_INVALID');
  }

  if (!providerShaMatches(provider, installation.installed_commit_sha)) {
    return blocked('PROVIDER_RUN_SHA_MISMATCH');
  }

  if (!exactOptional(provider, 'original_work_id', original.original_work_id) ||
      !exactOptional(provider, 'owner_id', original.owner_id) ||
      !exactOptional(provider, 'goal_id', original.goal_id)) {
    return blocked('PROVIDER_PROVENANCE_MISMATCH');
  }

  if (settlement.status !== 'SETTLED_ISOLATED' ||
      settlement.original_work_id !== original.original_work_id ||
      settlement.original_job_completed !== true ||
      settlement.independent_outcome_verified !== true ||
      settlement.owner_approval_id !== approval.approval_id ||
      settlement.artifact_sha256 !== original.source_content_hash ||
      settlement.installed_commit_sha !== installation.installed_commit_sha ||
      settlement.provider_run_id !== provider.run_id ||
      settlement.provider_outcome_digest !== provider.provider_outcome_digest ||
      settlement.production_changed !== false) {
    return blocked('SETTLEMENT_RECEIPT_INVALID');
  }

  if (!exactOptional(settlement, 'owner_id', original.owner_id) ||
      !exactOptional(settlement, 'goal_id', original.goal_id) ||
      !exactOptional(settlement, 'continuity_root_id', original.continuity_root_id) ||
      !exactOptional(settlement, 'worldline_id', original.worldline_id) ||
      !exactOptional(settlement, 'repository', EXPECTED_REPOSITORY)) {
    return blocked('SETTLEMENT_PROVENANCE_MISMATCH');
  }

  if (ledger.continuity_root_id !== original.continuity_root_id ||
      ledger.worldline_id !== original.worldline_id ||
      ledger.append_only_verified !== true ||
      ledger.head_lineage_hash !== original.original_event_lineage_hash ||
      !Array.isArray(ledger.verified_completion_events)) {
    return blocked('LEDGER_LINEAGE_INVALID');
  }

  const expectedEvent = {
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
        !eventMatches(ledger.verified_completion_events[0], expectedEvent)) {
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

  // Freshness is checked immediately before proposal generation. Provider claims,
  // dashboards, and model assertions cannot bypass this source-bound check.
  if (hasSupersedingSuccess(provider)) {
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
      prior_lineage_hash: ledger.head_lineage_hash,
      artifact_sha256: original.source_content_hash,
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
