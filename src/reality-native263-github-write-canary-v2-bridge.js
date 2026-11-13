// Fresh v2 one-shot permission canary; NEVER replay v1's blocked POST.
// Reality's existing signed shift may test its provider's Contents WRITE
// permission once on an inert isolated canary file. This NEVER installs #263,
// creates a job, consumes owner approval, or sends GitHub credentials to a model.
const SHIFT='9460cfff-937a-4105-9093-2e41ab39a950';
const ORIGINAL='work:873a6e74fd14c6beacc9042dd8021dfc';
const ISSUE='https://github.com/maloney2323/Reality/issues/263';
const fail=x=>{throw Error('NATIVE263_WRITE_CANARY_'+x)};
const safe=(status,extras={})=>Object.freeze({
 status,shift_id:SHIFT,original_work_id:ORIGINAL,
 code_write_permission_verification_only:true,
 canary_write_verified:false,installation_authorized:false,
 owner_approval_ready:false,original_job_completed:false,
 source_code_installed:false,production_changed:false,...extras
});
export async function probeRealityNative263GithubWriteTransportV2({
 db,env=process.env,graph,nativePreflight,fetchImpl=fetch
}={}){
 if(env.VERCEL_ENV!=='preview'||!db?.strictSecrets||
    typeof db.secretKey!=='string'||db.secretKey.length<25||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
    graph?.status!=='UNIFIED_OWNER_JOB_CONTROL_READY'||
    graph.shift_id!==SHIFT||graph.installation_authorized!==false||
    graph.production_changed!==false||!Array.isArray(graph.jobs)||
    graph.jobs.filter(j=>j.original_work_id===ORIGINAL&&j.source_ref===ISSUE&&
     j.original_kind==='REAL_ENGINEERING_REPAIR_ORIGINAL'&&
     j.phase==='CANDIDATE_VERIFIED_AWAITING_EXACT_APPROVAL'&&
     j.independent_source_proof_verified===true).length!==1||
    nativePreflight?.status!=='NATIVE_263_EXISTING_SOURCE_TRANSPORT_PREFLIGHT_VERIFIED'||
    nativePreflight.original_work_id!==ORIGINAL||
    nativePreflight.existing_file_baseline_verified!==true||
    nativePreflight.frozen_candidate_verified!==true||
    nativePreflight.installation_authorized!==false||
    nativePreflight.owner_approval_ready!==false)
  fail('OWNER_OR_NATIVE_PREFLIGHT_SCOPE_CHANGED');
 let response;
 try{
  response=await fetchImpl(db.url+
   '/functions/v1/reality-governed-pr-review-publisher-v1',{
   method:'POST',cache:'no-store',redirect:'error',
   signal:AbortSignal.timeout(17500),
   headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
    'content-type':'application/json',accept:'application/json'},
   body:'{"version":4,"action":"native_263_contents_canary_v2"}'
  });
 }catch{return safe('REALITY_GITHUB_WRITE_CANARY_BROKER_UNREACHABLE')}
 let data;try{data=await response.json()}catch{
  return safe('REALITY_GITHUB_WRITE_CANARY_RESPONSE_UNVERIFIED');
 }
 if(!data||typeof data!=='object'||Array.isArray(data)||
    data.installation_authorized!==false||data.original_job_completed!==false||
    data.production_changed!==false||data.code_installed!==false||
    data.new_shift_created!==false)
  fail('BROKER_FALSE_INSTALL_OR_SETTLEMENT_CLAIM');
 if(!response.ok)return safe('REALITY_GITHUB_WRITE_CANARY_BROKER_SCOPE_BLOCKED');
 if(![
  'NATIVE263_CONTENTS_WRITE_TRANSPORT_VERIFIED',
  'NATIVE263_GITHUB_CONTENTS_WRITE_HTTP_403',
  'NATIVE263_GITHUB_CONTENTS_WRITE_HTTP_401',
  'NATIVE263_CONTENTS_CANARY_ALREADY_FENCED_NO_REPLAY',
  'NATIVE263_CONTENTS_WRITE_PROBE_BLOCKED_NO_REPLAY'
 ].includes(data.status))
  return safe('REALITY_GITHUB_WRITE_CANARY_UNEXPECTED_PROVIDER_STATUS');
 if(data.original_work_id!==ORIGINAL||data.shift_id!==SHIFT||
    data.source_code_installed!==false||
    data.code_write_permission_verification_only!==true)
  fail('BROKER_CANARY_ORIGINAL_OR_PROOF_SCOPE_MISMATCH');
 const verified=data.status==='NATIVE263_CONTENTS_WRITE_TRANSPORT_VERIFIED';
 if(verified&&(
    data.canary_state!=='VERIFIED'||data.canary_write_verified!==true||
    data.provider_http_status!==201||
    !/^[a-f0-9]{40}$/.test(data.provider_commit_sha||'')))
  fail('GITHUB_CANARY_INDEPENDENT_PROVIDER_READBACK_NOT_PROVEN');
 if(!verified&&data.canary_write_verified===true)
  fail('GITHUB_CANARY_FALSE_WRITE_VERIFIED');
 return safe(data.status,{
  canary_write_verified:verified,
  provider_http_status:Number.isInteger(data.provider_http_status)?
   data.provider_http_status:null,
  canary_commit_sha:verified?data.provider_commit_sha:null,
  // A canary write is never an authorization to update existing sources.
  github_contents_credential_capable_for_inert_canary:verified,
  native_existing_file_installation_verified:false,
  postinstall_same_original_settlement_verified:false
 });
}
