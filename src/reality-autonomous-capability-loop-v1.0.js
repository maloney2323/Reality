import crypto from 'node:crypto';

export const AUTONOMOUS_CAPABILITY_LOOP_VERSION = '0.2.0';

export const CAPABILITY_LOOP_STATES = Object.freeze([
 'GAP_DETECTED','GAP_CONFIRMED','SANDBOX_PROPOSED','AWAITING_AUTHORIZATION',
 'SANDBOX_SYNTHESIS','SANDBOX_VALIDATION','SANDBOX_VERIFIED',
 'WORLDLINE_MERGE_PENDING','REGISTERED','REACTIVATED','ESCALATED','ABANDONED'
]);

const DEFAULT_ATTEMPT_LIMIT=3;
const text=v=>typeof v==='string'?v.trim():'';
const list=v=>Array.isArray(v)?v.filter(Boolean):[];
const stable=v=>{if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));};
const digest=v=>crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');

export const AUTONOMOUS_CAPABILITY_LOOP_INVARIANTS=Object.freeze({
 gapMustBeExplicit:true, onlyMissingCapabilityEntersSynthesis:true,
 productionGraphIsNeverWrittenBySandbox:true, historicalRegressionIsRequired:true,
 sandboxVerificationIsRequired:true, capabilitySignatureRequiredForRegistration:true,
 ephemeralWorldlineRequiredForExperiment:true, failedExperimentCannotMerge:true,
 attemptBudgetIsFinite:true, exhaustedBudgetEscalates:true,
 originalWorkIdentityMustBePreserved:true,
 recurringWorkMustRemainLinkedToOriginalWork:true,
 revenueClaimsMustBeEvidenceBacked:true,
 capabilityGrowthNeverGrantsAuthority:true
});

export function detectCapabilityGap({consequence,workItem,capabilities=[]}={}){
 if(!consequence||consequence.gap!=='MISSING_CAPABILITY')return null;
 const capabilityId=text(consequence.subject||consequence.capability);
 if(!capabilityId)throw new Error('CAPABILITY_GAP_ID_REQUIRED');
 const registered=new Set(list(capabilities).map(c=>text(c?.id||c?.name)).filter(Boolean));
 if(registered.has(capabilityId))return null;
 return Object.freeze({
  loop_version:AUTONOMOUS_CAPABILITY_LOOP_VERSION,state:'GAP_DETECTED',
  gap_id:'capability_gap:'+digest({capabilityId,workItemId:workItem?.id||null,continuityRootId:workItem?.continuity_root_id||null}).slice(0,32),
  capability_id:capabilityId,work_item_id:text(workItem?.id),
  continuity_root_id:text(workItem?.continuity_root_id),
  worldline_id:text(workItem?.worldline_id),
  required_capability_contract:workItem?.capability_contract||null,
  recurring_work_key:text(workItem?.work_key||workItem?.task_key)||null,
  revenue_context:workItem?.revenue_context||null
 });
}

export function confirmCapabilityGap(gap,{historicalFailureRefs=[],inputSchema=null,outputSchema=null,verificationSuiteRef=null}={}){
 if(!gap?.gap_id)throw new Error('CAPABILITY_GAP_REQUIRED');
 if(gap.state!=='GAP_DETECTED')throw new Error('CAPABILITY_GAP_STATE_INVALID');
 if(!list(historicalFailureRefs).length)throw new Error('FROZEN_HISTORICAL_FAILURES_REQUIRED');
 if(!verificationSuiteRef)throw new Error('VERIFICATION_SUITE_REQUIRED');
 return Object.freeze({...gap,state:'GAP_CONFIRMED',capability_contract:{
  capability_id:gap.capability_id,input_schema:inputSchema,output_schema:outputSchema,verification_suite_ref:verificationSuiteRef
 },frozen_historical_failure_refs:list(historicalFailureRefs),confirmation_hash:digest({gap_id:gap.gap_id,historicalFailureRefs,inputSchema,outputSchema,verificationSuiteRef})});
}

export function createSandboxExperiment({confirmedGap,attempt=1,attemptLimit=DEFAULT_ATTEMPT_LIMIT,primaryWorldlineId}={}){
 if(!confirmedGap?.gap_id||confirmedGap.state!=='GAP_CONFIRMED')throw new Error('CONFIRMED_CAPABILITY_GAP_REQUIRED');
 if(!Number.isInteger(attempt)||attempt<1)throw new Error('ATTEMPT_INVALID');
 if(!Number.isInteger(attemptLimit)||attempt<1||attempt>attemptLimit)throw new Error('CAPABILITY_SYNTHESIS_BUDGET_EXHAUSTED');
 if(!text(primaryWorldlineId))throw new Error('PRIMARY_WORLDLINE_ID_REQUIRED');
 const ephemeralWorldlineId='worldline:ephemeral:'+digest({gapId:confirmedGap.gap_id,attempt,primaryWorldlineId}).slice(0,32);
 return Object.freeze({...confirmedGap,state:'SANDBOX_PROPOSED',attempt,attempt_limit:attemptLimit,
  primary_worldline_id:primaryWorldlineId,ephemeral_worldline_id:ephemeralWorldlineId,
  production_graph_write_permitted:false,experiment_hash:digest({gap_id:confirmedGap.gap_id,attempt,ephemeralWorldlineId})});
}

export function authorizeSandboxExperiment(experiment,{authorizationRef,authorizedBy}={}){
 if(!experiment?.experiment_hash)throw new Error('SANDBOX_EXPERIMENT_REQUIRED');
 if(!text(authorizationRef)||!text(authorizedBy))throw new Error('SANDBOX_AUTHORIZATION_REQUIRED');
 return Object.freeze({...experiment,state:'SANDBOX_SYNTHESIS',sandbox_authorization_ref:authorizationRef,sandbox_authorized_by:authorizedBy});
}

export function validateSandboxResult(experiment,{synthesizedCapability,frozenRegression,isolatedVerification,capabilitySignature}={}){
 if(!experiment?.experiment_hash||experiment.state!=='SANDBOX_SYNTHESIS')throw new Error('SANDBOX_NOT_AUTHORIZED');
 if(!synthesizedCapability)throw new Error('SYNTHESIZED_CAPABILITY_REQUIRED');
 if(frozenRegression?.passed!==true)throw new Error('FROZEN_REGRESSION_FAILED');
 if(isolatedVerification?.verified!==true)throw new Error('ISOLATED_VERIFICATION_FAILED');
 if(!text(capabilitySignature))throw new Error('CAPABILITY_SIGNATURE_REQUIRED');
 const bundle={experiment_hash:experiment.experiment_hash,synthesized_capability:synthesizedCapability,frozen_regression:frozenRegression,isolated_verification:isolatedVerification,capability_signature:capabilitySignature};
 return Object.freeze({...experiment,state:'SANDBOX_VERIFIED',synthesized_capability:synthesizedCapability,verification_bundle:bundle,verification_hash:digest(bundle),capability_signature:capabilitySignature});
}
