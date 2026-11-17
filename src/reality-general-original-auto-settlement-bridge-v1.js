// Once the owner has approved, the existing signed shift keeps looking for
// exact post-install CI + Vercel evidence and settles the SAME original.
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const SHA=/^[a-f0-9]{40}$/;
const safe=(status,more={})=>Object.freeze({
 status,original_job_completed:false,production_changed:false,...more
});
export async function settleGeneralOwnerApprovedOriginal({
 db,env=process.env,fetchImpl=fetch
}={}){
 if(env.VERCEL_ENV!=='preview'||db?.strictSecrets!==true||
    db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
    typeof db.url!=='string'||!db.url.startsWith('https://')||
    typeof db.secretKey!=='string'||db.secretKey.length<25)
  return safe('GENERAL_POSTINSTALL_SIGNED_PREVIEW_WORKER_REQUIRED');
 let r,j;
 try{
  r=await fetchImpl(db.url+
   '/functions/v1/reality-governed-general-original-postinstall-verifier-v1',{
   method:'POST',cache:'no-store',redirect:'error',
   signal:AbortSignal.timeout(19000),
   headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
    'content-type':'application/json',accept:'application/json'},
   body:'{"version":1,"action":"verify_and_settle_previously_owner_approved_original"}'
  });
  j=await r.json();
 }catch{return safe('GENERAL_POSTINSTALL_PROVIDER_UNAVAILABLE')}
 if(!j||typeof j!=='object'||Array.isArray(j)||
    j.production_changed!==false||
    typeof j.original_job_completed!=='boolean')
  return safe('GENERAL_POSTINSTALL_RECEIPT_AUTHORITY_UNVERIFIED');
 if(!r.ok)return safe('GENERAL_POSTINSTALL_INDEPENDENT_PROVIDER_UNVERIFIED');
 if(j.status==='GENERAL_ORIGINAL_INDEPENDENTLY_SETTLED_WITH_FINAL_RECEIPT'&&
    j.original_job_completed===true&&UUID.test(j.final_receipt_id||'')&&
    /^work:[a-f0-9]{32}$/.test(j.original_work_id||'')&&
    SHA.test(j.installed_commit_sha||'')&&
    j.roi_status==='NOT_MEASURED'&&j.no_third_confirmation===true)
  return safe(j.status,{
   original_job_completed:true,original_work_id:j.original_work_id,
   final_receipt_id:j.final_receipt_id,
   installed_commit_sha:j.installed_commit_sha,
   roi_status:'NOT_MEASURED',no_third_confirmation:true
  });
 if(j.status==='GENERAL_POSTINSTALL_ALREADY_SETTLED'&&
  j.original_job_completed===true&&UUID.test(j.final_receipt_id||''))
  return safe(j.status,{original_job_completed:true,
   original_work_id:j.original_work_id,
   final_receipt_id:j.final_receipt_id});
 if(['GENERAL_POSTINSTALL_NO_INSTALLED_ORIGINAL',
      'GENERAL_POSTINSTALL_OWNER_SHIFT_NOT_CURRENT',
      'GENERAL_POSTINSTALL_WAITING_INDEPENDENT_ORIGINAL_ACCEPTANCE'].includes(j.status))
  return safe(j.status);
 return safe('GENERAL_POSTINSTALL_UNRECOGNIZED_PROVIDER_VERDICT');
}
