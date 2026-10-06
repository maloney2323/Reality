import {
  classifyBlock, createCapabilityGap, createGrowthProposal, evaluateAcquisitionAuthority,
  createGrowthRun, buildDefaultAcquisitionPolicy
} from '../../src/reality-capability-growth-engine-v0.1.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow','POST');
    return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
  }
  try {
    const body=req.body||{};
    if (!body.work_item_id || !body.blocked_step_id || !body.block_reason || !body.capability_id)
      return res.status(400).json({error:'WORK_ITEM_BLOCK_CONTEXT_REQUIRED'});
    const gapType=classifyBlock({reason:body.block_reason,evidence:body.evidence||{}});
    if (gapType !== 'MISSING_CAPABILITY')
      return res.status(200).json({status:'NO_GROWTH',classification:gapType});
    const gap=createCapabilityGap({
      workItemId:body.work_item_id,blockedStepId:body.blocked_step_id,
      gapType,capabilityId:body.capability_id,evidence:body.evidence_refs||[],
      diagnosis:body.diagnosis||body.block_reason
    });
    const proposal=createGrowthProposal({
      gap,
      contract:body.contract,
      allowedFiles:body.allowed_files||[],
      acquisitionActions:body.acquisition_actions||undefined,
      risk:body.risk||'low',
      estimatedCostCents:body.estimated_cost_cents||0,
      originalInputs:body.original_inputs||null,
      completedSteps:body.completed_steps||[],
      continuationStep:body.continuation_step
    });
    const authority=evaluateAcquisitionAuthority({proposal,policy:buildDefaultAcquisitionPolicy()});
    const run=createGrowthRun({gap,proposal});
    return res.status(200).json({
      engine_version:'reality-capability-growth-engine-v0.1',
      growth_run:run, gap, proposal, authority,
      execution:{status:'NOT_EXECUTED',reason:authority.allowed?'ACQUISITION_EXECUTOR_NOT_CONNECTED':'ACQUISITION_NOT_AUTHORIZED'}
    });
  } catch(error) {
    return res.status(400).json({error:error.message});
  }
}
