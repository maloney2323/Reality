import crypto from 'node:crypto';

export const G0_VERSION = 'reality-cognitive-baseline-v0.1';
export const G0_RECEIPT_VERSION = 'reality-g0-baseline-receipt-v0.1';

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

export function stable(value) {
  return JSON.stringify(value, Object.keys(value ?? {}).sort());
}

export function hashText(value) { return sha256(String(value)); }

export function buildCasePrompt(c) {
  return [
    'You are the G0 baseline subject. Do not invent facts.',
    'Return ONLY valid JSON with keys: decision, supported_claims, unknowns, contradictions, next_step.',
    'decision must be one of ACT, PREPARE, INVESTIGATE, BLOCK.',
    'Use only the supplied evidence. Preserve contradictions rather than resolving them without evidence.',
    '',
    'CASE:',
    JSON.stringify({id:c.id, domain:c.domain, objective:c.objective, evidence:c.evidence, constraints:c.constraints})
  ].join('\n');
}

export function scoreResponse(c, response) {
  const expected = c.expected;
  const decisionCorrect = response?.decision === expected.decision;
  const contradictionsCorrect = JSON.stringify([...(response?.contradictions ?? [])].sort()) === JSON.stringify([...(expected.contradictions ?? [])].sort());
  const unknownCoverage = (expected.unknowns ?? []).every(x => (response?.unknowns ?? []).includes(x));
  const grounded = (response?.supported_claims ?? []).every(x => (expected.allowed_claims ?? []).includes(x));
  const score = (decisionCorrect?1:0) + (contradictionsCorrect?1:0) + (unknownCoverage?1:0) + (grounded?1:0);
  return { case_id:c.id, decision_correct:decisionCorrect, contradictions_correct:contradictionsCorrect, unknown_coverage:unknownCoverage, grounded, score, max_score:4 };
}

export function buildCapabilityProfile(scores) {
  const avg = scores.length ? scores.reduce((a,s)=>a+s.score,0)/(scores.length*4) : 0;
  return { overall_score:avg, case_count:scores.length,
    decision_accuracy:scores.filter(s=>s.decision_correct).length/scores.length,
    contradiction_accuracy:scores.filter(s=>s.contradictions_correct).length/scores.length,
    unknown_coverage:scores.filter(s=>s.unknown_coverage).length/scores.length,
    grounding_accuracy:scores.filter(s=>s.grounded).length/scores.length };
}

export function buildBaselineReceipt({model, modelConfigHash, cognitiveArchitectureHash, governanceKernelHash, developmentHash, sealedHash, novelHash, capabilityProfile, failureProfile, evaluatorIdentity, evaluationProtocolHash, runId}) {
  const body = {receipt_version:G0_RECEIPT_VERSION, generation:'G0', baseline_id:'G0-'+runId,
    model_identity:model, model_config_hash:modelConfigHash, cognitive_architecture_hash:cognitiveArchitectureHash,
    governance_kernel_hash:governanceKernelHash, development_set_hash:developmentHash,
    sealed_set_hash:sealedHash, novel_set_hash:novelHash, capability_profile:capabilityProfile,
    failure_profile:failureProfile, evaluator_identity:evaluatorIdentity,
    evaluation_protocol_hash:evaluationProtocolHash, run_id:runId,
    governance_kernel_modified:false, authority_granted:false, external_effects_permitted:false, status:'FROZEN'};
  return {...body, receipt_hash:sha256(JSON.stringify(body))};
}
