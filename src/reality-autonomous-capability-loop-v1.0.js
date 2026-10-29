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


/**
 * Reinstated v1 completion stages. These are authorization/state contracts,
 * not provider adapters. A sandbox pass is never sufficient to authorize merge.
 * A real merge, registry write and original-job execution are each separate.
 */
export function authorizeWorldlineMerge(verifiedExperiment,{
 mergeVerifier,promotionAuthorization,originalWorkItem,
}={}){
 if(verifiedExperiment?.state!=='SANDBOX_VERIFIED'||
    !text(verifiedExperiment.verification_hash))
  throw Error('VERIFIED_SANDBOX_EXPERIMENT_REQUIRED');
 if(!text(originalWorkItem?.id)||
    originalWorkItem.id!==verifiedExperiment.work_item_id||
    originalWorkItem.continuity_root_id!==verifiedExperiment.continuity_root_id)
  throw Error('ORIGINAL_WORK_SCOPE_MISMATCH');
 if(promotionAuthorization?.approved!==true||
    !text(promotionAuthorization.authorization_ref)||
    !text(promotionAuthorization.authorized_by)||
    promotionAuthorization.original_work_item_id!==originalWorkItem.id||
    promotionAuthorization.verification_hash!==verifiedExperiment.verification_hash||
    promotionAuthorization.target_worldline_id!==verifiedExperiment.primary_worldline_id)
  throw Error('EXACT_SEPARATE_PROMOTION_AUTHORIZATION_REQUIRED');
 if(typeof mergeVerifier!=='function')throw Error('WORLDLINE_MERGE_VERIFIER_REQUIRED');
 const result=mergeVerifier(verifiedExperiment);
 if(result?.approved!==true||
    result?.verification_hash!==verifiedExperiment.verification_hash||
    result?.target_worldline_id!==verifiedExperiment.primary_worldline_id)
  throw Error('WORLDLINE_MERGE_REJECTED_OR_WRONG_TARGET');
 return Object.freeze({...verifiedExperiment,state:'WORLDLINE_MERGE_PENDING',
  promotion_authorization_ref:promotionAuthorization.authorization_ref,
  promotion_authorized_by:promotionAuthorization.authorized_by,
  merge_authorization_hash:digest({
   experiment_hash:verifiedExperiment.experiment_hash,
   verification_hash:verifiedExperiment.verification_hash,
   original_work_item_id:originalWorkItem.id,
   target_worldline_id:verifiedExperiment.primary_worldline_id,
   promotion_authorization_ref:promotionAuthorization.authorization_ref,
   verified_merger:result,
  }),
  // Still only a proposed merge. No real upgrade has been installed.
  production_graph_write_permitted:false,
 });
}

export function registerVerifiedCapability(mergePending,{
 capabilityRegistry,mergeResult,
}={}){
 if(mergePending?.state!=='WORLDLINE_MERGE_PENDING'||
    !text(mergePending.verification_hash)||
    !text(mergePending.capability_signature)||
    !text(mergePending.promotion_authorization_ref))
  throw Error('AUTHORIZED_VERIFIED_MERGE_REQUIRED');
 if(mergeResult?.merged!==true||
    mergeResult?.verification_hash!==mergePending.verification_hash||
    mergeResult?.target_worldline_id!==mergePending.primary_worldline_id)
  throw Error('EXACT_WORLDLINE_MERGE_NOT_VERIFIED');
 if(typeof capabilityRegistry?.register!=='function')
  throw Error('CAPABILITY_REGISTRY_REQUIRED');
 const registration=capabilityRegistry.register({
  capability:mergePending.synthesized_capability,
  capability_id:mergePending.capability_id,
  signature:mergePending.capability_signature,
  verification_hash:mergePending.verification_hash,
  worldline_id:mergePending.primary_worldline_id,
  original_work_item_id:mergePending.work_item_id,
  merge_result:mergeResult,
 });
 if(!registration||registration.registered!==true||
    registration.capability_id!==mergePending.capability_id||
    registration.verification_hash!==mergePending.verification_hash)
  throw Error('CAPABILITY_REGISTRATION_READBACK_REQUIRED');
 return Object.freeze({
  state:'REGISTERED',capability_id:mergePending.capability_id,
  work_item_id:mergePending.work_item_id,
  continuity_root_id:mergePending.continuity_root_id,
  worldline_id:mergePending.primary_worldline_id,
  registration,verification_hash:mergePending.verification_hash,
  capability_signature:mergePending.capability_signature,
  original_work_executed:false,
 });
}

export function reactivationPlan(confirmedGap,{registration,originalWorkItem}={}){
 if(confirmedGap?.state!=='GAP_CONFIRMED'||!text(confirmedGap.gap_id))
  throw Error('CONFIRMED_CAPABILITY_GAP_REQUIRED');
 if(registration?.state!=='REGISTERED'||
    registration.capability_id!==confirmedGap.capability_id||
    registration.work_item_id!==confirmedGap.work_item_id||
    registration.continuity_root_id!==confirmedGap.continuity_root_id)
  throw Error('CAPABILITY_REGISTRATION_SCOPE_MISMATCH');
 if(!text(originalWorkItem?.id)||
    originalWorkItem.id!==confirmedGap.work_item_id||
    originalWorkItem.continuity_root_id!==confirmedGap.continuity_root_id||
    originalWorkItem.worldline_id!==confirmedGap.worldline_id)
  throw Error('ORIGINAL_WORK_IDENTITY_CHANGED');
 return Object.freeze({
  state:'REACTIVATION_READY',gap_id:confirmedGap.gap_id,
  capability_id:confirmedGap.capability_id,
  original_work_item_id:originalWorkItem.id,
  original_continuity_root_id:originalWorkItem.continuity_root_id,
  original_worldline_id:originalWorkItem.worldline_id,
  continuation_token:digest({gap_id:confirmedGap.gap_id,
   original_work_item_id:originalWorkItem.id,
   original_continuity_root_id:originalWorkItem.continuity_root_id,
   capability_id:confirmedGap.capability_id,
   verification_hash:registration.verification_hash}),
  // Creating a plan never consumes execution authorization or retries work.
  execution_authorized:false,
  original_work_executed:false,
  job_completed:false,
 });
}

export function handleSynthesisFailure(experiment,{
 nextAttempt=experiment?.attempt+1,attemptLimit=experiment?.attempt_limit||DEFAULT_ATTEMPT_LIMIT,
}={}){
 if(!text(experiment?.experiment_hash))throw Error('SANDBOX_EXPERIMENT_REQUIRED');
 if(!Number.isInteger(nextAttempt)||nextAttempt<1||
    !Number.isInteger(attemptLimit)||attemptLimit<1)
  throw Error('ATTEMPT_BUDGET_INVALID');
 if(nextAttempt>attemptLimit)return Object.freeze({
  state:'ESCALATED',gap_id:experiment.gap_id,
  original_work_item_id:experiment.work_item_id,
  reason:'CAPABILITY_SYNTHESIS_BUDGET_EXHAUSTED',
  exhausted_attempts:attemptLimit,human_review_required:true,
  original_work_executed:false,
 });
 return Object.freeze({
  state:'SANDBOX_PROPOSED',gap_id:experiment.gap_id,
  original_work_item_id:experiment.work_item_id,
  next_attempt:nextAttempt,attempt_limit:attemptLimit,retry_allowed:true,
  original_work_executed:false,
 });
}
