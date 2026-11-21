// Existing authenticated shift's one exact owner-approved recovery publication.
// This never grants permission or retries an unknown source write.
// Supabase performs its own current-owner claim and one-use GitHub fence.
const SHA=/^[a-f0-9]{40}$/;
const WORK=/^work:[a-f0-9]{32}$/;
const safe=(status,more={})=>Object.freeze({
 status,source_installed:false,original_job_completed:false,
 production_changed:false,...more
});
export async function continueGeneralOriginalOwnerApprovedRecovery({
 db,env=process.env,fetchImpl=fetch
}={}){
 if(env.VERCEL_ENV!=='preview'||db?.strictSecrets!==true||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  typeof db.url!=='string'||!db.url.startsWith('https://')||
  typeof db.secretKey!=='string'||db.secretKey.length<25)
  return safe('RECOVERY_SIGNED_ISOLATED_SHIFT_REQUIRED');
 let res,value;
 try{
  res=await fetchImpl(db.url+
    '/functions/v1/reality-governed-general-original-recovery-installer-v1',{
   method:'POST',cache:'no-store',redirect:'error',
   signal:AbortSignal.timeout(21000),
   headers:{apikey:db.secretKey,authorization:'Bearer '+db.secretKey,
    'content-type':'application/json',accept:'application/json'},
   body:'{"version":1,"action":"continue_one_exact_owner_approved_fenced_recovery"}'
  });
  value=await res.json().catch(()=>null);
 }catch{return safe('RECOVERY_PRIVILEGED_PROVIDER_UNVERIFIED_NO_REPLAY')}
 if(!value||typeof value!=='object'||Array.isArray(value)||
   typeof value.status!=='string'||
   value.production_changed!==false||
   value.original_job_completed!==false||
   typeof value.source_installed!=='boolean')
  return safe('RECOVERY_PROVIDER_WARRANT_DRIFT');
 if(!res.ok)return safe('RECOVERY_PROVIDER_REFUSED_OR_UNVERIFIED');
 if(value.status==='RECOVERY_ORIGINAL_SOURCE_INSTALLED_IN_SAME_JOB'&&
    value.source_installed===true&&WORK.test(value.original_work_id||'')&&
    SHA.test(value.installed_commit_sha||''))
  return safe(value.status,{source_installed:true,
   original_work_id:value.original_work_id,
   installed_commit_sha:value.installed_commit_sha,
   next_gate:'INDEPENDENT_SAME_ORIGINAL_POSTINSTALL_ACCEPTANCE_AND_SETTLEMENT'});
 if([
  'RECOVERY_EXACT_OWNER_APPROVAL_PENDING',
  'RECOVERY_CURRENT_OWNER_APPROVAL_PENDING',
  'RECOVERY_SOURCE_ALREADY_INSTALLED_POSTINSTALL_CONTINUATION',
  'RECOVERY_PUBLICATION_ALREADY_CLAIMED_NO_SECOND_WRITE',
  'RECOVERY_WRITE_FENCED_ORIGINAL_HEAD_UNCHANGED_NO_RETRY',
  'RECOVERY_WRITE_FENCED_PROVIDER_EFFECT_UNCERTAIN_NO_RETRY',
  'RECOVERY_PROVIDER_OUTCOME_UNVERIFIED_NO_REPLAY',
  'RECOVERY_PROVIDER_COMMIT_RESPONSE_UNVERIFIED_NO_REPLAY',
  'RECOVERY_POSTWRITE_BRANCH_MOVED_GET_ONLY',
  'RECOVERY_WRITE_FENCED_PARENT_MOVED_NO_WRITE',
  'RECOVERY_SOURCE_BASELINE_CHANGED_NO_WRITE',
  'RECOVERY_FROZEN_ARTIFACT_OR_PREIMAGE_DRIFT_NO_WRITE',
  'RECOVERY_GITHUB_CREDENTIAL_MISSING'
 ].includes(value.status))
  return safe(value.status,{
   original_work_id:WORK.test(value.original_work_id||'')?
    value.original_work_id:null});
 return safe('RECOVERY_PROVIDER_UNRECOGNIZED_OUTCOME_NO_MUTATION_CLAIM');
}
