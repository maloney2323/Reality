import { getOrCreateSessionPrincipal } from '../../src/reality-session-principal-v0.1.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).setHeader('Allow', 'GET').json({ error: 'METHOD_NOT_ALLOWED' });
  try {
    const principal = getOrCreateSessionPrincipal(req, res);
    return res.status(200).json({ ok: true, session: { principal_id: principal.principal_id, version: principal.v, created_at: principal.created_at, authenticated_identity: false, identity_basis: 'SIGNED_SERVER_SESSION' } });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
}