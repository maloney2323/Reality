import assert from 'node:assert/strict';
import {
  CANONICAL_PACKET_VERSION,
  ENGINE_CONTRACT_VERSION,
  EngineJob,
  EngineKind,
  EngineResultStatus,
  FindingType,
  createEngineAdapter,
  createEngineRequest,
  validateCanonicalEvidencePacket,
} from './engine-adapter.js';

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

function packet() {
  return {
    packet_version: CANONICAL_PACKET_VERSION,
    packet_id: 'packet-1',
    observations: [
      { id: 'o1', source_ref: 'calendar:event-1', content: 'Meeting started around 10:00', observed_at: '2026-08-14T10:00:00-04:00' },
      { id: 'o2', source_ref: 'email:message-1', content: 'Meeting began at 10:03', observed_at: '2026-08-14T10:03:00-04:00' },
    ],
    conflicts: [{ refs: ['o1', 'o2'], field: 'exact_start_time', state: 'UNRESOLVED' }],
  };
}

test('canonical packet requires versioned non-empty observations', () => {
  const validated = validateCanonicalEvidencePacket(packet());
  assert.equal(validated.packet_version, CANONICAL_PACKET_VERSION);
  assert.equal(validated.observations.length, 2);
  assert.equal(Object.isFrozen(validated), true);
});

test('duplicate observation ids are rejected', () => {
  const p = packet();
  p.observations[1].id = 'o1';
  assert.throws(() => validateCanonicalEvidencePacket(p), /unique/);
});

test('request binds one specialist job to one canonical packet', () => {
  const request = createEngineRequest({
    request_id: 'r1',
    job_type: EngineJob.FALSIFICATION,
    packet: packet(),
    question: 'Attack the leading explanation.',
  });
  assert.equal(request.contract_version, ENGINE_CONTRACT_VERSION);
  assert.equal(request.job_type, EngineJob.FALSIFICATION);
  assert.equal(request.packet.packet_id, 'packet-1');
});

test('engine cannot run a job outside its declared specialty', async () => {
  const adapter = createEngineAdapter({
    engine_id: 'hypothesis-model',
    engine_kind: EngineKind.MODEL,
    supported_jobs: [EngineJob.HYPOTHESIS_GENERATION],
    execute: async () => ({ status: EngineResultStatus.COMPLETED, findings: [] }),
  });
  const request = createEngineRequest({ request_id: 'r2', job_type: EngineJob.FALSIFICATION, packet: packet() });
  await assert.rejects(() => adapter.run(request), /not authorized/);
});

test('engine output is always proposal-only rather than Reality truth', async () => {
  const adapter = createEngineAdapter({
    engine_id: 'hypothesis-model',
    engine_kind: EngineKind.MODEL,
    supported_jobs: [EngineJob.HYPOTHESIS_GENERATION],
    execute: async () => ({
      findings: [{
        type: FindingType.HYPOTHESIS,
        text: 'A schedule change may explain the timing difference.',
        dependency_refs: ['o1', 'o2'],
      }],
    }),
  });
  const request = createEngineRequest({ request_id: 'r3', job_type: EngineJob.HYPOTHESIS_GENERATION, packet: packet() });
  const result = await adapter.run(request);
  assert.equal(result.authority, 'ENGINE_PROPOSAL_ONLY');
  assert.equal(result.findings[0].type, FindingType.HYPOTHESIS);
});

test('finding cannot depend on evidence outside the canonical packet', async () => {
  const adapter = createEngineAdapter({
    engine_id: 'challenger-model',
    engine_kind: EngineKind.MODEL,
    supported_jobs: [EngineJob.FALSIFICATION],
    execute: async () => ({
      findings: [{
        type: FindingType.FALSIFICATION_CHALLENGE,
        text: 'An unseen source contradicts the packet.',
        dependency_refs: ['invented-source'],
      }],
    }),
  });
  const request = createEngineRequest({ request_id: 'r4', job_type: EngineJob.FALSIFICATION, packet: packet() });
  await assert.rejects(() => adapter.run(request), /outside canonical packet/);
});

test('different specialist engines may legitimately return different outputs', async () => {
  const proposer = createEngineAdapter({
    engine_id: 'proposer',
    engine_kind: EngineKind.MODEL,
    supported_jobs: [EngineJob.HYPOTHESIS_GENERATION],
    execute: async () => ({ findings: [{ type: FindingType.HYPOTHESIS, text: 'The meeting likely started close to 10:00.', dependency_refs: ['o1', 'o2'] }] }),
  });
  const challenger = createEngineAdapter({
    engine_id: 'challenger',
    engine_kind: EngineKind.MODEL,
    supported_jobs: [EngineJob.FALSIFICATION],
    execute: async () => ({ findings: [{ type: FindingType.FALSIFICATION_CHALLENGE, text: 'The exact start time remains unresolved.', dependency_refs: ['o1', 'o2'] }] }),
  });
  const proposed = await proposer.run(createEngineRequest({ request_id: 'r5a', job_type: EngineJob.HYPOTHESIS_GENERATION, packet: packet() }));
  const challenged = await challenger.run(createEngineRequest({ request_id: 'r5b', job_type: EngineJob.FALSIFICATION, packet: packet() }));
  assert.notEqual(proposed.findings[0].type, challenged.findings[0].type);
  assert.equal(proposed.authority, challenged.authority);
});

test('deterministic engines use the same contract without pretending to be models', async () => {
  const temporal = createEngineAdapter({
    engine_id: 'temporal-v0',
    engine_kind: EngineKind.DETERMINISTIC,
    supported_jobs: [EngineJob.TEMPORAL_ANALYSIS],
    execute: async () => ({ findings: [{ type: FindingType.TEMPORAL_RELATION_CANDIDATE, text: 'o1 precedes or overlaps o2.', dependency_refs: ['o1', 'o2'] }] }),
  });
  const result = await temporal.run(createEngineRequest({ request_id: 'r6', job_type: EngineJob.TEMPORAL_ANALYSIS, packet: packet() }));
  assert.equal(result.engine_kind, EngineKind.DETERMINISTIC);
  assert.equal(result.job_type, EngineJob.TEMPORAL_ANALYSIS);
});

let failed = 0;
for (const [name, fn] of tests) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}\n  ${error.stack}`);
  }
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
if (failed) process.exit(1);