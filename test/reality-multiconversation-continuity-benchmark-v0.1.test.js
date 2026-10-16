import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const apiPath = new URL('../api/reality/intelligence.js', import.meta.url);
const gatewayPath = new URL('../src/reality-model-gateway-v0.1.js', import.meta.url);
const cognitivePath = new URL('../src/reality-cognitive-runtime-v1.0.js', import.meta.url);
const orchestrationPath = new URL('../src/reality-live-intelligence-orchestration-v0.1.js', import.meta.url);
const completenessPath = new URL('../src/reality-context-completeness-v0.1.js', import.meta.url);

async function source(url) {
  return readFile(url, 'utf8');
}

test('API source exposes an explicit continuity/context status', async () => {
  const text = await source(apiPath);
  assert.match(text, /context_loaded/);
  assert.match(text, /durable_context_source/);
});

test('API source has a bounded stored-message retrieval path (risk is visible to the suite)', async () => {
  const text = await source(apiPath);
  assert.match(text, /PersonalMessage/);
  assert.match(text, /limit=80|limit:\s*80/);
  assert.match(text, /slice\(0,\s*60\)/);
});

test('OpenAI gateway is the declared model transport', async () => {
  const text = await source(gatewayPath);
  assert.match(text, /OPENAI_RESPONSES_ONLY/);
  assert.match(text, /api\.openai\.com\/v1\/responses/);
  assert.match(text, /OPENAI_API_KEY/);
});

test('deep-reasoning runtime has explicit multi-lane behavior to measure for latency/context growth', async () => {
  const text = await source(cognitivePath);
  assert.match(text, /OBSERVER/);
  assert.match(text, /VERIFIER/);
  assert.match(text, /ADVERSARY/);
  assert.match(text, /invokeRealityModel/);
});

test('orchestration exposes continuity metadata and does not claim execution authority by default', async () => {
  const text = await source(orchestrationPath);
  assert.match(text, /continuity/);
  assert.match(text, /authority/i);
});

test('protocol is explicit that source checks are not a live benchmark pass', async () => {
  const protocol = await readFile(new URL('../docs/benchmarks/reality-multiconversation-continuity-benchmark-v0.1.md', import.meta.url), 'utf8');
  assert.match(protocol, /not a substitute for live multi-conversation testing/i);
  assert.match(protocol, /Infrastructure failure is reported separately/i);
  assert.match(protocol, /Never weaken thresholds/i);
});


test('continuity completeness flags a saturated 80-record source window as partial', async () => {
  const { classifyContextCompleteness } = await import(completenessPath.href);
  const result = classifyContextCompleteness({
    requestedLimit: 80,
    rawRecordCount: 80,
    eligibleMessageCount: 74,
    retainedMessageCount: 60,
  });
  assert.equal(result.status, 'PARTIAL_CONTEXT');
  assert.equal(result.complete, false);
  assert.equal(result.truncated, true);
  assert.equal(result.retained_message_count, 60);
});

test('continuity completeness distinguishes a fresh conversation from a partial history', async () => {
  const { classifyContextCompleteness } = await import(completenessPath.href);
  const result = classifyContextCompleteness({
    requestedLimit: 80,
    rawRecordCount: 0,
    eligibleMessageCount: 0,
    retainedMessageCount: 0,
  });
  assert.equal(result.status, 'NO_PRIOR_MESSAGES');
  assert.equal(result.complete, true);
  assert.equal(result.truncated, false);
});

test('unavailable context produces a safety directive that forbids continuity claims', async () => {
  const { classifyContextCompleteness, continuitySafetyDirective } = await import(completenessPath.href);
  const result = classifyContextCompleteness({ historyLoadSucceeded: false });
  assert.equal(result.status, 'UNAVAILABLE');
  assert.match(continuitySafetyDirective(result), /Do not claim continuity/i);
});

test('API fails closed instead of silently proceeding when authenticated context cannot load', async () => {
  const text = await source(apiPath);
  assert.match(text, /REALITY_CONTEXT_UNAVAILABLE/);
  assert.match(text, /unavailable\.status = 503/);
  assert.doesNotMatch(text, /return null;\s*\}\);\s*\n\s*const worldObservations/);
});

test('API exposes truncation and degraded continuity status to downstream reasoning and callers', async () => {
  const text = await source(apiPath);
  assert.match(text, /context_completeness: contextCompleteness/);
  assert.match(text, /continuity_safety_directive/);
  assert.match(text, /status: realityContext\?\.continuity_status/);
  assert.match(text, /slice\(0, 60\)/);
});


test('durable continuity reads are scoped to a conversation root by default', async () => {
  const text = await source(orchestrationPath);
  assert.match(text, /retrievalContinuityRootId = explicitContinuityRootId \|\| conversationContinuityRootId/);
  assert.match(text, /loadUniverseContext\(\{ systemContext, continuityRootId: retrievalContinuityRootId/);
  assert.match(text, /systemContext\?\.worldline_id && process\.env\.REALITY_UNIVERSE_PERSISTENCE_ENABLED/);
});
