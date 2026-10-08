import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectConnectorRegistry, connectorContract } from '../src/reality-connector-registry-v1.0.js';
import { getServerExecutionBridges } from '../src/reality-server-execution-bridge-v0.1.js';

test('connector registry is Reality-owned and ChatGPT-independent', () => {
  const contract = connectorContract();
  assert.equal(contract.owner, 'Reality');
  assert.equal(contract.dependency_on_chatgpt_plugins, false);
  assert.deepEqual(contract.providers.map(p => p.id), ['github','vercel','supabase']);
});

test('connector inspection never exposes credential values', () => {
  const result = inspectConnectorRegistry({
    REALITY_GITHUB_TOKEN: 'secret',
    REALITY_VERCEL_TOKEN: 'secret',
    SUPABASE_SECRET_KEY: 'secret'
  });
  assert.equal(result.every(r => !Object.values(r).includes('secret')), true);
  assert.equal(result.every(r => r.credential_present === true), true);
});

test('execution bridge is connector-native', () => {
  const bridge = getServerExecutionBridges();
  assert.equal(bridge.dependency_on_chatgpt_plugins, false);
  assert.equal(bridge.dependency_on_external_bridge_urls, false);
  assert.equal(bridge.bridge_version, 'reality-server-execution-bridge-v1.0');
});
