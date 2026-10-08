import { getOrCreateSessionPrincipal } from '../../src/reality-session-principal-v0.1.js';
import { createAuthorityPolicy, saveAuthorityPolicy, getAuthorityPolicy } from '../../src/reality-authority-v1.0.js';

export default async function handler(req, res) {
  if (!['GET','POST'].includes(req.method)) return res.status(405).setHeader('Allow','GET, POST').json({ ok:false, error:'METHOD_NOT_ALLOWED' });
  try {
    const principal = getOrCreateSessionPrincipal(req, res);
    if (req.method === 'GET') return res.status(200).json({ ok:true, authority: await getAuthorityPolicy(principal.principal_id) });

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const oneClick = body.intent === 'I_FOUND_WORK_AUTHORIZED';
    const workItem = body.work_item && typeof body.work_item === 'object' ? body.work_item : null;
    const scopes = Array.isArray(body.scopes) ? body.scopes : (workItem ? [{
      connector: workItem.connector,
      operation: workItem.operation,
      resource: workItem.resource || workItem.inputs?.resource || workItem.inputs?.repository || null,
      work_item_id: workItem.work_item_id || workItem.work_id || null,
    }] : []);

    if (oneClick && (!scopes[0]?.connector || !scopes[0]?.operation || !scopes[0]?.work_item_id)) {
      return res.status(400).json({ ok:false, error:'FOUND_WORK_SCOPE_REQUIRED', message:'Reality must have an exact connector, operation, and work item before one-click authorization can be granted.' });
    }

    const policy = createAuthorityPolicy({
      principalId: principal.principal_id,
      mode: oneClick ? 'auto' : (body.mode || 'manual'),
      scopes,
      expiresAt: body.expires_at || null,
      enabled: body.enabled !== false,
      approvedBy: principal.principal_id,
    });
    await saveAuthorityPolicy(policy);

    return res.status(200).json({
      ok:true,
      authority:policy,
      authorization_action: oneClick ? 'I_FOUND_WORK_AUTHORIZED' : 'AUTHORITY_POLICY_CREATED',
      message: oneClick ? 'I found work — authorized. Reality may execute only this bounded work item and must independently verify the outcome.' : null,
    });
  } catch (error) {
    return res.status(error.status || 400).json({ ok:false, error:error.message });
  }
}
