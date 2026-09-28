import { buildOrchestrationDecision } from '../base44/shared/reality-core/reality-orchestrator-v0.1.js';

export default async function handler(req, res) {
  const decision = await buildOrchestrationDecision({
    work_unit_id: 'runtime-verification',
    workday_id: 'runtime-verification',
    continuity_state_id: 'runtime-verification'
  });

  return res.status(200).json({
    runtime: 'reality',
    runtime_adapter: 'vercel',
    orchestrator_version: decision.schema_version,
    authority: decision.authority,
    status: decision.status,
    next_action: decision.next_action,
    execution_authority: decision.execution_authority,
    mutation_authority: decision.mutation_authority,
    merge_authority: decision.merge_authority,
    deploy_authority: decision.deploy_authority,
    decision_digest: decision.decision_digest
  });
}
