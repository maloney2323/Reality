import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEvidenceAcquisitionPlan, validateEvidenceAcquisitionPlan } from '../src/reality-evidence-acquisition-engine-v1.0.js';

test('turns unanswered questions into an epistemic work graph', () => {
  const plan = buildEvidenceAcquisitionPlan({
    agenda: {
      questions: [
        { id: 'market.niche', domain: 'MARKET', priority: 97, question: 'Which niche?', status: 'EVIDENCE_NEEDED', missing_evidence: ['niche_evidence'] },
        { id: 'business.identity', domain: 'BUSINESS', priority: 100, question: 'Which business?', status: 'EVIDENCE_AVAILABLE', missing_evidence: [] },
      ],
    },
  });
  assert.equal(plan.graph_type, 'EPISTEMIC_WORK_GRAPH');
  assert.equal(plan.acquisition_work.length, 1);
  assert.equal(plan.acquisition_work[0].acquisition_class, 'MARKET_SEGMENTATION');
  assert.equal(plan.acquisition_work[0].execution, 'NOT_EXECUTED');
});

test('preserves authority boundary and verification requirements', () => {
  const plan = buildEvidenceAcquisitionPlan({
    agenda: {
      questions: [
        { id: 'growth.experiment', domain: 'GROWTH', priority: 91, question: 'What experiment?', status: 'EVIDENCE_NEEDED', missing_evidence: ['experiment_evidence'] },
      ],
    },
  });
  const validated = validateEvidenceAcquisitionPlan(plan);
  assert.equal(validated.valid, true);
  assert.equal(plan.acquisition_work[0].authority, 'NONE_UNLESS_EXPLICITLY_ESTABLISHED');
  assert.equal(plan.acquisition_work[0].execution, 'NOT_EXECUTED');
});

test('fails closed on missing agenda', () => {
  assert.throws(() => buildEvidenceAcquisitionPlan({}), /QUESTION_AGENDA_REQUIRED/);
});
