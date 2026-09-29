export const WORLD_ACCESS_VERSION = '0.3.0';

export const GOVERNANCE = Object.freeze({
  noImplicitAuthority: true,
  boundedActionsOnly: true,
  independentVerificationRequired: true,
  contradictionPreservation: true,
  noRuntimeProviderSecrets: true,
  connectorBackedExecution: true,
});

export function normalizeCapability(provider, raw = {}) {
  return {
    provider,
    read: raw.read === true,
    write: raw.write === true,
    scope: raw.scope ?? null,
    authority: raw.authority ?? 'connected_integration',
    runtimeSecretRequired: raw.runtimeSecretRequired === true,
    observedAt: new Date().toISOString(),
  };
}

export function authorizeBoundedAction({ provider, action, capability, authorization }) {
  if (!capability?.write) return { allowed: false, reason: 'WRITE_CAPABILITY_NOT_OBSERVED' };
  if (capability.runtimeSecretRequired) return { allowed: false, reason: 'RUNTIME_SECRET_REQUIRED' };
  if (!authorization?.authorized) return { allowed: false, reason: 'EXPLICIT_AUTHORIZATION_REQUIRED' };
  if (!authorization?.scope || authorization.scope !== capability.scope) {
    return { allowed: false, reason: 'AUTHORITY_SCOPE_MISMATCH' };
  }
  if (!provider || !action) return { allowed: false, reason: 'ACTION_NOT_BOUND' };
  return {
    allowed: true,
    provider,
    action,
    scope: capability.scope,
    authorityId: authorization.authorityId ?? null,
    executionBoundary: capability.authority,
  };
}

export function verifyExternalState({ before, after, expected }) {
  const matches = JSON.stringify(after) === JSON.stringify(expected);
  return {
    verified: matches,
    status: matches ? 'VERIFIED_MATCH' : 'VERIFICATION_FAILED',
    contradiction: !matches && before !== undefined,
  };
}
