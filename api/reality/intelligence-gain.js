import { runIntelligenceGainExperiment } from '../../src/reality-intelligence-gain-runner-v1.0.js';

export default async function handler(req, res) {
  const execute = req.method === 'POST' || (req.method === 'GET' && req.query?.run === '1');
  if (!execute) {
    return res.status(200).json({
      status: 'READY',
      endpoint: 'reality-intelligence-gain-v1.0',
      execution: 'POST or GET?run=1',
      note: 'GET execution is enabled for direct observability.'
    });
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
