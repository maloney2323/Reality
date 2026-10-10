import assert from 'node:assert/strict';
import test from 'node:test';
import { createAuthorityPolicy, scopeMatches, autoAuthorize } from '../src/reality-authority-v1.0.js';

test('one-click found-work authorization creates scoped auto authority', () => {
  const policy = createAuthorityPolicy({ principalId: 'session:test', mode: 'auto', scopes: [{ connector: 'github', operation: 'create_issue', resource: 'maloney2323/Reality', work_item_id: 'work:test' }] });
  const workItem = { workflow_id: 'workflow:test', connector: 'github', operation: 'create_issue', resource: 'maloney2323/Reality', work_item_id: 'work:test' };
  assert.equal(scopeMatches(policy, workItem), true);
  const authorization = autoAuthorize({ policy, workItem });
  assert.equal(authorization?.principal_id, 'session:test');
});

test('one-click authority stays bounded to the found work item', () => {
  const policy = createAuthorityPolicy({ principalId: 'session:test', mode: 'auto', scopes: [{ connector: 'github', operation: 'create_issue', resource: 'maloney2323/Reality', work_item_id: 'work:test' }] });
  assert.equal(scopeMatches(policy, { connector: 'github', operation: 'create_issue', resource: 'maloney2323/Reality', work_item_id: 'work:other' }), false);
});
