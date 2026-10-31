// Actual database capability registration, not a GitHub CI status alias.
// Only trusted preview server code invokes after the same owner approval,
// source installation and independent frozen acceptance were already checked.
import {createHash} from 'node:crypto';
import {continuityUuidFromSource}
 from './reality-continuity-spine-v2.0.js';
const sha64=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const sha40=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x);
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail=x=>{throw Error('FIRST178_REAL_REGISTRY_'+x)};
export function createOriginal178CapabilityRegistry({
 db,ownerId,originalWorkId,artifactHash,approvalRef,
 verifiedGoalId,worldlineId,fetchImpl=fetch,
}={}){
 if(!db?.strictSecrets||!db?.secretKey||!/^https:\/\//.test(db.url||'')||
  !/^[0-9a-f-]{36}$/i.test(ownerId||'')||
  !/^work:[0-9a-f]{32}$/.test(originalWorkId||'')||
  !sha64(artifactHash)||!/^supabase:owner-approval:[0-9a-f-]{36}$/i.test(approvalRef||'')||
  !verifiedGoalId||!worldlineId)
  fail('TRUSTED_SCOPE_REQUIRED');
 const registryId=continuityUuidFromSource(
  'reality-original178-registered:'+ownerId+':'+originalWorkId);
 const endpoint=db.url+'/rest/v1/universe_capabilities';
 const headers={apikey:db.secretKey,
  authorization:'Bearer '+db.secretKey,
  accept:'application/json','content-type':'application/json'};
 const fetchRow=async()=>{
  const u=endpoint+'?capability_id=eq.'+encodeURIComponent(registryId)+
   '&select=capability_id,capability_version,status,purpose,preconditions,procedure,verification_basis,admitted_event_id';
  const r=await fetchImpl(u,{method:'GET',headers,cache:'no-store'});
  if(!r.ok)fail('PROVIDER_READBACK_UNAVAILABLE');
  const rows=await r.json();
  if(!Array.isArray(rows)||rows.length>1)fail('PROVIDER_ROW_AMBIGUOUS');
  return rows[0]||null;
 };
 const admitted=async({installed,acceptance,approvalCheckpointReceiptId})=>{
  if(installed?.original_work_id!==originalWorkId||
    installed.artifact_hash!==artifactHash||
    !sha40(installed.installed_commit_sha)||
    installed.installation_authority_ref!==approvalRef||
    installed.production_changed!==false||
    acceptance?.verified!==true||
    acceptance.installed_commit_sha!==installed.installed_commit_sha||
    acceptance.original_work_id!==originalWorkId||
    !Number.isSafeInteger(acceptance.provider_run_id)||
    !Number.isSafeInteger(acceptance.provider_frozen_job_id)||
    !/^[0-9a-f-]{36}$/i.test(approvalCheckpointReceiptId||''))
   fail('PROVIDER_INSTALLED_SOURCE_AND_APPROVAL_NOT_VERIFIED');
  const binding={
   owner_id:ownerId,goal_id:verifiedGoalId,worldline_id:worldlineId,
   original_work_id:originalWorkId,artifact_hash:artifactHash,
   installation_approval_ref_hash:hash(approvalRef),
   installed_commit_sha:installed.installed_commit_sha,
   frozen_ci_run_id:acceptance.provider_run_id,
   frozen_ci_job_id:acceptance.provider_frozen_job_id,
   isolated_preview_only:true,
  };
  const record={
   capability_id:registryId,capability_version:artifactHash,
   status:'ACTIVE',purpose:'Original #178 evidence-bound CI capability',
   preconditions:[{kind:'OWNER_APPROVAL_AND_FROZEN_CI',satisfied:true}],
   procedure:{installed_commit_sha:installed.installed_commit_sha,
    module:'src/reality-extensions/reality-ci-failure-evidence.mjs',
    original_work_id:originalWorkId},
   failure_modes:[{kind:'PROVIDER_READBACK_REQUIRED'}],
   verification_basis:binding,performance:{settled:false},
   admitted_event_id:approvalCheckpointReceiptId,
  };
  const existing=await fetchRow();
  if(!existing){
   const r=await fetchImpl(endpoint+'?on_conflict=capability_id',{
    method:'POST',headers:{...headers,
     prefer:'resolution=ignore-duplicates,return=minimal'},
    body:JSON.stringify(record)});
   if(!r.ok)fail('PROVIDER_MUTATION_FAILED');
  }
  const observed=await fetchRow();
  if(!observed||
    observed.capability_id!==registryId||
    observed.capability_version!==artifactHash||
    observed.status!=='ACTIVE'||
    observed.admitted_event_id!==approvalCheckpointReceiptId||
    hash(observed.verification_basis)!==hash(binding)||
    observed.procedure?.installed_commit_sha!==installed.installed_commit_sha||
    observed.procedure?.original_work_id!==originalWorkId)
   fail('INDEPENDENT_REGISTRATION_READBACK_MISMATCH');
  return Object.freeze({verified:true,
   original_work_id:originalWorkId,artifact_hash:artifactHash,status:'ACTIVE',
   registry_receipt_ref:'supabase:universe_capabilities:'+registryId,
   evidence_hash:hash(binding),
   registered_capability_id:registryId,
   installed_commit_sha:installed.installed_commit_sha,
   production_changed:false,original_job_completed:false});
 };
 const verify=async({evidenceHash}={})=>{
  const r=await fetchRow();
  return Object.freeze({verified:Boolean(r&&r.status==='ACTIVE'&&
   r.capability_version===artifactHash&&
   r.verification_basis?.owner_id===ownerId&&
   r.verification_basis?.original_work_id===originalWorkId&&
   hash(r.verification_basis)===evidenceHash),
   registry_receipt_ref:'supabase:universe_capabilities:'+registryId});
 };
 return Object.freeze({admitted,verify,registryId});
}
