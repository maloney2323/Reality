// Trigger-only worker: prove a REAL queued capability gap with signed OIDC.
// No installation, generation, claim or customer completion occurs here.
// Business-specific frozen reproduction must be bound before claiming a job.
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const REF='refs/heads/feature/reality-genuine-capability-worker-20261101';
const AUD='reality-genuine-capability-wake-v1';
const err=x=>{throw Error('GENUINE_CAPABILITY_WORKER_'+x)};
export async function inspectSignedInertWake({
 env=process.env,fetchImpl=fetch,
 checkoutSha=null,request=null,
}={}){
 const sha=checkoutSha||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(env.GITHUB_ACTIONS!=='true'||
  env.GITHUB_REPOSITORY!=='maloney2323/Reality'||
  env.GITHUB_REF!==REF||env.GITHUB_EVENT_NAME!=='push'||
  env.GITHUB_SHA!==sha||!/^[a-f0-9]{40}$/.test(sha))
  err('EXACT_ISOLATED_ACTIONS_IDENTITY_REQUIRED');
 const item=request||(()=>{
  const changed=execFileSync('git',['diff','--name-only','HEAD^','HEAD'],
   {encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
  if(changed.length!==1||!/^reality-genuine-triggers\/[a-f0-9-]{36}\.json$/.test(changed[0]))
   err('EXACT_ONE_INERT_TRIGGER_COMMIT_REQUIRED');
  const data=JSON.parse(readFileSync(changed[0],'utf8'));
  if(changed[0]!=='reality-genuine-triggers/'+data.trigger_id+'.json')
   err('INERT_TRIGGER_FILENAME_MISMATCH');
  return data;
 })();
 if(!item||Array.isArray(item)||
  Object.keys(item).sort().join(',')!=='original_work_id,source_event_id,trigger_id'||
  !UUID.test(item.trigger_id)||!UUID.test(item.source_event_id)||
  !WORK.test(item.original_work_id))
  err('SOURCE_BOUND_INERT_REQUEST_REQUIRED');
 const url=env.ACTIONS_ID_TOKEN_REQUEST_URL;
 const token=env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
 if(!url||!token)err('SIGNED_GITHUB_OIDC_ISSUER_REQUIRED');
 const issuer=new URL(url);issuer.searchParams.set('audience',AUD);
 const jwt=await fetchImpl(issuer.toString(),{
  method:'GET',cache:'no-store',redirect:'error',
  headers:{authorization:'Bearer '+token}});
 if(!jwt.ok)err('SIGNED_OIDC_PROVIDER_UNAVAILABLE');
 const identity=await jwt.json().catch(()=>null);
 if(typeof identity?.value!=='string'||identity.value.length<300)
  err('SIGNED_OIDC_JWT_REQUIRED');
 const verified=await fetchImpl(
  'https://hvkfreoagbrphwghjajw.supabase.co/functions/v1/reality-genuine-capability-wake',{
  method:'POST',redirect:'error',cache:'no-store',
  headers:{authorization:'Bearer '+identity.value,
   'content-type':'application/json'},
  body:JSON.stringify({action:'inspect',
   trigger_id:item.trigger_id,source_event_id:item.source_event_id})});
 const source=await verified.json().catch(()=>null);
 if(!verified.ok||source?.ok!==true||
  source.status!=='GENUINE_GAP_VERIFIED_AWAITING_PROVIDER_FROZEN_REPRODUCTION'||
  source.trigger_id!==item.trigger_id||
  source.original_work_id!==item.original_work_id||
  source.source_event_id!==item.source_event_id||
  source.github_oidc_verified!==true||
  source.claim_consumed!==false||
  source.service_credential_returned!==false||
  source.installation_authorized!==false||
  source.original_job_completed!==false)
  err('INDEPENDENT_PROVIDER_AND_CURRENT_GOAL_READBACK_REQUIRED');
 return Object.freeze({
  status:'GENUINE_GAP_AWAITING_INDEPENDENT_FROZEN_REPRODUCTION',
  original_work_id:item.original_work_id,trigger_id:item.trigger_id,
  signed_worker_verified:true,
  source_readback_verified:true,
  claim_consumed:false,model_generated:false,
  installation_authorized:false,original_job_completed:false,
  production_changed:false,
 });
}
if(import.meta.url===new URL('file://'+process.argv[1]).href){
 try{
  const result=await inspectSignedInertWake();
  console.log('REALITY_GENUINE_CAPABILITY_WORKER',JSON.stringify(result));
 }catch(error){
  console.error('REALITY_GENUINE_CAPABILITY_WORKER_BLOCKED',
   /^GENUINE_CAPABILITY_WORKER_[A-Z0-9_]+$/.test(String(error?.message))?
    error.message:'TRUSTED_RECONCILIATION_REQUIRED');
  process.exitCode=1;
 }
}
