// Universal recovery data contract, NOT a new worker, credential issuer,
// installer or model API. Trusted server adapters hold the HMAC key and
// independently re-read owner/goal/lease/effect state before every action.
import {createHmac,timingSafeEqual} from 'node:crypto';

export const GOVERNED_RECOVERY_HANDOFF_VERSION='reality-universal-governed-recovery-handoff-v1';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const SHA=/^[a-f0-9]{64}$/;
const CAP=/^[a-z][a-z0-9._-]{2,90}$/;
const DENY=x=>{throw Error('GOVERNED_RECOVERY_'+x)};
const canonical=v=>v===null||typeof v!=='object'?v:Array.isArray(v)?
 v.map(canonical):Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]));
const serialized=v=>JSON.stringify(canonical(v));
const exactIso=s=>typeof s==='string'&&!Number.isNaN(Date.parse(s))&&
 new Date(s).toISOString()===s;
const permittedActions=x=>Array.isArray(x)&&x.length<=24&&
 x.every(t=>typeof t==='string'&&/^[a-z][a-z0-9._:-]{2,110}$/.test(t))&&
 new Set(x).size===x.length;
const lock=x=>{
 if(x&&typeof x==='object'){
  for(const v of Object.values(x))lock(v);
  Object.freeze(x);
 }
 return x;
};
const keyGuard=k=>{
 if(!(Buffer.isBuffer(k)&&k.length>=32))DENY('SERVER_ONLY_SIGNING_KEY_REQUIRED');
};
const signature=(body,key)=>createHmac('sha256',key).update(serialized(body)).digest('hex');
const time=s=>exactIso(s)?Date.parse(s):NaN;

function checkScope(s){
 if(!s||!UUID.test(s.owner_id||'')||!UUID.test(s.shift_id||'')||
  !WORK.test(s.original_work_id||'')||!s.goal_id||
  typeof s.goal_id!=='string'||s.goal_id.length>150||
  !s.continuity_root_id||!s.worldline_id||
  !SHA.test(s.source_identity_hash||'')||
  !SHA.test(s.ledger_head_hash||'')||
  !SHA.test(s.authorization_fingerprint||'')||
  !exactIso(s.authorization_expires_at)||
  !permittedActions(s.allowed_capabilities)||
  s.target_environment!=='ISOLATED_PREVIEW'||
  s.original_job_authorized!==true||
  s.independently_settled!==false||
  s.provider_effect_may_have_occurred!==false||
  s.installation_authorized!==false||
  s.production_changed!==false)
  DENY('INDEPENDENT_CURRENT_ORIGINAL_AUTHORITY_REQUIRED');
}
function checkFailure(f,s){
 if(!f||!UUID.test(f.failure_id||'')||
  f.owner_id!==s.owner_id||f.shift_id!==s.shift_id||
  f.original_work_id!==s.original_work_id||f.goal_id!==s.goal_id||
  f.continuity_root_id!==s.continuity_root_id||
  f.worldline_id!==s.worldline_id||
  f.source_identity_hash!==s.source_identity_hash||
  f.ledger_head_hash!==s.ledger_head_hash||
  !exactIso(f.failed_valid_at)||
  !SHA.test(f.provider_evidence_sha256||'')||
  f.provider_observation_independently_verified!==true||
  f.durable_failure_readback_verified!==true||
  f.provider_effect_may_have_occurred!==false||
  f.production_changed!==false||
  !['IMPLEMENTATION_DEFECT','MISSING_INSTRUMENT',
    'ENVIRONMENT_CONTEXT_DEFICIT','AUTH_SCOPE_DEFICIT'].includes(f.blocker_class)||
  !CAP.test(f.capability_id||''))
  DENY('DURABLE_INDEPENDENT_FAILURE_REQUIRED');
}
function compareScope(current,original){
 checkScope(current);
 const fields=['owner_id','shift_id','original_work_id','goal_id',
  'continuity_root_id','worldline_id','source_identity_hash',
  'authorization_fingerprint',
  'authorization_expires_at','target_environment'];
 if(fields.some(k=>current[k]!==original[k])||
   serialized(current.allowed_capabilities)!==serialized(original.allowed_capabilities))
  DENY('OWNER_GOAL_OR_AUTHORIZATION_DRIFT');
 if(current.ledger_head_hash!==original.ledger_head_hash)
  DENY('LEDGER_TIP_CHANGED_RECONCILIATION_REQUIRED');
}
function readyEnvelope({envelope,signingKey,currentScope,executionTime}={}){
 keyGuard(signingKey);
 const b=envelope?.body;
 if(envelope?.version!==GOVERNED_RECOVERY_HANDOFF_VERSION||
  !b||typeof envelope.signature!=='string'||!SHA.test(envelope.signature))
  DENY('SIGNED_HANDOFF_ENVELOPE_REQUIRED');
 const expected=signature(b,signingKey);
 if(!timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(envelope.signature,'hex')))
  DENY('HANDOFF_SIGNATURE_INVALID');
 if(b.version!==GOVERNED_RECOVERY_HANDOFF_VERSION||
  b.handoff_purpose!=='ASSESS_AND_PREPARE_ORIGINAL_RECOVERY'||
  b.authorization_granted_by_handoff!==false||
  b.installation_authorized!==false||b.original_job_completed!==false||
  !b.scope||!b.failure||!exactIso(b.transaction_time)||
  !exactIso(executionTime))
  DENY('HANDOFF_SHAPE_INVALID');
 checkScope(b.scope);checkFailure(b.failure,b.scope);
 compareScope(currentScope,b.scope);
 const valid=time(b.failure.failed_valid_at),recorded=time(b.transaction_time),
  now=time(executionTime),until=time(b.scope.authorization_expires_at);
 if(valid>recorded||recorded>now||now>=until||
   now-recorded>15*60*1000)
  DENY('HANDOFF_EXPIRED_OR_BITEMPORAL_DRIFT');
 return b;
}

