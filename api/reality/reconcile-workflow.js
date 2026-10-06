import {
  createPlanArtifact, createAuthorityDecision, createAuthorityDiff,
  buildReconciledSuccessor
} from '../../src/reality-governed-work-reconciliation-v0.1.js';

export default function handler(req,res) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
  const body=req.method==='POST' ? (req.body||{}) : {};
  const parentItems=body.parentWorkItems || [
    {work_item_id:'WI-001',action:'Read email'},
    {work_item_id:'WI-002',action:'Draft reply'},
    {work_item_id:'WI-003',action:'Send reply'}
  ];
  try {
    const parent=createPlanArtifact({
      planId:body.parentPlanId||'P-001',workflowId:body.workflowId||'W-001',
      revision:1,status:'PROPOSED',validFrom:body.validFrom||'2026-10-05T10:00:00.000Z',
      recordedAt:body.recordedAt||'2026-10-05T10:00:00.000Z',workItems:parentItems,
      authorityRequestId:body.authorityRequestId||'AR-001'
    });
    const decision=createAuthorityDecision({
      authorizationId:body.authorizationId||'A-001',workflowId:parent.workflow_id,
      decisionType:body.decisionType||'PARTIAL_GRANT',
      requestedAuthority:body.requestedAuthority||parentItems.map(x=>({work_item_id:x.work_item_id})),
      grantedAuthority:body.grantedAuthority||parentItems.slice(0,2).map(x=>({work_item_id:x.work_item_id})),
      withheldAuthority:body.withheldAuthority||[{work_item_id:parentItems[2]?.work_item_id||'WI-003'}],
      decisionScope:body.decisionScope||parentItems.slice(0,2).map(x=>({work_item_id:x.work_item_id})),
      decidedAt:body.decidedAt||'2026-10-05T11:00:00.000Z',
      humanActor:body.humanActor||'Ryan',
      authorizationEvidenceRef:body.authorizationEvidenceRef||'evidence:A-001'
    });
    const diff=createAuthorityDiff({
      parentPlanId:parent.plan_id,parentWorkItems:parentItems,
      inherited:body.inherited||parentItems.slice(0,2).map(x=>({work_item_id:x.work_item_id,reason:'within_granted_scope'})),
      removed:body.removed||[{work_item_id:parentItems[2]?.work_item_id||'WI-003',reason:'authority_withheld'}],
      modified:body.modified||[],blocked:body.blocked||[],clarificationRequired:body.clarificationRequired||[],
      newlyRequired:body.newlyRequired||[{work_item_id:'WI-004',reason:'preflight_required_after_scope_change'}]
    });
    const result=buildReconciledSuccessor({
      parentPlan:parent,authorityDecision:decision,authorityDiff:diff,
      constitutionalEvaluation:{evaluation_id:'CE-001',allowed:true,reason:'CONSTITUTION_SATISFIED'},
      workItems:body.successorWorkItems||[
        parentItems[0],parentItems[1],
        {work_item_id:'WI-004',action:'Re-run revised preflight'}
      ],
      validFrom:body.successorValidFrom||'2026-10-05T12:00:00.000Z',
      recordedAt:body.successorRecordedAt||'2026-10-05T12:00:00.000Z',
      committedAt:body.committedAt||'2026-10-05T13:00:00.000Z'
    });
    return res.status(200).json({reconciliation_version:'0.1.0',...result,
      retrospective:{original_plan:result.proposal.derived_from,successor_plan:result.successor.plan_id,
        transition:result.lineage.transition_type,authority_decision:result.reconciliation.authority_decision_id}});
  } catch(error) { return res.status(400).json({error:error.message}); }
}
