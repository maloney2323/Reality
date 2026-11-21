import assert from 'node:assert/strict';
import { verifyHandoffIntegrity, createIntentRecord, structureIntent, createWorkItem } from '../src/reality-governed-work-runtime-v0.1.js';

const testDigest = 'sha256:abc';
const validRefs = ['ref1', 'ref2'];

assert.doesNotThrow(() => 
  verifyHandoffIntegrity({ requiredReferences: ['ref1'], carriedReferences: validRefs, declaredDigest: testDigest, consumerDigest: testDigest })
);

assert.throws(() => 
  verifyHandoffIntegrity({ requiredReferences: ['missing'], carriedReferences: validRefs, declaredDigest: testDigest, consumerDigest: testDigest })
);

assert.throws(() => 
  verifyHandoffIntegrity({ requiredReferences: ['ref1'], carriedReferences: validRefs, declaredDigest: 'a', consumerDigest: 'b' })
);

console.log('Governed Work Runtime v0.2 Integrity Checks: PASS');