// Mint only AFTER a server independently verifies the existing job,
// failure ledger, authorization expiry and no-uncertain-effect readback.
// This signed snapshot is NOT a reusable warrant to execute or install.
export function sealGovernedRecoveryHandoff({
 currentScope,failure,signingKey,transactionTime
}={}){
 keyGuard(signingKey);checkScope(currentScope);checkFailure(failure,currentScope);
 if(!exactIso(transactionTime)||
  time(failure.failed_valid_at)>time(transactionTime)||
  time(transactionTime)>=time(currentScope.authorization_expires_at))
  DENY('INVALID_VALID_AND_TRANSACTION_TIMES');
 const body={
  version:GOVERNED_RECOVERY_HANDOFF_VERSION,
  handoff_purpose:'ASSESS_AND_PREPARE_ORIGINAL_RECOVERY',
  transaction_time:transactionTime,
  scope:{
   owner_id:currentScope.owner_id,shift_id:currentScope.shift_id,
   original_work_id:currentScope.original_work_id,goal_id:currentScope.goal_id,
   continuity_root_id:currentScope.continuity_root_id,
   worldline_id:currentScope.worldline_id,
   source_identity_hash:currentScope.source_identity_hash,
   ledger_head_hash:currentScope.ledger_head_hash,
   authorization_fingerprint:currentScope.authorization_fingerprint,
   authorization_expires_at:currentScope.authorization_expires_at,
   target_environment:'ISOLATED_PREVIEW',
   allowed_capabilities:[...currentScope.allowed_capabilities],
   original_job_authorized:true,independently_settled:false,
   provider_effect_may_have_occurred:false,
   installation_authorized:false,production_changed:false,
  },
  failure:{
   failure_id:failure.failure_id,owner_id:failure.owner_id,
   shift_id:failure.shift_id,original_work_id:failure.original_work_id,
   goal_id:failure.goal_id,
   continuity_root_id:failure.continuity_root_id,
   worldline_id:failure.worldline_id,
   source_identity_hash:failure.source_identity_hash,
   ledger_head_hash:failure.ledger_head_hash,
   failed_valid_at:failure.failed_valid_at,
   provider_evidence_sha256:failure.provider_evidence_sha256,
   capability_id:failure.capability_id,
   blocker_class:failure.blocker_class,
   provider_observation_independently_verified:true,
   durable_failure_readback_verified:true,
   provider_effect_may_have_occurred:false,production_changed:false,
  },
  authorization_granted_by_handoff:false,
  installation_authorized:false,original_job_completed:false,
 };
 return lock({version:GOVERNED_RECOVERY_HANDOFF_VERSION,
  body,signature:signature(body,signingKey)});
}

export function verifyGovernedRecoveryHandoff(args){
 const b=readyEnvelope(args);
 return lock({status:'HANDOFF_INDEPENDENT_SCOPE_VERIFIED',
  original_work_id:b.scope.original_work_id,
  failed_valid_at:b.failure.failed_valid_at,
  source_identity_hash:b.scope.source_identity_hash,
  recorded_transaction_time:b.transaction_time,
  execution_time:args.executionTime,
  same_job:true,authorization_granted:false,installation_authorized:false});
}
function toolManifest(tool,scope,capability){
 if(!tool||tool.capability_id!==capability||
  !SHA.test(tool.schema_sha256||'')||
  !permittedActions(tool.required_capabilities)||
  tool.required_capabilities.some(p=>!scope.allowed_capabilities.includes(p))||
  tool.external_permission_escalation===true||
  tool.production_write_authorized!==false)
  DENY('TOOL_MANIFEST_OUTSIDE_ORIGINAL_AUTHORITY');
 return lock({
  capability_id:tool.capability_id,schema_sha256:tool.schema_sha256,
  required_capabilities:[...tool.required_capabilities],
  external_permission_escalation:false,production_write_authorized:false
 });
}

