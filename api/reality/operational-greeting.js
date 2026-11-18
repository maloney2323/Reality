import { runRealityStewardshipPass } from '../../src/reality-stewardship-pass-v1.0.js';
import { buildOperationalGreeting } from '../../src/reality-operational-greeting-v0.1.js';

// Read-only engineering source: stewardship currently reads Reality's GitHub
// workflow and PR evidence. Do not add tenant/employee data here until verified
// account authentication, authorization and data scoping exist.
export function makeOperationalGreetingHandler({ load = runRealityStewardshipPass } = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    }
    try {
      const observed = await load();
      return res.status(200).json(buildOperationalGreeting(observed));
    } catch {
      return res.status(503).json(buildOperationalGreeting(null));
    }
  };
}

export default makeOperationalGreetingHandler();