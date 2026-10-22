import { runLiveIntelligenceOrchestration } from '../src/reality-live-intelligence-orchestration-v0.1.js';
import { loadRealityContext } from './reality/intelligence.js';
import { buildAuthenticatedChatContinuity } from '../src/reality-authenticated-chat-continuity-v0.1.js';

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
    const body = req.body || {};
    // The user bearer token is verified against Base44 before forming an
    // authoritative user identity, evidence context or stable continuity root.
    // Caller-supplied systemContext is never admitted as trusted state here.
    const noHistoryProbe = !String(body.conversation_id || '').trim() ||
      !String(body.thought_id || '').trim();
    const authenticatedContext = await loadRealityContext(req, body, {
      noHistoryWhenSelectorsMissing: noHistoryProbe,
    });
    if (!authenticatedContext?.authenticated_user_id) {
      return res.status(401).json({ ok: false, error: 'BASE44_AUTHENTICATED_SESSION_REQUIRED' });
    }
    // Existing HCAST/proof consoles deliberately send single-turn probes
    // without selectors. Keep those requests context-free, but authenticated.
    const systemContext = noHistoryProbe
      ? { ...authenticatedContext, ephemeral_no_history: true, continuity_root_id: null,
          conversation_id: null, thought_id: null, identity_basis: 'BASE44_VERIFIED_USER_ME' }
      : buildAuthenticatedChatContinuity({ body, authenticatedContext });
    const result = await runLiveIntelligenceOrchestration({
      message: body.message,
      requestedBy: systemContext.authenticated_user_id,
      systemContext,
    });

    return res.status(200).json({
      ok: true,
      response: result?.intelligence?.answer || '',
      result,
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
