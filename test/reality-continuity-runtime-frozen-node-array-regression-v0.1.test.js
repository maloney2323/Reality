import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGovernedChatSignal } from '../src/reality-governed-fragmented-signal-cleaner-v0.1.js';
import { startContinuityRuntime } from '../src/reality-continuity-spine-runtime-v0.1.js';

test('continuity runtime can append governed stages after returning its frozen initial snapshot', async () => {
  const previous = process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED;
  process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED = 'false';

  try {
    const signal = buildGovernedChatSignal({
      message: 'Check the runtime continuity append path.',
      observedAt: '2026-10-17T12:00:00.000Z',
    });
    const runtime = await startContinuityRuntime({
      continuityRootSource: 'continuity:test-later-stage-append',
      worldlineSource: 'reality:test',
      subjectId: 'conversation:test-later-stage-append',
      signal,
      observedAt: '2026-10-17T12:00:00.000Z',
    });

    assert.equal(runtime.nodes.length, 3);
    assert.equal(Object.isFrozen(runtime.nodes), true);

    await assert.doesNotReject(() => runtime.appendStage({
      stage: 'WORK',
      entityId: 'work-item:test-later-stage-append',
      epistemicStatus: 'PROPOSED',
      payload: { work_item_id: 'work-item:test-later-stage-append' },
      provenance: { source: 'regression_test' },
    }));

    assert.equal(runtime.nodes.length, 4);
    assert.equal(runtime.nodes[3].stage, 'WORK');
    assert.equal(runtime.spine.current_stage, 'WORK');
    assert.equal(Object.isFrozen(runtime.nodes), true);
  } finally {
    if (previous === undefined) delete process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED;
    else process.env.REALITY_UNIVERSE_PERSISTENCE_ENABLED = previous;
  }
});
