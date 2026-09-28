// Reality Governed Signal Integrity v0.1
//
// Purpose: mandatory ingress boundary for requests that may resolve to a
// governed capability. This layer interprets operational intent; it NEVER
// grants authority and NEVER executes a capability.
//
// The existing Fragmented Signal Cleaner remains the evidence canonicalization
// layer. This module is deliberately separate: it produces a governance claim
// about an incoming request, then fuses that claim with other interpretation
// claims without voting away disagreement.

export const GOVERNED_SIGNAL_INTEGRITY_VERSION = 'reality-governed-signal-integrity-v0.1';
export const GOVERNED_SIGNAL_AUTHORITY = 'SIGNAL_INTERPRETATION_ONLY';

const OPERATION_CLASSES = new Set(['READ_ONLY', 'CONSEQUENTIAL', 'UNKNOWN']);
const STATUS = Object.freeze({ AGREE: 'AGREE', CONFLICT: 'CONFLICT', UNKNOWN: 'UNKNOWN' });

function text(value, max = 2000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function hasAny(value, terms) {
  return terms.some((term) => value.includes(term));
}

function normalizeRepository(value) {
  const raw = text(value, 200);
  if (!raw) return null;
  const cleaned = raw.replace(/^repository[:\s]*/i, '').replace(/^repo[:\s]*/i, '').trim();
  if (!cleaned) return null;
  return cleaned;
}

// Deterministic governance interpretation. This is intentionally conservative:
// it may identify a candidate capability, but ambiguity is preserved rather
// than guessed through to execution.
export function cleanGovernanceSignal({ message, original_input_ref = null }) {
  const original = text(message, 36_000);
  if (!original) throw new Error('governance signal cleaner requires non-empty message');
  const lower = original.toLowerCase();

  const inspectionLanguage = hasAny(lower, [
    'system integrity',
    'self-inspection',
    'governed inspection',
    'repository enforcement',
    'inspect the repo',
    'inspect repository',
  ]);
  const executionLanguage = hasAny(lower, [
    'run', 'execute', 'perform', 'inspect', 'check', 'verify', 'audit',
  ]);
  const writeLanguage = hasAny(lower, [
    'write', 'edit', 'modify', 'change', 'fix', 'merge', 'deploy', 'delete',
  ]);

  const repositoryMatch = lower.match(/(?:repository|repo)[:\s]+([a-z0-9_.-]+\/[a-z0-9_.-]+|[a-z0-9_.-]+)/i);
  const explicitTake = /\btake\b/i.test(original);
  const target = normalizeRepository(repositoryMatch?.[1]) || (explicitTake ? 'maloney2323/TAKE' : null);
  const master = /\bmaster\b/i.test(original);

  let signalType = 'UNKNOWN_REQUEST';
  let requestedAction = 'UNKNOWN';
  let operationClass = 'UNKNOWN';
  let ambiguity = [];

  if (inspectionLanguage && executionLanguage) {
    signalType = 'REQUESTED_SYSTEM_INTEGRITY_INSPECTION';
    requestedAction = 'READ_ONLY_INSPECTION';
    operationClass = writeLanguage ? 'UNKNOWN' : 'READ_ONLY';
    if (!target) ambiguity.push('TARGET_REPOSITORY_MISSING');
  } else if (writeLanguage) {
    signalType = 'POTENTIAL_REPOSITORY_CHANGE_REQUEST';
    requestedAction = 'UNKNOWN_CHANGE_OPERATION';
    operationClass = 'CONSEQUENTIAL';
  } else {
    ambiguity.push('CAPABILITY_NOT_DETERMINED');
  }

  if (operationClass === 'READ_ONLY' && writeLanguage) ambiguity.push('READ_WRITE_INTENT_CONFLICT');
  if (master && !target) ambiguity.push('REF_WITHOUT_TARGET');

  const confidence = ambiguity.length === 0 ? 0.9 : 0.4;
  return Object.freeze({
    record_version: GOVERNED_SIGNAL_INTEGRITY_VERSION,
    source: 'governance_cleaner',
    signal_type: signalType,
    requested_action: requestedAction,
    operation_class: OPERATION_CLASSES.has(operationClass) ? operationClass : 'UNKNOWN',
    target: Object.freeze({
      provider: target ? 'github' : null,
      repository: target,
      ref: master ? 'master' : null,
    }),
    external_data_required: target !== null,
    model_required: false,
    consequential_intent: operationClass === 'CONSEQUENTIAL',
    required_capabilities: target ? Object.freeze(['repository.read']) : Object.freeze([]),
    ambiguity: Object.freeze(ambiguity),
    confidence,
    original_input_ref: text(original_input_ref, 300) || null,
    original_input_preserved: true,
    authority_granted: false,
    execution_permitted: false,
    authority: GOVERNED_SIGNAL_AUTHORITY,
  });
}

function claimComparable(a, b) {
  return [
    a?.requested_action || null,
    a?.operation_class || null,
    a?.target?.provider || null,
    a?.target?.repository || null,
    a?.target?.ref || null,
    ...(a?.required_capabilities || []),
  ].join('|');
}

function canonicalClaim(claim) {
  if (!claim || typeof claim !== 'object') throw new Error('signal claim must be an object');
  return Object.freeze({
    source: text(claim.source, 120) || 'unknown',
    claim: Object.freeze({
      signal_type: text(claim.signal_type, 160) || 'UNKNOWN_REQUEST',
      requested_action: text(claim.requested_action, 160) || 'UNKNOWN',
      operation_class: OPERATION_CLASSES.has(claim.operation_class) ? claim.operation_class : 'UNKNOWN',
      target: Object.freeze({
        provider: text(claim.target?.provider, 80) || null,
        repository: text(claim.target?.repository, 240) || null,
        ref: text(claim.target?.ref, 160) || null,
      }),
      required_capabilities: Object.freeze(Array.isArray(claim.required_capabilities) ? claim.required_capabilities.map((v) => text(v, 120)).filter(Boolean).slice(0, 16) : []),
    }),
    confidence: Number.isFinite(claim.confidence) ? Math.max(0, Math.min(1, claim.confidence)) : null,
    evidence: Object.freeze(Array.isArray(claim.evidence) ? claim.evidence.map((v) => text(v, 300)).filter(Boolean).slice(0, 16) : []),
    authority_granted: false,
    execution_permitted: false,
  });
}

export function fuseSignalClaims({ original_input, claims }) {
  if (!Array.isArray(claims) || claims.length < 2) throw new Error('signal integrity requires at least two interpretation claims');
  const normalized = Object.freeze(claims.map(canonicalClaim));
  const comparable = normalized.map((item) => claimComparable(item.claim));
  const allAgree = comparable.every((value) => value === comparable[0]);
  const anyUnknown = normalized.some((item) => item.claim.operation_class === 'UNKNOWN' || item.claim.requested_action === 'UNKNOWN');

  let status = STATUS.UNKNOWN;
  if (allAgree && !anyUnknown) status = STATUS.AGREE;
  else if (!allAgree) status = STATUS.CONFLICT;

  const canonical = status === STATUS.AGREE
    ? Object.freeze({
        signal_type: normalized[0].claim.signal_type,
        requested_action: normalized[0].claim.requested_action,
        operation_class: normalized[0].claim.operation_class,
        target: normalized[0].claim.target,
        required_capabilities: normalized[0].claim.required_capabilities,
        ambiguity: Object.freeze([]),
      })
    : null;

  return Object.freeze({
    record_version: GOVERNED_SIGNAL_INTEGRITY_VERSION,
    status,
    claims: normalized,
    canonical_signal: canonical,
    original_input_preserved: typeof original_input === 'string' && original_input.length > 0,
    original_input: typeof original_input === 'string' ? original_input.slice(0, 36_000) : null,
    resolution: status === STATUS.AGREE ? 'CANONICAL_SIGNAL_READY' : status === STATUS.CONFLICT ? 'BLOCKED_UNRESOLVED_SIGNAL_CONFLICT' : 'CLARIFY_OR_BLOCK',
    authority_granted: false,
    execution_permitted: false,
    authority: GOVERNED_SIGNAL_AUTHORITY,
  });
}