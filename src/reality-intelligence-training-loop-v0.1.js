export const REALITY_INTELLIGENCE_TRAINING_LOOP_VERSION = 'reality-intelligence-training-loop-v1.0';

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function digestSeed(value) {
  const text = JSON.stringify(value ?? null);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function classifyCapabilityGap({ answer, systemContext, governedSignal }) {
  const hasAnswer = typeof answer === 'string' && answer.trim().length > 0;
  const hasEvidence = Boolean(
    governedSignal?.packet?.packet_id &&
    governedSignal?.transformation_receipt?.receipt_id
  );
  const contextMissing = !systemContext;

  if (!hasAnswer) {
    return { status: 'FAILED', gap: 'RESPONSE_GENERATION', reason: 'No usable intelligence response.' };
  }
  if (!hasEvidence) {
    return { status: 'FAILED', gap: 'EVIDENCE_GROUNDING', reason: 'Intelligence was not grounded in a governed evidence packet.' };
  }
  if (contextMissing) {
    return { status: 'OBSERVED_LIMITATION', gap: 'WORLD_CONTEXT_ACQUISITION', reason: 'No authenticated operational context was available.' };
  }

  return { status: 'NO_MATERIAL_GAP_DETECTED', gap: null, reason: 'The observed turn had the minimum governed inputs required for this training slice.' };
}

export function createIntelligenceTrainingExperience({
  message,
  governedSignal,
  intelligence,
  systemContext = null,
  governance,
  execution,
  observedAt = new Date().toISOString(),
} = {}) {
  const answer = intelligence?.answer || '';
  const gap = classifyCapabilityGap({ answer, systemContext, governedSignal });

  return Object.freeze({
    training_loop_version: REALITY_INTELLIGENCE_TRAINING_LOOP_VERSION,
    experience_id: `experience_${digestSeed({
      message,
      packet_id: governedSignal?.packet?.packet_id,
      response_id: intelligence?.response_id,
    })}`,
    observed_at: observedAt,
    input: {
      message: String(message || ''),
      packet_id: governedSignal?.packet?.packet_id || null,
      transformation_receipt_id: governedSignal?.transformation_receipt?.receipt_id || null,
    },
    intelligence: {
      model: intelligence?.model || null,
      response_id: intelligence?.response_id || null,
      answer: answer,
    },
    governance: clone(governance || null),
    execution: clone(execution || null),
    context_available: Boolean(systemContext),
    capability_assessment: gap,
    learning_status: gap.status === 'NO_MATERIAL_GAP_DETECTED' ? 'ELIGIBLE_FOR_EVALUATION' : 'CAPABILITY_GAP_RECORDED',
    authority: {
      model_output_is_not_training_authority: true,
      training_acceptance_requires_governed_evaluation: true,
      execution_authority_separate: true,
    },
  });
}

export function proposeTrainingExperiment(experience, {
  objective = 'Improve intelligence capability without weakening evidence or authority boundaries.',
} = {}) {
  if (!experience) throw new Error('TRAINING_EXPERIENCE_REQUIRED');

  const gap = experience.capability_assessment;
  return Object.freeze({
    training_loop_version: REALITY_INTELLIGENCE_TRAINING_LOOP_VERSION,
    experiment_id: `experiment_${digestSeed(experience.experience_id)}`,
    source_experience_id: experience.experience_id,
    objective,
    capability_gap: gap.gap,
    status: gap.gap ? 'PROPOSED' : 'NO_EXPERIMENT_REQUIRED',
    acceptance_gates: [
      'No invented evidence.',
      'No authority leakage from model output.',
      'No unsafe consequential action.',
      'Independent evaluation must demonstrate improvement before acceptance.',
      'Previous capability must remain available unless replacement is proven superior.',
    ],
  });
}
