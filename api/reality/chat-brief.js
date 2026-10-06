import { buildRealityBrief } from '../../src/reality-chat-governed-brief-v0.1.js';
import { buildGovernedChatSignal } from '../../src/reality-governed-fragmented-signal-cleaner-v0.1.js';

export default function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('allow', 'GET, POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }
  const statement = req.method === 'GET' ? (req.query?.statement || '') : req.body?.statement;
  try {
    const governedSignal = buildGovernedChatSignal({ message: statement });
    const brief = buildRealityBrief({
      statement,
      requestedBy: req.body?.requestedBy || req.query?.requestedBy || 'chat_user',
    });
    return res.status(200).json({ ...brief, governed_signal: governedSignal });
  } catch (error) {
    return res.status(400).json({ error: error.message, verified: false });
  }
}
