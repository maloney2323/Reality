import { getOrCreateSessionPrincipal } from '../../src/reality-session-principal-v0.1.js';
import { createAuthorityPolicy, saveAuthorityPolicy, getAuthorityPolicy } from '../../src/reality-authority-v1.0.js';

export default async function handler(req, res) {
  if (!['GET','POST'].includes(req.method)) return res.status(405).setHeader('Allow','GET, POST').json({ ok:false, error:'METHOD_NOT_ALLOWED' });
  try {
    const principal = getOrCreateSessionPrincipal(req, res);
    if (req.method === 'GET') {
      return res.status(200).json({ ok:true, authority: await getAuthorityPolicy(principal.principal_id) });
    }
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const policy = createAuthorityPolicy({
      principalId: principal.principal_id,
      mode: body.mode || 'manual',
      scopes: body.scopes || [],
      expiresAt: body.expires_at || null,
      enabled: body.enabled !== false,
      approvedBy: principal.principal_id,
    });
    await saveAuthorityPolicy(policy);
    return res.status(200).json({ ok:true, authority:policy });
  } catch (error) {
    return res.status(error.status || 400).json({ ok:false, error:error.message });
  }
}
