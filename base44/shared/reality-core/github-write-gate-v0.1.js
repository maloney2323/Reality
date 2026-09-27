// Reality GitHub Write Gate v0.1
// Narrow authorization boundary for branch + commit + PR only.
// It does NOT authorize merge, deploy, governance changes, or main-branch writes.

import { canonicalJson, randomToken, sha256Hex } from '../action-gate/canonical.js';
import { createDevKeyProvider, KEY_ALGORITHM_ED25519, verifyEd25519Jwk } from '../action-gate/key-provider.js';

export const GITHUB_WRITE_GATE_VERSION = 'reality-github-write-gate-v0.1';
export const GITHUB_WRITE_GATE_AUTHORITY = 'BOUNDED_GITHUB_BRANCH_PR_ONLY';
export const GITHUB_WRITE_CONSEQUENCE = 'CREATE_BRANCH_COMMIT_PR';
export const GITHUB_WRITE_KEY_PURPOSE = 'reality-github-write-gate-v0.1';

export function githubWriteScope({ user_id, candidate_artifact_id, candidate_id, repository, base_ref, changed_paths, candidate_tree_hash }) {
  return {
    user_id,
    candidate_artifact_id,
    candidate_id,
    repository,
    base_ref,
    changed_paths: [...new Set((changed_paths || []).map(String))].sort(),
    candidate_tree_hash,
    consequence: GITHUB_WRITE_CONSEQUENCE,
  };
}

export async function githubWriteScopeDigest(scope) {
  return sha256Hex(canonicalJson(scope));
}

function keyStore(service) {
  return {
    async loadActive() {
      const rows = await service.entities.GateSigningKey.filter(
        { purpose: GITHUB_WRITE_KEY_PURPOSE, status: 'active', algorithm: KEY_ALGORITHM_ED25519 },
        '-created_date', 5, 0,
      );
      return rows?.[0] || null;
    },
    async persist(record) {
      return service.entities.GateSigningKey.create({ ...record, status: 'active', purpose: GITHUB_WRITE_KEY_PURPOSE });
    },
  };
}

export function githubWriteKeyProvider(service) {
  return createDevKeyProvider({ keyStore: keyStore(service), purpose: GITHUB_WRITE_KEY_PURPOSE });
}

export async function issueGithubWriteAuthorization({ service, principal, candidate, repository, baseRef, issuedAt = new Date().toISOString() }) {
  if (!principal?.id || principal.role !== 'admin') throw new Error('admin authorization required');
  if (!candidate?.id || candidate?.artifact_type !== 'CODE_PATCH_CANDIDATE') throw new Error('exact CODE_PATCH_CANDIDATE required');
  const data = candidate.extension_data || {};
  if (candidate.user_id !== principal.id) throw new Error('candidate owner mismatch');
  if (!Array.isArray(data.edits) || data.edits.length === 0) throw new Error('candidate contains no edits');
  if (data.repository !== repository || String(data.base_ref || 'main') !== baseRef) throw new Error('candidate repository/base binding mismatch');

  const changedPaths = data.edits.map((e) => String(e.path)).sort();
  const scope = githubWriteScope({
    user_id: principal.id,
    candidate_artifact_id: candidate.id,
    candidate_id: data.candidate_id,
    repository,
    base_ref: baseRef,
    changed_paths: changedPaths,
    candidate_tree_hash: data.candidate_code_tree_hash,
  });
  const scope_digest = await githubWriteScopeDigest(scope);
  const permit_token = randomToken(32);
  const token_hash = await sha256Hex(permit_token);
  const issued_ms = Date.parse(issuedAt);
  if (!Number.isFinite(issued_ms)) throw new Error('issuedAt must be valid ISO-8601');
  const expires_at = new Date(issued_ms + 5 * 60 * 1000).toISOString();
  const payload = {
    schema: GITHUB_WRITE_GATE_VERSION,
    permit_id: `github-write:${crypto.randomUUID()}`,
    user_id: principal.id,
    candidate_artifact_id: candidate.id,
    candidate_id: data.candidate_id,
    repository,
    base_ref: baseRef,
    changed_paths: changedPaths,
    candidate_tree_hash: data.candidate_code_tree_hash,
    scope_digest,
    consequence: GITHUB_WRITE_CONSEQUENCE,
    token_hash,
    issued_at: new Date(issued_ms).toISOString(),
    expires_at,
    merge_authorized: false,
    deploy_authorized: false,
    governance_change_authorized: false,
    main_write_authorized: false,
  };
  const provider = githubWriteKeyProvider(service);
  const signed = await provider.sign(canonicalJson(payload));
  const created = await service.entities.DerivedArtifact.create({
    user_id: principal.id,
    artifact_group_id: payload.permit_id,
    admission_key: payload.permit_id,
    version: 1,
    supersedes_id: null,
    artifact_type: 'CODE_WRITE_AUTHORIZATION',
    engine: GITHUB_WRITE_GATE_VERSION,
    subject: `GitHub PR write authorization for ${repository}`,
    summary: 'Explicit human authorization for one bounded branch/commit/PR operation.',
    evidence_refs: [candidate.id, data.candidate_id, repository, baseRef],
    assumptions: ['Authorization is limited to the exact candidate scope.'],
    what_would_change_it: ['Candidate bytes change.', 'Repository/base ref changes.', 'Authorization expires or is consumed.'],
    horizon: null,
    as_of: new Date(issued_ms).toISOString(),
    materiality_level: 4,
    materiality_risks: ['CODE_CHANGE', 'CAPABILITY_CHANGE'],
    status: 'ACTIVE',
    outcome_ref: null,
    outcome_resolved: false,
    authority: GITHUB_WRITE_GATE_AUTHORITY,
    produced_at: new Date(issued_ms).toISOString(),
    extension_data: {
      payload_json: canonicalJson(payload),
      signature: signed.signature_b64,
      key_id: signed.key_id,
      algorithm: signed.algorithm,
      public_key_b64: signed.public_key_b64,
      permit_id: payload.permit_id,
      token_hash,
      scope_digest,
      consequence: GITHUB_WRITE_CONSEQUENCE,
      status: 'ISSUED',
      merge_authorized: false,
      deploy_authorized: false,
      governance_change_authorized: false,
      main_write_authorized: false,
      live_repository_write_authorized: true,
    },
  });
  return {
    permit_id: payload.permit_id,
    permit_token,
    authorization_artifact_id: created.id,
    repository,
    base_ref: baseRef,
    changed_paths: changedPaths,
    expires_at,
    merge_authorized: false,
    deploy_authorized: false,
    main_write_authorized: false,
  };
}

