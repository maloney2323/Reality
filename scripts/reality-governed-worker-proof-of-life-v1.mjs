// A GitHub runner is not allowed to install a preview capability merely
// because Actions started. Only a version-fenced broker wake may proceed.
import {readFileSync,appendFileSync} from 'node:fs';
const e=process.env;
const fail=code=>{throw Error('REALITY_GOVERNED_LIFE_'+code)};
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const WORK=/^work:[a-f0-9]{32}$/;
const HASH=/^[a-f0-9]{64}$/;
const repo='maloney2323/Reality';
const branch='refs/heads/feature/reality-general-capability-engine-20261101';
const setReady=v=>{
 if(e.GITHUB_OUTPUT)appendFileSync(e.GITHUB_OUTPUT,'ready='+v+'\n');
};
if(e.GITHUB_ACTIONS!=='true'||e.GITHUB_REPOSITORY!==repo||
 e.GITHUB_REF!==branch||e.GITHUB_EVENT_NAME!=='push'){
 console.log('REALITY_GOVERNED_LIFE_NOT_A_BROKER_WAKE');
 setReady('false');process.exit(0);
}
if(!e.GITHUB_EVENT_PATH)fail('PUSH_EVENT_READBACK_MISSING');
const event=JSON.parse(readFileSync(e.GITHUB_EVENT_PATH,'utf8'));
const added=event?.head_commit?.added;
if(!Array.isArray(added))fail('GITHUB_PUSH_ADDED_FILES_UNVERIFIED');
const pathPattern=/^reality-approved-install-wakes\/([a-f0-9-]{36})-attempt-([1-5])\.json$/;
const wakeFiles=added.filter(p=>pathPattern.test(String(p)));
if(wakeFiles.length===0){
 if(String(event?.head_commit?.message||'').startsWith('Wake only existing approved isolated job'))
  fail('WAKE_COMMIT_MISSING_FENCED_FILE');
 console.log('REALITY_GOVERNED_LIFE_NOT_AN_APPROVED_BROKER_WAKE');
 setReady('false');process.exit(0);
}
if(wakeFiles.length!==1)fail('MULTIPLE_WAKE_FILES_NOT_ALLOWED');
const file=wakeFiles[0],match=file.match(pathPattern);
if(!match||!UUID.test(match[1]))fail('WAKE_FILE_SCOPE_INVALID');
const wake=JSON.parse(readFileSync(file,'utf8'));
if(wake.approval_id!==match[1]||
 wake.dispatch_fence!==Number(match[2])||
 !UUID.test(wake.trigger_id)||
 !WORK.test(wake.original_work_id)||
 !HASH.test(wake.artifact_sha256)||
 !HASH.test(wake.pre_state_hash)||
 wake.target_environment!=='ISOLATED_PREVIEW'||
 wake.authorization_source!=='DURABLE_OWNER_RECEIPT_READBACK_REQUIRED')
 fail('EXACT_FENCED_WAKE_RECEIPT_INVALID');
if(!/^[1-9][0-9]{0,17}$/.test(String(e.GITHUB_RUN_ID||''))||
 !/^[1-9][0-9]{0,2}$/.test(String(e.GITHUB_RUN_ATTEMPT||''))||
 !e.ACTIONS_ID_TOKEN_REQUEST_URL||!e.ACTIONS_ID_TOKEN_REQUEST_TOKEN||
 !e.REALITY_INSTALL_JOB_GITHUB_TOKEN)fail('SIGNED_RUN_IDENTITY_NOT_AVAILABLE');
async function callBroker(action){
 const u=new URL(e.ACTIONS_ID_TOKEN_REQUEST_URL);
 u.searchParams.set('audience','reality-governed-worker-life-v1');
 const tokenResponse=await fetch(u,{redirect:'error',cache:'no-store',headers:{
  authorization:'Bearer '+e.ACTIONS_ID_TOKEN_REQUEST_TOKEN}});
 if(!tokenResponse.ok)fail('SIGNED_OIDC_PROVIDER_UNAVAILABLE');
 const id=(await tokenResponse.json()).value;
 if(typeof id!=='string'||id.length<300)fail('SIGNED_OIDC_MISSING');
 const response=await fetch(
 'https://hvkfreoagbrphwghjajw.supabase.co/functions/v1/reality-governed-worker-life-v1',{
  method:'POST',redirect:'error',cache:'no-store',
  headers:{authorization:'Bearer '+id,'content-type':'application/json',
   'x-reality-github-read-token':e.REALITY_INSTALL_JOB_GITHUB_TOKEN},
  body:JSON.stringify({action,approval_id:wake.approval_id,
   dispatch_fence:wake.dispatch_fence})});
 const proof=await response.json().catch(()=>null);
 if(!response.ok||proof?.ok!==true||
   proof.status!==(action==='alive'?
     'WORKER_ALIVE_SIGNED_AND_RECORDED':'GOVERNANCE_READY')||
   proof.oidc_verified!==true||proof.execution_authorized!==false||
   proof.exact_approval_id!==wake.approval_id||
   proof.dispatch_fence!==wake.dispatch_fence||
   String(proof.provider_run_id)!==e.GITHUB_RUN_ID||
   String(proof.provider_run_attempt)!==e.GITHUB_RUN_ATTEMPT||
   proof.production_changed!==false)
  fail('SIGNED_'+action.toUpperCase()+'_NOT_VERIFIED');
}
await callBroker('alive');
await callBroker('ready');
setReady('true');
console.log('REALITY_OIDC_LIFE_AND_FRESH_GOVERNANCE_RECORDED',JSON.stringify({
 approval_id:wake.approval_id,dispatch_fence:wake.dispatch_fence,
 run_id:e.GITHUB_RUN_ID,execution_authorized:false,production_changed:false}));
