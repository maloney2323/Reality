import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNativeUniverseContext } from '../src/reality-native-universe-v1.0.js';

test('Native Universe admits supplied request context and preserves world observations', () => {
  const context = buildNativeUniverseContext({
    systemContext: {
      universe_entries: [{
        entry_id: 'conversation:test',
        epistemic_kind: 'OBSERVATION',
        content: 'Known Reality context',
        provenance: { source: 'test' },
        evidence_references: ['evidence:test'],
      }],
      connected_world_observations: [{
        entry_id: 'world:test',
        epistemic_kind: 'OBSERVATION',
        event_kind: 'CONNECTED_WORLD_PROVIDER_STATE',
        payload: { status: 'VERIFIED_BY_LIVE_READ' },
        evidence_references: ['world-evidence:test'],
        provenance: { source: 'live_connector_observation' },
      }],
    },
  });

  assert.equal(context.status, 'AVAILABLE');
  assert.equal(context.persistence, 'REQUEST_CONTEXT');
  assert.equal(context.count, 2);
  assert.equal(context.entries[0].entry_id, 'conversation:test');
  assert.equal(context.entries[1].entry_id, 'world:test');
});

test('Native Universe does not invent context when none is supplied', () => {
  const context = buildNativeUniverseContext({ systemContext: {} });
  assert.equal(context.count, 0);
  assert.deepEqual(context.entries, []);
});