export async function consumeGithubWriteAuthorization({ service, authorization, permitToken, candidate, repository, baseRef, now = new Date().toISOString() }) {
  if (!authorization || authorization.artifact_type !== 'CODE_WRITE_AUTHORIZATION') throw new Error('authorization artifact required');
  if (authorization.status !== 'ACTIVE') throw new Error('authorization is not active');
  if (authorization.user_id !== candidate.user_id) throw new Error('authorization owner mismatch');
  const ext = authorization.extension_data || {};
  const payload = JSON.parse(ext.payload_json || '{}');
  if (canonicalJson(payload) !== ext.payload_json) throw new Error('authorization payload not canonical');
  if (payload.repository !== repository || payload.base_ref !== baseRef) throw new Error('authorization repository/base mismatch');
  if (payload.candidate_artifact_id !== candidate.id) throw new Error('authorization candidate mismatch');
  if (payload.consequence !== GITHUB_WRITE_CONSEQUENCE) throw new Error('authorization consequence mismatch');
  if (Date.parse(now) >= Date.parse(payload.expires_at)) throw new Error('authorization expired');
  if (await sha256Hex(permitToken) !== payload.token_hash) throw new Error('authorization token invalid');

  const scope = githubWriteScope({
    user_id: candidate.user_id,
    candidate_artifact_id: candidate.id,
    candidate_id: candidate.extension_data?.candidate_id,
    repository,
    base_ref: baseRef,
    changed_paths: (candidate.extension_data?.edits || []).map((e) => e.path),
    candidate_tree_hash: candidate.extension_data?.candidate_code_tree_hash,
  });
  const digest = await githubWriteScopeDigest(scope);
  if (digest !== payload.scope_digest) throw new Error('authorization scope mismatch');

  const provider = githubWriteKeyProvider(service);
  const keys = await service.entities.GateSigningKey.filter({ key_id: ext.key_id, status:'active', algorithm:KEY_ALGORITHM_ED25519 }, '-created_date', 5, 0);
  if (!keys?.length) throw new Error('authorization signing key unavailable');
  const key = keys[0];
  const payloadJson = ext.payload_json;
  const valid = await provider.verify(key.public_key_b64, payloadJson, ext.signature);
  if (!valid) throw new Error('authorization signature invalid');

  await service.entities.DerivedArtifact.update(authorization.id, {
    status: 'SUPERSEDED',
    extension_data: { ...ext, status: 'CONSUMED', consumed_at: new Date(Date.parse(now)).toISOString() },
  });
  return { consumed: true, permit_id: payload.permit_id, consequence: GITHUB_WRITE_CONSEQUENCE };
}