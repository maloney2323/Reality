// Runs ONLY on a pinned GitHub Actions execution branch, independently of
// an open browser. The request file is inert: it cannot authorize installation.
// The private Supabase lease and an existing signed owner approval are required.
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {privateChatConfig} from '../src/reality-private-chat-auth-v0.1.js';
import {createLiveGeneralRepairService}
 from '../src/reality-live-approved-install-to-settlement-v1.0.js';
import {dispatchApprovedBackgroundRepair}
 from '../src/reality-approved-repair-github-wakeup-v1.0.js';
const WORKER='feature/reality-background-continuation-20261031';
const PROJECT='hvkfreoagbrphwghjajw';
const err=x=>{throw Error('REALITY_APPROVED_BACKGROUND_'+x)};
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const SHA=/^[a-f0-9]{40}$/;
const HASH=/^[a-f0-9]{64}$/;
const BRANCH=/^feature\/reality-[a-z0-9][a-z0-9/-]{5,105}$/;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
export function verifyApprovedWorkerEnvironment(env,request,checkoutSha){
 if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_EVENT_NAME!=='push'||
    env.GITHUB_REPOSITORY!=='maloney2323/Reality'||
    env.GITHUB_REF!=='refs/heads/'+WORKER||
    env.GITHUB_SHA!==checkoutSha||!SHA.test(checkoutSha)||
    env.REALITY_BACKGROUND_REPAIR_WORKER_ENABLED!=='true'||
    env.VERCEL_ENV!=='preview'||
    env.REALITY_UNIVERSE_PERSISTENCE_ENABLED!=='true'||
    env.REALITY_PERSONAL_CHAT_EXPECTED_PROJECT_REF!==PROJECT||
    env.REALITY_RELIABILITY_BENCHMARK_PROJECT_REF!==PROJECT||
    env.REALITY_RELIABILITY_ALLOWED_BENCHMARK_REF!==PROJECT||
    env.REALITY_PERSONAL_CHAT_SUPABASE_URL!=='https://'+PROJECT+'.supabase.co'||
    env.REALITY_RELIABILITY_BENCHMARK_SUPABASE_URL!==
     'https://'+PROJECT+'.supabase.co'||
    !env.SUPABASE_SERVICE_ROLE_KEY||env.SUPABASE_SERVICE_ROLE_KEY.length<30||
    !env.REALITY_BUILDER_DISPATCH_GITHUB_TOKEN||
    env.REALITY_BUILDER_DISPATCH_GITHUB_TOKEN.length<25)
  err('EXACT_ISOLATED_ACTIONS_IDENTITY_AND_SERVICE_CONFIG_REQUIRED');
 if(!UUID.test(request?.reservation_id)||
    !WORK.test(request.original_work_id)||
    !HASH.test(request.candidate_hash)||
    !BRANCH.test(request.install_branch)||request.install_branch.includes('..')||
    request.install_branch===WORKER||
    !Number.isSafeInteger(request.issue_number)||request.issue_number<1||
    request.issue_number>100000||
    Object.keys(request).sort().join(',')!==
     'candidate_hash,install_branch,issue_number,original_work_id,reservation_id')
  err('INERT_REQUEST_INVALID');
 return true;
}
function dbCall(env,name,payload,fetchImpl=fetch){
 return fetchImpl(env.REALITY_PERSONAL_CHAT_SUPABASE_URL+'/rest/v1/rpc/'+name,{
  method:'POST',redirect:'error',cache:'no-store',
  headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,
   authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,
   'content-type':'application/json',accept:'application/json'},
  body:JSON.stringify(payload),
 }).then(async response=>{
  const x=await response.json().catch(()=>null);
  if(!response.ok||!x||typeof x!=='object')
   err('ATOMIC_PROVIDER_'+name.toUpperCase()+'_UNAVAILABLE');
  return x;
 });
}
export async function executeApprovedContinuation({
 env=process.env,request,checkoutSha,call=dbCall,
 serviceFactory=createLiveGeneralRepairService,wait=pause,maxChecks=15,
}={}){
 verifyApprovedWorkerEnvironment(env,request,checkoutSha);
 const leased=await call(env,'reality_lease_approved_repair_continuation_v1',{
  p_install_branch:request.install_branch});
 if(leased.status==='NO_APPROVED_WORK')return {
  status:'NO_ATOMICALLY_APPROVED_WORK',original_job_completed:false};
 if(leased.status!=='EXACT_OWNER_APPROVED_WORK_LEASED'||
    !UUID.test(leased.reservation_id)||!UUID.test(leased.lease_id)||
    !UUID.test(leased.owner_id)||!UUID.test(leased.conversation_id)||
    leased.reservation_id!==request.reservation_id||
    leased.original_work_id!==request.original_work_id||
    leased.candidate_hash!==request.candidate_hash||
    leased.install_branch!==request.install_branch||
    leased.issue_number!==request.issue_number)
  err('ATOMIC_OWNER_APPROVED_LEASE_SCOPE_MISMATCH');
 const workerEnv={...env,VERCEL_GIT_COMMIT_REF:request.install_branch,
  VERCEL_GIT_COMMIT_SHA:checkoutSha,
  SUPABASE_SECRET_KEY:env.SUPABASE_SERVICE_ROLE_KEY};
 // A service-role bearer, not a user token: owner identity comes ONLY from
 // the private leased, verified source in Supabase, never the request file.
 const session={user_id:leased.owner_id,
  config:privateChatConfig(workerEnv),
  access_token:env.SUPABASE_SERVICE_ROLE_KEY};
 const service=serviceFactory({session,env:workerEnv});
 let outcome=null,diagnostic='ORIGINAL_PROVIDER_EVIDENCE_STILL_PENDING';
 try{
  for(let attempt=0;attempt<maxChecks;attempt++){
   outcome=await service.continueAfterInstall({
    originalWorkId:leased.original_work_id,issueNumber:leased.issue_number});
   if(outcome?.original_work_id!==leased.original_work_id||
      outcome?.production_changed!==false)
    err('ORIGINAL_WORK_OR_PRODUCTION_SCOPE_CHANGED');
   if(outcome.original_job_completed===true){
    if(outcome.status!=='ORIGINAL_JOB_INDEPENDENTLY_SETTLED'||
       outcome.independent_readback_verified!==true||
       !/^supabase:universe_events:[a-f0-9-]{36}$/i.test(
        String(outcome.settlement_receipt_ref||'')))
     err('INDEPENDENT_SETTLEMENT_READBACK_REQUIRED');
    diagnostic='INDEPENDENT_ORIGINAL_SETTLEMENT_RECONCILED';
    break;
   }
   if(attempt<maxChecks-1)await wait(15000);
  }
 }catch(error){
  const safe=String(error?.message||'');
  diagnostic=/^(?:REAL_LIVE_INSTALL_|REAL_INSTALLED_WORK_|GENERAL_|REALITY_APPROVED_BACKGROUND_)[A-Z0-9_]{4,120}$/.test(safe)?
   safe.replace(/^(?:REAL_LIVE_INSTALL_|REAL_INSTALLED_WORK_|GENERAL_|REALITY_APPROVED_BACKGROUND_)/,'') :
    'TRUSTED_PROVIDER_RECONCILIATION_REQUIRED';
 }
 const complete=outcome?.original_job_completed===true&&
   outcome?.independent_readback_verified===true;
 const recorded=await call(env,'reality_reconcile_approved_repair_continuation_v1',{
  p_reservation_id:leased.reservation_id,p_lease_id:leased.lease_id,
  p_status:complete?'SETTLED':'PENDING',
  p_observation:diagnostic});
 if(recorded.original_work_id!==leased.original_work_id||
    recorded.original_job_completed!==complete||recorded.production_changed!==false)
  err('DURABLE_CONTINUATION_READBACK_MISMATCH');
 return {
  status:complete?'ORIGINAL_JOB_INDEPENDENTLY_SETTLED':
   'DURABLE_PENDING_REQUIRES_FUTURE_WORKER_WAKEUP',
  reservation_id:leased.reservation_id,attempts:leased.attempts,
  original_work_id:leased.original_work_id,
  original_job_completed:complete,production_changed:false,
  settlement_receipt_ref:complete?outcome.settlement_receipt_ref:null,
  diagnostic:complete?null:diagnostic,
 };
}
async function main(){
 const env=process.env;
 const changed=execFileSync('git',['diff','--name-only','HEAD^','HEAD'],
  {encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
 if(changed.length!==1||
  !/^reality-approved-continuations\/[a-f0-9-]{36}(?:-retry-(?:[1-9]|1[0-9]|2[0-4]))?\.json$/.test(changed[0]))
  err('ONE_PINNED_OWNER_APPROVAL_DISPATCH_REQUIRED');
 const request=JSON.parse(readFileSync(changed[0],'utf8'));
 const prefix='reality-approved-continuations/'+request.reservation_id;
 const attemptMatch=/^-retry-([1-9]|1[0-9]|2[0-4])$/.exec(
  changed[0].slice(prefix.length,-5));
 const index=changed[0]===prefix+'.json'?0:
  attemptMatch?Number(attemptMatch[1]):-1;
 if(!Number.isInteger(index)||index<0||index>24||
    changed[0]!==prefix+(index===0?'':'-retry-'+index)+'.json')
  err('PINNED_DISPATCH_FILENAME_CHANGED');
 const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const result=await executeApprovedContinuation({env,request,checkoutSha:sha});
 console.log('REALITY_APPROVED_CONTINUATION',JSON.stringify(result));
 if(result.status==='DURABLE_PENDING_REQUIRES_FUTURE_WORKER_WAKEUP'){
  if(!Number.isInteger(result.attempts)||result.attempts<1||
     result.attempts>24||result.attempts!==index+1)
   err('BOUNDED_OWNER_LEASE_ATTEMPT_MISMATCH');
  if(result.attempts<24){
   const wake=await dispatchApprovedBackgroundRepair({
    reservationId:request.reservation_id,
    originalWorkId:request.original_work_id,
    candidateHash:request.candidate_hash,
    issueNumber:request.issue_number,
    installBranch:request.install_branch,
    attemptNumber:result.attempts,env,
   });
   if(wake.dispatched!==true||wake.production_changed!==false)
    err('FOLLOWUP_WAKE_PROVIDER_READBACK_REQUIRED');
   console.log('REALITY_OWNER_APPROVED_RETRY_WAKE',JSON.stringify({
    reservation_id:request.reservation_id,attempt:result.attempts,
    status:'DURABLE_UNSETTLED_REQUEUED',original_job_completed:false,
    production_changed:false,
   }));
  }else{
   console.log('REALITY_RETRY_LIMIT',JSON.stringify({
    status:'OWNER_REVIEW_REQUIRED_AFTER_24_BOUNDED_LEASES',
    original_job_completed:false,production_changed:false,
   }));
  }
 }
}
if(import.meta.url===new URL('file://'+process.argv[1]).href){
 try{await main()}catch(e){
  console.error('REALITY_APPROVED_BACKGROUND_FAILED',
   /^REALITY_APPROVED_BACKGROUND_[A-Z0-9_]+$/.test(String(e?.message||''))?
   e.message:'TRUSTED_RECONCILIATION_REQUIRED');
  process.exitCode=1;
 }
}
