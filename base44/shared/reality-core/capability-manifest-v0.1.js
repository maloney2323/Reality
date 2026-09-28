// Runtime Capability Manifest v0.1
// Capability evidence is separate from authorization. This module never grants permission.
export const CAPABILITY_MANIFEST_VERSION = 'reality-capability-manifest-v0.1';

export async function buildGitHubRepositoryWriteManifest({ base44, repository = 'maloney2323/Reality', base_ref = 'reality-governed-dev-001' } = {}) {
  const implementationEvidence = {
    state: 'IMPLEMENTED',
    writer: 'base44/functions/reality-code-apply-candidate/entry.ts',
    writer_operation: 'create branch + blobs + tree + commit + pull request',
    authorization_gate: 'base44/functions/reality-github-write-gate/entry.ts',
  };

  const connectorEvidence = {
    provider: 'github',
    requested_scope_class: 'repo',
    workflow_scope: true,
    state: 'DECLARED_BY_CONNECTED_CONNECTOR',
  };

  let runtimeAccess = { state: 'UNVERIFIED', evidence: 'No runtime connector acquisition has been successfully observed.' };
  try {
    const connection = await base44.asServiceRole.connectors.getConnection('github');
    const hasToken = Boolean(connection?.accessToken || connection?.access_token || connection?.token);
    runtimeAccess = hasToken
      ? { state: 'RUNTIME_ACCESS_VERIFIED', evidence: 'Base44 runtime successfully acquired a GitHub connector credential.', credential_material_exposed: false }
      : { state: 'RUNTIME_ACCESS_UNVERIFIED', evidence: 'GitHub connector object was returned but no access credential was exposed to this manifest builder.', credential_material_exposed: false };
  } catch (error) {
    runtimeAccess = { state: 'RUNTIME_ACCESS_UNVERIFIED', evidence: 'Runtime connector acquisition failed or was unavailable.', error_class: error?.message || String(error), credential_material_exposed: false };
  }

  return {
    schema: CAPABILITY_MANIFEST_VERSION,
    capability_id: 'github_repository_write',
    capability_class: 'CODE_MODIFICATION',
    provider: 'GitHub connector',
    target: { repository, base_ref },
    evidence: { implementation: implementationEvidence, connector: connectorEvidence, runtime_access: runtimeAccess },
    scope: { permitted_if_authorized: ['create branch', 'create commit', 'create pull request'], forbidden: ['merge', 'deploy', 'direct main write', 'credential change', 'destructive change'] },
    authorization: { state: 'NOT_GRANTED_BY_CAPABILITY_MANIFEST', mechanism: 'reality-github-write-gate', required: true, binding: 'exact candidate + repository + base_ref + changed paths + tree hash' },
    execution_verification: { state: 'UNVERIFIED', requirement: 'observed branch/commit/PR receipt' },
    truth_authority: false,
    action_authority: false,
    generated_at: new Date().toISOString(),
  };
}