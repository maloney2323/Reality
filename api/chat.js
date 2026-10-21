import { runLiveIntelligenceOrchestration } from '../src/reality-live-intelligence-orchestration-v0.1.js';
import { verifyBase44Principal } from '../src/reality-base44-principal-v0.1.js';
import { requireNoClientSystemContext } from '../src/reality-chat-context-boundary-v0.1.js';
import { finalizeGovernedChatEgress } from '../src/reality-chat-egress-integrity-v0.1.js';
import { requireConversationSelector } from '../src/reality-authenticated-conversation-v0.1.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).setHeader('Allow', 'POST, OPTIONS').json({ error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    // The public request body never supplies authoritative system, universe,
    // or continuity state. Trusted evidence must be admitted server-side.
    const principal = await verifyBase44Principal(req);
    const trustedSystemContext = requireNoClientSystemContext(req.body);
    // A conversation ID is a routing selector, never a trusted memory root.
    // Its scope is cryptographically bound to the verified Base44 principal.
    const conversationId = requireConversationSelector(req.body);
    const result = await runLiveIntelligenceOrchestration({
      message: req.body?.message,
      requestedBy: principal.principal_id,
      conversationId,
      systemContext: trustedSystemContext,
    });

    // Recheck the EXACT HTTP payload after orchestration, publication
    // correction, continuity writes, and result-object assembly. No later
    // fallback may bypass this gate.
    const finalEgress = finalizeGovernedChatEgress(result);
    return res.status(200).json({
      ok: true,
      response: finalEgress.response,
      result: finalEgress.result,
      final_release_receipt: finalEgress.final_receipt,
      source_version: 'reality-chat-compat-v1',
    });
  } catch (error) {
    return res.status(error.status || 400).json({
      ok: false,
      error: error.message,
      provider_error: error.provider_error || null,
    });
  }
}
