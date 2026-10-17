import test from 'node:test';
import assert from 'node:assert/strict';
import { makeVerifiedTestAuthority } from './ect-test-helpers.js';
import { verifyExecutionECT } from '../src/reality-ect-execution-verifier-v0.1.js';

const workItem = { work_item_id:'work_item:ect-test', workflow_id:'workflow:ect-test', connector:'test-probe', operation:'record_write' };

test('accepts a correctly signed and operation-bound ECT', () => {
 const fixture = makeVerifiedTestAuthority(workItem);
 assert.equal(fixture.authority.verified_by, 'reality-ect-execution-verifier-v0.1');
});

test('rejects an expired ECT', () => {
 const fixture = makeVerifiedTestAuthority(workItem, { ttlSeconds:-1, skipVerify:true });
 assert.throws(() => verifyExecutionECT(fixture.token, {
   trustedPublicKeyPem:fixture.publicKey.export({type:'spki',format:'pem'}), expectedKeyId:fixture.keyId,
   expectedIssuer:fixture.issuer, expectedAudience:fixture.audience, expectedPolicyDigest:fixture.policyDigest,
   expectedAuthorityDigest:fixture.authorityDigest, expectedWorkstream:'test-workstream', workItem,
   workflowId:workItem.workflow_id,
 }), /TOKEN_EXPIRED/);
});

test('rejects a changed scope because the signature no longer matches', () => {
 const fixture = makeVerifiedTestAuthority(workItem);
 const parts = fixture.token.split('.');
 const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
 claims.scope = ['execute:ALL'];
 parts[1] = Buffer.from(JSON.stringify(claims)).toString('base64url');
 assert.throws(() => verifyExecutionECT(parts.join('.'), {
   trustedPublicKeyPem:fixture.publicKey.export({type:'spki',format:'pem'}), expectedKeyId:fixture.keyId,
   expectedIssuer:fixture.issuer, expectedAudience:fixture.audience, expectedPolicyDigest:fixture.policyDigest,
   expectedAuthorityDigest:fixture.authorityDigest, expectedWorkstream:'test-workstream', workItem,
   workflowId:workItem.workflow_id,
 }), /INVALID_SIGNATURE/);
});
