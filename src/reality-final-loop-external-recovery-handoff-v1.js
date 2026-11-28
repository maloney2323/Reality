// Connect external failure observation to Reality's existing signed
// Continuity admission and governed recovery capability. No second executor.
import {createHash} from 'node:crypto';
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
import {observeExternalInfrastructureBlocker} from './reality-final-loop-external-infrastructure-observer-v1.js';
const safe=(status,extra={})=>Object.freeze({
 schema:'reality-final-loop-external-recovery-handoff-v1',status,
 repair_executed:false,continuation_verified:false,production_changed:false,
 ...extra
});
export async function admitExternalFailureToReality({
 observation,verifyProvider,admitToContinuity,readContinuityReceipt,
 requestSignedRecovery,scope
}={}){
 const candidate=observeExternalInfrastructureBlocker(observation);
 if(candidate.status!=='EXTERNAL_INFRA_RECOVERY_OBSERVATION_CANDIDATE')
  return safe(candidate.status);
 if(typeof verifyProvider!=='function'||typeof admitToContinuity!=='function'||
  typeof readContinuityReceipt!=='function'||typeof requestSignedRecovery!=='function')
  return safe('EXTERNAL_INFRA_REGISTERED_HANDLERS_MISSING',{
   next_governed_action:'REGISTER_EXISTING_SIGNED_CONTINUITY_AND_RECOVERY_HANDLERS'
  });
 if(scope?.project_ref!==candidate.project_ref||
    scope?.parent_project_ref!==candidate.parent_project_ref||
    scope?.isolated!==true||scope?.production===true)
  return safe('EXTERNAL_INFRA_ISOLATION_SCOPE_UNVERIFIED');
 let provider;
 try{provider=await verifyProvider(candidate)}catch{
  return safe('EXTERNAL_INFRA_PROVIDER_READBACK_UNAVAILABLE_NO_REPLAY');
 }
 if(provider?.independent_verified!==true||
    provider.project_ref!==candidate.project_ref||
    provider.branch_status!==candidate.branch_status||
    provider.source_receipt_sha256!==candidate.source_receipt_sha256)
  return safe('EXTERNAL_INFRA_PROVIDER_PROOF_MISMATCH');
 let admitted;
 try{admitted=await admitToContinuity({
  candidate,provider,scope,kind:'EXTERNAL_INFRA_BLOCKER',
  idempotency_key:candidate.source_receipt_sha256
 })}catch{
  return safe('EXTERNAL_INFRA_ADMISSION_OUTCOME_UNCERTAIN_READBACK_REQUIRED');
 }
 if(typeof admitted?.event_id!=='string'||!admitted.event_id)
  return safe('EXTERNAL_INFRA_DURABLE_EVENT_NOT_CONFIRMED');
 let receipt;
 try{receipt=await readContinuityReceipt(admitted.event_id)}catch{
  return safe('EXTERNAL_INFRA_CONTINUITY_READBACK_UNAVAILABLE_NO_REPLAY');
 }
 if(receipt?.independent_verified!==true||
    receipt.event_id!==admitted.event_id||
    receipt.source_receipt_sha256!==candidate.source_receipt_sha256||
    receipt.project_ref!==candidate.project_ref||
    receipt.state!=='OPEN')
  return safe('EXTERNAL_INFRA_CONTINUITY_EVENT_NOT_VERIFIED');
 let recovery;
 try{recovery=await requestSignedRecovery({
  event_id:admitted.event_id,source_receipt_sha256:candidate.source_receipt_sha256,
  scope,action:candidate.next_governed_action,
  diagnostic_only:true,mutation_authorized:false
 })}catch{
  return safe('EXTERNAL_INFRA_RECOVERY_WAKE_UNCERTAIN_READBACK_REQUIRED',{
   event_id:admitted.event_id
  });
 }
 return safe('EXTERNAL_INFRA_SIGNED_DIAGNOSTIC_REQUESTED',{
  event_id:admitted.event_id,
  recovery_status:recovery?.status||'UNVERIFIED',
  next_governed_action:'INDEPENDENTLY_VERIFY_DIAGNOSIS_THEN_REQUIRE_EXACT_REPAIR_WARRANT'
 });
}

