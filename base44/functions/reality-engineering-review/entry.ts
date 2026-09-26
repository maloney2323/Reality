import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import {
  DIRECT_MODEL_PROVIDER_AUTHORITY,
  REALITY_OPENAI_MODEL,
  invokeOpenAiStructured,
} from '../../shared/reality-core/direct-model-provider.js';
import {
  REALITY_CODE_FILES,
  REALITY_CODE_INDEX_VERSION,
  REALITY_CODE_TREE_HASH,
} from '../../shared/personal-reality/generated-code-index.js';
import {
  buildCodeIntelligenceModel,
  queryCodeIntelligence,
} from '../../shared/personal-reality/code-intelligence-model.js';
import { SELF_MODEL_FACTS } from '../../shared/personal-reality/self-model.js';
import {
  BindingAssessment,
  ENGINEERING_REVIEW_V2_AUTHORITY,
  ENGINEERING_REVIEW_V2_VERSION,
  EngineeringReviewAdmissionError,
  EngineeringReviewerV2Role,
  EngineeringReviewV2Outcome,
  admitEngineeringReviewArtifactV2,
  createEngineeringBindingSlots,
  normalizeEngineeringReviewerVoteV2,
  synthesizeEngineeringReviewV2,
} from '../../shared/personal-reality/engineering-review-board-v2.js';
import {
  PRECEDENT_ENGINE_VERSION,
  deterministicRetrievePrecedents,
  evaluatePremiseWatches,
  evaluatePrecedentGate,
  normalizeEngineeringDecision,
  normalizeEngineeringPremise,
} from '../../shared/personal-reality/precedent-engine.js';

const FUNCTION_VERSION = 'reality-engineering-review-v0.2';
const REVIEWER_ROLES = Object.freeze(Object.values(EngineeringReviewerV2Role));

