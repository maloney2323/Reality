import { GSI_SPEC_VERSION, GSI_GATES, GSI_HARD_INVARIANTS, GSI_LEVELS, createGsiAssessment } from '../../src/reality-governed-superintelligence-v1.0.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  const governanceKernelHash = process.env.REALITY_GOVERNANCE_KERNEL_HASH || 'UNCONFIGURED';
  const assessment = createGsiAssessment({
    assessmentId: 'live-gsi-assessment-v1',
    learnerId: 'reality',
    benchmarkVersion: GSI_SPEC_VERSION,
    governanceKernelHash,
    evidence: [],
    gates: Object.fromEntries(GSI_GATES.map((gate) => [gate, {
      status: 'NOT_ASSESSED',
      evidence_refs: [],
      metrics: {},
      failure_reasons: ['LIVE_EVIDENCE_NOT_CONNECTED'],
    }])),
  });

  return res.status(200).json({
    status: 'LIVE_SPEC_CONNECTED',
    spec_version: GSI_SPEC_VERSION,
    assessment,
    learning: { status: 'NOT_ASSESSED' },
    value: { net_verified_value: null, status: 'NOT_ASSESSED' },
    hard_invariants: GSI_HARD_INVARIANTS,
    levels: GSI_LEVELS,
    evidence_policy: 'No gate is promoted without persisted evidence and independent verification.',
  });
}
