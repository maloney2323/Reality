import {
  capabilitySnapshot,
  inspectGitHubRepository,
  readGitHubFile,
  compareGitHubCommits,
  createGitHubBranch,
  writeGitHubFile,
  inspectVercelDeployment,
} from '../../src/reality-governed-system-access-v0.1.js';
import { verifyBase44Principal } from '../../src/reality-base44-principal-v0.1.js';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('allow', 'GET, POST');
    return json(res, 405, { error: 'METHOD_NOT_ALLOWED' });
  }

  if (req.method === 'GET') {
    return json(res, 200, {
      service: 'reality-governed-system-access',
      capabilities: capabilitySnapshot(),
    });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  try {
    await verifyBase44Principal(req);
    // Credential-backed writes are not allowed to bypass the separately
    // governed work-item/owner-consent/provider-readback architecture.
    if (['create_github_branch','write_github_file'].includes(body.operation)) {
      return json(res,503,{
        ok:false,error:'DIRECT_SYSTEM_WRITE_NOT_RELEASED',
        reason:'EXACT_ACTION_AUTHORIZATION_AND_VERIFIED_EXECUTION_REQUIRED',
        external_action_executed:false,
      });
    }
    let result;
    switch (body.operation) {
      case 'inspect_github_repository':
        result = await inspectGitHubRepository(body);
        break;
      case 'read_github_file':
        result = await readGitHubFile(body);
        break;
      case 'compare_github_commits':
        result = await compareGitHubCommits(body);
        break;
      case 'inspect_vercel_deployment':
        result = await inspectVercelDeployment(body);
        break;
      case 'create_github_branch':
        result = await createGitHubBranch(body);
        break;
      case 'write_github_file':
        result = await writeGitHubFile(body);
        break;
      default:
        return json(res, 400, { error: 'OPERATION_NOT_SUPPORTED', verified: false });
    }
    return json(res, 200, result);
  } catch (error) {
    return json(res, error.status || 502, {
      error: error.message,
      verified: false,
      external_status: error.status || null,
    });
  }
}
