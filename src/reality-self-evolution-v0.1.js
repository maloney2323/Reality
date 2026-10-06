import crypto from 'node:crypto';

export const REALITY_SELF_EVOLUTION_VERSION = 'reality-self-evolution-v0.1';
export const EVOLUTION_STATES = Object.freeze([
  'EVOLUTION_IDLE',
  'LIMITATION_DETECTED',
  'OPPORTUNITY_RANKED',
  'UPGRADE_PROPOSED',
  'AWAITING_AUTHORIZATION',
  'SANDBOX_RUNNING',
  'SANDBOX_VERIFIED',
  'PROMOTION_PENDING',
  'PROMOTED',
  'LEARNING_COMMITTED',
  'REPLANNED',
  'BLOCKED',
  'ESCALATED',
]);

export const LIMITATION_CLASSES = Object.freeze([
  'MISSING_EVIDENCE',
  'MISSING_CAPABILITY',
  'CONTRADICTION',
  'INSUFFICIENT_AUTHORITY',
  'REASONING_LIMIT',
  'EXECUTION_LIMIT',
  'VERIFICATION_LIMIT',
  'LEARNING_LIMIT',
]);

export const SELF_EVOLUTION_INVARIANTS = Object.freeze({
  universeIsCanonicalState: true,
  learningRequiresVerifiedOutcome: true,
  candidateIsNotCapability: true,
  candidateIsNotTruth: true,
  productionGraphIsImmutableDuringSandbox: true,
  governanceKernelIsImmutable: true,
  selfUpgradeRequiresIndependentVerification: true,
  promotionRequiresRegressionPass: true,
  promotionRequiresExplicitPromotionAuthority: true,
  failedUpgradeCannotPromote: true,
  finiteExperimentBudget: true,
  originalObjectiveIsNeverReplacedByUpgrade: true,
  modelProviderIsReplaceable: true,
});

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function stable(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stable);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function digest(value) {
  return crypto.createHash('sha256')
    .update(JSON.stringify(stable(value)))
    .digest('hex');
}

function freeze(value) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) value.forEach(freeze);
  else Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function scoreOpportunity(item, objective, state) {
  const impact = Number(item.expected_impact ?? item.impact ?? 0);
  const probability = Number(item.probability_of_success ?? 0.5);
  const uncertainty = Number(item.uncertainty_reduction ?? 0);
  const urgency = Number(item.urgency ?? 0);
  const cost = Math.max(0, Number(item.cost ?? 1));
  const risk = Math.max(0, Number(item.risk ?? 0));
  const objectiveRelevance = Number(item.objective_relevance ?? 1);
  const evidenceQuality = Number(item.evidence_quality ?? 0.5);

  const normalized = (value, fallback) => Number.isFinite(value) ? value : fallback;

  return normalized(
    (
      impact
      * probability
      * Math.max(0, uncertainty + 0.1)
      * Math.max(0, urgency + 0.1)
      * Math.max(0, objectiveRelevance)
      * Math.max(0, evidenceQuality)
    ) / (cost + risk + 1),
    0,
  );
}

/**
 * Reality Self-Evolution Engine v0.1
 *
 * This is the control layer that turns:
 *   verified experience -> detected limitation -> bounded improvement ->
 *   independent validation -> capability promotion -> better future cognition.
 *
 * It does NOT permit the system to rewrite governance, authority, security,
 * identity, or production state merely because a model proposed doing so.
 * Models may propose upgrades; only verified, bounded experiments can earn
 * promotion.
 */

export function createEvolutionState({
  objective,
  universeState,
  learningHistory = [],
  capabilities = [],
  governanceKernelHash = null,
} = {}) {
  if (!objective?.id) throw new Error('EVOLUTION_OBJECTIVE_REQUIRED');
  if (!universeState?.state_id) throw new Error('UNIVERSE_STATE_REQUIRED');
  if (!text(governanceKernelHash)) throw new Error('GOVERNANCE_KERNEL_HASH_REQUIRED');

  const state = {
    version: REALITY_SELF_EVOLUTION_VERSION,
    state: 'EVOLUTION_IDLE',
    objective: clone(objective),
    universe_state_id: universeState.state_id,
    continuity_root_id: universeState.continuity_root_id || null,
    worldline_id: universeState.worldline_id || null,
    learning_history: clone(learningHistory),
    capabilities: clone(capabilities),
    governance_kernel_hash: governanceKernelHash,
    production_graph_write_permitted: false,
  };

  return freeze({
    ...state,
    evolution_state_id: `evolution_state:${digest(state)}`,
    evolution_state_hash: digest(state),
  });
}

