// Existing owner-authorized signed worker triggers ONLY an inert,
 // single-use source-write permission probe. The Edge broker independently
 // verifies the scoped original, fences the provider write, rechecks bytes,
 // and records the receipt. No Chat or model parameters are forwarded.
const SHA=/^[a-f0-9]{40}$/;
const safe=(status,extra={})=>Object.freeze({
 status,isolated_github_write_verified:false,
 preview_auto_deploy_verified:false,installation_authorized:false,
 source_installed:false,original_job_completed:false,
 production_changed:false,...extra
});
export async function verifyGeneralizedOriginalSourceWriteTransport({
 db,env=process.env,fetchImpl=fetch
}={}){
 if(env.VERCEL_ENV!=='preview'||db?.strictSecrets!==true||
   db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
   typeof db.secretKey!=='string'||db.secretKey.length<25||
   typeof db.url!=='string'||!db.url.startsWith('https://')||
   typeof fetchImpl!=='function')
  return safe('GENERALIZED_CANARY_SIGNED_ISOLATED_SERVICE_REQUIRED');
 let r,data;
 try{
  r=await fetchImpl(db.url+
   '/functions/v1/reality-governed-original-source-write-canary-v1',{
    method:'POST',cache:'no-store',redirect:'error',
    signal:AbortSignal.timeout(18000),
    headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
     accept:'application/json','content-type':'application/json'},
    body:'{"version":1,"action":"verify_exact_isolated_source_write_transport"}'
   });
  data=await r.json();
 }catch{return safe('GENERALIZED_CANARY_EDGE_PROVIDER_UNVERIFIED')}
 if(!data||typeof data!=='object'||Array.isArray(data)||
   data.installation_authorized!==false||
   data.source_installed!==false||
   data.original_job_completed!==false||
   data.production_changed!==false||
   data.automatic_preview_deploy_verified!==false)
  return safe('GENERALIZED_CANARY_RESPONSE_AUTHORITY_DRIFT');
 if(!r.ok)return safe('GENERALIZED_CANARY_EDGE_SERVICE_REJECTED');
 if(data.status==='GENERALIZED_SOURCE_WRITE_TRANSPORT_INDEPENDENTLY_VERIFIED'&&
    data.github_write_verified===true&&
    typeof data.original_work_id==='string'&&
    /^work:[a-f0-9]{32}$/.test(data.original_work_id)&&
    SHA.test(data.github_commit_sha||'')&&
    data.provider_http_status===201)
  return safe(data.status,{
   original_work_id:data.original_work_id,
   github_commit_sha:data.github_commit_sha,
   isolated_github_write_verified:true,
   inert_probe_path:data.inert_probe_path
  });
 if(['NO_CURRENT_OWNER_AUTHORIZED_CANARY_SCOPE',
     'NO_CURRENT_UNVERIFIED_SOURCE_CANARY',
     'GENERALIZED_CANARY_ALREADY_FENCED_NO_REPEAT',
     'GENERALIZED_CANARY_PROBE_ALREADY_PRESENT_NO_WRITE',
     'GENERALIZED_CANARY_CURRENT_SOURCE_DRIFT_NO_EFFECT',
     'ISOLATED_GITHUB_WRITER_CREDENTIAL_UNVERIFIED'].includes(data.status))
  return safe(data.status);
 return safe('GENERALIZED_CANARY_PROVIDER_PROOF_NOT_ACCEPTED');
}
