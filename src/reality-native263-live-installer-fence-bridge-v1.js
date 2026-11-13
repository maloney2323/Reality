// Prove the actual live native installer refuses an unapproved #263
// warrant. This is an integration test performed by the existing signed shift
// worker, not a user approval, source mutation or replacement job.
const WORK='work:873a6e74fd14c6beacc9042dd8021dfc';
const SHIFT='9460cfff-937a-4105-9093-2e41ab39a950';
const fail=x=>{throw Error('NATIVE263_LIVE_INSTALL_DENIAL_'+x)};
export async function checkNative263LiveOwnerApprovalFence({
 db,env=process.env,warrant,fetchImpl=fetch
}={}){
 if(env.VERCEL_ENV!=='preview'||!db?.strictSecrets||
    typeof db.secretKey!=='string'||db.secretKey.length<25||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
    warrant?.status!=='EXACT_NATIVE263_OWNER_WARRANT_STAGED_INSTALL_BLOCKED'||
    warrant.original_work_id!==WORK||
    warrant.shift_id!==SHIFT||
    warrant.owner_approval_ready!==false||
    warrant.installation_authorized!==false||
    warrant.original_job_completed!==false)
  fail('SIGNED_PREAPPROVAL_SCOPE_REQUIRED');
 const url=db.url+'/functions/v1/reality-governed-native263-installer-v1';
 let response;
 try{
  response=await fetchImpl(url,{
   method:'POST',redirect:'error',cache:'no-store',
   signal:AbortSignal.timeout(16000),
   headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
    'content-type':'application/json',accept:'application/json'},
   body:'{"version":1,"action":"execute_exact_approved_native263_install"}'
  });
 }catch{
  return Object.freeze({status:'NATIVE263_INSTALLER_EDGE_UNREACHABLE',
   original_work_id:WORK,installation_authorized:false,
   source_installed:false,original_job_completed:false,
   production_changed:false});
 }
 const body=await response.json().catch(()=>null);
 if(!response.ok||
    body?.status!=='EXACT_NATIVE263_OWNER_INSTALL_APPROVAL_REQUIRED_NO_WRITE'||
    body.original_work_id!==WORK||body.shift_id!==SHIFT||
    body.installation_authorized!==false||
    body.source_installed!==false||
    body.deployment_verified!==false||
    body.original_final_receipt_recorded!==false||
    body.original_job_completed!==false||
    body.production_changed!==false)
  fail('LIVE_SERVICE_DENIAL_OR_OWNER_AUTHORITY_DRIFT');
 return Object.freeze({
  status:'NATIVE263_EXACT_OWNER_APPROVAL_SERVICE_FENCE_LIVE_VERIFIED',
  original_work_id:WORK,shift_id:SHIFT,
  real_edge_service_readback_verified:true,
  exact_owner_approval_required:true,
  source_installed:false,
  automatic_deployment_verified:false,
  original_execution_resumed:false,
  original_final_receipt_recorded:false,
  installation_authorized:false,
  original_job_completed:false,
  production_changed:false
 });
}
