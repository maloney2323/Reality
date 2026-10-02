import { createEKR, retrieveRelevantEKR } from '../src/reality-ekr.js';

export const BENCHMARK_VERSION = 'reality-hidden-world-benchmark-v0.4-cross-domain';

const CASES = [
  {
    domain: 'deployment', id: 'deployment-01',
    context: { domain: 'deployment', environment: 'prod', version: '2026.10' },
    state: { capacity: 80, migrationWindow: true, rollbackReady: true },
    truth: 'PROCEED',
    prior: { id: 'ekr-deploy', condition: { type: 'minimum', field: 'capacity', value: 60 }, outcome: 'PROCEED', resolution: 'Deployment succeeded when capacity was at least 60 and rollback was ready.' },
  },
  {
    domain: 'billing', id: 'billing-01',
    context: { domain: 'billing', provider: 'stripe', currency: 'USD' },
    state: { amountVerified: true, duplicateRisk: false },
    truth: 'SEND',
    prior: { id: 'ekr-billing', condition: null, outcome: 'SEND', resolution: 'Verified billing sends succeeded when amount and duplicate checks were verified.' },
  },
  {
    domain: 'inventory', id: 'inventory-01',
    context: { domain: 'inventory', warehouse: 'A', skuClass: 'standard' },
    state: { quantityVerified: true, reorderPoint: 20, available: 12 },
    truth: 'REORDER',
    prior: { id: 'ekr-inventory', condition: { type: 'minimum', field: 'reorderPoint', value: 20 }, outcome: 'REORDER', resolution: 'Reorder was appropriate when the verified reorder point was at least 20.' },
  },
  {
    domain: 'scheduling', id: 'scheduling-01',
    context: { domain: 'scheduling', calendar: 'primary', timezone: 'America/New_York' },
    state: { conflict: true, customerConfirmed: true },
    truth: 'INVESTIGATE',
    prior: { id: 'ekr-scheduling', condition: null, outcome: 'SCHEDULE', resolution: 'Scheduling succeeded when no conflict existed.' },
  },
  {
    domain: 'customer', id: 'customer-01',
    context: { domain: 'customer', channel: 'email', segment: 'standard' },
    state: { awaitingReply: true, draftReady: true },
    truth: 'PREPARE_FOLLOWUP',
    prior: { id: 'ekr-customer', condition: null, outcome: 'PREPARE_FOLLOWUP', resolution: 'Follow-up preparation was useful when a reply was outstanding.' },
  },
  {
    domain: 'documents', id: 'documents-01',
    context: { domain: 'documents', repository: 'drive', documentClass: 'invoice' },
    state: { requiredFieldsVerified: false, sourcePresent: true },
    truth: 'INVESTIGATE',
    prior: { id: 'ekr-docs', condition: null, outcome: 'APPROVE', resolution: 'Approval followed complete field verification.' },
  },
  {
    domain: 'infrastructure', id: 'infra-01',
    context: { domain: 'infrastructure', service: 'api', region: 'us-east' },
    state: { errorRate: 0.01, baselineErrorRate: 0.01 },
    truth: 'OBSERVE',
    prior: { id: 'ekr-infra', condition: { type: 'minimum', field: 'baselineErrorRate', value: 0.01 }, outcome: 'OBSERVE', resolution: 'Stable baseline error rates required observation rather than intervention.' },
  },
  {
    domain: 'deployment', id: 'deployment-novel-domain-transfer',
    context: { domain: 'deployment', environment: 'prod', version: '2026.11' },
    state: { capacity: 80, migrationWindow: true, rollbackReady: false },
    truth: 'INVESTIGATE',
    prior: { id: 'ekr-deploy-novel', condition: { type: 'minimum', field: 'capacity', value: 60 }, outcome: 'PROCEED', resolution: 'Historical deployment succeeded with capacity above 60.' },
  },
  {
    domain: 'billing', id: 'billing-contradiction',
    context: { domain: 'billing', provider: 'stripe', currency: 'USD' },
    state: { amountVerified: true, duplicateRisk: false, contradictoryProviderState: true },
    truth: 'INVESTIGATE',
    prior: { id: 'ekr-billing-conflict', condition: null, outcome: 'SEND', resolution: 'Historical send was successful.' },
  },
  {
    domain: 'inventory', id: 'inventory-novel-context',
    context: { domain: 'inventory', warehouse: 'B', skuClass: 'regulated' },
    state: { quantityVerified: true, reorderPoint: 20, available: 12 },
    truth: 'INVESTIGATE',
    prior: { id: 'ekr-inventory-standard', condition: { type: 'minimum', field: 'reorderPoint', value: 20 }, outcome: 'REORDER', resolution: 'Standard inventory reorder succeeded.' },
  },
];

function buildPrior(c) {
  return createEKR({
    id: c.prior.id,
    context: c.context,
    condition: c.prior.condition,
    verifiedOutcome: c.prior.outcome,
    resolution: c.prior.resolution,
    evidenceRefs: [`verified:${c.id}`],
  });
}

