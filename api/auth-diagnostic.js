import { randomUUID } from 'node:crypto';
import { verifyBase44Principal } from '../src/reality-base44-principal-v0.1.js';

// Preview-only diagnostic. No model calls, user details, or token echoes.
const ALLOWED_ORIGIN = 'https://realityaiplatform.base44.app';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Vary', 'Origin');
  const origin = req.headers?.origin;
  if (origin === ALLOWED_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  }
  if (req.method === 'OPTIONS') return res.status(origin === ALLOWED_ORIGIN ? 204 : 403).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  if (process.env.VERCEL_ENV === 'production') return res.status(404).json({ ok: false, error: 'NOT_FOUND' });
  const requestId = randomUUID();
  try {
    await verifyBase44Principal(req);
    return res.status(200).json({ ok: true, identity_verified: true, request_id: requestId });
  } catch (error) {
    const status = [401, 503].includes(error?.status) ? error.status : 503;
    return res.status(status).json({ ok: false, identity_verified: false, error: status === 401 ? 'AUTHENTICATION_FAILED' : 'IDENTITY_PROVIDER_UNAVAILABLE', request_id: requestId });
  }
}
