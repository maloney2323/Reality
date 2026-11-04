const EXPECTED_REPOSITORY = 'maloney2323/Reality';
const SHA40 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const WORK_ID = /^work:[0-9a-f]{32}$/;
const GOAL_ID = /^user-goal:[A-Za-z0-9._:-]+$/;
const PROVIDER_SOURCES = new Set([
  'GITHUB',
  'GITHUB_API',
  'GITHUB_ACTIONS',
  'GITHUB_ACTIONS_API',
  'GITHUB_PROVIDER_API',
  'GITHUB_ACTIONS_PROVIDER_READBACK',
  'INDEPENDENT_PROVIDER_READBACK'
]);

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function has(object, field) {
  return Object.prototype.hasOwnProperty.call(object, field);
}

function blocked(originalWorkId = null, reason = 'EVIDENCE_VALIDATION_FAILED') {
  return {
    status: 'BLOCKED',
    reason,
    original_work_id: typeof originalWorkId === 'string' ? originalWorkId : null,
    universe_settlement_verified: false,
    installation_authorized: false,
    production_changed: false,
    original_job_completed_in_universe: false,
    reconciliation: null
  };
}

function optionalExact(record, field, expected) {
  return !has(record, field) || record[field] === expected;
}

function validProviderSource(provider) {
  if (!has(provider, 'evidence_source') && !has(provider, 'source')) return true;
  const source = provider.evidence_source ?? provider.source;
  return typeof source === 'string' && PROVIDER_SOURCES.has(source);
}

function providerCommitEvidenceMatches(provider, expectedCommit) {
  const fields = [
    'head_sha',
    'run_head_sha',
    'commit_sha',
    'checked_commit_sha',
    'current_run_sha',
    'latest_successful_run_sha'
  ];

  for (const field of fields) {
    if (has(provider, field) &&
        (!SHA40.test(provider[field]) || provider[field] !== expectedCommit)) {
      return false;
    }
  }
  return true;
}

function hasNoSupersedingSuccess(provider) {
  if (provider.superseding_successful_run === true || provider.superseded === true) {
    return false;
  }

  for (const field of ['current_run_id', 'latest_run_id', 'latest_successful_run_id']) {
    if (has(provider, field) && provider[field] !== provider.run_id) return false;
  }

  if (Array.isArray(provider.superseding_runs) && provider.superseding_runs.length > 0) {
    return false;
  }
  return true;
}

function providerOutcomeIsIndependentlySuccessful(provider) {
  if (provider.run_conclusion === 'success') {
    return provider.original_job_success === true;
  }

  if (provider.run_conclusion === 'failure') {
    return provider.original_job_success === true &&
      provider.resume_job_success === true &&
      provider.settlement_job_success === true &&
      provider.unrelated_job_failure_verified === true &&
      SHA256.test(provider.settlement_artifact_digest) &&
      typeof (provider.evidence_source ?? provider.source) === 'string';
  }

  return false;
}

function exactCompletion(event, expected) {
  return isRecord(event) &&
    event.original_work_id === expected.original_work_id &&
    event.owner_id === expected.owner_id &&
    event.continuity_root_id === expected.continuity_root_id &&
    event.worldline_id === expected.worldline_id &&
    event.installed_commit_sha === expected.installed_commit_sha &&
    event.provider_run_id === expected.provider_run_id &&
    event.provider_outcome_digest === expected.provider_outcome_digest &&
    event.epistemic_status === 'VERIFIED' &&
    event.constitutional_phase === 'SETTLED' &&
    event.original_job_completed === true;
}

/**
 * Assesses supplied evidence without writing a ledger, authorizing an append,
 * authorizing installation, or certifying any provider/database readback.
 */
