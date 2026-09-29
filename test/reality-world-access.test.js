import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeBoundedAction, normalizeCapability, verifyExternalState } from '../src/reality-world-access.js';

test('connected capability does not require a runtime secret', () => {
  const capability = normalizeCapability('github', {
    read: true,
    write: true,
    scope: 'repository',
    authority: 'connected_integration',
    runtimeSecretRequired: false,
  });
  const result = authorizeBoundedAction({
    provider: 'github',
    action: 'commit',
    capability,
    authorization: { authorized: true, scope: 'repository', authorityId: 'a1' },
  });
  assert.equal(result.allowed, true);
  assert.equal(result.executionBoundary, 'connected_integration');
});

test('runtime secret requirement is explicitly rejected', () => {
  const capability = normalizeCapability('github', {
    read: true,
    write: true,
    scope: 'repository',
    runtimeSecretRequired: true,
  });
  const result = authorizeBoundedAction({
    provider: 'github',
    action: 'commit',
    capability,
    authorization: { authorized: true, scope: 'repository' },
  });
  assert.equal(result.allowed, false);
  assert.equal(result.reason, 'RUNTIME_SECRET_REQUIRED');
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