// Existing registry binding is immediate ONLY if exact permissions are already
// authorized. Missing privileges are an authority request, not a tool gap.
// New code is always staged for exact-artifact approval before it can be bound.
export function brokerGovernedRecoveryCapability({
 envelope,signingKey,currentScope,executionTime,
 registryReadback,frozenReproduction=null,
 candidate=null,installationApproval=null
}={}){
 const b=readyEnvelope({envelope,signingKey,currentScope,executionTime});
 const id=b.failure.capability_id,work=b.scope.original_work_id;
 if(registryReadback?.independently_verified!==true||
  registryReadback.original_work_id!==work||
  registryReadback.capability_id!==id||
  !['ACTIVE','ABSENT'].includes(registryReadback.status))
  DENY('INDEPENDENT_CAPABILITY_REGISTRY_REQUIRED');
 const common={original_work_id:work,capability_id:id,model_may_grant_authority:false,
  original_job_completed:false,production_changed:false};
 // Broker decisions are also authenticated. Signed envelope scope alone
 // cannot protect against a forged 'approved' model or transport verdict.
 const verdict=x=>lock({...x,decision_signature:signature({
  envelope_signature:envelope.signature,decision:x
 },signingKey)});
 if(b.failure.blocker_class==='AUTH_SCOPE_DEFICIT')
  return verdict({...common,status:'EXACT_AUTHORITY_REQUIRED_NOT_A_TOOL_GAP',
   tool_manifest:null,can_rehydrate:false});
 if(registryReadback.status==='ACTIVE'){
  const tool=toolManifest(registryReadback.manifest,b.scope,id);
  if(b.failure.blocker_class==='MISSING_INSTRUMENT')
   return verdict({...common,status:'ACTIVE_TOOL_REASSESS_FAILURE_NO_SYNTHESIS',
    tool_manifest:null,can_rehydrate:false});
  if(b.failure.blocker_class==='ENVIRONMENT_CONTEXT_DEFICIT')
   return verdict({...common,status:'EXISTING_CAPABILITY_REBOUND',
    tool_manifest:tool,ephemeral:false,can_rehydrate:true,
    new_tool_created:false,installation_authorized:false});
  // A verified implementation defect is NOT cured by re-binding the same
  // buggy tool. Its repair enters the frozen-red / verified-green track.
 }
 if(b.failure.blocker_class==='IMPLEMENTATION_DEFECT'&&
  registryReadback.status!=='ACTIVE')
  return verdict({...common,status:'DEFECT_REGISTRY_RECONCILIATION_REQUIRED',
   tool_manifest:null,can_rehydrate:false});
 if(b.failure.blocker_class!=='MISSING_INSTRUMENT'&&
  b.failure.blocker_class!=='IMPLEMENTATION_DEFECT')
  return verdict({...common,status:'DIAGNOSE_CONTEXT_BEFORE_TOOL_BUILD',
   tool_manifest:null,can_rehydrate:false});
 if(frozenReproduction?.independently_verified!==true||
  frozenReproduction.original_work_id!==work||
  frozenReproduction.capability_id!==id||
  frozenReproduction.reproduced_failure!==true||
  !SHA.test(frozenReproduction.frozen_suite_sha256||'')||
  frozenReproduction.external_action_performed!==false)
  return verdict({...common,status:'FROZEN_REPRODUCTION_REQUIRED',
   tool_manifest:null,can_rehydrate:false});
 if(candidate?.independently_verified!==true||
  candidate.original_work_id!==work||candidate.capability_id!==id||
  candidate.frozen_suite_sha256!==frozenReproduction.frozen_suite_sha256||
  !SHA.test(candidate.artifact_sha256||'')||
  candidate.isolation!=='NO_NETWORK_NO_SECRETS'||
  candidate.sandbox_tests_passed!==true||
  candidate.production_changed!==false)
  return verdict({...common,status:'ISOLATED_CANDIDATE_VERIFICATION_REQUIRED',
   tool_manifest:null,can_rehydrate:false});
 const tool=toolManifest(candidate.manifest,b.scope,id);
 if(installationApproval?.independently_verified!==true||
  installationApproval.original_work_id!==work||
  installationApproval.owner_id!==b.scope.owner_id||
  installationApproval.artifact_sha256!==candidate.artifact_sha256||
  installationApproval.exact_owner_approval!==true||
  installationApproval.approved_environment!=='ISOLATED_PREVIEW')
  return verdict({...common,status:'EXACT_ARTIFACT_APPROVAL_REQUIRED',
   staged_artifact_sha256:candidate.artifact_sha256,
   tool_manifest:null,can_rehydrate:false,installation_authorized:false});
 // This result ONLY makes the isolated tool eligible for the separately
 // governed installer, not proof of installation or permission to execute.
 return verdict({...common,status:'APPROVED_CANDIDATE_REQUIRES_INSTALL_READBACK',
  staged_artifact_sha256:candidate.artifact_sha256,
  tool_manifest:tool,can_rehydrate:false,
  installation_authorized_by_handoff:false,
  persistent_promotion_authorized:false});
}

