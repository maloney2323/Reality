import assert from 'node:assert/strict';
import { observeUserMessage, evaluateGeneratedConclusion, assertGenerationAfterObservation } from '../src/reality-observation-boundary-v0.1.js';

const boundary = observeUserMessage({ message: 'Send the invoice to my customer; my API key is abc123.' });
assert.equal(boundary.classifications.proposed_actions.length, 1);
assert.equal(boundary.classifications.sensitive_data.length, 2);
assert.equal(boundary.authority.action_authorized, false);
assert.equal(boundary.authority.memory_write_authorized, false);
assert.equal(assertGenerationAfterObservation({ boundary }).allowed, true);
assert.deepEqual(
  evaluateGeneratedConclusion({ boundary, conclusion: 'The invoice was sent.', material: true }),
  { status: 'BLOCKED', reason: 'MATERIAL_CONCLUSION_REQUIRES_EVIDENCE' },
);
console.log('Observation Boundary v0.1: PASS');
