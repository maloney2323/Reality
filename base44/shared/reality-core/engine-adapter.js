// Reality specialist Engine Adapter contract v0.
//
// Purpose: prepare Reality to call heterogeneous specialist engines without
// turning them into a consensus council. Every engine declares the jobs it is
// allowed to perform. All engine outputs are proposals only; they do not become
// observations, evidence, Reality state, publication authorization, or action
// authorization merely because an engine produced them.
//
// IMPORTANT: this contract intentionally assumes a CANONICAL evidence packet.
// The Fragmented Signal Cleaner will own creation of those packets. Raw signals
// should not be sent through this adapter in production.

export const ENGINE_CONTRACT_VERSION = 'reality-engine-adapter-v0.1';
export const CANONICAL_PACKET_VERSION = 'reality-canonical-evidence-v0.1';

export const EngineJob = Object.freeze({
  IDENTITY_RESOLUTION: 'IDENTITY_RESOLUTION',
  PROVENANCE_ANALYSIS: 'PROVENANCE_ANALYSIS',
  TEMPORAL_ANALYSIS: 'TEMPORAL_ANALYSIS',
  HYPOTHESIS_GENERATION: 'HYPOTHESIS_GENERATION',
  FALSIFICATION: 'FALSIFICATION',
  STATISTICAL_ANALYSIS: 'STATISTICAL_ANALYSIS',
  CAUSAL_ANALYSIS: 'CAUSAL_ANALYSIS',
  WARRANT_EVALUATION: 'WARRANT_EVALUATION',
  PROMPT_INJECTION_ANALYSIS: 'PROMPT_INJECTION_ANALYSIS',
  TOOL_MISUSE_ANALYSIS: 'TOOL_MISUSE_ANALYSIS',
  DATA_EXFILTRATION_ANALYSIS: 'DATA_EXFILTRATION_ANALYSIS',
  PROVENANCE_TAMPERING_ANALYSIS: 'PROVENANCE_TAMPERING_ANALYSIS',
  CREDENTIAL_RISK_ANALYSIS: 'CREDENTIAL_RISK_ANALYSIS',
  ANOMALOUS_ACTION_ANALYSIS: 'ANOMALOUS_ACTION_ANALYSIS',
  POLICY_BYPASS_ANALYSIS: 'POLICY_BYPASS_ANALYSIS',
});

export const EngineKind = Object.freeze({
  MODEL: 'MODEL',
  DETERMINISTIC: 'DETERMINISTIC',
  STATISTICAL: 'STATISTICAL',
  HYBRID: 'HYBRID',
});

export const EngineResultStatus = Object.freeze({
  COMPLETED: 'COMPLETED',
  INSUFFICIENT_INPUT: 'INSUFFICIENT_INPUT',
  FAILED: 'FAILED',
});

export const FindingType = Object.freeze({
  IDENTITY_CANDIDATE: 'IDENTITY_CANDIDATE',
  PROVENANCE_RELATION_CANDIDATE: 'PROVENANCE_RELATION_CANDIDATE',
  TEMPORAL_RELATION_CANDIDATE: 'TEMPORAL_RELATION_CANDIDATE',
  HYPOTHESIS: 'HYPOTHESIS',
  FALSIFICATION_CHALLENGE: 'FALSIFICATION_CHALLENGE',
  STATISTICAL_RESULT: 'STATISTICAL_RESULT',
  CAUSAL_ASSESSMENT: 'CAUSAL_ASSESSMENT',
  WARRANT_ASSESSMENT: 'WARRANT_ASSESSMENT',
  SECURITY_THREAT_CANDIDATE: 'SECURITY_THREAT_CANDIDATE',
  SECURITY_CONTROL_GAP: 'SECURITY_CONTROL_GAP',
});

const JOBS = new Set(Object.values(EngineJob));
const KINDS = new Set(Object.values(EngineKind));
const STATUSES = new Set(Object.values(EngineResultStatus));
const FINDINGS = new Set(Object.values(FindingType));

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function freezeArray(values) {
  return Object.freeze([...(values || [])]);
}

function uniqueNonEmpty(values) {
  return [...new Set((values || []).filter(nonEmpty))];
}

function freezeMetadata(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return Object.freeze({});
  const metadata = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!nonEmpty(key)) continue;
    if (raw === null || typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
      metadata[key] = raw;
    } else if (Array.isArray(raw) && raw.every((item) => typeof item === 'string')) {
      metadata[key] = Object.freeze([...raw]);
    }
  }
  return Object.freeze(metadata);
}

export function validateCanonicalEvidencePacket(packet) {
  if (!packet || typeof packet !== 'object') throw new Error('canonical evidence packet required');
  if (packet.packet_version !== CANONICAL_PACKET_VERSION) throw new Error('unsupported canonical evidence packet version');
  if (!nonEmpty(packet.packet_id)) throw new Error('canonical evidence packet requires packet_id');
  if (!Array.isArray(packet.observations) || packet.observations.length === 0) throw new Error('canonical evidence packet requires observations');

  const ids = new Set();
  const observations = packet.observations.map((observation) => {
    if (!observation || typeof observation !== 'object') throw new Error('canonical observation must be an object');
    if (!nonEmpty(observation.id)) throw new Error('canonical observation requires id');
    if (ids.has(observation.id)) throw new Error('canonical observation ids must be unique');
    ids.add(observation.id);
    if (!nonEmpty(observation.source_ref)) throw new Error('canonical observation requires source_ref');
    if (!nonEmpty(observation.content)) throw new Error('canonical observation requires content');
    return Object.freeze({
      id: observation.id,
      source_ref: observation.source_ref,
      content: observation.content,
      observed_at: nonEmpty(observation.observed_at) ? observation.observed_at : null,
      provenance_ref: nonEmpty(observation.provenance_ref) ? observation.provenance_ref : null,
      attributes: Object.freeze({ ...(observation.attributes || {}) }),
    });
  });

  return Object.freeze({
    packet_version: packet.packet_version,
    packet_id: packet.packet_id,
    observations: Object.freeze(observations),
    conflicts: Object.freeze([...(packet.conflicts || [])]),
    metadata: Object.freeze({ ...(packet.metadata || {}) }),
  });
}

