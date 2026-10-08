import { githubWrite, githubGet } from './reality-connector-github-v1.0.js';
import { vercelWrite, vercelGet } from './reality-connector-vercel-v1.0.js';
import { supabaseWrite, supabaseGet } from './reality-connector-supabase-v1.0.js';

export const SERVER_EXECUTION_BRIDGE_VERSION = 'reality-server-execution-bridge-v1.0';

function reject(message) { const error = new Error(message); error.status = 403; throw error; }

async function executeViaRealityConnector({ workItem }) {
  const connector = workItem?.connector;
  const operation = workItem?.operation;
  const input = workItem?.inputs || {};

  if (connector === 'github') {
    if (operation !== 'create_issue') reject('GITHUB_OPERATION_NOT_ALLOWED');
    if (input.repository !== 'maloney2323/Reality') reject('GITHUB_REPOSITORY_NOT_ALLOWED');
    return githubWrite('/repos/maloney2323/Reality/issues', 'POST', {
      title: String(input.title || ''),
      body: typeof input.body === 'string' ? input.body : '',
    }).then(result => ({
      ok: true,
      provider: 'github',
      operation,
      providerExecutionId: String(result.id),
      observation: {
        repository: 'maloney2323/Reality',
        issue_number: result.number,
        issue_url: result.html_url,
        title: result.title,
        state: result.state,
      }
    }));
  }

  if (connector === 'vercel') {
    if (operation !== 'create_deployment') reject('VERCEL_OPERATION_NOT_ALLOWED');
    return vercelWrite(String(input.path || '/v13/deployments'), 'POST', input.payload || {});
  }

  if (connector === 'supabase') {
    if (!['insert','update','delete'].includes(operation)) reject('SUPABASE_OPERATION_NOT_ALLOWED');
    const method = operation === 'insert' ? 'POST' : operation === 'update' ? 'PATCH' : 'DELETE';
    return supabaseWrite(String(input.path || ''), method, input.payload || {});
  }

  reject('CONNECTOR_NOT_REGISTERED');
}

async function verifyViaRealityConnector({ workItem, providerResult, execution }) {
  const connector = workItem?.connector;
  const operation = workItem?.operation;
  const input = workItem?.inputs || {};

  if (connector === 'github' && operation === 'create_issue') {
    if (input.repository !== 'maloney2323/Reality') reject('GITHUB_REPOSITORY_NOT_ALLOWED');
    const number = Number(providerResult?.observation?.issue_number);
    if (!Number.isInteger(number) || number < 1) reject('VERIFICATION_TARGET_INVALID');
    const observed = await githubGet(`/repos/maloney2323/Reality/issues/${number}`);
    const verified = observed.number === number &&
      observed.title === String(input.title || '') &&
      observed.state === 'open';
    return {
      ok: true, verified, independent: true, basis: 'REALITY_OWNED_GITHUB_READBACK',
      verification_id: `github-verification:${observed.id}`,
      observedState: { repository:'maloney2323/Reality', issue_number:observed.number, title:observed.title, state:observed.state, url:observed.html_url, execution_id:execution?.execution_id || null },
      mismatch: verified ? null : { expected_title:String(input.title || ''), observed_title:observed.title, expected_state:'open', observed_state:observed.state }
    };
  }

  if (connector === 'vercel') {
    const deploymentId = providerResult?.id || providerResult?.deploymentId;
    if (!deploymentId) return { ok:true, verified:false, independent:true, basis:'REALITY_OWNED_VERCEL_READBACK', mismatch:{reason:'DEPLOYMENT_ID_MISSING'} };
    const observed = await vercelGet(`/v13/deployments/${encodeURIComponent(deploymentId)}`);
    return { ok:true, verified:Boolean(observed?.id === deploymentId && ['READY','ERROR','CANCELED'].includes(observed?.readyState)), independent:true, basis:'REALITY_OWNED_VERCEL_READBACK', observedState:observed };
  }

  return { ok:true, verified:false, independent:true, basis:'REALITY_CONNECTOR_NO_VERIFIER', mismatch:{reason:'VERIFIER_NOT_IMPLEMENTED',connector,operation} };
}

export function getServerExecutionBridges() {
  return {
    execute: executeViaRealityConnector,
    verify: verifyViaRealityConnector,
    bridge_version: SERVER_EXECUTION_BRIDGE_VERSION,
    dependency_on_chatgpt_plugins: false,
    dependency_on_external_bridge_urls: false,
  };
}
