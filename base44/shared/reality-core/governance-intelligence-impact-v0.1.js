// Reality Governance / Intelligence Impact Contract v0.1
// Governance is capability-specific. It may constrain consequential execution,
// but must not silently remove reasoning, inspection, analysis, or synthesis
// capabilities. Any capability loss is surfaced as a governance impact finding.
//
// This module is descriptive/deterministic. It does not grant authority.

export const GOVERNANCE_INTELLIGENCE_IMPACT_VERSION = 'reality-governance-intelligence-impact-v0.1';

export const GOVERNANCE_IMPACT_POLICY = Object.freeze({
  principle: 'MAXIMUM_INTELLIGENCE_MINIMUM_NECESSARY_RESTRICTION',
  rule: 'Governance must constrain a defined consequential capability, not intelligence merely because a capability exists.',
  escalation: 'Any boundary that removes reasoning, inspection, analysis, or development capability must be surfaced for human review rather than silently accepted.',
});

const CAPABILITY_CLASSES = Object.freeze([
  'REASONING',
  'INSPECTION',
  'ANALYSIS',
  'CROSS_EXAMINATION',
  'CODE_GENERATION',
  'CODE_MODIFICATION',
  'EXTERNAL_EXECUTION',
  'MERGE',
  'DEPLOY',
  'DESTRUCTIVE_CHANGE',
  'CREDENTIAL_CHANGE',
]);

export function assessGovernanceImpact({ capability, restriction, purpose, intelligenceAffected = [], executionAffected = [] }) {
  const affected = Array.isArray(intelligenceAffected) ? intelligenceAffected.filter((v) => CAPABILITY_CLASSES.includes(v)) : [];
  const execution = Array.isArray(executionAffected) ? executionAffected.filter((v) => CAPABILITY_CLASSES.includes(v)) : [];
  const removesIntelligence = affected.some((v) => ['REASONING','INSPECTION','ANALYSIS','CROSS_EXAMINATION','CODE_GENERATION'].includes(v));

  return Object.freeze({
    schema: GOVERNANCE_INTELLIGENCE_IMPACT_VERSION,
    capability,
    restriction,
    purpose,
    intelligence_affected: Object.freeze(affected),
    execution_affected: Object.freeze(execution),
    intelligence_capability_removed: removesIntelligence,
    status: removesIntelligence ? 'HUMAN_REVIEW_REQUIRED' : 'CAPABILITY_PRESERVING',
    policy: GOVERNANCE_IMPACT_POLICY,
  });
}

export function buildRealityGovernanceTrace({ request, signalIntegrity, signalPacket, downstream = {} }) {
  const operationClass = signalIntegrity?.canonical_signal?.operation_class || 'UNKNOWN';
  const writeIntent = operationClass === 'CONSEQUENTIAL' ||
    /\\b(write|edit|modify|change|fix|merge|deploy|delete)\\b/i.test(String(request || ''));

  const stages = [
    {
      stage: 'INGRESS',
      component: 'Governed Signal Cleaner / Fragmented Signal Cleaner',
      purpose: 'Canonicalize and structure the incoming signal while preserving the original request and uncertainty.',
      governance_added: ['provenance', 'conflict preservation', 'authority=false', 'execution_permitted=false'],
      intelligence_removed: [],
      execution_restricted: ['unverified consequential execution'],
      status: 'EXECUTED',
    },
    {
      stage: 'MULTI_LANE_REASONING',
      component: 'Observer / Verifier / Adversary',
      purpose: 'Independently reason over the same canonical signal before cross-lane interaction.',
      governance_added: ['same-input independence', 'model-output-is-not-evidence', 'no truth/action authority'],
      intelligence_removed: [],
      execution_restricted: ['direct external mutation'],
      status: downstream.fanout ? 'EXECUTED' : 'TRACE_ONLY',
    },
    {
      stage: 'CROSS_EXAMINATION',
      component: 'Bounded Cross-Examination',
      purpose: 'Challenge interpretations after independent analysis without converting model disagreement into evidence.',
      governance_added: ['bounded rounds', 'no majority-vote truth', 'preserve unresolved state'],
      intelligence_removed: [],
      execution_restricted: ['authority escalation from model output'],
      status: downstream.cross_examination ? 'EXECUTED' : 'TRACE_ONLY',
    },
    {
      stage: 'SYNTHESIS',
      component: 'Managed Reality Model',
      purpose: 'Reason over canonical evidence, continuity, lane analysis, and bounded challenges.',
      governance_added: ['preserve epistemic status', 'no invented evidence', 'no authority from model output'],
      intelligence_removed: [],
      execution_restricted: ['unverified claims presented as established truth', 'action authority from reasoning alone'],
      status: downstream.synthesis ? 'EXECUTED' : 'TRACE_ONLY',
    },
    {
      stage: 'ACTION_DETERMINATION',
      component: writeIntent ? 'Code Change / GitHub Write Governance' : 'Action Gate',
      purpose: writeIntent
        ? 'Determine whether a specific repository mutation has the required candidate, review, and explicit write authorization.'
        : 'Separate reasoning/proposal from consequential external execution.',
      governance_added: ['exact-scope authorization', 'execution/authorization distinction', 'merge/deploy separation'],
      intelligence_removed: [],
      execution_restricted: writeIntent ? ['unauthorized repository mutation', 'merge', 'deploy'] : ['unauthorized external action'],
      status: 'TRACE_ONLY',
    },
    {
      stage: 'VERIFICATION',
      component: 'Execution Receipt / Verification',
      purpose: 'Establish what actually happened after any permitted execution.',
      governance_added: ['execution receipt', 'observed-state verification'],
      intelligence_removed: [],
      execution_restricted: ['claiming execution without verification'],
      status: 'TRACE_ONLY',
    },
    {
      stage: 'CONTINUITY',
      component: 'Continuity Ledger',
      purpose: 'Carry forward epistemic status and provenance without turning model output into evidence.',
      governance_added: ['lineage', 'uncertainty preservation', 'model-output labeling'],
      intelligence_removed: [],
      execution_restricted: [],
      status: 'TRACE_ONLY',
    },
  ];

  const intelligenceLosses = stages.filter((stage) => stage.intelligence_removed.length > 0);
  const capabilityBoundaryFindings = writeIntent
    ? [
        'Repository write is consequential execution and may remain governed.',
        'Repository inspection and reasoning must remain available unless a separate concrete risk justifies restricting them.',
        'Merge/deploy/destructive/credential changes are distinct execution boundaries and should not be used to suppress upstream intelligence.',
      ]
    : [
        'No consequential execution boundary is established by the request classification.',
        'Reasoning, inspection, analysis, and cross-examination should remain available.',
      ];

  return Object.freeze({
    schema: GOVERNANCE_INTELLIGENCE_IMPACT_VERSION,
    request,
    signal_packet_id: signalPacket?.packet_id || null,
    signal_integrity_status: signalIntegrity?.status || 'UNKNOWN',
    operation_class: operationClass,
    trace_policy: GOVERNANCE_IMPACT_POLICY,
    stages: Object.freeze(stages),
    intelligence_loss_findings: Object.freeze(intelligenceLosses),
    capability_boundary_findings: Object.freeze(capabilityBoundaryFindings),
    governance_is_allowed_to_reduce_intelligence: false,
    human_review_required_if_intelligence_removed: intelligenceLosses.length > 0,
    execution_authority_granted: false,
  });
}