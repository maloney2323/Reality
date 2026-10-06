import { runLiveIntelligenceOrchestration } from '../../src/reality-live-intelligence-orchestration-v0.1.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).setHeader('Allow', 'POST').json({ error: 'METHOD_NOT_ALLOWED' });
  try {
    const result = await runLiveIntelligenceOrchestration({
      message: req.body?.message,
      requestedBy: req.body?.requestedBy || 'chat_user',
      systemContext: req.body?.systemContext || null,
    });
    return res.status(200).json({ ok: true, result });
  } catch (error) {
    return res.status(error.status || 400).json({
      ok: false,
      error: error.message,
      provider_error: error.provider_error || null,
    });
  }
}
