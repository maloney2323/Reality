import { runLiveIntelligenceOrchestration } from '../src/reality-live-intelligence-orchestration-v0.1.js';
import { verifyBase44Principal } from '../src/reality-base44-principal-v0.1.js';
import { requireNoClientSystemContext } from '../src/reality-chat-context-boundary-v0.1.js';

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
    const result = await runLiveIntelligenceOrchestration({
      message: req.body?.message,
      requestedBy: principal.principal_id,
      systemContext: trustedSystemContext,
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
