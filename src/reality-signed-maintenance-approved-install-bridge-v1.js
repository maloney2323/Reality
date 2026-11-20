// The SAME signed employee shift invokes Reality's ALREADY privileged
// installer. A signed worker cannot create owner approval or select a patch.
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const SHA=/^[a-f0-9]{40}$/;
const safe=(status,more={})=>Object.freeze({status,...more,
 source_installed:false,original_job_completed:false,
 production_changed:false,new_shift_started:false});
export async function continueExactOwnerApprovedMaintenanceInstall({
 db,env=process.env,fetchImpl=fetch
}={}){
 if(env.VERCEL_ENV!=='preview'||db?.strictSecrets!==true||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  typeof db.url!=='string'||db.url!=='https://'+db.project+'.supabase.co'||
  typeof db.secretKey!=='string'||db.secretKey.length<25)
  return safe('SIGNED_MAINTENANCE_INSTALL_SIGNED_PREVIEW_REQUIRED');
 let response,receipt;
 try{
  response=await fetchImpl(db.url+
   '/functions/v1/reality-governed-general-original-installer-v1',{
   method:'POST',cache:'no-store',redirect:'error',
   signal:AbortSignal.timeout(22000),
   headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
    'content-type':'application/json'},
   body:'{"version":1,"action":"execute_previously_owner_approved_maintenance_install"}'
  });
  receipt=await response.json();
 }catch{return safe('SIGNED_MAINTENANCE_INSTALL_PROVIDER_UNAVAILABLE')}
 if(!response?.ok)return safe('SIGNED_MAINTENANCE_INSTALL_PROVIDER_OUTCOME_UNVERIFIED');
 if(!receipt||typeof receipt!=='object'||Array.isArray(receipt)||
  receipt.original_job_completed!==false||
  receipt.production_changed!==false||
  receipt.new_shift_started!==false||
  receipt.source_installed!==true&&receipt.source_installed!==false)
  return safe('SIGNED_MAINTENANCE_INSTALL_RECEIPT_INVALID');
 if(receipt.status==='EXACT_OWNER_APPROVED_MAINTENANCE_SOURCE_INSTALLED_NEEDS_INDEPENDENT_ACCEPTANCE'&&
  receipt.source_installed===true&&UUID.test(receipt.maintenance_id||'')&&
  UUID.test(receipt.shift_id||'')&&SHA.test(receipt.installed_commit_sha||'')&&
  receipt.installation_authorized===true)
  return Object.freeze({...receipt,original_job_completed:false,
   production_changed:false,new_shift_started:false});
 if(['NO_EXACT_OWNER_APPROVED_MAINTENANCE_INSTALL',
  'SIGNED_MAINTENANCE_INSTALLED_AWAITING_INDEPENDENT_JOB_VERIFICATION',
  'SIGNED_MAINTENANCE_FENCED_PROVIDER_EFFECT_UNCERTAIN_NO_RETRY',
  'SIGNED_MAINTENANCE_APPROVED_TARGET_HEAD_DRIFT_REVIEW_REQUIRED',
  'SIGNED_MAINTENANCE_APPROVED_EXACT_BLOB_DRIFT',
  'SIGNED_MAINTENANCE_OWNER_FENCE_UNVERIFIED_NO_WRITE',
  'SIGNED_MAINTENANCE_FENCED_TARGET_MOVED_NO_WRITE',
  'SIGNED_MAINTENANCE_FENCED_PARENT_UNVERIFIED_NO_WRITE',
  'SIGNED_MAINTENANCE_FENCED_PROVIDER_EFFECT_UNCERTAIN_GET_ONLY',
  'SIGNED_MAINTENANCE_FENCED_REF_UNVERIFIED_NO_RETRY',
  'SIGNED_MAINTENANCE_FENCED_POSTWRITE_BRANCH_DRIFT_NO_RETRY'].includes(receipt.status))
  return safe(receipt.status,{
   maintenance_id:UUID.test(receipt.maintenance_id||'')?receipt.maintenance_id:null,
   installation_authorized:receipt.installation_authorized===true
  });
 return safe('SIGNED_MAINTENANCE_INSTALL_UNRECOGNIZED_GOVERNED_RECEIPT');
}
