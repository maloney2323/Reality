import crypto from 'node:crypto';

export const EVOLUTION_CONSTITUTION_VERSION='reality-evolution-constitution-v0.2';
export const IMMUTABLE_EVOLUTION_RULES=Object.freeze({
  identityProtected:true, objectiveProtected:true, governanceProtected:true,
  authorizationProtected:true, securityProtected:true, auditHistoryProtected:true,
  humanOverrideProtected:true, protectedSurfaces:['identity','objective','governance','authorization','security','audit_history'],
  requireEvidenceBackedLimitation:true, requireMeasurableObjectiveGain:true,
  requireBoundedExperiment:true, requireIndependentVerification:true,
  requirePreregisteredRegression:true, requireRollback:true,
  productionWriteInSandbox:false, modelProviderReplaceable:true
});
function digest(v){return crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex')}
export function createEvolutionConstitution({parentHash=null,experimentBudget=3,promotionThreshold=0.08,riskBudget=1}={}) {
  const body={version:EVOLUTION_CONSTITUTION_VERSION,parent_hash:parentHash,immutable_rules:IMMUTABLE_EVOLUTION_RULES,experiment_budget:experimentBudget,promotion_threshold:promotionThreshold,risk_budget:riskBudget};
  return Object.freeze({...body,constitution_hash:`constitution:${digest(body)}`});
}
export function validateEvolutionProposal(proposal,{constitution}={}) {
  if(!constitution?.constitution_hash) throw new Error('EVOLUTION_CONSTITUTION_REQUIRED');
  if(!proposal?.id) throw new Error('EVOLUTION_PROPOSAL_REQUIRED');
  for(const key of ['modifies_identity','modifies_objective','modifies_governance','modifies_authority','modifies_security'])
    if(proposal[key]===true) throw new Error(`PROTECTED_SURFACE_MODIFICATION_FORBIDDEN:${key}`);
  if(proposal.production_graph_write_permitted===true) throw new Error('PRODUCTION_WRITE_FORBIDDEN');
  return true;
}
