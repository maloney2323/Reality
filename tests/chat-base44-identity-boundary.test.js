import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const handler = readFileSync(new URL('../api/chat.js', import.meta.url), 'utf8');

// Release-blocking contract: a Base44 Authorization header must be verified
// server-side against the trusted identity provider before any model call.
// A Reality-issued cookie or a random principal is not sufficient.
test('chat must not substitute an anonymous Reality principal for Base44 identity', () => {
  assert.doesNotMatch(handler, /getOrCreateSessionPrincipal\(req, res\)/,
    'BLOCKED: Vercel chat currently creates a new Reality principal without validating the Base44 bearer');
});

test('chat must bind authenticated principal to the model request', () => {
  assert.match(handler, /requestedBy:\s*principal\.principal_id/,
    'Model request must receive an authenticated principal');
});
