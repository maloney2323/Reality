import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('homepage script parses and operational greeting controls exist', () => {
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, 'home page must contain inline app script');
  assert.doesNotThrow(() => new Script(match[1]));
  for (const id of [
    'operationalGreeting', 'greetingHeadline', 'greetingMessage',
    'greetingFindings', 'greetingCoverage', 'greetingReviewWork',
    'greetingRefresh', 'greetingDismiss', 'reviewOperations',
  ]) assert.match(html, new RegExp('id="' + id + '"'));
});

test('greeting does not authorize work or hard-code employee progress', () => {
  assert.match(html, /\/api\/reality\/operational-greeting/);
  assert.match(html, /Employee jobs: not yet connected/);
  assert.match(html, /NOT_VERIFIED_BY_GREETING|No execution or repair verified/);
  assert.doesNotMatch(html, /Riley.{0,70}(done|completed|repaired)/i);
});