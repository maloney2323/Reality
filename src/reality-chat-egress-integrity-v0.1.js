import { createHash } from 'node:crypto';
import { enforceChatPublication } from './reality-chat-publication-boundary-v0.1.js';

export const CHAT_EGRESS_INTEGRITY_VERSION = 'reality-chat-egress-integrity-v0.1';
const digest = value => createHash('sha256').update(String(value)).digest('hex');

function rejected(reason) {
  const e = new Error(reason);
  e.status = 503;
  return e;
}

// Last mandatory boundary: validate the exact candidate that will be written
// to the HTTP response, after cognitive synthesis and all runtime fallback,
// correction, continuity, and response assembly.
export function finalizeGovernedChatEgress(runtimeResult) {
  const finalAnswer = runtimeResult?.intelligence?.answer;
  const priorGate = runtimeResult?.intelligence?.publication_gate;
  if (typeof finalAnswer !== 'string' || !finalAnswer.trim() ||
      !priorGate || priorGate.status === undefined ||
      priorGate.released_sha256 !== digest(finalAnswer)) {
    throw rejected('FINAL_PUBLICATION_RECEIPT_MISMATCH');
  }
  if (runtimeResult?.execution?.status !== 'NOT_EXECUTED') {
    throw rejected('FINAL_CHAT_EXECUTION_AUTHORITY_MISMATCH');
  }
  // A prior release receipt is not permission to insert a new completion
  // claim through an egress wrapper or fallback. Re-evaluate the final text.
  const rechecked = enforceChatPublication({
    candidateAnswer:finalAnswer,
    executionStatus:'NOT_EXECUTED',
    actionCandidate:runtimeResult?.mode === 'ACTION_CANDIDATE',
  });
  if (rechecked.answer !== finalAnswer || rechecked.receipt.status !== 'RELEASED') {
    throw rejected('FINAL_PUBLICATION_GATE_REJECTED');
  }

  const finalReceipt = Object.freeze({
    version: CHAT_EGRESS_INTEGRITY_VERSION,
    status:'FINAL_EGRESS_RECHECK_PASSED',
    answer_sha256:digest(finalAnswer),
    previous_release_sha256:priorGate.released_sha256,
    external_action_executed:false,
    factual_verification_not_claimed:true,
    limit:'No independent claim-by-claim factual truth assessment is performed.',
  });
  return Object.freeze({response:finalAnswer,result:runtimeResult,final_receipt:finalReceipt});
}