export function detectLimitation({
  evolutionState,
  consequences = [],
  failedOutcomes = [],
  capabilityGaps = [],
  reasoningFailures = [],
  verificationFailures = [],
} = {}) {
  if (!evolutionState?.evolution_state_id) throw new Error('EVOLUTION_STATE_REQUIRED');

  const candidates = [
    ...list(consequences).map((item) => ({
      class: item.gap || item.limit_class,
      subject: item.subject,
      basis_refs: item.basis_refs || [],
      evidence_quality: Number(item.evidence_quality ?? 0.7),
      source: 'COGNITIVE_CONSEQUENCE',
    })),
    ...list(capabilityGaps).map((item) => ({
      class: 'MISSING_CAPABILITY',
      subject: item.id || item.capability_id || item,
      basis_refs: item.evidence_refs || [],
      evidence_quality: Number(item.evidence_quality ?? 0.8),
      source: 'CAPABILITY_REGISTRY',
    })),
    ...list(reasoningFailures).map((item) => ({
      class: 'REASONING_LIMIT',
      subject: item.id || item.description,
      basis_refs: item.evidence_refs || [],
      evidence_quality: Number(item.evidence_quality ?? 0.7),
      source: 'REASONING_EVALUATION',
    })),
    ...list(verificationFailures).map((item) => ({
      class: 'VERIFICATION_LIMIT',
      subject: item.id || item.description,
      basis_refs: item.evidence_refs || [],
      evidence_quality: Number(item.evidence_quality ?? 0.8),
      source: 'VERIFICATION_EVALUATION',
    })),
    ...list(failedOutcomes).map((item) => ({
      class: item.limit_class || 'EXECUTION_LIMIT',
      subject: item.id || item.description,
      basis_refs: item.evidence_refs || [],
      evidence_quality: Number(item.evidence_quality ?? 0.8),
      source: 'VERIFIED_FAILURE',
    })),
  ].filter((item) => LIMITATION_CLASSES.includes(item.class) && text(item.subject));

  if (!candidates.length) {
    return freeze({
      ...evolutionState,
      state: 'EVOLUTION_IDLE',
      limitation: null,
      limitation_detection_hash: digest({ state: evolutionState.evolution_state_id, candidates: [] }),
    });
  }

  const grouped = new Map();
  for (const candidate of candidates) {
    const key = `${candidate.class}:${candidate.subject}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(candidate);
  }

  const ranked = [...grouped.entries()].map(([key, items]) => ({
    key,
    class: items[0].class,
    subject: items[0].subject,
    occurrence_count: items.length,
    basis_refs: [...new Set(items.flatMap((item) => list(item.basis_refs)))],
    evidence_quality: Math.min(...items.map((item) => item.evidence_quality)),
    sources: [...new Set(items.map((item) => item.source))],
  })).sort((a, b) => (
    (b.occurrence_count * b.evidence_quality) - (a.occurrence_count * a.evidence_quality)
  ));

  const limitation = ranked[0];

  return freeze({
    ...evolutionState,
    state: 'LIMITATION_DETECTED',
    limitation,
    limitation_detection_hash: digest({
      universe_state_id: evolutionState.universe_state_id,
      limitation,
    }),
  });
}

export function rankEvolutionOpportunities({
  evolutionState,
  opportunities = [],
} = {}) {
  if (evolutionState?.state !== 'LIMITATION_DETECTED') {
    throw new Error('LIMITATION_NOT_DETECTED');
  }
  if (!evolutionState.limitation) throw new Error('LIMITATION_REQUIRED');

  const ranked = list(opportunities)
    .filter((item) => item && item.id)
    .map((item) => ({
      ...clone(item),
      limitation_class: item.limitation_class || evolutionState.limitation.class,
      target_subject: item.target_subject || evolutionState.limitation.subject,
      score: scoreOpportunity(item, evolutionState.objective, evolutionState.universe_state_id),
    }))
    .filter((item) => item.limitation_class === evolutionState.limitation.class)
    .sort((a, b) => b.score - a.score);

  if (!ranked.length) {
    return freeze({
      ...evolutionState,
      state: 'BLOCKED',
      block_reason: 'NO_BOUNDED_EVOLUTION_OPPORTUNITY',
    });
  }

  const selected = ranked[0];

  return freeze({
    ...evolutionState,
    state: 'OPPORTUNITY_RANKED',
    opportunity: selected,
    ranked_opportunities: ranked,
    opportunity_selection_hash: digest({
      limitation_detection_hash: evolutionState.limitation_detection_hash,
      selected,
    }),
  });
}

export function proposeUpgrade({
  evolutionState,
  proposal,
} = {}) {
  if (evolutionState?.state !== 'OPPORTUNITY_RANKED') throw new Error('OPPORTUNITY_NOT_RANKED');
  if (!proposal?.id) throw new Error('UPGRADE_PROPOSAL_ID_REQUIRED');
  if (!text(proposal.strategy)) throw new Error('UPGRADE_STRATEGY_REQUIRED');
  if (proposal.modifies_governance === true) throw new Error('GOVERNANCE_SELF_MODIFICATION_FORBIDDEN');
  if (proposal.modifies_authority === true) throw new Error('AUTHORITY_SELF_MODIFICATION_FORBIDDEN');
  if (proposal.modifies_security === true) throw new Error('SECURITY_SELF_MODIFICATION_FORBIDDEN');
  if (proposal.modifies_identity === true) throw new Error('IDENTITY_SELF_MODIFICATION_FORBIDDEN');
  if (proposal.production_graph_write_permitted === true) {
    throw new Error('PRODUCTION_GRAPH_SELF_MODIFICATION_FORBIDDEN');
  }

  const upgrade = {
    id: proposal.id,
    parent_capability_id: proposal.parent_capability_id || null,
    limitation_class: evolutionState.limitation.class,
    target_subject: evolutionState.limitation.subject,
    strategy: proposal.strategy,
    candidate_artifact_ref: proposal.candidate_artifact_ref || null,
    verification_suite_ref: proposal.verification_suite_ref || null,
    regression_suite_ref: proposal.regression_suite_ref || null,
    expected_effect: proposal.expected_effect || null,
    modifies_governance: false,
    modifies_authority: false,
    modifies_security: false,
    modifies_identity: false,
    production_graph_write_permitted: false,
    attempt_limit: Number.isInteger(proposal.attempt_limit) ? proposal.attempt_limit : 3,
  };

  return freeze({
    ...evolutionState,
    state: 'UPGRADE_PROPOSED',
    upgrade,
    upgrade_proposal_hash: digest(upgrade),
  });
}

export function authorizeUpgradeSandbox({
  evolutionState,
  authorization,
} = {}) {
  if (evolutionState?.state !== 'UPGRADE_PROPOSED') throw new Error('UPGRADE_NOT_PROPOSED');
  if (authorization?.approved !== true) {
    return freeze({
      ...evolutionState,
      state: 'BLOCKED',
      block_reason: 'UPGRADE_SANDBOX_NOT_AUTHORIZED',
    });
  }
  if (!text(authorization.authorization_ref)) throw new Error('UPGRADE_AUTHORIZATION_REF_REQUIRED');

  return freeze({
    ...evolutionState,
    state: 'AWAITING_AUTHORIZATION',
    sandbox_authorization: {
      authorization_ref: authorization.authorization_ref,
      authorized_by: authorization.authorized_by || 'explicit_human_authorization',
      scope: 'SANDBOX_ONLY',
      production_graph_write_permitted: false,
      governance_kernel_hash: evolutionState.governance_kernel_hash,
    },
    sandbox_authorization_hash: digest({
      upgrade_proposal_hash: evolutionState.upgrade_proposal_hash,
      authorization,
      governance_kernel_hash: evolutionState.governance_kernel_hash,
    }),
  });
}

export function beginSandboxExperiment({
  evolutionState,
  experiment,
} = {}) {
  if (evolutionState?.state !== 'AWAITING_AUTHORIZATION') {
    throw new Error('UPGRADE_SANDBOX_NOT_AUTHORIZED');
  }
  if (!experiment?.id) throw new Error('UPGRADE_EXPERIMENT_ID_REQUIRED');
  if (!text(experiment.ephemeral_worldline_id)) throw new Error('EPHEMERAL_WORLDLINE_REQUIRED');
  if (experiment.production_graph_write_permitted === true) {
    throw new Error('PRODUCTION_WRITE_FORBIDDEN_IN_SANDBOX');
  }

  const sandbox = {
    experiment_id: experiment.id,
    ephemeral_worldline_id: experiment.ephemeral_worldline_id,
    candidate_artifact_ref: experiment.candidate_artifact_ref || evolutionState.upgrade.candidate_artifact_ref,
    baseline_ref: experiment.baseline_ref || null,
    attempt: Number(experiment.attempt || 1),
    attempt_limit: evolutionState.upgrade.attempt_limit,
    production_graph_write_permitted: false,
    governance_kernel_hash: evolutionState.governance_kernel_hash,
  };

  if (sandbox.attempt > sandbox.attempt_limit) throw new Error('EVOLUTION_EXPERIMENT_BUDGET_EXHAUSTED');

  return freeze({
    ...evolutionState,
    state: 'SANDBOX_RUNNING',
    sandbox,
    sandbox_hash: digest(sandbox),
  });
}

export function verifyUpgradeExperiment({
  evolutionState,
  verification,
} = {}) {
  if (evolutionState?.state !== 'SANDBOX_RUNNING') throw new Error('SANDBOX_NOT_RUNNING');
  if (!verification?.experiment_id) throw new Error('EXPERIMENT_ID_REQUIRED');
  if (verification.experiment_id !== evolutionState.sandbox.experiment_id) {
    throw new Error('VERIFICATION_EXPERIMENT_MISMATCH');
  }
  if (verification.independently_verified !== true) {
    return freeze({
      ...evolutionState,
      state: 'BLOCKED',
      block_reason: 'INDEPENDENT_VERIFICATION_FAILED',
    });
  }
  if (verification.regression_passed !== true) {
    return freeze({
      ...evolutionState,
      state: 'BLOCKED',
      block_reason: 'REGRESSION_VALIDATION_FAILED',
    });
  }
  if (verification.governance_preserved !== true) {
    return freeze({
      ...evolutionState,
      state: 'BLOCKED',
      block_reason: 'GOVERNANCE_PRESERVATION_FAILED',
    });
  }
  if (verification.improvement_demonstrated !== true) {
    return freeze({
      ...evolutionState,
      state: 'BLOCKED',
      block_reason: 'IMPROVEMENT_NOT_DEMONSTRATED',
    });
  }
  if (!text(verification.verification_ref)) throw new Error('UPGRADE_VERIFICATION_REF_REQUIRED');

  const verifiedUpgrade = {
    ...clone(evolutionState.upgrade),
    experiment_id: evolutionState.sandbox.experiment_id,
    verification_ref: verification.verification_ref,
    independent_verification_ref: verification.independent_verification_ref || verification.verification_ref,
    regression_ref: verification.regression_ref || null,
    improvement_metrics: clone(verification.improvement_metrics || {}),
    capability_signature: verification.capability_signature || null,
  };

  return freeze({
    ...evolutionState,
    state: 'SANDBOX_VERIFIED',
    verified_upgrade: verifiedUpgrade,
    upgrade_verification_hash: digest({
      sandbox_hash: evolutionState.sandbox_hash,
      verifiedUpgrade,
    }),
  });
}

export function promoteVerifiedUpgrade({
  evolutionState,
  promotion,
} = {}) {
  if (evolutionState?.state !== 'SANDBOX_VERIFIED') throw new Error('VERIFIED_UPGRADE_REQUIRED');
  if (promotion?.approved !== true) {
    return freeze({
      ...evolutionState,
      state: 'BLOCKED',
      block_reason: 'UPGRADE_PROMOTION_NOT_AUTHORIZED',
    });
  }
  if (!text(promotion.promotion_ref)) throw new Error('PROMOTION_REF_REQUIRED');
  if (!text(evolutionState.verified_upgrade?.capability_signature)) {
    throw new Error('CAPABILITY_SIGNATURE_REQUIRED_FOR_PROMOTION');
  }

  return freeze({
    ...evolutionState,
    state: 'PROMOTED',
    promotion: {
      promotion_ref: promotion.promotion_ref,
      approved_by: promotion.approved_by || 'explicit_promotion_authority',
      target: 'CANONICAL_CAPABILITY_REGISTRY',
    },
    promotion_hash: digest({
      upgrade_verification_hash: evolutionState.upgrade_verification_hash,
      promotion,
    }),
  });
}

export function commitEvolutionLearning({
  evolutionState,
  verifiedOutcome,
  learningDelta,
} = {}) {
  if (evolutionState?.state !== 'PROMOTED') throw new Error('PROMOTED_UPGRADE_REQUIRED');
  if (verifiedOutcome?.kind !== 'VERIFIED_OUTCOME') {
    throw new Error('LEARNING_REQUIRES_VERIFIED_OUTCOME');
  }
  if (!learningDelta?.learning_delta_id) throw new Error('LEARNING_DELTA_REQUIRED');

  const learning = {
    source_outcome_id: verifiedOutcome.id,
    learning_delta_id: learningDelta.learning_delta_id,
    changed_claims: list(learningDelta.changed_claims),
    capability_effects: list(learningDelta.capability_effects),
    prior_state_id: learningDelta.prior_state_id || null,
  };

  return freeze({
    ...evolutionState,
    state: 'LEARNING_COMMITTED',
    learning,
    learning_commit_hash: digest({
      promotion_hash: evolutionState.promotion_hash,
      verifiedOutcome,
      learning,
    }),
  });
}

export function replanAfterLearning({
  evolutionState,
  updatedUniverseState,
} = {}) {
  if (evolutionState?.state !== 'LEARNING_COMMITTED') throw new Error('LEARNING_NOT_COMMITTED');
  if (!updatedUniverseState?.state_id) throw new Error('UPDATED_UNIVERSE_STATE_REQUIRED');
  if (updatedUniverseState.state_id === evolutionState.universe_state_id) {
    throw new Error('UNIVERSE_STATE_DID_NOT_ADVANCE');
  }

  return freeze({
    ...evolutionState,
    state: 'REPLANNED',
    prior_universe_state_id: evolutionState.universe_state_id,
    universe_state_id: updatedUniverseState.state_id,
    replan_reason: 'VERIFIED_LEARNING_CHANGED_AVAILABLE_STATE',
    replan_hash: digest({
      learning_commit_hash: evolutionState.learning_commit_hash,
      updatedUniverseState,
    }),
  });
}

export function selectNextEvolution({
  objective,
  universeState,
  limitations = [],
  opportunities = [],
} = {}) {
  if (!objective?.id) throw new Error('OBJECTIVE_REQUIRED');
  if (!universeState?.state_id) throw new Error('UNIVERSE_STATE_REQUIRED');

  const candidates = list(limitations).map((limitation) => {
    const matching = list(opportunities).filter((item) =>
      (item.limitation_class || limitation.class) === limitation.class
      && (item.target_subject || limitation.subject) === limitation.subject
    );

    const best = matching
      .map((item) => ({ ...clone(item), score: scoreOpportunity(item, objective, universeState) }))
      .sort((a, b) => b.score - a.score)[0];

    return {
      limitation,
      opportunity: best || null,
      score: best?.score || 0,
    };
  }).sort((a, b) => b.score - a.score);

  const selected = candidates[0] || null;

  return freeze({
    selection_version: REALITY_SELF_EVOLUTION_VERSION,
    objective_id: objective.id,
    universe_state_id: universeState.state_id,
    selected_limitation: selected?.limitation || null,
    selected_opportunity: selected?.opportunity || null,
    no_action: !selected || !selected.opportunity,
    selection_hash: digest({
      objective_id: objective.id,
      universe_state_id: universeState.state_id,
      selected,
    }),
  });
}
