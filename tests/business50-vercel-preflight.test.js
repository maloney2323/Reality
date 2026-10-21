import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/business-adversarial-50.js';

function response() {
  return { statusCode: 200, headers: {}, setHeader(k,v){this.headers[k]=v;}, status(n){this.statusCode=n;return this;}, json(v){this.body=v;return this;} };
}
test('GET is rejected without touching model provider', async () => {
  const res=response();
  await handler({method:'GET',headers:{},body:{}},res);
  assert.equal(res.statusCode,405);
});
test('missing token fails closed', async () => {
  const res=response();
  await handler({method:'POST',headers:{},body:{operation:'preflight'}},res);
  assert.equal(res.statusCode,401);
});
test('invalid token fails closed', async () => {
  const before=process.env.REALITY_BENCHMARK_ACCESS_TOKEN;
  process.env.REALITY_BENCHMARK_ACCESS_TOKEN='test-secret-only';
  try {
    const res=response();
    await handler({method:'POST',headers:{authorization:'Bearer wrong-token'},body:{operation:'preflight'}},res);
    assert.equal(res.statusCode,401);
  } finally {
    if(before===undefined) delete process.env.REALITY_BENCHMARK_ACCESS_TOKEN;
    else process.env.REALITY_BENCHMARK_ACCESS_TOKEN=before;
  }
});
test('preflight is read-only; paid execution is disabled', async () => {
  const before=process.env.REALITY_BENCHMARK_ACCESS_TOKEN;
  process.env.REALITY_BENCHMARK_ACCESS_TOKEN='test-secret-only';
  try {
    const req=(operation)=>({method:'POST',headers:{authorization:'Bearer test-secret-only'},body:{operation}});
    const res=response();
    await handler(req('preflight'),res);
    assert.equal(res.statusCode,200);
    assert.equal(res.body.ready_for_paid_execution,false);
    assert.equal(res.body.paid_model_calls,0);
    const blocked=response();
    await handler(req('run_batch'),blocked);
    assert.equal(blocked.statusCode,409);
    assert.equal(blocked.body.error,'BUSINESS50_EXECUTION_NOT_MIGRATED');
  } finally {
    if(before===undefined) delete process.env.REALITY_BENCHMARK_ACCESS_TOKEN;
    else process.env.REALITY_BENCHMARK_ACCESS_TOKEN=before;
  }
});
