import test from 'node:test';
import assert from 'node:assert/strict';
import shiftCron from '../api/reality/shift-cron.js';
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

async function invoke(handler, headers = {}, method = 'GET') {
  const req = { method, headers };
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
