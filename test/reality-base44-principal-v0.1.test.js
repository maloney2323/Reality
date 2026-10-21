import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyBase44Principal } from '../src/reality-base44-principal-v0.1.js';

const req = authorization => ({ headers: authorization ? { authorization } : {} });
test('missing token fails closed without contacting Base44', async () => {
  await assert.rejects(verifyBase44Principal(req(), {fetchImpl: () => { throw Error('should not fetch'); }}), {message:'AUTHENTICATION_REQUIRED',status:401});
});
test('invalid token fails closed', async () => {
  await assert.rejects(verifyBase44Principal(req('Bearer invalid'), {fetchImpl: async () => ({ok:false,status:401})}), {message:'INVALID_SESSION',status:401});
});
test('verified user ID comes only from Base44 response', async () => {
  const principal = await verifyBase44Principal(req('Bearer sample'), {fetchImpl: async (url, opts) => {
    assert.match(url, /\/entities\/User\/me$/);
    assert.equal(opts.headers.Authorization, 'Bearer sample');
    return {ok:true,json:async () => ({id:'user-123'})};
  }});
  assert.equal(principal.principal_id, 'base44:user-123');
});
test('identity provider outage fails closed', async () => {
  await assert.rejects(verifyBase44Principal(req('Bearer sample'), {fetchImpl: async () => {throw Error('offline');}}), {message:'IDENTITY_PROVIDER_UNAVAILABLE',status:503});
});
test('missing identity in provider response fails closed', async () => {
  await assert.rejects(verifyBase44Principal(req('Bearer sample'), {fetchImpl: async () => ({ok:true,json:async () => ({})})}), {message:'IDENTITY_VERIFICATION_FAILED',status:503});
});
