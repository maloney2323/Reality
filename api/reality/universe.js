import {
  createObservationFabric,
  normalizeGitHubCommit,
  normalizeGmailMessage,
  normalizeCalendarEvent,
} from '../../src/reality-world-observation-fabric-v0.1.js';
import {
  reconstructUniverse,
  resolveCapabilityAndAuthority,
} from '../../src/reality-universe-reconstruction-v0.1.js';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST');
    return json(res, 405, { error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const observedAt = body.observedAt || new Date().toISOString();
    const fabric = createObservationFabric({
      sources: [
        { source: 'GITHUB', domain: 'SOFTWARE' },
        { source: 'GMAIL', domain: 'BUSINESS' },
        { source: 'CALENDAR', domain: 'BUSINESS' },
      ],
    });

    for (const item of body.github || []) fabric.ingest(normalizeGitHubCommit(item, { observedAt }));
    for (const item of body.gmail || []) fabric.ingest(normalizeGmailMessage(item, { observedAt }));
    for (const item of body.calendar || []) fabric.ingest(normalizeCalendarEvent(item, { observedAt }));

    const universe = reconstructUniverse({ observations: fabric.list(), now: observedAt });
    const capability = Object.fromEntries(
      universe.discovered_work.map((work) => [
        work.work_id,
        resolveCapabilityAndAuthority(work, {
          capabilities: body.capabilities || {},
          authorizations: body.authorizations || {},
        }),
      ]),
    );

    return json(res, 200, {
      observation_fabric: {
        version: fabric.version,
        coverage: fabric.coverage({ now: observedAt }),
        observation_count: fabric.list().length,
      },
      universe,
      capability_authority: capability,
      execution: 'DRAFT_ONLY',
      authority_rule: 'NO_AUTHORIZATION_IS_INFERRED_FROM_OBSERVATION',
    });
  } catch (error) {
    return json(res, 400, { error: error.message, verified: false });
  }
}
