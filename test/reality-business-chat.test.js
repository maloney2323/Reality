import assert from 'node:assert/strict';
import { createBusinessUpdate, interpretAsk, createInvestigationWork } from '../src/reality-intent-engine.js';
import { createChatContext, governedOpinion, assertChatCannotExecute } from '../src/reality-chat-interface.js';
import { createReceipt, assertReceiptCannotUpgradeStatus } from '../src/reality-receipt-controller.js';

const business = createBusinessUpdate({
  businessId: 'business-1',
  businessName: 'Example Service Business',
  purpose: 'Protect customer commitments and reduce missed operational work.',
  currentPriorities: ['on-time delivery'],
});

const interpretation = interpretAsk({
  ask: 'Why is the Vercel deployment not reflecting the latest GitHub commit?',
  businessUpdate: business,
});

assert.equal(interpretation.business_outcome, business.purpose);
assert.deepEqual(interpretation.candidate_worlds, ['github', 'vercel']);
assert.equal(interpretation.next_decision, 'INVESTIGATE');
assert.equal(interpretation.action_authorized, false);

const work = createInvestigationWork({
  interpretation,
  hypothesis: 'The deployment may be stale.',
});
assert.deepEqual(work.required_worlds, ['github', 'vercel']);
assert.equal(work.hypothesis.status, 'UNVERIFIED');
assert.equal(work.authorization_created, false);

const chat = createChatContext({ businessUpdate: business });
assert.equal(chat.boundary.execution_access, false);
assert.equal(chat.boundary.constitutional_write_access, false);
assert.equal(chat.boundary.governed_opinion_access, true);

assert.deepEqual(assertChatCannotExecute({ execute: true }), {
  allowed: false,
  reason: 'CHAT_BOUNDARY_PROHIBITS_EXECUTION',
  execution: 'BLOCKED',
});

const opinion = governedOpinion({
  status: 'UNRESOLVED_CONTRADICTION',
  contradictions: [{ key: 'deployment.commit', status: 'UNRESOLVED_CONTRADICTION' }],
  nextStep: 'ESCALATE',
});
assert.equal(opinion.epistemic_status, 'GOVERNED_READ_ONLY');
assert.equal(opinion.execution_authorized, false);

const receipt = createReceipt({
  type: 'HYPOTHESIS',
  chainId: 'chain-1',
  hypothesis: 'Deployment may be stale.',
});
assert.equal(receipt.epistemic_status, 'HYPOTHESIS');
assert.deepEqual(assertReceiptCannotUpgradeStatus(receipt, 'TRUTH'), {
  allowed: false,
  reason: 'EPISTEMIC_STATUS_UPGRADE_NOT_PERMITTED',
});

console.log('Business context + first-class chat + receipt boundary: PASS');