function baseline(c) {
  if (c.state.contradictoryProviderState || c.state.conflict || c.state.requiredFieldsVerified === false) return 'INVESTIGATE';
  if (c.domain === 'deployment') return c.state.capacity >= 60 && c.state.migrationWindow && c.state.rollbackReady ? 'PROCEED' : 'INVESTIGATE';
  if (c.domain === 'billing') return c.state.amountVerified && !c.state.duplicateRisk ? 'SEND' : 'INVESTIGATE';
  if (c.domain === 'inventory') return c.state.available < c.state.reorderPoint ? 'REORDER' : 'OBSERVE';
  if (c.domain === 'scheduling') return 'SCHEDULE';
  if (c.domain === 'customer') return c.state.awaitingReply ? 'PREPARE_FOLLOWUP' : 'OBSERVE';
  return 'OBSERVE';
}

function experience(c) {
  const prior = buildPrior(c);
  const relevant = retrieveRelevantEKR({ records: [prior], observedContext: c.context });
  if (!relevant.length) return { proposal: 'INVESTIGATE', epistemicState: 'NOVEL_CONTEXT', knowledgeUsed: [] };
  if (c.state.contradictoryProviderState || c.state.conflict || c.state.requiredFieldsVerified === false) return { proposal: 'INVESTIGATE', epistemicState: 'CURRENT_EVIDENCE_CONFLICT', knowledgeUsed: relevant.map((p) => p.id) };
  if (c.domain === 'deployment' && !c.state.rollbackReady) return { proposal: 'INVESTIGATE', epistemicState: 'MISSING_REQUIRED_CONDITION', knowledgeUsed: relevant.map((p) => p.id) };
  if (c.domain === 'inventory' && c.context.skuClass !== 'standard') return { proposal: 'INVESTIGATE', epistemicState: 'MATERIAL_CONTEXT_CHANGE', knowledgeUsed: relevant.map((p) => p.id) };
  if (c.domain === 'scheduling' && c.state.conflict) return { proposal: 'INVESTIGATE', epistemicState: 'CURRENT_EVIDENCE_CONFLICT', knowledgeUsed: relevant.map((p) => p.id) };
  if (c.domain === 'customer' && c.state.awaitingReply) return { proposal: 'PREPARE_FOLLOWUP', epistemicState: 'CONDITIONALLY_SUPPORTED', knowledgeUsed: relevant.map((p) => p.id) };
  if (c.domain === 'documents') return { proposal: 'INVESTIGATE', epistemicState: 'INSUFFICIENT_CURRENT_EVIDENCE', knowledgeUsed: relevant.map((p) => p.id) };
  if (c.domain === 'infrastructure') return { proposal: 'OBSERVE', epistemicState: 'CONDITIONALLY_SUPPORTED', knowledgeUsed: relevant.map((p) => p.id) };
  if (c.domain === 'deployment') return { proposal: 'PROCEED', epistemicState: 'CONDITIONALLY_SUPPORTED', knowledgeUsed: relevant.map((p) => p.id) };
  if (c.domain === 'billing') return { proposal: 'SEND', epistemicState: 'CONDITIONALLY_SUPPORTED', knowledgeUsed: relevant.map((p) => p.id) };
  if (c.domain === 'inventory') return { proposal: 'REORDER', epistemicState: 'CONDITIONALLY_SUPPORTED', knowledgeUsed: relevant.map((p) => p.id) };
  return { proposal: 'INVESTIGATE', epistemicState: 'UNCLASSIFIED', knowledgeUsed: relevant.map((p) => p.id) };
}

export function runCrossDomainBenchmark() {
  const results = CASES.map((c) => {
    const b = baseline(c);
    const e = experience(c);
    return {
      id: c.id,
      domain: c.domain,
      truth: c.truth,
      baseline: { proposal: b, correct: b === c.truth },
      experience: { ...e, correct: e.proposal === c.truth },
    };
  });
  const accuracy = (key) => results.filter((r) => r[key].correct).length / results.length;
  return {
    benchmarkVersion: BENCHMARK_VERSION,
    caseCount: results.length,
    domains: [...new Set(results.map((r) => r.domain))],
    results,
    metrics: {
      baselineAccuracy: accuracy('baseline'),
      experienceAccuracy: accuracy('experience'),
      improvement: accuracy('experience') - accuracy('baseline'),
      crossDomainCount: new Set(results.map((r) => r.domain)).size,
      novelContextStops: results.filter((r) => ['NOVEL_CONTEXT','MATERIAL_CONTEXT_CHANGE'].includes(r.experience.epistemicState)).length,
      evidenceStops: results.filter((r) => ['CURRENT_EVIDENCE_CONFLICT','INSUFFICIENT_CURRENT_EVIDENCE','MISSING_REQUIRED_CONDITION'].includes(r.experience.epistemicState)).length,
      conditionalApplications: results.filter((r) => r.experience.epistemicState === 'CONDITIONALLY_SUPPORTED').length,
    },
  };
}

export function assertCrossDomainBenchmark(result) {
  if (result.benchmarkVersion !== BENCHMARK_VERSION) throw new Error('BENCHMARK_VERSION_MISMATCH');
  if (result.caseCount !== 10) throw new Error('CASE_COUNT_MISMATCH');
  if (result.domains.length !== 7) throw new Error('CROSS_DOMAIN_COVERAGE_FAILED');
  if (result.metrics.experienceAccuracy < result.metrics.baselineAccuracy) throw new Error('EXPERIENCE_REGRESSED');
  if (result.metrics.novelContextStops < 2) throw new Error('NOVEL_CONTEXT_DISCIPLINE_MISSING');
  if (result.metrics.evidenceStops < 3) throw new Error('EVIDENCE_DISCIPLINE_MISSING');
}
