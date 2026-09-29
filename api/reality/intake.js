import { createBusinessUpdate, interpretAsk, createInvestigationWork } from '../../src/reality-intent-engine.js';
import { createChatContext, governedOpinion } from '../../src/reality-chat-interface.js';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('allow', 'GET, POST');
    return json(res, 405, { error: 'METHOD_NOT_ALLOWED' });
  }

  if (req.method === 'GET') {
    return json(res, 200, {
      service: 'reality-business-intake',
      version: '0.1.0',
      modes: ['BUSINESS_UPDATE', 'ASK', 'GOVERNED_OPINION'],
      chat_boundary: { execution_access: false, constitutional_write_access: false },
    });
  }

  const body = typeof req.body === 'object' && req.body ? req.body : {};

  try {
    const businessUpdate = createBusinessUpdate(body.businessUpdate);
    const interpretation = interpretAsk({
      ask: body.ask,
      businessUpdate,
      knownFacts: body.knownFacts,
      unknowns: body.unknowns,
      requestedDecision: body.requestedDecision,
    });
    const work = interpretation.next_decision === 'INVESTIGATE'
      ? createInvestigationWork({ interpretation, hypothesis: body.hypothesis })
      : null;

    const opinion = governedOpinion({
      status: work ? 'INVESTIGATION_REQUIRED' : 'ASK_CLARIFICATION_REQUIRED',
      establishedFacts: interpretation.known_facts,
      unresolvedQuestions: interpretation.unknowns,
      nextStep: interpretation.next_decision,
    });

    return json(res, 200, {
      business_update: businessUpdate,
      interpretation,
      work,
      chat: createChatContext({ businessUpdate, governedOpinion: opinion }),
      governed_opinion: opinion,
    });
  } catch (error) {
    return json(res, 400, { error: error.message, verified: false });
  }
}
