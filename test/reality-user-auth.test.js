import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyRealityAdmin } from '../src/reality-user-auth-v1.0.js';
import shiftHandler from '../api/reality/shift.js';

const originalFetch = globalThis.fetch;
const envKeys = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'REALITY_ADMIN_EMAIL'];
const originalEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));

function restoreEnv() {
  for (const key of envKeys) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
  globalThis.fetch = originalFetch;
}

function response(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

test('user auth rejects missing bearer before identity-provider call', async () => {
  try {
    let calls = 0;
    globalThis.fetch = async () => { calls++; throw new Error('must not call provider'); };
    const result = await verifyRealityAdmin({ headers: {} });
    assert.equal(result.authorized, false);
    assert.equal(result.status, 401);
    assert.equal(result.error, 'USER_AUTH_REQUIRED');
    assert.equal(calls, 0);
  } finally { restoreEnv(); }
});

test('user auth rejects invalid token and non-admin identity', async () => {
  try {
    process.env.SUPABASE_URL = 'https://auth.example.test';
    process.env.SUPABASE_PUBLISHABLE_KEY = 'public-test-key';
    process.env.REALITY_ADMIN_EMAIL = 'Maloney2323@gmail.com';
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://auth.example.test/auth/v1/user');
      assert.equal(options.headers.authorization, 'Bearer test-token');
      return response(200, { id: 'user-123', email: 'other@example.com' });
    };
    const result = await verifyRealityAdmin({ headers: { authorization: 'Bearer test-token' } });
    assert.equal(result.authorized, false);
    assert.equal(result.status, 403);
    assert.equal(result.error, 'ADMIN_ROLE_REQUIRED');
  } finally { restoreEnv(); }
});

test('shift POST rejects missing user auth before persistence or mutation', async () => {
  try {
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(key, value) { this.headers[key] = value; },
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    await shiftHandler({ method: 'POST', headers: {}, body: { enabled: true } }, res);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.error, 'USER_AUTH_REQUIRED');
    assert.equal(res.body.connectorCalls, 0);
    assert.equal(res.body.stateMutations, 0);
  } finally { restoreEnv(); }
});
