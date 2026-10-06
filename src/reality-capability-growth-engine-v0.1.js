import { createHash } from 'node:crypto';

export const CAPABILITY_GROWTH_ENGINE_VERSION = 'reality-capability-growth-engine-v0.1';
export const CAPABILITY_CONTRACT_VERSION = '0.1.0';

export const GAP_TYPES = Object.freeze([
  'MISSING_CAPABILITY',
  'MISSING_INFORMATION',
  'INSUFFICIENT_AUTHORITY',
  'TRANSIENT_FAILURE',
  'AMBIGUOUS_REQUEST',
  'EXTERNAL_SYSTEM_FAILURE',
  'BUG_IN_EXISTING_CAPABILITY',
]);

export const GROWTH_STATES = Object.freeze([
  'BLOCKED','GAP_DETECTED','GAP_CONFIRMED','PROPOSAL_CREATED','AWAITING_AUTHORIZATION',
  'AUTHORIZED','ACQUISITION_RUNNING','ACQUISITION_FAILED','VERIFYING','VERIFIED',
  'REGISTERED','RESUMING','RESUMED','ROLLED_BACK','ABANDONED'
]);

const AUTOMATIC_ACTIONS = new Set([
  'create_branch','write_bounded_files','run_tests','deploy_preview','register_verified_capability'
]);
const HUMAN_APPROVAL_ACTIONS = new Set([
  'new_external_service','production_deployment','new_secret','paid_resource','permission_scope_change'
]);
const FORBIDDEN_ACTIONS = new Set([
  'modify_authentication','modify_governance','modify_self_model','access_unapproved_data','bypass_failed_verification'
]);

function text(v){ return typeof v === 'string' ? v.trim() : ''; }
function list(v){ return Array.isArray(v) ? v.filter(Boolean) : []; }
function digest(v){ return createHash('sha256').update(JSON.stringify(v)).digest('hex'); }
function id(prefix, seed){ return prefix + ':' + digest(seed).slice(0,32); }
function freeze(v){ return Object.freeze(v); }

export function classifyBlock({ reason, evidence = {}, existingCapability = false } = {}) {
  const r = text(reason).toLowerCase();
  if (evidence.gap_type && GAP_TYPES.includes(evidence.gap_type)) return evidence.gap_type;
  if (evidence.authority_missing || /permission|unauthorized|not authorized|access denied/.test(r)) return 'INSUFFICIENT_AUTHORITY';
  if (evidence.ambiguous || /ambiguous|missing .*repository|unclear|unspecified/.test(r)) return 'AMBIGUOUS_REQUEST';
  if (evidence.transient || /timeout|temporar|rate limit|unavailable/.test(r)) return 'TRANSIENT_FAILURE';
  if (evidence.external_failure || /provider|external system|upstream/.test(r)) return 'EXTERNAL_SYSTEM_FAILURE';
  if (evidence.bug || existingCapability && /crash|exception|defect|regression/.test(r)) return 'BUG_IN_EXISTING_CAPABILITY';
  if (evidence.information_missing || /missing information|insufficient data|need more information/.test(r)) return 'MISSING_INFORMATION';
  if (evidence.capability_missing || /cannot .* because .*capability|unsupported|not supported|no capability|capability missing/.test(r)) return 'MISSING_CAPABILITY';
  return 'MISSING_INFORMATION';
}

export function createCapabilityContract({
  capabilityId, description, inputSchema, outputSchema, authorityRequired = 'none',
  sideEffects = 'none', verificationSuite = [], version = '0.1.0', sourceRef = null,
  verificationRef = null, status = 'UNVERIFIED'
} = {}) {
  if (!text(capabilityId)) throw new Error('CAPABILITY_ID_REQUIRED');
  if (!text(description)) throw new Error('CAPABILITY_DESCRIPTION_REQUIRED');
  if (!text(inputSchema)) throw new Error('CAPABILITY_INPUT_SCHEMA_REQUIRED');
  if (!text(outputSchema)) throw new Error('CAPABILITY_OUTPUT_SCHEMA_REQUIRED');
  if (!list(verificationSuite).length) throw new Error('CAPABILITY_VERIFICATION_SUITE_REQUIRED');
  if (!['PROPOSED','ACQUIRING','UNVERIFIED','VERIFIED','REVOKED'].includes(status)) throw new Error('CAPABILITY_STATUS_INVALID');
  return freeze({
    contract_version: CAPABILITY_CONTRACT_VERSION, capability_id: capabilityId, description,
    input_schema: inputSchema, output_schema: outputSchema, authority_required: authorityRequired,
    side_effects: sideEffects, verification_suite: list(verificationSuite), version,
    source_ref: sourceRef, verification_ref: verificationRef, status
  });
}

