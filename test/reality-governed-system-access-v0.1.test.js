import assert from 'node:assert/strict';
import {
  capabilitySnapshot,
  independentInspectionDigest,
} from '../src/reality-governed-system-access-v0.1.js';

const snapshot = capabilitySnapshot();

assert.equal(snapshot.version, 'reality-governed-system-access-v0.1');
assert.equal(snapshot.github.read, true);
assert.equal(snapshot.github.scope, 'repository:maloney2323/Reality');
assert.equal(snapshot.governance.readIsNotAuthority, true);
assert.equal(snapshot.governance.writeRequiresExplicitAuthorization, true);
assert.equal(snapshot.governance.deploymentIsNotVerification, true);

const digestA = independentInspectionDigest({ commit: 'abc', files: ['a.js'] });
const digestB = independentInspectionDigest({ commit: 'abc', files: ['a.js'] });
assert.equal(digestA, digestB);

console.log('Governed system access v0.1: PASS');