export function assessContinuityReconciliation(evidence) {
  if (!isRecord(evidence)) return blocked();

  const original = evidence.original;
  const approval = evidence.approval;
  const installation = evidence.installation;
  const provider = evidence.provider;
  const settlement = evidence.settlement;
  const ledger = evidence.ledger;
  const candidateWorkId = isRecord(original) ? original.original_work_id : null;

  if (![original, approval, installation, provider, settlement, ledger].every(isRecord)) {
    return blocked(candidateWorkId, 'INCOMPLETE_EVIDENCE');
  }

  if (!UUID.test(original.owner_id) ||
      !GOAL_ID.test(original.goal_id) ||
      !WORK_ID.test(original.original_work_id) ||
      !UUID.test(original.continuity_root_id) ||
      !UUID.test(original.worldline_id) ||
      !UUID.test(original.original_event_id) ||
      original.epistemic_status !== 'VERIFIED' ||
      original.original_job_completed !== false ||
      !SHA256.test(original.source_content_hash) ||
      !SHA256.test(original.original_event_lineage_hash)) {
    return blocked(candidateWorkId, 'INVALID_ORIGINAL_PROVENANCE');
  }

  const owner = original.owner_id;
  const goal = original.goal_id;
  const workId = original.original_work_id;
  const root = original.continuity_root_id;
  const worldline = original.worldline_id;
  const sourceHash = original.source_content_hash;
  const sourceLineage = original.original_event_lineage_hash;

  if (approval.owner_id !== owner ||
      approval.original_work_id !== workId ||
      !optionalExact(approval, 'goal_id', goal) ||
      !UUID.test(approval.approval_id) ||
      approval.source !== 'AUTHENTICATED_OWNER_EXPLICIT_ACTION' ||
      approval.target_environment !== 'ISOLATED_PREVIEW' ||
      approval.consumed_once !== true ||
      !SHA256.test(approval.artifact_sha256)) {
    return blocked(workId, 'INVALID_OR_FOREIGN_APPROVAL');
  }
  const artifactHash = approval.artifact_sha256;

  if (installation.original_work_id !== workId ||
      !optionalExact(installation, 'owner_id', owner) ||
      !optionalExact(installation, 'goal_id', goal) ||
      installation.artifact_sha256 !== artifactHash ||
      !SHA40.test(installation.installed_commit_sha) ||
      installation.installed_source_verified !== true ||
      installation.production_changed !== false) {
    return blocked(workId, 'INVALID_INSTALLATION_RECEIPT');
  }
  const installedCommit = installation.installed_commit_sha;

  if (provider.repository !== EXPECTED_REPOSITORY ||
      !Number.isSafeInteger(provider.run_id) || provider.run_id <= 0 ||
      provider.run_status !== 'completed' ||
      provider.independent_provider_readback !== true ||
      !SHA256.test(provider.provider_outcome_digest) ||
      !validProviderSource(provider) ||
      !optionalExact(provider, 'original_work_id', workId) ||
      !optionalExact(provider, 'owner_id', owner) ||
      !optionalExact(provider, 'goal_id', goal)) {
    return blocked(workId, 'INVALID_PROVIDER_ATTESTATION');
  }

  // Freshness and exact provider commit checks occur before any proposal can
  // be generated. A newer or differently bound run fails closed.
  if (!hasNoSupersedingSuccess(provider) ||
      !providerCommitEvidenceMatches(provider, installedCommit)) {
    return blocked(workId, 'STALE_OR_SUPERSEDED_PROVIDER_EVIDENCE');
  }

  if (!providerOutcomeIsIndependentlySuccessful(provider)) {
    return blocked(workId, 'PROVIDER_JOB_OUTCOME_NOT_VERIFIED');
  }
  const outcomeDigest = provider.provider_outcome_digest;

  if (settlement.status !== 'SETTLED_ISOLATED' ||
      settlement.original_work_id !== workId ||
      !optionalExact(settlement, 'owner_id', owner) ||
      !optionalExact(settlement, 'goal_id', goal) ||
      settlement.original_job_completed !== true ||
      settlement.independent_outcome_verified !== true ||
      settlement.owner_approval_id !== approval.approval_id ||
      settlement.artifact_sha256 !== artifactHash ||
      settlement.installed_commit_sha !== installedCommit ||
      settlement.provider_run_id !== provider.run_id ||
      settlement.provider_outcome_digest !== outcomeDigest ||
      settlement.production_changed !== false) {
    return blocked(workId, 'INVALID_OR_DRIFTED_SETTLEMENT_RECEIPT');
  }

  if (ledger.continuity_root_id !== root ||
      ledger.worldline_id !== worldline ||
      !optionalExact(ledger, 'owner_id', owner) ||
      !optionalExact(ledger, 'goal_id', goal) ||
      !optionalExact(ledger, 'original_work_id', workId) ||
      ledger.append_only_verified !== true ||
      !SHA256.test(ledger.head_lineage_hash) ||
      !Array.isArray(ledger.verified_completion_events)) {
    return blocked(workId, 'INVALID_LEDGER_PROVENANCE');
  }

  const ledgerTip = ledger.head_lineage_hash;
  const sourceIsCurrentTip = ledgerTip === sourceLineage;
  if (!sourceIsCurrentTip && ledger.original_event_in_chain_verified !== true) {
    return blocked(workId, 'SOURCE_ANCESTRY_NOT_VERIFIED');
  }

  const expectedCompletion = {
    original_work_id: workId,
    owner_id: owner,
    continuity_root_id: root,
    worldline_id: worldline,
    installed_commit_sha: installedCommit,
    provider_run_id: provider.run_id,
    provider_outcome_digest: outcomeDigest
  };

  // Existing success and contradictory completion records are resolved before
  // creation of a new non-authorizing proposal.
  if (ledger.verified_completion_events.length !== 0) {
    if (ledger.verified_completion_events.length === 1 &&
        exactCompletion(ledger.verified_completion_events[0], expectedCompletion)) {
      return {
        status: 'ALREADY_RECONCILED',
        original_work_id: workId,
        universe_settlement_verified: true,
        installation_authorized: false,
        production_changed: false,
        original_job_completed_in_universe: true,
        reconciliation: null
      };
    }
    return blocked(workId, 'DUPLICATE_OR_CONTRADICTORY_COMPLETION');
  }

  return {
    status: 'RECONCILIATION_REQUIRED',
    original_work_id: workId,
    universe_settlement_verified: false,
    installation_authorized: false,
    production_changed: false,
    original_job_completed_in_universe: false,
    reconciliation: {
      status: 'PROPOSED_NOT_APPENDED',
      original_work_id: workId,
      owner_id: owner,
      goal_id: goal,
      continuity_root_id: root,
      worldline_id: worldline,
      source_event_id: original.original_event_id,
      source_content_hash: sourceHash,
      source_event_lineage_hash: sourceLineage,
      artifact_sha256: artifactHash,
      prior_lineage_hash: ledgerTip,
      previous_lineage_hash: ledgerTip,
      installed_commit_sha: installedCommit,
      provider_repository: EXPECTED_REPOSITORY,
      provider_run_id: provider.run_id,
      provider_outcome_digest: outcomeDigest,
      owner_approval_id: approval.approval_id,
      epistemic_status: 'PROPOSED',
      append_authorized: false,
      production_changed: false
    }
  };
}

export default assessContinuityReconciliation;
