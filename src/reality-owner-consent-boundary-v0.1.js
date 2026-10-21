import { createHash, createPublicKey, verify as verifySignature } from 'node:crypto';

export const OWNER_CONSENT_SCHEMA = 'reality-owner-scoped-consent-v0.1';
export const SANDBOX_CONSENT_SCOPE = 'AUTHORIZE_ISOLATED_SANDBOX_ONLY';
export const MAX_OWNER_CONSENT_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const HASH_RE = /^[0-9a-f]{64}$/i;
const isText = (v) => typeof v === 'string' && v.trim().length > 0;
const sha = (v) => createHash('sha256').update(v).digest('hex');

// Only these fields are signed, in fixed order. The trusted caller supplies
// every expected binding. No model output can introduce a signing key.
export function canonicalOwnerConsentMessage(approval) {
  return JSON.stringify({
    schema: OWNER_CONSENT_SCHEMA,
    owner_id: approval?.owner_id ?? null,
    purpose: approval?.purpose ?? null,
    subject_ref: approval?.subject_ref ?? null,
    original_task_ref: approval?.original_task_ref ?? null,
    governance_kernel_ref: approval?.governance_kernel_ref ?? null,
    consent_ref: approval?.consent_ref ?? null,
    issued_at: approval?.issued_at ?? null,
    expires_at: approval?.expires_at ?? null,
    nonce: approval?.nonce ?? null,
  });
}

// Returns proof of signature validation, NOT permission to mutate state.
export function verifyOwnerConsent(approval, {
  purpose, subjectRef, consentRef,
  originalTaskRef = null, governanceKernelRef = null,
  now = Date.now(),
  trustedPublicKey = process.env.REALITY_OWNER_PROMOTION_PUBLIC_KEY,
} = {}) {
  if (!approval || approval.schema !== OWNER_CONSENT_SCHEMA ||
      !isText(purpose) || !isText(subjectRef) || !isText(consentRef) ||
      !isText(approval.owner_id) || !isText(approval.nonce) ||
      approval.purpose !== purpose ||
      approval.subject_ref !== subjectRef ||
      approval.consent_ref !== consentRef ||
      approval.original_task_ref !== originalTaskRef ||
      approval.governance_kernel_ref !== governanceKernelRef) {
    throw new Error('OWNER_CONSENT_SCOPE_MISMATCH');
  }
  const issued = Date.parse(approval.issued_at);
  const expires = Date.parse(approval.expires_at);
  if (!Number.isFinite(issued) || !Number.isFinite(expires) ||
      !Number.isFinite(now) || issued > now || expires <= now ||
      expires <= issued || expires - issued > MAX_OWNER_CONSENT_AGE_MS) {
    throw new Error('OWNER_CONSENT_EXPIRED_OR_INVALID');
  }
  if (!isText(trustedPublicKey) || !isText(approval.signature)) {
    throw new Error('OWNER_CONSENT_TRUSTED_KEY_REQUIRED');
  }
  let genuine = false;
  try {
    const signature = Buffer.from(approval.signature, 'base64');
    genuine = signature.length === 64 && verifySignature(
      null, Buffer.from(canonicalOwnerConsentMessage(approval)),
      createPublicKey(trustedPublicKey), signature);
  } catch { genuine = false; }
  if (!genuine) throw new Error('OWNER_CONSENT_SIGNATURE_INVALID');
  const payload = canonicalOwnerConsentMessage(approval);
  return Object.freeze({
    valid: true,
    owner_id: approval.owner_id,
    purpose, subject_ref: subjectRef, consent_ref: consentRef,
    nonce: approval.nonce,
    binding_sha256: sha(payload),
    // Never confuse verification with a one-time authorization consumed at
    // the trusted execution boundary.
    authorization_consumed: false,
    execution_permitted: false,
  });
}

// The consumed record MUST be created by an atomic durable store; this
// function never falls back to an in-memory Map, fake boolean, or model output.
// Calls are sandbox-testable with an injected store; not a production adapter.
export async function consumeOwnerConsentOnce({
  approval, expected, approvalStore, now = Date.now(),
} = {}) {
  const verified = verifyOwnerConsent(approval, { ...expected, now });
  if (!approvalStore ||
      approvalStore.kind !== 'TRUSTED_DURABLE_OWNER_APPROVAL_STORE' ||
      typeof approvalStore.consumeOnce !== 'function') {
    throw new Error('DURABLE_APPROVAL_STORE_REQUIRED');
  }
  const key = 'owner-consent:' + sha(JSON.stringify([
    verified.owner_id, verified.purpose, verified.nonce,
  ]));
  const receipt = await approvalStore.consumeOnce({
    key,
    binding_sha256: verified.binding_sha256,
    owner_id: verified.owner_id,
    purpose: verified.purpose,
    subject_ref: verified.subject_ref,
    consent_ref: verified.consent_ref,
    expires_at: approval.expires_at,
  });
  if (receipt?.key !== key ||
      receipt?.binding_sha256 !== verified.binding_sha256 ||
      receipt?.durable !== true ||
      receipt?.atomic !== true ||
      receipt?.consumed !== true ||
      receipt?.already_used === true ||
      !isText(receipt?.record_ref)) {
    throw new Error('OWNER_CONSENT_NOT_ATOMICALLY_CONSUMED');
  }
  return Object.freeze({
    owner_id: verified.owner_id,
    purpose: verified.purpose,
    subject_ref: verified.subject_ref,
    consent_ref: verified.consent_ref,
    binding_sha256: verified.binding_sha256,
    consumption_record_ref: receipt.record_ref,
    owner_approval_consumed: true,
    // Consumption permits exactly one separately governed operation.
    // It is not evidence an external effect happened or succeeded.
    operation_completed: false,
    external_outcome_verified: false,
  });
}
