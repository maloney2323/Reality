import { runIntelligenceGainExperiment } from '../../src/reality-intelligence-gain-runner-v1.0.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }
  try {
    const result = await runIntelligenceGainExperiment({
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.REALITY_OPENAI_MODEL || 'gpt-5.6-luna',
    });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      status: 'EXPERIMENT_FAILED',
      error: error.message || 'UNKNOWN_ERROR',
    });
  }
}
