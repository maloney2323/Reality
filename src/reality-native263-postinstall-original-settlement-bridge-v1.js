// Reality's current signed one-minute worker performs the final customer
// job's provider readback and settlement. No user-controlled parameters.
// Vercel's immutable deployment Git SHA must equal DB installed commit.
// The broker independently verifies actual GitHub CI and frozen sources.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
const WORK='work:873a6e74fd14c6beacc9042dd8021dfc';
const SHIFT='9460cfff-937a-4105-9093-2e41ab39a950';
const OWNER='85eeae0b-2988-43c4-b20c-590fb51da70d';
const SHA='sha256:459e2bbe9a9d9c7037c87542a9cdbebf06f77a6d368d72769c79fdbef7947f48';
const BRANCH='reality/isolated-openai-governance-gateway-20261108';
const fail=x=>{throw Error('NATIVE263_FINAL_WORKER_'+x)};
const deny=(status,extras={})=>Object.freeze({
 status,original_work_id:WORK,shift_id:SHIFT,
 production_changed:false,original_job_completed:false,...extras
});
export async function verifyNative263ApprovedInstallToOriginalReceipt({
 db,env=process.env,fetchImpl=fetch
}={}){
 if(env.VERCEL_ENV!=='preview'||!db?.strictSecrets||
    typeof db.secretKey!=='string'||db.secretKey.length<25||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF)
  fail('TRUSTED_ISOLATED_SIGNED_WORKER_REQUIRED');
 const c=await shiftRpc(db,'reality_read_native263_postinstall_context_v1',{},
  {fetchImpl});
 if(c.status!=='NATIVE263_ORIGINAL_POSTINSTALL_READONLY_CONTEXT'||
    c.original_work_id!==WORK||c.owner_id!==OWNER||c.shift_id!==SHIFT||
    c.candidate_artifact_sha256!==SHA||
    c.candidate_commit_sha!=='e44ee294f21c73803a2bcdb5a9cb487f0f80fc85'||
    c.target_branch!==BRANCH||
    c.target_path!=='src/reality-riley-service-original-runtime-v1.js'||
    c.expected_installed_blob_sha!=='dda8e71d44cca6745312bcbd000089d5a0b01d54'||
    c.production_changed!==false)
  fail('FROZEN_ORIGINAL_DATABASE_PROVENANCE_DRIFT');
 if(c.state==='ORIGINAL_SETTLED')
  return deny('NATIVE263_ORIGINAL_SETTLED_RECEIPT_ALREADY_EXISTS_NO_REPLAY',{
   original_job_completed:true,
   original_final_receipt_id:c.original_final_receipt_id});
 if(!['STAGED_UNAPPROVED','SOURCE_INSTALLED'].includes(c.state))
  return deny('NATIVE263_FINAL_WORK_AWAITING_EXACT_INSTALL_PHASE',{
   installed_commit_sha:c.installed_commit_sha||null});
 // A Vercel preview's authoritative env source SHA binds the worker to
 // the deployed code, not to any model-proposed or arbitrary Git SHA.
 const gitSha=String(env.VERCEL_GIT_COMMIT_SHA||'');
 if(!/^[a-f0-9]{40}$/.test(gitSha)||
    env.VERCEL_GIT_COMMIT_REF!==BRANCH)
  return deny('NATIVE263_VERIFIED_VERCEL_GIT_DEPLOYMENT_IDENTITY_REQUIRED');
 let action;
 if(c.state==='STAGED_UNAPPROVED'){
  if(c.approval_receipt_id!==null||c.installed_commit_sha!==null||
    c.original_phase!=='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL'||
    c.original_installed!==false)
   fail('PREAPPROVAL_ORIGINAL_EFFECT_DRIFT');
  if(c.owner_approval_ready===true)
   return deny('NATIVE263_EXACT_OWNER_APPROVAL_READY_IN_REALITY_CHAT',
    {owner_approval_ready:true});
  action='verify_release_path';
 }else{
  if(!c.approval_receipt_id||!c.owner_approved_at||
     !/^[a-f0-9]{40}$/.test(c.installed_commit_sha||''))
   fail('SOURCE_INSTALLED_WITHOUT_OWNER_APPROVAL_OR_PROVIDER_SHA');
  if(c.installed_commit_sha!==gitSha)
   return deny('NATIVE263_WAIT_FOR_AUTOMATIC_EXACT_INSTALLED_PREVIEW',{
    expected_installed_commit_sha:c.installed_commit_sha,
    current_preview_commit_sha:gitSha});
  action='verify_postinstall_original';
 }
 let response;
 try{
  response=await fetchImpl(db.url+
    '/functions/v1/reality-native263-postinstall-verifier-v1',{
   method:'POST',redirect:'error',cache:'no-store',
   signal:AbortSignal.timeout(18000),
   headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
    'content-type':'application/json',accept:'application/json'},
   body:JSON.stringify({version:1,action,deployed_sha:gitSha})
  });
 }catch{return deny('NATIVE263_INDEPENDENT_POSTINSTALL_BROKER_UNREACHABLE')}
 const proof=await response.json().catch(()=>null);
 if(!proof||typeof proof!=='object'||Array.isArray(proof)||
    proof.original_work_id!==WORK||proof.shift_id!==SHIFT||
    proof.production_changed!==false)
  fail('PROVIDER_READBACK_ORIGINAL_DRIFT');
 if(!response.ok)
  return deny('NATIVE263_INDEPENDENT_PROVIDER_EVIDENCE_UNAVAILABLE');
 if(action==='verify_release_path'&&
   proof.status==='NATIVE263_EXACT_OWNER_APPROVAL_NOW_READY'&&
   proof.owner_approval_ready===true&&
   proof.approval_recorded===false&&
   proof.installation_authorized===false&&
   proof.original_job_completed===false&&
   proof.actual_original_settlement_recorded===false&&
   proof.independently_verified_release_commit_sha===gitSha)
  return deny('NATIVE263_OWNER_APPROVAL_RELEASE_PROTOCOL_VERIFIED',{
   owner_approval_ready:true,release_commit_sha:gitSha});
 if(action==='verify_postinstall_original'&&
   proof.status==='NATIVE263_ORIGINAL_INDEPENDENT_FINAL_RECEIPT_RECORDED'&&
   proof.original_job_completed===true&&
   proof.installed_commit_sha===gitSha&&
   /^[a-f0-9-]{36}$/.test(proof.original_final_receipt_id||'')&&
   Number.isSafeInteger(proof.independent_main_ci_run_id)&&
   Number.isSafeInteger(proof.independent_original_acceptance_run_id)&&
   proof.independent_main_ci_run_id!==proof.independent_original_acceptance_run_id&&
   /^sha256:[a-f0-9]{64}$/.test(proof.final_receipt_sha256||''))
  return Object.freeze({
   status:'NATIVE263_SAME_ORIGINAL_INDEPENDENT_FINAL_RECEIPT_VERIFIED',
   original_work_id:WORK,shift_id:SHIFT,
   installed_commit_sha:gitSha,
   original_final_receipt_id:proof.original_final_receipt_id,
   independent_main_ci_run_id:proof.independent_main_ci_run_id,
   independent_original_acceptance_run_id:
    proof.independent_original_acceptance_run_id,
   final_receipt_sha256:proof.final_receipt_sha256,
   original_job_completed:true,production_changed:false});
 return deny('NATIVE263_INDEPENDENT_APPROVAL_OR_SETTLEMENT_NOT_YET_VERIFIED');
}
