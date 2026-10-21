import { createHash } from 'node:crypto';

// Outbound execution-claim control for the public chat-only runtime.
// This is deliberately narrower than factual hallucination verification.
// The chat route is proposal-only and cannot assert that it executed work.
export const CHAT_PUBLICATION_BOUNDARY_VERSION = 'reality-chat-publication-boundary-v0.1';

function digest(text) {
  return createHash('sha256').update(String(text)).digest('hex');
}

function allegesExternalCompletion(text) {
  // Covers explicit first-person completed work or inspection claims.
  // This detector is NOT an exhaustive semantic hallucination classifier.
  const firstPerson = /\b(?:I|we)\s+(?:(?:have|had|already|just)\s+|['’]ve\s+|['’]d\s+)*(?:sent|emailed|posted|published|deleted|updated|deployed|transferred|purchased|paid|scheduled|cancelled|canceled|created|merged|committed|executed|saved|uploaded|downloaded|installed|verified|confirmed|checked|inspected|completed|booked)\b/i;
  const assertedResult = /\b(?:your|the)\s+(?:email|message|payment|transfer|file|document|record|issue|pull request|deployment|repository|calendar event|booking|reservation|invoice|account|database)\s+(?:(?:has|have)\s+been|was|were|is\s+now)\s+(?:sent|emailed|posted|published|deleted|updated|deployed|transferred|purchased|paid|scheduled|cancelled|canceled|created|merged|committed|executed|saved|uploaded|installed|verified|confirmed|completed|booked)\b/i;
  const doneClaim = /^\s*(?:done|completed|successfully\s+(?:sent|updated|deployed|saved|published|scheduled))\s*[!.,:—-]/i;
  return firstPerson.test(text) || assertedResult.test(text) || doneClaim.test(text);
}

export function enforceChatPublication({ candidateAnswer, executionStatus = 'NOT_EXECUTED' } = {}) {
  if (executionStatus !== 'NOT_EXECUTED') {
    // Any future tool-executing chat route needs a separate real execution
    // receipt verifier, not a boolean supplied by the model or API caller.
    throw new Error('CHAT_PUBLICATION_REQUIRES_PROPOSAL_ONLY_EXECUTION_STATUS');
  }

  const candidate = typeof candidateAnswer === 'string' ? candidateAnswer : '';
  const unsupportedCompletion = allegesExternalCompletion(candidate);
  const empty = candidate.trim().length === 0;
  const held = unsupportedCompletion || empty;
  const publishedAnswer = empty
    ? 'Reality could not produce a verified response for this turn. No external action was executed.'
    : unsupportedCompletion
      ? 'Reality cannot verify that an external action was completed. This chat route did not execute an external action; I can prepare the next authorized step.'
      : candidate;

  const receipt = Object.freeze({
    schema_version: CHAT_PUBLICATION_BOUNDARY_VERSION,
    status: held ? 'HELD_AND_REPLACED' : 'RELEASED',
    source_authority: 'UNTRUSTED_MODEL_OUTPUT',
    execution_status: executionStatus,
    external_execution_verified: false,
    reason_code: empty ? 'EMPTY_MODEL_ANSWER' :
      unsupportedCompletion ? 'UNSUPPORTED_EXTERNAL_COMPLETION_CLAIM' : 'NO_EXTERNAL_COMPLETION_ASSERTION_DETECTED',
    original_sha256: digest(candidate),
    released_sha256: digest(publishedAnswer),
    changed: publishedAnswer !== candidate,
    caveat: 'Only explicit external completion claims are detected here; factual claims still need evidence-level verification.',
  });
  return Object.freeze({ answer: publishedAnswer, receipt });
}
