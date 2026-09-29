import assert from 'node:assert/strict';
import { investigatorWorld, planInvestigation, acceptEvidence, reconcileEvidence } from '../src/reality-investigator.js';

const world = investigatorWorld();
assert.deepEqual(world.required_sources, ['github','vercel','base44']);

const plan = planInvestigation({ question: 'Investigate Reality deployment state.' });
assert.equal(plan.status, 'READY_TO_INVESTIGATE');

const blocked = planInvestigation({ question: 'Investigate Reality.', availableSources: ['github','vercel'] });
assert.equal(blocked.status, 'BLOCKED_MISSING_WORLD_SOURCE');
assert.deepEqual(blocked.missing_sources, ['base44']);

const a = acceptEvidence({ source:'github', evidence:{path:'src/reality-constitution.js'}, observedAt:'2026-09-29T00:00:00Z', sourceVersion:'abc' });
const b = acceptEvidence({ source:'vercel', evidence:{deployment:'ready'}, observedAt:'2026-09-29T00:01:00Z', sourceVersion:'def' });
const c = acceptEvidence({ source:'base44', evidence:{app:'Reality'}, observedAt:'2026-09-29T00:02:00Z', sourceVersion:'ghi' });
assert.equal(a.independently_verified, false);
assert.equal(reconcileEvidence([
  {...a, claim:{key:'reality.status',value:'READY'}},
  {...b, claim:{key:'reality.status',value:'READY'}},
  {...c, claim:{key:'reality.status',value:'UNKNOWN'}}
]).status, 'CONTRADICTION_PRESERVED');

console.log('Investigator three-world contract: PASS');