export function validateCapabilityContract(contract) {
  if (!contract || contract.contract_version !== CAPABILITY_CONTRACT_VERSION) return { valid:false, reason:'CONTRACT_VERSION_INVALID' };
  if (!contract.capability_id || !contract.description || !contract.input_schema || !contract.output_schema) return { valid:false, reason:'CONTRACT_FIELDS_MISSING' };
  if (!Array.isArray(contract.verification_suite) || contract.verification_suite.length === 0) return { valid:false, reason:'VERIFICATION_SUITE_MISSING' };
  if (contract.status !== 'VERIFIED') return { valid:false, reason:'CAPABILITY_NOT_VERIFIED' };
  if (!contract.source_ref || !contract.verification_ref) return { valid:false, reason:'PROVENANCE_MISSING' };
  return { valid:true };
}

export function capabilityRegistryEntry(contract, verification) {
  const validation = validateCapabilityContract(contract);
  if (!validation.valid) throw new Error(validation.reason);
  if (verification?.verified !== true) throw new Error('INDEPENDENT_CAPABILITY_VERIFICATION_REQUIRED');
  return freeze({
    registry_version: CAPABILITY_CONTRACT_VERSION,
    capability_id: contract.capability_id,
    version: contract.version,
    status: 'VERIFIED',
    contract,
    verification_ref: contract.verification_ref,
    registered_at: new Date().toISOString(),
  });
}

export function createCapabilityGap({ workItemId, blockedStepId, gapType, capabilityId, evidence = [], diagnosis = null } = {}) {
  if (!text(workItemId)) throw new Error('WORK_ITEM_ID_REQUIRED');
  if (!text(blockedStepId)) throw new Error('BLOCKED_STEP_ID_REQUIRED');
  if (gapType !== 'MISSING_CAPABILITY') throw new Error('ONLY_MISSING_CAPABILITY_ENTERS_GROWTH_LOOP');
  if (!text(capabilityId)) throw new Error('REQUIRED_CAPABILITY_ID_REQUIRED');
  return freeze({
    gap_id: id('capgap', [workItemId, blockedStepId, capabilityId, evidence]),
    work_item_id: workItemId, blocked_step_id: blockedStepId, gap_type: gapType,
    required_capability: capabilityId, evidence: list(evidence), diagnosis,
    status: 'GAP_CONFIRMED'
  });
}

export function createGrowthProposal({
  gap, contract, allowedFiles = [], acquisitionActions = ['create_branch','write_bounded_files','run_tests','deploy_preview'],
  risk = 'low', estimatedCostCents = 0, originalInputs = null, completedSteps = [], continuationStep = null
} = {}) {
  if (gap?.gap_type !== 'MISSING_CAPABILITY') throw new Error('CAPABILITY_GAP_REQUIRED');
  if (!contract?.capability_id || contract.capability_id !== gap.required_capability) throw new Error('CAPABILITY_CONTRACT_MISMATCH');
  if (allowedFiles.length === 0) throw new Error('BOUNDED_FILE_SCOPE_REQUIRED');
  if (acquisitionActions.some((a) => FORBIDDEN_ACTIONS.has(a))) throw new Error('FORBIDDEN_ACQUISITION_ACTION');
  const forbiddenFiles = allowedFiles.filter((p) => /(^|\/)(reality-constitution|reality-governed-system-access|reality-capability-growth-engine|\.github\/workflows\/)/.test(p));
  if (forbiddenFiles.length) throw new Error('FORBIDDEN_FILE_SCOPE');
  return freeze({
    proposal_id: id('capproposal', [gap.gap_id, contract.capability_id, contract.version, allowedFiles]),
    gap_id: gap.gap_id, work_item_id: gap.work_item_id, required_capability: gap.required_capability,
    contract, allowed_files: [...allowedFiles], acquisition_actions: [...acquisitionActions],
    risk, estimated_cost_cents: estimatedCostCents, original_inputs: originalInputs,
    completed_steps: [...completedSteps], continuation_step: continuationStep,
    proposal_hash: digest([gap, contract, allowedFiles, acquisitionActions]),
    state: 'PROPOSAL_CREATED'
  });
}

export function evaluateAcquisitionAuthority({ proposal, policy } = {}) {
  if (!proposal?.proposal_id) return { allowed:false, decision:'REJECT', reason:'PROPOSAL_REQUIRED' };
  if (!policy) return { allowed:false, decision:'ESCALATE', reason:'ACQUISITION_POLICY_REQUIRED' };
  if (proposal.estimated_cost_cents > Number(policy.max_cost_cents ?? 0)) return { allowed:false, decision:'ESCALATE', reason:'ACQUISITION_BUDGET_EXCEEDED' };
  const actions = proposal.acquisition_actions || [];
  if (actions.some((a) => FORBIDDEN_ACTIONS.has(a))) return { allowed:false, decision:'REJECT', reason:'FORBIDDEN_ACQUISITION_ACTION' };
  const humanRequired = actions.some((a) => HUMAN_APPROVAL_ACTIONS.has(a));
  if (humanRequired) return { allowed:false, decision:'ESCALATE', reason:'HUMAN_AUTHORIZATION_REQUIRED' };
  const unknown = actions.filter((a) => !AUTOMATIC_ACTIONS.has(a));
  if (unknown.length) return { allowed:false, decision:'ESCALATE', reason:'UNDECLARED_ACQUISITION_ACTION' };
  const allowedFiles = new Set(policy.allowed_file_prefixes || []);
  const outOfScope = (proposal.allowed_files || []).filter((p) => ![...allowedFiles].some((prefix) => p.startsWith(prefix)));
  if (outOfScope.length) return { allowed:false, decision:'REJECT', reason:'FILE_SCOPE_EXCEEDED', out_of_scope:outOfScope };
  return { allowed:true, decision:'AUTHORIZE', reason:'PREDECLARED_POLICY_SATISFIED' };
}

