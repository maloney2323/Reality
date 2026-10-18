import test from 'node:test';
import assert from 'node:assert/strict';
import shiftCron from '../api/reality/shift-cron.js';
import shiftHandler from '../api/reality/shift.js';
import stewardshipCron from '../api/reality/stewardship-cron.js';

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end(body) { this.body = JSON.parse(body); return this; },
  };
}

async function invoke(handler, headers = {}, method = 'GET', url = '/') {
  const req = { method, headers, url };
  const res = createResponse();
  await handler(req, res);
  return res;
}

const routes = [
  ['shift cron route', shiftCron],
  ['stewardship cron route', stewardshipCron],
];

for (const [name, handler] of routes) {
  test(`${name}: missing configured secret fails closed before execution`, async () => {
    const previous = process.env.CRON_SECRET;
    try {
      process.env.CRON_SECRET = '';
      const res = await invoke(handler, { authorization: 'Bearer anything' });
      assert.equal(res.statusCode, 500);
      assert.equal(res.body.error, 'CRON_SECRET_UNCONFIGURED');
    } finally {
      if (previous === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = previous;
    }
  });

  test(`${name}: invalid or missing bearer is rejected before execution`, async () => {
    const previous = process.env.CRON_SECRET;
    try {
      process.env.CRON_SECRET = 'test-secret';
      for (const headers of [
        {},
        { authorization: 'Bearer wrong' },
        { authorization: 'Bearer test-secret-extra' },
        { 'user-agent': 'vercel-cron/1.0' },
      ]) {
        const res = await invoke(handler, headers);
        assert.equal(res.statusCode, 401);
        assert.equal(res.body.error, 'UNAUTHORIZED_CRON_EXECUTION');
      }
    } finally {
      if (previous === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = previous;
    }
  });

  test(`${name}: non-GET methods are rejected`, async () => {
    const res = await invoke(handler, { authorization: 'Bearer test-secret' }, 'POST');
    assert.equal(res.statusCode, 405);
    assert.equal(res.body.error, 'METHOD_NOT_ALLOWED');
  });
}


test('shift configuration writes fail closed before persistence without verified user auth', async () => {
  const res = await invoke(shiftHandler, {}, 'POST', '/api/reality/shift');
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, 'VERIFIED_USER_AUTH_REQUIRED');
  assert.equal(res.body.connectorCalls, 0);
  assert.equal(res.body.stateMutations, 0);
});

for (const [name, handler] of routes) {
  test(`${name}: valid cron secret permits only the explicit, server-enabled dry run`, async () => {
    const previousSecret = process.env.CRON_SECRET;
    const previousDryRun = process.env.CRON_AUTH_DRY_RUN_ENABLED;
    try {
      process.env.CRON_SECRET = 'test-secret';
      process.env.CRON_AUTH_DRY_RUN_ENABLED = 'true';
      const res = await invoke(handler, { authorization: 'Bearer test-secret' }, 'GET', '/?dryRun=true');
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.status, 'AUTHORIZED_DRY_RUN_SUCCESS');
      assert.equal(res.body.authorizationGateVerified, true);
      assert.equal(res.body.executionPathVerified, false);
      assert.equal(res.body.connectorCalls, 0);
      assert.equal(res.body.stateMutations, 0);
      assert.equal(res.body.downstreamInvoked, false);
    } finally {
      if (previousSecret === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = previousSecret;
      if (previousDryRun === undefined) delete process.env.CRON_AUTH_DRY_RUN_ENABLED;
      else process.env.CRON_AUTH_DRY_RUN_ENABLED = previousDryRun;
    }
  });

  test(`${name}: dry-run flag alone cannot bypass cron authorization`, async () => {
    const previousSecret = process.env.CRON_SECRET;
    const previousDryRun = process.env.CRON_AUTH_DRY_RUN_ENABLED;
    try {
      process.env.CRON_SECRET = 'test-secret';
      process.env.CRON_AUTH_DRY_RUN_ENABLED = 'true';
      const res = await invoke(handler, {}, 'GET', '/?dryRun=true');
      assert.equal(res.statusCode, 401);
      assert.equal(res.body.error, 'UNAUTHORIZED_CRON_EXECUTION');
    } finally {
      if (previousSecret === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = previousSecret;
      if (previousDryRun === undefined) delete process.env.CRON_AUTH_DRY_RUN_ENABLED;
      else process.env.CRON_AUTH_DRY_RUN_ENABLED = previousDryRun;
    }
  });
}