const REVIEW_SCHEMA = Object.freeze({
  type: 'object',
  properties: {
    role: { type: 'string', enum: REVIEWER_ROLES },
    outcome: { type: 'string', enum: Object.values(EngineeringReviewV2Outcome) },
    diagnosis: { type: 'string' },
    rationale: { type: 'string' },
    evidence_refs: { type: 'array', items: { type: 'string' } },
    code_refs: { type: 'array', items: { type: 'string' } },
    assumptions: { type: 'array', items: { type: 'string' } },
    invalidation_conditions: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
    required_verification: { type: 'array', items: { type: 'string' } },
    non_code_option: { type: 'string' },
    binding_assessments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          slot_id: { type: 'string' },
          assessment: { type: 'string', enum: Object.values(BindingAssessment) },
          rationale: { type: 'string' },
        },
        required: ['slot_id', 'assessment', 'rationale'],
      },
    },
    blocking_objections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          evidence_refs: { type: 'array', items: { type: 'string' } },
          binding_slot_refs: { type: 'array', items: { type: 'string' } },
          resolution_condition: { type: 'string' },
        },
        required: ['summary', 'evidence_refs', 'binding_slot_refs', 'resolution_condition'],
      },
    },
  },
  required: [
    'role', 'outcome', 'diagnosis', 'rationale', 'evidence_refs', 'code_refs',
    'assumptions', 'invalidation_conditions', 'risks', 'required_verification',
    'non_code_option', 'binding_assessments', 'blocking_objections',
  ],
});

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function text(value: unknown, max = 4000): string | null {
  return nonEmpty(value) ? value.trim().slice(0, max) : null;
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function requireAdmin(base44: ReturnType<typeof createClientFromRequest>) {
  try {
    const principal = await base44.auth.me();
    if (principal?.id && principal.role === 'admin') return principal;
  } catch {
    // Fail closed.
  }
  return null;
}

function reconstructStrategicCandidate(artifact: Record<string, any>) {
  const extension = artifact?.extension_data && typeof artifact.extension_data === 'object' ? artifact.extension_data : {};
  if (artifact?.artifact_type !== 'STRATEGIC_CANDIDATE_SIGNAL') throw new Error('SOURCE_ARTIFACT_TYPE_INVALID');
  if (artifact?.status !== 'CANDIDATE') throw new Error('SOURCE_STRATEGIC_ARTIFACT_NOT_CANDIDATE');
  if (extension.challenge_status !== 'UNREFUTED_IN_BOUNDED_RUN') throw new Error('SOURCE_STRATEGIC_CANDIDATE_NOT_UNREFUTED');
  if (!nonEmpty(extension.candidate_id)) throw new Error('SOURCE_CANDIDATE_ID_MISSING');
  return Object.freeze({
    candidate_id: extension.candidate_id,
    title: artifact.subject,
    conclusion: artifact.summary,
    gap_statement: extension.gap_statement || null,
    proposed_direction: extension.proposed_direction || null,
    horizon_question: extension.horizon_question || null,
    self_evidence_refs: Object.freeze([...(extension.self_evidence_refs || [])]),
    world_signal_refs: Object.freeze([...(extension.world_signal_refs || [])]),
    code_evidence_refs: Object.freeze([...(extension.code_evidence_refs || [])]),
    assumptions: Object.freeze([...(artifact.assumptions || [])]),
    alternative_explanations: Object.freeze([...(extension.alternative_explanations || [])]),
    falsifiers: Object.freeze([...(extension.falsifiers || [])]),
    challenge_status: extension.challenge_status,
  });
}

async function loadPrecedentContext(service: any, userId: string, { codeRefs, capabilityRefs }: { codeRefs: string[]; capabilityRefs: string[] }) {
  const [decisionRows, premiseRows] = await Promise.all([
    service.entities.DerivedArtifact.filter({ user_id: userId, artifact_type: 'ENGINEERING_DECISION' }, '-created_date', 500, 0),
    service.entities.DerivedArtifact.filter({ user_id: userId, artifact_type: 'ENGINEERING_PREMISE' }, '-created_date', 500, 0),
  ]);
  const knownCodeRefs = new Set(REALITY_CODE_FILES.map((item: any) => item.path));
  const knownCapabilityRefs = new Set(SELF_MODEL_FACTS.map((item: any) => item.id));
  const premiseIds = new Set((premiseRows || []).map((row: any) => row?.extension_data?.premise_id).filter(nonEmpty));
  const parsedDecisions = (decisionRows || []).map((row: any) => {
    try { return normalizeEngineeringDecision(row.extension_data || {}, { knownCodeRefs, knownCapabilityRefs, knownPremiseIds: premiseIds }); }
    catch { return null; }
  }).filter(Boolean);
  const supersededIds = new Set(parsedDecisions.map((item: any) => item.supersedes_decision_id).filter(nonEmpty));
  const decisions = parsedDecisions.map((item: any) => supersededIds.has(item.decision_id) ? Object.freeze({ ...item, status: 'SUPERSEDED' }) : item);
  const latestPremiseById = new Map();
  for (const row of premiseRows || []) {
    try {
      const premise = normalizeEngineeringPremise(row.extension_data || {});
      if (!latestPremiseById.has(premise.premise_id)) latestPremiseById.set(premise.premise_id, premise);
    } catch {
      // Ignore malformed non-authoritative precedent context; missing linked premise fails visibly below.
    }
  }
  const premises = [...latestPremiseById.values()];
  const applicable = deterministicRetrievePrecedents(decisions, { codeRefs, capabilityRefs });
  const linkedPremiseIds = [...new Set(applicable.flatMap((item: any) => item.premise_ids || []))];
  const premiseMap = new Map(premises.map((item: any) => [item.premise_id, item]));
  const premiseWatch = evaluatePremiseWatches(applicable, premiseMap);
  return Object.freeze({ applicable, linkedPremiseIds, premiseMap, premiseWatch });
}

async function findStrategicArtifact(service: any, userId: string, artifactId: string) {
  const rows = await service.entities.DerivedArtifact.filter(
    { user_id: userId, artifact_type: 'STRATEGIC_CANDIDATE_SIGNAL' },
    '-created_date', 100, 0,
  );
  return (rows || []).find((row: any) => row?.id === artifactId) || null;
}

function roleMandate(role: string): string {
  const mandates: Record<string, string> = {
    INVESTIGATOR: 'Determine what is actually known, what remains unverified, whether the diagnosis is supported, and what investigation is still missing. Prefer INVESTIGATE_MORE when causal diagnosis is weak.',
    ARCHITECT: 'Assess system boundaries, dependencies, architectural intent, smallest coherent scope, and whether a code change would create structural drift. Prefer SMALLER_CHANGE when scope can be reduced.',
    RISK_SECURITY: 'Look for security, privacy, data-integrity, authorization, rollback, migration, and hidden dependency risk. Put ordinary mitigable concerns in risks; use blocking_objections only for evidence-linked conditions that make planning unjustified or unsafe right now.',
    BUSINESS_VALUE: 'Ask whether code is the right way to solve the owner/business problem. Explicitly consider configuration, process, copy, training, or no change. Do not reward code generation for its own sake.',
    SKEPTIC_RESTRAINT: 'Argue the strongest evidence-based case for NO_CHANGE, NON_CODE_FIX, or INVESTIGATE_MORE. A blocking objection must identify a concrete unresolved condition, cite supplied evidence and/or a deterministic binding slot, and state what would resolve it; disagreement or generic caution is not blocking.',
    VERIFICATION_TEST: 'Define whether success can be observed and falsified, whether existing tests cover the risk, what new verification is required, and whether the proposed result can be distinguished from a cosmetic pass.',
  };
  return mandates[role] || 'Review the case conservatively.';
}

function buildReviewerPrompt({ role, sourceCandidate, codeQuery, allowedEvidenceRefs, bindingSlots, premiseWatch }: Record<string, any>): string {
  const files = (codeQuery?.files || []).map((item: any) => `- ${item.path} | ${item.kind} | exports ${(item.exports || []).join(', ') || '(none)'}`).join('\\n');
  const capabilities = (codeQuery?.capabilities || []).map((item: any) => `- ${item.fact_id}: ${item.text || item.claim || item.status || ''}`).join('\\n');
  const bindingText = (bindingSlots || []).map((slot: any) => {
    const body = slot.kind === 'PRECEDENT' ? slot.decision : slot.statement;
    return `- ${slot.slot_id} [${slot.kind}] status=${slot.status || 'UNKNOWN'}\\n  runtime-owned binding: ${slot.canonical_id}\\n  ${body || '(no text)'}`;
  }).join('\\n');
  return `You are ONE independent reviewer in Reality's pre-implementation Engineering Review Board v2.
You are the ${role} reviewer.

YOUR MANDATE:
${roleMandate(role)}

IMPORTANT INDEPENDENCE RULE:
You are voting before seeing any other reviewer's vote. Do not manufacture consensus or predict what other reviewers think.

SOURCE CANDIDATE (candidate-only, not verified truth):
- id: ${sourceCandidate.candidate_id}
- title: ${sourceCandidate.title}
- conclusion: ${sourceCandidate.conclusion}
- gap: ${sourceCandidate.gap_statement}
- proposed direction: ${sourceCandidate.proposed_direction}
- assumptions: ${(sourceCandidate.assumptions || []).join(' | ') || '(none)'}
- alternatives: ${(sourceCandidate.alternative_explanations || []).join(' | ') || '(none)'}
- falsifiers: ${(sourceCandidate.falsifiers || []).join(' | ') || '(none)'}

BOUNDED CODE CONTEXT:
${files || '(none)'}

RELEVANT SELF-MODEL/CAPABILITY CONTEXT:
${capabilities || '(none)'}

DETERMINISTIC BINDING SLOTS:
${bindingText || '(none)'}

PREMISE WATCH STATE:
- invalidated: ${(premiseWatch?.violated || []).map((item: any) => `${item.decision_id}/${item.premise_id}`).join(' | ') || '(none)'}
- stale/missing: ${(premiseWatch?.stale || []).map((item: any) => `${item.decision_id}/${item.premise_id}:${item.reason}`).join(' | ') || '(none)'}

ALLOWED EVIDENCE REFS (cite exact values only):
${[...allowedEvidenceRefs].join('\\n') || '(none)'}

BOUNDED OUTCOMES:
NO_CHANGE = evidence favors leaving code alone.
INVESTIGATE_MORE = diagnosis or required evidence is insufficient.
NON_CODE_FIX = the owner problem is better solved without changing code.
SMALLER_CHANGE = some change is warranted but the requested scope is broader than necessary.
PLAN_CHANGE = the proposed direction is already bounded enough and evidence supports planning it; this is NOT implementation approval.
ESCALATE = specialist/owner judgment is required before planning.

HARD RULES:
1. Code generation is not a goal. The safest correct answer may be NO_CHANGE.
2. Runtime owns canonical precedent/premise ids. You MUST assess every supplied slot exactly once using slot_id. Do not create, rename, or omit slots.
3. Use SUPPORTS_CURRENT_BOUNDARY when a still-valid binding supports restraint; CONFLICTS_WITH_REQUEST when a precedent conflicts with the requested direction; CHANGED_OR_INVALIDATED when a premise is explicitly invalidated by supplied state; STALE_OR_UNRESOLVED when the premise is stale/missing; otherwise NO_MATERIAL_EFFECT.
4. Put ordinary rollout, migration, rollback, testing, or monitoring concerns in risks and required_verification. Ordinary risk is NOT a veto.
5. blocking_objections are only for unresolved conditions that make planning unjustified or unsafe right now. Every blocking objection MUST cite at least one exact allowed evidence_ref and/or binding_slot_ref and MUST state a concrete resolution_condition.
6. If a required specialist authority is absent, choose ESCALATE. Do not hide that requirement as generic risk.
7. evidence_refs and code_refs may only contain exact supplied refs/current file paths. Unknown refs are discarded; unknown refs inside a blocking objection fail admission.
8. If a binding premise is invalidated and governed evidence supports reconsideration, report the slot assessment honestly; you do not overrule the precedent. A separate deterministic gate controls overrule.
9. A stale premise is not proof of the opposite. Prefer investigation unless evidence warrants another bounded outcome.
10. If the requested change is already narrowly scoped and its explicit temporary exit condition has occurred, prefer PLAN_CHANGE rather than SMALLER_CHANGE merely because tests or rollout work remain.
11. Do not claim the candidate is true, verified, safe, approved, or authorized. Do not output code, deployment instructions, chain-of-thought, or hidden reasoning.
12. Return concise decision rationale, not an essay.

Return only the schema object.`;
}

function structuralRepairPrompt({ originalPrompt, role, errorCode, bindingSlots }: Record<string, any>): string {
  const slots = (bindingSlots || []).map((slot: any) => `${slot.slot_id} [${slot.kind}] ${slot.canonical_id}`).join(' | ') || '(none)';
  return `${originalPrompt}\n\nSTRUCTURAL REPAIR — ONE ATTEMPT ONLY:\nYour first response failed structural admission with error code ${errorCode}. Correct the structure only. Do not change your judgment merely to satisfy a presumed expected answer. You still have no access to any other reviewer vote or synthesis result. Required deterministic slots are: ${slots}. Return one complete schema object.`;
}

async function invokeReviewer(payload: Record<string, unknown>) {
  return invokeOpenAiStructured({
    apiKey: secrets.get('OPENAI_API_KEY'),
    prompt: String(payload.prompt || ''),
    response_json_schema: REVIEW_SCHEMA,
    schemaName: 'reality_engineering_reviewer_vote',
    model: REALITY_OPENAI_MODEL,
  });
}

export default async function (req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'INVALID_JSON' }, 400); }

  const base44 = createClientFromRequest(req);
  const principal = await requireAdmin(base44);
  if (!principal) return json({ error: 'ADMIN_REQUIRED' }, 403);
  const service = base44.asServiceRole;
  const action = text(body.action, 40) || 'status';

  if (action === 'status') {
    return json({
      source_version: FUNCTION_VERSION,
      review_version: ENGINEERING_REVIEW_V2_VERSION,
      authority: ENGINEERING_REVIEW_V2_AUTHORITY,
      mode: 'admin_explicit_pre_implementation_review',
      reviewer_roles: REVIEWER_ROLES,
      bounded_outcomes: Object.values(EngineeringReviewV2Outcome),
      independent_calls: true,
      cross_vote_context_before_vote: false,
      model_transport: DIRECT_MODEL_PROVIDER_AUTHORITY,
      model: REALITY_OPENAI_MODEL,
      model_family_diversity_established: false,
      blocking_objection_blocks_plan_change: true,
      ordinary_risk_blocks_plan_change: false,
      deterministic_binding_slots: true,
      max_structural_repair_attempts: 1,
      precedent_engine_version: PRECEDENT_ENGINE_VERSION,
      precedent_engine_implemented: true,
      precedent_retrieval_mode: 'DETERMINISTIC_EXACT_SCOPE_MATCH',
      vector_retrieval_required_for_binding_precedent: false,
      implementation_authorized: false,
      code_write_authorized: false,
      deploy_authorized: false,
      action_authorized: false,
    });
  }

  if (action !== 'run') return json({ error: 'UNKNOWN_ACTION', allowed: ['status', 'run'] }, 400);
  const strategicArtifactId = text(body.strategic_artifact_id, 300);
  if (!strategicArtifactId) return json({ error: 'STRATEGIC_ARTIFACT_ID_REQUIRED' }, 400);

  try {
    const sourceArtifact = await findStrategicArtifact(service, principal.id, strategicArtifactId);
    if (!sourceArtifact) return json({ error: 'STRATEGIC_ARTIFACT_NOT_FOUND' }, 404);
    const sourceCandidate = reconstructStrategicCandidate(sourceArtifact);

    const codeModel = buildCodeIntelligenceModel({
      codeFiles: REALITY_CODE_FILES,
      selfModelFacts: SELF_MODEL_FACTS,
      codeTreeHash: REALITY_CODE_TREE_HASH,
      codeIndexVersion: REALITY_CODE_INDEX_VERSION,
    });
    const codeQuery = queryCodeIntelligence({
      model: codeModel,
      message: [
        sourceCandidate.title,
        sourceCandidate.gap_statement,
        sourceCandidate.proposed_direction,
        'root cause dependencies architectural intent security business value restraint verification tests smallest change non-code alternative',
      ].filter(Boolean).join('\n'),
      maxCapabilities: 24,
      maxFiles: 60,
    });

    const allowedCodeRefs = new Set((codeQuery.files || []).map((item: any) => item.path));
    const allowedEvidenceRefs = new Set([
      sourceArtifact.id,
      ...(sourceCandidate.self_evidence_refs || []),
      ...(sourceCandidate.world_signal_refs || []),
      ...(sourceCandidate.code_evidence_refs || []),
      ...(codeQuery.capabilities || []).map((item: any) => item.fact_id),
      ...allowedCodeRefs,
    ].filter(nonEmpty));

    const precedentContext = await loadPrecedentContext(service, principal.id, {
      codeRefs: [...allowedCodeRefs],
      capabilityRefs: (codeQuery.capabilities || []).map((item: any) => item.fact_id).filter(nonEmpty),
    });
    const expectedPrecedentIds = precedentContext.applicable.map((item: any) => item.decision_id);
    const linkedPremises = precedentContext.linkedPremiseIds.map((id: string) => precedentContext.premiseMap.get(id)).filter(Boolean);
    const bindingSlots = createEngineeringBindingSlots({
      precedents: precedentContext.applicable,
      premises: linkedPremises,
    });

    const reviewerResults = await Promise.all(REVIEWER_ROLES.map(async (role) => {
      const originalPrompt = buildReviewerPrompt({
        role,
        sourceCandidate,
        codeQuery,
        allowedEvidenceRefs,
        bindingSlots,
        premiseWatch: precedentContext.premiseWatch,
      });
      const attempts: any[] = [];
      let prompt = originalPrompt;
      let firstPassAdmitted = false;

      for (let attempt = 1; attempt <= 2; attempt += 1) {
        let raw: any = null;
        try {
          raw = await invokeReviewer({ prompt });
          const vote = normalizeEngineeringReviewerVoteV2({ ...raw, role }, {
            expectedRole: role,
            allowedEvidenceRefs,
            allowedCodeRefs,
            bindingSlots,
          });
          if (attempt === 1) firstPassAdmitted = true;
          attempts.push(Object.freeze({
            attempt,
            admitted: true,
            error_code: null,
            raw_output: raw,
          }));
          return Object.freeze({
            role,
            vote,
            diagnostic: Object.freeze({
              role,
              first_pass_admitted: firstPassAdmitted,
              final_admitted: true,
              attempt_count: attempt,
              final_admission_code: 'ADMITTED',
              attempts: Object.freeze(attempts),
            }),
          });
        } catch (error) {
          const admissionError = error instanceof EngineeringReviewAdmissionError;
          const errorCode = admissionError ? error.code : 'MODEL_OR_TRANSPORT_FAILURE';
          attempts.push(Object.freeze({
            attempt,
            admitted: false,
            error_code: errorCode,
            raw_output: raw,
          }));
          if (attempt === 1 && admissionError) {
            prompt = structuralRepairPrompt({
              originalPrompt,
              role,
              errorCode,
              bindingSlots,
            });
            continue;
          }
          return Object.freeze({
            role,
            vote: null,
            diagnostic: Object.freeze({
              role,
              first_pass_admitted: false,
              final_admitted: false,
              attempt_count: attempt,
              final_admission_code: errorCode,
              attempts: Object.freeze(attempts),
            }),
          });
        }
      }

      return Object.freeze({
        role,
        vote: null,
        diagnostic: Object.freeze({
          role,
          first_pass_admitted: false,
          final_admitted: false,
          attempt_count: 2,
          final_admission_code: 'REPAIR_BUDGET_EXHAUSTED',
          attempts: Object.freeze(attempts),
        }),
      });
    }));

    const votes = reviewerResults.map((item) => item.vote).filter(Boolean);
    const reviewerDiagnostics = reviewerResults.map((item) => item.diagnostic);
    const failedRoles = reviewerResults.filter((item) => !item.vote).map((item) => item.role);

    const precedentGate = evaluatePrecedentGate({
      applicablePrecedents: precedentContext.applicable,
      reviewerVotes: votes,
      overruleRequest: body.precedent_overrule && typeof body.precedent_overrule === 'object' ? body.precedent_overrule : null,
      allowedNewEvidenceRefs: allowedEvidenceRefs,
    });
    const synthesis = synthesizeEngineeringReviewV2(votes, { failedRoles, precedentGate, reviewerDiagnostics });
    const now = new Date().toISOString();
    const artifactAdmission = await admitEngineeringReviewArtifactV2({
      service,
      principal,
      sourceArtifact,
      sourceCandidate,
      votes,
      synthesis,
      codeTreeHash: REALITY_CODE_TREE_HASH,
      codeIndexVersion: REALITY_CODE_INDEX_VERSION,
      reviewerDiagnostics,
      bindingSlots,
      precedentContext: {
        applicable_precedent_ids: expectedPrecedentIds,
        linked_premise_ids: precedentContext.linkedPremiseIds,
        premise_watch: precedentContext.premiseWatch,
      },
      producedAt: now,
    });

    return json({
      source_version: FUNCTION_VERSION,
      review_version: ENGINEERING_REVIEW_V2_VERSION,
      source_strategic_artifact: {
        artifact_id: sourceArtifact.id,
        candidate_id: sourceCandidate.candidate_id,
        challenge_status: sourceCandidate.challenge_status,
        verified: false,
      },
      frozen_snapshot: {
        code_tree_hash: REALITY_CODE_TREE_HASH,
        code_index_version: REALITY_CODE_INDEX_VERSION,
      },
      investigation: {
        bounded_code_refs: [...allowedCodeRefs],
        allowed_evidence_refs: [...allowedEvidenceRefs],
        code_scope_found: allowedCodeRefs.size > 0,
        semantic_change_established: false,
      },
      precedent_context: {
        engine_version: PRECEDENT_ENGINE_VERSION,
        retrieval_mode: 'DETERMINISTIC_EXACT_SCOPE_MATCH',
        applicable_precedents: precedentContext.applicable,
        linked_premises: linkedPremises,
        premise_watch: precedentContext.premiseWatch,
        vector_retrieval_required_for_binding_precedent: false,
      },
      reviewer_votes: votes,
      reviewer_diagnostics: reviewerDiagnostics,
      deterministic_binding_slots: bindingSlots,
      review_failures: failedRoles,
      precedent_gate: precedentGate,
      synthesis,
      artifact_admission: artifactAdmission,
      next_step: synthesis.outcome === EngineeringReviewV2Outcome.PLAN_CHANGE ? 'PLAN_CHANGE' : synthesis.outcome,
      precedent_engine_consulted: true,
      precedent_engine_implemented: true,
      implementation_authorized: false,
      code_write_authorized: false,
      deploy_authorized: false,
      governance_change_authorized: false,
      self_model_promotion_authorized: false,
      action_authorized: false,
    });
  } catch (error) {
    console.error('reality-engineering-review failed', error);
    return json({
      source_version: FUNCTION_VERSION,
      error: 'ENGINEERING_REVIEW_FAILED_CLOSED',
      outcome: EngineeringReviewV2Outcome.INVESTIGATE_MORE,
      diagnostic: error instanceof Error ? error.message : String(error),
      plan_change_unlocked: false,
      implementation_authorized: false,
      code_write_authorized: false,
      deploy_authorized: false,
      action_authorized: false,
    }, 500);
  }
}