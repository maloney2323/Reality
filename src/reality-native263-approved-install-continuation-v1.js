// Existing signed worker consumes a PREVIOUSLY recorded exact owner approval.
// Neither an LLM nor this worker can create the owner's approval receipt.
// A single database-fenced Edge installer handles the exact native file PUT.
// No third confirmation or manual resume is accepted.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
const WORK='work:873a6e74fd14c6beacc9042dd8021dfc';
const OWNER='85eeae0b-2988-43c4-b20c-590fb51da70d';
const SHIFT='9460cfff-937a-4105-9093-2e41ab39a950';
const HASH='sha256:459e2bbe9a9d9c7037c87542a9cdbebf06f77a6d368d72769c79fdbef7947f48';
function fail(s){throw Error('NATIVE263_AUTO_INSTALL_'+s)}
const safe=(status,more={})=>Object.freeze({
 status,original_work_id:WORK,shift_id:SHIFT,
 production_changed:false,original_job_completed:false,...more});
export async function continueOnceApprovedNative263Install({
 db,env=process.env,fetchImpl=fetch
}={}){
 if(env.VERCEL_ENV!=='preview'||!db?.strictSecrets||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
    typeof db.secretKey!=='string'||db.secretKey.length<25)
  fail('EXACT_ISOLATED_SIGNED_WORKER_SERVICE_REQUIRED');
 const c=await shiftRpc(db,'reality_read_native263_exact_install_warrant_v1',{},
  {fetchImpl});
 if(c.status!=='EXACT_NATIVE263_WARRANT_READBACK')
  return safe('NO_STAGED_NATIVE263_INSTALL_WARRANT');
 if(c.original_work_id!==WORK||c.owner_id!==OWNER||
    c.shift_id!==SHIFT||c.candidate_artifact_sha256!==HASH||
    c.production_changed!==false||
    typeof c.exact_approval_receipt_recorded!=='boolean'||
    typeof c.source_installed!=='boolean'||
    typeof c.original_final_receipt_recorded!=='boolean')
  fail('EXACT_OWNER_RECEIPT_MISMATCH');
 if(c.state==='STAGED_UNAPPROVED'){
  if(c.exact_approval_receipt_recorded!==false||
     c.source_installed!==false)
   fail('UNAPPROVED_WARRANT_AUTHORITY_DRIFT');
  return safe('EXACT_OWNER_APPROVAL_NOT_YET_GRANTED_NO_INSTALL',
   {installation_authorized:false,source_installed:false});
 }
 if(c.state==='OWNER_APPROVED'){
  if(c.exact_approval_receipt_recorded!==true||c.source_installed!==false)
   fail('DURABLE_EXACT_OWNER_APPROVAL_REQUIRED');
  // The installer performs its own independent DATABASE lease, exact owner
  // receipt check and provider SHA verification before its sole file write.
  let r;
  try{
   r=await fetchImpl(db.url+
    '/functions/v1/reality-governed-native263-installer-v1',{
    method:'POST',redirect:'error',cache:'no-store',
    signal:AbortSignal.timeout(19000),
    headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
      accept:'application/json','content-type':'application/json'},
    body:'{"version":1,"action":"execute_exact_approved_native263_install"}'
   });
  }catch{return safe('EXACT_OWNER_APPROVED_INSTALL_PROVIDER_RESULT_UNCERTAIN_READBACK_ONLY',
    {installation_authorized:true,source_installed:false})}
  const result=await r.json().catch(()=>null);
  if(result?.original_work_id!==WORK||result.shift_id!==SHIFT||
     result.production_changed!==false||
     result.original_job_completed!==false)
   fail('INSTALLER_RESPONSE_SCOPE_OR_ORIGINAL_MISMATCH');
  if(result.status==='NATIVE263_SOURCE_INSTALLED_DEPLOYMENT_NOT_YET_VERIFIED'&&
     r.ok&&result.installation_authorized===true&&
     result.source_installed===true&&
     /^[a-f0-9]{40}$/.test(result.installed_commit_sha||''))
   return safe('EXACT_NATIVE263_SOURCE_INSTALLED_AWAITING_DEPLOYMENT_READBACK',
    {installation_authorized:true,source_installed:true,
     installed_commit_sha:result.installed_commit_sha});
  return safe('EXACT_NATIVE263_INSTALL_EFFECT_REQUIRES_INDEPENDENT_RECONCILIATION',
    {installation_authorized:true,source_installed:false});
 }
 if(['INSTALL_INTENT_FENCED','SOURCE_INSTALLED',
    'DEPLOYMENT_VERIFIED','ORIGINAL_EXECUTING','ORIGINAL_SETTLED',
    'EFFECT_UNCERTAIN'].includes(c.state)){
  if(c.exact_approval_receipt_recorded!==true)
   fail('AUTHORIZED_EFFECT_WITHOUT_OWNER_RECEIPT');
  // Never call the GitHub file writer again after ANY prior intent.
  return safe('EXACT_NATIVE263_INSTALL_STATE_READBACK_ONLY_'+c.state,
   {installation_authorized:true,source_installed:c.source_installed,
    original_final_receipt_recorded:c.original_final_receipt_recorded});
 }
 fail('UNKNOWN_NATIVE263_INSTALL_RELEASE_STATE');
}
