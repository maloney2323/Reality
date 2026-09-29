import { investigatorWorld, planInvestigation } from '../../src/reality-investigator.js';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('allow', 'GET, POST');
    return json(res, 405, { error: 'METHOD_NOT_ALLOWED' });
  }

  if (req.method === 'GET') {
    return json(res, 200, { service: 'reality-investigator', world: investigatorWorld() });
  }

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  try {
    const plan = planInvestigation({ question: body.question, availableSources: body.availableSources });
    return json(res, 200, { world: investigatorWorld(), investigation: plan });
  } catch (error) {
    return json(res, 400, { error: error.message, verified: false });
  }
}
