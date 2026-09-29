import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeBoundedAction, normalizeCapability, verifyExternalState } from '../src/reality-world-access.js';

test('never grants write authority from capability alone', () => {
  const capability = normalizeCapability('github', { read: true, write: true, scope: 'repository' });
  const result = authorizeBoundedAction({ provider: 'github', action: 'commit', capability });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'EXPLICIT_AUTHORIZATION_REQUIRED');
});

test('requires matching authority scope', () => {
  const capability = normalizeCapability('github', { read: true, write: true, scope: 'repository' });
  const result = authorizeBoundedAction({
    provider: 'github',
    action: 'commit',
    capability,
    authorization: { authorized: true, scope: 'project', authorityId: 'a1' },
  });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'AUTHORITY_SCOPE_MISMATCH');
});

test('independently verifies external state', () => {
  assert.equal(verifyExternalState({ after: { ok: true }, expected: { ok: true } }).verified, true);
  assert.equal(verifyExternalState({ after: { ok: false }, expected: { ok: true } }).verified, false);
});
