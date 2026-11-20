// The SAME signed shift invokes the pre-existing independent original
// postinstall verifier for internal maintenance only. No new worker or
// authorization. A source installation is NEVER a business-job receipt.
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^sha256:[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const safe=(status,more={})=>Object.freeze({status,...more,
 repair_verified:false,original_job_completed:false,
 production_changed:false,new_shift_started:false});
export async function independentlyReconcileSignedMaintenanceInstall({
 db,env=process.env,fetchImpl=fetch
}={}){
 if(env.VERCEL_ENV!=='preview'||db?.strictSecrets!==true||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  db.url!=='https://'+db.project+'.supabase.co'||
  typeof db.secretKey!=='string'||db.secretKey.length<25)
  return safe('SIGNED_MAINTENANCE_INDEPENDENT_POSTINSTALL_PREVIEW_SCOPE_REQUIRED');
 let response,d;
 try{
  response=await fetchImpl(db.url+
   '/functions/v1/reality-governed-general-original-postinstall-verifier-v1',{
   method:'POST',cache:'no-store',redirect:'error',
   signal:AbortSignal.timeout(28000),
   headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
    'content-type':'application/json'},
   body:'{"version":1,"action":"verify_and_reconcile_owner_approved_maintenance_install"}'
  });
  d=await response.json();
 }catch{return safe('SIGNED_MAINTENANCE_POSTINSTALL_PROVIDER_UNAVAILABLE')}
 if(!response?.ok)return safe('SIGNED_MAINTENANCE_POSTINSTALL_PROVIDER_UNVERIFIED');
 if(!d||typeof d!=='object'||Array.isArray(d)||
  d.original_job_completed!==false||d.production_changed!==false||
  d.new_shift_started!==false)
  return safe('SIGNED_MAINTENANCE_POSTINSTALL_AUTHORITY_DRIFT');
 if(d.status==='SAME_SIGNED_SHIFT_INTERNAL_MAINTENANCE_INDEPENDENTLY_VERIFIED'&&
  UUID.test(d.maintenance_id||'')&&UUID.test(d.shift_id||'')&&
  SHA.test(d.installed_commit_sha||'')&&
  HASH.test(d.independent_postinstall_receipt_sha256||'')&&
  d.repair_verified===true)
  return Object.freeze({...d,original_job_completed:false,
   production_changed:false,new_shift_started:false});
 if(['NO_OWNER_APPROVED_MAINTENANCE_POSTINSTALL_ACCEPTANCE_DUE',
  'SIGNED_MAINTENANCE_POSTINSTALL_WAITING_FOR_INDEPENDENT_CI_AND_PREVIEW',
  'SIGNED_MAINTENANCE_POSTINSTALL_INSTALLED_COMMIT_OR_SOURCE_DRIFT',
  'SIGNED_MAINTENANCE_POSTINSTALL_CI_STEPS_UNVERIFIED'].includes(d.status))
  return safe(d.status);
 return safe('SIGNED_MAINTENANCE_POSTINSTALL_UNRECOGNIZED_PROVIDER_VERDICT');
}
