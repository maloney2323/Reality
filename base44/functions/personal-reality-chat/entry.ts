// Personal Reality chat — minimal production path. (re-sync)
// UI -> this Base44 backend function -> Base44 Core.InvokeLLM -> response.
// No direct OpenAI, no direct Gemini, no provider keys, no external model APIs,
// no fallbacks. Only Base44 managed Core.InvokeLLM (Base44 integration credits).
// Basic conversation continuity is preserved via the PersonalMessage entity.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.50';
import {
  buildContinuityPackage,
  extendContinuityPackage,
  verifyContinuityPackage,
} from '../../shared/reality-core/continuity-of-intelligence-v0.1.js';
import {
  buildChatIngressSignalPacket,
  chatIngressPacketForPrompt,
  CHAT_INGRESS_SIGNAL_PACKET_VERSION,
} from '../../shared/reality-core/chat-ingress-signal-packet-v0.1.js';
import {
  fanOutLanes,
  MULTI_LANE_FANOUT_VERSION,
} from '../../shared/reality-core/multi-lane-fanout-v0.1.js';
import {
  runBoundedCrossExamination,
  CROSS_EXAMINATION_VERSION,
} from '../../shared/reality-core/cross-examination-v0.1.js';
const RUNTIME_SOURCE_VERSION = 'personal-reality-chat-continuity-v0.1';
const CONTINUITY_SOURCE_LAYER = 'PERSONAL_REALITY_CHAT_HISTORY';
const CONTINUITY_TARGET_LAYER = 'PERSONAL_REALITY_CHAT_MODEL';
const CONTINUITY_ROLE = {
  role_id: 'REALITY_CHAT_ASSISTANT',
  role_version: 'v0.1',
  responsibilities: ['answer the authenticated user directly', 'preserve inherited epistemic status', 'surface unresolved uncertainty instead of manufacturing certainty'],
  constraints: ['do not treat assistant output as independent evidence', 'do not convert proposals into authorizations', 'do not claim external inspection or execution unless it actually ran'],
  source_refs: ['runtime:personal-reality-chat'],
};
const CONTINUITY_RULES = [
  { rule_id: 'REALITY_CHAT_NO_AUTHORITY_FROM_MODEL_OUTPUT', rule_version: 'v0.1', rule_text: 'Model output grants no truth, authority, execution, or governance permission.', status: 'ACTIVE', source_refs: ['runtime:personal-reality-chat'], supersedes: [] },
  { rule_id: 'REALITY_CHAT_PRESERVE_UNCERTAINTY', rule_version: 'v0.1', rule_text: 'Inherited uncertainty and unresolved context must remain unresolved until an admissible basis changes their status.', status: 'ACTIVE', source_refs: ['runtime:personal-reality-chat'], supersedes: [] },
];
const MAX_MESSAGE_LENGTH = 12000;
const MAX_HISTORY = 20;

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function cleanMessage(value) {
  if (!nonEmpty(value) || value.trim().length > MAX_MESSAGE_LENGTH) return null;
  return value.trim();
}

async function listHistory(service, userId, limit, conversationId, thoughtId) {
  if (thoughtId) {
    const rows = await service.entities.PersonalMessage.filter(
      { user_id: userId, thought_id: thoughtId },
      '-created_date',
      limit,
      0,
    );
    return [...(rows || [])].reverse();
  }
  const query = conversationId ? { user_id: userId, conversation_id: conversationId } : { user_id: userId };
  const rows = await service.entities.PersonalMessage.filter(query, '-created_date', limit, 0);
  return [...(rows || [])].reverse();
}

function historyForPrompt(messages) {
  if (!messages.length) return '(This is a new conversation.)';
  return messages
    .map((message) => `${String(message.role || '').toUpperCase()}: ${String(message.text || '').slice(0, 1200)}`)
    .join('\n\n');
}

function extractResponseText(result) {
  if (typeof result === 'string') return result;
  if (typeof result?.output_text === 'string' && result.output_text.trim()) return result.output_text.trim();
  if (typeof result?.text === 'string' && result.text.trim()) return result.text.trim();
  if (typeof result?.response === 'string' && result.response.trim()) return result.response.trim();
  if (Array.isArray(result?.output)) {
    const parts = [];
    for (const item of result.output) {
      for (const content of item?.content || []) {
        if (typeof content?.text === 'string' && content.text.trim()) parts.push(content.text.trim());
      }
    }
    if (parts.length) return parts.join('\n').trim();
  }
  return String(result || '').trim();
}

