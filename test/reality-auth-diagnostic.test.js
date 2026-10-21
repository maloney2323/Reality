import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/auth-diagnostic.js';

function response() {
  return {
    headers: {},
    setHeader(k, v) { this.headers[k] = v; return this; },
    status(n) { this.statusCode = n; return this; },
    json(data) { this.body = data; return this; },
    end() { return this; },
  };
}

test('diagnostic rejects missing credentials without exposing identity', async () => {
  const res = response();
  await handler({ method: 'POST', headers: {} }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.identity_verified, false);
  assert.equal(res.body.error, 'AUTHENTICATION_FAILED');
  assert.match(res.body.request_id, /^[a-f0-9-]{36}$/);
  assert.equal(res.headers['Cache-Control'], 'no-store');
});

test('diagnostic CORS only permits the published Reality origin', async () => {
  const allowed = response();
  await handler({ method: 'OPTIONS', headers: { origin: 'https://realityaiplatform.base44.app' } }, allowed);
  assert.equal(allowed.statusCode, 204);
  const denied = response();
  await handler({ method: 'OPTIONS', headers: { origin: 'https://other.example' } }, denied);
  assert.equal(denied.statusCode, 403);
  assert.equal(denied.headers['Access-Control-Allow-Origin'], undefined);
});
