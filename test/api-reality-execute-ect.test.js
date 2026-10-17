import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/reality/execute.js';

test('execution API rejects a missing signed context', async () => {
 const res = { statusCode: 200, body: null, status(n){this.statusCode=n;return this;}, json(v){this.body=v;return this;}, setHeader(){return this;} };
 await handler({method:'POST',body:{workItem:{work_item_id:'w',workflow_id:'f'}}},res);
 assert.equal(res.statusCode,401);
 assert.equal(res.body.error,'MISSING_AUTHORITY');
});
