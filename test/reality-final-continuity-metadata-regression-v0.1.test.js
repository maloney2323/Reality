import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const orchestrationPath = new URL('../src/reality-live-intelligence-orchestration-v0.1.js', import.meta.url);

test('action response refreshes continuity metadata after WORK and AUTHORITY appends', async () => {
  const text = await readFile(orchestrationPath, 'utf8');
  const appendWork = text.indexOf("stage: 'WORK'");
  const appendAuthority = text.indexOf("stage: 'AUTHORITY'");
  const finalSnapshot = text.indexOf('const finalContinuitySpine = {', appendAuthority);
  const actionReturn = text.indexOf('continuity_spine: finalContinuitySpine', finalSnapshot);

  assert.ok(appendWork >= 0, 'WORK stage append must exist');
  assert.ok(appendAuthority > appendWork, 'AUTHORITY must follow WORK');
  assert.ok(finalSnapshot > appendAuthority, 'final metadata must be captured after both governed stages');
  assert.ok(actionReturn > finalSnapshot, 'action response must use the refreshed continuity summary');
  assert.match(text.slice(finalSnapshot, actionReturn), /node_count:\s*continuityRuntime\?\.nodes\?\.length/);
  assert.match(text.slice(finalSnapshot, actionReturn), /last_event_id:\s*continuityRuntime\?\.spine\?\.last_event_id/);
});
