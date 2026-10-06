import assert from 'node:assert/strict';
import { buildRealityBrief } from '../src/reality-chat-governed-brief-v0.1.js';

const brief = buildRealityBrief({
  statement: 'Review unread business emails, identify follow-ups, draft responses, and send them.',
});

assert.equal(brief.brief_version, '0.1.0');
assert.equal(brief.status, 'proposed');
assert.equal(brief.understood.statement, 'Review unread business emails, identify follow-ups, draft responses, and send them.');
assert.deepEqual(brief.intended_plan, [
  'Retrieve permitted business emails',
  'Classify follow-up obligations',
  'Create candidate response drafts',
  'Send approved responses',
]);
assert.equal(brief.authority_map.at(-1).status, 'NOT_AUTHORIZED');
assert.equal(brief.execution.status, 'NOT_EXECUTED');
assert.equal(brief.verification.status, 'NOT_STARTED');
assert.equal(brief.preflight.execution_permitted, false);
assert.equal(brief.authorization_request.authorized, false);

const simple = buildRealityBrief({ statement: 'Review my business emails.' });
assert.equal(simple.authority_map.some((x) => x.status === 'NOT_AUTHORIZED'), false);
assert.equal(simple.execution.status, 'NOT_EXECUTED');

console.log('Reality Chat Governed Brief v0.1: PASS');
