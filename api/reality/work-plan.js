import {
  createIntentRecord, structureIntent, createWorkItem, buildPreflightPackage,
  buildAuthorizationRequest, createWorkflowRun
} from '../../src/reality-governed-work-runtime-v0.1.js';

export default function handler(req,res) {
  if (!['GET','POST'].includes(req.method)) return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
  const body = req.body || {};
  const statement = req.method === 'GET'
    ? (req.query?.statement || 'Create a calendar event tomorrow at 10 AM titled Product Planning')
    : body.statement;
  try {
    const intent = createIntentRecord({
      requestedBy: body.requestedBy || 'chat_user',
      statement,
      desiredOutcome: body.desiredOutcome || 'Complete the requested goal without unverified external side effects.',
      constraints: body.constraints || [],
      materialAssumptions: body.materialAssumptions || []
    });
    const workflow = structureIntent(intent, {
      requiredConnectors: ['declared_by_work_items'],
      successConditions: body.successConditions || ['All required work items reach independently verified outcomes.']
    });
    const item = createWorkItem({
      workflowId: workflow.workflow_id,
      action: body.action || 'Determine and execute the bounded action required by the stated goal.',
      connector: body.connector || 'UNSPECIFIED',
      operation: body.operation || 'read',
      consequential: body.consequential === true,
      authorityRequired: body.authorityRequired || [],
      expectedEffect: body.expectedEffect || 'No external effect until explicit authorization is present.',
      verificationMethod: body.verificationMethod || 'Independent observation of the resulting external state.'
    });
    const finalWorkflow = Object.freeze({...workflow, work_items:[item]});
    const preflight = buildPreflightPackage({intent, workflow:finalWorkflow, verificationPlan:[item.verification_method]});
    const authorizationRequest = preflight.status === 'READY_FOR_AUTHORIZATION'
      ? buildAuthorizationRequest({workflow:finalWorkflow,preflight,principal:body.requestedBy || 'chat_user',
          scope:[{connector:item.connector,operation:item.operation,work_item_id:item.work_item_id}]})
      : null;
    const run = createWorkflowRun({workflow:finalWorkflow,intent});
    return res.status(200).json({
      runtime_version:'0.1.0', intent, workflow:finalWorkflow, preflight,
      authorization_request:authorizationRequest, run,
      execution:{status:'NOT_EXECUTED',reason:'PLANNING_ONLY'},
      verification:{status:'NOT_STARTED'},
    });
  } catch (error) {
    return res.status(400).json({error:error.message});
  }
}
