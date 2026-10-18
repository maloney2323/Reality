import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCronAuthorization } from '../src/reality-cron-governance-v1.0.js';

function responseFor(req, secret, execute) {
  const auth = validateCronAuthorization(req, secret);
  if (!auth.authorized) return { status: auth.status, body: { error: auth.error }, connectorCalls: 0 };
  return { status: 200, body: execute(), connectorCalls: 1 };
}

test('missing CRON_SECRET fails closed before execution', () => {
  let connectorCalls = 0;
  const result = responseFor({ headers: { authorization: 'Bearer anything' } }, '', () => {
    connectorCalls++;
  });
  assert.equal(result.status, 500);
  assert.equal(result.body.error, 'CRON_SECRET_UNCONFIGURED');
  assert.equal(result.connectorCalls, 0);
  assert.equal(connectorCalls, 0);
});

test('missing and invalid authorization return 401 before execution', () => {
  for (const headers of [{}, { authorization: 'Bearer wrong' }, { authorization: 'Bearer correct-extra' }]) {
    let connectorCalls = 0;
    const result = responseFor({ headers }, 'correct', () => {
      connectorCalls++;
    });
    assert.equal(result.status, 401);
    assert.equal(result.body.error, 'UNAUTHORIZED_CRON_EXECUTION');
    assert.equal(result.connectorCalls, 0);
    assert.equal(connectorCalls, 0);
  }
});

test('spoofed Vercel cron user-agent does not authorize execution', () => {
  let connectorCalls = 0;
  const result = responseFor({ headers: { 'user-agent': 'vercel-cron/1.0' } }, 'correct', () => {
    connectorCalls++;
  });
  assert.equal(result.status, 401);
  assert.equal(result.connectorCalls, 0);
  assert.equal(connectorCalls, 0);
});

test('exact Bearer secret authorizes the execution path', () => {
  let connectorCalls = 0;
  const result = responseFor({ headers: { authorization: 'Bearer correct' } }, 'correct', () => {
    connectorCalls++;
    return { ok: true };
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.connectorCalls, 1);
  assert.equal(connectorCalls, 1);
});
