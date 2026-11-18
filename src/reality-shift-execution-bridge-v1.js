import { getAuthorityPolicy, autoAuthorize } from './reality-authority-v1.0.js';
import { getServerExecutionBridges } from './reality-server-execution-bridge-v0.1.js';
import { executeAuthorizedWork } from './reality-governed-execution-engine-v0.1.js';

export const SHIFT_EXECUTION_BRIDGE_VERSION='reality-shift-execution-bridge-v1';

function matchesOwnedScope(policy,job,principalId) {
  if (!principalId || job?.principal_id!==principalId || policy?.principal_id!==principalId
    || policy?.mode!=='auto' || policy?.enabled!==true) return false;
  return (policy.scopes||[]).some(s=>
    s.work_item_id===job.work_item_id &&
    s.connector===job.connector && s.operation===job.operation &&
    (!s.resource || s.resource===job.inputs?.repository));
}

/**
 * The shift cannot invent a connector or authorization. The exact same owned,
 * bounded execution engine and server-side independent readback used in the
 * single-job API handles jobs here.
 */
export function createShiftExecutionAdapters({
  principalId,persistence,record,loadPriorStages,
  policyReader=getAuthorityPolicy, bridgeFactory=getServerExecutionBridges,
  executor=executeAuthorizedWork,
}={}) {
  if (!principalId || !persistence?.reconstruct || !persistence?.appendEvent ||
    typeof record!=='function' || typeof loadPriorStages!=='function') {
    throw new Error('SHIFT_SERVER_EXECUTION_CONTEXT_REQUIRED');
  }
  return Object.freeze({
    record,
    loadPriorStages,
    authorizeWork: async job=>{
      if (job?.principal_id!==principalId) return null;
      const policy=await policyReader(principalId,persistence);
      if (!matchesOwnedScope(policy,job,principalId)) return null;
      const authorization=autoAuthorize({policy,workItem:job});
      if (authorization?.authorized!==true || authorization.workflow_id!==job.workflow_id) return null;
      return Object.freeze({
        granted:true,authorization_ref:authorization.authorization_id,
        scope:{work_item_id:job.work_item_id,operation:'execute_work'},
        authorization,
      });
    },
    executeWork: async (job,grant,{idempotency_key}={})=>{
      if (!grant?.authorization?.authorized ||
        grant.scope?.work_item_id!==job.work_item_id ||
        grant.authorization_ref!==grant.authorization.authorization_id ||
        !idempotency_key) throw new Error('SHIFT_EXACT_EXECUTION_GRANT_REQUIRED');
      // Do not broaden this privileged server route into a generic executor.
      if (job.connector!=='github' || job.operation!=='create_issue' ||
        job.inputs?.repository!=='maloney2323/Reality') {
        throw new Error('SHIFT_EXECUTION_CAPABILITY_NOT_REGISTERED');
      }
      const bridge=bridgeFactory();
      const result=await executor({
        workItem:job,workflowId:job.workflow_id,
        authorization:grant.authorization,
        connector:bridge,independentVerifier:bridge,
        requestFingerprint:idempotency_key,
        requestSummary:'Reality authorized full-shift work: '+job.work_item_id,
      });
      const executionId=result?.execution?.execution_id;
      if (!executionId) throw new Error('SHIFT_EXECUTION_RECEIPT_MISSING');
      if (result.status==='VERIFIED' && result.outcome?.independent===true &&
        result.outcome?.verified===true && result.verification?.independent===true &&
        result.verification?.verified===true) {
        return Object.freeze({
          work_item_id:job.work_item_id,status:'SUCCEEDED',
          execution_id:executionId,verification:result.verification,
        });
      }
      // An unresolved provider effect cannot be relabeled as a confirmed
      // failure and cannot be safely repeated.
      return Object.freeze({
        work_item_id:job.work_item_id,status:'UNRESOLVED',
        execution_id:executionId,
      });
    },
    verifyOutcome:async (job,execution)=>{
      const v=execution?.verification;
      const url=v?.observedState?.url;
      const expectedInput=job?.inputs || {};
      const state=v?.observedState;
      if (execution?.work_item_id!==job.work_item_id ||
        execution?.status!=='SUCCEEDED' ||
        !v?.independent || v?.verified!==true ||
        !v.verification_id || !/^https:\/\/github\.com\/maloney2323\/Reality\/issues\/[0-9]+(?:[/?#].*)?$/.test(url||'') ||
        state?.repository!=='maloney2323/Reality' ||
        state?.title!==expectedInput.title ||
        state?.state!=='open') return null;
      return Object.freeze({
        work_item_id:job.work_item_id,status:'VERIFIED',
        independent:true,verification_id:v.verification_id,
        evidence_refs:[url],
      });
    },
  });
}