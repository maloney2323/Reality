export const SERVER_EXECUTION_BRIDGE_VERSION = 'reality-server-execution-bridge-v0.1';

function requireUrl(name) {
  const value = process.env[name];
  if (!value) throw new Error(name + '_NOT_CONFIGURED');
  return value;
}

async function postJson(url, body) {
  const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => null);
  if (!response.ok) { const error = new Error('SERVER_BRIDGE_REQUEST_FAILED'); error.status = response.status; error.provider_error = payload?.error || null; throw error; }
  return payload;
}

export function getServerExecutionBridges() {
  return {
    execute: async ({ workItem, authorization, execution }) => postJson(requireUrl('REALITY_EXECUTION_CONNECTOR_URL'), { workItem, authorization, execution }),
    verify: async ({ workItem, authorization, execution, providerResult }) => postJson(requireUrl('REALITY_EXECUTION_VERIFIER_URL'), { workItem, authorization, execution, providerResult }),
    bridge_version: SERVER_EXECUTION_BRIDGE_VERSION,
  };
}