export function createGrowthRun({ gap, proposal = null } = {}) {
  if (!gap?.gap_id) throw new Error('CAPABILITY_GAP_REQUIRED');
  return {
    growth_run_id: id('growth', [gap.gap_id, proposal?.proposal_id || null]),
    work_item_id: gap.work_item_id,
    blocked_step_id: gap.blocked_step_id,
    gap_id: gap.gap_id,
    state: proposal ? 'PROPOSAL_CREATED' : 'GAP_DETECTED',
    events: [{ state: proposal ? 'PROPOSAL_CREATED' : 'GAP_DETECTED', at: new Date().toISOString() }],
    proposal_id: proposal?.proposal_id || null,
    acquisition: null,
    verification: null,
    capability_registry_entry: null,
    resume_token: null,
    final_outcome: null
  };
}

export function transitionGrowthRun(run, nextState, details = {}) {
  if (!run || !GROWTH_STATES.includes(nextState)) throw new Error('INVALID_GROWTH_STATE');
  const terminal = new Set(['RESUMED','ROLLED_BACK','ABANDONED']);
  if (terminal.has(run.state)) throw new Error('GROWTH_RUN_TERMINAL');
  return {
    ...run, state: nextState,
    events: [...(run.events || []), { state: nextState, at: new Date().toISOString(), ...details }]
  };
}

export function buildResumeToken({ gap, capability, originalInputs, completedSteps = [], continuationStep } = {}) {
  if (!gap?.work_item_id || !gap?.blocked_step_id) throw new Error('GAP_REQUIRED');
  if (!capability?.capability_id || capability.status !== 'VERIFIED') throw new Error('VERIFIED_CAPABILITY_REQUIRED');
  if (!text(continuationStep)) throw new Error('CONTINUATION_STEP_REQUIRED');
  return freeze({
    resume_token_version: '0.1.0',
    resume_token_id: id('resume', [gap.work_item_id, gap.blocked_step_id, capability.capability_id, capability.version]),
    work_item_id: gap.work_item_id, blocked_step_id: gap.blocked_step_id,
    original_inputs: originalInputs, completed_steps: list(completedSteps),
    blocked_reason: gap.diagnosis, required_capability: capability.capability_id,
    capability_version: capability.version, continuation_step: continuationStep
  });
}

export function verifyCapabilityAndOriginalWork({ capabilityTests, originalWorkTest, authoritySatisfied, forbiddenChanges = [] } = {}) {
  if (!Array.isArray(capabilityTests) || capabilityTests.length === 0) return { verified:false, reason:'CAPABILITY_TESTS_MISSING' };
  if (capabilityTests.some((t) => t.passed !== true)) return { verified:false, reason:'CAPABILITY_TEST_FAILED' };
  if (originalWorkTest?.passed !== true) return { verified:false, reason:'ORIGINAL_WORK_ITEM_TEST_FAILED' };
  if (authoritySatisfied !== true) return { verified:false, reason:'AUTHORITY_CONSTRAINT_FAILED' };
  if (forbiddenChanges.length) return { verified:false, reason:'FORBIDDEN_FILES_CHANGED', forbidden_changes:forbiddenChanges };
  return { verified:true, reason:'CAPABILITY_AND_ORIGINAL_WORK_VERIFIED' };
}

export function createVerifiedRegistration({ contract, verification, sourceRef, verificationRef } = {}) {
  const next = { ...contract, status:'VERIFIED', source_ref:sourceRef, verification_ref:verificationRef };
  return capabilityRegistryEntry(next, verification);
}

export function buildDefaultAcquisitionPolicy() {
  return freeze({
    policy_version: 'capability-growth-policy-v0.1',
    max_cost_cents: 0,
    allowed_file_prefixes: ['src/capabilities/','test/capabilities/'],
    automatic_actions: [...AUTOMATIC_ACTIONS],
    human_approval_actions: [...HUMAN_APPROVAL_ACTIONS],
    forbidden_actions: [...FORBIDDEN_ACTIONS],
    forbidden_capability_targets: [
      'authentication','governance','self_model','secret_handling','production_security_boundary'
    ]
  });
}
