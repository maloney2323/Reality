import { executeAuthorizedWork } from '../../src/reality-governed-execution-engine-v0.1.js';
import { getServerExecutionBridges } from '../../src/reality-server-execution-bridge-v0.1.js';
import { verifyBase44Principal } from '../../src/reality-base44-principal-v0.1.js';
import { getAuthorityPolicy, autoAuthorize } from '../../src/reality-authority-v1.0.js';
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
    const principal = await verifyBase44Principal(req);
    const body = req.body || {};
    // No body-supplied approval is trusted as execution authority. Only a
    // server-admitted policy bound to the verified principal can authorize.
    if (body.authorization != null) return res.status(403).json({ ok:false, error:'CLIENT_SUPPLIED_AUTHORIZATION_REJECTED' });
    if (body.connector || body.independentVerifier) return res.status(403).json({ ok:false, error:'CLIENT_SUPPLIED_EXECUTION_BRIDGES_REJECTED' });
    if (!body.workItem) return res.status(400).json({ ok: false, error: 'WORK_ITEM_REQUIRED' });

    // Keep the production mutation route opt-in until an independently
    // attested action/consent/readback integration has been exercised.
    if (process.env.REALITY_GOVERNED_EXECUTION_ENABLED !== 'true') {
      return res.status(503).json({ok:false,error:'GOVERNED_EXECUTION_NOT_RELEASED'});
    }
    let authorization = null;
    let authoritySource = 'NONE';
    const policy = await getAuthorityPolicy(principal.principal_id);
    authorization = autoAuthorize({ policy, workItem: body.workItem });
    if (authorization) authoritySource = 'CUSTOMER_AUTO_AUTHORITY';
    if (!authorization) return res.status(200).json({ ok:true, result:{ status:'BLOCKED', blocked_reason:'EXPLICIT_AUTHORIZATION_REQUIRED', authority_source:'NONE', execution:null, verification:null, outcome:null } });

    let bridges;
    try { bridges = getServerExecutionBridges(); }
    catch (error) {
      return res.status(200).json({ ok: true, result: { status: 'BLOCKED', blocked_reason: error.message, execution: null, verification: null, outcome: null } });
    }

    const result = await executeAuthorizedWork({
      workItem: body.workItem,
      workflowId: body.workflowId || body.workItem.workflow_id,
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
        principal_id: principal.principal_id,
        authority_source: authoritySource,
      },
    });
  } catch (error) {
    return res.status(error.status || 400).json({ ok: false, error: error.message, provider_error: error.provider_error || null });
  }
}