const REF=/^[a-z0-9]{20}$/;
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const PR=/^https:\/\/github[.]com\/maloney2323\/Reality\/pull\/[1-9][0-9]*$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
async function readPinnedBranch({parent,project,token,fetchImpl}){
 const response=await fetchImpl('https://api.supabase.com/v1/projects/'+parent+'/branches',{
  method:'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(4500),
  headers:{Authorization:'Bearer '+token,Accept:'application/json'}});
 if(!response?.ok)throw Error('INFRA_PROVIDER_READ_UNAVAILABLE');
 const data=await response.json();
 const rows=Array.isArray(data)?data:data?.branches;
 const exact=Array.isArray(rows)?rows.filter(b=>b?.project_ref===project&&
  b.parent_project_ref===parent&&b.is_default===false):[];
 if(exact.length!==1)throw Error('INFRA_PROVIDER_BRANCH_SCOPE_UNVERIFIED');
 const b=exact[0];
 if(!/^[A-Za-z0-9][A-Za-z0-9._-]{1,127}$/.test(b.name||'')||
  !/^[A-Z_]{2,80}$/.test(b.status||'')||
  !/^[A-Z_]{2,80}$/.test(b.preview_project_status||'')||
  !Number.isFinite(Date.parse(b.updated_at||'')))throw Error('INFRA_PROVIDER_EPOCH_UNVERIFIED');
 const provider_epoch=new Date(b.updated_at).toISOString();
 const source_receipt_sha256='sha256:'+createHash('sha256').update(JSON.stringify([
  project,parent,b.name,b.status,b.preview_project_status,provider_epoch
 ])).digest('hex');
 return Object.freeze({provider:'supabase',project_ref:project,parent_project_ref:parent,
  branch_name:b.name,branch_status:b.status,preview_project_status:b.preview_project_status,
  provider_epoch,source_receipt_sha256,observed_at:new Date().toISOString()});
}
// Existing signed worker owns admission; isolated branch is the object
// observed, NOT a replacement for the authoritative Continuity database.
// The normal incident investigator consumes the durable admission on the same
// existing wake or a subsequent wake. No second scheduler or provider write.
export async function observeSignedInfrastructureOnExistingWorker({
 db,env=process.env,wake,continuity,workerRunId,wakeClaimId,
 fetchImpl=fetch,call=shiftRpc
}={}){
 if(env.REALITY_FINAL_LOOP_INFRASTRUCTURE_OBSERVATION_ENABLED!=='true')
  return safe('SIGNED_INFRASTRUCTURE_OBSERVATION_DISABLED');
 const parent=env.REALITY_FINAL_LOOP_SHARED_BENCHMARK_PROJECT_REF;
 const project=env.REALITY_FINAL_LOOP_PR_SOURCE_PLANS_ISOLATED_PROJECT_REF;
 const token=env.REALITY_RELEASE_CONTROL_SUPABASE_MANAGEMENT_TOKEN;
 const guard=continuity?.shared_continuity_guard;
 if(env.VERCEL_ENV!=='preview'||db?.strictSecrets!==true||
  !REF.test(parent||'')||!REF.test(project||'')||parent===project||
  db.project!==parent||db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  typeof token!=='string'||token.length<20||
  wake?.status!=='SHIFT_WORKER_PULSE_DURABLY_RECORDED'||
  !UUID.test(workerRunId||'')||!UUID.test(wakeClaimId||'')||
  !UUID.test(wake.shift_id||'')||!UUID.test(continuity?.owner_id||'')||
  continuity.shift_id!==wake.shift_id||guard?.owner_id!==continuity.owner_id||
  guard.shift_id!==wake.shift_id||guard.status!=='FINAL_LOOP_SHARED_CONTINUITY_GUARD_VERIFIED_READ_ONLY'||
  guard.execution_authorized!==false||!Array.isArray(guard.handoffs))
  return safe('SIGNED_INFRASTRUCTURE_CANONICAL_SCOPE_OR_PROVIDER_NOT_CONFIGURED');
 const matches=guard.handoffs.filter(h=>WORK.test(h.original_work_id||'')&&
  PR.test(h.source_ref||'')&&h.continuity_identity_verified===true&&
  h.qualifier_digest_verified===true&&HASH.test(h.qualifier_receipt_sha256||'')&&
  h.independent_original_outcome_verified===false&&h.original_job_completed===false);
 if(matches.length!==1)return safe('SIGNED_INFRASTRUCTURE_EXACT_UNFINISHED_ORIGINAL_REQUIRED');
 const source=matches[0],owner=continuity.owner_id,shift=wake.shift_id;
 let observation;
 try{observation=await readPinnedBranch({parent,project,token,fetchImpl})}
 catch{return safe('SIGNED_INFRASTRUCTURE_PROVIDER_READ_UNAVAILABLE')}
 let verifiedReceipt=null;
 const scope={project_ref:project,parent_project_ref:parent,isolated:true,production:false};
 return admitExternalFailureToReality({observation:{...observation,
  original_shift_id:shift,original_work_id:source.original_work_id},scope,
  verifyProvider:async candidate=>{
   const current=await readPinnedBranch({parent,project,token,fetchImpl});
   if(current.source_receipt_sha256!==candidate.source_receipt_sha256)
    return {independent_verified:false};
   return {independent_verified:true,project_ref:project,branch_status:current.branch_status,
    source_receipt_sha256:current.source_receipt_sha256};
  },
  admitToContinuity:async({provider})=>{
   const r=await call(db,'reality_observe_signed_infrastructure_blocker_v1',{
    p_shift_id:shift,p_worker_run_id:workerRunId,p_wake_claim_id:wakeClaimId,p_owner_id:owner,
    p_original_work_id:source.original_work_id,p_source_ref:source.source_ref,
    p_observation:{...observation,independent_provider_readback_verified:provider.independent_verified===true}
   },{fetchImpl,timeoutMs:5000});
   if(r?.status!=='SIGNED_INFRASTRUCTURE_INCIDENT_RECORDED'||!UUID.test(r.event_id||'')||
    r.source_receipt_sha256!==observation.source_receipt_sha256||r.execution_authorized!==false)
    return null;
   return r;
  },
  readContinuityReceipt:async eventId=>{
   const r=await call(db,'reality_read_signed_infrastructure_blocker_v1',{
    p_owner_id:owner,p_shift_id:shift,p_incident_id:eventId},{fetchImpl,timeoutMs:5000});
   if(r?.status!=='SIGNED_INFRASTRUCTURE_INCIDENT_READBACK'||r.execution_authorized!==false)
    return null;
   verifiedReceipt=r;return r;
  },
  requestSignedRecovery:async({event_id})=>{
   // No artificial dispatch receipt. The existing normal investigation
   // call immediately after this observer claims the durable incident.
   if(verifiedReceipt?.event_id!==event_id)throw Error('INFRA_INCIDENT_READBACK_REQUIRED');
   return {status:verifiedReceipt.phase==='DETECTED'?
    'DURABLE_INCIDENT_AVAILABLE_TO_EXISTING_SIGNED_INVESTIGATOR':
    'EXISTING_INCIDENT_HISTORY_PRESERVED_NO_REPLAY'};
  }});
}
