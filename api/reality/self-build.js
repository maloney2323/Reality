import { createSelfBuildProposal, authorizeSelfBuild, executeSelfBuild } from '../../src/reality-self-build-controller-v1.0.js';
import { createGitHubSelfBuildProvider } from '../../src/reality-github-self-build-provider-v1.0.js';
import { getOrCreateSessionPrincipal } from '../../src/reality-session-principal-v0.1.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).setHeader('Allow', 'POST').json({ error: 'METHOD_NOT_ALLOWED' });

  try {
    const body = req.body || {};
    const principal = getOrCreateSessionPrincipal(req, res);

    if (body.authorization?.principal_id && body.authorization.principal_id !== principal.principal_id) {
      return res.status(403).json({ ok: false, error: 'AUTHORIZATION_PRINCIPAL_MISMATCH' });
    }

    if (!body.authorization?.authorized) {
      return res.status(200).json({
        ok: true,
        result: {
          status: 'BLOCKED',
          blocked_reason: 'EXPLICIT_SELF_BUILD_AUTHORIZATION_REQUIRED',
          principal_id: principal.principal_id,
          build: null,
        },
      });
    }

    const proposal = createSelfBuildProposal({
      requestedBy: principal.principal_id,
      objective: body.objective,
      rationale: body.rationale,
      files: body.files,
      tests: body.tests,
      baseRef: body.baseRef || 'main',
      riskLevel: body.riskLevel || 'low',
      verificationPlan: body.verificationPlan || [],
    });

    const build = authorizeSelfBuild(proposal, {
      authorizationRef: body.authorization.authorization_id,
      authorizedBy: body.authorization.approved_by || principal.principal_id,
    });

    const result = await executeSelfBuild(build, {
      provider: createGitHubSelfBuildProvider(),
    });

    return res.status(200).json({
      ok: true,
      result: {
        status: 'PR_OPENED',
        build: result,
        provider_version: createGitHubSelfBuildProvider().provider_version,
      },
    });
  } catch (error) {
    return res.status(error.status || 400).json({
      ok: false,
      error: error.message,
      provider_error: error.provider_error || null,
    });
  }
}
