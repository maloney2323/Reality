import { canonicalJson, sha256Hex } from '../action-gate/canonical.js';

export const REALITY_WORKDAY_AUTHORITY_VERSION = 'reality-workday-authority-envelope-v0.1';

export const WORKDAY_CAPABILITIES = Object.freeze([
  'OBSERVE',
  'RESEARCH',
  'ANALYZE',
  'PREPARE',
  'CREATE',
  'EDIT',
  'COMMUNICATE',
  'EXECUTE',
  'MERGE',
  'DEPLOY',
  'DELETE',
  'FINANCIAL',
  'PERMISSIONS',
  'GOVERNANCE'
]);

export function normalizeAuthorityEnvelope(input = {}) {
  const requested = Array.isArray(input.capabilities) ? input.capabilities : [];
  const capabilities = [...new Set(requested)].sort();
  const unknown = capabilities.filter((capability) => !WORKDAY_CAPABILITIES.includes(capability));
  if (unknown.length) throw new Error(`unknown workday capabilities: ${unknown.join(',')}`);

  return {
    schema_version: REALITY_WORKDAY_AUTHORITY_VERSION,
    subject_id: input.subject_id || null,
    workday_id: input.workday_id || null,
    capabilities,
    denied_capabilities: WORKDAY_CAPABILITIES.filter((capability) => !capabilities.includes(capability)),
    scope: input.scope || null,
    expires_at: input.expires_at || null,
    human_authorized: input.human_authorized === true
  };
}

export function authorityAllows(envelope, capability) {
  return Boolean(
    envelope &&
    envelope.human_authorized === true &&
    Array.isArray(envelope.capabilities) &&
    envelope.capabilities.includes(capability)
  );
}

export async function digestAuthorityEnvelope(envelope) {
  return sha256Hex(canonicalJson(envelope));
}

export function assertAuthorityBoundary(envelope, capability) {
  if (!WORKDAY_CAPABILITIES.includes(capability)) {
    throw new Error(`unknown workday capability: ${capability}`);
  }
  if (!authorityAllows(envelope, capability)) {
    throw new Error(`WORKDAY_AUTHORITY_DENIED:${capability}`);
  }
  return true;
}
