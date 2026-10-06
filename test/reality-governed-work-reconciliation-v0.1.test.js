import {
  createPlanArtifact, createAuthorityDecision, createAuthorityDiff,
  createReconciliation, createLineageTransition, buildReconciledSuccessor,
  validateExecutionBinding, RECONCILIATION_DISPOSITIONS
} from '../src/reality-governed-work-reconciliation-v0.1.js';

const t = (n) => `2026-10-05T${n}:00:00.000Z`;
const parentItems = [
  { work_item_id:'WI-001', action:'Read email' },
  { work_item_id:'WI-002', action:'Draft reply' },
  { work_item_id:'WI-003', action:'Send reply' },
];

const parent = createPlanArtifact({
  planId:'P-001', workflowId:'W-001', revision:1, status:'PROPOSED',
  validFrom:t('10'), recordedAt:t('10'), workItems:parentItems,
  authorityRequestId:'AR-001'
});

const decision = createAuthorityDecision({
  authorizationId:'A-001', workflowId:'W-001', decisionType:'PARTIAL_GRANT',
  requestedAuthority:[{work_item_id:'WI-001'},{work_item_id:'WI-002'},{work_item_id:'WI-003'}],
  grantedAuthority:[{work_item_id:'WI-001'},{work_item_id:'WI-002'}],
  withheldAuthority:[{work_item_id:'WI-003'}],
  decisionScope:[{work_item_id:'WI-001'},{work_item_id:'WI-002'}],
  decidedAt:t('11'), humanActor:'Ryan', authorizationEvidenceRef:'evidence:A-001'
});

const diff = createAuthorityDiff({
  parentPlanId:'P-001', successorPlanId:null, parentWorkItems:parentItems,
  inherited:[
    {work_item_id:'WI-001',reason:'within_granted_scope'},
    {work_item_id:'WI-002',reason:'within_granted_scope'}
  ],
  removed:[{work_item_id:'WI-003',reason:'authority_withheld'}],
  newlyRequired:[{work_item_id:'WI-004',reason:'preflight_required_after_scope_change'}]
});

const constitution = { evaluation_id:'CE-001', allowed:true, reason:'CONSTITUTION_SATISFIED' };

const result = buildReconciledSuccessor({
  parentPlan:parent, authorityDecision:decision, authorityDiff:diff,
  constitutionalEvaluation:constitution,
  workItems:[
    { work_item_id:'WI-001', action:'Read email' },
    { work_item_id:'WI-002', action:'Draft reply' },
    { work_item_id:'WI-004', action:'Re-run revised preflight' }
  ],
  validFrom:t('12'), recordedAt:t('12'), committedAt:t('13')
});

if (result.successor.plan_id === parent.plan_id) throw new Error('SUCCESSOR_REUSED_PARENT_ID');
if (result.successor.derived_from !== parent.plan_id) throw new Error('SUCCESSOR_LINEAGE_MISSING');
if (result.successor.revision !== 2) throw new Error('SUCCESSOR_REVISION_INVALID');
if (result.successor.reconciliation_id !== result.reconciliation.reconciliation_id)
  throw new Error('SUCCESSOR_RECONCILIATION_LINK_MISSING');
if (result.lineage.child_plan_id !== result.successor.plan_id) throw new Error('LINEAGE_CHILD_MISMATCH');
if (result.lineage.parent_plan_id !== parent.plan_id) throw new Error('LINEAGE_PARENT_MISMATCH');
if (result.lineage.transition_type !== 'AUTHORITY_CONSTRAINED') throw new Error('WRONG_TRANSITION_TYPE');
if (result.lineage.authority_decision_id !== 'A-001') throw new Error('LINEAGE_AUTHORITY_MISSING');

for (const key of RECONCILIATION_DISPOSITIONS) {
  const value = key === 'CLARIFICATION_REQUIRED' ? 'clarification_required' : key.toLowerCase();
  if (!Array.isArray(diff[value])) throw new Error('MISSING_DISPOSITION:'+key);
}
if (parent.revision !== 1 || parent.status !== 'PROPOSED' || parent.superseded_at !== null)
  throw new Error('PARENT_WAS_MUTATED');

let incomplete=false;
try {
  createAuthorityDiff({parentPlanId:'P-001',parentWorkItems:parentItems,inherited:[
    {work_item_id:'WI-001',reason:'x'},{work_item_id:'WI-002',reason:'x'}]});
} catch { incomplete=true; }
if (!incomplete) throw new Error('INCOMPLETE_RECONCILIATION_ACCEPTED');

let duplicate=false;
try {
  createAuthorityDiff({parentPlanId:'P-001',parentWorkItems:parentItems,
    inherited:[{work_item_id:'WI-001',reason:'x'},{work_item_id:'WI-002',reason:'x'}],
    removed:[{work_item_id:'WI-001',reason:'y'}]});
} catch { duplicate=true; }
if (!duplicate) throw new Error('MULTIPLE_DISPOSITIONS_ACCEPTED');

const preflight={plan_id:result.successor.plan_id,workflow_id:'W-001'};
const auth={authorization_id:'A-002',workflow_id:'W-001',authorized:true};
let valid=validateExecutionBinding({
  execution:{execution_id:'E-001',plan_id:result.successor.plan_id,workflow_id:'W-001',authorization_id:'A-002'},
  plan:result.successor,preflight,authorization:auth
});
if (!valid.valid) throw new Error('VALID_EXECUTION_BINDING_REJECTED');

const superseded={...result.successor,superseded_at:t('14')};
valid=validateExecutionBinding({
  execution:{execution_id:'E-002',plan_id:result.successor.plan_id,workflow_id:'W-001',authorization_id:'A-002'},
  plan:superseded,preflight,authorization:auth
});
if (valid.reason !== 'PLAN_SUPERSEDED') throw new Error('SUPERSEDED_PLAN_NOT_REJECTED');

valid=validateExecutionBinding({
  execution:{execution_id:'E-003',plan_id:'P-001',workflow_id:'W-001',authorization_id:'A-002'},
  plan:result.successor,preflight,authorization:auth
});
if (valid.reason !== 'EXECUTION_PLAN_MISMATCH') throw new Error('WRONG_PLAN_EXECUTION_ACCEPTED');

let rejected=false;
try {
  createReconciliation({
    parentPlan:parent,authorityDecision:decision,authorityDiff:diff,
    constitutionalEvaluation:constitution,transitionType:'REJECTED'
  });
} catch { rejected=true; }
if (rejected) throw new Error('REJECTED_TRANSITION_UNEXPECTEDLY_REQUIRES_SUCCESSOR');

const rejectedTransition=createReconciliation({
  parentPlan:parent,authorityDecision:decision,authorityDiff:diff,
  constitutionalEvaluation:constitution,transitionType:'REJECTED',
  committedAt:t('15')
});
if (rejectedTransition.successor_plan_id !== null) throw new Error('REJECTED_HAS_SUCCESSOR');

console.log('Governed Workflow Reconciliation v0.1: PASS');
