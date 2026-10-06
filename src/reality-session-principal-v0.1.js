import crypto from 'node:crypto';

export const REALITY_SESSION_VERSION = 'reality-session-principal-v0.1';

function requireKey(key = process.env.REALITY_CHAT_RECEIPT_HMAC_KEY) {
  if (!key) throw new Error('REALITY_CHAT_RECEIPT_HMAC_KEY_REQUIRED');
  return key;
}

function encode(value) { return Buffer.from(JSON.stringify(value)).toString('base64url'); }
function sign(payload, key = requireKey()) { return crypto.createHmac('sha256', key).update(payload).digest('base64url'); }

export function createSessionPrincipal({ principalId = crypto.randomUUID(), createdAt = new Date().toISOString() } = {}) {
  const payload = encode({ v: REALITY_SESSION_VERSION, principal_id: principalId, created_at: createdAt });
  return payload + '.' + sign(payload);
}

export function verifySessionPrincipal(token) {
  if (typeof token !== 'string' || !token.includes('.')) throw new Error('SESSION_PRINCIPAL_REQUIRED');
  const [payload, signature] = token.split('.');
  const expected = sign(payload);
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error('SESSION_PRINCIPAL_SIGNATURE_INVALID');
  const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (value?.v !== REALITY_SESSION_VERSION || !value?.principal_id) throw new Error('SESSION_PRINCIPAL_INVALID');
  return Object.freeze(value);
}

export function getOrCreateSessionPrincipal(req, res) {
  const cookies = String(req.headers?.cookie || '');
  const match = cookies.match(/(?:^|;\\s*)reality_principal=([^;]+)/);
  if (match) { try { return verifySessionPrincipal(decodeURIComponent(match[1])); } catch {} }
  const token = createSessionPrincipal();
  res.setHeader('Set-Cookie', 'reality_principal=' + encodeURIComponent(token) + '; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=31536000');
  return verifySessionPrincipal(token);
}