import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyExecutionECT } from '../src/reality-ect-execution-verifier-v0.1.js';

test('rejects a malformed evaluation context token', () => {
 assert.throws(() => verifyExecutionECT('not-a-token', {}), /MISSING_AUTHORITY|ECT_TRUST_CONFIGURATION_MISSING/);
});
