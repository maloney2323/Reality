import crypto from 'node:crypto';
import { createUniversePostgresPersistence } from './reality-universe-postgres-persistence-v0.1.js';
import { buildAuthorizationRequest, authorize } from './reality-governed-work-runtime-v0.1.js';

export const REALITY_AUTHORITY_VERSION = 'reality-authority-v1.0';

const ROOT = uuid('continuity_root', 'reality:customer-authority');
const WORLDLINE = uuid('worldline', 'reality:customer-authority:v1');

function uuid(prefix, value) {
  const hex = crypto.createHash('sha256').update(JSON.stringify([prefix, value])).digest('hex').slice(0, 32).split('');
  hex[12] = '5';
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const s = hex.join('');
  return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20,32)}`;
}

function id(prefix, value) { return uuid(prefix, value); }
function list(v) { return Array.isArray(v) ? v : []; }

export function createAuthorityPolicy({
  principalId, mode = 'manual', scopes = [], expiresAt = null, enabled = true, approvedBy = null
} = {}) {
  if (!principalId) throw new Error('AUTHORITY_PRINCIPAL_REQUIRED');
  if (!['manual','auto'].includes(mode)) throw new Error('AUTHORITY_MODE_INVALID');
  if (mode === 'auto' && !list(scopes).length) throw new Error('AUTO_AUTHORITY_SCOPE_REQUIRED');
  return Object.freeze({
    authority_version: REALITY_AUTHORITY_VERSION,
    policy_id: id('authority_policy', [principalId, mode, scopes, expiresAt]),
    principal_id: principalId,
    mode,
    enabled: enabled === true,
    scopes: list(scopes).map(s => Object.freeze({
      connector: s.connector,
      operation: s.operation,
      resource: s.resource || null,
      work_item_id: s.work_item_id || null,
    })),
    expires_at: expiresAt,
    approved_by: approvedBy || principalId,
    created_at: new Date().toISOString(),
  });
}

export function scopeMatches(policy, workItem) {
  if (!policy?.enabled || policy.mode !== 'auto') return false;
  if (policy.expires_at && new Date(policy.expires_at).getTime() <= Date.now()) return false;
  return policy.scopes.some(s =>
    s.connector === workItem.connector &&
    s.operation === workItem.operation &&
    (!s.work_item_id || s.work_item_id === workItem.work_item_id) &&
    (!s.resource || s.resource === workItem.resource || s.resource === workItem.inputs?.resource || s.resource === workItem.inputs?.repository)
  );
}

export function autoAuthorize({ policy, workItem }) {
  if (!scopeMatches(policy, workItem)) return null;
  const request = buildAuthorizationRequest({
    workflow: { workflow_id: workItem.workflow_id },
    preflight: { workflow_id: workItem.workflow_id, status: 'READY_FOR_AUTHORIZATION' },
    principal: policy.principal_id,
    scope: [{
      connector: workItem.connector,
      operation: workItem.operation,
      ...(workItem.resource ? { resource: workItem.resource } : {}),
      ...(workItem.work_item_id ? { work_item_id: workItem.work_item_id } : {}),
    }],
    expiresAt: policy.expires_at,
  });
  return authorize({
    request,
    approvedBy: policy.approved_by || policy.principal_id,
    scope: request.allowed_operations,
  });
}

export async function saveAuthorityPolicy(policy, persistence = createUniversePostgresPersistence()) {
  const now = new Date().toISOString();
  await persistence.appendEvent({
    event_id: id('authority_event', [policy.policy_id, now]),
    event_kind: 'governance',
    entity_type: 'customer_authority_policy',
    entity_id: policy.policy_id,
    continuity_root_id: ROOT,
    worldline_id: WORLDLINE,
    parent_event_id: null,
    effective_time: now,
    assertion_time: now,
    epistemic_status: 'AUTHORIZED',
    payload: policy,
    evidence_refs: [],
    provenance: { source: REALITY_AUTHORITY_VERSION, principal_id: policy.principal_id },
  });
  return policy;
}

export async function getAuthorityPolicy(principalId, persistence = createUniversePostgresPersistence()) {
  const events = await persistence.reconstruct({ continuityRootId: ROOT, worldlineId: WORLDLINE });
  const rows = events
    .filter(e => e.entity_type === 'customer_authority_policy' && e.payload?.principal_id === principalId)
    .sort((a,b) => String(a.assertion_time).localeCompare(String(b.assertion_time)));
  return rows.at(-1)?.payload || null;
}
