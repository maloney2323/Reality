// Reality-native PREINSTALL transport attestation, read-only and service-only.
// Never allow the underlying LLM, an employee or a web client to install code,
// create approval, choose the source, pass a token or settle a customer job.
export const REALITY_NATIVE_263_PREFLIGHT_VERSION=
 'reality-native-existing-file-provider-preflight-v1';
const ORIGINAL='work:873a6e74fd14c6beacc9042dd8021dfc';
const SHIFT='9460cfff-937a-4105-9093-2e41ab39a950';
const ISSUE='https://github.com/maloney2323/Reality/issues/263';
const CANDIDATE_SHA='e44ee294f21c73803a2bcdb5a9cb487f0f80fc85';
const FILE_BLOB_SHA='dda8e71d44cca6745312bcbd000089d5a0b01d54';
const FILE_SHA='sha256:459e2bbe9a9d9c7037c87542a9cdbebf06f77a6d368d72769c79fdbef7947f48';
const BASE_BLOB_SHA='aaf22a1f69a2c3e91e18641cf1ef40d16a563bc0';
const PREVIEW='reality/isolated-openai-governance-gateway-20261108';
const fail=x=>{throw Error('REALITY_NATIVE263_PREFLIGHT_'+x)};
const blocked=x=>Object.freeze({status:x,original_work_id:ORIGINAL,
 installation_authorized:false,original_job_completed:false,
 production_changed:false,owner_approval_ready:false,
 provider_code_write_verified:false,provider_deploy_verified:false});
export async function inspectNative263ExistingFileInstallTransport({
 db,graph,env=process.env,fetchImpl=fetch
}={}){
 if(env.VERCEL_ENV!=='preview'||!db?.strictSecrets||
    typeof db.secretKey!=='string'||db.secretKey.length<25||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
    graph?.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||
    graph.shift_id!==SHIFT||graph.installation_authorized!==false||
    graph.production_changed!==false||!Array.isArray(graph.jobs)||
    !graph.jobs.some(j=>j.original_work_id===ORIGINAL&&
     j.source_ref===ISSUE&&
     j.phase==='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL'&&
     j.independent_source_proof_verified===true))
  fail('SAME_OWNER_PREVIEW_SCOPE_NOT_VERIFIED');
 let response;
 try{
  response=await fetchImpl(db.url+
   '/functions/v1/reality-governed-pr-review-publisher-v1',{
    method:'POST',redirect:'error',cache:'no-store',
    signal:AbortSignal.timeout(14000),
    headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
     accept:'application/json','content-type':'application/json'},
    body:'{"version":2,"action":"native_263_install_preflight"}'
   });
 }catch{return blocked('NATIVE263_PREINSTALL_BROKER_UNREACHABLE')}
 let data;try{data=await response.json()}catch{
  return blocked('NATIVE263_PREINSTALL_BROKER_RESPONSE_INVALID');
 }
 if(!data||typeof data!=='object'||Array.isArray(data)||
    data.original_job_completed!==false||
    data.installation_authorized!==false||
    data.production_changed!==false||
    data.new_shift_created!==false||data.code_installed!==false)
  fail('BROKER_INDEPENDENT_EFFECT_AND_AUTHORITY_SCOPE_CHANGED');
 if(!response.ok||data.status!==
   'NATIVE_263_EXISTING_SOURCE_TRANSPORT_PREFLIGHT_VERIFIED')
  return blocked(/^[A-Z0-9_]{10,120}$/.test(data.status||'')?
   data.status:'NATIVE263_PREINSTALL_PROVIDER_OR_SOURCE_BLOCKED');
 if(data.source!=='INDEPENDENT_REALITY_PROVIDER_AND_FROZEN_OWNER_LEDGER'||
    data.original_work_id!==ORIGINAL||data.shift_id!==SHIFT||
    data.source_ref!==ISSUE||data.preview_branch!==PREVIEW||
    !/^[a-f0-9]{40}$/.test(data.preview_baseline_commit_sha||'')||
    data.preview_existing_file_blob_sha!==BASE_BLOB_SHA||
    data.candidate_commit_sha!==CANDIDATE_SHA||
    data.candidate_file_blob_sha!==FILE_BLOB_SHA||
    data.candidate_artifact_sha256!==FILE_SHA||
    data.independent_ci_run_id!==42525028367||
    data.exact_existing_file_update_required!==true||
    data.source_and_frozen_tests_verified!==true||
    data.code_write_permission_verified!==false||
    data.native_approval_bridge_verified!==false||
    data.preview_deployment_automation_verified!==false||
    data.post_install_same_original_settlement_verified!==false||
    data.owner_approval_ready!==false)
  fail('EXACT_NATIVE_INSTALL_PROOF_FIELDS_MISMATCH');
 return Object.freeze({
  version:REALITY_NATIVE_263_PREFLIGHT_VERSION,
  status:data.status,shift_id:SHIFT,original_work_id:ORIGINAL,
  source_ref:ISSUE,candidate_commit_sha:CANDIDATE_SHA,
  candidate_artifact_sha256:FILE_SHA,
  existing_file_baseline_verified:true,
  frozen_candidate_verified:true,
  github_readonly_delivery_preflight_verified:true,
  exact_existing_file_update_required:true,
  preview_deployment_automation_verified:false,
  native_approval_bridge_verified:false,
  provider_code_write_verified:false,
  provider_deploy_verified:false,
  post_install_same_original_settlement_verified:false,
  installation_authorized:false,
  owner_approval_ready:false,
  original_job_completed:false,production_changed:false
 });
}
