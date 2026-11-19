import test from 'node:test';
import assert from 'node:assert/strict';
import {
  stableUuid, cronRequest, loadAssignedShiftWork, evaluateShiftLaunchReadiness,
  shiftOperationPersistence, persistShiftRecoveryStage,
} from '../api/reality/shift.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test('shift event IDs conform to the production UUID schema and remain deterministic', () => {
  assert.match(stableUuid('shift', 'tick:2026-11-18'), uuid);
  assert.equal(stableUuid('shift', 'tick:2026-11-18'), stableUuid('shift', 'tick:2026-11-18'));
  assert.notEqual(stableUuid('shift', 'tick:2026-11-18'), stableUuid('shift', 'tick:2026-11-19'));
});

test('shift operation recorder uses DB UUIDs without discarding original operation references', async () => {
  const records = [];
  const p = shiftOperationPersistence({ appendEvent: async event => records.push(event) });
  await p.appendEvent({
    event_id: 'shift:operation:attempt:event', entity_id: 'shift:operation:attempt',
    parent_event_id: null, provenance: { source: 'reality' },
  });
  assert.match(records[0].event_id, uuid);
  assert.match(records[0].entity_id, uuid);
  assert.equal(records[0].provenance.source_operation_event_id, 'shift:operation:attempt:event');
});

test('durable shift assignments are scoped to the exact owner and current state', async () => {
  const history = [
    { entity_type: 'shift_work_item', payload: {
      state: 'ASSIGNED', principal_id: 'owner-A',
      work_item: { work_item_id: 'w1', continuity_root_id: stableUuid('root', 'w1') },
    }},
    { entity_type: 'shift_work_item', payload: {
      state: 'ASSIGNED', principal_id: 'owner-B',
      work_item: { work_item_id: 'w2', continuity_root_id: stableUuid('root', 'w2') },
    }},
    { entity_type: 'shift_work_item', payload: {
      state: 'COMPLETED', principal_id: 'owner-A',
      work_item: { work_item_id: 'w3', continuity_root_id: stableUuid('root', 'w3') },
    }},
  ];
  const persistence = { reconstruct: async () => history };
  const ownerA = await loadAssignedShiftWork(persistence, { principalId: 'owner-A' });
  assert.deepEqual(ownerA.map(x => x.work_item_id), ['w1']);
  const nobody = await loadAssignedShiftWork(persistence);
  assert.deepEqual(nobody, []);
});

test('repair events persist original continuity root, job identity and evidence', async () => {
  let recorded;
  const root = stableUuid('root', 'job-X');
  await persistShiftRecoveryStage({ appendEvent: async entry => { recorded = entry; } }, {
    event_id: stableUuid('event', 'x'), shift_id: 'shift-x',
    work_item_id: 'job-x', continuity_root_id: root,
    stage: 'INSTALLATION_VERIFIED_RESUME_ORIGINAL',
    attempt: 1, detail: { evidence_refs: ['provider-readback:x'] },
  });
  assert.match(recorded.event_id, uuid);
  assert.match(recorded.entity_id, uuid);
  assert.equal(recorded.continuity_root_id, root);
  assert.equal(recorded.payload.work_item_id, 'job-x');
  assert.deepEqual(recorded.evidence_refs, ['provider-readback:x']);
  await assert.rejects(
    persistShiftRecoveryStage({ appendEvent: async () => {} }, {
      event_id: stableUuid('event', 'bad'), shift_id: 'shift-x',
      work_item_id: 'job-x', continuity_root_id: 'invented-root',
      stage: 'VERIFIED_COMPLETION', attempt: 1,
    }), /SHIFT_WORK_CONTINUITY_ROOT_UUID_REQUIRED/,
  );
});

test('scheduled shift rejects caller-controlled User-Agent and arbitrary Bearer tokens', () => {
  const secret = 'real-cron-secret';
  assert.equal(cronRequest({ headers: { 'user-agent': 'vercel-cron/' } }, secret), false);
  assert.equal(cronRequest({ headers: { authorization: 'Bearer anything' } }, secret), false);
  assert.equal(cronRequest({ headers: { authorization: 'Bearer ' + secret } }, secret), true);
  assert.equal(cronRequest({ headers: { authorization: 'Bearer ' + secret } }, ''), false);
});


test('live start refuses absent owner configuration or missing connector credentials',()=>{
  const config={enabled:true,updated_by:'owner-1'};
  const fullEnv={SUPABASE_URL:'http://supabase.invalid',
    SUPABASE_SECRET_KEY:'present-but-not-a-real-key',
    REALITY_GITHUB_TOKEN:'present-not-real',
    OPENAI_API_KEY:'present-not-real'};
  const ready=evaluateShiftLaunchReadiness({config,principalId:'owner-1',env:fullEnv});
  assert.equal(ready.status,'READY_TO_ATTEMPT');
  assert.equal(ready.live_connector_access_verified,false);
  const previewModel=evaluateShiftLaunchReadiness({
    config,principalId:'owner-1',
    env:{SUPABASE_URL:fullEnv.SUPABASE_URL,
      SUPABASE_SECRET_KEY:fullEnv.SUPABASE_SECRET_KEY,
      REALITY_GITHUB_TOKEN:'connected',
      REALITY_STANDALONE_OPENAI_API_KEY:'existing-preview-model-key'},
  });
  assert.equal(previewModel.status,'READY_TO_ATTEMPT');
  assert.equal(ready.authority_for_external_work_not_inferred,true);
  const missing=evaluateShiftLaunchReadiness({
    config,principalId:'owner-1',
    env:{SUPABASE_URL:fullEnv.SUPABASE_URL,SUPABASE_SECRET_KEY:fullEnv.SUPABASE_SECRET_KEY},
  });
  assert.equal(missing.status,'BLOCKED');
  assert.ok(missing.blockers.includes('GITHUB_CONNECTOR_CREDENTIAL_REQUIRED'));
  assert.ok(missing.blockers.includes('INTELLIGENCE_MODEL_CREDENTIAL_REQUIRED'));
  assert.ok(evaluateShiftLaunchReadiness({
    config,principalId:'wrong',env:fullEnv,
  }).blockers.includes('SHIFT_OWNER_SESSION_REQUIRED'));
  assert.ok(evaluateShiftLaunchReadiness({
    config:null,principalId:'owner-1',env:fullEnv,
  }).blockers.includes('SHIFT_CONFIGURATION_REQUIRED'));
});