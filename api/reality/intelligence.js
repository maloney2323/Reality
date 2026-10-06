import { runLiveIntelligenceOrchestration } from '../../src/reality-live-intelligence-orchestration-v0.1.js';
import { investigatorWorld, planInvestigation } from '../../src/reality-investigator.js';
import {
  classifyBlock,
  createCapabilityContract,
  createCapabilityGap,
  createGrowthProposal,
  evaluateAcquisitionAuthority,
  createGrowthRun,
  buildDefaultAcquisitionPolicy,
} from '../../src/reality-capability-growth-engine-v0.1.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).setHeader('Allow', 'POST').json({ error: 'METHOD_NOT_ALLOWED' });

  try {
    if (req.body?.operation === 'investigate') {
      const question = req.body?.question;
      const availableSources = req.body?.availableSources;
      const investigation = planInvestigation({ question, availableSources });
      return res.status(200).json({
        ok: true,
        operation: 'investigate',
        world: investigatorWorld(),
        investigation,
      });
    }

    if (req.body?.operation === 'capability_growth') {
      const blocked = req.body?.blocked || {};
      const gapType = classifyBlock({
        reason: blocked.reason,
        evidence: blocked.evidence || {},
        existingCapability: blocked.existingCapability === true,
      });

      if (gapType !== 'MISSING_CAPABILITY') {
        return res.status(200).json({
          ok: true,
          operation: 'capability_growth',
          growth_entered: false,
          gap_type: gapType,
          reason: 'ONLY_MISSING_CAPABILITY_ENTERS_GROWTH_LOOP',
        });
      }

      const gap = createCapabilityGap({
        workItemId: blocked.workItemId,
        blockedStepId: blocked.blockedStepId,
        gapType,
        capabilityId: blocked.capabilityId,
        evidence: blocked.evidenceItems || [],
        diagnosis: blocked.diagnosis || blocked.reason || null,
      });

      const contract = createCapabilityContract({
        capabilityId: blocked.capabilityId,
        description: blocked.description,
        inputSchema: blocked.inputSchema,
        outputSchema: blocked.outputSchema,
        authorityRequired: blocked.authorityRequired || 'none',
        sideEffects: blocked.sideEffects || 'none',
        verificationSuite: blocked.verificationSuite || [],
        version: blocked.version || '0.1.0',
        status: 'PROPOSED',
      });

      const proposal = createGrowthProposal({
        gap,
        contract,
        allowedFiles: blocked.allowedFiles || [],
        acquisitionActions: blocked.acquisitionActions || ['create_branch', 'write_bounded_files', 'run_tests', 'deploy_preview'],
        risk: blocked.risk || 'low',
        estimatedCostCents: blocked.estimatedCostCents || 0,
        originalInputs: blocked.originalInputs || null,
        completedSteps: blocked.completedSteps || [],
        continuationStep: blocked.continuationStep || null,
      });

      const policy = buildDefaultAcquisitionPolicy();
      const authority = evaluateAcquisitionAuthority({ proposal, policy });
      const growthRun = createGrowthRun({ gap, proposal });

      return res.status(200).json({
        ok: true,
        operation: 'capability_growth',
        growth_entered: true,
        engine_version: 'reality-capability-growth-engine-v0.1',
        gap,
        contract,
        proposal,
        policy,
        authority,
        growth_run: growthRun,
        acquisition: {
          status: authority.allowed ? 'READY_FOR_GOVERNED_ACQUISITION' : 'NOT_AUTHORIZED',
          executed: false,
          reason: authority.reason,
        },
      });
    }

    const result = await runLiveIntelligenceOrchestration({
      message: req.body?.message,
      requestedBy: req.body?.requestedBy || 'chat_user',
      systemContext: req.body?.systemContext || null,
    });
    return res.status(200).json({ ok: true, result });
  } catch (error) {
    return res.status(error.status || 400).json({
      ok: false,
      error: error.message,
      provider_error: error.provider_error || null,
    });
  }
}
