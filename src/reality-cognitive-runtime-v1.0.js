// Reality Cognitive Runtime v1.0
// Vercel-owned cognitive boundary. The underlying model is replaceable;
// Reality owns routing, context, evidence discipline, continuity, and governance.

import { invokeRealityModel } from './reality-model-gateway-v0.1.js';

export const REALITY_COGNITIVE_RUNTIME_VERSION = 'reality-cognitive-runtime-v1.0';

const DEFAULT_MODEL = process.env.REALITY_OPENAI_MODEL || 'gpt-5.6-luna';

function textOf(message) {
  return String(message || '').trim();
}

function needsDeepReasoning(message) {
  const q = textOf(message).toLowerCase();
  return /\b(why|how should|what do you think|assessment|assess|analy[sz]e|audit|inspect|compare|research|investigate|prove|evidence|architecture|capability|governance|builder|reality|plan|strategy|problem|broken|wrong)\b/.test(q)
    || q.length > 1800;
}

function buildCognitionContext(systemContext, universeEntries) {
  const entries = Array.isArray(universeEntries) ? universeEntries.slice(0, 100) : [];
  return {
    ...(systemContext || {}),
    universe_context_available: entries.length > 0,
    universe_context_entries: entries,
    universe_context_count: entries.length,
  };
}

function lanePrompt(name, message, systemContext) {
  const role = {
    OBSERVER: 'Reconstruct what is actually present in the supplied context. Separate observations, prior user statements, inference, and unknowns.',
    VERIFIER: 'Challenge unsupported assumptions. Check internal consistency, authority boundaries, and whether the proposed answer is actually supported.',
    ADVERSARY: 'Look for failure modes, contradictions, missing evidence, identity confusion, and places where a generic model could impersonate Reality or overclaim.',
  }[name];

  return `You are the ${name} lane inside Reality's governed cognitive runtime.

Your task: ${role}

This is analysis for Reality, not an independent truth source. Do not grant authority, invent evidence, claim execution, or speak as ChatGPT/OpenAI.

USER MESSAGE:
${textOf(message)}

AVAILABLE REALITY CONTEXT:
${JSON.stringify(systemContext || null)}

Return a concise analysis with:
1. supported observations
2. important inference
3. contradictions or missing evidence
4. recommended response basis
5. authority/execution boundary`;
}

function synthesisPrompt(message, context, lanes) {
  return `You are Reality's governed cognitive synthesis layer.

Combine three independent analyses of the same user message.

USER MESSAGE:
${textOf(message)}

REALITY CONTEXT:
${JSON.stringify(context || null)}

LANE ANALYSES:
${lanes.map((x) => `--- ${x.name} ---\n${x.answer}`).join('\n\n')}

Rules:
- Agreement is a signal, not proof.
- Preserve material disagreement.
- Never invent evidence or memory.
- Never claim Reality performed an external action unless the supplied context contains verification.
- Never infer authorization from user intent.
- Answer as Reality, not as ChatGPT or OpenAI.
- Be direct and useful.
- If the evidence is insufficient, say exactly what is missing.

Return only the answer text for the user.`;
}

export async function runRealityCognitiveRuntime({
  message,
  systemContext = null,
  universeEntries = [],
  model = DEFAULT_MODEL,
  apiKey,
  fetchImpl = fetch,
  governedSignal,
} = {}) {
  if (!textOf(message)) throw new Error('MESSAGE_REQUIRED');

  const cognitionContext = buildCognitionContext(systemContext, universeEntries);

  if (!needsDeepReasoning(message)) {
    const result = await invokeRealityModel({
      governedSignal,
      systemContext: cognitionContext,
      model,
      apiKey,
      fetchImpl,
    });
    return {
      runtime_version: REALITY_COGNITIVE_RUNTIME_VERSION,
      mode: 'FAST',
      answer: result.answer,
      model: result.model,
      response_id: result.response_id,
      materiality: result.materiality,
      lanes: [],
      synthesis: null,
      authority_granted: false,
      execution_authorized: false,
      universe_context_count: cognitionContext.universe_context_count,
    };
  }

  const laneNames = ['OBSERVER', 'VERIFIER', 'ADVERSARY'];

  // Deep cognition used to execute the three independent lanes sequentially.
  // A medium/long user message therefore turned one request into four serial
  // provider calls (3 lanes + synthesis), making the production path fragile.
  // Run the independent lanes concurrently; synthesis remains the only second
  // round. This preserves the cognitive architecture while materially reducing
  // end-to-end latency and timeout risk.
  const laneResults = await Promise.all(
    laneNames.map(async (name) => {
      const lane = await invokeRealityModel({
        governedSignal,
        systemContext: {
          ...cognitionContext,
          cognitive_lane: name,
          cognitive_instruction: lanePrompt(name, message, cognitionContext),
        },
        model,
        apiKey,
        fetchImpl,
      });
      return { name, answer: lane.answer, response_id: lane.response_id, model: lane.model };
    }),
  );
  const lanes = laneResults;

  const synthesisSignal = governedSignal;
  const synthesis = await invokeRealityModel({
    governedSignal: synthesisSignal,
    systemContext: {
      ...cognitionContext,
      cognitive_mode: 'GOVERNED_MULTI_LANE_SYNTHESIS',
      cognitive_instruction: synthesisPrompt(message, cognitionContext, lanes),
    },
    model,
    apiKey,
    fetchImpl,
  });

  return {
    runtime_version: REALITY_COGNITIVE_RUNTIME_VERSION,
    mode: 'DEEP',
    answer: synthesis.answer,
    model: synthesis.model,
    response_id: synthesis.response_id,
    materiality: synthesis.materiality,
    lanes,
    synthesis: {
      response_id: synthesis.response_id,
      source_lane_count: lanes.length,
      disagreements_preserved: true,
    },
    authority_granted: false,
    execution_authorized: false,
    universe_context_count: cognitionContext.universe_context_count,
  };
}
