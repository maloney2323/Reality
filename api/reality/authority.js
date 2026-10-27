import { getOrCreateSessionPrincipal } from '../../src/reality-session-principal-v0.1.js';
import { createAuthorityPolicy, saveAuthorityPolicy, getAuthorityPolicy, fingerprintApprovedWorkItem } from '../../src/reality-authority-v1.0.js';

export default async function handler(req, res) {
  if (!['GET','POST'].includes(req.method)) return res.status(405).setHeader('Allow','GET, POST').json({ ok:false, error:'METHOD_NOT_ALLOWED' });
  try {
    const principal = getOrCreateSessionPrincipal(req, res);
    if (req.method === 'GET') return res.status(200).json({ ok:true, authority: await getAuthorityPolicy(principal.principal_id) });

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const oneClick=body.intent==='I_FOUND_WORK_AUTHORIZED';
    const workItem=body.work_item&&typeof body.work_item==='object'&&
      !Array.isArray(body.work_item)?body.work_item:null;
    const mode=oneClick||body.mode==='auto'?'auto':(body.mode||'manual');
    // Auto-authorization is a user-approved exact-work-item event, NEVER a
    // broad connector permission inferred from a prompt. Ignore client-
    // supplied 'scopes' when an exact-work approval is being recorded.
    if(mode==='auto'&&!workItem)
      return res.status(400).json({ok:false,
        error:'AUTO_AUTHORITY_EXACT_WORK_ITEM_REQUIRED'});
    const scopes=mode==='auto'?[{
      connector:workItem.connector,
      operation:workItem.operation,
      resource:workItem.resource||workItem.inputs?.resource||
        workItem.inputs?.repository||null,
      work_item_id:workItem.work_item_id,
      work_item_fingerprint:fingerprintApprovedWorkItem(workItem),
    }]:(Array.isArray(body.scopes)?body.scopes:[]);
    const policy = createAuthorityPolicy({
      principalId: principal.principal_id,
      mode,
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