// Continuation never replays effects. A checked installation/readback and a
// fresh durable checkpoint are prerequisites; the existing governed executor
// must obtain a new atomic lease/fencing claim and independently settle.
export function planZeroTouchSameJobContinuation({
 envelope,signingKey,currentScope,executionTime,brokerResult,
 checkpointReadback,installedReadback=null
}={}){
 const b=readyEnvelope({envelope,signingKey,currentScope,executionTime});
 const work=b.scope.original_work_id,cap=b.failure.capability_id;
 if(!checkpointReadback||checkpointReadback.independently_verified!==true||
  checkpointReadback.original_work_id!==work||
  checkpointReadback.owner_id!==b.scope.owner_id||
  checkpointReadback.goal_id!==b.scope.goal_id||
  checkpointReadback.failure_id!==b.failure.failure_id||
  checkpointReadback.source_identity_hash!==b.scope.source_identity_hash||
  !SHA.test(checkpointReadback.checkpoint_sha256||'')||
  checkpointReadback.provider_effect_may_have_occurred!==false||
  checkpointReadback.original_job_settled!==false)
  DENY('EXACT_DURABLE_PREFAILURE_CHECKPOINT_REQUIRED');
 if(brokerResult?.original_work_id!==work||
  brokerResult.capability_id!==cap||
  brokerResult.model_may_grant_authority!==false||
  brokerResult.production_changed!==false)
  DENY('BROKER_IDENTITY_CHANGED');
 const signed=brokerResult.decision_signature;
 if(!SHA.test(signed||''))DENY('SIGNED_BROKER_DECISION_REQUIRED');
 const {decision_signature:unused,...decision}=brokerResult;
 const expectedDecision=signature({envelope_signature:envelope.signature,
  decision},signingKey);
 if(!timingSafeEqual(Buffer.from(signed,'hex'),
  Buffer.from(expectedDecision,'hex')))
  DENY('BROKER_DECISION_SIGNATURE_INVALID');
 let manifest;
 if(brokerResult.status==='EXISTING_CAPABILITY_REBOUND'&&
  brokerResult.can_rehydrate===true)
  manifest=brokerResult.tool_manifest;
 else if(brokerResult.status==='APPROVED_CANDIDATE_REQUIRES_INSTALL_READBACK'&&
  installedReadback?.independently_verified===true&&
  installedReadback.original_work_id===work&&
  installedReadback.artifact_sha256===brokerResult.staged_artifact_sha256&&
  installedReadback.environment==='ISOLATED_PREVIEW'&&
  installedReadback.activated===true&&
  installedReadback.provider_effect_may_have_occurred===false)
  manifest=brokerResult.tool_manifest;
 else DENY('GOVERNED_CAPABILITY_NOT_INSTALLED_OR_REBOUND');
 const allowedTool=toolManifest(manifest,b.scope,cap);
 return lock({status:'SAME_ORIGINAL_JOB_READY_FOR_GOVERNED_CONTINUATION',
  original_work_id:work,owner_id:b.scope.owner_id,goal_id:b.scope.goal_id,
  source_failure_id:b.failure.failure_id,
  checkpoint_sha256:checkpointReadback.checkpoint_sha256,
  source_identity_hash:b.scope.source_identity_hash,
  envelope_signature:envelope.signature,
  verified_tool_manifest:allowedTool,
  tool_scope:'EPHEMERAL_ORIGINAL_JOB_ONLY',
  authorize_rehydrate_only:true,
  existing_executor_must_acquire_atomic_fenced_claim:true,
  execution_side_effect_performed:false,
  automatic_resume_completed:false,
  independently_verified_final_receipt:false,
  new_job_created:false,authority_extended:false,
  persistent_promotion_authorized:false,production_changed:false});
}
