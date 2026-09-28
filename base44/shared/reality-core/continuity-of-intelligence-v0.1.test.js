import {
  buildContinuityPackage,
  extendContinuityPackage,
  verifyContinuityPackage,
  inspectContinuityPackage,
  ContinuityDisposition,
  ContinuityEpistemicStatus,
} from './continuity-of-intelligence-v0.1.js';

const now = '2026-09-25T23:00:00.000Z';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const base = {
  continuity_id: 'CI-1',
  source_layer: 'evidence-agent',
  target_layer: 'analysis-agent',
  epoch_id: 'E-1',
  lineage_root: 'L-1',
  role_context: {
    role_id: 'ANALYST',
    role_version: '1',
    responsibilities: ['analyze evidence'],
    constraints: ['preserve contradictions'],
    source_refs: ['role:R1'],
  },
  rule_stack: [{
    rule_id: 'R1',
    rule_version: '1',
    rule_text: 'Preserve contradictions.',
    status: 'ACTIVE',
    source_refs: ['rule-source:R1'],
  }],
  inherited: [{
    item_id: 'F0',
    kind: 'FACT',
    disposition: ContinuityDisposition.INHERITED,
    epistemic_status: ContinuityEpistemicStatus.SUPPORTED,
    value: 'prior fact',
    source_refs: ['layer:A'],
    evidence_refs: ['E1'],
  }],
  produced: [{
    item_id: 'F1',
    kind: 'FINDING',
    disposition: ContinuityDisposition.PRODUCED,
    epistemic_status: ContinuityEpistemicStatus.DERIVED,
    value: 'new finding',
    source_refs: ['layer:B'],
    evidence_refs: ['E2'],
  }],
  forwarded: [{
    item_id: 'Q1',
    kind: 'REQUIREMENT',
    disposition: ContinuityDisposition.FORWARDED,
    epistemic_status: ContinuityEpistemicStatus.UNRESOLVED,
    value: 'reconcile E1 and E2',
    source_refs: ['layer:B'],
  }],
  captured_at: now,
};

const pkg = await buildContinuityPackage(base);
assert(await verifyContinuityPackage(pkg), 'valid package must verify');
assert(pkg.inherited[0].epistemic_status === 'SUPPORTED', 'inherited epistemic status must survive');
assert(pkg.produced[0].epistemic_status === 'DERIVED', 'produced epistemic status must be explicit');
assert(pkg.forwarded[0].epistemic_status === 'UNRESOLVED', 'forwarded unresolved status must survive');

const inspected = inspectContinuityPackage(pkg);
assert(inspected.inherited_count === 1 && inspected.produced_count === 1 && inspected.forwarded_count === 1, 'inspection counts incorrect');
assert(inspected.continuity_grants_no_action_authority === true, 'continuity must not authorize action');

const tampered = { ...pkg, inherited: [{ ...pkg.inherited[0], epistemic_status: 'ESTABLISHED' }] };
assert(!(await verifyContinuityPackage(tampered)), 'tampering with epistemic status must fail');

const wrongDisposition = { ...pkg, produced: [{ ...pkg.produced[0], disposition: 'INHERITED' }] };
assert(!(await verifyContinuityPackage(wrongDisposition)), 'wrong disposition must fail');

let missingProvenanceRejected = false;
try {
  await buildContinuityPackage({
    ...base,
    continuity_id: 'CI-2',
    inherited: [{ ...base.inherited[0], source_refs: [] }],
  });
} catch {
  missingProvenanceRejected = true;
}
assert(missingProvenanceRejected, 'inherited item without provenance must fail');