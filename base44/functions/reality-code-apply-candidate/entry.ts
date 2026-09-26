import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { githubJsonResponse as json, applyCodeEditsToGitHub } from '../../shared/reality-core/github-client.ts';
import { consumeGithubWriteAuthorization } from '../../shared/reality-core/github-write-gate-v0.1.js';

// Reality Code Apply Candidate v0.1
//
// Bridges a governed CODE_PATCH_CANDIDATE artifact to GitHub: creates a branch,
// commits the exact replacement bytes as a single commit, and opens a pull
// request. The human reviews and merges the PR. This function does NOT merge,
// deploy, or mint an execution permit. action_authorized stays false — creating
// a PR is a proposal, not an authorization.

const FUNCTION_VERSION = 'reality-code-apply-candidate-v0.1';

function splitRepository(fullName: string) {
  const [owner, repo, ...extra] = String(fullName || '').split('/');
  if (!owner || !repo || extra.length) throw new Error('repository must be owner/name');
  return { owner, repo };
}

function sanitizeBranchSuffix(value: string) {
  const cleaned = String(value || '')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return cleaned || 'candidate';
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const principal = await base44.auth.me();
    if (!principal?.id) return json({ error: 'Authentication required.' }, 401);
    if (principal.role !== 'admin') return json({ error: 'Admin access required.' }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || 'status').trim();

    if (action === 'status') {
      return json({
        schema: 'reality.code-apply-candidate.v0.1',
        version: FUNCTION_VERSION,
        mode: 'GOVERNED_BRANCH_AND_PR_ONLY',
        merge_authorized: false,
        deploy_authorized: false,
        action_authorized: false,
        live_repository_write_authorized: true,
        description: 'Creates a branch and pull request from a CODE_PATCH_CANDIDATE artifact. Merging remains a human action.',
        required_inputs: ['candidate_artifact_id', 'repository (owner/repo)', 'base_ref (default main)'],
      });
    }

    if (action !== 'apply') return json({ error: 'Unknown action. Use status or apply.' }, 400);

    const candidateArtifactId = String(body?.candidate_artifact_id || '').trim();
    const repository = String(body?.repository || '').trim();
    const githubWritePermitId = String(body?.github_write_permit_id || '').trim();
    const githubWritePermitToken = String(body?.github_write_permit_token || '');
    const baseRef = String(body?.base_ref || 'main').trim();
    if (!candidateArtifactId) return json({ error: 'candidate_artifact_id is required.' }, 400);
    if (!repository) return json({ error: 'repository (owner/repo) is required.' }, 400);
    if (!githubWritePermitId || !githubWritePermitToken) return json({ error: 'EXPLICIT_GITHUB_WRITE_AUTHORIZATION_REQUIRED' }, 403);

    const service = base44.asServiceRole;

    // Load the CODE_PATCH_CANDIDATE artifact.
    let artifact: any;
    try {
      artifact = await service.entities.DerivedArtifact.get(candidateArtifactId);
    } catch {
      return json({ error: 'CODE_PATCH_CANDIDATE artifact not found.' }, 404);
    }
    if (!artifact || artifact.user_id !== principal.id) {
      return json({ error: 'Artifact not found for this user.' }, 404);
    }
    if (artifact.artifact_type !== 'CODE_PATCH_CANDIDATE') {
      return json({ error: 'Artifact is not a CODE_PATCH_CANDIDATE.' }, 409);
    }
    if (artifact.status !== 'CANDIDATE' && artifact.status !== 'ACTIVE') {
      return json({ error: `Candidate artifact is not in an applicable status (current: ${artifact.status}).` }, 409);
    }
    const candidate = artifact.extension_data;
    if (!candidate || !Array.isArray(candidate.edits) || candidate.edits.length === 0) {
      return json({ error: 'Candidate artifact has no edits to apply.' }, 409);
    }

    const { owner, repo } = splitRepository(repository);
    const authorizationRows = await service.entities.DerivedArtifact.filter({ id: githubWritePermitId, user_id: principal.id, artifact_type: 'CODE_WRITE_AUTHORIZATION' }, '-created_date', 5, 0);
    if (!Array.isArray(authorizationRows) || authorizationRows.length !== 1) return json({ error: 'GITHUB_WRITE_AUTHORIZATION_NOT_FOUND' }, 403);
    await consumeGithubWriteAuthorization({ service, authorization: authorizationRows[0], permitToken: githubWritePermitToken, candidate: artifact, repository, baseRef });
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('github');

    const branchName = `reality/${sanitizeBranchSuffix(candidate.candidate_id || candidateArtifactId)}`;
    const commitMessage = [
      `Reality candidate: ${candidate.candidate_summary || candidate.candidate_id}`,
      ``,
      `Permit: ${candidate.permit_id || '—'}`,
      `WIP: ${candidate.wip_artifact_id || '—'}`,
      `Review: ${candidate.review_receipt_id || '—'}`,
      `Candidate tree: ${candidate.candidate_code_tree_hash || '—'}`,
    ].join('\n');
    const prBody = [
      `## Reality governed code change candidate`,
      ``,
      `**Candidate ID:** ${candidate.candidate_id || '—'}`,
      `**Permit:** ${candidate.permit_id || '—'}`,
      `**WIP artifact:** ${candidate.wip_artifact_id || '—'}`,
      `**Review receipt:** ${candidate.review_receipt_id || '—'}`,
      `**Base tree:** ${candidate.base_code_tree_hash || '—'}`,
      `**Candidate tree:** ${candidate.candidate_code_tree_hash || '—'}`,
      ``,
      `### Summary`,
      String(candidate.candidate_summary || ''),
      ``,
      `### Changed files (${(candidate.changed_paths || candidate.edits).length})`,
      ...candidate.edits.map((edit: any) => `- \`${edit.path}\` — ${edit.change_summary || 'edit'}`),
      ``,
      `### Governance`,
      `Reality produced this candidate through the WIP → review → delegation permit → candidate generation pipeline. This pull request was created automatically; **merging is a human action**. The Code Change Gate should evaluate this branch before merge.`,
    ].join('\n');
    const applied = await applyCodeEditsToGitHub(
      accessToken,
      owner,
      repo,
      baseRef,
      branchName,
      candidate.edits,
      commitMessage,
      `Reality candidate: ${String(candidate.candidate_summary || candidate.candidate_id).slice(0, 80)}`,
      prBody,
    );

    return json({
      schema: 'reality.code-apply-candidate-result.v0.1',
      version: FUNCTION_VERSION,
      mode: 'GOVERNED_BRANCH_AND_PR_ONLY',
      ok: true,
      repository,
      base_ref: baseRef,
      branch: applied.branch,
      commit_sha: applied.commit_sha,
      pull_request_url: applied.pull_request_url,
      pull_request_number: applied.pull_request_number,
      changed_files: candidate.edits.map((edit: any) => edit.path),
      candidate_artifact_id: candidateArtifactId,
      governance: {
        merge_authorized: false,
        deploy_authorized: false,
        action_authorized: false,
        live_repository_write_authorized: true,
        authority: 'CODE_PATCH_CANDIDATE_APPLIED_AS_BRANCH_AND_PR_ONLY',
        next_step: 'A human reviews and merges the pull request. The Code Change Gate may evaluate this branch before merge.',
      },
    });
  } catch (error: any) {
    console.error('reality-code-apply-candidate failed', error);
    return json({
      error: 'Reality could not apply the candidate to GitHub.',
      diagnostic: error?.message || String(error),
      merge_authorized: false,
      deploy_authorized: false,
      action_authorized: false,
      github_status: error?.status || null,
    }, error?.status || 500);
  }
}