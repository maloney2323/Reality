// Reality Source Write Bridge v0.1
//
// Bounded handoff between Reality's governed code-change pipeline and an
// external source-of-record writer (for example Base44's cloud development
// sandbox). The deployed Reality runtime does not receive a filesystem
// primitive. This contract therefore records exactly WHAT may be written and
// proves that the write request is bound to an already-authorized candidate.
//
// The bridge never grants authority. It consumes an existing CODE_WRITE_AUTHORIZATION
// artifact and produces a single-use write envelope. The external writer must
// independently verify the envelope before applying bytes.
//
// Authority: HANDOFF_ONLY. Merge/deploy/governance authority remains false.

import { canonicalJson, sha256Hex } from '../action-gate/canonical.js';

export const SOURCE_WRITE_BRIDGE_VERSION = 'reality-source-write-bridge-v0.1';
export const SOURCE_WRITE_BRIDGE_AUTHORITY = 'SOURCE_WRITE_HANDOFF_ONLY';
export const SOURCE_WRITE_CONSEQUENCE = 'WRITE_EXACT_AUTHORIZED_SOURCE_BYTES';

const ALLOWED_TARGETS = new Set(['BASE44_SOURCE_OF_RECORD']);

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function assertNoAuthority(value) {
  if (value !== false) throw new Error('source-write bridge authority flags must be false');
}

export async function buildSourceWriteEnvelope({
  authorization,
  candidate,
  target = 'BASE44_SOURCE_OF_RECORD',
  issuedAt = new Date().toISOString(),
  envelopeId = `source-write:${crypto.randomUUID()}`,
} = {}) {
  if (!authorization || typeof authorization !== 'object') throw new Error('CODE_WRITE_AUTHORIZATION required');
  if (authorization.artifact_type !== 'CODE_WRITE_AUTHORIZATION') throw new Error('exact CODE_WRITE_AUTHORIZATION required');
  if (authorization.status !== 'CANDIDATE') throw new Error('active CODE_WRITE_AUTHORIZATION required');
  if (!candidate || typeof candidate !== 'object') throw new Error('CODE_PATCH_CANDIDATE required');
  if (candidate.artifact_type && candidate.artifact_type !== 'CODE_PATCH_CANDIDATE') throw new Error('candidate artifact type invalid');
  if (!nonEmpty(candidate.candidate_id)) throw new Error('candidate_id required');
  if (!nonEmpty(authorization.candidate_id)) throw new Error('authorization candidate binding required');
  if (authorization.candidate_id !== candidate.candidate_id) throw new Error('authorization/candidate mismatch');
  if (!nonEmpty(authorization.scope_digest)) throw new Error('authorization scope digest required');
  if (!nonEmpty(authorization.repository)) throw new Error('authorization repository required');
  if (!nonEmpty(authorization.base_ref)) throw new Error('authorization base_ref required');
  if (!Array.isArray(candidate.edits) || candidate.edits.length === 0) throw new Error('candidate edits required');
  if (!Array.isArray(authorization.changed_paths) || authorization.changed_paths.length === 0) throw new Error('authorization changed_paths required');

  const candidatePaths = candidate.edits.map((edit) => edit.path).sort();
  const authorizedPaths = [...new Set(authorization.changed_paths)].sort();
  if (JSON.stringify(candidatePaths) !== JSON.stringify(authorizedPaths)) {
    throw new Error('candidate paths do not exactly match authorization scope');
  }

  for (const edit of candidate.edits) {
    if (!nonEmpty(edit.path) || edit.path.includes('..') || edit.path.startsWith('/') || edit.path.includes('\\')) {
      throw new Error(`forbidden source path: ${edit.path || '(missing)'}`);
    }
    if (typeof edit.replacement_content !== 'string' || !nonEmpty(edit.candidate_sha256)) {
      throw new Error(`exact replacement bytes/hash required: ${edit.path}`);
    }
    const actualHash = await sha256Hex(edit.replacement_content);
    if (actualHash !== edit.candidate_sha256) throw new Error(`replacement hash mismatch: ${edit.path}`);
  }

  if (!ALLOWED_TARGETS.has(target)) throw new Error('unsupported source-write target');

  assertNoAuthority(authorization.merge_authorized);
  assertNoAuthority(authorization.deploy_authorized);
  assertNoAuthority(authorization.governance_change_authorized);
  assertNoAuthority(authorization.action_authorized);

  const body = {
    version: SOURCE_WRITE_BRIDGE_VERSION,
    authority: SOURCE_WRITE_BRIDGE_AUTHORITY,
    consequence: SOURCE_WRITE_CONSEQUENCE,
    envelope_id: envelopeId,
    candidate_artifact_id: candidate.id || null,
    candidate_id: candidate.candidate_id,
    authorization_artifact_id: authorization.id || null,
    authorization_scope_digest: authorization.scope_digest,
    target,
    repository: authorization.repository,
    base_ref: authorization.base_ref,
    changed_paths: authorizedPaths,
    candidate_tree_hash: candidate.candidate_code_tree_hash || null,
    issued_at: new Date(issuedAt).toISOString(),
    edits: candidate.edits.map((edit) => ({
      path: edit.path,
      candidate_sha256: edit.candidate_sha256,
      replacement_content: edit.replacement_content,
    })),
    authority_flags: {
      source_write_authorized_by_envelope: false,
      merge_authorized: false,
      deploy_authorized: false,
      governance_change_authorized: false,
      action_authorized: false,
    },
  };

  return Object.freeze({
    ...body,
    canonical_digest: await sha256Hex(canonicalJson(body)),
  });
}

export async function verifySourceWriteEnvelope(envelope) {
  if (!envelope || envelope.version !== SOURCE_WRITE_BRIDGE_VERSION) return false;
  if (envelope.authority !== SOURCE_WRITE_BRIDGE_AUTHORITY) return false;
  if (envelope.consequence !== SOURCE_WRITE_CONSEQUENCE) return false;
  if (!ALLOWED_TARGETS.has(envelope.target)) return false;
  if (!nonEmpty(envelope.candidate_id) || !nonEmpty(envelope.authorization_scope_digest)) return false;
  if (!Array.isArray(envelope.changed_paths) || !Array.isArray(envelope.edits)) return false;
  if (envelope.authority_flags?.source_write_authorized_by_envelope !== false) return false;
  if (envelope.authority_flags?.merge_authorized !== false) return false;
  if (envelope.authority_flags?.deploy_authorized !== false) return false;
  if (envelope.authority_flags?.governance_change_authorized !== false) return false;
  if (envelope.authority_flags?.action_authorized !== false) return false;

  const body = { ...envelope };
  delete body.canonical_digest;
  if (await sha256Hex(canonicalJson(body)) !== envelope.canonical_digest) return false;

  const paths = envelope.edits.map((edit) => edit.path).sort();
  const declared = [...new Set(envelope.changed_paths)].sort();
  if (JSON.stringify(paths) !== JSON.stringify(declared)) return false;

  for (const edit of envelope.edits) {
    if (!nonEmpty(edit.path) || typeof edit.replacement_content !== 'string') return false;
    if (await sha256Hex(edit.replacement_content) !== edit.candidate_sha256) return false;
  }
  return true;
}