import { createExecutionReceipt, canExecute } from './reality-governed-work-runtime-v0.1.js';

export const GOVERNED_EXECUTION_ENGINE_VERSION = 'reality-governed-execution-engine-v0.1';

function text(v){return typeof v==='string'&&v.trim()?v.trim():'';}
function hashable(v){return JSON.stringify(v ?? null);}
function receiptId(workItem, authorization){return 'execution:'+Buffer.from(hashable([workItem?.work_item_id,authorization?.authorization_id])).toString('base64url').slice(0,32);}

export async function executeAuthorizedWork({
  workItem,
  workflowId,
  authorization,
  connector,
  independentVerifier,
  requestSummary = null,
  requestFingerprint = null,
} = {}) {
  if (!workItem?.work_item_id) throw new Error('WORK_ITEM_REQUIRED');
  if (workItem.workflow_id !== workflowId) throw new Error('WORKFLOW_MISMATCH');
  if (!connector?.execute || !independentVerifier?.verify) throw new Error('EXECUTION_AND_VERIFICATION_BRIDGE_REQUIRED');

  const gate = canExecute({workItem, authorization});
  if (!gate.allowed) {
    return Object.freeze({
      engine_version:GOVERNED_EXECUTION_ENGINE_VERSION,
      status:'BLOCKED',
      blocked_reason:gate.reason,
      execution:null,
      verification:null,
      outcome:null,
    });
  }

  const execution = createExecutionReceipt({workItem, authorization, requestSummary, requestFingerprint});
  if (execution.execution_state !== 'AUTHORIZED') throw new Error('EXECUTION_RECEIPT_NOT_AUTHORIZED');

  const providerResult = await connector.execute({
    workItem,
    authorization,
    execution,
  });

  const executed = Object.freeze({
    ...execution,
    execution_state:'EXECUTED',
    response_observation:providerResult?.observation ?? null,
    provider_execution_id:providerResult?.providerExecutionId ?? null,
    completed_at:new Date().toISOString(),
  });

  const verification = await independentVerifier.verify({
    workItem,
    authorization,
    execution:executed,
    providerResult,
  });

  // A verifier's positive opinion is not independent evidence of the
  // provider's actual effect. Bind independent readback to this exact
  // execution, work item, authorization and provider execution identifier.
  // Missing, mismatched, or untraceable proof always remains UNRESOLVED.
  const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;
  const readbackMatched =
    verification?.verified === true &&
    verification?.independent === true &&
    verification?.method === 'EXTERNAL_PROVIDER_READBACK' &&
    nonEmpty(providerResult?.providerExecutionId) &&
    verification?.providerExecutionId === executed.provider_execution_id &&
    verification?.executionId === executed.execution_id &&
    verification?.workItemId === workItem.work_item_id &&
    verification?.authorizationId === executed.authorization_id &&
    nonEmpty(verification?.readbackObservationId) &&
    nonEmpty(verification?.basis) &&
    verification?.observedState != null &&
    (verification?.mismatch === false || verification?.mismatch == null);
  const verified = readbackMatched;
  const outcome = Object.freeze({
    outcome_state:verified?'VERIFIED_OUTCOME':'UNRESOLVED',
    verified,
    verification_basis:verification?.basis ?? null,
    independent:verification?.independent === true,
    independent_readback_bound:readbackMatched,
    provider_execution_id:executed.provider_execution_id,
    readback_observation_id:verification?.readbackObservationId ?? null,
    observed_state:verification?.observedState ?? null,
    mismatch:verification?.mismatch ?? null,
  });

  return Object.freeze({
    engine_version:GOVERNED_EXECUTION_ENGINE_VERSION,
    status:verified?'VERIFIED':'UNRESOLVED',
    execution:executed,
    verification,
    outcome,
  });
}
