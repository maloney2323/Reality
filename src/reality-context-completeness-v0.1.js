export const REALITY_CONTEXT_COMPLETENESS_VERSION = 'reality-context-completeness-v0.1';

export function classifyContextCompleteness({
  requestedLimit = 80,
  rawRecordCount = 0,
  eligibleMessageCount = 0,
  retainedMessageCount = 0,
  historyLoadSucceeded = true,
} = {}) {
  if (!historyLoadSucceeded) {
    return Object.freeze({
      status: 'UNAVAILABLE',
      complete: false,
      truncated: false,
      reason: 'HISTORY_LOAD_FAILED',
      source_record_count: Number(rawRecordCount) || 0,
      eligible_message_count: Number(eligibleMessageCount) || 0,
      retained_message_count: Number(retainedMessageCount) || 0,
    });
  }

  const limit = Math.max(1, Number(requestedLimit) || 80);
  const rawCount = Math.max(0, Number(rawRecordCount) || 0);
  const eligibleCount = Math.max(0, Number(eligibleMessageCount) || 0);
  const retainedCount = Math.max(0, Number(retainedMessageCount) || 0);
  const truncated = rawCount >= limit || eligibleCount > retainedCount;

  return Object.freeze({
    status: truncated ? 'PARTIAL_CONTEXT' : (retainedCount === 0 ? 'NO_PRIOR_MESSAGES' : 'COMPLETE_WITHIN_RETRIEVAL_WINDOW'),
    complete: !truncated,
    truncated,
    reason: truncated ? 'RETRIEVAL_WINDOW_OR_RETENTION_CAP_REACHED' : null,
    source_record_count: rawCount,
    eligible_message_count: eligibleCount,
    retained_message_count: retainedCount,
  });
}

export function continuitySafetyDirective(completeness) {
  if (completeness?.status === 'PARTIAL_CONTEXT') {
    return 'CONTINUITY SAFETY: The retrieved conversation history is PARTIAL. Do not claim complete recall. For claims that depend on omitted or earlier conversation content, state that the available context may be incomplete and ask for the missing evidence or mark INSUFFICIENT_EVIDENCE. Never infer that an absent fact was never stated.';
  }
  if (completeness?.status === 'NO_PRIOR_MESSAGES') {
    return 'CONTINUITY SAFETY: No prior messages were retrieved for this conversation. Do not claim to remember prior turns. Use only the current user message and explicitly supplied, provenance-bearing context.';
  }
  if (completeness?.status === 'UNAVAILABLE') {
    return 'CONTINUITY SAFETY: Conversation history is unavailable. Do not claim continuity or use an absent history as evidence.';
  }
  return 'CONTINUITY SAFETY: Use retrieved history only within its recorded scope and provenance. Distinguish remembered user statements from verified external facts.';
}