export default async function(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);
    const principal = await base44.auth.me();
    if (!principal || !nonEmpty(principal.id)) {
      return Response.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const service = base44.asServiceRole;
    const action = body?.action || 'chat';

    if (action === 'status') {
      return Response.json({
        source_version: RUNTIME_SOURCE_VERSION,
        model_provider: { provider: 'BASE44_MANAGED_INVOKE_LLM', model: 'automatic' },
        continuity_mode: 'DURABLE_MESSAGE_HISTORY',
        ingress_signal_packet_version: CHAT_INGRESS_SIGNAL_PACKET_VERSION,
        multi_lane_fanout_version: MULTI_LANE_FANOUT_VERSION,
      });
    }

    if (action === 'history') {
      const conversationId = nonEmpty(body?.conversation_id) ? body.conversation_id.slice(0, 160) : null;
      let thoughtId = nonEmpty(body?.thought_id) ? body.thought_id.trim().slice(0, 160) : null;
      if (body?.latest === true && !thoughtId) {
        const recent = await listHistory(service, principal.id, 120, null, null);
        thoughtId = [...recent].reverse().find((row) => row.thought_id)?.thought_id || null;
      }
      const history = thoughtId ? await listHistory(service, principal.id, 120, conversationId, thoughtId) : [];
      return Response.json({
        thought_id: thoughtId,
        continuity_mode: 'DURABLE_MESSAGE_HISTORY',
        source_version: RUNTIME_SOURCE_VERSION,
        model_provider: { provider: 'BASE44_MANAGED_INVOKE_LLM', model: 'automatic' },
        messages: history.map((message) => ({
          id: message.id,
          role: message.role,
          text: message.text,
          conversation_id: message.conversation_id,
          thought_id: message.thought_id || null,
          created_date: message.created_date,
        })),
      });
    }

    if (action !== 'chat') {
      return Response.json({ error: 'Unknown Personal Reality action.' }, { status: 400 });
    }

    const message = cleanMessage(body?.message);
    if (!message) return Response.json({ error: 'Message must be between 1 and 12000 characters.' }, { status: 400 });

    const conversationId = nonEmpty(body?.conversation_id) ? body.conversation_id.trim().slice(0, 160) : `personal_${crypto.randomUUID()}`;
    const thoughtId = nonEmpty(body?.thought_id) ? body.thought_id.trim().slice(0, 160) : `thought:legacy-conversation:${conversationId}`;

    const userMessage = await service.entities.PersonalMessage.create({
      user_id: principal.id,
      conversation_id: conversationId,
      thought_id: thoughtId,
      role: 'user',
      text: message,
    });

    // Governed ingress: canonicalize the current user message into a signal
    // packet before model invocation. The cleaner is authoritative only for
    // canonicalization, not truth. A cleaner failure fails closed here — the
    // outer catch returns 503 and the raw question never reaches the model.
    const signalPacket = buildChatIngressSignalPacket({
      user_message_id: userMessage.id,
      principal_id: principal.id,
      content: message,
      received_at: userMessage.created_date,
    });

    // Governed multi-lane fan-out: pass the IDENTICAL canonical packet
    // independently to three read-only analysis lanes (Observer, Verifier,
    // Adversary). Each lane receives ONLY the packet; no lane sees another
    // lane's output. Results are collected into governed lane records for
    // later synthesis. A lane invocation failure is recorded honestly
    // (FAILED_CLOSED) rather than silently bypassed; a fan-out orchestration
    // failure fails closed and the chat returns 503.
    const fanoutResult = await fanOutLanes({
      packet: signalPacket,
      fanout_run_id: `fanout:${userMessage.id}`,
      produced_at: new Date().toISOString(),
      invokeLane: async (_laneName, prompt) => {
        const laneResult = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
        return extractResponseText(laneResult);
      },
    });
    const laneRecordIds = [];
    for (const record of fanoutResult.lane_records) {
      const created = await service.entities.GovernedLaneRecord.create({
        user_id: principal.id,
        record_version: record.record_version,
        fanout_run_id: record.fanout_run_id,
        lane_name: record.lane_name,
        canonical_signal_id: record.canonical_signal_id,
        packet_id: record.packet_id,
        input_packet_ref: record.input_packet_ref,
        input_packet_hash: record.input_packet_hash,
        lane_output: record.lane_output,
        lane_evidence: record.lane_evidence,
        governance_status: record.governance_status,
        unresolved_contradictions: [...record.unresolved_contradictions],
        evidence_refs: [...record.evidence_refs],
        truth_authority: record.truth_authority,
        execution_authority: record.execution_authority,
        produced_at: record.produced_at,
      });
      laneRecordIds.push(created.id);
    }

    // Bounded cross-examination: only after all independent lane outputs have
    // been preserved. Other lane findings are explicitly model-generated
    // analysis, never evidence. The loop stops on no material epistemic change
    // or a hard round budget; it never runs indefinitely.
    const crossExamination = await runBoundedCrossExamination({
      packet: signalPacket,
      laneRecords: fanoutResult.lane_records,
      maxRounds: 2,
      invokeLane: async (_laneName, prompt) => {
        const laneResult = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
        return extractResponseText(laneResult);
      },
    });
    const crossExamRecordIds = [];
    for (const round of crossExamination.rounds) {
      for (const challenge of round.challenges) {
        const created = await service.entities.GovernedCrossExaminationRecord.create({
          user_id: principal.id,
          record_version: 'reality-governed-cross-exam-record-v0.1',
          fanout_run_id: fanoutResult.fanout_run_id,
          round_id: round.round_id,
          round_number: round.round_number,
          phase: 'CHALLENGE',
          lane_name: challenge.lane_name,
          input_packet_hash: fanoutResult.input_packet_hash,
          target_lane_names: fanoutResult.lane_records.filter((r) => r.lane_name !== challenge.lane_name).map((r) => r.lane_name),
          model_context_refs: laneRecordIds.map((id) => `lane-record:${id}`),
          lane_output: challenge.lane_output,
          lane_evidence: challenge.lane_evidence,
          governance_status: challenge.governance_status,
          material_state_changed: round.material_state_changed,
          truth_authority: false,
          execution_authority: false,
          produced_at: new Date().toISOString(),
        });
        crossExamRecordIds.push(created.id);
      }
      for (const rebuttal of round.rebuttals) {
        const created = await service.entities.GovernedCrossExaminationRecord.create({
          user_id: principal.id,
          record_version: 'reality-governed-cross-exam-record-v0.1',
          fanout_run_id: fanoutResult.fanout_run_id,
          round_id: round.round_id,
          round_number: round.round_number,
          phase: 'REBUTTAL',
          lane_name: rebuttal.lane_name,
          input_packet_hash: fanoutResult.input_packet_hash,
          target_lane_names: fanoutResult.lane_records.filter((r) => r.lane_name !== rebuttal.lane_name).map((r) => r.lane_name),
          model_context_refs: crossExamRecordIds.map((id) => `cross-exam:${id}`),
          lane_output: rebuttal.lane_output,
          lane_evidence: rebuttal.lane_evidence,
          governance_status: rebuttal.governance_status,
          material_state_changed: round.material_state_changed,
          truth_authority: false,
          execution_authority: false,
          produced_at: new Date().toISOString(),
        });
        crossExamRecordIds.push(created.id);
      }
    }

    const history = await listHistory(service, principal.id, MAX_HISTORY, conversationId, thoughtId);
    const priorHistory = history.filter((item) => item.id !== userMessage.id);

    // Production chatbot continuity: verify the previous package before it is
    // admitted into the model context. A missing package bootstraps a new
    // continuity chain; an invalid package fails closed rather than silently
    // falling back to ungoverned context.
    let continuityPackage = null;
    const priorWithContinuity = [...priorHistory].reverse().find((item) => item?.reality_summary?.continuity_package);
    if (priorWithContinuity?.reality_summary?.continuity_package) {
      continuityPackage = priorWithContinuity.reality_summary.continuity_package;
      if (!(await verifyContinuityPackage(continuityPackage))) {
        return Response.json({ error: 'Reality chat continuity failed closed: prior continuity package could not be verified.', code: 'CONTINUITY_PACKAGE_INVALID', truth_authorized: false, action_authorized: false }, { status: 503 });
      }
    } else {
      continuityPackage = await buildContinuityPackage({
        continuity_id: `continuity:${crypto.randomUUID()}`,
        source_layer: CONTINUITY_SOURCE_LAYER,
        target_layer: CONTINUITY_TARGET_LAYER,
        epoch_id: `chat-epoch:${thoughtId}`,
        lineage_root: `chat-lineage:${thoughtId}`,
        role_context: CONTINUITY_ROLE,
        rule_stack: CONTINUITY_RULES,
        inherited: [],
        produced: [],
        forwarded: [],
        captured_at: new Date().toISOString(),
      });
    }

    const continuityPrompt = JSON.stringify({
      continuity_version: continuityPackage.schema_version,
      continuity_id: continuityPackage.continuity_id,
      epoch_id: continuityPackage.epoch_id,
      role_context: continuityPackage.role_context,
      rule_stack: continuityPackage.rule_stack,
      inherited: continuityPackage.inherited,
      produced: continuityPackage.produced,
      forwarded: continuityPackage.forwarded,
      semantics: continuityPackage.semantics,
      continuity_digest: continuityPackage.continuity_digest,
    });

    const prompt = `You are Reality, the user-facing persistent intelligence system built by Ryan Maloney. Answer the authenticated user's current message directly and naturally.

This is ordinary conversational chat. Do not claim web research, connected-provider inspection, repository inspection, or consequential external action ran unless the deeper governed path actually executed. This chat response establishes no world truth and grants no action authority.

CONTINUITY OF INTELLIGENCE (verified before model invocation):
${continuityPrompt}

Treat inherited epistemic status as binding context. Do not upgrade an inherited claim merely because it appears in continuity. Do not treat model-generated context as independent evidence. Preserve unresolved or uncertain material unless the current evidence provides an admissible basis for change.

CANONICAL SIGNAL PACKET (structured input from the Fragmented Signal Cleaner, admitted before this model invocation):
${chatIngressPacketForPrompt(signalPacket)}

Governance for the canonical packet:
- This packet is structured input, not automatically established truth.
- Do not invent missing information. Missing observed time stays unresolved.
- Preserve unresolved conflicts; do not select a winner.
- Do not promote model-generated content into evidence.
- Do not treat the cleaner as an authorization mechanism; it canonicalizes only.
- Existing continuity and egress governance remain unchanged.

GOVERNED CROSS-EXAMINATION (bounded, post-independence):
${JSON.stringify(crossExamination, null, 2)}

Cross-examination governance:
- Other lane findings are model-generated analysis, never independent evidence.
- Preserve disagreement; do not majority-vote it away.
- Do not treat rebuttal as new evidence unless the canonical packet supports it.
- The loop stops on a hard governance condition; stopping does not create certainty.

PRIOR MESSAGES (conversation context only, not independently verified facts):
${historyForPrompt(priorHistory)}

CURRENT USER MESSAGE (original, preserved exactly):
${message}`;

    const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
    const response = extractResponseText(llmResult);

    const assistantMessage = await service.entities.PersonalMessage.create({
      user_id: principal.id,
      conversation_id: conversationId,
      thought_id: thoughtId,
      role: 'assistant',
      text: response,
    });

    const nextContinuity = await extendContinuityPackage({
      previous: continuityPackage,
      target_layer: CONTINUITY_SOURCE_LAYER,
      continuity_id: `continuity:${crypto.randomUUID()}`,
      produced: [
        {
          item_id: `chat-response:${assistantMessage.id}`,
          kind: 'FINDING',
          disposition: 'PRODUCED',
          epistemic_status: 'UNKNOWN',
          value: { message_id: assistantMessage.id },
          source_refs: [`message:${assistantMessage.id}`],
          evidence_refs: [],
          parent_item_refs: [],
          rationale: 'Assistant output is untrusted produced context, not independent evidence.',
        },
        ...fanoutResult.lane_records.map((record, index) => ({
          item_id: `lane-record:${laneRecordIds[index]}`,
          kind: 'FINDING',
          disposition: 'PRODUCED',
          epistemic_status: 'UNKNOWN',
          value: {
            lane_name: record.lane_name,
            governance_status: record.governance_status,
            lane_evidence: record.lane_evidence,
            lane_record_id: laneRecordIds[index],
          },
          source_refs: [`lane-record:${laneRecordIds[index]}`],
          evidence_refs: [record.packet_id],
          parent_item_refs: [],
          rationale: `Governed ${record.lane_name} lane analysis. Non-authoritative; preserved for later synthesis.`,
        })),
        ...crossExamination.final_lane_records.map((record) => ({
          item_id: `cross-final:${record.lane_name}:${fanoutResult.fanout_run_id}`,
          kind: 'FINDING',
          disposition: 'PRODUCED',
          epistemic_status: 'UNKNOWN',
          value: {
            lane_name: record.lane_name,
            lane_evidence: record.lane_evidence,
            cross_exam_version: CROSS_EXAMINATION_VERSION,
            stop_reason: crossExamination.stop_reason,
          },
          source_refs: crossExamRecordIds.map((id) => `cross-exam:${id}`),
          evidence_refs: [signalPacket.packet_id],
          parent_item_refs: [],
          rationale: 'Bounded cross-examination/rebuttal output. Model-generated analysis only; canonical evidence remains the signal packet.',
        })),
      ],
      forwarded: [],
      captured_at: new Date().toISOString(),
    });

    await service.entities.PersonalMessage.update(assistantMessage.id, {
      reality_summary: {
        continuity_package: nextContinuity,
        continuity_mode: 'CONTINUITY_OF_INTELLIGENCE_V0.1',
        source_version: RUNTIME_SOURCE_VERSION,
        signal_packet: {
          ingress_version: CHAT_INGRESS_SIGNAL_PACKET_VERSION,
          packet_id: signalPacket.packet_id,
          cleaner_version: signalPacket.metadata.cleaner_version,
          cleaner_authority: signalPacket.metadata.authority,
          observation_count: signalPacket.observations.length,
          conflict_count: signalPacket.conflicts.length,
        },
        multi_lane_fanout: {
          version: MULTI_LANE_FANOUT_VERSION,
          run_id: fanoutResult.fanout_run_id,
          lane_record_ids: laneRecordIds,
          input_packet_hash: fanoutResult.input_packet_hash,
        },
        cross_examination: {
          version: CROSS_EXAMINATION_VERSION,
          stop_reason: crossExamination.stop_reason,
          round_count: crossExamination.rounds.length,
          record_ids: crossExamRecordIds,
        },
      },
    });

    return Response.json({
      source_version: RUNTIME_SOURCE_VERSION,
      model_provider: { provider: 'BASE44_MANAGED_INVOKE_LLM', model: 'automatic' },
      conversation_id: conversationId,
      thought_id: thoughtId,
      user_message_id: userMessage.id,
      assistant_message_id: assistantMessage.id,
      response,
      __continuity_mode: 'CONTINUITY_OF_INTELLIGENCE_V0.1',
      continuity_id: nextContinuity.continuity_id,
      parent_continuity_id: nextContinuity.parent_continuity_id,
      continuity_digest: nextContinuity.continuity_digest,
      multi_lane_fanout: {
        version: MULTI_LANE_FANOUT_VERSION,
        run_id: fanoutResult.fanout_run_id,
        lane_count: fanoutResult.lane_records.length,
        lane_record_ids: laneRecordIds,
        input_packet_hash: fanoutResult.input_packet_hash,
      },
      cross_examination: {
        version: CROSS_EXAMINATION_VERSION,
        stop_reason: crossExamination.stop_reason,
        round_count: crossExamination.rounds.length,
        record_ids: crossExamRecordIds,
      },
      truth_authorized: false,
      action_authorized: false,
    });
  } catch (error) {
    return Response.json({
      error: error?.message || 'Reality chat failed closed.',
      code: error?.code || 'REALITY_CHAT_FAILURE',
      truth_authorized: false,
      action_authorized: false,
    }, { status: Number(error?.status) || 503 });
  }
}