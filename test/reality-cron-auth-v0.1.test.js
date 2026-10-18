import test from 'node:test';
import assert from 'node:assert/strict';
import { isAuthorizedCronRequest } from '../src/reality-cron-auth-v0.1.js';

test('cron authorization fails closed when no secret is configured', () => {
  assert.equal(isAuthorizedCronRequest({ headers: { authorization: 'Bearer anything' } }, ''), false);
  assert.equal(isAuthorizedCronRequest({ headers: {} }, undefined), false);
});

test('cron authorization accepts only the exact configured bearer secret', () => {
  assert.equal(isAuthorizedCronRequest({ headers: { authorization: 'Bearer correct-secret' } }, 'correct-secret'), true);
  assert.equal(isAuthorizedCronRequest({ headers: { authorization: 'Bearer wrong-secret' } }, 'correct-secret'), false);
  assert.equal(isAuthorizedCronRequest({ headers: { authorization: 'correct-secret' } }, 'correct-secret'), false);
});

test('spoofable cron user-agent alone does not authorize a tick', () => {
  assert.equal(isAuthorizedCronRequest({ headers: { 'user-agent': 'vercel-cron/1.0' } }, 'correct-secret'), false);
});
