import assert from 'node:assert/strict';
import { createBusinessUpdate, interpretAsk, createInvestigationWork } from '../src/reality-intent-engine.js';
import { createChatContext, governedOpinionFromState, assertChatCannotExecute } from '../src/reality-chat-interface.js';

const business = createBusinessUpdate({
  businessName: 'Example Service Business',
  businessType: 'owner-operated-service',
  industry: 'general',
  purpose: 'Protect customer commitments and reduce missed operational work.',
  operationalDomains: ['customers', 'scheduling', 'billing'],
  currentPriorities: ['on-time delivery'],
  successCriteria: ['fewer missed commitments'],
  workflows: ['intake', 'scheduling', 'completion'],
  connectedSystems: ['email', 'calendar', 'accounting'],
});
assert.deepEqual(business.operational_domains, ['customers', 'scheduling', 'billing']);
assert.deepEqual(business.connected_systems, ['email', 'calendar', 'accounting']);

const interpretation = interpretAsk({
  ask: 'Why is the Vercel deployment not reflecting the latest GitHub commit?',
  businessUpdate: business,
});
assert.deepEqual(interpretation.candidate_worlds, ['github', 'vercel']);
assert.equal(interpretation.next_decision, 'INVESTIGATE');

const work = createInvestigationWork({ interpretation, hypothesis: 'The deployment may be stale.' });
assert.equal(work.hypothesis.status, 'UNVERIFIED');
assert.equal(work.authorization_created, false);

const chat = createChatContext({ businessUpdate: business });
assert.equal(chat.boundary.execution_access, false);
assert.equal(chat.boundary.governed_opinion_access, true);
assert.deepEqual(assertChatCannotExecute({ execute: true }), {
  allowed: false, reason: 'CHAT_BOUNDARY_PROHIBITS_EXECUTION', execution: 'BLOCKED',
});

const established = governedOpinionFromState({
  state: { evidenceSufficient: true, establishedFacts: ['Commit X is deployed.'], decision: 'ACT' },
  evidence: [{ evidence_id: 'ev-1' }],
  ask: 'What is deployed?',
  nextStep: 'ACT',
});
assert.equal(established.status, 'ESTABLISHED');
assert.deepEqual(established.evidence_refs, ['ev-1']);
assert.equal(established.execution_authorized, false);

const contradiction = governedOpinionFromState({
  state: { contradictions: [{ key: 'deployment.commit' }], evidenceSufficient: false },
});
assert.equal(contradiction.status, 'UNRESOLVED_CONTRADICTION');

console.log('Governed opinion v0.2 + industry-agnostic business model: PASS');
