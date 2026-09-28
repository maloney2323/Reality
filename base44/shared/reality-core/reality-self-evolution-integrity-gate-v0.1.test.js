import assert from 'node:assert/strict';
import {
  GovernanceImpact,
  IntegrityDecision,
  SELF_EVOLUTION_INTEGRITY_GATE_VERSION,
  buildSelfEvolutionIntegrityDecision,
  verifySelfEvolutionIntegrityDecision,
} from './reality-self-evolution-integrity-gate-v0.1.js';

const base = {
  current_code_tree_hash: 'tree-1',
  observed_code_tree_hash: 'tree-1',
  current_self_model_version: 'sm-1',
  observed_self_model_version: 'sm-1',
  self_observation_refs: ['self:1'],
  independent_evidence_refs: ['repo:1', 'test:1'],
  corroboration_refs: ['repo:1'],
  regression_evidence_refs: ['test:1'],
  source_refs: ['repo:1'],
  governance_impacts: [GovernanceImpact.CAPABILITY],
};

const test = async (name, fn) => {
  try { await fn(); console.log(`PASS ${name}`); return true; }
  catch (e) { console.error(`FAIL ${name}`, e); return false; }
};

let passed = 0;
passed += await test('Self Model alone cannot create corroboration', async () => {
  const d = await buildSelfEvolutionIntegrityDecision({
    ...base,
    independent_evidence_refs: [],
    corroboration_refs: [],
    self_model_evidence_refs: ['self-model:claim'],
  });
  assert.equal(d.decision, IntegrityDecision.INVESTIGATE_MORE);
  assert.equal(d.checks.independent_corroboration_present, false);
});

passed += await test('Model-generated analysis cannot become evidence by relabeling', async () => {
  const d = await buildSelfEvolutionIntegrityDecision({
    ...base,
    independent_evidence_refs: ['model:proof'],
    corroboration_refs: ['model:proof'],
    model_analysis_refs: ['model:proof'],
  });
  assert.equal(d.checks.model_analysis_not_used_as_evidence, false);
  assert.equal(d.decision, IntegrityDecision.INVESTIGATE_MORE);
});

passed += await test('Stale code tree halts', async () => {
  const d = await buildSelfEvolutionIntegrityDecision({...base, observed_code_tree_hash:'tree-old'});
  assert.equal(d.decision, IntegrityDecision.HALTED_INTEGRITY_FAILURE);
});

passed += await test('Constitutional scope requires human review', async () => {
  const d = await buildSelfEvolutionIntegrityDecision({...base, governance_impacts:[GovernanceImpact.CONSTITUTIONAL]});
  assert.equal(d.decision, IntegrityDecision.HUMAN_REVIEW_REQUIRED);
});

passed += await test('Plan change needs regression evidence', async () => {
  const d = await buildSelfEvolutionIntegrityDecision({...base, regression_evidence_refs:[]});
  assert.equal(d.decision, IntegrityDecision.INVESTIGATE_MORE);
});

passed += await test('Blocking dissent prevents plan change', async () => {
  const d = await buildSelfEvolutionIntegrityDecision({...base, blocking_dissent_refs:['dissent:1']});
  assert.equal(d.decision, IntegrityDecision.INVESTIGATE_MORE);
  assert.deepEqual(d.blocking_dissent_refs, ['dissent:1']);
  assert.equal(d.checks.blocking_dissent_present, true);
});

passed += await test('Clean corroborated capability allows plan change', async () => {
  const d = await buildSelfEvolutionIntegrityDecision({...base, requested_decision:IntegrityDecision.PLAN_CHANGE});
  assert.equal(d.decision, IntegrityDecision.PLAN_CHANGE);
  assert.equal(verifySelfEvolutionIntegrityDecision(d).valid, true);
});

passed += await test('No-change can remain no-change after independent corroboration', async () => {
  const d = await buildSelfEvolutionIntegrityDecision({...base, requested_decision:IntegrityDecision.NO_CHANGE});
  assert.equal(d.decision, IntegrityDecision.NO_CHANGE);
});

passed += await test('No authority escalation is possible', async () => {
  await assert.rejects(
    () => buildSelfEvolutionIntegrityDecision({...base, implementation_authorized:true}),
    /FORGED_AUTHORITY_FLAG:implementation_authorized/
  );
});

passed += await test('Digest is deterministic', async () => {
  const a = await buildSelfEvolutionIntegrityDecision({...base});
  const b = await buildSelfEvolutionIntegrityDecision({...base});
  assert.equal(a.decision_digest, b.decision_digest);
});

console.log(`Reality Self-Evolution Integrity Gate: ${passed}/10 PASS`);
if (passed !== 10) process.exit(1);