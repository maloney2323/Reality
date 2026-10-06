import { inspectGitHubRepository } from '../../src/reality-governed-system-access-v0.1.js';
import { buildSystemDiscoveryArtifact } from '../../src/reality-system-discovery-v0.1.js';
import { runSelfInspectionTrace } from '../../src/reality-self-inspection-trace-v0.1.js';

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
  try {
    const b = req.method === 'POST' && req.body && typeof req.body === 'object' ? req.body : {};
    const repositoryObservation = await inspectGitHubRepository({
      owner: b.owner || req.query?.owner || 'maloney2323',
      repo: b.repo || req.query?.repo || 'Reality',
      ref: b.ref || req.query?.ref || 'main',
    });
    const artifact = buildSystemDiscoveryArtifact({
      repositoryObservation,
      previousSnapshot: b.previousSnapshot || null,
      capabilityState: b.capabilityState || undefined,
    });
    if (req.query?.trace === '1' || b.trace === true) {
      return json(res, 200, {
        ...artifact,
        self_inspection_trace: await runSelfInspectionTrace({
          owner: repositoryObservation.repository.full_name.split('/')[0],
          repo: repositoryObservation.repository.full_name.split('/')[1],
          ref: repositoryObservation.source.ref,
        }),
      });
    }
    return json(res, 200, artifact);
  } catch (e) {
    return json(res, 502, { error: e.message, verified: false });
  }
}