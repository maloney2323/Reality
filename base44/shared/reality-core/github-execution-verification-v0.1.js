// Reality GitHub Execution Verification v0.1
//
// Post-condition verifier for the G1 GitHub executor boundary.
// This module does not perform GitHub mutations. It verifies that an observed
// repository state corresponds to the exact execution request.
//
// G4 rule:
//   A GitHub write is not COMPLETE merely because the provider returned 2xx.
//   The executor must observe the resulting branch/commit/PR state and bind
//   the execution receipt to the exact request and resulting state.

import { canonicalJson, sha256Hex } from '../action-gate/canonical.js';

export const GITHUB_EXECUTION_VERIFICATION_VERSION =
  'reality-github-execution-verification-v0.1';

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function clone(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(clone);
  const out = {};
  for (const key of Object.keys(value)) out[key] = clone(value[key]);
  return out;
}

export async function digestObservedGithubState(state = {}) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    throw new Error('observed GitHub state must be an object');
  }
  return sha256Hex(canonicalJson(state));
}

export async function verifyGithubExecutionOutcome({
  request,
  observed,
} = {}) {
  const failures = [];

  if (!request || request.schema_version !== 'reality-executor-v0.1') {
    failures.push('EXECUTION_REQUEST_SCHEMA_INVALID');
  }

  if (!observed || typeof observed !== 'object' || Array.isArray(observed)) {
    failures.push('OBSERVED_GITHUB_STATE_MISSING');
  }

  if (failures.length) {
    return Object.freeze({
      schema: GITHUB_EXECUTION_VERIFICATION_VERSION,
      verified: false,
      verification_status: 'UNVERIFIED',
      failures,
    });
  }

  if (!nonEmpty(observed.repository) || observed.repository !== request.target?.repository) {
    failures.push('REPOSITORY_TARGET_MISMATCH');
  }

  if (!nonEmpty(observed.base_ref) || observed.base_ref !== request.target?.base_ref) {
    failures.push('BASE_REF_MISMATCH');
  }

  if (!nonEmpty(observed.branch)) failures.push('RESULTING_BRANCH_MISSING');
  if (!nonEmpty(observed.commit_sha)) failures.push('RESULTING_COMMIT_MISSING');
  if (!nonEmpty(observed.pull_request_url)) failures.push('PULL_REQUEST_MISSING');

  const expectedPaths = Array.isArray(request.target?.changed_paths)
    ? [...new Set(request.target.changed_paths.map(String).sort())]
    : [];
  const observedPaths = Array.isArray(observed.changed_paths)
    ? [...new Set(observed.changed_paths.map(String).sort())]
    : [];

  if (canonicalJson(expectedPaths) !== canonicalJson(observedPaths)) {
    failures.push('CHANGED_PATHS_MISMATCH');
  }

  if (nonEmpty(request.target?.expected_commit_sha) &&
      request.target.expected_commit_sha !== observed.commit_sha) {
    failures.push('COMMIT_SHA_MISMATCH');
  }

  const observed_state_digest = await digestObservedGithubState({
    repository: observed.repository,
    base_ref: observed.base_ref,
    branch: observed.branch,
    commit_sha: observed.commit_sha,
    pull_request_url: observed.pull_request_url,
    pull_request_number: observed.pull_request_number ?? null,
    changed_paths: observedPaths,
  });

  if (failures.length) {
    return Object.freeze({
      schema: GITHUB_EXECUTION_VERIFICATION_VERSION,
      verified: false,
      verification_status: 'UNVERIFIED',
      failures,
      observed_state_digest,
      receipt_eligible: false,
    });
  }

  return Object.freeze({
    schema: GITHUB_EXECUTION_VERIFICATION_VERSION,
    verified: true,
    verification_status: 'VERIFIED',
    failures: [],
    observed_state_digest,
    receipt_eligible: true,
    observed: clone({
      repository: observed.repository,
      base_ref: observed.base_ref,
      branch: observed.branch,
      commit_sha: observed.commit_sha,
      pull_request_url: observed.pull_request_url,
      pull_request_number: observed.pull_request_number ?? null,
      changed_paths: observedPaths,
    }),
  });
}
