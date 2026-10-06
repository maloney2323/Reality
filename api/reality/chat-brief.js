import { buildRealityBrief } from '../../src/reality-chat-governed-brief-v0.1.js';
import { observeUserMessage, assertGenerationAfterObservation } from '../../src/reality-observation-boundary-v0.1.js';

export default function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('allow', 'GET, POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }
  const statement = req.method === 'GET' ? (req.query?.statement || '') : req.body?.statement;
  try {
    const observation = observeUserMessage({ message: statement });
    const generationGate = assertGenerationAfterObservation({ boundary: observation });
    const brief = buildRealityBrief({
      statement,
      requestedBy: req.body?.requestedBy || req.query?.requestedBy || 'chat_user',
    });
    return res.status(200).json({ ...brief, observation_boundary: observation, generation_gate: generationGate });
  } catch (error) {
    return res.status(400).json({ error: error.message, verified: false });
  }
}