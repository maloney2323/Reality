import { executeAuthorizedWork } from '../../src/reality-governed-execution-engine-v0.1.js';
import { getServerExecutionBridges } from '../../src/reality-server-execution-bridge-v0.1.js';
import { verifyConfiguredExecutionECT } from '../../src/reality-configured-ect-execution-verifier-v0.2.js';
import { createEvidenceWarrant, attachLearningProposalToWarrant, verifyWarrantChain } from '../../src/reality-evidence-warrant-v1.0.js';
import { learnFromVerifiedExecution } from '../../src/reality-constitutional-learning-bridge-v1.0.js';

function buildWarrantContext(body, authorization) {
  const context = body.warrantContext || {};
  return {
    observationRefs: Array.isArray(context.observationRefs) ? context.observationRefs : [],
    evidenceRefs: Array.isArray(context.evidenceRefs) ? context.evidenceRefs : [],
    transformationReceiptRefs: Array.isArray(context.transformationReceiptRefs) ? context.transformationReceiptRefs : [],
    epistemicAssessment: context.epistemicAssessment || null,
    frictionDecision: context.frictionDecision || null,
    attentionDecision: context.attentionDecision || null,
    workProposal: context.workProposal || body.workItem || null,
    authorityArtifact: authorization,
    policyVersion: context.policyVersion || null,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).setHeader('Allow', 'POST').json({ error: 'METHOD_NOT_ALLOWED' });
  try {
    const body = req.body || {};
    if (!body.workItem) return res.status(400).json({ ok: false, error: 'WORK_ITEM_REQUIRED' });
    if (body.connector || body.independentVerifier) return res.status(400).json({ ok: false, error: 'CLIENT_SUPPLIED_EXECUTION_BRIDGES_REJECTED' });
    if (Object.prototype.hasOwnProperty.call(body, 'authorization')) {
      return res.status(401).json({ ok: false, error: 'UNAUTHENTICATED_AUTH_OBJECT' });
    }
    if (typeof body.signed_ect !== 'string' || !body.signed_ect) {
      return res.status(401).json({ ok: false, error: 'MISSING_AUTHORITY' });
    }

    const workflowId = body.workflowId || body.workItem.workflow_id;
    let authorization;
    try {
      authorization = verifyConfiguredExecutionECT(body.signed_ect, {
        workItem: body.workItem,
        workflowId,
      });
    } catch (error) {
      const code = error?.code || error?.message || 'ECT_REJECTED';
      const status = code === 'ECT_TRUST_CONFIGURATION_MISSING' ? 503 : 401;
      return res.status(status).json({ ok: false, error: code });
    }
    const authoritySource = 'SIGNED_ECT';

    let bridges;
    try { bridges = getServerExecutionBridges(); }
    catch (error) {
      return res.status(200).json({ ok: true, result: { status: 'BLOCKED', blocked_reason: error.message, execution: null, verification: null, outcome: null } });
    }

    const result = await executeAuthorizedWork({
      workItem: body.workItem,
      workflowId,
      authorization,
      connector: bridges,
      independentVerifier: bridges,
      requestSummary: body.requestSummary || null,
      requestFingerprint: body.requestFingerprint || null,
    });

    let governance = { warrant: null, learning: null, learning_warrant: null, warrant_status: 'NOT_CREATED' };

    if (result.status === 'VERIFIED') {
      const context = buildWarrantContext(body, authorization);
      if (context.observationRefs.length && context.evidenceRefs.length && context.epistemicAssessment && context.frictionDecision) {
        const warrant = createEvidenceWarrant({
          ...context,
          executionReceipt: result.execution,
          verificationReceipt: result.verification,
          outcome: result.outcome,
        });

        const learning = learnFromVerifiedExecution({
          executionResult: result,
          workItem: body.workItem,
          policy: { version: context.policyVersion },
          failurePattern: body.failurePattern || {},
        });

        let learningWarrant = null;
        if (learning.policy_mutation) {
          learningWarrant = attachLearningProposalToWarrant({
            warrant,
            learningProposal: learning.policy_mutation,
          });
          verifyWarrantChain([warrant, learningWarrant]);
        }

        governance = {
          warrant,
          learning,
          learning_warrant: learningWarrant,
          warrant_status: 'VERIFIED_AND_CHAINED',
        };
      } else {
        governance.warrant_status = 'PROVENANCE_INPUT_REQUIRED';
      }
    } else if (result.status === 'UNRESOLVED') {
      governance.warrant_status = 'NO_WARRANT_UNRESOLVED';
    } else {
      governance.warrant_status = 'NO_WARRANT_BLOCKED';
    }

    return res.status(200).json({
      ok: true,
      result: {
        ...result,
        ...governance,
        server_bridge_version: bridges.bridge_version,
        principal_id: authorization.principal_id,
        authority_source: authoritySource,
      },
    });
  } catch (error) {
    return res.status(error.status || 400).json({ ok: false, error: error.message, provider_error: error.provider_error || null });
  }
}
