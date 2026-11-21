// Existing SIGNED worker -> live provider source -> SAME owner Continuity.
// Reuses Reality's installed authenticated GitHub source reader. This does
// not mint an original, execute a business job, or connect customer accounts.
import {shiftRpc} from './reality-governed-shift-boundary-v1.js';
import {readFreshEmployeeInquirySource}
 from './reality-dynamic-employee-inquiry-worker-v1.js';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const REF=/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/(issues|pull)\/[1-9][0-9]*$/;
const ROUTE=/^reality:qualification:[a-f0-9]{64}$/;
const SHA=/^sha256:[a-f0-9]{64}$/;
const REPO=/^[A-Za-z0-9_.-]{1,80}\/[A-Za-z0-9_.-]{1,100}$/;
const safe=(status,other={})=>Object.freeze({status,
 internal_company_provider_source_verified:false,
 customer_source_connection_verified:false,
 original_job_admitted:false,model_execution_authorized:false,
 owner_approval_granted:false,new_shift_started:false,
 installation_authorized:false,production_changed:false,...other});

export async function probeOneSignedInternalBusinessProviderSource({
 db,workerRunId,env=process.env,fetchImpl=fetch,call=shiftRpc,
 readSource=readFreshEmployeeInquirySource
}={}){
 if(env.VERCEL_ENV!=='preview'||!UUID.test(workerRunId||'')||
  !db?.strictSecrets||!db?.secretKey||
  db.project!==env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF||
  typeof call!=='function'||typeof readSource!=='function'||
  typeof fetchImpl!=='function')
  throw Error('SIGNED_INTERNAL_SOURCE_OWNER_AND_WORKER_REQUIRED');
 const owner=String(env.VERCEL_GIT_REPO_OWNER||'').trim();
 const slug=String(env.VERCEL_GIT_REPO_SLUG||'').trim();
 const repo=owner+'/'+slug;
 if(!REPO.test(repo))return safe('SIGNED_INTERNAL_SOURCE_REPOSITORY_CONFIG_MISSING');
 const token=String(env.REALITY_GITHUB_TOKEN||'').trim();
 // Public anonymous GitHub reads are not proof the Reality credential is
 // installed. Don't call a public URL and mislabel it a connected account.
 if(token.length<20)return safe('SIGNED_INTERNAL_SOURCE_PROVIDER_CREDENTIAL_MISSING');

 const scope=await call(db,'reality_read_next_signed_internal_repo_business_source_v1',{
  p_worker_run_id:workerRunId,p_repo_full_name:repo
 },{fetchImpl,timeoutMs:12000});
 if(scope?.status==='NO_DUE_SIGNED_INTERNAL_PROVIDER_BUSINESS_SOURCE'&&
  scope.model_execution_authorized===false&&
  scope.new_shift_started===false&&scope.installation_authorized===false)
  return safe(scope.status);
 if(scope?.status!=='SIGNED_OWNER_INTERNAL_PROVIDER_SOURCE_SELECTED'||
  scope.worker_run_id!==workerRunId||
  !UUID.test(scope.owner_id||'')||
  !REF.test(scope.source_ref||'')||
  !scope.source_ref.startsWith('https://github.com/'+repo+'/')||
  !ROUTE.test(scope.continuity_ref||'')||
  scope.intake_family!=='EMPLOYEE_SCHEDULE'||
  scope.provider_recheck_required!==true||
  scope.customer_connection_verified!==false||
  scope.original_job_admitted!==false||
  scope.model_execution_authorized!==false||
  scope.owner_approval_granted!==false||
  scope.new_shift_started!==false||
  scope.installation_authorized!==false||
  scope.production_changed!==false)
  throw Error('SIGNED_INTERNAL_SOURCE_SCOPE_UNVERIFIED');

 // Two ACTUAL provider GETs, not two cached DB reads or generated text.
 // This proves CURRENT source stability, not a separately verified customer job.
 let first,second;
 try{
  first=await readSource(scope.source_ref,{token,fetchImpl});
  second=await readSource(scope.source_ref,{token,fetchImpl});
 }catch{
  return safe('SIGNED_INTERNAL_SOURCE_PROVIDER_REOBSERVATION_FAILED',{
   source_ref:scope.source_ref});
 }
 if(first?.source_ref!==scope.source_ref||
  second?.source_ref!==scope.source_ref||
  first.current_state!=='open'||second.current_state!=='open'||
  !SHA.test(first.provider_proof_sha256||'')||
  first.provider_proof_sha256!==second.provider_proof_sha256||
  first.source_title!==second.source_title||
  first.provider_updated_at!==second.provider_updated_at||
  !Number.isFinite(Date.parse(first.checked_at||''))||
  !Number.isFinite(Date.parse(second.checked_at||''))||
  !Number.isFinite(Date.parse(first.provider_updated_at||'')))
  return safe('SIGNED_INTERNAL_SOURCE_PROVIDER_EPOCH_UNSTABLE',{
   source_ref:scope.source_ref});
 const receipt=await call(db,'reality_record_signed_internal_repo_provider_proof_v1',{
  p_worker_run_id:workerRunId,p_owner_id:scope.owner_id,
  p_intake_key:scope.intake_key,p_continuity_ref:scope.continuity_ref,
  p_source_ref:scope.source_ref,p_source_title:first.source_title,
  p_source_updated_at:first.provider_updated_at,
  p_first_sha256:first.provider_proof_sha256,
  p_second_sha256:second.provider_proof_sha256
 },{fetchImpl,timeoutMs:11000});
 if(receipt?.status!=='SIGNED_INTERNAL_BUSINESS_SOURCE_DOUBLE_PROVIDER_READBACK_RECORDED'||
  receipt.owner_id!==scope.owner_id||
  receipt.source_ref!==scope.source_ref||
  receipt.continuity_ref!==scope.continuity_ref||
  receipt.provider_proof_sha256!==first.provider_proof_sha256||
  receipt.internal_source_provider_readback_verified!==true||
  receipt.customer_connection_verified!==false||
  receipt.original_job_admitted!==false||
  receipt.model_execution_authorized!==false||
  receipt.owner_approval_granted!==false||
  receipt.new_shift_started!==false||
  receipt.installation_authorized!==false||
  receipt.production_changed!==false)
  throw Error('SIGNED_INTERNAL_SOURCE_OWNER_RECEIPT_UNVERIFIED');
 return safe(receipt.status,{
  internal_company_provider_source_verified:true,
  source_ref:scope.source_ref,
  provider_proof_sha256:receipt.provider_proof_sha256,
  continuity_ref:scope.continuity_ref,
  signed_worker_run_id:workerRunId
 });
}
