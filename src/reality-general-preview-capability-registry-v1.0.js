// Real, job-agnostic, isolated-preview capability registration. Never treat
// successful model generation, sandbox test, or a GitHub source commit alone as
// ACTIVE. Requires owner-authorized constitutional checkpoint + separate
// independently observed ORIGINAL frozen acceptance at the exact install SHA.
import {createHash} from 'node:crypto';
import {continuityUuidFromSource} from './reality-continuity-spine-v2.0.js';
const SHA40=/^[a-f0-9]{40}$/,SHA64=/^[a-f0-9]{64}$/,WORK=/^work:[a-f0-9]{32}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9-]{27,28}$/i;
const fail=x=>{throw Error('GENERAL_PREVIEW_REGISTRY_'+x)};
const stable=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(stable):
 Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])]));
const digest=x=>createHash('sha256').update(JSON.stringify(stable(x))).digest('hex');
export function createGeneralPreviewCapabilityRegistry({
 db,scope,artifactHash,fetchImpl=fetch,
}={}){
 if(!db?.strictSecrets||typeof db.secretKey!=='string'||db.secretKey.length<10||
  !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(String(db.url||''))||
  !UUID.test(String(scope?.owner_id||''))||!WORK.test(String(scope?.original_work_id||''))||
  typeof scope.goal_id!=='string'||!scope.goal_id||
  typeof scope.worldline_id!=='string'||!scope.worldline_id||
  scope.target_environment!=='ISOLATED_PREVIEW'||!SHA64.test(String(artifactHash||'')))
  fail('TRUSTED_OWNER_WORK_PREVIEW_SCOPE_REQUIRED');
 const id=continuityUuidFromSource(
  'reality:preview:capability:'+scope.owner_id+':'+scope.original_work_id+':'+artifactHash);
 const url=db.url.replace(/\/$/,'')+'/rest/v1/';
 const headers={apikey:db.secretKey,
  authorization:'Bearer '+db.secretKey,
  'content-type':'application/json',accept:'application/json'};
 async function read(path){
  const response=await fetchImpl(url+path,{method:'GET',
   headers,cache:'no-store',redirect:'error'});
  if(!response.ok)fail('PROVIDER_READBACK_UNAVAILABLE');
  return response.json();
 }
 async function registryRow(){
  const rows=await read('universe_capabilities?capability_id=eq.'+id+
   '&select=capability_id,capability_version,status,verification_basis,procedure,admitted_event_id');
  if(!Array.isArray(rows)||rows.length>1)fail('REGISTRY_READBACK_AMBIGUOUS');
  return rows[0]||null;
 }
 async function recordAndReadback({installed,acceptance,approval}={}){
  if(installed?.kind!=='ISOLATED_GITHUB_SOURCE_INSTALLED'||
   installed.original_work_id!==scope.original_work_id||
   installed.owner_id!==scope.owner_id||
   installed.goal_id!==scope.goal_id||
   installed.artifact_hash!==artifactHash||
   installed.provider_bytes_readback_verified!==true||
   installed.production_changed!==false||
   !SHA40.test(String(installed.installed_commit_sha||''))||
   !/^feature\/reality-/.test(String(installed.installed_branch||''))||
   !Array.isArray(installed.provider_source_files)||
   !installed.provider_source_files.some(x=>x.startsWith('src/reality-extensions/'))||
   acceptance?.independent_provider_readback!==true||
   acceptance?.original_frozen_tests_passed!==true||
   acceptance?.governance_tests_passed!==true||
   acceptance?.installed_commit_sha!==installed.installed_commit_sha||
   acceptance?.original_work_id!==scope.original_work_id||
   !Number.isSafeInteger(acceptance?.provider_run_id)||
   !Number.isSafeInteger(acceptance?.provider_job_id)||
   !SHA64.test(String(acceptance?.source_failure_evidence_sha256||''))||
   approval?.kind!=='PROMOTION_AUTHORIZED'||
   approval?.original_work_id!==scope.original_work_id||
   approval?.owner_id!==scope.owner_id||
   approval?.goal_id!==scope.goal_id||
   approval?.artifact_hash!==artifactHash||
   approval?.consumed_once!==true||
   approval?.approval_origin!=='AUTHENTICATED_OWNER_EXPLICIT_ACTION'||
   !UUID.test(String(approval?.checkpoint_receipt_id||''))||
   !approval?.reservation_ref)
   fail('DISTINCT_APPROVAL_INSTALL_ACCEPTANCE_REQUIRED');
  // The authoritative approval checkpoint must actually exist in Continuity.
  const evidence=await read('universe_events?event_id=eq.'+approval.checkpoint_receipt_id+
   '&select=event_id,continuity_root_id,worldline_id,payload');
  if(!Array.isArray(evidence)||evidence.length!==1||
   evidence[0].worldline_id!==scope.worldline_id||
   evidence[0].payload?.original_work_id!==scope.original_work_id||
   evidence[0].payload?.driver_state?.phase!=='PROMOTION_AUTHORIZED'||
   evidence[0].payload?.driver_state?.candidate?.artifact_hash!==artifactHash||
   evidence[0].payload?.driver_state?.promotion_authorization?.consumed_once!==true)
   fail('OWNER_APPROVAL_CONTINUITY_CHECKPOINT_MISSING');
  const basis={
   owner_id:scope.owner_id,goal_id:scope.goal_id,worldline_id:scope.worldline_id,
   original_work_id:scope.original_work_id,artifact_hash:artifactHash,
   installed_commit_sha:installed.installed_commit_sha,
   branch:installed.installed_branch,
   source_failure_evidence_sha256:acceptance.source_failure_evidence_sha256,
   independently_observed_original_test_run:acceptance.provider_run_id,
   independently_observed_original_test_job:acceptance.provider_job_id,
   reservation_ref_sha256:digest(approval.reservation_ref),
   environment:'ISOLATED_PREVIEW',
  };
  const record={
   capability_id:id,capability_version:artifactHash,status:'ACTIVE',
   purpose:'Reality exact original-work repair — ISOLATED_PREVIEW_ONLY',
   preconditions:[{kind:'INDEPENDENT_FROZEN_ACCEPTANCE',satisfied:true},
    {kind:'SIGNED_OWNER_PROMOTION',satisfied:true}],
   procedure:{extension_files:installed.provider_source_files,
    installed_commit_sha:installed.installed_commit_sha,
    original_work_id:scope.original_work_id,
    activation_scope:'ISOLATED_PREVIEW_ONLY'},
   failure_modes:[{kind:'EXTERNAL_PROVIDER_READBACK_REQUIRED'}],
   verification_basis:basis,performance:{original_work_settled:false},
   admitted_event_id:approval.checkpoint_receipt_id,
  };
  if(!await registryRow()){
   const response=await fetchImpl(url+'universe_capabilities?on_conflict=capability_id',{
    method:'POST',headers:{...headers,
     Prefer:'resolution=ignore-duplicates,return=minimal'},
    body:JSON.stringify(record),redirect:'error'});
   if(!response.ok)fail('PROVIDER_REGISTRATION_FAILED');
  }
  const observed=await registryRow();
  if(!observed||observed.status!=='ACTIVE'||
   observed.capability_id!==id||observed.capability_version!==artifactHash||
   observed.admitted_event_id!==approval.checkpoint_receipt_id||
   digest(observed.verification_basis)!==digest(basis)||
   observed.procedure?.installed_commit_sha!==installed.installed_commit_sha||
   observed.procedure?.original_work_id!==scope.original_work_id)
   fail('INDEPENDENT_REGISTRATION_READBACK_MISMATCH');
  return Object.freeze({
   kind:'CAPABILITY_REGISTERED',verified:true,status:'ACTIVE',
   registry_receipt_ref:'supabase:universe_capabilities:'+id,
   original_work_id:scope.original_work_id,owner_id:scope.owner_id,
   artifact_hash:artifactHash,evidence_hash:digest(basis),
   installed_commit_sha:installed.installed_commit_sha,
   production_changed:false,original_job_completed:false,
  });
 }
 return Object.freeze({recordAndReadback,registryId:id});
}
