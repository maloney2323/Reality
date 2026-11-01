// Deterministic four-vector diagnostic on trusted execution receipts.
// This is a diagnosis ONLY. It never authorizes work, generation, promotion,
// cross-tenant reuse or replay of an uncertain external effect.
export const GENUINE_FAILURE_CLASSIFIER_VERSION='reality-genuine-capability-failure-classifier-v1';
const WORK=/^work:[a-f0-9]{32}$/;
const SHA=/^[a-f0-9]{64}$/;
const safe=x=>typeof x==='string'&&/^[A-Z][A-Z0-9_]{4,110}$/.test(x)?x:null;
const verifiedRef=x=>typeof x==='string'&&(
 /^https:\/\/github\.com\/maloney2323\/Reality\/actions\/runs\/[1-9][0-9]*$/.test(x)||
 /^vercel:provider-verified:[A-Za-z0-9_.:/-]{8,340}$/.test(x)||
 /^reality:provider-verified:[a-z][a-z0-9_-]{2,40}:[A-Za-z0-9_.:/-]{12,340}$/.test(x));
function verdict(classification,action,{originalWorkId=null,evidenceRef=null,capabilityId=null}={}){
 return Object.freeze({
  classifier_version:GENUINE_FAILURE_CLASSIFIER_VERSION,
  classification,recommended_action:action,
  original_work_id:WORK.test(originalWorkId)?originalWorkId:null,
  evidence_ref:verifiedRef(evidenceRef)?evidenceRef:null,
  capability_id:typeof capabilityId==='string'&&/^[a-z][a-z0-9._-]{2,90}$/.test(capabilityId)?capabilityId:null,
  authority_granted:false,model_generation_authorized:false,
  installation_authorized:false,original_job_completed:false,
 });
}
function authenticFailure(f,work){
 return WORK.test(work)&&f?.original_work_id===work&&
  f?.verified===false&&f?.independent===true&&
  f?.independently_verified===true&&
  f?.evidence_kind==='OBSERVED_FAILURE'&&
  f?.external_action_performed===false&&
  f?.provider_effect_may_have_occurred===false&&
  f?.no_automatic_retry!==true&&
  verifiedRef(f?.source_ref)&&
  typeof f?.verification_suite_ref==='string'&&
  f.verification_suite_ref.length>=13;
}
function scopeMatched(registry,work,capability){
 return registry?.independently_verified===true&&
  registry?.original_work_id===work&&
  registry?.capability_id===capability&&
  (registry.status==='ACTIVE'||registry.status==='ABSENT');
}
function correctFrozenProof(proof,work,capability){
 return proof?.independently_verified===true&&
  proof?.reproduced_failure===true&&
  proof?.original_work_id===work&&proof?.capability_id===capability&&
  SHA.test(proof.frozen_suite_sha256)&&
  proof?.external_action_performed===false&&
  proof?.provider_effect_may_have_occurred===false;
}
export function classifyGenuineExecutionFailure({
 result,originalWorkId,registryReadback=null,
 integrationReadback=null,frozenReproduction=null,
}={}){
 const o={originalWorkId};
 if(result?.status==='VERIFIED')
  return verdict('NO_FAILURE','CONTINUE_ORIGINAL_JOB',o);
 if(result?.status==='BLOCKED'){
  const reason=safe(result.blocked_reason);
  // Never claim missing authority merely because an unspecified blocker fired.
  if(reason&&(/^(?:GOAL_BOUNDARY_|EXECUTION_(?:FRESH_GOAL_|DURABLE_SINGLE_USE_RESERVATION_|GOAL_ADMISSION_|AUTHORIZATION_|APPROVAL_|POLICY_|WORK_APPROVAL_))/.test(reason)||
    /(?:AUTHORIZATION|SCOPE|AUTHORITY)_REQUIRED$/.test(reason)))
   return verdict('AUTH_SCOPE_DEFICIT','REQUEST_EXACT_AUTHORITY_OR_RECONCILE',o);
  return verdict('UNRESOLVED_EVIDENCE','RECONCILE_EXECUTION_BLOCKER',o);
 }
 if(result?.status!=='UNRESOLVED'||!authenticFailure(result.verification,originalWorkId))
  return verdict('UNRESOLVED_EVIDENCE','RECONCILE_ORIGINAL_EXECUTION',o);
 const f=result.verification;
 const details={originalWorkId,evidenceRef:f.source_ref,capabilityId:f.capability_id};
 const reg=scopeMatched(registryReadback,originalWorkId,f.capability_id)?
   registryReadback:null;
 if(f.blocker_class==='IMPLEMENTATION_DEFECT'){
  if(reg?.status==='ACTIVE')
   return verdict('IMPLEMENTATION_DEFECT','REPAIR_EXISTING_CAPABILITY',details);
  return verdict('UNRESOLVED_EVIDENCE','VERIFY_EXISTING_CAPABILITY_REGISTRY',details);
 }
 if(f.blocker_class==='EXTERNAL_INTEGRATION_GAP'){
  if(integrationReadback?.independently_verified===true&&
   integrationReadback?.original_work_id===originalWorkId&&
   integrationReadback?.connector_id===f.capability_id&&
   integrationReadback?.connector_defined===true&&
   integrationReadback?.connection_available===false)
   return verdict('EXTERNAL_INTEGRATION_GAP','RESTORE_OR_CONNECT_INTEGRATION',details);
  return verdict('UNRESOLVED_EVIDENCE','VERIFY_CONNECTOR_CONFIGURATION',details);
 }
 if(f.blocker_class==='AUTH_SCOPE_DEFICIT')
  return verdict('AUTH_SCOPE_DEFICIT','REQUEST_EXACT_AUTHORITY_OR_RECONCILE',details);
 if(f.blocker_class==='MISSING_INSTRUMENT'){
  if(reg?.status==='ACTIVE')
   return verdict('UNRESOLVED_EVIDENCE','REASSESS_ALREADY_ACTIVE_CAPABILITY',details);
  if(reg?.status==='ABSENT'&&
   correctFrozenProof(frozenReproduction,originalWorkId,f.capability_id))
   return verdict('TRUE_CAPABILITY_VOID','DISPATCH_TO_GOVERNED_BUILDER',details);
  // No builder launch until registry absence AND independent frozen
  // reproduction. Discovery and evidence queueing are still permitted.
  return verdict('CAPABILITY_VOID_CANDIDATE','VERIFY_REGISTRY_AND_FROZEN_FAILURE',details);
 }
 return verdict('UNRESOLVED_EVIDENCE','RECONCILE_FAILURE_CLASSIFICATION',details);
}
