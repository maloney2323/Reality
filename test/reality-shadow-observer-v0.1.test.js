import assert from 'node:assert/strict';
import { buildShadowObservations, detectRecurringWork } from '../src/reality-shadow-observer-v0.1.js';

const observations = buildShadowObservations({
  observedAt: '2026-10-06T22:00:00.000Z',
  commits: [
    { sha: 'a1', message: 'fix: deploy runtime', repository: 'maloney2323/Reality' },
    { sha: 'b2', message: 'fix: deploy runtime', repository: 'maloney2323/Reality' },
    { sha: 'c3', message: 'test: verify continuity', repository: 'maloney2323/Reality' },
  ],
});
const candidates = detectRecurringWork(observations);
assert.equal(observations.length, 3);
assert.equal(candidates.length, 1);
assert.equal(candidates[0].frequency_signal, 2);
assert.equal(candidates[0].authority, 'NONE');
assert.equal(candidates[0].execution, 'NOT_AUTHORIZED');
console.log('REALITY_SHADOW_OBSERVER_V0_1_PASS');
