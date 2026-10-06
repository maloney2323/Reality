import { executeAuthorizedWork } from '../../src/reality-governed-execution-engine-v0.1.js';
import { getServerExecutionBridges } from '../../src/reality-server-execution-bridge-v0.1.js';
import { getOrCreateSessionPrincipal } from '../../src/reality-session-principal-v0.1.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).setHeader('Allow', 'POST').json({ error: 'METHOD_NOT_ALLOWED' });
  try {
    const body = req.body || {};
    if (!body.workItem || !body.authorization) return res.status(400).json({ ok: false, error: 'WORK_ITEM_AND_AUTHORIZATION_REQUIRED' });
    if (body.connector || body.independentVerifier) return res.status(400).json({ ok: false, error: 'CLIENT_SUPPLIED_EXECUTION_BRIDGES_REJECTED' });
    const principal = getOrCreateSessionPrincipal(req, res);
    if (body.authorization.principal_id && body.authorization.principal_id !== principal.principal_id) return res.status(403).json({ ok: false, error: 'AUTHORIZATION_PRINCIPAL_MISMATCH' });
    let bridges;
    try { bridges = getServerExecutionBridges(); }
    catch (error) { return res.status(200).json({ ok: true, result: { status: 'BLOCKED', blocked_reason: error.message, execution: null, verification: null, outcome: null } }); }
    const result = await executeAuthorizedWork({
      workItem: body.workItem, workflowId: body.workflowId || body.workItem.workflow_id, authorization: body.authorization,
      connector: bridges, independentVerifier: bridges, requestSummary: body.requestSummary || null, requestFingerprint: body.requestFingerprint || null,
    });
    return res.status(200).json({ ok: true, result: { ...result, server_bridge_version: bridges.bridge_version, principal_id: principal.principal_id } });
  } catch (error) {
    return res.status(error.status || 400).json({ ok: false, error: error.message, provider_error: error.provider_error || null });
  }
}