function normalizeProposalContext(values) {
  const seen = new Set();
  return Object.freeze((values || []).map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`proposal context ${index} must be an object`);
    if (!nonEmpty(item.proposal_id)) throw new Error(`proposal context ${index} requires proposal_id`);
    if (seen.has(item.proposal_id)) throw new Error(`duplicate proposal context id: ${item.proposal_id}`);
    seen.add(item.proposal_id);
    if (!nonEmpty(item.text)) throw new Error(`proposal context ${item.proposal_id} requires text`);
    if (!nonEmpty(item.source_engine_id)) throw new Error(`proposal context ${item.proposal_id} requires source_engine_id`);
    return Object.freeze({
      proposal_id: item.proposal_id.trim(),
      text: item.text.trim(),
      source_engine_id: item.source_engine_id.trim(),
      authority: 'PROPOSAL_CONTEXT_ONLY',
    });
  }));
}

export function createEngineRequest({ request_id, job_type, packet, question = null, constraints = [], context_refs = [], proposal_context = [] }) {
  if (!nonEmpty(request_id)) throw new Error('engine request requires request_id');
  if (!JOBS.has(job_type)) throw new Error('engine request requires supported job_type');
  const canonicalPacket = validateCanonicalEvidencePacket(packet);
  return Object.freeze({
    contract_version: ENGINE_CONTRACT_VERSION,
    request_id,
    job_type,
    packet: canonicalPacket,
    question: nonEmpty(question) ? question.trim() : null,
    constraints: freezeArray(uniqueNonEmpty(constraints)),
    context_refs: freezeArray(uniqueNonEmpty(context_refs)),
    proposal_context: normalizeProposalContext(proposal_context),
  });
}

function normalizeFinding(finding, observationIds) {
  if (!finding || typeof finding !== 'object') throw new Error('engine finding must be an object');
  if (!FINDINGS.has(finding.type)) throw new Error('engine finding requires supported type');
  if (!nonEmpty(finding.text)) throw new Error('engine finding requires text');
  const dependencyRefs = uniqueNonEmpty(finding.dependency_refs);
  for (const ref of dependencyRefs) {
    if (!observationIds.has(ref)) throw new Error(`engine finding references observation outside canonical packet: ${ref}`);
  }
  return Object.freeze({
    type: finding.type,
    text: finding.text.trim(),
    dependency_refs: freezeArray(dependencyRefs),
    uncertainty: nonEmpty(finding.uncertainty) ? finding.uncertainty.trim() : null,
    metadata: freezeMetadata(finding.metadata),
  });
}

export function normalizeEngineResult({ adapter, request, rawResult }) {
  if (!adapter || typeof adapter !== 'object') throw new Error('engine adapter required');
  if (!request || request.contract_version !== ENGINE_CONTRACT_VERSION) throw new Error('valid engine request required');
  const result = rawResult && typeof rawResult === 'object' ? rawResult : {};
  const status = STATUSES.has(result.status) ? result.status : EngineResultStatus.COMPLETED;
  const observationIds = new Set(request.packet.observations.map((observation) => observation.id));
  const findings = (result.findings || []).map((finding) => normalizeFinding(finding, observationIds));

  return Object.freeze({
    contract_version: ENGINE_CONTRACT_VERSION,
    request_id: request.request_id,
    engine_id: adapter.engine_id,
    engine_kind: adapter.engine_kind,
    job_type: request.job_type,
    status,
    authority: 'ENGINE_PROPOSAL_ONLY',
    findings: Object.freeze(findings),
    challenges: freezeArray(uniqueNonEmpty(result.challenges)),
    uncertainties: freezeArray(uniqueNonEmpty(result.uncertainties)),
    packet_id: request.packet.packet_id,
  });
}

export function createEngineAdapter({ engine_id, engine_kind, supported_jobs, execute }) {
  if (!nonEmpty(engine_id)) throw new Error('engine adapter requires engine_id');
  if (!KINDS.has(engine_kind)) throw new Error('engine adapter requires supported engine_kind');
  if (typeof execute !== 'function') throw new Error('engine adapter requires execute function');
  const jobs = uniqueNonEmpty(supported_jobs);
  if (jobs.length === 0 || jobs.some((job) => !JOBS.has(job))) throw new Error('engine adapter requires valid supported_jobs');
  const supported = new Set(jobs);

  return Object.freeze({
    engine_id,
    engine_kind,
    supported_jobs: Object.freeze(jobs),
    async run(request) {
      if (!request || request.contract_version !== ENGINE_CONTRACT_VERSION) throw new Error('engine adapter requires valid request');
      if (!supported.has(request.job_type)) throw new Error(`engine ${engine_id} is not authorized for job ${request.job_type}`);
      const rawResult = await execute(request);
      return normalizeEngineResult({ adapter: { engine_id, engine_kind }, request, rawResult });
    },
  });
}