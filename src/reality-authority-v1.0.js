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

// Exact work-item approval is an immutable fingerprint of the server's
// intended target, operation and inputs. A model must not reuse an approved
// work_item_id to execute changed instructions or a different destination.
function canonical(value){
  if(value===null||typeof value!=='object')return value;
  if(Array.isArray(value))return value.map(canonical);
  return Object.fromEntries(Object.keys(value).sort()
    .map(key=>[key,canonical(value[key])]));
}
export function fingerprintApprovedWorkItem(item){
  if(!item||typeof item!=='object'||Array.isArray(item)||
     typeof item.work_item_id!=='string'||!item.work_item_id||
     typeof item.workflow_id!=='string'||!item.workflow_id||
     typeof item.connector!=='string'||!item.connector||
     typeof item.operation!=='string'||!item.operation)
    throw Error('ACTION_APPROVAL_EXACT_WORK_ITEM_REQUIRED');
  const bound={
    work_item_id:item.work_item_id,workflow_id:item.workflow_id,
    connector:item.connector,operation:item.operation,
    action:item.action??null,inputs:item.inputs??null,
    resource:item.resource??null,
    consequential:item.consequential===true,
  };
  return 'sha256:'+crypto.createHash('sha256')
    .update(JSON.stringify(canonical(bound))).digest('hex');
}

export function createAuthorityPolicy({
  principalId, mode = 'manual', scopes = [], expiresAt = null, enabled = true, approvedBy = null
} = {}) {
  if (!principalId) throw new Error('AUTHORITY_PRINCIPAL_REQUIRED');
  if (!['manual','auto'].includes(mode)) throw new Error('AUTHORITY_MODE_INVALID');
  if (mode === 'auto' && (!list(scopes).length||
    scopes.some(s=>!s?.work_item_id||
      !/^sha256:[0-9a-f]{64}$/.test(s.work_item_fingerprint||''))))
    throw new Error('AUTO_AUTHORITY_EXACT_WORK_ITEM_AND_FINGERPRINT_REQUIRED');
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
      work_item_fingerprint:s.work_item_fingerprint||null,
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
    s.work_item_id === workItem.work_item_id &&
    s.work_item_fingerprint === fingerprintApprovedWorkItem(workItem) &&
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

// Server-minted, short-lived work approval proof, verifiable by the generic
// executor even when it is invoked without the HTTP handler. It grants ONLY
// a specific approved work-item digest. It is NOT an authorization to change
// user goals, nor proof of business-outcome success.
const BOUND_WORK_PROOF_VERSION='reality-bound-work-approval-v0.1';
const secret=()=>{
 const s=process.env.REALITY_CHAT_RECEIPT_HMAC_KEY;
 if(typeof s!=='string'||s.length<32)
  throw Error('WORK_APPROVAL_SERVER_SECRET_NOT_CONFIGURED');
 return s;
};
const mac=unsigned=>crypto.createHmac('sha256',secret())
 .update('reality:server-persisted-work-approval:v1:'+
   JSON.stringify(canonical(unsigned))).digest('hex');
export function issueBoundExecutionApproval({
 policy,workItem,authorization,principalId,issuedAt=new Date().toISOString(),
}={}){
 if(!policy||policy.principal_id!==principalId||!scopeMatches(policy,workItem)||
    !authorization?.authorized||
    authorization.workflow_id!==workItem.workflow_id||
    !authorization.authorization_id||
    authorization.principal!==principalId||
    !(authorization.allowed_operations||[]).some(x=>
      x.connector===workItem.connector&&x.operation===workItem.operation&&
      x.work_item_id===workItem.work_item_id))
  throw Error('WORK_APPROVAL_PERSISTED_SCOPE_REQUIRED');
 const issued=Date.parse(issuedAt);
 if(!Number.isFinite(issued)||Math.abs(Date.now()-issued)>30000)
  throw Error('WORK_APPROVAL_ISSUE_TIME_INVALID');
 const deadline=Math.min(issued+60000,
  policy.expires_at?Date.parse(policy.expires_at):Number.POSITIVE_INFINITY);
 if(!Number.isFinite(deadline)||deadline<=issued)
  throw Error('WORK_APPROVAL_POLICY_EXPIRED');
 const data={
  version:BOUND_WORK_PROOF_VERSION,
  policy_id:policy.policy_id,principal_id:principalId,
  authorization_id:authorization.authorization_id,
  workflow_id:workItem.workflow_id,work_item_id:workItem.work_item_id,
  fingerprint:fingerprintApprovedWorkItem(workItem),
  issued_at:new Date(issued).toISOString(),
  expires_at:new Date(deadline).toISOString(),
  grants_user_goal_mutation:false,
  external_execution_bound_to_this_work_item_only:true,
 };
 return Object.freeze({...data,server_signature:mac(data)});
}
export function verifyBoundExecutionApproval({proof,workItem,authorization}={}){
 if(!proof||proof.version!==BOUND_WORK_PROOF_VERSION||
    typeof proof.server_signature!=='string'||!/^([0-9a-f]{64})$/.test(proof.server_signature))
  return Object.freeze({valid:false,reason:'SERVER_WORK_APPROVAL_PROOF_MISSING'});
 const {server_signature,...data}=proof;
 const supplied=Buffer.from(server_signature,'hex'),expected=Buffer.from(mac(data),'hex');
 if(!crypto.timingSafeEqual(supplied,expected))
  return Object.freeze({valid:false,reason:'SERVER_WORK_APPROVAL_SIGNATURE_INVALID'});
 const expires=Date.parse(data.expires_at),issued=Date.parse(data.issued_at);
 if(!Number.isFinite(expires)||!Number.isFinite(issued)||
    issued>Date.now()+30000||expires<Date.now()||
    expires-issued>60000||expires<=issued)
  return Object.freeze({valid:false,reason:'SERVER_WORK_APPROVAL_EXPIRED'});
 const bound=Boolean(authorization?.authorized===true&&
  data.authorization_id===authorization.authorization_id&&
  data.workflow_id===workItem?.workflow_id&&
  data.work_item_id===workItem?.work_item_id&&
  data.fingerprint===fingerprintApprovedWorkItem(workItem)&&
  data.grants_user_goal_mutation===false&&
  data.external_execution_bound_to_this_work_item_only===true);
 return Object.freeze({valid:bound,reason:bound?null:'SERVER_WORK_APPROVAL_SCOPE_MISMATCH',
  policy_id:data.policy_id,
  fingerprint:data.fingerprint,
  goal_mutation_authorized:false});
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
